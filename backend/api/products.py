from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from database import get_db
from models import Product, ProductPrice, OrderItem, Supplier

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


@router.get("/compare")
def compare_products(name: str, db: Session = Depends(get_db)):
    """Find products with similar names across all suppliers and compare prices."""
    products = (
        db.query(Product)
        .options(joinedload(Product.prices), joinedload(Product.supplier))
        .filter(Product.name.ilike(f"%{name}%"))
        .all()
    )

    # Group by normalized name
    from collections import defaultdict
    groups: dict = defaultdict(list)
    for p in products:
        prices_sorted = sorted(p.prices, key=lambda x: x.recorded_at)
        latest_price = prices_sorted[-1].price if prices_sorted else None
        groups[p.name.strip()].append({
            "product_id": p.id,
            "supplier_id": p.supplier_id,
            "supplier_name": p.supplier.name if p.supplier else "",
            "price": latest_price,
            "unit": p.unit,
            "code": p.code,
        })

    result = []
    for product_name, matches in groups.items():
        if len(matches) >= 1:
            valid_prices = [m["price"] for m in matches if m["price"] is not None]
            min_price = min(valid_prices) if valid_prices else None
            result.append({
                "name": product_name,
                "matches": matches,
                "min_price": min_price,
            })

    return sorted(result, key=lambda x: x["name"])


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
