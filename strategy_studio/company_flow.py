"""Company Strategy Flowchart Generator: Extract multi-year SaaS strategy trajectories,
generate Mermaid.js flowcharts, compare/contrast with startup profile, and support strategy copying.
"""
import sqlite3
import json
import math
from database import DB

def _money(v):
    if v is None: return "N/A"
    if abs(v) >= 1e9: return f"${v/1e9:.2f}B"
    return f"${v/1e6:.1f}M"

def _pct(v):
    if v is None: return "N/A"
    return f"{v * 100:.1f}%"

def _classify_phase(idx, total, rev, growth, margin, sm, rd, r40):
    """Categorize strategic focus into SaaS lifecycle playbooks."""
    if idx == 0 and (sm or 0) > 0.60:
        return "Early Market Land-Grab", "High-velocity spending to capture initial market share"
    elif (growth or 0) > 0.80 and (sm or 0) > 0.50:
        return "Hyper-Scale Blitz", "Aggressive go-to-market reinvestment prioritizing top-line expansion"
    elif (growth or 0) > 0.40 and (margin or 0) > -0.15:
        return "Capital-Efficient Expansion", "Balanced growth while maintaining disciplined burn"
    elif (sm or 0) < 0.40 and (margin or 0) > 0.05:
        return "Operating Leverage & Cash Generation", "Harvesting platform leverage and expanding margins"
    elif (rd or 0) > 0.30:
        return "Product & Platform Moat", "Heavy engineering reinvestment to defend TAM"
    elif idx == total - 1:
        return "Mature Scale & Rule of 40", "Sustainable enterprise profitability and compounding"
    elif (margin or 0) < -0.40:
        return "Accelerated Investment Phase", "Deliberate cash burn expansion to seize TAM opportunity"
    else:
        return "Sales Execution & Scaling", "Steady go-to-market scaling and quota ramp"

def list_flow_companies(path=DB):
    """Return list of top SaaS companies available for flow mapping."""
    with sqlite3.connect(path) as con:
        con.row_factory = sqlite3.Row
        query = """
            SELECT c.company_id, c.ticker, c.name, COUNT(p.row_id) as period_count,
                   MIN(p.period_end) as first_year, MAX(p.period_end) as last_year
            FROM companies c
            JOIN periods p ON c.company_id = p.company_id
            GROUP BY c.company_id
            HAVING period_count >= 3
            ORDER BY c.ticker ASC
        """
        rows = con.execute(query).fetchall()
        
        # Priority premier tickers
        premier = {'SNOW', 'DDOG', 'CRWD', 'HUBS', 'MDB', 'ZI', 'JAMF', 'NCNO', 'ESTC', 'CFLT', 'S', 'FROG', 'BILL', 'TWLO'}
        
        results = []
        for r in rows:
            ticker = r['ticker'] or ''
            results.append({
                'company_id': r['company_id'],
                'ticker': ticker,
                'name': r['name'],
                'period_count': r['period_count'],
                'years': f"{r['first_year'][:4]}–{r['last_year'][:4]}",
                'is_featured': ticker in premier
            })
        
        # Sort featured first, then alphabetical
        results.sort(key=lambda x: (not x['is_featured'], x['ticker'] or x['name']))
        return results

