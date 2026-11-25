import React, { useEffect, useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { ArrowUpRight, ArrowDownRight, GitCompare, Loader2 } from 'lucide-react';
import { Chart, Legend } from './ChartsView';

/*
 * Compares the model as it is right now with any other scenario: the Excel
 * workbook baseline or a saved scenario. Saved scenarios are recalculated with
 * the current engine so both sides are always computed the same way.
 */
export default function ScenarioComparisonView({
  activeResults,
  baselineResults,
  activeAssumptions,
  baselineAssumptions,
  activeScenarioName,
  savedScenarios = []
}) {
  const [compareId, setCompareId] = useState('baseline');
  const [other, setOther] = useState(null); // { name, results, assumptions }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const options = [
    { id: 'baseline', name: 'Workbook baseline (Excel)' },
    ...savedScenarios.filter(s => s && s.id !== 'baseline').map(s => ({ id: s.id, name: s.name })),
  ];

  useEffect(() => {
    let cancelled = false;
    setError(null);

    if (compareId === 'baseline') {
      setOther(baselineResults && baselineAssumptions
        ? { name: 'Workbook baseline', results: baselineResults, assumptions: baselineAssumptions }
        : null);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const local = savedScenarios.find(s => s.id === compareId);
        let scenario = local?.assumptions ? local : null;
        const res = await fetch(`/api/scenarios/${encodeURIComponent(compareId)}`);
        if (res.ok) scenario = await res.json();
        if (!scenario?.assumptions) throw new Error('This scenario has no saved assumptions.');

        const calc = await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scenario.assumptions),
        });
        if (!calc.ok) throw new Error(`Couldn't calculate "${scenario.name}" (${calc.status}).`);
        const results = await calc.json();
        if (!cancelled) setOther({ name: scenario.name, results, assumptions: scenario.assumptions });
      } catch (e) {
        if (!cancelled) {
          setOther(null);
          setError(e instanceof TypeError
            ? "Can't reach the calculation server, so saved scenarios can't be loaded. Start the server and reload the page."
            : e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [compareId, baselineResults, baselineAssumptions, savedScenarios]);

  if (!activeResults || !activeAssumptions) return null;

  const currentName = `Current model${activeScenarioName ? ` (${activeScenarioName})` : ''}`;

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <GitCompare size={18} color="#60a5fa" aria-hidden="true" /> Scenario comparison
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            The current model, including unsaved edits, compared with another scenario.
          </p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Compare with
          <select className="form-input" style={{ width: 'auto', minWidth: '220px' }} value={compareId} onChange={e => setCompareId(e.target.value)}>
            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: 'var(--space-4)', color: '#fca5a5', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {loading && !other && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: 'var(--space-5) 0' }}>
          <Loader2 size={16} className="spin" aria-hidden="true" /> Calculating scenario…
        </div>
      )}

      {other && (
        <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
          <OutcomeTable current={activeResults} other={other.results} currentName={currentName} otherName={other.name} />
          <CumulativeEbitChart current={activeResults} other={other.results} currentName="Current model" otherName={other.name} />
          <InputDifferences current={activeAssumptions} other={other.assumptions} otherName={other.name} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

const money = v => formatCurrency(v, 0);
const count = v => formatNumber(v, 0);
const pct = v => `${(v * 100).toFixed(1)}%`;

function OutcomeTable({ current, other, currentName, otherName }) {
  const a = current.summary_kpis;
  const b = other.summary_kpis;
  const breakEven = r => {
    const i = r.monthly_results.findIndex(m => m.ebit >= 0);
    return i >= 0 ? i + 1 : null;
  };
  const beA = breakEven(current);
  const beB = breakEven(other);

  const rows = [
    { label: 'Cumulative EBIT', a: a.total_ebit_sum, b: b.total_ebit_sum, format: money, higherIsBetter: true },
    { label: 'Total revenue', a: a.total_revenue_sum, b: b.total_revenue_sum, format: money, higherIsBetter: true },
    { label: 'Total COGS', a: a.total_cogs_sum, b: b.total_cogs_sum, format: money, higherIsBetter: false },
    { label: 'Total OPEX', a: a.total_opex_sum, b: b.total_opex_sum, format: money, higherIsBetter: false },
    { label: 'Gross margin', a: a.overall_gross_margin_pct, b: b.overall_gross_margin_pct, format: v => `${v.toFixed(1)}%`, deltaFormat: d => `${Math.abs(d).toFixed(1)} pts`, higherIsBetter: true },
    { label: 'Active customers at M23', a: a.ending_active_customers_final, b: b.ending_active_customers_final, format: count, higherIsBetter: true },
    { label: 'New paid customers', a: a.total_new_paid_customers, b: b.total_new_paid_customers, format: count, higherIsBetter: true },
    { label: 'Weighted ARPU', a: current.weighted_arpu, b: other.weighted_arpu, format: v => formatCurrency(v, 2), higherIsBetter: true },
    { label: 'First profitable month', a: beA, b: beB, format: v => (v ? `M${v}` : 'None'), deltaFormat: d => `${Math.abs(d)} mo`, higherIsBetter: false, nullable: true },
  ];

  return (
    <div className="model-table-container" style={{ marginBottom: 'var(--space-5)' }}>
      <table className="model-table compare-table">
        <thead>
          <tr>
            <th>Outcome</th>
            <th>{currentName}</th>
            <th>{otherName}</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const comparable = Number.isFinite(r.a) && Number.isFinite(r.b);
            const diff = comparable ? r.a - r.b : null;
            const same = comparable && Math.abs(diff) < 1e-6;
            const good = comparable && (r.higherIsBetter ? diff > 0 : diff < 0);
            const pctChange = comparable && !r.deltaFormat && r.b !== 0 ? ` (${diff > 0 ? '+' : '−'}${Math.abs(diff / r.b * 100).toFixed(1)}%)` : '';
            return (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td className="num-val" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{r.format(r.a)}</td>
                <td className="num-val" style={{ color: 'var(--text-secondary)' }}>{r.format(r.b)}</td>
                <td className="num-val">
                  {!comparable ? (
                    <span style={{ color: 'var(--text-muted)' }}>{r.a === r.b ? 'Same' : 'Not comparable'}</span>
                  ) : same ? (
                    <span style={{ color: 'var(--text-muted)' }}>Same</span>
                  ) : (
                    <span style={{ color: good ? 'var(--delta-good)' : 'var(--delta-bad)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                      {diff > 0 ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
                      {diff > 0 ? '+' : '−'}{r.deltaFormat ? r.deltaFormat(diff) : r.format(Math.abs(diff))}{pctChange}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CumulativeEbitChart({ current, other, currentName, otherName }) {
  const cumulative = results => {
    let total = 0;
    return results.monthly_results.map(m => (total += m.ebit));
  };
  const a = cumulative(current);
  const b = cumulative(other);
  const months = current.monthly_results.map((m, i) => ({ label: m.label, column: m.column, current: a[i], other: b[i] }));
  const spec = {
    title: 'Cumulative EBIT',
    series: [
      { key: 'current', label: currentName, color: 'var(--series-1)', type: 'line' },
      { key: 'other', label: otherName, color: 'var(--series-2)', type: 'line' },
    ],
    format: money,
  };
  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>Cumulative EBIT over time</h4>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
        Running total of profit and loss. Where a line crosses zero, that scenario has earned back its earlier losses.
      </p>
      <Legend series={spec.series} />
      <Chart spec={spec} months={months} />
    </div>
  );
}

function InputDifferences({ current, other, otherName }) {
  const diffs = [];
  const add = (group, label, a, b, format) => {
    if (a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 1e-9)) return;
    diffs.push({ group, label, a: a === undefined ? '—' : format(a), b: b === undefined ? '—' : format(b) });
  };

  add('Funnel', 'Beginning customers', current.beginning_customers, other.beginning_customers, count);
  add('Funnel', 'Monthly churn', current.monthly_churn, other.monthly_churn, pct);
  add('Funnel', 'Lead → trial conversion', current.lead_to_trial_conversion, other.lead_to_trial_conversion, pct);
  add('Funnel', 'Trial → paid conversion', current.trial_to_paid_conversion, other.trial_to_paid_conversion, pct);
  const sumLeads = x => Object.values(x.monthly_leads || {}).reduce((s, v) => s + v, 0);
  add('Funnel', 'Total leads (23 months)', sumLeads(current), sumLeads(other), count);

  for (const tier of ['trial', 'pro', 'enterprise']) {
    const name = tier[0].toUpperCase() + tier.slice(1);
    add('Pricing', `${name} price`, current.pricing_tiers?.[tier]?.price_per_month, other.pricing_tiers?.[tier]?.price_per_month, v => formatCurrency(v, 2));
    add('Pricing', `${name} share of customers`, current.pricing_tiers?.[tier]?.customer_pct, other.pricing_tiers?.[tier]?.customer_pct, pct);
  }

  add('COGS', 'Cloud hosting', current.cogs?.cloud_hosting_fixed, other.cogs?.cloud_hosting_fixed, money);
  add('COGS', 'Payment processing', current.cogs?.payment_processing_pct, other.cogs?.payment_processing_pct, pct);
  add('COGS', 'APIs per customer', current.cogs?.api_per_customer, other.cogs?.api_per_customer, v => formatCurrency(v, 2));
  add('COGS', 'Other direct cost per trial customer', current.cogs?.other_direct_per_trial, other.cogs?.other_direct_per_trial, v => formatCurrency(v, 2));

  const opexB = Object.fromEntries((other.opex || []).map(o => [o.name, o.value]));
  const opexA = Object.fromEntries((current.opex || []).map(o => [o.name, o.value]));
  for (const name of new Set([...Object.keys(opexA), ...Object.keys(opexB)])) {
    add('OPEX', `${name} (per month)`, opexA[name], opexB[name], money);
  }

  const describe = i => `${formatCurrency(i.amount, 2)} ${i.basis === 'per_customer' ? 'per customer' : 'per month'} from M${i.start_month}`;
  const customA = Object.fromEntries((current.custom_items || []).map(i => [i.id, i]));
  const customB = Object.fromEntries((other.custom_items || []).map(i => [i.id, i]));
  for (const id of new Set([...Object.keys(customA), ...Object.keys(customB)])) {
    const a = customA[id];
    const b = customB[id];
    const da = a ? describe(a) : 'Not included';
    const db = b ? describe(b) : 'Not included';
    if (da !== db || a?.name !== b?.name) diffs.push({ group: 'Custom items', label: (a || b).name, a: da, b: db });
  }

  return (
    <div>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
        Inputs that differ {diffs.length > 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({diffs.length})</span>}
      </h4>
      {diffs.length === 0 ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Every input is the same as in {otherName}.
        </p>
      ) : (
        <div className="model-table-container">
          <table className="model-table compare-table">
            <thead>
              <tr>
                <th>Input</th>
                <th>Current model</th>
                <th>{otherName}</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d, i) => (
                <tr key={`${d.group}-${d.label}-${i}`}>
                  <td>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginRight: '6px' }}>{d.group}</span>
                    {d.label}
                  </td>
                  <td className="num-val" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.a}</td>
                  <td className="num-val" style={{ color: 'var(--text-secondary)' }}>{d.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
