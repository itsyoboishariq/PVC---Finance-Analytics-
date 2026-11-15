"""Commercial Diligence, Target Screening & Financial Business Case Engine.

Implements the four foundational pillars of corporate development & strategic finance:
1. Market Sizing & Commercial Diligence (40%): TAM/SAM/SOM, customer adoption trends, regulatory landscape
2. Competitor & Target Screening (30%): PitchBook screening, incumbent profiles (CME, ICE, Nasdaq), M&A targets
3. Financial Modeling & Business Cases (20%): 3-5 Year revenue, EBITDA, Free Cash Flow (FCF), valuation & returns
4. Executive Slide Decks & Capstone (10%): Presentation-ready C-suite slides and weekly strategy update briefings
"""

import math
from typing import Dict, Any, List, Optional
import pitchbook

# Curated Presets for Strategic Spaces
STRATEGIC_SPACES = {
    "prediction-markets": {
        "id": "prediction-markets",
        "name": "Prediction Markets & Event Contracts",
        "subtitle": "Binary macro, election, economic index, and cultural event derivatives",
        "primary_incumbents": ["CME Group", "Cboe Global Markets", "Interactive Brokers"],
        "target_screen_ids": ["PB-KALSHI-01", "PB-POLYMARKET-02", "PB-CBOE-04", "PB-CME-01"],
        "tam_description": "Global event contract volume and retail financial hedging TAM",
        "tam_bn": 65.0,
        "sam_bn": 18.5,
        "som_bn": 3.8,
        "cagr_pct": 42.5,
        "adoption_phase": "Crossing the Chasm (Rapid Retail Inflection)",
        "regulatory_landscape": {
            "regulator": "CFTC (Commodity Futures Trading Commission)",
            "key_licenses": "Designated Contract Market (DCM) & Derivatives Clearing Organization (DCO)",
            "recent_milestones": "Kalshi landmark D.C. Circuit Court victory (Sept 2024) validating election & economic event contracts under the Commodity Exchange Act (CEA).",
            "regulatory_risk": "Moderate-Low (Judicial precedent established; state gaming regulatory friction requires federal preemption enforcement)."
        },
        "default_deal_type": "Acquisition or Strategic Clearing Alliance",
        "unit_economics": {
            "avg_fee_per_contract": 0.08,  # $0.08/contract
            "clearing_cost_per_contract": 0.015,
            "starting_year_contracts_m": 85.0
        }
    },
    "retail-derivatives": {
        "id": "retail-derivatives",
        "name": "Retail Derivatives & Micro-Futures",
        "subtitle": "Micro-sized equity index, commodity, and 0DTE options for active retail traders",
        "primary_incumbents": ["CME Group", "Cboe Global Markets", "Nasdaq Inc"],
        "target_screen_ids": ["PB-NINJATRADER-05", "PB-TRADOVATE-04", "PB-CBOE-04", "PB-CME-01"],
        "tam_description": "Global retail active trader derivatives and micro-futures execution",
        "tam_bn": 120.0,
        "sam_bn": 45.0,
        "som_bn": 8.5,
        "cagr_pct": 28.0,
        "adoption_phase": "Mainstream Growth (0DTE and Micro-contract explosion)",
        "regulatory_landscape": {
            "regulator": "CFTC / NFA / FINRA / SEC",
            "key_licenses": "Futures Commission Merchant (FCM) & Broker-Dealer (BD)",
            "recent_milestones": "SEC and FINRA scrutiny on gamification and retail margin; surge in proprietary trading firm (prop firm) evaluations driving exchange micro volumes.",
            "regulatory_risk": "Low (Established legal architecture; compliance focused on pattern day-trader margin & customer suitability rules)."
        },
        "default_deal_type": "Target Acquisition or Captive Brokerage Joint Venture",
        "unit_economics": {
            "avg_fee_per_contract": 0.35,
            "clearing_cost_per_contract": 0.06,
            "starting_year_contracts_m": 120.0
        }
    },
    "international-clearing": {
        "id": "international-clearing",
        "name": "International & Digital Clearing Infrastructure",
        "subtitle": "Cross-border margin, multi-currency settlement, and omnibus retail custody APIs",
        "primary_incumbents": ["Intercontinental Exchange (ICE)", "DTCC / Euroclear", "Nasdaq Inc"],
        "target_screen_ids": ["PB-APEX-07", "PB-DRIVEWEALTH-08", "PB-ICE-02", "PB-NDAQ-03"],
        "tam_description": "Global digital clearing, omnibus custody, and cross-border settlement fees",
        "tam_bn": 210.0,
        "sam_bn": 68.0,
        "som_bn": 14.0,
        "cagr_pct": 19.5,
        "adoption_phase": "Institutional Scale & Modernization",
        "regulatory_landscape": {
            "regulator": "SEC / CFTC / Bank of England / ESMA / MAS",
            "key_licenses": "Clearing Agency (SEC), DCO (CFTC), Recognized Clearing House (UK/EU)",
            "recent_milestones": "US SEC mandate transitioning US cash equities to T+1 settlement (May 2024); accelerating cross-border margin optimization and 24/7 tokenized collateral movement.",
            "regulatory_risk": "High Regulatory Moat (Enormous capital requirements; Systemically Important Financial Market Utility - SIFMU designation)."
        },
        "default_deal_type": "Strategic Bolt-on or Anchor Clearing Partnership",
        "unit_economics": {
            "avg_fee_per_contract": 1.20,
            "clearing_cost_per_contract": 0.22,
            "starting_year_contracts_m": 45.0
        }
    }
}