def get_company_flow(identifier, startup_profile=None, path=DB):
    """Extract chronological strategy flow, generate Mermaid flowchart, and contrast with startup profile."""
    with sqlite3.connect(path) as con:
        con.row_factory = sqlite3.Row
        
        # Match company by ticker or ID or name
        c_row = con.execute("""
            SELECT company_id, ticker, name, metadata_json 
            FROM companies 
            WHERE ticker = ? COLLATE NOCASE 
               OR company_id = ? 
               OR name LIKE ?
            LIMIT 1
        """, (identifier, identifier, f"%{identifier}%")).fetchone()
        
        if not c_row:
            return {'error': f"Company '{identifier}' not found in SEC dataset."}
        
        cid = c_row['company_id']
        ticker = c_row['ticker'] or cid
        company_name = c_row['name']
        
        # Fetch all periods
        p_rows = con.execute("""
            SELECT row_id, period_end, fields_json 
            FROM periods 
            WHERE company_id = ? 
            ORDER BY period_end ASC
        """, (cid,)).fetchall()
        
        if not p_rows:
            return {'error': f"No annual financial history found for {company_name}."}
        
        stages = []
        prev_fields = None
        
        for idx, row in enumerate(p_rows):
            fields = json.loads(row['fields_json'])
            period_end = row['period_end']
            year_label = f"FY{period_end[:4]}"
            
            rev = fields.get('revenue')
            growth = fields.get('revenue_growth')
            margin = fields.get('operating_margin')
            gross = fields.get('gross_margin')
            sm = fields.get('sales_marketing_ratio')
            rd = fields.get('rd_ratio')
            r40 = ((growth or 0) + (margin or 0)) * 100 if growth is not None and margin is not None else None
            
            # Deltas vs previous period
            delta_sm = (sm - prev_fields.get('sales_marketing_ratio')) if (prev_fields and sm is not None and prev_fields.get('sales_marketing_ratio') is not None) else None
            delta_rd = (rd - prev_fields.get('rd_ratio')) if (prev_fields and rd is not None and prev_fields.get('rd_ratio') is not None) else None
            delta_growth = (growth - prev_fields.get('revenue_growth')) if (prev_fields and growth is not None and prev_fields.get('revenue_growth') is not None) else None
            delta_margin = (margin - prev_fields.get('operating_margin')) if (prev_fields and margin is not None and prev_fields.get('operating_margin') is not None) else None
            
            phase_title, phase_desc = _classify_phase(idx, len(p_rows), rev, growth, margin, sm, rd, r40)
            
            stage_data = {
                'id': f"stage_{idx + 1}",
                'index': idx + 1,
                'year': year_label,
                'period_end': period_end,
                'phase_title': phase_title,
                'phase_desc': phase_desc,
                'revenue': rev,
                'revenue_formatted': _money(rev),
                'growth': growth,
                'growth_formatted': _pct(growth),
                'operating_margin': margin,
                'operating_margin_formatted': _pct(margin),
                'gross_margin': gross,
                'gross_margin_formatted': _pct(gross),
                'sales_marketing_ratio': sm,
                'sales_marketing_formatted': _pct(sm),
                'rd_ratio': rd,
                'rd_formatted': _pct(rd),
                'rule_of_40': round(r40, 1) if r40 is not None else None,
                'deltas': {
                    'sm_pp': round(delta_sm * 100, 1) if delta_sm is not None else None,
                    'rd_pp': round(delta_rd * 100, 1) if delta_rd is not None else None,
                    'growth_pp': round(delta_growth * 100, 1) if delta_growth is not None else None,
                    'margin_pp': round(delta_margin * 100, 1) if delta_margin is not None else None,
                },
                'copy_payload': {
                    'sales_marketing_ratio': round(sm * 100, 1) if sm is not None else 40.0,
                    'rd_ratio': round(rd * 100, 1) if rd is not None else 25.0,
                    'objective': 'growth' if growth and growth > 0.40 else 'profitability',
                    'strategy_name': f"{company_name} {year_label} Playbook"
                }
            }
            stages.append(stage_data)
            prev_fields = fields
        
        # Build Mermaid.js Flowchart syntax (Athena Darkish-Red Theme)
        mermaid_lines = [
            "graph LR",
            "  classDef normal fill:#160a0d,stroke:#be123c,stroke-width:2px,color:#faf4f5;",
            "  classDef elite fill:#0e1915,stroke:#10b981,stroke-width:2px,color:#ecfdf5;",
            "  classDef heavy fill:#1f130b,stroke:#d97706,stroke-width:2px,color:#fef3c7;"
        ]
        
        for i, s in enumerate(stages):
            node_id = f"S{i+1}"
            cls = "elite" if (s['rule_of_40'] and s['rule_of_40'] >= 40) else ("heavy" if (s['sales_marketing_ratio'] and s['sales_marketing_ratio'] > 0.6) else "normal")
            
            # Node label text
            node_label = f"\"<b>{s['year']} · {s['phase_title']}</b><br/>ARR: {s['revenue_formatted']}<br/>S&M: {s['sales_marketing_formatted']} | R&D: {s['rd_formatted']}<br/>Growth: {s['growth_formatted']}{' | R40: ' + str(s['rule_of_40']) if s['rule_of_40'] else ''}\""
            mermaid_lines.append(f"  {node_id}[{node_label}]:::{cls}")
            mermaid_lines.append(f"  click {node_id} selectFlowPhase \"Inspect {s['year']} Strategic Why & Frameworks\"")
            
            if i > 0:
                prev_id = f"S{i}"
                sm_delta = s['deltas']['sm_pp']
                growth_delta = s['growth_formatted']
                
                edge_label = ""
                if sm_delta is not None:
                    sign = "+" if sm_delta >= 0 else ""
                    edge_label = f"\"{sign}{sm_delta}pp S&M<br/>ARR {growth_delta}\""
                else:
                    edge_label = f"\"ARR {growth_delta}\""
                
                mermaid_lines.append(f"  {prev_id} -->|{edge_label}| {node_id}")
        
        mermaid_code = "\n".join(mermaid_lines)
        
        # Compare & Contrast with User's Startup Profile
        comparison = None
        if startup_profile and startup_profile.get('revenue'):
            user_rev = float(startup_profile['revenue'])
            user_growth = float(startup_profile.get('revenue_growth', 0.5))
            user_margin = float(startup_profile.get('operating_margin', -0.2))
            user_sm = float(startup_profile.get('sales_marketing_ratio', 0.45))
            user_rd = float(startup_profile.get('rd_ratio', 0.25))
            user_r40 = (user_growth + user_margin) * 100
            
            # Find period with closest revenue
            closest_stage = min(stages, key=lambda s: abs(math.log(max(1.0, s['revenue'] or 1.0)) - math.log(max(1.0, user_rev))))
            
            sm_gap_pp = round(((user_sm) - (closest_stage['sales_marketing_ratio'] or user_sm)) * 100, 1)
            rd_gap_pp = round(((user_rd) - (closest_stage['rd_ratio'] or user_rd)) * 100, 1)
            growth_gap_pp = round(((user_growth) - (closest_stage['growth'] or user_growth)) * 100, 1)
            margin_gap_pp = round(((user_margin) - (closest_stage['operating_margin'] or user_margin)) * 100, 1)
            
            comp_sm = closest_stage['sales_marketing_ratio'] or 0.4
            
            # Narrative contrast
            if user_sm < comp_sm - 0.10:
                posture = f"Your strategy is significantly more capital-efficient than {company_name} was at {_money(closest_stage['revenue'])} ARR. {company_name} ran a heavier S&M burn ({_pct(comp_sm)}) to maximize market capture, whereas you are conserving cash."
            elif user_sm > comp_sm + 0.10:
                posture = f"You are planning a more aggressive go-to-market reinvestment ({_pct(user_sm)} S&M) than {company_name} deployed at this revenue level ({_pct(comp_sm)} S&M)."
            else:
                posture = f"Your S&M allocation ({_pct(user_sm)}) closely mirrors {company_name}'s actual execution ratio ({_pct(comp_sm)}) during their {closest_stage['year']} expansion phase."
            
            comparison = {
                'benchmark_company': company_name,
                'benchmark_stage': closest_stage['year'],
                'benchmark_revenue': closest_stage['revenue_formatted'],
                'posture_summary': posture,
                'metrics': {
                    'sales_marketing': {'user': _pct(user_sm), 'company': closest_stage['sales_marketing_formatted'], 'gap_pp': sm_gap_pp},
                    'rd_ratio': {'user': _pct(user_rd), 'company': closest_stage['rd_formatted'], 'gap_pp': rd_gap_pp},
                    'growth': {'user': _pct(user_growth), 'company': closest_stage['growth_formatted'], 'gap_pp': growth_gap_pp},
                    'operating_margin': {'user': _pct(user_margin), 'company': closest_stage['operating_margin_formatted'], 'gap_pp': margin_gap_pp},
                    'rule_of_40': {'user': round(user_r40, 1), 'company': closest_stage['rule_of_40'], 'gap': round(user_r40 - (closest_stage['rule_of_40'] or 0), 1)}
                },
                'adopt_lever_payload': closest_stage['copy_payload']
            }
        
        return {
            'company': {
                'id': cid,
                'ticker': ticker,
                'name': company_name,
            },
            'stages_count': len(stages),
            'stages': stages,
            'mermaid_code': mermaid_code,
            'comparison': comparison
        }
