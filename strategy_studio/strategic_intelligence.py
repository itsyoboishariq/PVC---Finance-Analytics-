"""Strategic Intelligence Engine: Comprehensive Strategic Management Frameworks,
Product Lines Architecture, and the Strategic 'Why' behind multi-year SaaS financial shifts.
"""
import sqlite3
import json
import os
import math
from database import DB, ROOT

def _money(v):
    if v is None: return "N/A"
    if abs(v) >= 1e9: return f"${v/1e9:.2f}B"
    return f"${v/1e6:.1f}M"

def _pct(v):
    if v is None: return "N/A"
    return f"{v * 100:.1f}%"

# Premier SaaS Product Line Evolution Catalog
KNOWN_PRODUCT_LINES = {
    'DDOG': {
        'default': [
            {'name': 'Infrastructure Monitoring', 'tier': 'Core Lander', 'role': 'Foundational infrastructure telemetry and host monitoring', 'horizon': 'H1 (Core Engine)'},
            {'name': 'APM & Distributed Tracing', 'tier': 'Expansion Engine', 'role': 'End-to-end transaction tracing across microservices', 'horizon': 'H1 (Core Engine)'},
            {'name': 'Log Management & Analytics', 'tier': 'Platform Expander', 'role': 'Unified high-throughput indexing and log ingestion', 'horizon': 'H2 (Growth Engine)'},
            {'name': 'Cloud Security Platform & SIEM', 'tier': 'TAM Multiplier', 'role': 'Real-time threat detection and cloud workload posture', 'horizon': 'H2 (Growth Engine)'},
            {'name': 'Bits AI & Observability Copilot', 'tier': 'Frontier Bet', 'role': 'Generative AI automated root-cause incident remediation', 'horizon': 'H3 (Future Bet)'}
        ],
        'by_year': {
            '2017': [
                {'name': 'Infrastructure Monitoring', 'tier': 'Core Lander', 'status': 'Established', 'horizon': 'H1', 'role': 'Primary customer acquisition vehicle (Cloud host monitoring)'},
                {'name': 'APM Beta', 'tier': 'Emerging', 'status': 'Newly Launched', 'horizon': 'H2', 'role': 'Initial expansion into code-level application telemetry'}
            ],
            '2018': [
                {'name': 'Infrastructure Monitoring', 'tier': 'Core Lander', 'status': 'Scale', 'horizon': 'H1', 'role': 'Core customer base expansion'},
                {'name': 'APM & Distributed Tracing', 'tier': 'Expansion Engine', 'status': 'Commercial GA', 'horizon': 'H1', 'role': 'Major multi-product cross-selling unlock'},
                {'name': 'Log Management Beta', 'tier': 'New Module', 'status': 'Preview', 'horizon': 'H2', 'role': 'Completing the three pillars of observability'}
            ],
            '2019': [
                {'name': 'Unified Observability Suite', 'tier': 'Platform Core', 'status': 'Scale', 'horizon': 'H1', 'role': 'Bundled Infrastructure, APM, and Logs into a unified single-pane platform'},
                {'name': 'Network Performance Monitoring', 'tier': 'TAM Expansion', 'status': 'Newly Launched', 'horizon': 'H2', 'role': 'Tracking inter-service traffic and cloud provider gateways'},
                {'name': 'Synthetics & Real User Monitoring', 'tier': 'Frontend Telemetry', 'status': 'Commercial GA', 'horizon': 'H2', 'role': 'Browser and mobile user experience monitoring'}
            ],
            '2020': [
                {'name': 'Cloud Workload Security', 'tier': 'Adjacent TAM Extension', 'status': 'Newly Launched', 'horizon': 'H2', 'role': 'Pivoting from pure observability into cloud security posture and compliance'},
                {'name': 'Continuous Profiler', 'tier': 'Developer Tooling', 'status': 'Commercial GA', 'horizon': 'H2', 'role': 'Always-on production CPU/memory profiling'},
                {'name': 'Incident Management', 'tier': 'Workflow Platform', 'status': 'Expansion', 'horizon': 'H2', 'role': 'Collaborative remediation and post-mortem automation'}
            ],
            '2021': [
                {'name': 'Database Monitoring (DBM)', 'tier': 'Infrastructure Depth', 'status': 'Newly Launched', 'horizon': 'H2', 'role': 'Deep SQL execution and host database troubleshooting'},
                {'name': 'Cloud SIEM', 'tier': 'Enterprise Security', 'status': 'Commercial GA', 'horizon': 'H2', 'role': 'Security information and event management natively in Datadog'},
                {'name': 'Software Delivery Tracking', 'tier': 'DevOps Workflow', 'status': 'Scale', 'horizon': 'H2', 'role': 'CI/CD pipeline monitoring and release health'}
            ],
            '2022': [
                {'name': 'Cloud Cost Management', 'tier': 'FinOps Intelligence', 'status': 'Newly Launched', 'horizon': 'H2', 'role': 'Correlating AWS/Azure/GCP cloud billing with infrastructure utilization'},
                {'name': 'Observability Pipelines', 'tier': 'Platform Scale', 'status': 'Newly Launched', 'horizon': 'H2', 'role': 'Enables enterprises to ingest, filter, and route petabyte telemetry at scale'}
            ],
            '2023': [
                {'name': 'Bits AI Assistant', 'tier': 'Generative AI', 'status': 'Newly Launched', 'horizon': 'H3', 'role': 'Autonomous incident investigator querying platform telemetry with natural language'},
                {'name': 'Cloud Security Suite', 'tier': 'Full Platform', 'status': 'Scale', 'horizon': 'H1', 'role': 'Multi-product adoption crosses 45% of enterprise customers'}
            ],
            '2024': [
                {'name': 'LLM Observability', 'tier': 'Frontier Platform', 'status': 'Commercial GA', 'horizon': 'H3', 'role': 'Monitoring cost, latency, tokens, and safety for production GenAI applications'},
                {'name': 'On-Premises & Hybrid Observability', 'tier': 'Enterprise Core', 'status': 'Scale', 'horizon': 'H1', 'role': 'Capturing legacy enterprise migrations into unified Datadog platform'}
            ],
            '2025': [
                {'name': 'Autonomous Incident Remediation', 'tier': 'Agentic Operations', 'status': 'Scaling', 'horizon': 'H3', 'role': 'Automated self-healing infrastructure powered by fine-tuned telemetry agents'}
            ]
        }
    },
    'SNOW': {
        'default': [
            {'name': 'Cloud Data Warehouse', 'tier': 'Core Engine', 'role': 'Separated storage and compute on cloud hyperscalers', 'horizon': 'H1 (Core Engine)'},
            {'name': 'Snowpark Developer Framework', 'tier': 'Developer Platform', 'role': 'Running Python, Scala, and Java workloads natively inside Snowflake', 'horizon': 'H2 (Growth Engine)'},
            {'name': 'Snowflake Data Marketplace & Clean Rooms', 'tier': 'Network Flywheel', 'role': 'Secure zero-copy data collaboration and monetization', 'horizon': 'H2 (Growth Engine)'},
            {'name': 'Snowflake Cortex AI & Streamlit', 'tier': 'AI Data Cloud', 'role': 'Serverless LLM querying, vector search, and interactive data apps', 'horizon': 'H3 (Future Bet)'}
        ],
        'by_year': {
            '2019': [
                {'name': 'Cloud Data Warehouse (AWS)', 'tier': 'Core Engine', 'status': 'Hyper-Growth', 'horizon': 'H1', 'role': 'Core customer acquisition displacing legacy on-prem Teradata/Oracle'}
            ],
            '2020': [
                {'name': 'Multi-Cloud Architecture (Azure & GCP)', 'tier': 'Market Expansion', 'status': 'Scale', 'horizon': 'H1', 'role': 'Eliminated cloud lock-in, enabling enterprise multi-cloud migrations'}
            ],
            '2021': [
                {'name': 'Snowflake Data Cloud', 'tier': 'Platform Rebranding', 'status': 'Scale', 'horizon': 'H1', 'role': 'Consolidating data lakes, data engineering, and data science into a single engine'},
                {'name': 'Secure Data Sharing', 'tier': 'Network Effects', 'status': 'Commercial GA', 'horizon': 'H2', 'role': 'Zero-copy sharing between independent corporate Snowflake accounts'}
            ],
            '2022': [
                {'name': 'Snowflake Marketplace', 'tier': 'Ecosystem Monetization', 'status': 'Expanding', 'horizon': 'H2', 'role': 'Third-party live dataset subscriptions directly on-platform'},
                {'name': 'Snowpark Developer Platform', 'tier': 'Workload Expansion', 'status': 'Newly Launched', 'horizon': 'H2', 'role': 'Native Python data engineering workflows'}
            ],
            '2023': [
                {'name': 'Streamlit in Snowflake', 'tier': 'Application Layer', 'status': 'Commercial GA', 'horizon': 'H2', 'role': 'Allowing data scientists to build interactive internal apps on live Snowflake data'},
                {'name': 'Data Clean Rooms', 'tier': 'Privacy Tech', 'status': 'Enterprise Scale', 'horizon': 'H2', 'role': 'Media and healthcare privacy-safe audience and query matching'}
            ],
            '2024': [
                {'name': 'Snowflake Cortex AI', 'tier': 'Generative AI', 'status': 'Commercial GA', 'horizon': 'H3', 'role': 'Fully managed LLMs, vector search, and SQL AI functions'},
                {'name': 'Apache Iceberg Tables', 'tier': 'Open Formats', 'status': 'Scale', 'horizon': 'H1', 'role': 'Interoperability with external cloud storage preventing proprietary lock-in concerns'}
            ],
            '2025': [
                {'name': 'Snowflake Intelligence', 'tier': 'Autonomous Data Agents', 'status': 'Newly Launched', 'horizon': 'H3', 'role': 'Agentic enterprise business intelligence across structured and unstructured data'}
            ]
        }
    },
    'CRWD': {
        'default': [
            {'name': 'Falcon Prevent (Next-Gen AV)', 'tier': 'Core Lander', 'role': 'Cloud-native endpoint protection replacing legacy antivirus', 'horizon': 'H1 (Core Engine)'},
            {'name': 'Falcon Insight (EDR)', 'tier': 'Core Workhorse', 'role': 'Continuous endpoint detection, telemetry, and response', 'horizon': 'H1 (Core Engine)'},
            {'name': 'Falcon Cloud Security & Identity', 'tier': 'TAM Multiplier', 'role': 'Multi-cloud workload protection and zero-trust identity defense', 'horizon': 'H2 (Growth Engine)'},
            {'name': 'Falcon Next-Gen SIEM & Charlotte AI', 'tier': 'SecOps Platform', 'role': 'AI security orchestration and petabyte log ingestion', 'horizon': 'H3 (Future Bet)'}
        ],
        'by_year': {}
    },
    'HUBS': {
        'default': [
            {'name': 'Marketing Hub', 'tier': 'Core Lander', 'role': 'Inbound lead generation, email automation, and SEO', 'horizon': 'H1 (Core Engine)'},
            {'name': 'Sales Hub (CRM)', 'tier': 'Workhorse', 'role': 'Pipeline tracking, deal management, and meeting scheduling', 'horizon': 'H1 (Core Engine)'},
            {'name': 'Service Hub & Operations Hub', 'tier': 'Platform Extender', 'role': 'Helpdesk ticketing and two-way business data syncing', 'horizon': 'H2 (Growth Engine)'},
            {'name': 'HubSpot AI & Breeze Agents', 'tier': 'Autonomous GTM', 'role': 'AI content agents, prospecting copilot, and customer support bot', 'horizon': 'H3 (Future Bet)'}
        ],
        'by_year': {}
    },
    'MDB': {
        'default': [
            {'name': 'MongoDB Atlas (Cloud DBaaS)', 'tier': 'Flagship Engine', 'role': 'Managed multi-cloud document database on AWS, Azure, and GCP', 'horizon': 'H1 (Core Engine)'},
            {'name': 'Enterprise Advanced', 'tier': 'Self-Managed On-Prem', 'role': 'Dedicated private cloud database deployments', 'horizon': 'H1 (Core Engine)'},
            {'name': 'Atlas Vector Search & Stream Processing', 'tier': 'AI App Data Platform', 'role': 'Vector embeddings for RAG and live event-driven data feeds', 'horizon': 'H2 (Growth Engine)'}
        ],
        'by_year': {}
    }
}

