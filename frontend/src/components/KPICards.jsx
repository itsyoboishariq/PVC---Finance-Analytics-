import React from 'react';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { DollarSign, Users, TrendingUp, Percent, ArrowUpRight, ArrowDownRight, Layers, HelpCircle } from 'lucide-react';

export default function KPICards({ summaryKPIs, baselineKPIs, weightedArpu, onInspectCell }) {
  if (!summaryKPIs) return null;

  const cards = [
    {
      title: 'Total Revenue',
      value: formatCurrency(summaryKPIs.total_revenue_sum, 0),
      rawVal: summaryKPIs.total_revenue_sum,
      baseVal: baselineKPIs?.total_revenue_sum,
      format: (v) => formatCurrency(v, 0),
      icon: DollarSign,
      color: '#3b82f6',
      cellRef: 'Financial Model !N10',
      formula: '=SUM(C35:Y35)',
      description: 'Sum of all monthly MRR across all 23 periods (Jul 2026 – May 2028).'
    },
    {
      title: 'Total Customers (Sum)',
      value: formatNumber(summaryKPIs.total_customers_sum, 0),
      rawVal: summaryKPIs.total_customers_sum,
      baseVal: baselineKPIs?.total_customers_sum,
      format: (v) => formatNumber(v, 0),
      icon: Users,
      color: '#10b981',
      cellRef: 'Financial Model !N4',
      formula: '=SUM(C28:Y28)',
      description: 'Cumulative active customer-months across all 23 periods.'
    },
    {
      title: 'Total EBIT',
      value: formatCurrency(summaryKPIs.total_ebit_sum, 0),
      rawVal: summaryKPIs.total_ebit_sum,
      baseVal: baselineKPIs?.total_ebit_sum,
      format: (v) => formatCurrency(v, 0),
      icon: TrendingUp,
      color: summaryKPIs.total_ebit_sum >= 0 ? '#34d399' : '#fb7185',
      cellRef: 'Financial Model !S9',
      formula: '=SUM(C56:Y56)',
      description: 'Cumulative operating earnings (EBIT) across the full 23-month horizon.'
    },
    {
      title: 'Weighted ARPU',
      value: formatCurrency(weightedArpu || 14.0, 2),
      rawVal: weightedArpu || 14.0,
      baseVal: 14.0,
      format: (v) => formatCurrency(v, 2),
      icon: Layers,
      color: '#8b5cf6',
      cellRef: 'Assumptions !B8',
      formula: '=(B12*C12)+(B13*C13)+(B14*C14)',
      description: 'Average revenue per user weighted across Trial ($0), Pro ($20), and Enterprise ($80).'
    },
    {
      title: 'Overall Gross Margin',
      value: formatPercent(summaryKPIs.overall_gross_margin_pct, 1),
      rawVal: summaryKPIs.overall_gross_margin_pct,
      baseVal: baselineKPIs?.overall_gross_margin_pct,
      format: (v) => formatPercent(v, 1),
      icon: Percent,
      color: '#06b6d4',
      cellRef: 'COGS vs MRR',
      formula: '=(Revenue - COGS) / Revenue',
      description: 'Gross profit percentage over total model lifetime.'
    },
    {
      title: 'Ending Active Customers',
      value: formatNumber(summaryKPIs.ending_active_customers_final, 0),
      rawVal: summaryKPIs.ending_active_customers_final,
      baseVal: baselineKPIs?.ending_active_customers_final,
      format: (v) => formatNumber(v, 0),
      icon: Users,
      color: '#f59e0b',
      cellRef: 'Financial Model !Y28',
      formula: '=SUM(Y24:Y25)-Y27',
      description: 'Active paying customer base at Month 23 (May 2028).'
    }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
      {cards.map((card, i) => {
        const diff = card.baseVal !== undefined ? card.rawVal - card.baseVal : 0;
        const diffPct = card.baseVal ? (diff / card.baseVal) * 100 : 0;
        const isModified = Math.abs(diff) > 1e-4;

        return (
          <div key={i} className="glass-panel" style={{ padding: '16px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {card.title}
              </span>
              <button
                className="cell-badge"
                title={`Inspect Excel Cell: ${card.cellRef}`}
                onClick={() => onInspectCell({
                  cell: card.cellRef,
                  name: card.title,
                  formula: card.formula,
                  value: card.value,
                  description: card.description
                })}
              >
                <span>{card.cellRef}</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
              <span className="num-val" style={{ fontSize: '1.6rem', fontWeight: 700, color: card.color }}>
                {card.value}
              </span>
            </div>

            {/* Delta vs Excel Baseline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem' }}>
              {isModified ? (
                <>
                  <span style={{ color: diff >= 0 ? '#34d399' : '#fb7185', display: 'inline-flex', alignItems: 'center', fontWeight: 600 }}>
                    {diff >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {diff >= 0 ? '+' : ''}{card.format(diff)} ({diffPct.toFixed(1)}%)
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>vs workbook</span>
                </>
              ) : (
                <span style={{ color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                  Matches Excel Baseline
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
