from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from database import get_db
from models import Product, ProductPrice, OrderItem

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/")
def list_products(
    supplier_id: str | None = None,
    search: str | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    q = db.query(Product).options(joinedload(Product.prices))
    if supplier_id:
        q = q.filter(Product.supplier_id == supplier_id)
    if search:
        q = q.filter(Product.name.ilike(f"%{search}%"))
    if category:
        q = q.filter(Product.category == category)

    products = q.all()

    result = []
    for p in products:
        prices_sorted = sorted(p.prices, key=lambda x: x.recorded_at)
        latest_price = prices_sorted[-1].price if prices_sorted else None
        prev_price = prices_sorted[-2].price if len(prices_sorted) >= 2 else None

        price_change = None
        if latest_price and prev_price and prev_price > 0:
            price_change = round((latest_price - prev_price) / prev_price * 100, 1)

        result.append({
            "id": p.id,
            "supplier_id": p.supplier_id,
            "code": p.code,
            "name": p.name,
            "category": p.category,
            "unit": p.unit,
            "latest_price": latest_price,
            "prev_price": prev_price,
            "price_change_pct": price_change,
        })

    return result


@router.get("/categories")
def list_categories(supplier_id: str | None = None, db: Session = Depends(get_db)):
    q = db.query(Product.category).filter(Product.category.isnot(None))
    if supplier_id:
        q = q.filter(Product.supplier_id == supplier_id)
    cats = [row[0] for row in q.distinct().all() if row[0]]
    return sorted(cats)


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