def _synthesize_product_lines(ticker, company_name, year_label, metadata):
    """Return product lines for company based on catalog or intelligent synthesis."""
    if ticker in KNOWN_PRODUCT_LINES:
        cat = KNOWN_PRODUCT_LINES[ticker]
        year_str = year_label.replace('FY', '').strip()
        if 'by_year' in cat and year_str in cat['by_year']:
            return cat['by_year'][year_str]
        return cat['default']
    
    # Generic intelligent SaaS synthesis based on metadata
    model_desc = metadata.get('revenue_model_classification', 'Enterprise B2B Cloud Platform')
    return [
        {'name': f"{company_name} Core Platform", 'tier': 'Foundational Lander', 'status': 'Scale', 'horizon': 'H1', 'role': f"Core subscription offering: {model_desc}"},
        {'name': f"{company_name} Enterprise Suite", 'tier': 'Upmarket Expander', 'status': 'Active', 'horizon': 'H1', 'role': 'Enterprise security, SSO, governance, and advanced SLA modules'},
        {'name': f"{company_name} Developer & API Platform", 'tier': 'Ecosystem Expander', 'status': 'Growth', 'horizon': 'H2', 'role': 'Third-party integrations, webhooks, and automation connectors'},
        {'name': f"{company_name} AI & Analytics Intelligence", 'tier': 'Frontier Innovation', 'status': 'Emerging', 'horizon': 'H3', 'role': 'Predictive analytics, automated workflows, and intelligence copilot'}
    ]

