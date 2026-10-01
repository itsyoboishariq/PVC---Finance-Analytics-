"""
Default configuration and factory functions for model assumptions.
Derived directly from Startup_Financial_Models.xlsx
"""
import json
from pathlib import Path
from typing import Dict, Any
from .schema import ModelAssumptions, PricingTiersInput, PricingTierInput, COGSInput, OPEXItemInput, LeadItem

DEFAULTS_FILE = Path(__file__).parent.parent / "model_engine_defaults.json"


def get_raw_defaults() -> Dict[str, Any]:
    with open(DEFAULTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_default_assumptions() -> ModelAssumptions:
    raw = get_raw_defaults()
    assump = raw["assumptions"]
    
    tiers = PricingTiersInput(
        trial=PricingTierInput(
            name=assump["pricing_tiers"]["trial"]["name"],
            price_per_month=assump["pricing_tiers"]["trial"]["price_per_month"],
            customer_pct=assump["pricing_tiers"]["trial"]["customer_pct"]
        ),
        pro=PricingTierInput(
            name=assump["pricing_tiers"]["pro"]["name"],
            price_per_month=assump["pricing_tiers"]["pro"]["price_per_month"],
            customer_pct=assump["pricing_tiers"]["pro"]["customer_pct"]
        ),
        enterprise=PricingTierInput(
            name=assump["pricing_tiers"]["enterprise"]["name"],
            price_per_month=assump["pricing_tiers"]["enterprise"]["price_per_month"],
            customer_pct=assump["pricing_tiers"]["enterprise"]["customer_pct"]
        )
    )
    
    cogs_in = COGSInput(
        cloud_hosting_fixed=assump["cogs"]["cloud_hosting_fixed"]["value"],
        payment_processing_pct=assump["cogs"]["payment_processing_pct"]["value"],
        api_per_customer=assump["cogs"]["api_per_customer"]["value"],
        other_direct_per_trial=assump["cogs"]["other_direct_per_trial"]["value"]
    )
    
    opex_in = [
        OPEXItemInput(
            row=item["row"],
            category=item["category"],
            name=item["name"],
            value=item["value"],
            source=item.get("source")
        )
        for item in assump["opex"]
    ]
    
    leads_list = [
        LeadItem(**lead) for lead in raw.get("leads_list", [])
    ]
    
    return ModelAssumptions(
        beginning_customers=assump["beginning_customers"]["value"],
        monthly_churn=assump["monthly_churn"]["value"],
        lead_to_trial_conversion=assump["lead_to_trial_conversion"]["value"],
        trial_to_paid_conversion=assump["trial_to_paid_conversion"]["value"],
        pricing_tiers=tiers,
        cogs=cogs_in,
        opex=opex_in,
        monthly_leads=raw["monthly_leads"],
        leads_list=leads_list
    )


def get_periods_definition():
    raw = get_raw_defaults()
    return raw["periods"]
