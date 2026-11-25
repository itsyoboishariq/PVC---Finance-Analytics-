"""
Scenario API tests: saving, loading, duplicating, deleting, and rejecting
unsafe scenario IDs. Runs against a temporary scenarios folder (see conftest.py).
"""
import json

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend.main import app, scenario_file_path
from model_engine import ModelAssumptions, get_default_assumptions

client = TestClient(app)

SAMPLE_IDS = ["conservative_bootstrapping", "growth_acceleration"]


def default_assumptions():
    return get_default_assumptions().model_dump()


def save(name, assumptions, **extra):
    res = client.post("/api/scenarios", json={"name": name, "assumptions": assumptions, **extra})
    assert res.status_code == 200, res.text
    return res.json()


def normalized(assumptions):
    """Saving fills in optional fields with their defaults; compare the values that matter."""
    return ModelAssumptions(**assumptions).model_dump()


def duplicate(scenario_id):
    """Mirrors the frontend: read the chosen scenario, save its assumptions under a new name."""
    source = client.get(f"/api/scenarios/{scenario_id}")
    assert source.status_code == 200, source.text
    source = source.json()
    return save(f"{source['name']} (Copy)", source["assumptions"], description=source.get("description", ""))


# --- Create / load / delete ---------------------------------------------------

def test_create_get_delete_scenario():
    created = save("Test Scenario", default_assumptions(), description="Testing scenario API")

    fetched = client.get(f"/api/scenarios/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Test Scenario"

    assert client.delete(f"/api/scenarios/{created['id']}").status_code == 200
    assert client.get(f"/api/scenarios/{created['id']}").status_code == 404


@pytest.mark.parametrize("scenario_id", SAMPLE_IDS)
def test_sample_scenarios_still_load(scenario_id):
    # These ship with the repo and use readable names rather than UUIDs.
    res = client.get(f"/api/scenarios/{scenario_id}")
    assert res.status_code == 200, res.text
    assert res.json()["id"] == scenario_id


@pytest.mark.parametrize("scenario_id", SAMPLE_IDS)
def test_sample_scenarios_can_be_resaved(scenario_id):
    original = client.get(f"/api/scenarios/{scenario_id}").json()
    resaved = save(original["name"], original["assumptions"], id=scenario_id, created_at=original["created_at"])
    assert resaved["id"] == scenario_id
    assert resaved["created_at"] == original["created_at"]


def test_scenario_list_includes_samples_and_new_saves():
    created = save("Listed", default_assumptions())
    ids = {s["id"] for s in client.get("/api/scenarios").json()}
    assert set(SAMPLE_IDS) <= ids
    assert created["id"] in ids


def test_tests_do_not_touch_real_scenarios(isolated_scenarios_dir):
    save("Temporary", default_assumptions())
    assert len(list(isolated_scenarios_dir.glob("*.json"))) == len(SAMPLE_IDS) + 1


# --- Duplication --------------------------------------------------------------

def test_duplicate_copies_the_selected_scenario_not_another():
    # Two scenarios with clearly different assumptions.
    a = default_assumptions()
    a["monthly_churn"] = 0.02
    b = default_assumptions()
    b["monthly_churn"] = 0.09
    scenario_a = save("Scenario A", a)
    scenario_b = save("Scenario B", b)

    # Duplicate B (imagine A is the one currently open in the app).
    copy = duplicate(scenario_b["id"])

    assert copy["id"] not in (scenario_a["id"], scenario_b["id"])
    assert copy["name"] == "Scenario B (Copy)"
    assert copy["assumptions"] == client.get(f"/api/scenarios/{scenario_b['id']}").json()["assumptions"]
    assert copy["assumptions"]["monthly_churn"] == 0.09


def test_duplicate_of_inactive_sample_scenario():
    copy = duplicate("growth_acceleration")
    source = client.get("/api/scenarios/growth_acceleration").json()
    assert normalized(copy["assumptions"]) == normalized(source["assumptions"])


def test_duplicate_leaves_original_and_other_scenarios_unchanged(isolated_scenarios_dir):
    before = {p.name: p.read_text() for p in isolated_scenarios_dir.glob("*.json")}
    duplicate("conservative_bootstrapping")
    after = {p.name: p.read_text() for p in isolated_scenarios_dir.glob("*.json")}

    for name, content in before.items():
        assert after[name] == content
    assert len(after) == len(before) + 1


# --- Unsafe IDs ---------------------------------------------------------------

# ("..", "/" and "\\" are covered by test_scenario_file_path_rejects_traversal; HTTP
# clients normalise ".." out of URLs before they reach the server.)
@pytest.mark.parametrize("bad_id", ["a.b", "test;drop", "x" * 65, "space id", "evil.json"])
def test_unsafe_ids_rejected_over_http(bad_id):
    res = client.get(f"/api/scenarios/{bad_id}")
    assert res.status_code == 400
    assert client.delete(f"/api/scenarios/{bad_id}").status_code == 400


@pytest.mark.parametrize("bad_id", ["../evil", "..\\evil", "/etc/passwd", "a/b", "", "..", "a.json"])
def test_scenario_file_path_rejects_traversal(bad_id):
    with pytest.raises(HTTPException) as exc:
        scenario_file_path(bad_id)
    assert exc.value.status_code == 400


def test_traversal_in_url_never_reaches_files():
    # An encoded "../" path doesn't match the scenario route at all.
    res = client.get("/api/scenarios/..%2F..%2Fbackend%2Fmain")
    assert res.status_code in (400, 404)
    assert "FastAPI" not in res.text


@pytest.mark.parametrize("bad_id", ["../outside", "a/b", "evil.json"])
def test_save_rejects_unsafe_id(bad_id, isolated_scenarios_dir):
    res = client.post("/api/scenarios", json={"id": bad_id, "name": "x", "assumptions": default_assumptions()})
    assert res.status_code == 400
    assert not (isolated_scenarios_dir.parent / "outside.json").exists()


def test_scenario_file_path_stays_inside_scenarios_dir(isolated_scenarios_dir):
    path = scenario_file_path("growth_acceleration")
    assert path.parent == isolated_scenarios_dir.resolve()


# --- Saving invalid assumptions -----------------------------------------------

def test_save_rejects_tiers_not_adding_to_100(isolated_scenarios_dir):
    bad = default_assumptions()
    for tier in ("trial", "pro", "enterprise"):
        bad["pricing_tiers"][tier]["customer_pct"] = 0.5

    res = client.post("/api/scenarios", json={"name": "Bad Scenario", "assumptions": bad})
    assert res.status_code == 422
    detail = res.json()["detail"]
    assert isinstance(detail, str)
    assert "add up to 100%" in detail and "150.0%" in detail
    assert len(list(isolated_scenarios_dir.glob("*.json"))) == len(SAMPLE_IDS)


def test_calculate_still_works_while_tiers_are_being_rebalanced():
    # Mid-edit the tiers may add to 90%; live calculation must not error.
    assumptions = default_assumptions()
    assumptions["pricing_tiers"]["trial"]["customer_pct"] = 0.5
    res = client.post("/api/calculate", json=assumptions)
    assert res.status_code == 200, res.text