def _build_strategic_frameworks(company_name, ticker, curr, prev, product_lines):
    """Build Ansoff Matrix, McKinsey 3 Horizons, BCG Matrix, and Porter's Moats."""
    rev_growth = curr.get('revenue_growth') or 0.3
    sm_ratio = curr.get('sales_marketing_ratio') or 0.45
    rd_ratio = curr.get('rd_ratio') or 0.25
    margin = curr.get('operating_margin') or -0.15
    fcf_margin = curr.get('fcf_margin')
    
    # 1. Ansoff Growth Matrix
    ansoff = {
        'market_penetration': {
            'title': 'Market Penetration (Existing Products x Existing Customers)',
            'posture': 'Aggressive Expansion' if sm_ratio > 0.50 else 'High-Efficiency Expansion',
            'initiatives': [
                'Land-and-expand sales execution driving Net Dollar Retention (NDR > 120%)',
                'Expanding user seat density across existing enterprise accounts',
                'Volume-based commitment renewals and cross-departmental rollouts'
            ]
        },
        'product_development': {
            'title': 'Product Development (New Products x Existing Customers)',
            'posture': 'Heavy Moat Reinvestment' if rd_ratio > 0.30 else 'Targeted Module Rollout',
            'initiatives': [
                f"Cross-selling newly launched {product_lines[min(1, len(product_lines)-1)]['name']} to installed customer base",
                'Consolidating multi-tool vendor spend into an integrated single-platform contract',
                'Expanding API surface area and developer automation workflows'
            ]
        },
        'market_development': {
            'title': 'Market Development (Existing Products x New Markets)',
            'posture': 'Global & Enterprise Push',
            'initiatives': [
                'International geographic expansion across EMEA and APAC tier-1 hubs',
                'Enterprise upmarket migration into Fortune 500 accounts with dedicated field sales',
                'Federal government compliance authorizations (FedRAMP, DoD Impact Levels)'
            ]
        },
        'diversification': {
            'title': 'Diversification (New Products x New Markets)',
            'posture': 'Platform Ecosystem / Multi-Cloud Play',
            'initiatives': [
                f"Strategic entry into adjacent categories via {product_lines[-1]['name']}",
                'Cloud marketplace co-selling partnerships with AWS, Azure, and Google Cloud',
                'Developer ecosystem and partner integration revenue sharing'
            ]
        }
    }
    
    # 2. McKinsey 3 Horizons
    mckinsey = {
        'horizon_1': {
            'title': 'Horizon 1 · Defend & Extend Core Business',
            'revenue_share': '60% - 75% of ARR',
            'focus': 'Operational excellence, gross margin stability, and customer churn reduction in core product line',
            'products': [p['name'] for p in product_lines if p.get('horizon', '').startswith('H1') or 'Core' in p.get('tier', '')] or [product_lines[0]['name']]
        },
        'horizon_2': {
            'title': 'Horizon 2 · High-Velocity Growth Accelerators',
            'revenue_share': '20% - 30% of ARR',
            'focus': 'Fast-growing adjacent products scaling into multi-product cross-selling engines',
            'products': [p['name'] for p in product_lines if p.get('horizon', '').startswith('H2') or 'Expander' in p.get('tier', '') or 'TAM' in p.get('tier', '')] or [product_lines[min(1, len(product_lines)-1)]['name']]
        },
        'horizon_3': {
            'title': 'Horizon 3 · Disruptive Bets & Future Platform Moats',
            'revenue_share': '5% - 10% of ARR',
            'focus': 'Generative AI platform, autonomous agentic operations, and frontier ecosystem plays',
            'products': [p['name'] for p in product_lines if p.get('horizon', '').startswith('H3') or 'Frontier' in p.get('tier', '') or 'AI' in p.get('name', '')] or [product_lines[-1]['name']]
        }
    }
    
    # 3. BCG Growth-Share Portfolio Matrix
    bcg = {
        'stars': {
            'label': 'Stars (High Growth, High Relative Market Share)',
            'description': 'Rapidly scaling products requiring sustained R&D investment to cement category leadership',
            'items': [product_lines[0]['name']] + ([product_lines[1]['name']] if len(product_lines) > 1 else [])
        },
        'cash_cows': {
            'label': 'Cash Cows (Low/Moderate Growth, Dominant Market Share)',
            'description': 'Mature core offerings generating foundational cash flow to fund adjacent R&D bets',
            'items': [product_lines[0]['name'] + ' (Enterprise Tier)']
        },
        'question_marks': {
            'label': 'Question Marks / Wildcards (High Market Growth, Emerging Share)',
            'description': 'New category bets that can either become future Stars or be pruned based on CAC payback',
            'items': [p['name'] for p in product_lines[-2:]]
        }
    }
    
    # 4. Porter's Competitive Moats
    porters = [
        {
            'moat': 'High Switching Costs & Mission-Critical Workflow',
            'score': 9 if rd_ratio > 0.25 else 7,
            'rationale': f"Deep enterprise integration where replacing {company_name} involves prohibitive migration risks, retraining, and downtime."
        },
        {
            'moat': 'Data Gravity & Multi-Product Telemetry',
            'score': 9 if 'DDOG' in ticker or 'SNOW' in ticker or 'CRWD' in ticker or 'MDB' in ticker else 8,
            'rationale': 'Accumulation of historical datasets, telemetry, and customized workflows makes the platform exponentially stickier over time.'
        },
        {
            'moat': 'Developer & Partner Ecosystem Scale',
            'score': 8,
            'rationale': 'Extensive library of pre-built integrations, APIs, and cloud marketplace co-selling channels creating distribution barriers.'
        },
        {
            'moat': 'Pricing Power & Platform Consolidation',
            'score': 8 if (curr.get('gross_margin') or 0.7) > 0.75 else 6,
            'rationale': f"Maintains healthy { _pct(curr.get('gross_margin')) } gross margins by bundling multiple adjacent point-solutions into a discounted enterprise agreement."
        }
    ]
    
    return {
        'ansoff': ansoff,
        'mckinsey': mckinsey,
        'bcg': bcg,
        'porters': porters
    }

