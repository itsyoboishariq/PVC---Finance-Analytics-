"""
API tests for FastAPI server endpoints
"""
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from model_engine import get_default_assumptions

client = TestClient(app)


def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "Startup Financial Models API" in data["service"]


def test_defaults_endpoint():
    res = client.get("/api/defaults")
    assert res.status_code == 200
    data = res.json()
    assert "defaults" in data
    assert "periods" in data
    assert len(data["periods"]) == 23
    assert data["baseline_results"]["summary_kpis"]["total_customers_sum"] == 668.0


def test_calculate_endpoint():
    assump = get_default_assumptions()
    res = client.post("/api/calculate", json=assump.model_dump())
    assert res.status_code == 200
    data = res.json()
    assert data["summary_kpis"]["total_revenue_sum"] == 9352.0
    assert data["summary_kpis"]["total_ebit_sum"] == pytest.approx(1456.992, abs=1e-3)


def test_calculate_validation_error():
    assump = get_default_assumptions()
    payload = assump.model_dump()
    # Churn must be <= 1
    payload["monthly_churn"] = 2.5
    res = client.post("/api/calculate", json=payload)
    assert res.status_code == 422  # Validation error


def test_scenario_lifecycle():
    assump = get_default_assumptions()
    # 1. Save
    payload = {
        "name": "Automated Test Scenario",
        "description": "Created during pytest test",
        "assumptions": assump.model_dump()
    }
    save_res = client.post("/api/scenarios", json=payload)
    assert save_res.status_code == 200
    saved = save_res.json()
    scenario_id = saved["id"]
    
    # 2. List
    list_res = client.get("/api/scenarios")
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(s["id"] == scenario_id for s in items)
    
    # 3. Get
    get_res = client.get(f"/api/scenarios/{scenario_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Automated Test Scenario"
    
    # 4. Delete
    del_res = client.delete(f"/api/scenarios/{scenario_id}")
    assert del_res.status_code == 200
    
    # 5. Confirm deleted
    get_del = client.get(f"/api/scenarios/{scenario_id}")
    assert get_del.status_code == 404


def test_frontend_serving():
    res = client.get("/")
    assert res.status_code == 200
    assert "Startup Financial Models" in res.text or "<div id=\"root\">" in res.text
