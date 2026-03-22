from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from difflib import SequenceMatcher

from database import get_db
from models import Product, ProductPrice, OrderItem, Supplier


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
