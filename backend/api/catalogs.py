import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Catalog, Product, ProductPrice, Supplier
from services.pdf_parser import parse_catalog_pdf, parse_catalog_image, parse_catalog_excel

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.webp', '.heic', '.bmp', '.tiff', '.xlsx', '.xls'}
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.bmp', '.tiff'}
EXCEL_EXTENSIONS = {'.xlsx', '.xls'}

router = APIRouter(prefix="/catalogs", tags=["catalogs"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class CatalogOut(BaseModel):
    id: str
    supplier_id: str
    filename: str
    parsed: bool
    products_count: int
    uploaded_at: str

    model_config = {"from_attributes": True}

    def model_post_init(self, __context):
        if self.uploaded_at and hasattr(self.uploaded_at, 'isoformat'):
            object.__setattr__(self, 'uploaded_at', self.uploaded_at.isoformat())


@router.get("/", response_model=list[dict])
def list_catalogs(supplier_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Catalog)
    if supplier_id:
        q = q.filter(Catalog.supplier_id == supplier_id)
    catalogs = q.order_by(Catalog.uploaded_at.desc()).all()
    return [
        {
            "id": c.id,
            "supplier_id": c.supplier_id,
            "filename": c.filename,
            "parsed": c.parsed,
            "products_count": c.products_count,
            "uploaded_at": c.uploaded_at.isoformat() if c.uploaded_at else None,
        }
        for c in catalogs
    ]


@router.post("/upload")
async def upload_catalog(
    supplier_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"סוג קובץ לא נתמך. מותר: PDF, Excel (XLSX), JPG, PNG, WEBP")

    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(404, "Supplier not found")

    contents = await file.read()

    # Save file
    saved_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, saved_filename)
    with open(file_path, "wb") as f:
        f.write(contents)

    # Parse — PDF, Excel or image
    try:
        if ext in IMAGE_EXTENSIONS:
            parsed_products = parse_catalog_image(contents)
        elif ext in EXCEL_EXTENSIONS:
            parsed_products = parse_catalog_excel(contents)
        else:
            parsed_products = parse_catalog_pdf(contents)
    except Exception as e:
        raise HTTPException(500, f"שגיאה בעיבוד הקובץ: {e}")

    # Save catalog record
    catalog = Catalog(
        supplier_id=supplier_id,
        file_path=file_path,
        filename=file.filename,
        parsed=True,
        products_count=len(parsed_products),
    )
    db.add(catalog)
    db.flush()

    # Upsert products and save prices
    saved = 0
    for p in parsed_products:
        # Normalize name for matching
        p_name_clean = p.name.strip()
        p_code_clean = p.code.strip() if p.code else None

        # Check if product already exists (match by code or name, case-insensitive)
        product = None
        if p_code_clean:
            product = db.query(Product).filter(
                Product.supplier_id == supplier_id,
                Product.code == p_code_clean,
            ).first()
        if not product:
            from sqlalchemy import func
            product = db.query(Product).filter(
                Product.supplier_id == supplier_id,
                func.lower(func.trim(Product.name)) == p_name_clean.lower(),
            ).first()
        if not product:
            product = Product(
                supplier_id=supplier_id,
                code=p_code_clean,
                name=p_name_clean,
                category=p.category,
                unit=p.unit,
            )
            db.add(product)
            db.flush()

        # Always add a new price record per catalog
        price_record = ProductPrice(
            product_id=product.id,
            catalog_id=catalog.id,
            price=p.price,
        )
        db.add(price_record)
        saved += 1

    db.commit()

    return {
        "catalog_id": catalog.id,
        "products_found": len(parsed_products),
        "products_saved": saved,
    }


@router.delete("/{catalog_id}")
def delete_catalog(catalog_id: str, db: Session = Depends(get_db)):
    from models import ProductPrice
    c = db.query(Catalog).filter(Catalog.id == catalog_id).first()
    if not c:
        raise HTTPException(404, "Catalog not found")
    # Delete associated price records first (foreign key constraint)
    db.query(ProductPrice).filter(ProductPrice.catalog_id == catalog_id).delete()
    # Delete file
    if c.file_path and os.path.exists(c.file_path):
        os.remove(c.file_path)
    db.delete(c)
    db.commit()
    return {"ok": True}
