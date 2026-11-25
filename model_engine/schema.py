"""
Pydantic Schemas for Financial Model Engine
"""
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field, model_validator


class CellMetadata(BaseModel):
    sheet: str
    cell: str
    formula: Optional[str] = None
    unit: Optional[str] = None
    description: Optional[str] = None


class PricingTierInput(BaseModel):
    name: str
    price_per_month: float = Field(..., ge=0, description="Monthly price for this tier")
    customer_pct: float = Field(..., ge=0, le=1, description="Percentage of customers in this tier (0.0 to 1.0)")


class PricingTiersInput(BaseModel):
    trial: PricingTierInput
    pro: PricingTierInput
    enterprise: PricingTierInput

    def allocation_total(self) -> float:
        return self.trial.customer_pct + self.pro.customer_pct + self.enterprise.customer_pct


# The editor accepts tier shares in 0.1% steps, so any real mistake is off by
# at least 0.001. Half a step absorbs floating-point noise (e.g. 0.6+0.3+0.1)
# while still rejecting a sum of 99.9% or 100.1%.
TIER_ALLOCATION_TOLERANCE = 0.0005


class COGSInput(BaseModel):
    cloud_hosting_fixed: float = Field(default=45.0, ge=0, description="Monthly fixed cloud hosting")
    payment_processing_pct: float = Field(default=0.029, ge=0, le=1, description="Payment processing % of MRR")
    api_per_customer: float = Field(default=1.0, ge=0, description="Support APIs cost per active customer")
    other_direct_per_trial: float = Field(default=1.0, ge=0, description="Other direct cost per trial customer")


class OPEXItemInput(BaseModel):
    row: int
    category: str
    name: str
    value: float = Field(..., ge=0, description="Monthly expense amount")
    source: Optional[str] = None


class LeadItem(BaseModel):
    row: int
    customer_name: str
    date_found: str
    primary_contact: str = ""
    summary: str = ""
    customer_converted: str = "No"
    contract_amount_yearly: float = 0.0


class PeriodDefinition(BaseModel):
    index: int
    column: str
    date: str
    label: str


class ModelAssumptions(BaseModel):
    beginning_customers: float = Field(default=10.0, ge=0, description="Active customers at Month 1 start")
    monthly_churn: float = Field(default=0.03, ge=0, le=1, description="Monthly churn rate (0.0 to 1.0)")
    lead_to_trial_conversion: float = Field(default=0.20, ge=0, le=1, description="Lead -> Trial conversion rate")
    trial_to_paid_conversion: float = Field(default=0.05, ge=0, le=1, description="Trial -> Paid conversion rate")
    pricing_tiers: PricingTiersInput
    cogs: COGSInput
    opex: List[OPEXItemInput]
    monthly_leads: Dict[str, float] = Field(..., description="Map of column letter to lead count (C..Y)")
    leads_list: Optional[List[LeadItem]] = Field(default_factory=list)


class SavedScenarioAssumptions(ModelAssumptions):
    """
    Stricter assumptions used when a scenario is saved.

    Live calculations accept tier shares that don't add up to 100% so the
    editor keeps working while the user rebalances them one field at a time
    (it shows a warning instead). A saved scenario must be a complete
    customer distribution, so it is checked here.
    """

    @model_validator(mode="after")
    def check_tier_allocation(self):
        total = self.pricing_tiers.allocation_total()
        if abs(total - 1.0) > TIER_ALLOCATION_TOLERANCE:
            raise ValueError(
                f"Trial, Pro and Enterprise customer shares must add up to 100% "
                f"(they currently add up to {total * 100:.1f}%)."
            )
        return self


class MonthlyResult(BaseModel):
    period_index: int
    column: str
    date: str
    label: str
    
    # Acquisition Funnel
    leads_generated: float
    lead_to_trial_conversion: float
    trials_started: float
    trial_to_paid_conversion: float
    new_paid_customers: float
    
    # Customer Waterfall
    beginning_active_customers: float
    monthly_churn_rate: float
    churned_customers: float
    ending_active_customers: float
    
    # Customer Breakdown
    trial_tier_customers: float
    pro_tier_customers: float
    enterprise_tier_customers: float
    
    # Revenue Build (MRR)
    basic_plan_revenue: float
    pro_plan_revenue: float
    enterprise_plan_revenue: float
    total_mrr: float
    
    # COGS
    cloud_hosting: float
    payment_processing: float
    third_party_apis: float
    other_direct_costs: float
    total_cogs: float
    gross_profit: float
    gross_margin_pct: float
    
    # OPEX
    opex_breakdown: Dict[str, float]
    total_opex: float
    
    # Profitability
    ebit: float
    ebit_margin_pct: float
    
    # Cell metadata mapping
    metadata: Dict[str, CellMetadata]


class SummaryKPIs(BaseModel):
    total_customers_sum: float = Field(..., description="Excel N4: SUM(C28:Y28)")
    total_revenue_sum: float = Field(..., description="Excel N10: SUM(C35:Y35)")
    total_ebit_sum: float = Field(..., description="Excel S9: SUM(C56:Y56)")
    total_cogs_sum: float
    total_opex_sum: float
    total_leads_generated: float
    total_new_paid_customers: float
    ending_active_customers_final: float
    avg_mrr_per_active_cust_final: float
    overall_gross_margin_pct: float
    overall_ebit_margin_pct: float
    metadata: Dict[str, CellMetadata]


class AnnualRollup(BaseModel):
    period_name: str
    months_included: List[str]
    total_revenue: float
    total_cogs: float
    gross_profit: float
    total_opex: float
    ebit: float
    ending_customers: float
    leads_generated: float
    new_paid_customers: float


class ModelCalculationResponse(BaseModel):
    monthly_results: List[MonthlyResult]
    summary_kpis: SummaryKPIs
    annual_rollups: List[AnnualRollup]
    weighted_arpu: float
    assumptions_echo: ModelAssumptions
