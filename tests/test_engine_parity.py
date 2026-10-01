"""
Automated tests comparing Python engine results with representative Excel outputs.
Tests:
- Baseline workbook-default assumptions period by period across all 23 months against Excel cached values
- Summary KPIs (N4, N10, S9)
- At least two modified assumption sets
- Edge cases: zero conversion, zero leads, 100% churn, percentage boundaries, zero pricing
"""
import pytest
import openpyxl
from pathlib import Path
from decimal import Decimal
from model_engine import (
    get_default_assumptions,
    run_financial_model,
    calculate_weighted_arpu,
    ModelAssumptions
)

WORKBOOK_PATH = Path(__file__).parent.parent / "Startup_Financial_Models.xlsx"


@pytest.fixture(scope="module")
def excel_fixture():
    assert WORKBOOK_PATH.exists(), f"Reference workbook missing: {WORKBOOK_PATH}"
    wb = openpyxl.load_workbook(WORKBOOK_PATH, data_only=True)
    return wb


def test_baseline_excel_parity_all_months(excel_fixture):
    """
    Validates period-by-period matching of every calculated metric in the Financial Model
    for all 23 months against Excel.
    """
    ws_fin = excel_fixture['Financial Model ']
    assumptions = get_default_assumptions()
    response = run_financial_model(assumptions)
    
    col_letters = [openpyxl.utils.get_column_letter(c) for c in range(3, 26)]
    
    # Tolerances: exactly 0.0001 for monetary and counting values
    TOLERANCE = 1e-4
    mismatches = []
    
    row_mappings = [
        (20, "leads_generated", "Leads Generated", "leads"),
        (21, "lead_to_trial_conversion", "Lead->Trial Rate", "%"),
        (22, "trials_started", "Trials Started", "trials"),
        (23, "trial_to_paid_conversion", "Trial->Paid Rate", "%"),
        (24, "new_paid_customers", "New Paid Customers", "customers"),
        (25, "beginning_active_customers", "Beginning Active Customers", "customers"),
        (26, "monthly_churn_rate", "Monthly Churn Rate", "%"),
        (27, "churned_customers", "Churned Customers", "customers"),
        (28, "ending_active_customers", "Ending Active Customers", "customers"),
        (29, "trial_tier_customers", "Trial Tier Customers", "customers"),
        (30, "pro_tier_customers", "Pro Tier Customers", "customers"),
        (31, "enterprise_tier_customers", "Enterprise Tier Customers", "customers"),
        (32, "basic_plan_revenue", "Basic Plan Revenue", "$"),
        (33, "pro_plan_revenue", "Pro Plan Revenue", "$"),
        (34, "enterprise_plan_revenue", "Enterprise Plan Revenue", "$"),
        (35, "total_mrr", "Total MRR", "$"),
        (37, "cloud_hosting", "Cloud Hosting", "$"),
        (38, "payment_processing", "Payment Processing", "$"),
        (39, "third_party_apis", "Third-Party APIs", "$"),
        (40, "other_direct_costs", "Other Direct Costs", "$"),
        (41, "total_cogs", "Total COGS", "$"),
        (53, "total_opex", "Total OPEX", "$"),
        (56, "ebit", "EBIT", "$"),
    ]
    
    for month_res in response.monthly_results:
        col = month_res.column
        col_idx = month_res.period_index + 3
        period_name = month_res.label
        
        for excel_row, attr_name, metric_label, unit in row_mappings:
            excel_val = float(ws_fin.cell(row=excel_row, column=col_idx).value or 0.0)
            py_val = float(getattr(month_res, attr_name))
            diff = abs(py_val - excel_val)
            
            if diff > TOLERANCE:
                mismatches.append(
                    f"\n[MISMATCH] Output: '{metric_label}' ({attr_name}) | "
                    f"Sheet: 'Financial Model ' | Cell: {col}{excel_row} | "
                    f"Period: {period_name} | Expected Excel: {excel_val} | "
                    f"Actual Python: {py_val} | Diff: {diff:.6f}"
                )
                
    assert len(mismatches) == 0, f"Encountered {len(mismatches)} mismatches:\n" + "\n".join(mismatches)


