import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';

/*
 * Forecast charts, drawn as plain SVG.
 *
 * Every chart shares one hover layer: a crosshair snaps to the nearest month
 * and a tooltip beside it lists every series for that month. The same readout
 * works from the keyboard (focus the chart, then use the arrow keys).
 * Colours come from the validated palette tokens in index.css and follow the
 * series (Pro is always blue, Enterprise always orange, ...), never their order.
 */

const CHARTS = [
  { id: 'profitability', label: 'Profitability' },
  { id: 'revenue', label: 'Revenue by plan' },
  { id: 'customers', label: 'Customer growth' },
  { id: 'funnel', label: 'Acquisition funnel' },
];

const HEIGHT = 320;
const PAD = { top: 24, right: 20, bottom: 36, left: 64 };

export default function ChartsView({ monthlyResults }) {
  const [activeChart, setActiveChart] = useState('profitability');
  if (!monthlyResults || monthlyResults.length === 0) return null;

  const spec = buildSpec(activeChart, monthlyResults);

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{spec.title}</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{spec.subtitle}</p>
        </div>
        <div role="tablist" aria-label="Choose chart" className="segmented">
          {CHARTS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeChart === tab.id}
              className="segmented-btn"
              onClick={() => setActiveChart(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {spec.summary && (
        <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap', marginBottom: 'var(--space-3)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {spec.summary.map(s => (
            <div key={s.label}>
              {s.label}: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{s.value}</strong>
            </div>
          ))}
        </div>
      )}

      {spec.series.length > 1 && <Legend series={spec.series} />}

      <Chart spec={spec} months={monthlyResults} />
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Chart definitions                                                         */
/* ------------------------------------------------------------------------ */

function buildSpec(id, months) {
  const money = v => formatCurrency(v, 0);
  const count = v => formatNumber(v, 0);

  if (id === 'revenue') {
    const has = key => months.some(m => (m[key] || 0) > 0);
    const series = [
      { key: 'pro_plan_revenue', label: 'Pro plan', color: 'var(--series-1)', type: 'stack' },
      { key: 'enterprise_plan_revenue', label: 'Enterprise plan', color: 'var(--series-2)', type: 'stack' },
      has('basic_plan_revenue') && { key: 'basic_plan_revenue', label: 'Trial plan', color: 'var(--series-3)', type: 'stack' },
      has('custom_revenue') && { key: 'custom_revenue', label: 'Custom revenue', color: 'var(--series-4)', type: 'stack' },
    ].filter(Boolean);
    const peak = months.reduce((best, m) => (m.total_mrr > best.total_mrr ? m : best), months[0]);
    return {
      title: 'Monthly revenue by plan',
      subtitle: 'Stacked by where the revenue comes from. Hover or use the arrow keys for each month.',
      series,
      format: money,
      totalRow: { label: 'Total revenue', key: 'total_mrr' },
      summary: [
        { label: 'Peak month', value: `${money(peak.total_mrr)} in ${monthName(peak)}` },
        { label: 'Final month', value: money(months[months.length - 1].total_mrr) },
      ],
    };
  }

  if (id === 'customers') {
    const last = months[months.length - 1];
    return {
      title: 'Active customers',
      subtitle: 'Paying customers at the end of each month.',
      series: [{ key: 'ending_active_customers', label: 'Active customers', color: 'var(--series-1)', type: 'line' }],
      format: count,
      extraRows: [
        { label: 'New paid', get: m => count(m.new_paid_customers) },
        { label: 'Churned', get: m => count(m.churned_customers) },
      ],
      summary: [
        { label: 'Start', value: count(months[0].beginning_active_customers) },
        { label: 'End (M23)', value: count(last.ending_active_customers) },
        { label: 'Total new paid', value: count(months.reduce((a, m) => a + m.new_paid_customers, 0)) },
      ],
    };
  }

  if (id === 'funnel') {
    return {
      title: 'Leads per month',
      subtitle: 'Top of the funnel. The tooltip shows how many become trials and paying customers.',
      series: [{ key: 'leads_generated', label: 'Leads', color: 'var(--series-1)', type: 'bar' }],
      format: count,
      extraRows: [
        { label: 'Trials started', get: m => formatNumber(m.trials_started, 1) },
        { label: 'New paid customers', get: m => count(m.new_paid_customers) },
      ],
      summary: [
        { label: 'Total leads', value: count(months.reduce((a, m) => a + m.leads_generated, 0)) },
        { label: 'Total new paid', value: count(months.reduce((a, m) => a + m.new_paid_customers, 0)) },
      ],
    };
  }

  // Profitability (default)
  const firstProfitIdx = months.findIndex(m => m.ebit >= 0);
  const totalEbit = months.reduce((a, m) => a + m.ebit, 0);
  return {
    title: 'Revenue, costs and profit',
    subtitle: 'Bars show each month’s profit (green, above zero) or loss (red, below). Lines compare revenue with total costs.',
    series: [
      { key: 'ebit', label: 'Profit / loss (EBIT)', color: 'var(--delta-good)', negColor: 'var(--delta-bad)', type: 'polarityBar' },
      { key: 'total_mrr', label: 'Revenue', color: 'var(--series-1)', type: 'line' },
      { key: '_total_costs', label: 'Total costs (COGS + OPEX)', color: 'var(--series-2)', type: 'line', get: m => m.total_cogs + m.total_opex },
    ],
    format: money,
    marker: firstProfitIdx >= 0 ? { index: firstProfitIdx, label: `Break-even M${firstProfitIdx + 1}` } : null,
    summary: [
      { label: 'First profitable month', value: firstProfitIdx >= 0 ? `M${firstProfitIdx + 1} (${monthName(months[firstProfitIdx])})` : 'None in forecast' },
      { label: 'Cumulative EBIT', value: money(totalEbit) },
    ],
  };
}

const valueOf = (s, m) => (s.get ? s.get(m) : m[s.key]) || 0;

function monthName(m) {
  const match = (m.label || '').match(/\(([^)]+)\)/);
  return match ? match[1] : m.label;
}

/* ------------------------------------------------------------------------ */
/* Rendering                                                                 */
/* ------------------------------------------------------------------------ */

function Chart({ spec, months }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(900);
  const [hover, setHover] = useState(null);

  // Draw at the real pixel width so text never gets stretched.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setWidth(Math.max(320, entries[0].contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => setHover(null), [spec.title]);

  const n = months.length;
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const slot = innerW / n;
  const cx = i => PAD.left + slot * i + slot / 2;

  // Y range: stacks add up; everything else uses its own values. Zero always included.
  const stackSeries = spec.series.filter(s => s.type === 'stack');
  const totals = months.map(m => stackSeries.reduce((a, s) => a + valueOf(s, m), 0));
  const all = [
    ...totals,
    ...spec.series.filter(s => s.type !== 'stack').flatMap(s => months.map(m => valueOf(s, m))),
    0,
  ];
  const { min, max, ticks } = niceScale(Math.min(...all), Math.max(...all));
  const y = v => PAD.top + innerH * (1 - (v - min) / (max - min || 1));
  const zeroY = y(0);

  const barW = Math.max(4, Math.min(28, slot - 6));
  const handleMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.floor((px - PAD.left) / slot);
    setHover(i >= 0 && i < n ? i : null);
  };
  const handleKey = e => {
    if (e.key === 'ArrowRight') { setHover(h => Math.min(n - 1, (h ?? -1) + 1)); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { setHover(h => Math.max(0, (h ?? n) - 1)); e.preventDefault(); }
    if (e.key === 'Escape') setHover(null);
  };

  const showEvery = width < 700 ? 3 : width < 1000 ? 2 : 1;

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${spec.title}. Focus and use the left and right arrow keys to read each month.`}
        tabIndex={0}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
        onKeyDown={handleKey}
        onBlur={() => setHover(null)}
        className="chart-svg"
        style={{ display: 'block', touchAction: 'pan-y' }}
      >
        {/* Grid + y ticks */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'} strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--viz-muted-ink)" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {spec.format(t)}
            </text>
          </g>
        ))}

        {/* Hover column wash */}
        {hover !== null && (
          <rect x={PAD.left + slot * hover} y={PAD.top} width={slot} height={innerH} fill="rgba(255,255,255,0.04)" />
        )}

        {/* Break-even marker */}
        {spec.marker && (
          <g>
            <line x1={cx(spec.marker.index)} x2={cx(spec.marker.index)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text-secondary)" strokeDasharray="4 4" strokeWidth="1" />
            <text x={cx(spec.marker.index) + 6} y={PAD.top + 12} fontSize="11" fill="var(--text-secondary)">{spec.marker.label}</text>
          </g>
        )}

        {/* Stacked bars */}
        {stackSeries.length > 0 && months.map((m, i) => {
          let base = 0;
          const segs = stackSeries.map(s => {
            const v = valueOf(s, m);
            const seg = { s, y0: base, y1: base + v };
            base += v;
            return seg;
          }).filter(seg => seg.y1 > seg.y0);
          return segs.map((seg, k) => {
            const top = y(seg.y1);
            const bottom = y(seg.y0) - (k > 0 ? 2 : 0); // 2px surface gap between segments
            const h = Math.max(0, bottom - top);
            const isTop = k === segs.length - 1;
            return (
              <path key={`${i}-${seg.s.key}`} d={barPath(cx(i) - barW / 2, top, barW, h, isTop ? 4 : 0, 'up')} fill={seg.s.color} opacity={hover === null || hover === i ? 1 : 0.55} />
            );
          });
        })}

        {/* Single-series bars and profit/loss bars */}
        {spec.series.filter(s => s.type === 'bar' || s.type === 'polarityBar').map(s => months.map((m, i) => {
          const v = valueOf(s, m);
          const yv = y(v);
          const up = v >= 0;
          const top = up ? yv : zeroY;
          const h = Math.max(1, Math.abs(yv - zeroY));
          const color = s.type === 'polarityBar' && !up ? s.negColor : s.color;
          return <path key={`${s.key}-${i}`} d={barPath(cx(i) - barW / 2, top, barW, h, 4, up ? 'up' : 'down')} fill={color} opacity={hover === null || hover === i ? 0.9 : 0.45} />;
        }))}

        {/* Lines */}
        {spec.series.filter(s => s.type === 'line').map(s => (
          <g key={s.key}>
            <polyline
              points={months.map((m, i) => `${cx(i)},${y(valueOf(s, m))}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {hover !== null && (
              <circle cx={cx(hover)} cy={y(valueOf(s, months[hover]))} r="4.5" fill={s.color} stroke="var(--bg-secondary)" strokeWidth="2" />
            )}
          </g>
        ))}

        {/* Crosshair */}
        {hover !== null && (
          <line x1={cx(hover)} x2={cx(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--text-muted)" strokeWidth="1" pointerEvents="none" />
        )}

        {/* X labels */}
        {months.map((m, i) => (i % showEvery === 0 || i === hover) && (
          <text
            key={m.column}
            x={cx(i)}
            y={HEIGHT - 14}
            textAnchor="middle"
            fontSize="11"
            fill={i === hover ? 'var(--text-primary)' : 'var(--viz-muted-ink)'}
            fontWeight={i === hover ? 600 : 400}
          >
            M{i + 1}
          </text>
        ))}
      </svg>

      {hover !== null && <Tooltip spec={spec} month={months[hover]} x={cx(hover)} width={width} />}
    </div>
  );
}

