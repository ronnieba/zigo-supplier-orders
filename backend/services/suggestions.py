from collections import defaultdict


def calculate_suggestions(order_history: list) -> dict:
    """
    Returns {product_id: {suggested_qty, avg_qty, trend, order_count}}
    Based on last N orders.
    """
    product_data: dict[str, list[float]] = defaultdict(list)

    for order in order_history:
        for item in order.get("items", []):
            product_data[item["product_id"]].append(item["quantity"])

    suggestions = {}
    for product_id, quantities in product_data.items():
        n = len(quantities)
        avg = sum(quantities) / n
        recent = quantities[-4:] if n >= 4 else quantities
        suggested = round(sum(recent) / len(recent), 3)

        # simple trend: compare first half vs second half
        if n >= 4:
            mid = n // 2
            first_avg = sum(quantities[:mid]) / mid
            second_avg = sum(quantities[mid:]) / (n - mid)
            if second_avg > first_avg * 1.1:
                trend = "up"
            elif second_avg < first_avg * 0.9:
                trend = "down"
            else:
                trend = "stable"
        else:
            trend = "stable"

        suggestions[product_id] = {
            "suggested_qty": suggested,
            "avg_qty": round(avg, 3),
            "trend": trend,
            "order_count": n,
        }

    return suggestions
