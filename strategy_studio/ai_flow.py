"""AI Strategy Flow Generator & Templates.
Uses OpenAI API (gpt-5-mini via ai.local.json) to generate and edit Mermaid.js strategy flowcharts
featuring clustered subgraphs (Cyan, Purple, Blue) and rich modular cards.
"""
import json
import os
import re
import math
import httpx
from database import ROOT, DB, connect

def load_ai_config():
    path = ROOT / 'ai.local.json'
    local = json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
    return {
        'OPENAI_API_KEY': os.environ.get('OPENAI_API_KEY') or local.get('OPENAI_API_KEY', ''),
        'OPENAI_MODEL': os.environ.get('OPENAI_MODEL') or local.get('OPENAI_MODEL', 'gpt-5-mini')
    }

def get_preset_flow(preset_id: str, db_path=DB):
    """Return pre-built high-fidelity strategy flow presets matching the process flow template."""
    preset_id = (preset_id or 'template-process-flow').lower()
    
    if preset_id in ('template-process-flow', 'template', 'process-flow'):
        return {
            'id': 'template-process-flow',
            'title': 'Process Flow Diagram Template',
            'subtitle': 'Modular multi-stage strategy flow with clustered subgraphs, orthogonal routing, and edge metrics.',
            'company': {'name': 'Modular Strategy Template', 'ticker': 'TEMPLATE'},
            'mermaid_code': """flowchart LR
  classDef normal fill:#111927,stroke:#334155,stroke-width:1.5px,color:#f8fafc,rx:8px;
  classDef highlight fill:#152436,stroke:#06b6d4,stroke-width:2px,color:#ffffff,rx:8px;
  classDef purpleCard fill:#221533,stroke:#a855f7,stroke-width:2px,color:#ffffff,rx:8px;
  classDef blueCard fill:#10223d,stroke:#3b82f6,stroke-width:2px,color:#ffffff,rx:8px;

  subgraph G1 ["<span style='color:#06b6d4; font-weight:700;'>PHASE 1 · PRODUCT-MARKET FIT & EARLY ENGINE</span>"]
    direction TB
    A1["<b>Etiam elem · Core Dev</b><br/>Quisque ore sapien<br/><i>ARR: $5.0M · S&M: 52%</i>"]:::highlight
    A2["<b>Etiam elem · PLG Funnel</b><br/>Quisque ore sapien<br/><i>ARR: $15.0M · S&M: 46%</i>"]:::normal
    A1 --> A2
  end
  style G1 fill:#081622,stroke:#06b6d4,stroke-width:2.5px,rx:14px;

  subgraph G2 ["<span style='color:#a855f7; font-weight:700;'>PHASE 2 · SCALE ENGINE & SALES PODS</span>"]
    direction TB
    B1["<b>Etiam elem · Inside Sales</b><br/>Quisque ore sapien<br/><i>ARR: $35.0M · S&M: 42%</i>"]:::purpleCard
    B2["<b>Etiam elem · Multi-Product</b><br/>Quisque ore sapien<br/><i>ARR: $75.0M · S&M: 38%</i>"]:::normal
    B1 --> B2
  end
  style G2 fill:#190e29,stroke:#a855f7,stroke-width:2.5px,rx:14px;

  M1["<b>Etiam elementum</b><br/>Quisque ornare sapien<br/><i>Mid-Market Inflection · ARR $120M</i>"]:::normal
  M2["<b>Etiam elementum</b><br/>Quisque ornare sapien<br/><i>Channel Ecosystem · ARR $200M</i>"]:::normal

  subgraph G3 ["<span style='color:#3b82f6; font-weight:700;'>PHASE 3 · ENTERPRISE MOAT & RULE OF 40</span>"]
    direction TB
    C1["<b>Etiam elementum · Security GA</b><br/>Quisque ornare sapien<br/><i>ARR: $450.0M · S&M: 32%</i>"]:::blueCard
    C2["<b>Etiam elementum · Scale Cash</b><br/>Quisque ornare sapien<br/><i>ARR: $850.0M · FCF: 28%</i>"]:::normal
    C1 --> C2
  end
  style G3 fill:#0a1a33,stroke:#3b82f6,stroke-width:2.5px,rx:14px;

  A2 -->|"Quisque ornare ut nequetemes"| M1
  A1 -->|"Quisque ornare"| G3
  B2 -->|"Quisque ornare"| M2
  M1 -->|"Enterprise Pipeline"| C1
  M2 -->|"Rule of 40 Compounding"| C2
  A2 -->|"Sales Pod Handoff"| B1

  click A1 selectFlowPhase "Phase 1: Core Dev ($5M ARR)"
  click A2 selectFlowPhase "Phase 1: PLG Funnel ($15M ARR)"
  click B1 selectFlowPhase "Phase 2: Inside Sales ($35M ARR)"
  click B2 selectFlowPhase "Phase 2: Multi-Product ($75M ARR)"
  click M1 selectFlowPhase "Bridge: Mid-Market ($120M ARR)"
  click M2 selectFlowPhase "Bridge: Channel Ecosystem ($200M ARR)"
  click C1 selectFlowPhase "Phase 3: Enterprise GA ($450M ARR)"
  click C2 selectFlowPhase "Phase 3: Scale Cash ($850M ARR)"
""",
            'stages': [
                {'id': 'A1', 'year': 'Phase 1.1', 'phase_title': 'Core Dev & Seed Traction', 'revenue_formatted': '$5.0M', 'growth_formatted': '140%', 'sales_marketing_formatted': '52.0%', 'rd_formatted': '34.0%', 'operating_margin_formatted': '-45.0%', 'rule_of_40': 95.0, 'strategic_why': {'executive_summary': 'Initial product release and founder-led sales validating product-market fit with technical early adopters.'}},
                {'id': 'A2', 'year': 'Phase 1.2', 'phase_title': 'PLG Self-Serve Funnel', 'revenue_formatted': '$15.0M', 'growth_formatted': '110%', 'sales_marketing_formatted': '46.0%', 'rd_formatted': '30.0%', 'operating_margin_formatted': '-30.0%', 'rule_of_40': 80.0, 'strategic_why': {'executive_summary': 'Self-serve conversion and viral word-of-mouth adoption across engineering teams.'}},
                {'id': 'B1', 'year': 'Phase 2.1', 'phase_title': 'Inside Sales Acceleration', 'revenue_formatted': '$35.0M', 'growth_formatted': '85%', 'sales_marketing_formatted': '42.0%', 'rd_formatted': '28.0%', 'operating_margin_formatted': '-18.0%', 'rule_of_40': 67.0, 'strategic_why': {'executive_summary': 'Specialized sales pods and SDR outbound targeting mid-market accounts.'}},
                {'id': 'B2', 'year': 'Phase 2.2', 'phase_title': 'Multi-Product Cross-Sell', 'revenue_formatted': '$75.0M', 'growth_formatted': '70%', 'sales_marketing_formatted': '38.0%', 'rd_formatted': '26.0%', 'operating_margin_formatted': '-10.0%', 'rule_of_40': 60.0, 'strategic_why': {'executive_summary': 'Expansion into adjacent product modules driving 125% Net Dollar Retention (NDR).'}},
                {'id': 'M1', 'year': 'Bridge 1', 'phase_title': 'Mid-Market Inflection', 'revenue_formatted': '$120.0M', 'growth_formatted': '60%', 'sales_marketing_formatted': '36.0%', 'rd_formatted': '25.0%', 'operating_margin_formatted': '-4.0%', 'rule_of_40': 56.0, 'strategic_why': {'executive_summary': 'Transition to annual enterprise contracts with multi-year commitments.'}},
                {'id': 'M2', 'year': 'Bridge 2', 'phase_title': 'Global Channel Ecosystem', 'revenue_formatted': '$200.0M', 'growth_formatted': '50%', 'sales_marketing_formatted': '34.0%', 'rd_formatted': '24.0%', 'operating_margin_formatted': '+2.0%', 'rule_of_40': 52.0, 'strategic_why': {'executive_summary': 'Hyperscaler marketplaces (AWS, Azure, GCP) co-selling alongside direct enterprise reps.'}},
                {'id': 'C1', 'year': 'Phase 3.1', 'phase_title': 'Enterprise Platform Suite', 'revenue_formatted': '$450.0M', 'growth_formatted': '40%', 'sales_marketing_formatted': '32.0%', 'rd_formatted': '23.0%', 'operating_margin_formatted': '+12.0%', 'rule_of_40': 52.0, 'strategic_why': {'executive_summary': 'Full-suite wall-to-wall enterprise deployments with FedRAMP and SOC2 security moats.'}},
                {'id': 'C2', 'year': 'Phase 3.2', 'phase_title': 'Operating Cash Machine', 'revenue_formatted': '$850.0M', 'growth_formatted': '30%', 'sales_marketing_formatted': '28.0%', 'rd_formatted': '20.0%', 'operating_margin_formatted': '+24.0%', 'rule_of_40': 54.0, 'strategic_why': {'executive_summary': 'High free cash flow generation and durable Rule of 40 compounding.'}}
            ]
        }

    elif preset_id in ('datadog-clustered', 'ddog'):
        return get_clustered_company_flow('DDOG', db_path=db_path)
    elif preset_id in ('snowflake-scale', 'snow'):
        return get_clustered_company_flow('SNOW', db_path=db_path)
    elif preset_id in ('crowdstrike-falcon', 'crwd'):
        return get_clustered_company_flow('CRWD', db_path=db_path)
    elif preset_id in ('ai-saas-blueprint', 'ai-saas'):
        return get_ai_saas_blueprint()
    else:
        return get_preset_flow('template-process-flow', db_path=db_path)