def _build_strategic_why(curr, prev, company_name, year_label):
    """Generate the definitive strategic 'Why' behind financial increases and decreases."""
    curr_rev = curr.get('revenue')
    prev_rev = prev.get('revenue') if prev else None
    growth = curr.get('revenue_growth')
    
    curr_sm = curr.get('sales_marketing_ratio')
    prev_sm = prev.get('sales_marketing_ratio') if prev else None
    delta_sm_pp = (curr_sm - prev_sm) * 100 if (curr_sm is not None and prev_sm is not None) else None
    
    curr_rd = curr.get('rd_ratio')
    prev_rd = prev.get('rd_ratio') if prev else None
    delta_rd_pp = (curr_rd - prev_rd) * 100 if (curr_rd is not None and prev_rd is not None) else None
    
    curr_margin = curr.get('operating_margin')
    prev_margin = prev.get('operating_margin') if prev else None
    delta_margin_pp = (curr_margin - prev_margin) * 100 if (curr_margin is not None and prev_margin is not None) else None
    
    fcf = curr.get('fcf')
    fcf_margin = curr.get('fcf_margin')
    cash = curr.get('cash')
    debt = curr.get('total_debt')
    
    # 1. S&M Strategic Why Narrative
    if delta_sm_pp is not None:
        if delta_sm_pp < -2.0:
            sm_why = (f"Operating Leverage & Organic Expansion: S&M ratio decreased by {abs(delta_sm_pp):.1f} percentage points (to {_pct(curr_sm)}). "
                      f"As {company_name} scaled top-line ARR to {_money(curr_rev)}, high Net Dollar Retention (NDR) and multi-product cross-selling "
                      f"reduced the effective customer acquisition cost (CAC). Existing customers expanded spend without requiring proportional direct sales additions.")
        elif delta_sm_pp > 2.0:
            sm_why = (f"Aggressive Go-to-Market Land-Grab: S&M ratio surged by +{delta_sm_pp:.1f} percentage points (to {_pct(curr_sm)}). "
                      f"Management deliberately accelerated enterprise quota capacity, expanded global field sales hubs, and amplified co-marketing with cloud hyperscalers "
                      f"to capture contested enterprise accounts before competitive lock-in set in.")
        else:
            sm_why = (f"Disciplined GTM Execution: S&M ratio held steady at {_pct(curr_sm)} (shift of {delta_sm_pp:+.1f} pp). "
                      f"Go-to-market spending expanded strictly in lockstep with {_pct(growth)} top-line revenue growth, demonstrating predictable quota-carrying rep ramp.")
    else:
        sm_why = f"Initial recorded baseline spending: {company_name} deployed {_pct(curr_sm)} of revenue toward customer acquisition and sales engineering to establish market presence."

    # 2. R&D Strategic Why Narrative
    if delta_rd_pp is not None:
        if delta_rd_pp > 2.0:
            rd_why = (f"Accelerated Platform Moat Reinvestment: R&D spending expanded by +{delta_rd_pp:.1f} percentage points (to {_pct(curr_rd)}). "
                      f"Top-line expansion dollars were heavily redirected into core engineering, distributed cloud infrastructure, and multi-product module rollouts "
                      f"to transform a single point-solution into an enterprise platform with high switching costs.")
        elif delta_rd_pp < -2.0:
            rd_why = (f"Engineering Scalability & Infrastructure Maturation: R&D ratio moderated by {abs(delta_rd_pp):.1f} percentage points (to {_pct(curr_rd)}). "
                      f"Core architecture reached enterprise maturity, allowing engineering headcount to scale more efficiently relative to revenue growth.")
        else:
            rd_why = (f"Sustained Innovation Velocity: R&D ratio remained highly consistent at {_pct(curr_rd)} ({delta_rd_pp:+.1f} pp shift), "
                      f"maintaining continuous bi-weekly release cadences and expanding platform feature velocity.")
    else:
        rd_why = f"R&D was prioritized at {_pct(curr_rd)} of revenue, focused on building product-market fit and foundational architectural scalability."

    # 3. Operating Margin & Cash Inflection Why
    if delta_margin_pp is not None:
        if delta_margin_pp > 5.0:
            margin_why = (f"Margin Inflection & Fixed-Cost Absorption: Operating margin improved by +{delta_margin_pp:.1f} percentage points (to {_pct(curr_margin)}). "
                          f"Fixed G&A overhead and server infrastructure efficiencies were absorbed by larger revenue scale, driving rapid progress toward operating profitability.")
        elif delta_margin_pp < -5.0:
            margin_why = (f"Deliberate Growth Burn Expansion: Operating margin contracted by {abs(delta_margin_pp):.1f} percentage points (to {_pct(curr_margin)}). "
                          f"Management intentionally ran a wider operating loss to aggressively seize market share in a fast-expanding total addressable market (TAM).")
        else:
            margin_why = f"Operating margin held steady at {_pct(curr_margin)} ({delta_margin_pp:+.1f} pp), balancing growth reinvestment with financial predictability."
    else:
        margin_why = f"Operating margin stood at {_pct(curr_margin)} during this phase of operations."

    # 4. Capital Allocation & Balance Sheet Strategy
    fcf_text = _money(fcf) if fcf is not None else "N/A"
    fcf_margin_text = _pct(fcf_margin) if fcf_margin is not None else "N/A"
    cash_text = _money(cash) if cash is not None else "N/A"
    debt_text = _money(debt) if debt is not None else "$0"
    
    if fcf_margin is not None and fcf_margin > 0.05:
        fcf_posture = f"Free Cash Flow Generation Inflection: Generated {fcf_text} in annual FCF ({fcf_margin_text} margin), unlocking true self-funding capabilities without dilutive equity financing."
    elif fcf_margin is not None and fcf_margin < -0.10:
        fcf_posture = f"Capital Consumption Phase: Consumed {fcf_text} in free cash flow ({fcf_margin_text} margin), funded by a fortress balance sheet of {cash_text} in cash and short-term investments."
    else:
        fcf_posture = f"Near Cash Flow Breakeven: Maintained neutral burn with {fcf_text} FCF ({fcf_margin_text} margin) and {cash_text} in cash reserves."

    executive_summary = (
        f"In {year_label}, {company_name} reached {_money(curr_rev)} ARR at {_pct(growth)} growth. "
        f"The primary strategic lever was {'cutting' if delta_sm_pp and delta_sm_pp < 0 else 'expanding'} S&M by {abs(delta_sm_pp or 0):.1f} pp "
        f"while {'increasing' if delta_rd_pp and delta_rd_pp > 0 else 'adjusting'} R&D by {abs(delta_rd_pp or 0):.1f} pp. "
        f"This resulted in a Rule of 40 score of {round(((growth or 0) + (curr_margin or 0))*100, 1)}."
    )

    return {
        'executive_summary': executive_summary,
        'sm_why': sm_why,
        'rd_why': rd_why,
        'margin_why': margin_why,
        'capital_allocation': fcf_posture,
        'deltas': {
            'sm_pp': round(delta_sm_pp, 1) if delta_sm_pp is not None else None,
            'rd_pp': round(delta_rd_pp, 1) if delta_rd_pp is not None else None,
            'margin_pp': round(delta_margin_pp, 1) if delta_margin_pp is not None else None,
            'growth_pp': round((growth - prev.get('revenue_growth')) * 100, 1) if (prev and growth and prev.get('revenue_growth')) else None,
            'fcf_dollars': fcf_text,
            'cash_balance': cash_text,
            'total_debt': debt_text
        }
    }

