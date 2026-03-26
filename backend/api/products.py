from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from difflib import SequenceMatcher
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Product, ProductPrice, OrderItem, Supplier, Catalog


UNIT_MAP = {
    # weight
    'ק"ג': 'ק״ג', "ק'ג": 'ק״ג', 'קג': 'ק״ג', 'קילו': 'ק״ג', 'kg': 'ק״ג', 'kilo': 'ק״ג',
    'גרם': 'גרם', 'gr': 'גרם', 'g': 'גרם',
    # volume
    "ל'": 'ליטר', 'ליטר': 'ליטר', 'liter': 'ליטר', 'l': 'ליטר', 'lt': 'ליטר',
    'מל': 'מ"ל', 'מ"ל': 'מ"ל', 'ml': 'מ"ל',
    # unit
    "יח'": 'יח׳', 'יח': 'יח׳', 'יחידה': 'יח׳', 'יחידות': 'יח׳', 'unit': 'יח׳', 'pcs': 'יח׳',
    # package
    'ארגז': 'ארגז', 'קרטון': 'קרטון', 'שקית': 'שקית', 'חבילה': 'חבילה',
    'מגש': 'מגש', 'כד': 'כד', 'צנצנת': 'צנצנת', 'בקבוק': 'בקבוק',
}


def normalize_unit(raw: str | None) -> str | None:
    if not raw:
        return raw
    cleaned = raw.strip().lower()
    return UNIT_MAP.get(cleaned, raw.strip())


def _normalize_heb(text: str) -> str:
    """Strip common Hebrew plural/feminine suffixes for fuzzy matching."""
    t = text.strip().lower()
    for suffix in ('ים', 'ות', 'יות', 'ה', 'ת', 'י'):
        if t.endswith(suffix) and len(t) > len(suffix) + 2:
            return t[:-len(suffix)]
    return t


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _normalize_heb(a), _normalize_heb(b)).ratio()

router = APIRouter(prefix="/products", tags=["products"])


class ProductCreate(BaseModel):
    supplier_id: str
    name: str
    code: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    price: Optional[float] = None


def _get_or_create_manual_catalog(supplier_id: str, db: Session) -> Catalog:
    catalog = db.query(Catalog).filter(
        Catalog.supplier_id == supplier_id,
        Catalog.filename == "__manual__"
    ).first()
    if not catalog:
        catalog = Catalog(supplier_id=supplier_id, filename="__manual__", parsed=True)
        db.add(catalog)
        db.flush()
    return catalog


@router.get("/")
def list_products(
    supplier_id: str | None = None,
    search: str | None = None,
    category: str | None = None,
    in_stock: bool = False,
    db: Session = Depends(get_db),
):
    from models import Inventory as InventoryModel
    q = db.query(Product).options(joinedload(Product.prices), joinedload(Product.inventory))
    if supplier_id:
        q = q.filter(Product.supplier_id == supplier_id)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(Product.category == category)
    if in_stock:
        q = q.join(InventoryModel, Product.id == InventoryModel.product_id).filter(
            InventoryModel.current_qty > 0
        )

    products = q.all()

    result = []
    for p in products:
        prices_sorted = sorted(p.prices, key=lambda x: x.recorded_at)
        latest_price = prices_sorted[-1].price if prices_sorted else None
        prev_price = prices_sorted[-2].price if len(prices_sorted) >= 2 else None

        price_change = None
        if latest_price and prev_price and prev_price > 0:
            price_change = round((latest_price - prev_price) / prev_price * 100, 1)

        inv = p.inventory
        result.append({
            "id": p.id,
            "supplier_id": p.supplier_id,
            "code": p.code,
            "name": p.name,
            "category": p.category,
            "unit": normalize_unit(p.unit),
            "latest_price": latest_price,
            "prev_price": prev_price,
            "price_change_pct": price_change,
            "current_qty": inv.current_qty if inv else None,
            "in_stock": (inv.current_qty > 0) if inv else None,
        })

    return result


@router.get("/units")
def list_units():
    """Returns all normalized unit types for reference"""
    return sorted(set(UNIT_MAP.values()))


@router.get("/categories")
def list_categories(supplier_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Product.category).filter(Product.category.isnot(None))
    if supplier_id:
        q = q.filter(Product.supplier_id == supplier_id)
    cats = [row[0] for row in q.distinct().all() if row[0]]
    return sorted(cats)


@router.get("/compare")
def compare_products(name: str, db: Session = Depends(get_db)):
    """Fuzzy-search products across ALL suppliers using Hebrew-aware similarity."""
    all_products = (
        db.query(Product)
        .options(joinedload(Product.prices), joinedload(Product.supplier))
        .all()
    )

    results = []
    for p in all_products:
        exact = name.lower() in p.name.lower() or p.name.lower() in name.lower()
        sim = _similarity(name, p.name)
        if not exact and sim < 0.60:
            continue
        prices_sorted = sorted(p.prices, key=lambda x: x.recorded_at)
        latest_price = prices_sorted[-1].price if prices_sorted else None
        results.append({
            "product_id": p.id,
            "product_name": p.name,
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.name if p.supplier else "",
            "unit": p.unit,
            "latest_price": latest_price,
            "similarity": round(max(sim, 1.0 if exact else 0.0), 2),
        })

    results.sort(key=lambda x: (-x["similarity"], x["product_name"]))
    return results[:30]


@router.get("/{product_id}/price-history")
def price_history(product_id: str, db: Session = Depends(get_db)):
    prices = (
        db.query(ProductPrice)
        .filter(ProductPrice.product_id == product_id)
        .order_by(ProductPrice.recorded_at)
        .all()
    )
    return [
        {"price": p.price, "date": p.recorded_at.isoformat(), "catalog_id": p.catalog_id}
        for p in prices
    ]


@router.post("/")
def create_product(data: ProductCreate, db: Session = Depends(get_db)):
    supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    product = Product(
        supplier_id=data.supplier_id,
        name=data.name,
        code=data.code or None,
        category=data.category or None,
        unit=normalize_unit(data.unit) if data.unit else None,
    )
    db.add(product)
    db.flush()
    if data.price is not None:
        catalog = _get_or_create_manual_catalog(data.supplier_id, db)
        db.add(ProductPrice(product_id=product.id, catalog_id=catalog.id, price=data.price))
    db.commit()
    db.refresh(product)
    prices_sorted = sorted(product.prices, key=lambda x: x.recorded_at)
    latest_price = prices_sorted[-1].price if prices_sorted else None
    return {
        "id": product.id, "supplier_id": product.supplier_id,
        "code": product.code, "name": product.name,
        "category": product.category, "unit": product.unit,
        "latest_price": latest_price, "prev_price": None, "price_change_pct": None,
    }


@router.put("/{product_id}")
def update_product(product_id: str, data: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).options(joinedload(Product.prices)).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if data.name is not None:
        product.name = data.name
    if data.code is not None:
        product.code = data.code or None
    if data.category is not None:
        product.category = data.category or None
    if data.unit is not None:
        product.unit = normalize_unit(data.unit) if data.unit else None
    if data.price is not None:
        catalog = _get_or_create_manual_catalog(product.supplier_id, db)
        db.add(ProductPrice(product_id=product_id, catalog_id=catalog.id, price=data.price))
    db.commit()
    return {"ok": True}


@router.delete("/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"ok": True}
