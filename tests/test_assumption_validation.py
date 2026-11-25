"""
Validation rules for financial assumptions: tier shares, conversion and churn rates.
"""
import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from model_engine import ModelAssumptions, SavedScenarioAssumptions, get_default_assumptions
from model_engine.schema import TIER_ALLOCATION_TOLERANCE

SCENARIOS_DIR = Path(__file__).resolve().parent.parent / "scenarios"


def with_tiers(trial, pro, enterprise):
    data = get_default_assumptions().model_dump()
    data["pricing_tiers"]["trial"]["customer_pct"] = trial
    data["pricing_tiers"]["pro"]["customer_pct"] = pro
    data["pricing_tiers"]["enterprise"]["customer_pct"] = enterprise
    return data


# --- Tier shares --------------------------------------------------------------

@pytest.mark.parametrize("tiers", [
    (0.2, 0.5, 0.3),
    (0.6, 0.3, 0.1),      # 0.6 + 0.3 + 0.1 is 0.9999999999999999 in floating point
    (0.0, 0.7, 0.3),      # a tier may be empty
    (1.0, 0.0, 0.0),
    (0.333, 0.333, 0.334),
])
def test_saved_scenario_accepts_tiers_adding_to_100(tiers):
    SavedScenarioAssumptions(**with_tiers(*tiers))


@pytest.mark.parametrize("tiers", [
    (0.4, 0.5, 0.3),      # 120%
    (0.2, 0.5, 0.2),      # 90%
    (0.0, 0.0, 0.0),
    (0.2, 0.5, 0.299),    # 99.9%: smallest step the editor allows
    (0.2, 0.5, 0.301),    # 100.1%
])
def test_saved_scenario_rejects_tiers_not_adding_to_100(tiers):
    with pytest.raises(ValidationError, match="add up to 100%"):
        SavedScenarioAssumptions(**with_tiers(*tiers))


def test_tolerance_absorbs_float_noise_only():
    noise = 1e-9
    SavedScenarioAssumptions(**with_tiers(0.2, 0.5, 0.3 + noise))
    assert TIER_ALLOCATION_TOLERANCE < 0.001  # still catches a 0.1% mistake


def test_live_calculation_allows_unbalanced_tiers():
    # The editor warns about this instead of blocking every keystroke.
    ModelAssumptions(**with_tiers(0.5, 0.3, 0.1))


@pytest.mark.parametrize("pct", [-0.01, 1.01])
def test_each_tier_share_stays_between_0_and_100(pct):
    with pytest.raises(ValidationError):
        ModelAssumptions(**with_tiers(pct, 0.5, 0.5))


def test_defaults_pass_strict_validation():
    SavedScenarioAssumptions(**get_default_assumptions().model_dump())


@pytest.mark.parametrize("path", sorted(SCENARIOS_DIR.glob("*.json")), ids=lambda p: p.stem)
def test_sample_scenarios_pass_strict_validation(path):
    data = json.loads(path.read_text())
    SavedScenarioAssumptions(**data["assumptions"])


# --- Conversion and churn rates -----------------------------------------------

RATE_FIELDS = ["monthly_churn", "lead_to_trial_conversion", "trial_to_paid_conversion"]


@pytest.mark.parametrize("field", RATE_FIELDS)
@pytest.mark.parametrize("value", [0.0, 0.03, 0.5, 1.0])
def test_rates_accept_0_to_100_percent(field, value):
    data = get_default_assumptions().model_dump()
    data[field] = value
    assert getattr(ModelAssumptions(**data), field) == value


@pytest.mark.parametrize("field", RATE_FIELDS)
@pytest.mark.parametrize("value", [-0.01, 1.01, 3.0])
def test_rates_reject_values_outside_0_to_100_percent(field, value):
    data = get_default_assumptions().model_dump()
    data[field] = value
    with pytest.raises(ValidationError):
        ModelAssumptions(**data)


def test_payment_processing_rate_bounded():
    data = get_default_assumptions().model_dump()
    data["cogs"]["payment_processing_pct"] = 1.5
    with pytest.raises(ValidationError):
        ModelAssumptions(**data)