def get_phase_deepdive(identifier, stage_index_or_year, startup_profile=None, path=DB):
    """Retrieve full deep-dive intelligence for a specific stage of a company's flow."""
    with sqlite3.connect(path) as con:
        con.row_factory = sqlite3.Row
        
        # Match company
        c_row = con.execute("""
            SELECT company_id, ticker, name, metadata_json 
            FROM companies 
            WHERE ticker = ? COLLATE NOCASE 
               OR company_id = ? 
               OR name LIKE ?
            LIMIT 1
        """, (identifier, identifier, f"%{identifier}%")).fetchone()
        
        if not c_row:
            return {'error': f"Company '{identifier}' not found."}
        
        cid = c_row['company_id']
        ticker = c_row['ticker'] or cid
        company_name = c_row['name']
        metadata = json.loads(c_row['metadata_json'] or '{}')
        
        # Get all chronological periods
        p_rows = con.execute("""
            SELECT row_id, period_end, fields_json 
            FROM periods 
            WHERE company_id = ? 
            ORDER BY period_end ASC
        """, (cid,)).fetchall()
        
        if not p_rows:
            return {'error': f"No financial periods for {company_name}."}
        
        # Find target period by index (1-based) or year (e.g. "FY2019" or "2019")
        target_idx = None
        s_str = str(stage_index_or_year).upper().replace('FY', '').replace('STAGE_', '').strip()
        
        if s_str.isdigit():
            val = int(s_str)
            if 1 <= val <= len(p_rows):
                target_idx = val - 1
            else:
                for idx, r in enumerate(p_rows):
                    if r['period_end'][:4] == s_str:
                        target_idx = idx
                        break
        else:
            for idx, r in enumerate(p_rows):
                if s_str in r['period_end']:
                    target_idx = idx
                    break
        
        if target_idx is None:
            target_idx = 0
            
        curr_row = p_rows[target_idx]
        prev_row = p_rows[target_idx - 1] if target_idx > 0 else None
        
        curr_fields = json.loads(curr_row['fields_json'])
        prev_fields = json.loads(prev_row['fields_json']) if prev_row else None
        
        year_label = f"FY{curr_row['period_end'][:4]}"
        
        # Product lines
        product_lines = _synthesize_product_lines(ticker, company_name, year_label, metadata)
        
        # Strategic Frameworks
        frameworks = _build_strategic_frameworks(company_name, ticker, curr_fields, prev_fields, product_lines)
        
        # Strategic Why
        strategic_why = _build_strategic_why(curr_fields, prev_fields, company_name, year_label)
        
        # Financial metrics breakdown
        growth = curr_fields.get('revenue_growth')
        margin = curr_fields.get('operating_margin')
        r40 = round(((growth or 0) + (margin or 0)) * 100, 1) if growth is not None and margin is not None else None
        
        financial_strategy = {
            'revenue': _money(curr_fields.get('revenue')),
            'revenue_growth': _pct(growth),
            'sales_marketing_ratio': _pct(curr_fields.get('sales_marketing_ratio')),
            'rd_ratio': _pct(curr_fields.get('rd_ratio')),
            'gross_margin': _pct(curr_fields.get('gross_margin')),
            'operating_margin': _pct(margin),
            'fcf': _money(curr_fields.get('fcf')),
            'fcf_margin': _pct(curr_fields.get('fcf_margin')),
            'rule_of_40': r40,
            'cash': _money(curr_fields.get('cash')),
            'debt': _money(curr_fields.get('total_debt')),
            'runway_months': curr_fields.get('runway_months'),
            'source_urls': curr_fields.get('source_urls') or [metadata.get('ipo_source_url')]
        }
        
        # Copy levers payload
        copy_payload = {
            'sales_marketing_ratio': round((curr_fields.get('sales_marketing_ratio') or 0.4) * 100, 1),
            'rd_ratio': round((curr_fields.get('rd_ratio') or 0.25) * 100, 1),
            'objective': 'growth' if (growth and growth > 0.4) else 'profitability',
            'strategy_name': f"{company_name} {year_label} Strategy"
        }
        
        return {
            'company': {
                'id': cid,
                'ticker': ticker,
                'name': company_name,
                'sic': metadata.get('sic'),
                'revenue_model': metadata.get('revenue_model_classification', 'B2B Software')
            },
            'stage_index': target_idx + 1,
            'total_stages': len(p_rows),
            'year': year_label,
            'period_end': curr_row['period_end'],
            'strategic_why': strategic_why,
            'product_lines': product_lines,
            'frameworks': frameworks,
            'financial_strategy': financial_strategy,
            'copy_payload': copy_payload
        }
