import React, { useEffect, useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { ArrowDown, Loader2 } from 'lucide-react';

/*
 * Slim bar pinned to the bottom of the screen with the headline results.
 * It appears whenever the full KPI section is off screen (for example while
 * editing assumptions at the top), so every edit's effect is visible at once.
 */
export default function LiveResultsBar({ targetRef, summaryKPIs, baselineKPIs, monthlyResults = [], calculating }) {
  const [targetVisible, setTargetVisible] = useState(true);

  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setTargetVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetRef]);

  if (!summaryKPIs || targetVisible) return null;

  const breakEvenIdx = monthlyResults.findIndex(m => m.ebit >= 0);
  const items = [
    { label: 'Cumulative EBIT', value: summaryKPIs.total_ebit_sum, base: baselineKPIs?.total_ebit_sum, format: v => formatCurrency(v, 0) },
    { label: 'Revenue', value: summaryKPIs.total_revenue_sum, base: baselineKPIs?.total_revenue_sum, format: v => formatCurrency(v, 0) },
    { label: 'Customers at M23', value: summaryKPIs.ending_active_customers_final, base: baselineKPIs?.ending_active_customers_final, format: v => formatNumber(v, 0) },
  ];

  return (
    <div className="live-results-bar" role="region" aria-label="Live results">
      <div className="live-results-inner">
        <span className="live-results-title">
          {calculating ? <Loader2 size={13} className="spin" aria-hidden="true" /> : <span className="live-dot" aria-hidden="true" />}
          Live results
        </span>
        {items.map(it => {
          const diff = Number.isFinite(it.base) ? it.value - it.base : 0;
          const changed = Math.abs(diff) > 1e-4;
          return (
            <span key={it.label} className="live-results-item">
              <span className="live-results-label">{it.label}</span>
              <strong>{it.format(it.value)}</strong>
              {changed && (
                <span style={{ color: diff > 0 ? 'var(--delta-good)' : 'var(--delta-bad)', fontSize: '0.75rem', fontWeight: 600 }}>
                  {diff > 0 ? '+' : '−'}{it.format(Math.abs(diff))}
                </span>
              )}
            </span>
          );
        })}
        <span className="live-results-item">
          <span className="live-results-label">Break-even</span>
          <strong>{breakEvenIdx >= 0 ? `M${breakEvenIdx + 1}` : 'None'}</strong>
        </span>
        <button
          className="chip-btn"
          style={{ marginLeft: 'auto' }}
          onClick={() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <ArrowDown size={13} aria-hidden="true" /> See full results
        </button>
      </div>
    </div>
  );
}
