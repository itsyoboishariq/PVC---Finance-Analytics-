import React, { useState } from 'react';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { ChevronDown, ChevronRight, HelpCircle, Calendar, Table as TableIcon } from 'lucide-react';

export default function FinancialTableView({ monthlyResults, annualRollups, summaryKPIs, onInspectCell }) {
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'annual'
  const [expandedSections, setExpandedSections] = useState({
    funnel: true,
    waterfall: true,
    breakdown: true,
    revenue: true,
    cogs: true,
    opex: true,
    ebit: true
  });

  const toggleSection = (sec) => {
    setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  if (!monthlyResults || monthlyResults.length === 0) return null;

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Financial Model Statement & Statement of Operations
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Full multi-period financial model replicating sheet <code>'Financial Model '</code> row-by-row
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', gap: '4px' }}>
          <button
            onClick={() => setViewMode('monthly')}
            style={{
              background: viewMode === 'monthly' ? '#2563eb' : 'transparent',
              color: viewMode === 'monthly' ? '#fff' : '#9ca3af',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <TableIcon size={14} />
            23 Monthly Periods (Jul '26 – May '28)
          </button>
          <button
            onClick={() => setViewMode('annual')}
            style={{
              background: viewMode === 'annual' ? '#2563eb' : 'transparent',
              color: viewMode === 'annual' ? '#fff' : '#9ca3af',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={14} />
            Annual & Period Rollups
          </button>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        <div className="model-table-container">
          <table className="model-table">
            <thead>
              <tr>
                <th>Line Item</th>
                <th style={{ textAlign: 'center', minWidth: '90px' }}>Ref / Formula</th>
                {monthlyResults.map((m) => (
                  <th key={m.column}>
                    <div>{m.label}</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 'normal' }}>Col {m.column}</div>
                  </th>
                ))}
                <th style={{ background: '#1e293b', color: '#60a5fa', fontWeight: 700, minWidth: '110px' }}>
                  Total / Horizon
                </th>
              </tr>
            </thead>
            <tbody>
              {/* SECTION: ACQUISITION FUNNEL */}
              <tr style={{ background: 'rgba(59, 130, 246, 0.08)', cursor: 'pointer' }} onClick={() => toggleSection('funnel')}>
                <td colSpan={monthlyResults.length + 3} style={{ fontWeight: 700, color: '#93c5fd', padding: '6px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {expandedSections.funnel ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Acquisition Funnel
                  </span>
                </td>
              </tr>
              {expandedSections.funnel && (
                <>
                  <ModelRow
                    title="Leads Generated"
                    cellRef="Row 20"
                    formula="C20: ='Lead Generation '!$H$4"
                    values={monthlyResults.map(m => m.leads_generated)}
                    format={v => formatNumber(v, 0)}
                    totalVal={formatNumber(summaryKPIs?.total_leads_generated, 0)}
                    onInspectCell={onInspectCell}
                    metaKey="leads_generated"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Lead → Trial Conversion"
                    cellRef="Row 21"
                    formula="='Assumptions  '!$B$19"
                    values={monthlyResults.map(m => m.lead_to_trial_conversion)}
                    format={v => formatPercent(v, 1)}
                    totalVal="20.0% avg"
                    onInspectCell={onInspectCell}
                    metaKey="lead_to_trial_conversion"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Trials Started"
                    cellRef="Row 22"
                    formula="=Col20*Col21"
                    values={monthlyResults.map(m => m.trials_started)}
                    format={v => formatNumber(v, 1)}
                    totalVal={formatNumber(monthlyResults.reduce((a, b) => a + b.trials_started, 0), 1)}
                    onInspectCell={onInspectCell}
                    metaKey="trials_started"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Trial → Paid Conversion"
                    cellRef="Row 23"
                    formula="='Assumptions  '!$B$20"
                    values={monthlyResults.map(m => m.trial_to_paid_conversion)}
                    format={v => formatPercent(v, 1)}
                    totalVal="5.0% avg"
                    onInspectCell={onInspectCell}
                    metaKey="trial_to_paid_conversion"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="New Paid Customers"
                    cellRef="Row 24"
                    formula="=ROUNDUP(Col22*Col23, 0)"
                    values={monthlyResults.map(m => m.new_paid_customers)}
                    format={v => formatNumber(v, 0)}
                    totalVal={formatNumber(summaryKPIs?.total_new_paid_customers, 0)}
                    highlight
                    onInspectCell={onInspectCell}
                    metaKey="new_paid_customers"
                    monthlyResults={monthlyResults}
                  />
                </>
              )}

              {/* SECTION: CUSTOMER WATERFALL */}
              <tr style={{ background: 'rgba(16, 185, 129, 0.08)', cursor: 'pointer' }} onClick={() => toggleSection('waterfall')}>
                <td colSpan={monthlyResults.length + 3} style={{ fontWeight: 700, color: '#6ee7b7', padding: '6px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {expandedSections.waterfall ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Customer Waterfall
                  </span>
                </td>
              </tr>
              {expandedSections.waterfall && (
                <>
                  <ModelRow
                    title="Beginning Active Customers"
                    cellRef="Row 25"
                    formula="M1: B3 (10); M2+: Prev Ending"
                    values={monthlyResults.map(m => m.beginning_active_customers)}
                    format={v => formatNumber(v, 0)}
                    totalVal="—"
                    onInspectCell={onInspectCell}
                    metaKey="beginning_active_customers"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Monthly Churn Rate"
                    cellRef="Row 26"
                    formula="='Assumptions  '!$B$5"
                    values={monthlyResults.map(m => m.monthly_churn_rate)}
                    format={v => formatPercent(v, 1)}
                    totalVal="3.0% avg"
                    onInspectCell={onInspectCell}
                    metaKey="monthly_churn_rate"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="(-) Churned Customers"
                    cellRef="Row 27"
                    formula="=ROUNDUP(SUM(Col25:Col25)*Col26, 0)"
                    values={monthlyResults.map(m => m.churned_customers)}
                    format={v => `(${formatNumber(v, 0)})`}
                    totalVal={`(${formatNumber(monthlyResults.reduce((a, b) => a + b.churned_customers, 0), 0)})`}
                    onInspectCell={onInspectCell}
                    metaKey="churned_customers"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Ending Active Customers"
                    cellRef="Row 28"
                    formula="M1: Beg - Churn; M2+: New + Beg - Churn"
                    values={monthlyResults.map(m => m.ending_active_customers)}
                    format={v => formatNumber(v, 0)}
                    totalVal={`${formatNumber(summaryKPIs?.total_customers_sum, 0)} (N4)`}
                    highlight
                    onInspectCell={onInspectCell}
                    metaKey="ending_active_customers"
                    monthlyResults={monthlyResults}
                  />
                </>
              )}

              {/* SECTION: CUSTOMER BREAKDOWN */}
              <tr style={{ background: 'rgba(139, 92, 246, 0.08)', cursor: 'pointer' }} onClick={() => toggleSection('breakdown')}>
                <td colSpan={monthlyResults.length + 3} style={{ fontWeight: 700, color: '#c4b5fd', padding: '6px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {expandedSections.breakdown ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Customer Breakdown by Pricing Tier
                  </span>
                </td>
              </tr>
              {expandedSections.breakdown && (
                <>
                  <ModelRow
                    title="Trial Tier Customers (60%)"
                    cellRef="Row 29"
                    formula="=ROUND(Col28*Assumptions!C12, 1)"
                    values={monthlyResults.map(m => m.trial_tier_customers)}
                    format={v => formatNumber(v, 1)}
                    totalVal={formatNumber(monthlyResults.reduce((a, b) => a + b.trial_tier_customers, 0), 1)}
                    onInspectCell={onInspectCell}
                    metaKey="trial_tier_customers"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Pro Tier Customers (30%)"
                    cellRef="Row 30"
                    formula="=ROUND(Col28*Assumptions!C13, 1)"
                    values={monthlyResults.map(m => m.pro_tier_customers)}
                    format={v => formatNumber(v, 1)}
                    totalVal={formatNumber(monthlyResults.reduce((a, b) => a + b.pro_tier_customers, 0), 1)}
                    onInspectCell={onInspectCell}
                    metaKey="pro_tier_customers"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Enterprise Tier Customers (10%)"
                    cellRef="Row 31"
                    formula="=ROUND(Col28*Assumptions!C14, 1)"
                    values={monthlyResults.map(m => m.enterprise_tier_customers)}
                    format={v => formatNumber(v, 1)}
                    totalVal={formatNumber(monthlyResults.reduce((a, b) => a + b.enterprise_tier_customers, 0), 1)}
                    onInspectCell={onInspectCell}
                    metaKey="enterprise_tier_customers"
                    monthlyResults={monthlyResults}
                  />
                </>
              )}

              {/* SECTION: REVENUE BUILD (MRR) */}
              <tr style={{ background: 'rgba(59, 130, 246, 0.12)', cursor: 'pointer' }} onClick={() => toggleSection('revenue')}>
                <td colSpan={monthlyResults.length + 3} style={{ fontWeight: 700, color: '#60a5fa', padding: '6px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {expandedSections.revenue ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Revenue Build (MRR)
                  </span>
                </td>
              </tr>
              {expandedSections.revenue && (
                <>
                  <ModelRow
                    title="Basic / Trial Plan Revenue"
                    cellRef="Row 32"
                    formula="=Assumptions!B12*Col29 ($0)"
                    values={monthlyResults.map(m => m.basic_plan_revenue)}
                    format={v => formatCurrency(v, 0)}
                    totalVal="$0"
                    onInspectCell={onInspectCell}
                    metaKey="basic_plan_revenue"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Pro Plan Revenue ($20/mo)"
                    cellRef="Row 33"
                    formula="=Col30*Assumptions!B13"
                    values={monthlyResults.map(m => m.pro_plan_revenue)}
                    format={v => formatCurrency(v, 0)}
                    totalVal={formatCurrency(monthlyResults.reduce((a, b) => a + b.pro_plan_revenue, 0), 0)}
                    onInspectCell={onInspectCell}
                    metaKey="pro_plan_revenue"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Enterprise Plan Revenue ($80/mo)"
                    cellRef="Row 34"
                    formula="=Assumptions!B14*Col31"
                    values={monthlyResults.map(m => m.enterprise_plan_revenue)}
                    format={v => formatCurrency(v, 0)}
                    totalVal={formatCurrency(monthlyResults.reduce((a, b) => a + b.enterprise_plan_revenue, 0), 0)}
                    onInspectCell={onInspectCell}
                    metaKey="enterprise_plan_revenue"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Total MRR"
                    cellRef="Row 35"
                    formula="=SUM(Col32:Col34)"
                    values={monthlyResults.map(m => m.total_mrr)}
                    format={v => formatCurrency(v, 0)}
                    totalVal={`${formatCurrency(summaryKPIs?.total_revenue_sum, 0)} (N10)`}
                    highlight
                    isBold
                    onInspectCell={onInspectCell}
                    metaKey="total_mrr"
                    monthlyResults={monthlyResults}
                  />
                </>
              )}

              {/* SECTION: COGS */}
              <tr style={{ background: 'rgba(245, 158, 11, 0.08)', cursor: 'pointer' }} onClick={() => toggleSection('cogs')}>
                <td colSpan={monthlyResults.length + 3} style={{ fontWeight: 700, color: '#fcd34d', padding: '6px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {expandedSections.cogs ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Cost of Goods Sold (COGS)
                  </span>
                </td>
              </tr>
              {expandedSections.cogs && (
                <>
                  <ModelRow
                    title="Cloud Hosting (Fixed)"
                    cellRef="Row 37"
                    formula="$45/mo flat"
                    values={monthlyResults.map(m => m.cloud_hosting)}
                    format={v => formatCurrency(v, 0)}
                    totalVal={formatCurrency(monthlyResults.reduce((a, b) => a + b.cloud_hosting, 0), 0)}
                    onInspectCell={onInspectCell}
                    metaKey="cloud_hosting"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Payment Processing (2.9%)"
                    cellRef="Row 38"
                    formula="=0.029*Col35"
                    values={monthlyResults.map(m => m.payment_processing)}
                    format={v => formatCurrency(v, 2)}
                    totalVal={formatCurrency(monthlyResults.reduce((a, b) => a + b.payment_processing, 0), 2)}
                    onInspectCell={onInspectCell}
                    metaKey="payment_processing"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Third-Party APIs ($1/cust)"
                    cellRef="Row 39"
                    formula="=1*Col28"
                    values={monthlyResults.map(m => m.third_party_apis)}
                    format={v => formatCurrency(v, 0)}
                    totalVal={formatCurrency(monthlyResults.reduce((a, b) => a + b.third_party_apis, 0), 0)}
                    onInspectCell={onInspectCell}
                    metaKey="third_party_apis"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Other Direct Costs ($1/trial)"
                    cellRef="Row 40"
                    formula="=1*Col29"
                    values={monthlyResults.map(m => m.other_direct_costs)}
                    format={v => formatCurrency(v, 2)}
                    totalVal={formatCurrency(monthlyResults.reduce((a, b) => a + b.other_direct_costs, 0), 2)}
                    onInspectCell={onInspectCell}
                    metaKey="other_direct_costs"
                    monthlyResults={monthlyResults}
                  />
                  <ModelRow
                    title="Total COGS"
                    cellRef="Row 41"
                    formula="=SUM(Col37:Col40)"
                    values={monthlyResults.map(m => m.total_cogs)}
                    format={v => formatCurrency(v, 2)}
                    totalVal={formatCurrency(summaryKPIs?.total_cogs_sum, 2)}
                    highlight
                    onInspectCell={onInspectCell}
                    metaKey="total_cogs"
                    monthlyResults={monthlyResults}
                  />
                </>
              )}

              {/* SECTION: OPEX */}
              <tr style={{ background: 'rgba(239, 68, 68, 0.08)', cursor: 'pointer' }} onClick={() => toggleSection('opex')}>
                <td colSpan={monthlyResults.length + 3} style={{ fontWeight: 700, color: '#fca5a5', padding: '6px 12px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {expandedSections.opex ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Operating Expenses (OPEX)
                  </span>
                </td>
              </tr>
              {expandedSections.opex && (
                <>
                  <ModelRow
                    title="Total OPEX (11 categories)"
                    cellRef="Row 53"
                    formula="=SUM(Col42:Col52)"
                    values={monthlyResults.map(m => m.total_opex)}
                    format={v => formatCurrency(v, 0)}
                    totalVal={formatCurrency(summaryKPIs?.total_opex_sum, 0)}
                    highlight
                    onInspectCell={onInspectCell}
                    metaKey="total_opex"
                    monthlyResults={monthlyResults}
                  />
                </>
              )}

              {/* SECTION: EBIT */}
              <tr className="total-row" style={{ background: 'rgba(52, 211, 153, 0.12)' }}>
                <td style={{ fontWeight: 700, color: '#34d399', fontSize: '0.95rem' }}>
                  EBIT (Operating Profit)
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="cell-badge"
                    onClick={() => onInspectCell({
                      cell: 'Financial Model !Row 56',
                      name: 'EBIT',
                      formula: '=Col35-Col41-Col53',
                      description: 'Earnings Before Interest and Taxes (MRR - COGS - OPEX)'
                    })}
                  >
                    Row 56
                  </button>
                </td>
                {monthlyResults.map((m) => (
                  <td key={m.column} className="num-val" style={{ fontWeight: 700, color: m.ebit >= 0 ? '#34d399' : '#fb7185' }}>
                    {formatCurrency(m.ebit, 2)}
                  </td>
                ))}
                <td className="num-val" style={{ fontWeight: 800, color: (summaryKPIs?.total_ebit_sum || 0) >= 0 ? '#34d399' : '#fb7185', background: '#1e293b' }}>
                  {formatCurrency(summaryKPIs?.total_ebit_sum, 2)} (S9)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        /* ANNUAL & PERIOD ROLLUP VIEW */
        <div className="model-table-container">
          <table className="model-table">
            <thead>
              <tr>
                <th>Rollup Period</th>
                <th>Months Included</th>
                <th>Total Revenue</th>
                <th>Total COGS</th>
                <th>Gross Profit</th>
                <th>Total OPEX</th>
                <th>EBIT</th>
                <th>Ending Customers</th>
                <th>Leads Generated</th>
                <th>New Paid Customers</th>
              </tr>
            </thead>
            <tbody>
              {annualRollups.map((r, i) => (
                <tr key={i} className={r.period_name.includes('Total') ? 'total-row' : ''}>
                  <td style={{ fontWeight: 600, color: r.period_name.includes('Total') ? '#60a5fa' : 'var(--text-primary)' }}>
                    {r.period_name}
                  </td>
                  <td style={{ textAlign: 'center', color: '#9ca3af', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {r.months_included[0]} → {r.months_included[r.months_included.length - 1]} ({r.months_included.length} mo)
                  </td>
                  <td className="num-val" style={{ fontWeight: 600 }}>{formatCurrency(r.total_revenue, 0)}</td>
                  <td className="num-val">{formatCurrency(r.total_cogs, 0)}</td>
                  <td className="num-val" style={{ color: '#34d399' }}>{formatCurrency(r.gross_profit, 0)}</td>
                  <td className="num-val">{formatCurrency(r.total_opex, 0)}</td>
                  <td className="num-val" style={{ fontWeight: 700, color: r.ebit >= 0 ? '#34d399' : '#fb7185' }}>
                    {formatCurrency(r.ebit, 0)}
                  </td>
                  <td className="num-val" style={{ fontWeight: 600 }}>{r.ending_customers}</td>
                  <td className="num-val">{formatNumber(r.leads_generated, 0)}</td>
                  <td className="num-val">{formatNumber(r.new_paid_customers, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ModelRow({ title, cellRef, formula, values, format, totalVal, highlight, isBold, onInspectCell, metaKey, monthlyResults }) {
  return (
    <tr style={{ background: highlight ? 'rgba(255, 255, 255, 0.02)' : 'transparent' }}>
      <td style={{ fontWeight: isBold ? 700 : 500, color: isBold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {title}
      </td>
      <td style={{ textAlign: 'center' }}>
        <button
          className="cell-badge"
          onClick={() => {
            const firstMeta = monthlyResults[0]?.metadata?.[metaKey];
            onInspectCell({
              cell: firstMeta ? `${firstMeta.sheet}!${cellRef}` : cellRef,
              name: title,
              formula: firstMeta?.formula || formula,
              unit: firstMeta?.unit,
              description: `Model line item: ${title}`
            });
          }}
        >
          {cellRef}
        </button>
      </td>
      {values.map((v, i) => (
        <td key={i} className="num-val" style={{ fontWeight: isBold ? 700 : 'normal' }}>
          {format(v)}
        </td>
      ))}
      <td className="num-val" style={{ fontWeight: 700, color: isBold ? '#60a5fa' : 'var(--text-primary)', background: '#1a2333' }}>
        {totalVal}
      </td>
    </tr>
  );
}