def get_ai_saas_blueprint():
    """Seed to Series B AI SaaS Scaling Blueprint."""
    return {
        'id': 'ai-saas-blueprint',
        'title': 'Enterprise AI SaaS: Zero to $50M ARR Blueprint',
        'subtitle': 'Proven trajectory from API/Developer Adoption to Enterprise Platform & Rule of 40 Moat.',
        'company': {'name': 'AI SaaS Architecture', 'ticker': 'AI-SAAS'},
        'mermaid_code': """flowchart LR
  classDef card fill:#111927,stroke:#334155,stroke-width:1.5px,color:#f8fafc,rx:8px;
  classDef cyanCard fill:#0d2331,stroke:#06b6d4,stroke-width:2px,color:#ffffff,rx:8px;
  classDef purpleCard fill:#211233,stroke:#a855f7,stroke-width:2px,color:#ffffff,rx:8px;
  classDef blueCard fill:#0e203b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,rx:8px;

  subgraph G1 ["<span style='color:#06b6d4; font-weight:700;'>PHASE 1 · DEVELOPER ADOPTION & PLG ($1M–$8M ARR)</span>"]
    direction TB
    S1["<b>Seed · Open Weights / API</b><br/>Self-serve developer onboarding<br/><i>ARR: $2.1M · Growth: 220%</i>"]:::cyanCard
    S2["<b>Series A · Team Workspaces</b><br/>Usage-based tier activation<br/><i>ARR: $7.5M · Growth: 160%</i>"]:::card
    S1 -->|"+140% Net Expansion"| S2
  end
  style G1 fill:#081622,stroke:#06b6d4,stroke-width:2.5px,rx:14px;

  subgraph G2 ["<span style='color:#a855f7; font-weight:700;'>PHASE 2 · ENTERPRISE SALES & INFRASTRUCTURE ($15M–$30M ARR)</span>"]
    direction TB
    S3["<b>Dedicated VPC Deployments</b><br/>Security, HIPAA & Private VPC<br/><i>ARR: $16.0M · Growth: 110%</i>"]:::purpleCard
    S4["<b>Enterprise Outbound Pods</b><br/>Account-based quota ramp<br/><i>ARR: $28.5M · Growth: 85%</i>"]:::card
    S3 -->|"CAC Payback 9.5mo"| S4
  end
  style G2 fill:#190e29,stroke:#a855f7,stroke-width:2.5px,rx:14px;

  B1["<b>Fine-Tuning & Model Eval</b><br/>Proprietary Enterprise Datasets<br/><i>Moat Reinvestment · R&D 35%</i>"]:::card
  B2["<b>Hyperscaler Marketplace</b><br/>Azure & AWS Co-Sell Pipeline<br/><i>Channel Scale · 35% of Pipeline</i>"]:::card

  subgraph G3 ["<span style='color:#3b82f6; font-weight:700;'>PHASE 3 · MULTI-AGENT PLATFORM MOAT ($45M+ ARR)</span>"]
    direction TB
    S5["<b>Agentic Orchestration Suite</b><br/>Full autonomous workflow stack<br/><i>ARR: $48.0M · Growth: 65%</i>"]:::blueCard
    S6["<b>Rule of 40 Scale Inflection</b><br/>Operating cash flow positive<br/><i>ARR: $72.0M · FCF: +22%</i>"]:::card
    S5 -->|"FCF Margin Expansion"| S6
  end
  style G3 fill:#0a1a33,stroke:#3b82f6,stroke-width:2.5px,rx:14px;

  S2 -->|"Security & VPC Demand"| B1
  S1 -->|"Enterprise Leads"| G3
  S4 -->|"Multi-Cloud Distribution"| B2
  B1 -->|"Product Stickiness"| S5
  B2 -->|"Large Contract Ramps"| S6
  S2 -->|"Sales Assisted Handoff"| S3

  click S1 selectFlowPhase "Seed: Open API & Developer Adoption"
  click S2 selectFlowPhase "Series A: Usage-Based Workspaces"
  click S3 selectFlowPhase "Dedicated VPC & Private Cloud"
  click S4 selectFlowPhase "Enterprise Outbound Pods"
  click B1 selectFlowPhase "Fine-Tuning & Eval Moat"
  click B2 selectFlowPhase "Hyperscaler Co-Sell"
  click S5 selectFlowPhase "Agentic Orchestration Suite"
  click S6 selectFlowPhase "Rule of 40 Compounding"
""",
        'stages': [
            {'id': 'S1', 'year': 'Seed', 'phase_title': 'Developer Traction & Self-Serve', 'revenue_formatted': '$2.1M', 'growth_formatted': '220%', 'sales_marketing_formatted': '55.0%', 'rd_formatted': '40.0%', 'operating_margin_formatted': '-60.0%', 'rule_of_40': 160.0},
            {'id': 'S2', 'year': 'Series A', 'phase_title': 'Team Workspaces & Pay-As-You-Go', 'revenue_formatted': '$7.5M', 'growth_formatted': '160%', 'sales_marketing_formatted': '48.0%', 'rd_formatted': '34.0%', 'operating_margin_formatted': '-40.0%', 'rule_of_40': 120.0},
            {'id': 'S3', 'year': 'Expansion 1', 'phase_title': 'Private VPC & HIPAA Compliance', 'revenue_formatted': '$16.0M', 'growth_formatted': '110%', 'sales_marketing_formatted': '42.0%', 'rd_formatted': '30.0%', 'operating_margin_formatted': '-22.0%', 'rule_of_40': 88.0},
            {'id': 'S4', 'year': 'Series B', 'phase_title': 'Enterprise Sales Pods Ramp', 'revenue_formatted': '$28.5M', 'growth_formatted': '85%', 'sales_marketing_formatted': '38.0%', 'rd_formatted': '28.0%', 'operating_margin_formatted': '-10.0%', 'rule_of_40': 75.0},
            {'id': 'B1', 'year': 'Platform', 'phase_title': 'Fine-Tuning & Moat Reinvestment', 'revenue_formatted': '$38.0M', 'growth_formatted': '75%', 'sales_marketing_formatted': '35.0%', 'rd_formatted': '32.0%', 'operating_margin_formatted': '-8.0%', 'rule_of_40': 67.0},
            {'id': 'B2', 'year': 'Channel', 'phase_title': 'Hyperscaler Co-Sell Engine', 'revenue_formatted': '$42.0M', 'growth_formatted': '70%', 'sales_marketing_formatted': '32.0%', 'rd_formatted': '26.0%', 'operating_margin_formatted': '-2.0%', 'rule_of_40': 68.0},
            {'id': 'S5', 'year': 'Platform GA', 'phase_title': 'Agentic Orchestration Suite', 'revenue_formatted': '$48.0M', 'growth_formatted': '65%', 'sales_marketing_formatted': '30.0%', 'rd_formatted': '24.0%', 'operating_margin_formatted': '+8.0%', 'rule_of_40': 73.0},
            {'id': 'S6', 'year': 'Rule of 40', 'phase_title': 'Operating Cash Machine', 'revenue_formatted': '$72.0M', 'growth_formatted': '55%', 'sales_marketing_formatted': '26.0%', 'rd_formatted': '22.0%', 'operating_margin_formatted': '+22.0%', 'rule_of_40': 77.0}
        ]
    }

