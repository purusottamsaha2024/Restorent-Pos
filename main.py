from fastapi import FastAPI, HTTPException, Request, Form, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from typing import List
import csv_handler
from models import OrderCreate, OrderStatus, OrderItem
import secrets
from urllib.parse import quote

app = FastAPI(title="Petote POS")

app.add_middleware(SessionMiddleware, secret_key=secrets.token_urlsafe(32))

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Simple authentication - you can change these credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

def check_login(request: Request):
    """Check if user is logged in"""
    if not request.session.get("logged_in"):
        raise HTTPException(status_code=307, headers={"Location": "/login"})
    return True

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

# Authentication Routes
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    # If already logged in, redirect to staff
    if request.session.get("logged_in"):
        return RedirectResponse(url="/staff")
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    # Simple authentication check
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        request.session["logged_in"] = True
        request.session["username"] = username
        return RedirectResponse(url="/staff", status_code=303)
    else:
        error_msg = quote("Invalid username or password")
        return RedirectResponse(
            url=f"/login?error={error_msg}", 
            status_code=303
        )

@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    # Prevent back button from restoring session
    response = RedirectResponse(url="/login", status_code=303)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# HTML Pages
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    # Redirect to login if not logged in, otherwise to staff
    if not request.session.get("logged_in"):
        return RedirectResponse(url="/login")
    return RedirectResponse(url="/staff")

@app.get("/staff", response_class=HTMLResponse)
async def staff_dashboard(request: Request):
    if not request.session.get("logged_in"):
        return RedirectResponse(url="/login", status_code=303)
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
