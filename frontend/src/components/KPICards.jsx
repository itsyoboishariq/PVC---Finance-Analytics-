import React from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { ArrowUpRight, ArrowDownRight, FileSpreadsheet, CheckCircle2, PencilLine, TrendingUp, AlertTriangle } from 'lucide-react';

/**
 * KPI summary, laid out by importance:
 *   1. One hero figure: cumulative EBIT, with the first profitable month.
 *   2. Two primary tiles: total revenue and ending active customers, each with
 *      a 23-month trend line.
 *   3. A quieter row of supporting metrics.
 * Whether the numbers match the Excel workbook is stated once, in the header,
 * and each tile only shows a change when it differs from the workbook.
 */
export default function KPICards({
  summaryKPIs,
  baselineKPIs,
  weightedArpu,
  baselineWeightedArpu,
  monthlyResults = [],
  onInspectCell
}) {
  if (!summaryKPIs) return null;

  const arpuAvailable = Number.isFinite(weightedArpu);
  const months = monthlyResults || [];

  // First month with non-negative EBIT (break-even).
  const firstProfitableIdx = months.findIndex(m => m.ebit >= 0);
  const firstProfitable = firstProfitableIdx >= 0 ? months[firstProfitableIdx] : null;

  const metrics = {
    ebit: {
      title: 'Cumulative EBIT (23 months)',
      value: summaryKPIs.total_ebit_sum,
      base: baselineKPIs?.total_ebit_sum,
      format: v => formatCurrency(v, 0),
      higherIsBetter: true,
      cellRef: 'Financial Model !S9',
      formula: '=SUM(C56:Y56)',
      description: 'Operating profit (revenue minus COGS and OPEX) added up across all 23 months.'
    },
    revenue: {
      title: 'Total revenue',
      value: summaryKPIs.total_revenue_sum,
      base: baselineKPIs?.total_revenue_sum,
      format: v => formatCurrency(v, 0),
      higherIsBetter: true,
      cellRef: 'Financial Model !N10',
      formula: '=SUM(C35:Y35)',
      description: 'All monthly revenue added up across the 23-month forecast (Jul 2026 – May 2028).',
      trend: months.map(m => m.total_mrr),
      trendLabel: 'Monthly revenue'
    },
    customers: {
      title: 'Active customers at month 23',
      value: summaryKPIs.ending_active_customers_final,
      base: baselineKPIs?.ending_active_customers_final,
      format: v => formatNumber(v, 0),
      higherIsBetter: true,
      cellRef: 'Financial Model !Y28',
      formula: '=SUM(Y24:Y25)-Y27',
      description: 'Paying customers at the end of the forecast (May 2028).',
      trend: months.map(m => m.ending_active_customers),
      trendLabel: 'Active customers'
    },
    arpu: {
      title: 'Weighted ARPU',
      value: arpuAvailable ? weightedArpu : null,
      base: Number.isFinite(baselineWeightedArpu) ? baselineWeightedArpu : undefined,
      format: v => formatCurrency(v, 2),
      higherIsBetter: true,
      cellRef: 'Assumptions !B8',
      formula: '=(B12*C12)+(B13*C13)+(B14*C14)',
      description: 'Average monthly price per customer, weighted by how many customers are on each tier.'
    },
    margin: {
      title: 'Gross margin',
      value: summaryKPIs.overall_gross_margin_pct,
      base: baselineKPIs?.overall_gross_margin_pct,
      // Engine returns this already in percent (e.g. 74.6), so don't rescale it.
      format: v => `${v.toFixed(1)}%`,
      deltaFormat: v => `${Math.abs(v).toFixed(1)} pts`,
      higherIsBetter: true,
      cellRef: 'COGS vs MRR',
      formula: '=(Revenue - COGS) / Revenue',
      description: 'Share of revenue left after direct costs, over the whole forecast.'
    },
    customerMonths: {
      title: 'Customer-months',
      value: summaryKPIs.total_customers_sum,
      base: baselineKPIs?.total_customers_sum,
      format: v => formatNumber(v, 0),
      higherIsBetter: true,
      cellRef: 'Financial Model !N4',
      formula: '=SUM(C28:Y28)',
      description: "Each month's active customers added up across all 23 months (one customer active for 3 months counts as 3). Not a count of unique customers."
    }
  };

  const anyChanged = Object.values(metrics).some(m => isChanged(m));

  return (
    <section aria-label="Key metrics" style={{ marginBottom: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        {anyChanged ? (
          <>
            <PencilLine size={14} aria-hidden="true" />
            Edited: changes are shown against the Excel workbook
          </>
        ) : (
          <>
            <CheckCircle2 size={14} color="var(--delta-good)" aria-hidden="true" />
            All figures match the Excel workbook
          </>
        )}
      </div>

      <div className="kpi-primary-grid">
        {/* Hero: cumulative EBIT */}
        <div className="glass-panel kpi-hero">
          <TileHeader metric={metrics.ebit} onInspectCell={onInspectCell} />
          <div className="kpi-hero-value">{metrics.ebit.format(metrics.ebit.value)}</div>
          <Delta metric={metrics.ebit} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {firstProfitable ? (
              <>
                <TrendingUp size={15} color="var(--delta-good)" aria-hidden="true" />
                <span>
                  First profitable month: <strong style={{ color: 'var(--text-primary)' }}>M{firstProfitableIdx + 1}</strong> ({stripMonthPrefix(firstProfitable.label)})
                </span>
              </>
            ) : (
              <>
                <AlertTriangle size={15} color="var(--status-critical)" aria-hidden="true" />
                <span>Not profitable in any month of the forecast</span>
              </>
            )}
          </div>
          <EbitBars months={months} firstProfitableIdx={firstProfitableIdx} />
        </div>

        {/* Primary tiles */}
        {[metrics.revenue, metrics.customers].map(metric => (
          <div key={metric.title} className="glass-panel kpi-tile">
            <TileHeader metric={metric} onInspectCell={onInspectCell} />
            <div className="kpi-tile-value">{metric.format(metric.value)}</div>
            <Delta metric={metric} />
            <Sparkline values={metric.trend} label={metric.trendLabel} />
          </div>
        ))}
      </div>

      {/* Supporting metrics */}
      <div className="glass-panel kpi-secondary-row">
        {[metrics.arpu, metrics.margin, metrics.customerMonths].map(metric => (
          <div key={metric.title} className="kpi-secondary">
            <TileHeader metric={metric} onInspectCell={onInspectCell} small />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <span className="kpi-secondary-value">
                {Number.isFinite(metric.value) ? metric.format(metric.value) : 'N/A'}
              </span>
              <Delta metric={metric} inline />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function isChanged(metric) {
  return Number.isFinite(metric.value) && Number.isFinite(metric.base) && Math.abs(metric.value - metric.base) > 1e-4;
}

function stripMonthPrefix(label = '') {
  // "M9 (Mar 2027)" -> "Mar 2027"
  const match = label.match(/\(([^)]+)\)/);
  return match ? match[1] : label;
}

function TileHeader({ metric, onInspectCell, small }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)', marginBottom: small ? 'var(--space-1)' : 'var(--space-2)' }}>
      <span title={metric.description} style={{ fontSize: small ? '0.78rem' : '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
        {metric.title}
      </span>
      <button
        className="kpi-source-btn"
        title={`Excel source: ${metric.cellRef}`}
        aria-label={`Show Excel source for ${metric.title} (${metric.cellRef})`}
        onClick={() => onInspectCell?.({
          cell: metric.cellRef,
          name: metric.title,
          formula: metric.formula,
          value: metric.value,
          description: metric.description
        })}
      >
        <FileSpreadsheet size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

function Delta({ metric, inline }) {
  if (!Number.isFinite(metric.value)) {
    return <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No value available</div>;
  }
  if (!isChanged(metric)) {
    return inline ? null : <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minHeight: '1.2em' }}>Same as workbook</div>;
  }
  const diff = metric.value - metric.base;
  const good = metric.higherIsBetter ? diff > 0 : diff < 0;
  const Icon = diff > 0 ? ArrowUpRight : ArrowDownRight;
  const amount = metric.deltaFormat ? metric.deltaFormat(diff) : metric.format(Math.abs(diff));
  const pct = metric.base ? ` (${diff > 0 ? '+' : '−'}${Math.abs(diff / metric.base * 100).toFixed(1)}%)` : '';
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: good ? 'var(--delta-good)' : 'var(--delta-bad)' }}>
      <Icon size={14} aria-hidden="true" />
      <span>{diff > 0 ? '+' : '−'}{amount}{metric.deltaFormat ? '' : pct}</span>
      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>vs workbook</span>
    </div>
  );
}

// 23-month trend line. The latest month is marked in the accent colour.
function Sparkline({ values = [], label }) {
  if (values.length < 2) return null;
  const w = 220, h = 44, pad = 4;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const x = i => pad + (i / (values.length - 1)) * (w - pad * 2);
  const y = v => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values.length - 1;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${label} trend over 23 months`} style={{ width: '100%', height: '44px', marginTop: 'auto', paddingTop: 'var(--space-3)', overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke="var(--series-muted)" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last)} cy={y(values[last])} r="3.5" fill="var(--series-1)" />
    </svg>
  );
}

// Monthly EBIT as small bars around a zero line: losses below, profits above.
function EbitBars({ months, firstProfitableIdx }) {
  if (!months.length) return null;
  const w = 460, h = 56;
  const values = months.map(m => m.ebit);
  const maxAbs = Math.max(...values.map(Math.abs), 1);
  const zeroY = h / 2;
  const slot = w / values.length;
  const barW = Math.max(slot - 3, 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Monthly EBIT: bars above the line are profitable months, below are losses" style={{ width: '100%', height: '56px', marginTop: 'var(--space-3)' }}>
      <line x1="0" x2={w} y1={zeroY} y2={zeroY} stroke="var(--viz-axis)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      {values.map((v, i) => {
        const bh = (Math.abs(v) / maxAbs) * (h / 2 - 2);
        return (
          <rect
            key={i}
            x={i * slot + (slot - barW) / 2}
            y={v >= 0 ? zeroY - bh : zeroY}
            width={barW}
            height={Math.max(bh, 1)}
            rx="1.5"
            fill={v >= 0 ? 'var(--delta-good)' : 'var(--delta-bad)'}
            opacity={firstProfitableIdx === i ? 1 : 0.75}
          >
            <title>{`${months[i].label}: ${formatCurrency(v, 0)}`}</title>
          </rect>
        );
      })}
    </svg>
  );
}
