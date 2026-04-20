from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json

from database import get_db
from models import Supplier, SupplierBudget, Catalog, Product, ProductPrice, Order, OrderItem, OrderTemplate, OrderTemplateItem

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class SupplierOut(BaseModel):
    id: str
    name: str
    contact: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    reminder_days: Optional[str] = None

    model_config = {"from_attributes": True}


class ReminderDaysIn(BaseModel):
    days: list[int]


@router.get("/", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)):
    return db.query(Supplier).all()


@router.put("/{supplier_id}/reminder-days")
def set_reminder_days(supplier_id: str, body: ReminderDaysIn, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Supplier not found")
    s.reminder_days = json.dumps(body.days)
    db.commit()
    return {"ok": True, "days": body.days}


@router.post("/", response_model=SupplierOut)
def create_supplier(body: SupplierCreate, db: Session = Depends(get_db)):
    s = Supplier(name=body.name, contact=body.contact, whatsapp=body.whatsapp,
                 email=body.email, address=body.address, notes=body.notes)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: str, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Supplier not found")

    # Delete in correct dependency order to avoid FK violations (PostgreSQL)

    # 1. Order items → orders
    order_ids = [o.id for o in db.query(Order.id).filter(Order.supplier_id == supplier_id)]
    if order_ids:
        db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).delete(synchronize_session=False)
    db.query(Order).filter(Order.supplier_id == supplier_id).delete(synchronize_session=False)

    # 2. Template items → templates
    tmpl_ids = [t.id for t in db.query(OrderTemplate.id).filter(OrderTemplate.supplier_id == supplier_id)]
    if tmpl_ids:
        db.query(OrderTemplateItem).filter(OrderTemplateItem.template_id.in_(tmpl_ids)).delete(synchronize_session=False)
    db.query(OrderTemplate).filter(OrderTemplate.supplier_id == supplier_id).delete(synchronize_session=False)

    # 3. Product prices → products
    product_ids = [p.id for p in db.query(Product.id).filter(Product.supplier_id == supplier_id)]
    if product_ids:
        db.query(ProductPrice).filter(ProductPrice.product_id.in_(product_ids)).delete(synchronize_session=False)
    db.query(Product).filter(Product.supplier_id == supplier_id).delete(synchronize_session=False)

    # 4. Catalog prices → catalogs
    cat_ids = [c.id for c in db.query(Catalog.id).filter(Catalog.supplier_id == supplier_id)]
    if cat_ids:
        db.query(ProductPrice).filter(ProductPrice.catalog_id.in_(cat_ids)).delete(synchronize_session=False)
    db.query(Catalog).filter(Catalog.supplier_id == supplier_id).delete(synchronize_session=False)

    # 5. Budget
    db.query(SupplierBudget).filter(SupplierBudget.supplier_id == supplier_id).delete(synchronize_session=False)

    # 6. Supplier itself
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.put("/{supplier_id}", response_model=SupplierOut)
def update_supplier(supplier_id: str, body: SupplierCreate, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Supplier not found")
    s.name = body.name
    s.contact = body.contact
    s.whatsapp = body.whatsapp
    s.email = body.email
    s.address = body.address
    s.notes = body.notes
    db.commit()
    db.refresh(s)
    return s


class BudgetIn(BaseModel):
    weekly_budget: float


@router.get("/{supplier_id}/budget")
def get_budget(supplier_id: str, db: Session = Depends(get_db)):
    b = db.query(SupplierBudget).filter(SupplierBudget.supplier_id == supplier_id).first()
    if not b:
        return None
    return {"supplier_id": b.supplier_id, "weekly_budget": b.weekly_budget}


@router.put("/{supplier_id}/budget")
def set_budget(supplier_id: str, body: BudgetIn, db: Session = Depends(get_db)):
    b = db.query(SupplierBudget).filter(SupplierBudget.supplier_id == supplier_id).first()
    if b:
        b.weekly_budget = body.weekly_budget
    else:
        b = SupplierBudget(supplier_id=supplier_id, weekly_budget=body.weekly_budget)
        db.add(b)
    db.commit()
    return {"supplier_id": supplier_id, "weekly_budget": body.weekly_budget}
