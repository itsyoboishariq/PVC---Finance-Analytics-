import React from 'react';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { DollarSign, Users, TrendingUp, Percent, ArrowUpRight, ArrowDownRight, Layers, HelpCircle } from 'lucide-react';

/**
 * KPI Cards component – redesigned for better spacing, hierarchy and responsive layout.
 *
 * Layout highlights:
 *   • Responsive grid – 3 columns on wide screens, 2 on medium, 1 on small.
 *   • Card padding increased to 24 px and a minimum height of 200 px for visual consistency.
 *   • Metric values use a larger font (≈1.9 rem) and are kept from overflowing.
 *   • Header, value and baseline comparison are separated into distinct sections.
 *   • Existing functionality (cell inspection, colour coding, baseline diff) remains unchanged.
 */
export default function KPICards({ summaryKPIs, baselineKPIs, weightedArpu, baselineWeightedArpu, onInspectCell }) {
  if (!summaryKPIs) return null;

  // A real ARPU of $0 is valid and must show as $0.00; only a missing or
  // non-numeric value (null, undefined, NaN, Infinity) shows as N/A.
  const arpuAvailable = Number.isFinite(weightedArpu);

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
      title: 'Total Customer-Months',
      value: formatNumber(summaryKPIs.total_customers_sum, 0),
      rawVal: summaryKPIs.total_customers_sum,
      baseVal: baselineKPIs?.total_customers_sum,
      format: (v) => formatNumber(v, 0),
      icon: Users,
      color: '#10b981',
      cellRef: 'Financial Model !N4',
      formula: '=SUM(C28:Y28)',
      description: 'Each month\'s active customers added up across all 23 months (one customer active for 3 months counts as 3). This is not the number of unique customers.'
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
      value: arpuAvailable ? formatCurrency(weightedArpu, 2) : 'N/A',
      rawVal: arpuAvailable ? weightedArpu : null,
      // Compare against the workbook baseline's own ARPU rather than a hardcoded number.
      baseVal: Number.isFinite(baselineWeightedArpu) ? baselineWeightedArpu : undefined,
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

  // Grid container – responsive three‑column layout.
  const gridStyle = {
    display: 'grid',
    // 300 px minimum per card yields 3 columns on ≥900 px, 2 columns on ≥600 px, otherwise 1.
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  };

  const cardStyle = {
    padding: '24px',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    background: 'var(--card-bg, rgba(255,255,255,0.02))', // fallback for glass‑panel effect
    borderRadius: '8px'
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px'
  };

  const titleStyle = {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: 500
  };

  const valueContainerStyle = {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginTop: '4px',
    marginBottom: '8px'
  };

  const valueStyle = {
    fontSize: '1.9rem', // ~2 rem for prominence
    fontWeight: 700,
    color: undefined // will be set per card
  };

  const deltaStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem'
  };

  return (
    <div style={gridStyle}>
      {cards.map((card, i) => {
        const hasValue = Number.isFinite(card.rawVal);
        const diff = hasValue && card.baseVal !== undefined ? card.rawVal - card.baseVal : 0;
        const diffPct = card.baseVal ? (diff / card.baseVal) * 100 : 0;
        const isModified = Math.abs(diff) > 1e-4;
        return (
          <div key={i} className="glass-panel" style={cardStyle}>
            {/* Header – title and cell badge */}
            <div style={headerStyle}>
              <span style={titleStyle}>{card.title}</span>
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

            {/* KPI value */}
            <div style={valueContainerStyle}>
              <span className="num-val" style={{ ...valueStyle, color: card.color }}>
                {card.value}
              </span>
            </div>

            {/* Delta vs baseline */}
            <div style={deltaStyle}>
              {!hasValue ? (
                <span style={{ color: '#9ca3af' }}>No value available</span>
              ) : isModified ? (
                <>
                  <span style={{ color: diff >= 0 ? '#34d399' : '#fb7185', display: 'inline-flex', alignItems: 'center', fontWeight: 600 }}>
                    {diff >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {diff >= 0 ? '+' : ''}{card.format(diff)} ({diffPct.toFixed(1)}%)
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>vs workbook</span>
                </>
              ) : (
                <span style={{ color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
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
