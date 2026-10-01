"""
Financial Calculation Engine for Startup_Financial_Models.xlsx
Pure Python, testable, fully decoupled from web frameworks.
Preserves Excel formulas, cell references, rounding semantics, and dependencies.
"""
from decimal import Decimal, ROUND_UP, ROUND_HALF_UP
from typing import Dict, List, Any
from .schema import (
    ModelAssumptions,
    MonthlyResult,
    SummaryKPIs,
    AnnualRollup,
    ModelCalculationResponse,
    CellMetadata,
)
from .defaults import get_periods_definition


def excel_round(val: float | Decimal, decimals: int = 1) -> float:
    """Excel ROUND function: symmetric arithmetic rounding (ROUND_HALF_UP)."""
    d = Decimal(str(val))
    target = Decimal("10") ** -decimals if decimals > 0 else Decimal("1")
    return float(d.quantize(target, rounding=ROUND_HALF_UP))


def excel_roundup(val: float | Decimal, decimals: int = 0) -> float:
    """Excel ROUNDUP function: rounds away from zero."""
    d = Decimal(str(val))
    target = Decimal("10") ** -decimals if decimals > 0 else Decimal("1")
    return float(d.quantize(target, rounding=ROUND_UP))


def calculate_weighted_arpu(assumptions: ModelAssumptions) -> float:
    """
    Computes Excel Assumptions!B8:
    =(B12*C12)+(B13*C13)+(B14*C14)
    """
    tiers = assumptions.pricing_tiers
    arpu = (
        (tiers.trial.price_per_month * tiers.trial.customer_pct)
        + (tiers.pro.price_per_month * tiers.pro.customer_pct)
        + (tiers.enterprise.price_per_month * tiers.enterprise.customer_pct)
    )
    return round(arpu, 4)