function Tooltip({ spec, month, x, width }) {
  const boxW = 260;
  const left = x + 14 + boxW > width ? x - 14 - boxW : x + 14;
  const rows = spec.series.map(s => ({ label: s.label, value: spec.format(valueOf(s, month)), color: s.type === 'polarityBar' && valueOf(s, month) < 0 ? s.negColor : s.color }));
  return (
    <div className="chart-tooltip" style={{ left, top: PAD.top, width: boxW }} role="status" aria-live="polite">
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>{month.label}</div>
      {rows.map(r => (
        <div key={r.label} className="chart-tooltip-row">
          <span className="chart-tooltip-key" style={{ background: r.color }} aria-hidden="true" />
          <strong>{r.value}</strong>
          <span>{r.label}</span>
        </div>
      ))}
      {spec.totalRow && (
        <div className="chart-tooltip-row" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '4px', marginTop: '4px' }}>
          <span className="chart-tooltip-key" style={{ background: 'transparent' }} aria-hidden="true" />
          <strong>{spec.format(month[spec.totalRow.key])}</strong>
          <span>{spec.totalRow.label}</span>
        </div>
      )}
      {(spec.extraRows || []).map(r => (
        <div key={r.label} className="chart-tooltip-row">
          <span className="chart-tooltip-key" style={{ background: 'transparent' }} aria-hidden="true" />
          <strong>{r.get(month)}</strong>
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  );
}

function Legend({ series }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
      {series.map(s => (
        <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {s.type === 'line' ? (
            <span style={{ width: '14px', height: '2px', background: s.color, borderRadius: '1px' }} aria-hidden="true" />
          ) : s.type === 'polarityBar' ? (
            <span style={{ display: 'inline-flex', gap: '2px' }} aria-hidden="true">
              <span style={{ width: '8px', height: '10px', background: s.color, borderRadius: '2px' }} />
              <span style={{ width: '8px', height: '10px', background: s.negColor, borderRadius: '2px' }} />
            </span>
          ) : (
            <span style={{ width: '10px', height: '10px', background: s.color, borderRadius: '2px' }} aria-hidden="true" />
          )}
          {s.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                   */
/* ------------------------------------------------------------------------ */

// Bar with its far end rounded (radius r) and the baseline end square.
function barPath(x, top, w, h, r, dir) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  if (dir === 'up') {
    return `M${x},${top + h} V${top + rr} Q${x},${top} ${x + rr},${top} H${x + w - rr} Q${x + w},${top} ${x + w},${top + rr} V${top + h} Z`;
  }
  const bottom = top + h;
  return `M${x},${top} V${bottom - rr} Q${x},${bottom} ${x + rr},${bottom} H${x + w - rr} Q${x + w},${bottom} ${x + w},${bottom - rr} V${top} Z`;
}

// Round axis ticks: 1, 2, 2.5 or 5 times a power of ten.
function niceScale(lo, hi, target = 5) {
  if (lo === hi) { hi = lo + 1; }
  const rawStep = (hi - lo) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= rawStep) || 10 * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks = [];
  for (let t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return { min, max, ticks };
}