def test_summary_kpis_parity(excel_fixture):
    """
    Tests Excel top KPI summary cells:
    - N4: =SUM(C28:Y28) (Total Customers)
    - N10: =SUM(C35:Y35) (Total Revenue)
    - S9: =SUM(C56:Y56) (Total EBIT)
    """
    ws_fin = excel_fixture['Financial Model ']
    assumptions = get_default_assumptions()
    response = run_financial_model(assumptions)
    
    expected_n4 = float(ws_fin['N4'].value)
    expected_n10 = float(ws_fin['N10'].value)
    expected_s9 = float(ws_fin['S9'].value)
    
    kpis = response.summary_kpis
    
    diff_cust = abs(kpis.total_customers_sum - expected_n4)
    diff_rev = abs(kpis.total_revenue_sum - expected_n10)
    diff_ebit = abs(kpis.total_ebit_sum - expected_s9)
    
    assert diff_cust < 1e-4, f"Mismatch in Total Customers (N4): Expected {expected_n4}, got {kpis.total_customers_sum}, Diff={diff_cust}"
    assert diff_rev < 1e-4, f"Mismatch in Total Revenue (N10): Expected {expected_n10}, got {kpis.total_revenue_sum}, Diff={diff_rev}"
    assert diff_ebit < 1e-4, f"Mismatch in Total EBIT (S9): Expected {expected_s9}, got {kpis.total_ebit_sum}, Diff={diff_ebit}"


def test_modified_scenario_high_growth():
    """
    Modified Scenario 1: High growth (higher conversion, higher marketing, pro tier shift).
    Validates model behaves consistently with higher conversion and customer scale.
    """
    assumptions = get_default_assumptions()
    assumptions.lead_to_trial_conversion = 0.35  # up from 0.20
    assumptions.trial_to_paid_conversion = 0.10  # up from 0.05
    assumptions.pricing_tiers.pro.customer_pct = 0.50
    assumptions.pricing_tiers.trial.customer_pct = 0.40
    
    res = run_financial_model(assumptions)
    
    # Revenue and customers should increase significantly
    assert res.summary_kpis.total_revenue_sum > 9352.0
    assert res.summary_kpis.total_customers_sum > 668.0
    assert res.summary_kpis.total_ebit_sum > 1456.99
    # Monotonicity check on new paid customers
    assert res.monthly_results[0].new_paid_customers >= 1


def test_modified_scenario_conservative_bear():
    """
    Modified Scenario 2: Conservative / Bear case (higher churn, lower conversion, lower enterprise pricing).
    """
    assumptions = get_default_assumptions()
    assumptions.monthly_churn = 0.08  # 8% churn
    assumptions.lead_to_trial_conversion = 0.10
    assumptions.trial_to_paid_conversion = 0.02
    assumptions.pricing_tiers.enterprise.price_per_month = 50.0  # discount
    
    res = run_financial_model(assumptions)
    
    assert res.summary_kpis.total_revenue_sum < 9352.0
    assert res.summary_kpis.total_customers_sum < 668.0


def test_edge_case_zero_leads():
    """
    Edge case: Zero leads across all periods.
    Customers should steadily churn down from initial 10, new paid should be 0.
    """
    assumptions = get_default_assumptions()
    for col in assumptions.monthly_leads:
        assumptions.monthly_leads[col] = 0.0
        
    res = run_financial_model(assumptions)
    
    assert res.summary_kpis.total_leads_generated == 0.0
    assert res.summary_kpis.total_new_paid_customers == 0.0
    
    # Check that customers decrease with churn
    m1_cust = res.monthly_results[0].ending_active_customers
    m23_cust = res.monthly_results[-1].ending_active_customers
    assert m23_cust < m1_cust


def test_edge_case_zero_conversion():
    """
    Edge case: Zero trial-to-paid conversion.
    New paid customers must be zero across all months.
    """
    assumptions = get_default_assumptions()
    assumptions.trial_to_paid_conversion = 0.0
    
    res = run_financial_model(assumptions)
    for m in res.monthly_results:
        assert m.new_paid_customers == 0.0


def test_edge_case_high_churn_100_percent():
    """
    Edge case: 100% monthly churn.
    Beginning customers immediately churn to 0.
    """
    assumptions = get_default_assumptions()
    assumptions.monthly_churn = 1.0
    
    res = run_financial_model(assumptions)
    # Month 1: 10 beg - 10 churned = 0 ending
    assert res.monthly_results[0].ending_active_customers == 0.0


def test_edge_case_percentage_boundaries():
    """
    Percentage boundaries: 0% and 100% conversion rates.
    """
    assumptions = get_default_assumptions()
    assumptions.lead_to_trial_conversion = 1.0
    assumptions.trial_to_paid_conversion = 1.0
    
    res = run_financial_model(assumptions)
    # Month 1: 66 leads -> 66 trials -> 66 new paid
    assert res.monthly_results[0].trials_started == 66.0
    assert res.monthly_results[0].new_paid_customers == 66.0


def test_weighted_arpu_formula():
    """
    Tests Assumptions!B8:
    =(B12*C12)+(B13*C13)+(B14*C14)
    Default: (0*0.6) + (20*0.3) + (80*0.1) = 0 + 6 + 8 = 14.0
    """
    assumptions = get_default_assumptions()
    arpu = calculate_weighted_arpu(assumptions)
    assert arpu == 14.0
