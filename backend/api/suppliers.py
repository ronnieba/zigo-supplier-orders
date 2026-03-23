from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import json

from database import get_db
from models import Supplier, SupplierBudget

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


class SupplierCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    whatsapp: Optional[str] = None


class SupplierOut(BaseModel):
    id: str
    name: str
    contact: Optional[str]
    whatsapp: Optional[str] = None
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
    s = Supplier(name=body.name, contact=body.contact, whatsapp=body.whatsapp)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: str, db: Session = Depends(get_db)):
    s = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not s:
        raise HTTPException(404, "Supplier not found")
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
