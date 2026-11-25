"""
User-added line items: expenses, direct costs and revenue that aren't in the
workbook but flow into the forecast.
"""
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.main import app
from model_engine import ModelAssumptions, get_default_assumptions, run_financial_model

client = TestClient(app)
MONTHS = 23


def run(custom_items):
    data = get_default_assumptions().model_dump()
    data["custom_items"] = custom_items
    return run_financial_model(ModelAssumptions(**data))


def item(**overrides):
    base = {"id": "x", "name": "Item", "kind": "expense", "basis": "per_month", "amount": 100.0, "start_month": 1}
    return {**base, **overrides}


@pytest.fixture(scope="module")
def baseline():
    return run([])


def test_no_custom_items_matches_workbook(baseline):
    # Same numbers as the existing Excel parity tests.
    assert baseline.summary_kpis.total_customers_sum == 668.0
    assert baseline.summary_kpis.total_revenue_sum == 9352.0
    assert all(m.custom_items_breakdown == {} for m in baseline.monthly_results)


def test_monthly_expense_increases_opex_and_lowers_ebit(baseline):
    result = run([item(kind="expense", amount=1000)])
    k, b = result.summary_kpis, baseline.summary_kpis
    assert k.total_opex_sum == pytest.approx(b.total_opex_sum + 1000 * MONTHS)
    assert k.total_ebit_sum == pytest.approx(b.total_ebit_sum - 1000 * MONTHS)
    assert k.total_revenue_sum == b.total_revenue_sum
    assert all(m.custom_expenses == 1000 for m in result.monthly_results)


def test_start_month_delays_the_item(baseline):
    result = run([item(kind="expense", amount=500, start_month=7)])
    months = result.monthly_results
    assert [m.custom_items_breakdown["x"] for m in months[:6]] == [0.0] * 6
    assert all(m.custom_items_breakdown["x"] == 500 for m in months[6:])
    assert result.summary_kpis.total_opex_sum == pytest.approx(baseline.summary_kpis.total_opex_sum + 500 * 17)


def test_per_customer_direct_cost_scales_with_customers(baseline):
    result = run([item(kind="direct_cost", basis="per_customer", amount=2)])
    for m, b in zip(result.monthly_results, baseline.monthly_results):
        assert m.custom_direct_costs == pytest.approx(2 * m.ending_active_customers)
        assert m.total_cogs == pytest.approx(b.total_cogs + 2 * m.ending_active_customers)
        assert m.total_opex == b.total_opex


def test_revenue_increases_total_revenue(baseline):
    result = run([item(kind="revenue", amount=300)])
    k, b = result.summary_kpis, baseline.summary_kpis
    assert k.total_revenue_sum == pytest.approx(b.total_revenue_sum + 300 * MONTHS)
    for m, bm in zip(result.monthly_results, baseline.monthly_results):
        assert m.total_mrr == pytest.approx(bm.total_mrr + 300)
        # Payment processing is a % of revenue, so it applies to the extra revenue too.
        assert m.payment_processing == pytest.approx(bm.payment_processing + 300 * 0.029, abs=1e-3)


def test_several_items_combine(baseline):
    result = run([
        item(id="a", kind="expense", amount=100),
        item(id="b", kind="expense", amount=50, start_month=12),
        item(id="c", kind="revenue", amount=0),
    ])
    expected_opex = baseline.summary_kpis.total_opex_sum + 100 * MONTHS + 50 * 12
    assert result.summary_kpis.total_opex_sum == pytest.approx(expected_opex)
    assert result.summary_kpis.total_revenue_sum == baseline.summary_kpis.total_revenue_sum


def test_annual_rollups_include_custom_items(baseline):
    result = run([item(kind="expense", amount=10)])
    total = next(r for r in result.annual_rollups if r.period_name.startswith("Total"))
    base_total = next(r for r in baseline.annual_rollups if r.period_name.startswith("Total"))
    assert total.total_opex == pytest.approx(base_total.total_opex + 10 * MONTHS)


@pytest.mark.parametrize("bad", [
    {"amount": -1},
    {"start_month": 0},
    {"start_month": 24},
    {"kind": "tax"},
    {"basis": "per_year"},
    {"name": ""},
])
def test_invalid_custom_items_rejected(bad):
    with pytest.raises(ValidationError):
        run([item(**bad)])


def test_duplicate_ids_rejected():
    with pytest.raises(ValidationError, match="unique id"):
        run([item(id="same"), item(id="same")])


def test_calculate_endpoint_and_scenario_round_trip():
    data = get_default_assumptions().model_dump()
    data["custom_items"] = [item(id="hire", name="Sales hire", amount=4000, start_month=6)]

    calc = client.post("/api/calculate", json=data)
    assert calc.status_code == 200, calc.text
    assert calc.json()["monthly_results"][5]["custom_items_breakdown"]["hire"] == 4000

    saved = client.post("/api/scenarios", json={"name": "With hire", "assumptions": data})
    assert saved.status_code == 200, saved.text
    loaded = client.get(f"/api/scenarios/{saved.json()['id']}").json()
    assert loaded["assumptions"]["custom_items"][0]["name"] == "Sales hire"


def test_old_scenarios_without_custom_items_still_load():
    data = get_default_assumptions().model_dump()
    data.pop("custom_items", None)
    assert ModelAssumptions(**data).custom_items == []
