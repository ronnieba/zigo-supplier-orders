from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict

from database import get_db
from models import Order, OrderItem, Product, ProductPrice, SupplierBudget

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard/{supplier_id}")
def dashboard(supplier_id: str, db: Session = Depends(get_db)):
    """Summary stats for a supplier."""
    orders = db.query(Order).filter(Order.supplier_id == supplier_id).all()
    total_orders = len(orders)
    total_spent = sum(o.total_cost for o in orders)

    # Weekly spending (last 10 weeks)
    weekly = {}
    for o in orders:
        weekly[o.week_start] = weekly.get(o.week_start, 0) + o.total_cost
    weekly_chart = [
        {"week": k, "total": round(v, 2)}
        for k, v in sorted(weekly.items())[-10:]
    ]

    # Price alerts: products with >5% increase in latest catalog
    price_alerts = _price_alerts(supplier_id, db)

    # Budget
    budget_row = db.query(SupplierBudget).filter(SupplierBudget.supplier_id == supplier_id).first()
    budget = None
    if budget_row:
        current_week = sorted(weekly.keys())[-1] if weekly else None
        current_week_spent = weekly.get(current_week, 0) if current_week else 0
        pct = round(current_week_spent / budget_row.weekly_budget * 100, 1) if budget_row.weekly_budget > 0 else 0
        budget = {
            "weekly_budget": budget_row.weekly_budget,
            "current_week_spent": round(current_week_spent, 2),
            "pct_used": pct,
            "current_week": current_week,
        }

    return {
        "total_orders": total_orders,
        "total_spent": round(total_spent, 2),
        "weekly_chart": weekly_chart,
        "price_alerts": price_alerts,
        "budget": budget,
    }


@router.get("/price-changes/{supplier_id}")
def price_changes(supplier_id: str, db: Session = Depends(get_db)):
    """All products with price change between last two catalogs."""
    return _price_alerts(supplier_id, db, threshold=0)


def _price_alerts(supplier_id: str, db: Session, threshold: float = 0.05) -> list[dict]:
    products = db.query(Product).filter(Product.supplier_id == supplier_id).all()
    alerts = []
    for p in products:
        prices = sorted(p.prices, key=lambda x: x.recorded_at)
        if len(prices) >= 2:
            old_price = prices[-2].price
            new_price = prices[-1].price
            if old_price > 0:
                change_pct = (new_price - old_price) / old_price
                if abs(change_pct) >= threshold:
                    alerts.append({
                        "product_id": p.id,
                        "product_name": p.name,
                        "old_price": old_price,
                        "new_price": new_price,
                        "change_pct": round(change_pct * 100, 1),
                    })
    return sorted(alerts, key=lambda x: abs(x["change_pct"]), reverse=True)


@router.get("/top-products/{supplier_id}")
def top_products(supplier_id: str, limit: int = 10, db: Session = Depends(get_db)):
    """Most frequently ordered products."""
    rows = (
        db.query(OrderItem.product_id, func.count(OrderItem.id).label("times"))
        .join(Order)
        .filter(Order.supplier_id == supplier_id)
        .group_by(OrderItem.product_id)
        .order_by(func.count(OrderItem.id).desc())
        .limit(limit)
        .all()
    )
    result = []
    for product_id, times in rows:
        product = db.query(Product).filter(Product.id == product_id).first()
        result.append({
            "product_id": product_id,
            "product_name": product.name if product else "Unknown",
            "times_ordered": times,
        })
    return result
