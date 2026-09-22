import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["engine_id"] == "ENG-001"


def test_parameter_updates():
    response = client.post("/api/simulator/parameters", json={
        "throttle": 0.85,
        "altitude": 18000.0,
        "ambient_temperature": -5.0
    })
    assert response.status_code == 200
    assert response.json()["status"] == "parameters_updated"


def test_scenarios_list():
    response = client.get("/api/simulator/scenarios")
    assert response.status_code == 200
    data = response.json()
    assert "healthy_cruise" in data["scenarios"]
    assert "lubrication_degradation" in data["scenarios"]
