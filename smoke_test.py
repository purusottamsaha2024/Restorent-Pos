import requests
import sys
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000/api"

def test_api():
    print("Testing API for Visuals data...")
    
    # 1. Fetch Orders to check timestamp format
    r = requests.get(f"{BASE_URL}/orders")
    orders = r.json()
    
    if not orders:
        print("No orders to check, skipping...")
        return

    latest = orders[-1]
    created_at = latest.get("created_at")
    wait_time = latest.get("estimated_wait_time")
    
    print(f"Latest Order: {latest['id']}")
    print(f"Created At: {created_at}")
    print(f"Wait Time: {wait_time}")
    
    # Validate ISO format
    try:
        datetime.fromisoformat(created_at)
    except ValueError:
        print("Invalid ISO timestamp")
        sys.exit(1)
        
    print("Timestamp format valid for JS Timer logic.")
    print("ALL TESTS PASSED")

if __name__ == "__main__":
    try:
        test_api()
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
