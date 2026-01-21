import csv
import os
from typing import List, Optional
from models import Order, OrderStatus, OrderCreate, PaymentMethod
import uuid
from datetime import datetime
import json

CSV_FILE = "data/orders.csv"

def _read_orders() -> List[Order]:
    if not os.path.exists(CSV_FILE):
        return []
    
    orders = []
    with open(CSV_FILE, mode='r', newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                items_data = json.loads(row['items'].replace("'", '"')) 
            except json.JSONDecodeError:
                items_data = [] 
            
            # Handle potential missing fields from old data
            try:
                pm = PaymentMethod(row.get('payment_method', 'CASH'))
            except ValueError:
                pm = PaymentMethod.CASH

            orders.append(Order(
                id=row['id'],
                order_number=int(row.get('order_number', 0)),
                items=items_data,
                total_price=float(row['total_price']),
                payment_method=pm,
                customer_name=row.get('customer_name', ''), # Read name
                status=OrderStatus(row['status']),
                created_at=row['created_at'],
                estimated_wait_time=int(row['estimated_wait_time'])
            ))
    return orders

def _write_orders(orders: List[Order]):
    os.makedirs(os.path.dirname(CSV_FILE), exist_ok=True)
    with open(CSV_FILE, mode='w', newline='', encoding='utf-8') as f:
        fieldnames = ["id", "order_number", "items", "total_price", "payment_method", "customer_name", "status", "created_at", "estimated_wait_time"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for order in orders:
            row = order.dict()
            row['items'] = json.dumps([item.dict() for item in order.items])
            row['status'] = order.status.value
            row['payment_method'] = order.payment_method.value
            # customer_name is optional, handle None
            if not row.get('customer_name'):
                row['customer_name'] = ""
            writer.writerow(row)

def get_orders() -> List[Order]:
    return _read_orders()

def _calculate_wait_time(items: List) -> int:
    # Logic: 
    # Base prep time 5 mins
    # + 1 min per 4 pieces of chicken (rough heuristic)
    # Combo 4 = 1 min, Combo 16 = 4 mins logic
    # But user gave explicit rules: 4-8 pcs -> 10-15m, 12-16 pcs -> 15-20m.
    
    total_pieces = 0
    for item in items:
        # Heuristic parsing of item name or just ID mapping if we had it.
        # Since we use names like "Combo 4", "Familiar 16", etc.
        name = item.name.lower()
        qty = item.quantity
        if "4" in name: total_pieces += 4 * qty
        elif "8" in name: total_pieces += 8 * qty
        elif "12" in name: total_pieces += 12 * qty
        elif "16" in name: total_pieces += 16 * qty
        elif "personal" in name: total_pieces += 2 * qty
        elif "familiar" in name: total_pieces += 8 * qty # Assume bucket is ~8-10
        else: total_pieces += 4 * qty # Fallback

    if total_pieces <= 8:
        return 15 # Conservative upper bound of 10-15
    elif total_pieces <= 16:
        return 20 # Upper bound of 15-20
    else:
        return 20 + (total_pieces - 16) # Add time for very large orders

def _generate_order_number(orders: List[Order]) -> int:
    # Simple logic: max + 1, rolling 0-99
    if not orders:
        return 1
    
    # Check orders from TODAY only if possible, or just global counter for demo
    last_num = orders[-1].order_number
    next_num = last_num + 1
    if next_num > 99:
        return 1
    return next_num

def add_order(order_data: OrderCreate) -> Order:
    orders = _read_orders()
    
    new_order_num = _generate_order_number(orders)
    
    # Use manual wait time if provided, else calculate
    if order_data.estimated_wait_time is not None and order_data.estimated_wait_time > 0:
        est_time = order_data.estimated_wait_time
    else:
        est_time = _calculate_wait_time(order_data.items)

    new_order = Order(
        id=str(uuid.uuid4())[:8],
        order_number=new_order_num,
        items=order_data.items,
        total_price=order_data.total_price,
        payment_method=order_data.payment_method,
        customer_name=order_data.customer_name,
        status=OrderStatus.PENDING,
        created_at=datetime.now().isoformat(),
        estimated_wait_time=est_time
    )
    orders.append(new_order)
    _write_orders(orders)
    return new_order

def update_order_status(order_id: str, new_status: OrderStatus) -> Optional[Order]:
    orders = _read_orders()
    for order in orders:
        if order.id == order_id:
            order.status = new_status
            _write_orders(orders)
            return order
    return None

def get_queue_stats():
    orders = _read_orders()
    active_orders = [o for o in orders if o.status in [OrderStatus.PENDING, OrderStatus.PREPARING]]
    
    # Wait time is max of individual orders or sum?
    # Usually in queue, it's cumulative if single outcome. 
    # But parallel cooking? 
    # Let's say parallel capacity is limited. 
    # Simple logic: sum of wait times might be too high.
    # Let's average? Or just return the max wait time of current queue + buffer?
    
    if not active_orders:
        return {"total_estimated_wait_time": 0, "active_orders_count": 0}

    # For new customers, wait time is roughly (Sum of all prep times) / (Concurrent capability)
    # Let's just sum them for MVP safety, or cap it.
    total_wait_time = sum(o.estimated_wait_time for o in active_orders)
    # Reduce it a bit assuming overlap
    adjusted_wait_time = int(total_wait_time * 0.7) 
    
    return {
        "active_orders_count": len(active_orders),
        "total_estimated_wait_time": adjusted_wait_time
    }

def get_analytics_data():
    orders = _read_orders()
    total_revenue = 0
    total_orders = len(orders)
    items_sold = {}
    hourly_sales = {}
    daily_sales = {}
    status_counts = {status.value: 0 for status in OrderStatus}
    payment_mix = {pm.value: 0 for pm in PaymentMethod}
    total_items = 0
    
    for order in orders:
        status_counts[order.status.value] = status_counts.get(order.status.value, 0) + 1
        payment_mix[order.payment_method.value] = payment_mix.get(order.payment_method.value, 0) + 1

        if order.status == OrderStatus.CANCELLED:
            continue
            
        total_revenue += order.total_price
        
        # Hourly Sales
        try:
            dt = datetime.fromisoformat(order.created_at)
            hour = dt.hour
            hourly_sales[hour] = hourly_sales.get(hour, 0) + order.total_price
            day_key = dt.date().isoformat()
            daily_sales[day_key] = daily_sales.get(day_key, 0) + order.total_price
        except:
            pass
        
        # Items
        for item in order.items:
            items_sold[item.name] = items_sold.get(item.name, 0) + item.quantity
            total_items += item.quantity
            
    # Sort Hourly
    sorted_hourly = dict(sorted(hourly_sales.items()))
    
    # Sort Items by popularity
    sorted_items = dict(sorted(items_sold.items(), key=lambda item: item[1], reverse=True)[:5])
    
    # Last 7 days sales (sorted)
    sorted_daily = dict(sorted(daily_sales.items())[-7:])
    
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    avg_items_per_order = total_items / total_orders if total_orders > 0 else 0
    cancelled = status_counts.get(OrderStatus.CANCELLED.value, 0)
    cancel_rate = round((cancelled / total_orders) * 100, 2) if total_orders else 0
    
    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "average_order_value": round(avg_order_value, 2),
        "hourly_sales": sorted_hourly,
        "top_items": sorted_items,
        "recent_orders": [o.dict() for o in orders[-10:]],
        "status_counts": status_counts,
        "payment_mix": payment_mix,
        "daily_sales": sorted_daily,
        "average_items_per_order": round(avg_items_per_order, 2),
        "cancel_rate": cancel_rate
    }
