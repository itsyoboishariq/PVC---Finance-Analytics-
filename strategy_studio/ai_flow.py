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
