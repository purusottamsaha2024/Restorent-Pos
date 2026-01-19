from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from typing import List
import csv_handler
from models import OrderCreate, OrderStatus, OrderItem

app = FastAPI(title="Chicken Shop POS")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# API Endpoints
@app.get("/api/orders")
async def list_orders():
    return csv_handler.get_orders()

@app.post("/api/orders")
async def create_order(order: OrderCreate):
    return csv_handler.add_order(order)

@app.patch("/api/orders/{order_id}/status")
async def update_status(order_id: str, status: OrderStatus):
    updated_order = csv_handler.update_order_status(order_id, status)
    if not updated_order:
        raise HTTPException(status_code=404, detail="Order not found")
    return updated_order

@app.get("/api/queue-stats")
async def get_queue_stats():
    return csv_handler.get_queue_stats()

# HTML Pages
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return RedirectResponse(url="/staff")

@app.get("/staff", response_class=HTMLResponse)
async def staff_dashboard(request: Request):
    return templates.TemplateResponse("staff_dashboard.html", {"request": request})

@app.get("/customer", response_class=HTMLResponse)
async def customer_display(request: Request):
    return templates.TemplateResponse("customer_display.html", {"request": request})

@app.get("/kitchen", response_class=HTMLResponse)
async def kitchen_display(request: Request):
    return templates.TemplateResponse("kitchen_display.html", {"request": request})

@app.get("/analytics", response_class=HTMLResponse)
async def analytics_dashboard(request: Request):
    return templates.TemplateResponse("analytics.html", {"request": request})

@app.get("/api/analytics")
async def get_analytics_endpoint():
    return csv_handler.get_analytics_data()
