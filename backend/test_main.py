import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.config import settings

@pytest.fixture(scope="module")
def client():
    # Use context manager to trigger FastAPI startup lifecycles (DB seeding)
    with TestClient(app) as c:
        yield c

def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_chatbot(client):
    payload = {
        "message": "What is PM2.5?",
        "language": "en"
    }
    response = client.post(f"{settings.API_V1_STR}/chatbot", json=payload)
    assert response.status_code == 200
    assert "PM2.5" in response.json()["response"]

def test_carbon_calculator(client):
    payload = {
        "vehicle_type": "petrol_car",
        "distance_km": 10.0,
        "passengers": 1
    }
    response = client.post(f"{settings.API_V1_STR}/carbon-calculator", json=payload)
    assert response.status_code == 200
    assert response.json()["co2_emitted_kg"] > 0
    assert "carbon_rating" in response.json()

def test_green_route(client):
    payload = {
        "start_lat": 18.5204,
        "start_lng": 73.8567,
        "end_lat": 18.5312,
        "end_lng": 73.8445,
        "mode": "walking"
    }
    response = client.post(f"{settings.API_V1_STR}/green-route", json=payload)
    assert response.status_code == 200
    assert "clean_route_points" in response.json()
    assert len(response.json()["clean_route_points"]) > 0

def test_auth_and_dashboard(client):
    # 1. Register a test citizen
    test_email = f"test_citizen_{int(pytest.importorskip('time').time())}@example.com"
    reg_payload = {
        "email": test_email,
        "password": "CitizenPassword123!",
        "name": "Test Citizen",
        "phone": "9998887776",
        "language": "en"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/register?role=citizen", json=reg_payload)
    assert response.status_code == 201
    
    # 2. Login
    login_data = {
        "username": test_email,
        "password": "CitizenPassword123!"
    }
    response = client.post(f"{settings.API_V1_STR}/auth/login", data=login_data)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    
    # 3. Retrieve me profile
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get(f"{settings.API_V1_STR}/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == test_email
    
    # 4. Access citizen dashboard (requires authentication)
    # Delhi has ID 1 because it's seeded first in startup seeder
    response = client.get(f"{settings.API_V1_STR}/citizen/dashboard?city_id=1", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "city" in data or "city_name" in data
    city_name = data.get("city") or data.get("city_name")
    assert city_name == "Delhi"
    assert "predictions" in data

if __name__ == "__main__":
    pytest.main(["-v", __file__])
