from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import Inventory, Product

router = APIRouter(prefix="/inventory", tags=["inventory"])

class InventoryIn(BaseModel):
    current_qty: float
    min_qty: float = 0
    unit: Optional[str] = None
    notes: Optional[str] = None

def _serialize(inv: Inventory):
    return {
        "id": inv.id,
        "product_id": inv.product_id,
        "product_name": inv.product.name if inv.product else "",
        "product_code": inv.product.code if inv.product else "",
        "supplier_id": inv.product.supplier_id if inv.product else "",
        "supplier_name": inv.product.supplier.name if inv.product and inv.product.supplier else "",
        "current_qty": inv.current_qty,
        "min_qty": inv.min_qty,
        "unit": inv.unit or (inv.product.unit if inv.product else ""),
        "notes": inv.notes,
        "low_stock": inv.current_qty <= inv.min_qty,
        "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
    }

@router.get("/summary")
def inventory_summary(db: Session = Depends(get_db)):
    items = db.query(Inventory).options(joinedload(Inventory.product).joinedload(Product.supplier)).all()
    total = len(items)
    low = sum(1 for i in items if i.current_qty <= i.min_qty)
    return {"total_tracked": total, "low_stock_count": low}

@router.get("/")
def list_inventory(supplier_id: Optional[str] = None, low_stock_only: bool = False, db: Session = Depends(get_db)):
    q = db.query(Inventory).options(
        joinedload(Inventory.product).joinedload(Product.supplier)
    )
    if supplier_id:
        q = q.join(Product).filter(Product.supplier_id == supplier_id)
    items = q.all()
    result = [_serialize(i) for i in items]
    if low_stock_only:
        result = [r for r in result if r["low_stock"]]
    return sorted(result, key=lambda x: x["product_name"])

@router.put("/{product_id}")
def set_inventory(product_id: str, body: InventoryIn, db: Session = Depends(get_db)):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(404, "Product not found")
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if inv:
        inv.current_qty = body.current_qty
        inv.min_qty = body.min_qty
        if body.unit: inv.unit = body.unit
        if body.notes is not None: inv.notes = body.notes
    else:
        inv = Inventory(
            product_id=product_id,
            current_qty=body.current_qty,
            min_qty=body.min_qty,
            unit=body.unit or p.unit,
            notes=body.notes,
        )
        db.add(inv)
    db.commit()
    db.refresh(inv)
    return _serialize(inv)

@router.delete("/{product_id}")
def delete_inventory(product_id: str, db: Session = Depends(get_db)):
    inv = db.query(Inventory).filter(Inventory.product_id == product_id).first()
    if inv:
        db.delete(inv)
        db.commit()
    return {"ok": True}