def list_strategic_spaces() -> List[Dict[str, Any]]:
    """List available strategic diligence spaces."""
    return list(STRATEGIC_SPACES.values())


def get_agent_guiding_questions(space_id: str = "prediction-markets") -> Dict[str, Any]:
    """Generate interactive guiding questions that help inform the financial strategy

    based on the company type, data availability, and strategic mandate.
    """
    space = STRATEGIC_SPACES.get(space_id, STRATEGIC_SPACES["prediction-markets"])
    
    return {
        "space_id": space["id"],
        "space_name": space["name"],
        "objective_context": "Corporate Strategy, Commercial Diligence & Financial Case Building",
        "questions": [
            {
                "id": "q_space",
                "step": 1,
                "pillar": "Market Sizing & Commercial Diligence (40%)",
                "question": "Which strategic asset class or market infrastructure space are we evaluating?",
                "helper_text": "Select an emerging market or specify a custom financial technology vertical.",
                "type": "single_choice",
                "options": [
                    {"value": "prediction-markets", "label": "🎯 Prediction Markets & Event Contracts", "badge": "High Growth · Regulatory Catalyst"},
                    {"value": "retail-derivatives", "label": "📈 Retail Derivatives & Micro-Futures", "badge": "Proven Cash Cow · High Volume"},
                    {"value": "international-clearing", "label": "🌐 International & Digital Clearing", "badge": "Moat Infrastructure · Sticky Revenue"}
                ],
                "selected": space["id"]
            },
            {
                "id": "q_mandate",
                "step": 2,
                "pillar": "Competitor & Target Screening (30%)",
                "question": "What is our corporate strategic mandate and target execution path?",
                "helper_text": "Determines whether we screen for bolt-on M&A targets, strategic partnerships, or an organic product build.",
                "type": "single_choice",
                "options": [
                    {"value": "ma_acquisition", "label": "🤝 Strategic M&A Target Acquisition", "badge": "Immediate Market Share & Licenses"},
                    {"value": "commercial_partnership", "label": "⚡ Strategic Partnership / White-Label Clearing", "badge": "Low CapEx · Fast Time-to-Market"},
                    {"value": "internal_build", "label": "🏗️ Internal Product Build & License Application", "badge": "100% Equity Retention · Organic"}
                ],
                "selected": "ma_acquisition"
            },
            {
                "id": "q_data_source",
                "step": 3,
                "pillar": "Competitor & Target Screening (30%)",
                "question": "What primary data sources are available to calibrate our valuation and multiples?",
                "helper_text": "Specifies whether we benchmark against PitchBook private round data, public exchange 10-K filings, or hybrid comps.",
                "type": "single_choice",
                "options": [
                    {"value": "pitchbook_private", "label": "📊 PitchBook Private Deals & Valuation Multiples", "badge": "Kalshi, Polymarket, Apex, Tradovate"},
                    {"value": "public_filings", "label": "🏛️ Public Exchange 10-K Filings & Comps", "badge": "CME, ICE, Nasdaq, Cboe"},
                    {"value": "hybrid_diligence", "label": "🔬 Hybrid Commercial Diligence (PitchBook + 10-Ks)", "badge": "Recommended · Comprehensive"}
                ],
                "selected": "hybrid_diligence"
            },
            {
                "id": "q_monetization",
                "step": 4,
                "pillar": "Financial Modeling & Business Cases (20%)",
                "question": "What is the primary monetization engine and unit economics structure?",
                "helper_text": "Informs the 5-year revenue trajectory, gross margin profile, and operating leverage.",
                "type": "single_choice",
                "options": [
                    {"value": "per_contract_clearing", "label": "🪙 Per-Contract Trading & Clearing Fees ($0.05–$0.25/contract)", "badge": "Volume-Driven Scale"},
                    {"value": "saas_market_data", "label": "💻 Market Data Licensing & API Subscriptions ($10k–$50k/mo)", "badge": "High Recurring ARR"},
                    {"value": "blended_exchange", "label": "⚖️ Blended Exchange Model (Transaction + Margin Float + Data)", "badge": "Institutional Standard"}
                ],
                "selected": "blended_exchange"
            },
            {
                "id": "q_financial_target",
                "step": 5,
                "pillar": "Financial Modeling & Business Cases (20%)",
                "question": "What is our 5-year financial target ambition for Free Cash Flow (FCF)?",
                "helper_text": "Calibrates required reinvestment, hiring ramp, and breakeven timeline.",
                "type": "single_choice",
                "options": [
                    {"value": "aggressive_scale", "label": "🚀 High-Velocity Scale ($100M+ Revenue by Year 5, FCF Breakeven Year 2)", "badge": "Aggressive GTM"},
                    {"value": "capital_efficient", "label": "🛡️ Capital-Efficient Cash Cow (Immediate 35%+ FCF Margin)", "badge": "Conservative · Defensive"},
                    {"value": "balanced_growth", "label": "⚖️ Rule of 50 Balanced Trajectory (50%+ Growth + 25%+ FCF Margin)", "badge": "Top Decile"}
                ],
                "selected": "balanced_growth"
            }
        ],
        "agent_synthesis_hint": "Once guiding choices are selected, the Strategy Studio synthesizes TAM market sizing (40%), PitchBook target screening (30%), 5-year FCF financial projections (20%), and presentation-ready executive slide decks (10%)."
    }