def get_clustered_company_flow(ticker: str, startup_profile=None, db_path=DB):
    """Cluster historical company SEC periods into 3 thematic subgraphs (Cyan, Purple, Blue)."""
    import company_flow
    raw = company_flow.get_company_flow(ticker, startup_profile, path=db_path)
    stages = raw.get('stages', [])
    comp = raw.get('company', {})
    cname = comp.get('name', ticker)
    
    if not stages:
        return get_preset_flow('template-process-flow', db_path=db_path)
    
    n = len(stages)
    # Split into 3 buckets: early (Phase 1), mid (Phase 2), mature (Phase 3)
    k1 = max(1, n // 3)
    k2 = max(k1 + 1, (2 * n) // 3)
    
    g1_stages = stages[:k1]
    g2_stages = stages[k1:k2]
    g3_stages = stages[k2:]
    
    mermaid_lines = [
        "flowchart LR",
        "  classDef card fill:#111927,stroke:#334155,stroke-width:1.5px,color:#f8fafc,rx:8px;",
        "  classDef cyanCard fill:#0d2331,stroke:#06b6d4,stroke-width:2px,color:#ffffff,rx:8px;",
        "  classDef purpleCard fill:#211233,stroke:#a855f7,stroke-width:2px,color:#ffffff,rx:8px;",
        "  classDef blueCard fill:#0e203b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,rx:8px;"
    ]
    
    # Subgraph 1: Cyan
    g1_label = f"<span style='color:#06b6d4; font-weight:700;'>PHASE 1 · INITIAL GTM & MARKET ENTRY ({stages[0]['year']}–{stages[k1-1]['year']})</span>"
    mermaid_lines.append(f'  subgraph G1 ["{g1_label}"]')
    mermaid_lines.append("    direction TB")
    for s in g1_stages:
        nid = f"N_{s['index']}"
        label = f"\"<b>{s['year']} · {s['phase_title']}</b><br/>ARR: {s['revenue_formatted']} · Growth: {s['growth_formatted']}<br/><i>S&M: {s['sales_marketing_formatted']} | R&D: {s['rd_formatted']}</i>\""
        cls = "cyanCard" if s['index'] == 1 else "card"
        mermaid_lines.append(f"    {nid}[{label}]:::{cls}")
    if len(g1_stages) > 1:
        for idx in range(len(g1_stages) - 1):
            mermaid_lines.append(f"    N_{g1_stages[idx]['index']} --> N_{g1_stages[idx+1]['index']}")
    mermaid_lines.append("  end")
    mermaid_lines.append("  style G1 fill:#081622,stroke:#06b6d4,stroke-width:2.5px,rx:14px;")
    
    # Subgraph 2: Purple
    g2_label = f"<span style='color:#a855f7; font-weight:700;'>PHASE 2 · MULTI-PRODUCT SCALE ({stages[k1]['year']}–{stages[k2-1]['year']})</span>"
    mermaid_lines.append(f'  subgraph G2 ["{g2_label}"]')
    mermaid_lines.append("    direction TB")
    for s in g2_stages:
        nid = f"N_{s['index']}"
        label = f"\"<b>{s['year']} · {s['phase_title']}</b><br/>ARR: {s['revenue_formatted']} · Growth: {s['growth_formatted']}<br/><i>S&M: {s['sales_marketing_formatted']} | R&D: {s['rd_formatted']}</i>\""
        cls = "purpleCard" if s['index'] == k1 + 1 else "card"
        mermaid_lines.append(f"    {nid}[{label}]:::{cls}")
    if len(g2_stages) > 1:
        for idx in range(len(g2_stages) - 1):
            mermaid_lines.append(f"    N_{g2_stages[idx]['index']} --> N_{g2_stages[idx+1]['index']}")
    mermaid_lines.append("  end")
    mermaid_lines.append("  style G2 fill:#190e29,stroke:#a855f7,stroke-width:2.5px,rx:14px;")
    
    # Subgraph 3: Blue
    g3_label = f"<span style='color:#3b82f6; font-weight:700;'>PHASE 3 · ENTERPRISE MOAT & RULE OF 40 ({stages[k2]['year']}–{stages[-1]['year']})</span>"
    mermaid_lines.append(f'  subgraph G3 ["{g3_label}"]')
    mermaid_lines.append("    direction TB")
    for s in g3_stages:
        nid = f"N_{s['index']}"
        r40_str = f" | R40: {s['rule_of_40']}" if s.get('rule_of_40') else ""
        label = f"\"<b>{s['year']} · {s['phase_title']}</b><br/>ARR: {s['revenue_formatted']} · Growth: {s['growth_formatted']}<br/><i>S&M: {s['sales_marketing_formatted']} | R&D: {s['rd_formatted']}{r40_str}</i>\""
        cls = "blueCard" if s['index'] == k2 + 1 else "card"
        mermaid_lines.append(f"    {nid}[{label}]:::{cls}")
    if len(g3_stages) > 1:
        for idx in range(len(g3_stages) - 1):
            mermaid_lines.append(f"    N_{g3_stages[idx]['index']} --> N_{g3_stages[idx+1]['index']}")
    mermaid_lines.append("  end")
    mermaid_lines.append("  style G3 fill:#0a1a33,stroke:#3b82f6,stroke-width:2.5px,rx:14px;")
    
    # Inter-cluster edges
    last_g1 = g1_stages[-1]
    first_g2 = g2_stages[0]
    sm_delta_1 = first_g2['deltas']['sm_pp']
    delta_str_1 = f"\"{('+' if (sm_delta_1 or 0) >= 0 else '')}{sm_delta_1}pp S&M<br/>ARR {first_g2['growth_formatted']}\"" if sm_delta_1 is not None else "\"Cross-Sell Expansion\""
    mermaid_lines.append(f"  N_{last_g1['index']} -->|{delta_str_1}| N_{first_g2['index']}")
    
    last_g2 = g2_stages[-1]
    first_g3 = g3_stages[0]
    sm_delta_2 = first_g3['deltas']['sm_pp']
    delta_str_2 = f"\"{('+' if (sm_delta_2 or 0) >= 0 else '')}{sm_delta_2}pp S&M<br/>ARR {first_g3['growth_formatted']}\"" if sm_delta_2 is not None else "\"Operating Leverage\""
    mermaid_lines.append(f"  N_{last_g2['index']} -->|{delta_str_2}| N_{first_g3['index']}")
    
    # Direct high-level flow connection across clusters
    mermaid_lines.append(f"  G1 -.->|\"GTM Architecture\"| G3")
    
    # Click events
    for s in stages:
        mermaid_lines.append(f'  click N_{s["index"]} selectFlowPhase "Inspect {s["year"]} Strategic Why & Frameworks"')
        
    mermaid_code = "\n".join(mermaid_lines)
    
    return {
        'id': f"{ticker.lower()}-clustered",
        'title': f"{cname} ({ticker}) Strategic Flow Architecture",
        'subtitle': f"Clustered multi-year trajectory from {stages[0]['revenue_formatted']} to {stages[-1]['revenue_formatted']} ARR categorized into GTM Engine, Multi-Product Scale, and Platform Moat.",
        'company': comp,
        'stages': stages,
        'mermaid_code': mermaid_code,
        'comparison': raw.get('comparison')
    }

def generate_ai_strategy_flow(user_prompt: str, company_context: str = None, startup_profile: dict = None, db_path=DB):
    """Call OpenAI API (gpt-5-mini) to generate a customized strategy flow with Mermaid code."""
    config = load_ai_config()
    if not config['OPENAI_API_KEY']:
        # Fall back gracefully to customized template
        return get_preset_flow('ai-saas-blueprint', db_path=db_path)
    
    context_data = ""
    if company_context:
        try:
            import company_flow
            flow = company_flow.get_company_flow(company_context, startup_profile, path=db_path)
            if flow and flow.get('stages'):
                st = flow['stages']
                context_data = f"Actual SEC data for {company_context}: " + "; ".join(
                    f"{s['year']}: ARR {s['revenue_formatted']}, Growth {s['growth_formatted']}, S&M {s['sales_marketing_formatted']}, R&D {s['rd_formatted']}"
                    for s in st[:6]
                )
        except Exception:
            pass

    system_prompt = """You are the Chief Enterprise Strategy Architect in Strategy Studio.
Your role is to write clean, valid Mermaid.js flowchart code for a multi-stage strategic roadmap.

DIAGRAM STYLING RULES (MATCHING THE ATTACHED PROCESS FLOW TEMPLATE):
1. Must start with `flowchart LR`.
2. Must organize stages into 2 to 3 `subgraph` clusters:
   - Subgraph 1: Cyan Container (Initial GTM / Product-Market Fit)
     Syntax:
     subgraph G1 ["<span style='color:#06b6d4; font-weight:700;'>PHASE 1 · TITLE</span>"]
       direction TB
       ...
     end
     style G1 fill:#081622,stroke:#06b6d4,stroke-width:2.5px,rx:14px;
   - Subgraph 2: Purple Container (Expansion / Multi-Product)
     Syntax:
     subgraph G2 ["<span style='color:#a855f7; font-weight:700;'>PHASE 2 · TITLE</span>"]
       direction TB
       ...
     end
     style G2 fill:#190e29,stroke:#a855f7,stroke-width:2.5px,rx:14px;
   - Subgraph 3: Blue Container (Enterprise Moat / Rule of 40)
     Syntax:
     subgraph G3 ["<span style='color:#3b82f6; font-weight:700;'>PHASE 3 · TITLE</span>"]
       direction TB
       ...
     end
     style G3 fill:#0a1a33,stroke:#3b82f6,stroke-width:2.5px,rx:14px;
3. Use classDef for cards:
   classDef card fill:#111927,stroke:#334155,stroke-width:1.5px,color:#f8fafc,rx:8px;
   classDef cyanCard fill:#0d2331,stroke:#06b6d4,stroke-width:2px,color:#ffffff,rx:8px;
   classDef purpleCard fill:#211233,stroke:#a855f7,stroke-width:2px,color:#ffffff,rx:8px;
   classDef blueCard fill:#0e203b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,rx:8px;
4. Inside subgraphs, define nodes formatted like:
   NODE_ID["<b>Title</b><br/>Subtitle or initiatives<br/><i>ARR: $XM · S&M: Y% · R&D: Z%</i>"]:::card
5. Connect nodes using informative edges:
   NODE_A -->|"Label with metric delta"| NODE_B
6. Include click callbacks for each node:
   click NODE_ID selectFlowPhase "Phase Title"

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following keys:
- title: Short string title
- subtitle: 1-2 sentence executive summary
- mermaid_code: Clean, valid Mermaid.js flowchart string (no triple backtick fences)
- stages: Array of objects with { id, year, phase_title, revenue_formatted, growth_formatted, sales_marketing_formatted, rd_formatted, operating_margin_formatted, rule_of_40, strategic_why: { executive_summary, sm_why, rd_why } }
"""

    user_message = f"User Request: {user_prompt}\n"
    if context_data:
        user_message += f"\nCompany Context:\n{context_data}\n"
    if startup_profile:
        user_message += f"\nStartup Profile: ARR ${startup_profile.get('revenue', 10)}M, S&M {startup_profile.get('sales_marketing_ratio', 48)}%, R&D {startup_profile.get('rd_ratio', 26)}%, Objective {startup_profile.get('objective', 'growth')}\n"

    try:
        with httpx.Client(timeout=90) as client:
            resp = client.post(
                'https://api.openai.com/v1/chat/completions',
                headers={'Authorization': f'Bearer {config["OPENAI_API_KEY"]}'},
                json={
                    'model': config['OPENAI_MODEL'],
                    'messages': [
                        {'role': 'system', 'content': system_prompt},
                        {'role': 'user', 'content': user_message}
                    ],
                    'response_format': {'type': 'json_object'}
                }
            )
            resp.raise_for_status()
            res_json = resp.json()
            content = res_json['choices'][0]['message']['content']
            parsed = json.loads(content)
            
            # Clean up mermaid code if needed
            code = parsed.get('mermaid_code', '')
            code = re.sub(r'^```mermaid\s*', '', code.strip())
            code = re.sub(r'```$', '', code.strip())
            parsed['mermaid_code'] = code
            return parsed
    except Exception as exc:
        # Fallback to blueprint with custom title
        blueprint = get_preset_flow('ai-saas-blueprint', db_path=db_path)
        blueprint['title'] = f"Generated Flow: {user_prompt[:40]}..."
        blueprint['subtitle'] = f"AI Strategy Roadmap generated for '{user_prompt}' (Local synthesized architecture)."
        return blueprint

def _money(v):
    if v is None: return "N/A"
    if abs(v) >= 1e9: return f"${v/1e9:.2f}B"
    return f"${v/1e6:.1f}M"

def _pct(v):
    if v is None: return "N/A"
    return f"{v * 100:.1f}%"

MODEL_MOTIONS = {
    'plg_wedge': {
        'title': 'Product-Led Growth (PLG) & Self-Serve Wedge',
        'desc': 'Self-serve developer onboarding, usage-based trial, and viral engineering adoption.',
        'arr': 12.0, 'growth': 1.20, 'sm': 0.48, 'rd': 0.34, 'margin': -0.30, 'r40': 90.0,
        'why': 'Bottom-up adoption by engineering practitioners validates core product utility with low initial CAC.'
    },
    'enterprise_sales': {
        'title': 'Enterprise Outbound & Field Sales Pods',
        'desc': 'Dedicated SDR/AE pods, security reviews, and six-figure ACV multi-year enterprise contracts.',
        'arr': 45.0, 'growth': 0.85, 'sm': 0.42, 'rd': 0.28, 'margin': -0.15, 'r40': 70.0,
        'why': 'Account-based outbound targeting mid-market and enterprise accounts unlocks large multi-seat ACVs.'
    },
    'multi_product': {
        'title': 'Multi-Product Expansion & Platform Cross-Sell',
        'desc': 'Second core product module driving wall-to-wall adoption and 125%+ Net Dollar Retention.',
        'arr': 125.0, 'growth': 0.65, 'sm': 0.36, 'rd': 0.26, 'margin': -0.05, 'r40': 60.0,
        'why': 'Cross-selling additional platform modules drastically increases customer switching costs and LTV.'
    },
    'consumption_infra': {
        'title': 'Usage-Based Consumption & Infrastructure Scale',
        'desc': 'Elastic cloud compute and data unit consumption model scaling with customer workload volume.',
        'arr': 240.0, 'growth': 0.55, 'sm': 0.34, 'rd': 0.24, 'margin': 0.05, 'r40': 60.0,
        'why': 'Workload-driven consumption provides frictionless expansion revenue without continuous contract renegotiation.'
    },
    'marketplace': {
        'title': 'Hyperscaler Co-Sell & Cloud Marketplaces',
        'desc': 'AWS, Azure and GCP Marketplace co-sell drawing down enterprise committed cloud spend.',
        'arr': 180.0, 'growth': 0.60, 'sm': 0.32, 'rd': 0.25, 'margin': 0.02, 'r40': 62.0,
        'why': 'Hyperscaler co-sell contracts reduce procurement friction and accelerate large enterprise closings.'
    },
    'international': {
        'title': 'International Expansion & Cross-Border Clearing',
        'desc': 'European and APAC headquarters, sovereign data residency, and localized billing.',
        'arr': 310.0, 'growth': 0.48, 'sm': 0.34, 'rd': 0.22, 'margin': 0.08, 'r40': 56.0,
        'why': 'Geographic diversification opens major overseas enterprise addressable markets (TAM).'
    },
    'rule_40_moat': {
        'title': 'Rule of 40 Margin Leverage & Free Cash Flow Machine',
        'desc': 'Operating leverage absorption, positive free cash flow, and durable Rule of 40 compounding.',
        'arr': 650.0, 'growth': 0.32, 'sm': 0.26, 'rd': 0.20, 'margin': 0.22, 'r40': 54.0,
        'why': 'Fixed G&A leverage and renewal compounding generates substantial free cash flow to self-fund growth.'
    }
}

def extend_strategy_flow(action: str = 'append', model_type: str = 'enterprise_sales',
                         company_ticker: str = 'DDOG', horizon_phase: str = 'phase_2',
                         strategic_focus: str = 'growth', custom_label: str = '',
                         current_flow: dict = None, branch_from_id: str = None,
                         db_path=DB):
    """Incrementally build, append to, or branch from an existing strategy flowchart."""
    import sqlite3
    action = (action or 'append').lower()
    motion_info = MODEL_MOTIONS.get(model_type, MODEL_MOTIONS['enterprise_sales'])
    
    # Query real SEC 10-K company data if available
    comp_name = company_ticker
    sec_periods = []
    try:
        with sqlite3.connect(db_path) as con:
            con.row_factory = sqlite3.Row
            c = con.execute("SELECT company_id, ticker, name FROM companies WHERE ticker = ? COLLATE NOCASE", (company_ticker,)).fetchone()
            if c:
                comp_name = c['name']
                p_rows = con.execute("SELECT period_end, fields_json FROM periods WHERE company_id = ? ORDER BY period_end ASC", (c['company_id'],)).fetchall()
                for pr in p_rows:
                    sec_periods.append((pr['period_end'][:4], json.loads(pr['fields_json'])))
    except Exception:
        pass

    # Extract or initialize existing stages
    existing_stages = list(current_flow.get('stages', [])) if current_flow else []
    
    if action == 'build' or not existing_stages:
        # Full fresh flow build for this model & peer
        if company_ticker and company_ticker.upper() in ('DDOG', 'SNOW', 'CRWD', 'HUBS', 'MDB', 'ZI'):
            return get_clustered_company_flow(company_ticker.upper(), db_path=db_path)
        return get_preset_flow('template-process-flow', db_path=db_path)

    # Calculate next index and baseline numbers
    next_idx = len(existing_stages) + 1
    last_stage = existing_stages[-1]
    last_rev = last_stage.get('revenue') or (motion_info['arr'] * 1e6 * 0.6)
    
    # ARR progression
    multiplier = 1.6 if strategic_focus == 'growth' else 1.35
    new_rev = max(last_rev * multiplier, motion_info['arr'] * 1e6)
    
    # Strategic adjustments
    sm_ratio = motion_info['sm']
    rd_ratio = motion_info['rd']
    op_margin = motion_info['margin']
    growth_rate = motion_info['growth']
    
    if strategic_focus == 'growth':
        sm_ratio += 0.04
        growth_rate += 0.10
        op_margin -= 0.05
    elif strategic_focus == 'moat':
        rd_ratio += 0.05
        growth_rate += 0.05
    elif strategic_focus == 'rule40':
        sm_ratio -= 0.05
        op_margin += 0.08
    elif strategic_focus == 'fcf':
        sm_ratio -= 0.07
        rd_ratio -= 0.03
        op_margin += 0.12

    r40_val = round((growth_rate + op_margin) * 100, 1)
    title = custom_label.strip() if custom_label and custom_label.strip() else motion_info['title']
    
    # Check if this is a branch
    is_branch = (action == 'branch')
    branch_source = None
    if is_branch:
        if branch_from_id:
            branch_source = next((s for s in existing_stages if s['id'] == branch_from_id or str(s.get('index')) == str(branch_from_id)), last_stage)
        else:
            branch_source = last_stage
        node_id = f"N_branch_{next_idx}"
        year_label = f"Branch {branch_source.get('year', 'P')}.{next_idx}"
    else:
        node_id = f"N_{next_idx}"
        year_label = f"Phase {next_idx}"

    sm_delta_pp = round((sm_ratio - (last_stage.get('sales_marketing_ratio') or 0.40)) * 100, 1)
    growth_delta_pp = round((growth_rate - (last_stage.get('growth') or 0.50)) * 100, 1)

    new_stage = {
        'id': node_id,
        'index': next_idx,
        'year': year_label,
        'phase_title': title,
        'phase_desc': motion_info['desc'],
        'revenue': new_rev,
        'revenue_formatted': _money(new_rev),
        'growth': growth_rate,
        'growth_formatted': _pct(growth_rate),
        'sales_marketing_ratio': sm_ratio,
        'sales_marketing_formatted': _pct(sm_ratio),
        'rd_ratio': rd_ratio,
        'rd_formatted': _pct(rd_ratio),
        'operating_margin': op_margin,
        'operating_margin_formatted': _pct(op_margin),
        'rule_of_40': r40_val,
        'is_branch': is_branch,
        'branch_from': branch_source['id'] if branch_source else None,
        'deltas': {
            'sm_pp': sm_delta_pp,
            'rd_pp': round((rd_ratio - (last_stage.get('rd_ratio') or 0.25)) * 100, 1),
            'growth_pp': growth_delta_pp
        },
        'strategic_why': {
            'executive_summary': f"{title} transition targeting {_money(new_rev)} ARR grounded in {comp_name} peer dynamics.",
            'sm_why': f"S&M allocated at {_pct(sm_ratio)} to execute {title.lower()}.",
            'rd_why': f"R&D intensity maintained at {_pct(rd_ratio)} to defend technological moat."
        },
        'copy_payload': {
            'sales_marketing_ratio': round(sm_ratio * 100, 1),
            'rd_ratio': round(rd_ratio * 100, 1),
            'objective': 'growth' if growth_rate > 0.40 else 'profitability',
            'strategy_name': f"{title} ({year_label})"
        }
    }
    
    updated_stages = existing_stages + [new_stage]

    # Re-generate clean Mermaid code
    mermaid_lines = [
        "flowchart LR",
        "  classDef card fill:#111927,stroke:#334155,stroke-width:1.5px,color:#f8fafc,rx:8px;",
        "  classDef cyanCard fill:#0d2331,stroke:#06b6d4,stroke-width:2px,color:#ffffff,rx:8px;",
        "  classDef purpleCard fill:#211233,stroke:#a855f7,stroke-width:2px,color:#ffffff,rx:8px;",
        "  classDef blueCard fill:#0e203b,stroke:#3b82f6,stroke-width:2px,color:#ffffff,rx:8px;",
        "  classDef branchCard fill:#2e1065,stroke:#c084fc,stroke-width:2px,stroke-dasharray: 4 2,color:#ffffff,rx:8px;"
    ]

    for s in updated_stages:
        nid = s['id'] if s['id'].startswith('N_') else f"N_{s['index']}"
        cls = "branchCard" if s.get('is_branch') else ("cyanCard" if s['index'] <= 2 else ("purpleCard" if s['index'] <= 4 else "blueCard"))
        r40_txt = f" | R40: {s['rule_of_40']}" if s.get('rule_of_40') else ""
        label = f"\"<b>{s['year']} · {s['phase_title']}</b><br/>ARR: {s['revenue_formatted']} · Growth: {s['growth_formatted']}<br/><i>S&M: {s['sales_marketing_formatted']} | R&D: {s['rd_formatted']}{r40_txt}</i>\""
        mermaid_lines.append(f"  {nid}[{label}]:::{cls}")

    # Connect sequential nodes
    non_branches = [s for s in updated_stages if not s.get('is_branch')]
    for i in range(len(non_branches) - 1):
        prev_s = non_branches[i]
        curr_s = non_branches[i+1]
        prev_id = prev_s['id'] if prev_s['id'].startswith('N_') else f"N_{prev_s['index']}"
        curr_id = curr_s['id'] if curr_s['id'].startswith('N_') else f"N_{curr_s['index']}"
        delta_str = f"\"{('+' if (curr_s['deltas']['sm_pp'] or 0) >= 0 else '')}{curr_s['deltas']['sm_pp']}pp S&M<br/>ARR {curr_s['growth_formatted']}\""
        mermaid_lines.append(f"  {prev_id} -->|{delta_str}| {curr_id}")

    # Connect branch nodes
    for s in updated_stages:
        if s.get('is_branch'):
            b_from = s.get('branch_from')
            src_node = next((p for p in updated_stages if p['id'] == b_from or str(p.get('index')) == str(b_from)), non_branches[-1])
            src_id = src_node['id'] if src_node['id'].startswith('N_') else f"N_{src_node['index']}"
            b_id = s['id']
            mermaid_lines.append(f"  {src_id} -.->|\"🌿 Branch: {s['phase_title']}\"| {b_id}")

    # Click events
    for s in updated_stages:
        nid = s['id'] if s['id'].startswith('N_') else f"N_{s['index']}"
        mermaid_lines.append(f'  click {nid} selectFlowPhase "Inspect {s["year"]} Strategic Why & Frameworks"')

    return {
        'id': f"{company_ticker.lower()}-strategy-flow",
        'title': f"{comp_name} Multi-Stage Strategic Trajectory",
        'subtitle': f"Customized {len(updated_stages)}-phase strategic roadmap incorporating {title}.",
        'company': {'name': comp_name, 'ticker': company_ticker.upper()},
        'stages': updated_stages,
        'stages_count': len(updated_stages),
        'mermaid_code': "\n".join(mermaid_lines),
        'added_stage': new_stage,
        'action': action
    }

