import json
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Supplier, Product, ProductPrice, Catalog, Order, OrderItem, SupplierBudget, OrderTemplate, OrderTemplateItem

router = APIRouter(prefix="/backup", tags=["backup"])


@router.get("/export")
def export_backup(db: Session = Depends(get_db)):
    """Export entire database as JSON."""

    suppliers = db.query(Supplier).all()
    catalogs = db.query(Catalog).all()
    products = db.query(Product).all()
    prices = db.query(ProductPrice).all()
    orders = db.query(Order).all()
    order_items = db.query(OrderItem).all()
    budgets = db.query(SupplierBudget).all()
    templates = db.query(OrderTemplate).all()
    template_items = db.query(OrderTemplateItem).all()

    data = {
        "version": 1,
        "exported_at": str(__import__("datetime").datetime.utcnow().isoformat()),
        "suppliers": [
            {"id": s.id, "name": s.name, "contact": s.contact,
             "created_at": s.created_at.isoformat() if s.created_at else None}
            for s in suppliers
        ],
        "catalogs": [
            {"id": c.id, "supplier_id": c.supplier_id, "file_path": c.file_path,
             "filename": c.filename, "uploaded_at": c.uploaded_at.isoformat() if c.uploaded_at else None,
             "parsed": c.parsed, "products_count": c.products_count}
            for c in catalogs
        ],
        "products": [
            {"id": p.id, "supplier_id": p.supplier_id, "code": p.code,
             "name": p.name, "category": p.category, "unit": p.unit}
            for p in products
        ],
        "product_prices": [
            {"id": pp.id, "product_id": pp.product_id, "catalog_id": pp.catalog_id,
             "price": pp.price, "recorded_at": pp.recorded_at.isoformat() if pp.recorded_at else None}
            for pp in prices
        ],
        "orders": [
            {"id": o.id, "supplier_id": o.supplier_id, "week_start": o.week_start,
             "status": o.status, "notes": o.notes,
             "created_at": o.created_at.isoformat() if o.created_at else None}
            for o in orders
        ],
        "order_items": [
            {"id": oi.id, "order_id": oi.order_id, "product_id": oi.product_id,
             "quantity": oi.quantity, "unit_price": oi.unit_price}
            for oi in order_items
        ],
        "supplier_budgets": [
            {"id": b.id, "supplier_id": b.supplier_id, "weekly_budget": b.weekly_budget}
            for b in budgets
        ],
        "order_templates": [
            {"id": t.id, "supplier_id": t.supplier_id, "name": t.name,
             "created_at": t.created_at.isoformat() if t.created_at else None}
            for t in templates
        ],
        "order_template_items": [
            {"id": ti.id, "template_id": ti.template_id, "product_id": ti.product_id,
             "quantity": ti.quantity}
            for ti in template_items
        ],
    }
    return JSONResponse(content=data)


@router.post("/import")
def import_backup(payload: dict, db: Session = Depends(get_db)):
    """Import a backup JSON. Skips existing records (by ID)."""
    try:
        # helpers
        def _exists(model, id_: str) -> bool:
            return db.query(model).filter(model.id == id_).first() is not None

        count = {"added": 0, "skipped": 0}

        def _add(obj):
            db.add(obj)
            count["added"] += 1

        # Suppliers
        for s in payload.get("suppliers", []):
            if not _exists(Supplier, s["id"]):
                _add(Supplier(id=s["id"], name=s["name"], contact=s.get("contact")))
            else:
                count["skipped"] += 1

        db.flush()

        # Catalogs
        for c in payload.get("catalogs", []):
            if not _exists(Catalog, c["id"]):
                _add(Catalog(id=c["id"], supplier_id=c["supplier_id"],
                             file_path=c.get("file_path"), filename=c.get("filename"),
                             parsed=c.get("parsed", False), products_count=c.get("products_count", 0)))
            else:
                count["skipped"] += 1

        db.flush()

        # Products
        for p in payload.get("products", []):
            if not _exists(Product, p["id"]):
                _add(Product(id=p["id"], supplier_id=p["supplier_id"], code=p.get("code"),
                             name=p["name"], category=p.get("category"), unit=p.get("unit")))
            else:
                count["skipped"] += 1

        db.flush()

        # Product prices
        for pp in payload.get("product_prices", []):
            if not _exists(ProductPrice, pp["id"]):
                _add(ProductPrice(id=pp["id"], product_id=pp["product_id"],
                                  catalog_id=pp["catalog_id"], price=pp["price"]))
            else:
                count["skipped"] += 1

        db.flush()

        # Orders
        for o in payload.get("orders", []):
            if not _exists(Order, o["id"]):
                _add(Order(id=o["id"], supplier_id=o["supplier_id"],
                           week_start=o["week_start"], status=o.get("status", "draft"),
                           notes=o.get("notes")))
            else:
                count["skipped"] += 1

        db.flush()

        # Order items
        for oi in payload.get("order_items", []):
            if not _exists(OrderItem, oi["id"]):
                _add(OrderItem(id=oi["id"], order_id=oi["order_id"],
                               product_id=oi["product_id"],
                               quantity=oi["quantity"], unit_price=oi["unit_price"]))
            else:
                count["skipped"] += 1

        db.flush()

        # Budgets
        for b in payload.get("supplier_budgets", []):
            if not _exists(SupplierBudget, b["id"]):
                _add(SupplierBudget(id=b["id"], supplier_id=b["supplier_id"],
                                    weekly_budget=b["weekly_budget"]))
            else:
                count["skipped"] += 1

        db.flush()

        # Templates
        for t in payload.get("order_templates", []):
            if not _exists(OrderTemplate, t["id"]):
                _add(OrderTemplate(id=t["id"], supplier_id=t["supplier_id"], name=t["name"]))
            else:
                count["skipped"] += 1

        db.flush()

        # Template items
        for ti in payload.get("order_template_items", []):
            if not _exists(OrderTemplateItem, ti["id"]):
                _add(OrderTemplateItem(id=ti["id"], template_id=ti["template_id"],
                                       product_id=ti["product_id"], quantity=ti["quantity"]))
            else:
                count["skipped"] += 1

        db.commit()
        return {"ok": True, "added": count["added"], "skipped": count["skipped"]}

    except Exception as e:
        db.rollback()
        return {"ok": False, "error": str(e)}
