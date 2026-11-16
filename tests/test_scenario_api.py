import json
from fastapi.testclient import TestClient
from backend.main import app
from model_engine import get_default_assumptions

client = TestClient(app)

def test_create_and_get_scenario():
    assumptions = get_default_assumptions().model_dump()

    payload = {
        "name": "Test Scenario",
        "assumptions": assumptions,
        "description": "Testing scenario API"
    }
    # Create scenario
    resp = client.post("/api/scenarios", json=payload)
    assert resp.status_code == 200, f"Create failed: {resp.text}"
    data = resp.json()
    scenario_id = data["id"]
    # Retrieve scenario
    get_resp = client.get(f"/api/scenarios/{scenario_id}")
    assert get_resp.status_code == 200, f"Get failed: {get_resp.text}"
    retrieved = get_resp.json()
    assert retrieved["name"] == "Test Scenario"
    # Delete scenario
    del_resp = client.delete(f"/api/scenarios/{scenario_id}")
    assert del_resp.status_code == 200, f"Delete failed: {del_resp.text}"
    # Ensure deleted
    not_found = client.get(f"/api/scenarios/{scenario_id}")
    assert not_found.status_code == 404

def test_invalid_scenario_id():
    invalid_ids = ["invalid-id-format", "../evil", "12345", "test;drop table"]
    for inv_id in invalid_ids:
        resp = client.get(f"/api/scenarios/{inv_id}")
        assert resp.status_code in (400, 404)

    # Directly test invalid id format triggers 400
    resp_400 = client.get("/api/scenarios/invalid-format-uuid")
    assert resp_400.status_code == 400
    assert resp_400.json()["detail"] == "Invalid scenario ID format"

def test_pricing_validator_failure():
    bad_assumptions = get_default_assumptions().model_dump()

    # Sum of percentages != 1.0
    bad_assumptions["pricing_tiers"]["trial"]["customer_pct"] = 0.5
    bad_assumptions["pricing_tiers"]["pro"]["customer_pct"] = 0.5
    bad_assumptions["pricing_tiers"]["enterprise"]["customer_pct"] = 0.5

    payload = {
        "name": "Bad Scenario",
        "assumptions": bad_assumptions,
        "description": "Invalid pricing sum"
    }
    resp = client.post("/api/scenarios", json=payload)
    # Expect 422 validation error from Pydantic
    assert resp.status_code == 422