def run_financial_model(assumptions: ModelAssumptions) -> ModelCalculationResponse:
    """
    Executes the entire 23-month financial model, replicating workbook dependencies,
    rounding rules, and cell structures.
    """
    periods = get_periods_definition()
    monthly_results: List[MonthlyResult] = []
    
    # Pre-calculate monthly OPEX
    opex_dict = {item.name: item.value for item in assumptions.opex}
    total_monthly_opex = sum(item.value for item in assumptions.opex)
    
    prev_ending_customers = None
    
    ending_cust_all = []
    total_mrr_all = []
    ebit_all = []
    total_cogs_all = []
    leads_all = []
    new_paid_all = []
    
    # Pricing tiers
    trial_tier = assumptions.pricing_tiers.trial
    pro_tier = assumptions.pricing_tiers.pro
    ent_tier = assumptions.pricing_tiers.enterprise
    
    for idx, period in enumerate(periods):
        col = period["column"]
        date_str = period["date"]
        label = period["label"]
        
        # 1. Funnel
        # C20: ='Lead Generation '!$H$4; D20..Y20: monthly leads
        leads = float(assumptions.monthly_leads.get(col, 0.0))
        leads_all.append(leads)
        
        # Row 21: Lead -> Trial Conversion
        lead_to_trial = assumptions.lead_to_trial_conversion
        
        # Row 22: Trials Started (=C20*C21)
        trials_started = float(Decimal(str(leads)) * Decimal(str(lead_to_trial)))
        
        # Row 23: Trial -> Paid Conversion
        trial_to_paid = assumptions.trial_to_paid_conversion
        
        # Row 24: New Paid Customers (=ROUNDUP(C22*C23, 0))
        raw_new_paid = Decimal(str(trials_started)) * Decimal(str(trial_to_paid))
        new_paid = excel_roundup(raw_new_paid, 0)
        new_paid_all.append(new_paid)
        
        # 2. Customer Waterfall
        # Row 25: Beginning Active Customers (Month 1 = B3, Month 2+ = prev ending active customers)
        if idx == 0:
            beg_cust = assumptions.beginning_customers
        else:
            beg_cust = prev_ending_customers
            
        # Row 26: Monthly Churn Rate
        churn_rate = assumptions.monthly_churn
        
        # Row 27: (-) Churned Customers (=ROUNDUP(SUM(C25:C25)*C26, 0))
        raw_churned = Decimal(str(beg_cust)) * Decimal(str(churn_rate))
        churned = excel_roundup(raw_churned, 0)
        
        # Row 28: Ending Active Customers
        # Month 1: =SUM(C25:C25)-C27
        # Month 2+: =SUM(D24:D25)-D27
        if idx == 0:
            ending_cust = beg_cust - churned
        else:
            ending_cust = new_paid + beg_cust - churned
            
        prev_ending_customers = ending_cust
        ending_cust_all.append(ending_cust)
        
        # 3. Customer Breakdown
        # Row 29: Trial Tier Customers (=ROUND(C28*'Assumptions '!$C$12, 1))
        trial_cust = excel_round(Decimal(str(ending_cust)) * Decimal(str(trial_tier.customer_pct)), 1)
        # Row 30: Pro Tier Customers (=ROUND(C28*'Assumptions '!$C$13, 1))
        pro_cust = excel_round(Decimal(str(ending_cust)) * Decimal(str(pro_tier.customer_pct)), 1)
        # Row 31: Enterprise Tier Customers (=ROUND(C28*'Assumptions '!$C$14, 1))
        ent_cust = excel_round(Decimal(str(ending_cust)) * Decimal(str(ent_tier.customer_pct)), 1)
        
        # 4. Revenue Build (MRR)
        # Row 32: Basic Plan Revenue (='Assumptions '!$B$12*C29)
        basic_rev = float(Decimal(str(trial_tier.price_per_month)) * Decimal(str(trial_cust)))
        # Row 33: Pro Plan Revenue (=C30*'Assumptions '!$B$13)
        pro_rev = float(Decimal(str(pro_tier.price_per_month)) * Decimal(str(pro_cust)))
        # Row 34: Enterprise Plan Revenue (='Assumptions '!$B$14*C31)
        ent_rev = float(Decimal(str(ent_tier.price_per_month)) * Decimal(str(ent_cust)))
        # Row 35: Total MRR (=SUM(C32:C34))
        total_mrr = float(Decimal(str(basic_rev)) + Decimal(str(pro_rev)) + Decimal(str(ent_rev)))
        total_mrr_all.append(total_mrr)
        
        # 5. COGS
        # Row 37: Cloud Hosting (45)
        cloud_host = assumptions.cogs.cloud_hosting_fixed
        # Row 38: Payment Processing (=0.029*C35)
        payment_proc = float(Decimal(str(assumptions.cogs.payment_processing_pct)) * Decimal(str(total_mrr)))
        # Row 39: Third-Party APIs (=1*C28)
        api_costs = float(Decimal(str(assumptions.cogs.api_per_customer)) * Decimal(str(ending_cust)))
        # Row 40: Other Direct Costs (=1*C29)
        other_direct = float(Decimal(str(assumptions.cogs.other_direct_per_trial)) * Decimal(str(trial_cust)))
        # Row 41: Total COGS (=SUM(C37:C40))
        total_cogs = float(Decimal(str(cloud_host)) + Decimal(str(payment_proc)) + Decimal(str(api_costs)) + Decimal(str(other_direct)))
        total_cogs_all.append(total_cogs)
        
        gross_profit = total_mrr - total_cogs
        gross_margin_pct = (gross_profit / total_mrr * 100) if total_mrr > 0 else 0.0
        
        # 6. OPEX (Row 53: =SUM(C42:C52))
        total_opex = total_monthly_opex
        
        # 7. EBIT (Row 56: =C35-C41-C53)
        ebit = float(Decimal(str(total_mrr)) - Decimal(str(total_cogs)) - Decimal(str(total_opex)))
        ebit_all.append(ebit)
        ebit_margin_pct = (ebit / total_mrr * 100) if total_mrr > 0 else 0.0
        
        # Cell metadata mapping
        meta = {
            "leads_generated": CellMetadata(sheet="Financial Model ", cell=f"{col}20", formula="='Lead Generation '!$H$4" if idx == 0 else None, unit="leads"),
            "lead_to_trial_conversion": CellMetadata(sheet="Financial Model ", cell=f"{col}21", formula="='Assumptions  '!$B$19", unit="%"),
            "trials_started": CellMetadata(sheet="Financial Model ", cell=f"{col}22", formula=f"={col}20*{col}21", unit="trials"),
            "trial_to_paid_conversion": CellMetadata(sheet="Financial Model ", cell=f"{col}23", formula="='Assumptions  '!$B$20", unit="%"),
            "new_paid_customers": CellMetadata(sheet="Financial Model ", cell=f"{col}24", formula=f"=ROUNDUP({col}22*{col}23,0)", unit="customers"),
            "beginning_active_customers": CellMetadata(sheet="Financial Model ", cell=f"{col}25", formula="='Assumptions  '!$B$3" if idx == 0 else f"={openpyxl_prev_col(idx)}28", unit="customers"),
            "monthly_churn_rate": CellMetadata(sheet="Financial Model ", cell=f"{col}26", formula="='Assumptions  '!$B$5", unit="%"),
            "churned_customers": CellMetadata(sheet="Financial Model ", cell=f"{col}27", formula=f"=ROUNDUP(SUM({col}25:{col}25)*{col}26, 0)", unit="customers"),
            "ending_active_customers": CellMetadata(sheet="Financial Model ", cell=f"{col}28", formula=f"=SUM({col}25:{col}25)-{col}27" if idx == 0 else f"=SUM({col}24:{col}25)-{col}27", unit="customers"),
            "trial_tier_customers": CellMetadata(sheet="Financial Model ", cell=f"{col}29", formula=f"=ROUND({col}28*'Assumptions  '!$C$12, 1)", unit="customers"),
            "pro_tier_customers": CellMetadata(sheet="Financial Model ", cell=f"{col}30", formula=f"=ROUND({col}28*'Assumptions  '!$C$13, 1)", unit="customers"),
            "enterprise_tier_customers": CellMetadata(sheet="Financial Model ", cell=f"{col}31", formula=f"=ROUND({col}28*'Assumptions  '!$C$14, 1)", unit="customers"),
            "basic_plan_revenue": CellMetadata(sheet="Financial Model ", cell=f"{col}32", formula=f"='Assumptions  '!$B$12*{col}29", unit="$"),
            "pro_plan_revenue": CellMetadata(sheet="Financial Model ", cell=f"{col}33", formula=f"={col}30*'Assumptions  '!$B$13", unit="$"),
            "enterprise_plan_revenue": CellMetadata(sheet="Financial Model ", cell=f"{col}34", formula=f"='Assumptions  '!$B$14*'Financial Model '!{col}31", unit="$"),
            "total_mrr": CellMetadata(sheet="Financial Model ", cell=f"{col}35", formula=f"=SUM({col}32:{col}34)", unit="$"),
            "cloud_hosting": CellMetadata(sheet="Financial Model ", cell=f"{col}37", formula=None, unit="$"),
            "payment_processing": CellMetadata(sheet="Financial Model ", cell=f"{col}38", formula=f"=0.029*{col}35", unit="$"),
            "third_party_apis": CellMetadata(sheet="Financial Model ", cell=f"{col}39", formula=f"=1*{col}28", unit="$"),
            "other_direct_costs": CellMetadata(sheet="Financial Model ", cell=f"{col}40", formula=f"=1*{col}29", unit="$"),
            "total_cogs": CellMetadata(sheet="Financial Model ", cell=f"{col}41", formula=f"=SUM({col}37:{col}40)", unit="$"),
            "total_opex": CellMetadata(sheet="Financial Model ", cell=f"{col}53", formula=f"=SUM({col}42:{col}52)", unit="$"),
            "ebit": CellMetadata(sheet="Financial Model ", cell=f"{col}56", formula=f"={col}35-{col}41-{col}53", unit="$"),
        }
        
        monthly_results.append(MonthlyResult(
            period_index=idx,
            column=col,
            date=date_str,
            label=label,
            leads_generated=round(leads, 2),
            lead_to_trial_conversion=lead_to_trial,
            trials_started=round(trials_started, 4),
            trial_to_paid_conversion=trial_to_paid,
            new_paid_customers=new_paid,
            beginning_active_customers=beg_cust,
            monthly_churn_rate=churn_rate,
            churned_customers=churned,
            ending_active_customers=ending_cust,
            trial_tier_customers=trial_cust,
            pro_tier_customers=pro_cust,
            enterprise_tier_customers=ent_cust,
            basic_plan_revenue=round(basic_rev, 4),
            pro_plan_revenue=round(pro_rev, 4),
            enterprise_plan_revenue=round(ent_rev, 4),
            total_mrr=round(total_mrr, 4),
            cloud_hosting=round(cloud_host, 2),
            payment_processing=round(payment_proc, 4),
            third_party_apis=round(api_costs, 2),
            other_direct_costs=round(other_direct, 4),
            total_cogs=round(total_cogs, 4),
            gross_profit=round(gross_profit, 4),
            gross_margin_pct=round(gross_margin_pct, 2),
            opex_breakdown=opex_dict,
            total_opex=round(total_opex, 2),
            ebit=round(ebit, 4),
            ebit_margin_pct=round(ebit_margin_pct, 2),
            metadata=meta
        ))

    # Summary KPIs
    # Excel N4: =SUM(C28:Y28)
    sum_total_customers = sum(ending_cust_all)
    # Excel N10: =SUM(C35:Y35)
    sum_total_revenue = sum(total_mrr_all)
    # Excel S9: =SUM(C56:Y56)
    sum_total_ebit = sum(ebit_all)
    sum_total_cogs = sum(total_cogs_all)
    sum_total_opex = total_monthly_opex * len(periods)
    sum_leads = sum(leads_all)
    sum_new_paid = sum(new_paid_all)
    final_customers = ending_cust_all[-1] if ending_cust_all else 0.0
    final_mrr = total_mrr_all[-1] if total_mrr_all else 0.0
    avg_mrr_per_cust = (final_mrr / final_customers) if final_customers > 0 else 0.0
    overall_gm = ((sum_total_revenue - sum_total_cogs) / sum_total_revenue * 100) if sum_total_revenue > 0 else 0.0
    overall_ebit_m = (sum_total_ebit / sum_total_revenue * 100) if sum_total_revenue > 0 else 0.0

    kpi_meta = {
        "total_customers_sum": CellMetadata(sheet="Financial Model ", cell="N4", formula="=SUM(C28:Y28)", unit="customer-months", description="Total active customer-months across all 23 periods"),
        "total_revenue_sum": CellMetadata(sheet="Financial Model ", cell="N10", formula="=SUM(C35:Y35)", unit="$", description="Total MRR revenue earned over the 23-month horizon"),
        "total_ebit_sum": CellMetadata(sheet="Financial Model ", cell="S9", formula="=SUM(C56:Y56)", unit="$", description="Total cumulative EBIT over the 23-month horizon")
    }

    summary_kpis = SummaryKPIs(
        total_customers_sum=round(sum_total_customers, 2),
        total_revenue_sum=round(sum_total_revenue, 4),
        total_ebit_sum=round(sum_total_ebit, 4),
        total_cogs_sum=round(sum_total_cogs, 4),
        total_opex_sum=round(sum_total_opex, 2),
        total_leads_generated=round(sum_leads, 2),
        total_new_paid_customers=round(sum_new_paid, 2),
        ending_active_customers_final=round(final_customers, 2),
        avg_mrr_per_active_cust_final=round(avg_mrr_per_cust, 2),
        overall_gross_margin_pct=round(overall_gm, 2),
        overall_ebit_margin_pct=round(overall_ebit_m, 2),
        metadata=kpi_meta
    )

    # Annual and Period Rollups:
    # 1. Year 1 (Months 1-12, Jul 2026 - Jun 2027: C..N)
    # 2. Year 2 (Months 13-23, Jul 2027 - May 2028: O..Y)
    # 3. Calendar 2026 (M1-M6, Jul-Dec 2026: C..H)
    # 4. Calendar 2027 (M7-M18, Jan-Dec 2027: I..T)
    # 5. Calendar 2028 (M19-M23, Jan-May 2028: U..Y)
    # 6. Total Horizon (M1-M23: C..Y)
    groups = [
        ("Year 1 (M1-M12)", 0, 12),
        ("Year 2 (M13-M23)", 12, 23),
        ("Cal 2026 (6 mo)", 0, 6),
        ("Cal 2027 (12 mo)", 6, 18),
        ("Cal 2028 (5 mo)", 18, 23),
        ("Total Horizon (23 mo)", 0, 23),
    ]

    annual_rollups = []
    for g_name, start_i, end_i in groups:
        sub_results = monthly_results[start_i:end_i]
        if not sub_results:
            continue
        g_rev = sum(m.total_mrr for m in sub_results)
        g_cogs = sum(m.total_cogs for m in sub_results)
        g_opex = sum(m.total_opex for m in sub_results)
        g_ebit = sum(m.ebit for m in sub_results)
        g_gp = g_rev - g_cogs
        g_leads = sum(m.leads_generated for m in sub_results)
        g_new_paid = sum(m.new_paid_customers for m in sub_results)
        g_ending_cust = sub_results[-1].ending_active_customers

        annual_rollups.append(AnnualRollup(
            period_name=g_name,
            months_included=[m.column for m in sub_results],
            total_revenue=round(g_rev, 4),
            total_cogs=round(g_cogs, 4),
            gross_profit=round(g_gp, 4),
            total_opex=round(g_opex, 2),
            ebit=round(g_ebit, 4),
            ending_customers=round(g_ending_cust, 2),
            leads_generated=round(g_leads, 2),
            new_paid_customers=round(g_new_paid, 2)
        ))

    weighted_arpu = calculate_weighted_arpu(assumptions)

    return ModelCalculationResponse(
        monthly_results=monthly_results,
        summary_kpis=summary_kpis,
        annual_rollups=annual_rollups,
        weighted_arpu=weighted_arpu,
        assumptions_echo=assumptions
    )


def openpyxl_prev_col(idx: int) -> str:
    """Returns the Excel column letter for the prior month."""
    # col index 3 is C (idx 0). idx 1 is D (col 4). Prior is C (col 3)
    c_num = idx + 2
    from openpyxl.utils import get_column_letter
    return get_column_letter(c_num)
