import React from 'react';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { ArrowUpRight, ArrowDownRight, GitCompare, Check } from 'lucide-react';

export default function ScenarioComparisonView({ activeResults, baselineResults, activeAssumptions, baselineAssumptions }) {
  if (!activeResults || !baselineResults) return null;

  const activeKpis = activeResults.summary_kpis;
  const baseKpis = baselineResults.summary_kpis;

  const metrics = [
    {
      label: 'Total Cumulative Revenue (N10)',
      active: activeKpis.total_revenue_sum,
      base: baseKpis.total_revenue_sum,
      format: v => formatCurrency(v, 0),
      isHigherBetter: true
    },
    {
      label: 'Total Cumulative EBIT (S9)',
      active: activeKpis.total_ebit_sum,
      base: baseKpis.total_ebit_sum,
      format: v => formatCurrency(v, 0),
      isHigherBetter: true
    },
    {
      label: 'Total Customers Sum (N4)',
      active: activeKpis.total_customers_sum,
      base: baseKpis.total_customers_sum,
      format: v => formatNumber(v, 0),
      isHigherBetter: true
    },
    {
      label: 'Ending Active Customers (Month 23)',
      active: activeKpis.ending_active_customers_final,
      base: baseKpis.ending_active_customers_final,
      format: v => formatNumber(v, 0),
      isHigherBetter: true
    },
    {
      label: 'Total Lifetime COGS',
      active: activeKpis.total_cogs_sum,
      base: baseKpis.total_cogs_sum,
      format: v => formatCurrency(v, 0),
      isHigherBetter: false
    },
    {
      label: 'Overall Gross Margin',
      active: activeKpis.overall_gross_margin_pct,
      base: baseKpis.overall_gross_margin_pct,
      format: v => formatPercent(v, 1),
      isHigherBetter: true
    },
    {
      label: 'Total New Paid Customers Acquired',
      active: activeKpis.total_new_paid_customers,
      base: baseKpis.total_new_paid_customers,
      format: v => formatNumber(v, 0),
      isHigherBetter: true
    },
    {
      label: 'Lead to Trial Conversion Rate',
      active: activeAssumptions.lead_to_trial_conversion,
      base: baselineAssumptions.lead_to_trial_conversion,
      format: v => formatPercent(v, 1),
      isHigherBetter: true
    },
    {
      label: 'Trial to Paid Conversion Rate',
      active: activeAssumptions.trial_to_paid_conversion,
      base: baselineAssumptions.trial_to_paid_conversion,
      format: v => formatPercent(v, 1),
      isHigherBetter: true
    },
    {
      label: 'Monthly Churn Rate',
      active: activeAssumptions.monthly_churn,
      base: baselineAssumptions.monthly_churn,
      format: v => formatPercent(v, 1),
      isHigherBetter: false
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <GitCompare size={18} color="#60a5fa" />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Scenario Comparison: Current Scenario vs Workbook Baseline
        </h3>
      </div>

      <div className="model-table-container">
        <table className="model-table">
          <thead>
            <tr>
              <th>Metric / Financial Indicator</th>
              <th>Workbook Baseline (Default)</th>
              <th>Active Scenario</th>
              <th>Dollar / Absolute Variance</th>
              <th>Percentage Change</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m, i) => {
              const diff = m.active - m.base;
              const diffPct = m.base !== 0 ? (diff / Math.abs(m.base)) * 100 : 0;
              const isDifferent = Math.abs(diff) > 1e-4;
              const isPositive = m.isHigherBetter ? diff > 0 : diff < 0;

              return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{m.label}</td>
                  <td className="num-val" style={{ color: 'var(--text-secondary)' }}>
                    {m.format(m.base)}
                  </td>
                  <td className="num-val" style={{ fontWeight: 700, color: isDifferent ? '#60a5fa' : 'var(--text-primary)' }}>
                    {m.format(m.active)}
                  </td>
                  <td className="num-val" style={{ fontWeight: 600 }}>
                    {isDifferent ? (
                      <span style={{ color: isPositive ? '#34d399' : '#fb7185', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {diff >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {diff >= 0 ? '+' : ''}{m.format(diff)}
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>— (0.00)</span>
                    )}
                  </td>
                  <td className="num-val" style={{ fontWeight: 600 }}>
                    {isDifferent ? (
                      <span style={{ color: isPositive ? '#34d399' : '#fb7185' }}>
                        {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%
                      </span>
                    ) : (
                      <span style={{ color: '#6b7280' }}>0.0%</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
