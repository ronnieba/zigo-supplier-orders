from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import OrderTemplate, OrderTemplateItem, Product

router = APIRouter(prefix="/templates", tags=["templates"])


class TemplateItemIn(BaseModel):
    product_id: str
    quantity: float


class TemplateCreate(BaseModel):
    supplier_id: str
    name: str
    items: list[TemplateItemIn]


class TemplateItemOut(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_unit: Optional[str]
    quantity: float
    unit_price: Optional[float]

    model_config = {"from_attributes": True}


class TemplateOut(BaseModel):
    id: str
    supplier_id: str
    name: str
    created_at: str
    items: list[TemplateItemOut] = []

    model_config = {"from_attributes": True}


@router.get("/")
def list_templates(supplier_id: str, db: Session = Depends(get_db)):
    templates = (
        db.query(OrderTemplate)
        .options(joinedload(OrderTemplate.items).joinedload(OrderTemplateItem.product).joinedload(Product.prices))
        .filter(OrderTemplate.supplier_id == supplier_id)
        .order_by(OrderTemplate.created_at.desc())
        .all()
    )
    return [_serialize(t) for t in templates]


@router.post("/")
def create_template(body: TemplateCreate, db: Session = Depends(get_db)):
    t = OrderTemplate(supplier_id=body.supplier_id, name=body.name)
    db.add(t)
    db.flush()
    for item in body.items:
        db.add(OrderTemplateItem(template_id=t.id, product_id=item.product_id, quantity=item.quantity))
    db.commit()
    db.refresh(t)
    # reload with relationships
    t = (
        db.query(OrderTemplate)
        .options(joinedload(OrderTemplate.items).joinedload(OrderTemplateItem.product).joinedload(Product.prices))
        .filter(OrderTemplate.id == t.id)
        .first()
    )
    return _serialize(t)


@router.get("/{template_id}")
def get_template(template_id: str, db: Session = Depends(get_db)):
    t = (
        db.query(OrderTemplate)
        .options(joinedload(OrderTemplate.items).joinedload(OrderTemplateItem.product).joinedload(Product.prices))
        .filter(OrderTemplate.id == template_id)
        .first()
    )
    if not t:
        raise HTTPException(404, "Template not found")
    return _serialize(t)


@router.delete("/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db)):
    t = db.query(OrderTemplate).filter(OrderTemplate.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    db.delete(t)
    db.commit()
    return {"ok": True}


def _serialize(t: OrderTemplate) -> dict:
    items = []
    for i in t.items:
        p = i.product
        prices_sorted = sorted(p.prices, key=lambda x: x.recorded_at) if p else []
        latest_price = prices_sorted[-1].price if prices_sorted else None
        items.append({
            "id": i.id,
            "product_id": i.product_id,
            "product_name": p.name if p else "",
            "product_unit": p.unit if p else None,
            "quantity": i.quantity,
            "unit_price": latest_price,
        })
    return {
        "id": t.id,
        "supplier_id": t.supplier_id,
        "name": t.name,
        "created_at": t.created_at.isoformat() if t.created_at else "",
        "items": items,
    }
