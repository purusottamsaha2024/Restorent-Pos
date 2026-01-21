from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
from datetime import datetime

class OrderStatus(str, Enum):
    PENDING = "PENDING"     # Waiting 
    PREPARING = "PREPARING" # Cooking
    READY = "READY"         # Ready to collect
    COMPLETED = "COMPLETED" # Picked up
    CANCELLED = "CANCELLED"

class PaymentMethod(str, Enum):
    CASH = "CASH"
    CARD = "CARD"
    OTHER = "OTHER"

class OrderItem(BaseModel):
    name: str # e.g. "Combo 4"
    quantity: int
    price: float
    prepTimeMinutes: Optional[int] = None  # Prep time per item (15, 20, 25, or 30)

class OrderCreate(BaseModel):
    items: List[OrderItem]
    total_price: float
    payment_method: PaymentMethod
    customer_name: Optional[str] = None
    estimated_wait_time: Optional[int] = None # Allow manual override

class Order(OrderCreate):
    id: str
    order_number: int  # Simple daily number 0-99
    status: OrderStatus
    created_at: str
    estimated_wait_time: int