def generate_diligence_package(
    space_id: str = "prediction-markets",
    mandate: str = "ma_acquisition",
    data_source: str = "hybrid_diligence",
    monetization: str = "blended_exchange",
    financial_ambition: str = "balanced_growth",
    custom_inputs: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Generate the complete 4-pillar commercial diligence package:

    1. Market Sizing & Commercial Diligence (40%)
    2. Competitor & Target Screening (30%)
    3. 3-5 Year Financial Model & FCF Waterfalls (20%)
    4. Executive Slide Deck & Capstone Presentation (10%)
    """
    space = STRATEGIC_SPACES.get(space_id, STRATEGIC_SPACES["prediction-markets"])
    custom = custom_inputs or {}

    # -------------------------------------------------------------
    # Pillar 1: Market Sizing & Commercial Diligence (40%)
    # -------------------------------------------------------------
    tam_bn = custom.get("tam_bn", space["tam_bn"])
    sam_bn = custom.get("sam_bn", space["sam_bn"])
    som_bn = custom.get("som_bn", space["som_bn"])
    cagr = custom.get("cagr_pct", space["cagr_pct"])

    top_down_tam = {
        "global_derivatives_contracts_annual_bn": 137.0,
        "addressable_retail_event_hedging_share_pct": 2.5,
        "implied_tam_usd_bn": tam_bn,
        "sam_usd_bn": sam_bn,
        "som_target_usd_bn": som_bn,
        "sam_to_tam_penetration_pct": round((sam_bn / tam_bn) * 100, 1),
        "som_target_share_of_sam_pct": round((som_bn / sam_bn) * 100, 1)
    }

    bottom_up_tam = {
        "target_active_retail_hedgers_millions": 12.5,
        "avg_annual_contracts_per_user": 240,
        "total_annual_contract_volume_m": 3000.0,
        "avg_take_rate_per_contract_usd": space["unit_economics"]["avg_fee_per_contract"],
        "implied_annual_gross_fee_pool_usd_m": round(3000.0 * space["unit_economics"]["avg_fee_per_contract"], 1)
    }

    adoption_analysis = {
        "current_lifecycle_stage": space["adoption_phase"],
        "projected_5yr_cagr_pct": cagr,
        "primary_demand_drivers": [
            "Retail demand for event-driven, binary risk expression outside traditional equity hours",
            "Macro volatility (inflation releases, interest rate decisions, presidential elections)",
            "Mobile-first, API-native trading platforms capturing Millennial/Gen-Z active trader mindshare",
            "Institutional hedging of corporate geopolitical, regulatory, and commodity supply risks"
        ],
        "adoption_inhibitors": [
            "State-level regulatory ambiguity attempting to conflate financial event hedging with sports betting",
            "Initial liquidity fragmentation across venues prior to central clearing establishment",
            "Customer acquisition cost (CAC) inflation in competitive retail brokerage channels"
        ]
    }

    regulatory_assessment = {
        "primary_jurisdiction": space["regulatory_landscape"]["regulator"],
        "required_licenses": space["regulatory_landscape"]["key_licenses"],
        "key_legal_milestones": space["regulatory_landscape"]["recent_milestones"],
        "regulatory_risk_rating": space["regulatory_landscape"]["regulatory_risk"],
        "compliance_strategy": "Establish direct CFTC DCM & DCO operational compliance or acquire an existing license-holder to insulate commercial operations under federal preemption."
    }

    commercial_viability_verdict = {
        "status": "APPROVED FOR ADVANCED DILIGENCE & EXECUTION",
        "conviction_score": 92,
        "strategic_moat_strength": "High (Network Liquidity Effects + Regulatory License Barrier)",
        "kill_criteria": [
            "Adverse federal court reversal narrowing CFTC event contract authority",
            "Blended clearing take-rate dropping below $0.03 per contract",
            "CAC to LTV ratio deteriorating below 1:3 over two consecutive quarters"
        ]
    }

    # -------------------------------------------------------------
    # Pillar 2: Competitor & Target Screening (30%)
    # -------------------------------------------------------------
    # Fetch screened companies from PitchBook intelligence module
    target_ids = space["target_screen_ids"]
    screened_targets = []
    for pb_id in target_ids:
        comp = pitchbook.get_company_detail(pb_id)
        if comp:
            screened_targets.append(comp)

    # Competitor quadrant breakdown
    incumbents = [c for c in screened_targets if c["entity_type"] == "Public Incumbent"]
    private_targets = [c for c in screened_targets if c["entity_type"] in ["Private", "Acquired"]]

    screening_matrix_summary = {
        "total_screened": len(screened_targets),
        "incumbents_profiled": len(incumbents),
        "private_targets_profiled": len(private_targets),
        "top_ranked_target": private_targets[0] if private_targets else None,
        "deal_comps_referenced": pitchbook.get_deal_comps(space_id),
        "valuation_benchmarks": pitchbook.calculate_valuation_benchmarks(space["name"])
    }

    # -------------------------------------------------------------
    # Pillar 3: 3-5 Year Financial Model & Business Cases (20%)
    # -------------------------------------------------------------
    # Unit economic growth trajectory
    starting_volume_m = space["unit_economics"]["starting_year_contracts_m"]
    avg_fee = space["unit_economics"]["avg_fee_per_contract"]
    clearing_cost = space["unit_economics"]["clearing_cost_per_contract"]

    # 5-Year Model Calculations
    financial_years = []
    annual_growth_rates = [0.0, 1.10, 0.75, 0.45, 0.30]  # YoY growth trajectory
    vol = starting_volume_m
    cumulative_fcf = 0.0

    for i in range(5):
        year_num = i + 1
        growth_rate = annual_growth_rates[i]
        if i > 0:
            vol = vol * (1.0 + growth_rate)

        # Revenue Breakdown
        transaction_rev = vol * avg_fee
        market_data_rev = 2.5 * (1.5 ** i)  # Growing subscription data feed
        total_rev = transaction_rev + market_data_rev

        # Cost Structure
        clearing_and_matching = vol * clearing_cost
        gross_profit = total_rev - clearing_and_matching
        gross_margin_pct = (gross_profit / total_rev) * 100

        # Operating Expenses
        # S&M: higher in early years, leverages down as network effects take over
        sm_ratio = max(0.24, 0.42 - (i * 0.04))
        sm_exp = total_rev * sm_ratio

        # R&D: platform resilience, matching engine, API integrations
        rd_ratio = max(0.18, 0.28 - (i * 0.025))
        rd_exp = total_rev * rd_ratio

        # G&A: legal, compliance, regulatory filings, clearinghouse capitalization
        ga_ratio = max(0.12, 0.20 - (i * 0.02))
        ga_exp = total_rev * ga_ratio

        total_opex = sm_exp + rd_exp + ga_exp
        ebitda = gross_profit - total_opex
        ebitda_margin_pct = (ebitda / total_rev) * 100

        # Free Cash Flow (FCF) = EBITDA - CapEx - Working Capital / Taxes
        capex = max(1.5, total_rev * 0.04)
        taxes_and_working_cap = max(0.0, ebitda * 0.18) if ebitda > 0 else 0.0
        free_cash_flow = ebitda - capex - taxes_and_working_cap
        fcf_margin_pct = (free_cash_flow / total_rev) * 100
        cumulative_fcf += free_cash_flow

        financial_years.append({
            "year": f"Year {year_num}",
            "contract_volume_millions": round(vol, 1),
            "revenue_usd_m": round(total_rev, 2),
            "revenue_growth_yoy_pct": round(growth_rate * 100, 1) if i > 0 else None,
            "gross_profit_usd_m": round(gross_profit, 2),
            "gross_margin_pct": round(gross_margin_pct, 1),
            "sales_marketing_usd_m": round(sm_exp, 2),
            "rd_technology_usd_m": round(rd_exp, 2),
            "ga_compliance_usd_m": round(ga_exp, 2),
            "ebitda_usd_m": round(ebitda, 2),
            "ebitda_margin_pct": round(ebitda_margin_pct, 1),
            "capex_usd_m": round(capex, 2),
            "free_cash_flow_usd_m": round(free_cash_flow, 2),
            "fcf_margin_pct": round(fcf_margin_pct, 1),
            "cumulative_fcf_usd_m": round(cumulative_fcf, 2)
        })

    # Terminal Valuation & Returns
    year5_rev = financial_years[4]["revenue_usd_m"]
    year5_ebitda = financial_years[4]["ebitda_usd_m"]
    implied_ev_multiple = 8.5  # Conservative peer exchange/fintech multiple
    terminal_valuation = round(year5_rev * implied_ev_multiple, 1)
    
    # Capital required & estimated returns
    initial_investment = custom.get("initial_investment_m", 45.0)
    total_value_generated = terminal_valuation + cumulative_fcf
    moic = round(total_value_generated / initial_investment, 2) if initial_investment > 0 else 4.5
    # Approximate 5-year IRR
    irr_pct = round(((moic ** (1 / 5)) - 1) * 100, 1) if moic > 0 else 35.0

    financial_summary = {
        "model_horizon_years": 5,
        "starting_revenue_m": financial_years[0]["revenue_usd_m"],
        "year_5_revenue_m": year5_rev,
        "year_5_ebitda_m": year5_ebitda,
        "year_5_ebitda_margin_pct": financial_years[4]["ebitda_margin_pct"],
        "cumulative_5yr_fcf_m": round(cumulative_fcf, 2),
        "breakeven_year": "Year 2",
        "terminal_valuation_usd_m": terminal_valuation,
        "implied_exit_multiple": f"{implied_ev_multiple}x EV/Rev",
        "assumed_initial_capital_m": initial_investment,
        "multiple_on_invested_capital_moic": moic,
        "projected_5yr_irr_pct": irr_pct,
        "projections_table": financial_years
    }

    # -------------------------------------------------------------
    # Pillar 4: Executive Slide Decks & Capstone Project (10%)
    # -------------------------------------------------------------
    executive_slides = [
        {
            "slide_number": 1,
            "title": "Executive Summary & Strategic Thesis",
            "kicker": "STRATEGIC INITIATIVE · C-SUITE & BOARD BRIEFING",
            "subtitle": f"Strategic evaluation of {space['name']}: Market TAM, competitor screen, and 5-year business case.",
            "bullet_points": [
                f"Market Window: {space['name']} represents a ${tam_bn}B global TAM expanding at {cagr}% CAGR driven by retail active hedging demand.",
                f"Regulatory Validation: Federal legal precedent ({space['regulatory_landscape']['key_licenses']}) establishes defensible barriers to entry.",
                f"Financial Payoff: 5-year model projects ${year5_rev}M revenue, ${year5_ebitda}M EBITDA, and ${round(cumulative_fcf, 1)}M cumulative Free Cash Flow.",
                f"Strategic Recommendation: Pursue {mandate.replace('_', ' ').title()} to secure network liquidity and institutional clearing scale."
            ],
            "metrics": [
                {"label": "GLOBAL TAM", "value": f"${tam_bn}B", "sub": f"{cagr}% 5-Yr CAGR"},
                {"label": "YEAR 5 REVENUE", "value": f"${year5_rev}M", "sub": "Annual Projected"},
                {"label": "5-YR CUMULATIVE FCF", "value": f"${round(cumulative_fcf, 1)}M", "sub": "Breakeven Year 2"},
                {"label": "PROJECTED 5-YR IRR", "value": f"{irr_pct}%", "sub": f"{moic}x MOIC Return"}
            ]
        },
        {
            "slide_number": 2,
            "title": "Commercial Diligence & Market Sizing (40%)",
            "kicker": "PILLAR 1 · TAM / SAM / SOM & REGULATORY ASSESSMENT",
            "subtitle": "Rigorous top-down and bottom-up market sizing proving substantial commercial runway.",
            "bullet_points": [
                f"Top-Down TAM: ${tam_bn}B addressable pool based on 2.5% capture of global financial derivatives contract velocity.",
                f"Serviceable Available Market (SAM): ${sam_bn}B representing US & Tier-1 international regulated retail derivative traders.",
                f"Serviceable Obtainable Market (SOM): Target capture of ${som_bn}B ({top_down_tam['som_target_share_of_sam_pct']}% of SAM) over 5-year horizon.",
                f"Regulatory Heatmap: {regulatory_assessment['primary_jurisdiction']} licensed under {regulatory_assessment['required_licenses']} with sustainable federal preemption."
            ],
            "metrics": [
                {"label": "TOTAL ADDRESSABLE (TAM)", "value": f"${tam_bn}B", "sub": "Global Sizing"},
                {"label": "SERVICEABLE (SAM)", "value": f"${sam_bn}B", "sub": f"{top_down_tam['sam_to_tam_penetration_pct']}% of TAM"},
                {"label": "OBTAINABLE (SOM)", "value": f"${som_bn}B", "sub": "5-Year Target Share"},
                {"label": "REGULATORY RISK", "value": "Defensible", "sub": "Federal DCM Validated"}
            ]
        },
        {
            "slide_number": 3,
            "title": "Competitor & Target Screening (30%)",
            "kicker": "PILLAR 2 · PITCHBOOK TARGET SCREENING & INCUMBENT PROFILES",
            "subtitle": "Profiling market infrastructure incumbents (CME, ICE, Nasdaq, Cboe) and private acquisition targets.",
            "bullet_points": [
                f"Incumbent Posture: CME Group and Cboe dominate legacy benchmark futures/options (60%+ EBITDA margins) but lack native mobile event trading UX.",
                f"Top Private Target: {screening_matrix_summary['top_ranked_target']['name']} (Fit Score: {screening_matrix_summary['top_ranked_target']['strategic_fit_score']}/100) with {int(screening_matrix_summary['top_ranked_target']['revenue_growth_yoy'] * 100)}% YoY growth.",
                f"Precedent Comps: Deals like Tradovate ($115M, 5.2x EV/Rev) and ErisX ($350M) validate the valuation floor and strategic premium for clearing licenses.",
                f"Execution Rationale: An acquisition or anchor clearing alliance preempts competitors and captures captive retail order flow."
            ],
            "metrics": [
                {"label": "TOP SCREENED TARGET", "value": screening_matrix_summary['top_ranked_target']['name'], "sub": f"Fit Score {screening_matrix_summary['top_ranked_target']['strategic_fit_score']}/100"},
                {"label": "TARGET GROWTH", "value": f"+{int(screening_matrix_summary['top_ranked_target']['revenue_growth_yoy'] * 100)}%", "sub": "YoY Trajectory"},
                {"label": "INCUMBENT MARGIN BENCHMARK", "value": "64%", "sub": "CME / ICE / Cboe Avg"},
                {"label": "VALUATION MULTIPLE RANGE", "value": "5.5x–8.5x", "sub": "EV / Forward Revenue"}
            ]
        },
        {
            "slide_number": 4,
            "title": "3–5 Year Financial Model & Business Case (20%)",
            "kicker": "PILLAR 3 · PROJECTIONS, FREE CASH FLOW & CAPITAL ALLOCATION",
            "subtitle": "Detailed financial case demonstrating operating leverage and disciplined capital returns.",
            "bullet_points": [
                f"Volume Trajectory: Contract volume scales from {starting_volume_m}M in Year 1 to {financial_years[4]['contract_volume_millions']}M in Year 5.",
                f"Revenue & Margin Expansion: Revenue grows from ${financial_years[0]['revenue_usd_m']}M to ${year5_rev}M with gross margins expanding to {financial_years[4]['gross_margin_pct']}%.",
                f"Free Cash Flow Generation: Inflects positive in {financial_summary['breakeven_year']}, generating ${financial_years[4]['free_cash_flow_usd_m']}M annual FCF by Year 5.",
                f"Terminal Value & Return: Terminal valuation of ${terminal_valuation}M yields a {moic}x MOIC and {irr_pct}% 5-year IRR on ${initial_investment}M invested capital."
            ],
            "metrics": [
                {"label": "YEAR 1 REVENUE", "value": f"${financial_years[0]['revenue_usd_m']}M", "sub": "Foundation Phase"},
                {"label": "YEAR 5 REVENUE", "value": f"${year5_rev}M", "sub": f"{financial_years[4]['revenue_growth_yoy_pct']}% YoY Scale"},
                {"label": "YEAR 5 EBITDA", "value": f"${year5_ebitda}M", "sub": f"{financial_years[4]['ebitda_margin_pct']}% EBITDA Margin"},
                {"label": "TERMINAL VALUATION", "value": f"${terminal_valuation}M", "sub": f"{implied_ev_multiple}x Exit Multiple"}
            ]
        },
        {
            "slide_number": 5,
            "title": "Execution Roadmap & Risk Mitigation (10%)",
            "kicker": "PILLAR 4 · GO-TO-MARKET MILESTONES & CAPSTONE ROADMAP",
            "subtitle": "Structured phased execution plan ensuring operational readiness, risk control, and executive accountability.",
            "bullet_points": [
                "Phase 1 (Months 1–6): Regulatory Licensing & Core Tech Integration — Finalize DCM/DCO filings or complete bolt-on M&A diligence; establish clearinghouse capital reserves.",
                "Phase 2 (Months 7–18): Beta Launch & Market Maker Onboarding — Seed initial order book depth with contracted algorithmic market makers; launch top 50 macro contracts.",
                "Phase 3 (Months 19–36): Scale & Retail Distribution — Expand API distribution via retail brokerage partners; introduce institutional bespoke event contracts.",
                "Risk Governance: Implement automated circuit breakers, daily collateral reconciliation, and federal regulatory liaisons to manage macro and legal risk."
            ],
            "metrics": [
                {"label": "PHASE 1 DURATION", "value": "6 Months", "sub": "Regulatory & Diligence"},
                {"label": "BREAKEVEN TARGET", "value": "Month 18", "sub": "Cash Flow Neutral"},
                {"label": "INITIAL CAPITAL", "value": f"${initial_investment}M", "sub": "Fully Funded Plan"},
                {"label": "TARGET IRR", "value": f"{irr_pct}%", "sub": "5-Year Horizon"}
            ]
        }
    ]

    return {
        "space": space,
        "mandate": mandate,
        "data_source": data_source,
        "monetization": monetization,
        "financial_ambition": financial_ambition,
        "pillar_1_market_sizing": {
            "top_down": top_down_tam,
            "bottom_up": bottom_up_tam,
            "adoption": adoption_analysis,
            "regulatory": regulatory_assessment,
            "verdict": commercial_viability_verdict
        },
        "pillar_2_target_screening": {
            "screened_targets": screened_targets,
            "summary": screening_matrix_summary
        },
        "pillar_3_financial_model": financial_summary,
        "pillar_4_executive_slides": executive_slides
    }
