import React, { useEffect, useRef, useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import {
  RotateCcw, Sliders, DollarSign, Users, Cpu, FileSpreadsheet, AlertCircle, CheckCircle2,
  PlusCircle, Trash2, Undo2
} from 'lucide-react';

/*
 * Assumptions editor. Every input:
 *   - can be typed into freely (the value is only reformatted when you leave the field),
 *   - shows its workbook value and a reset button once you change it,
 *   - links to the Excel cell it came from.
 * Tabs show how many inputs in them differ from the workbook.
 */
export default function AssumptionsEditorView({
  assumptions,
  onChange,
  onResetDefaults,
  onInspectCell,
  baselineAssumptions,
  periods = []
}) {
  const [activeTab, setActiveTab] = useState('funnel');

  if (!assumptions) return null;
  const base = baselineAssumptions || {};

  const updateField = (field, val) => onChange({ ...assumptions, [field]: val });

  const updatePricing = (tier, field, val) => {
    onChange({
      ...assumptions,
      pricing_tiers: {
        ...assumptions.pricing_tiers,
        [tier]: { ...assumptions.pricing_tiers[tier], [field]: val }
      }
    });
  };

  const updateCOGS = (field, val) => onChange({ ...assumptions, cogs: { ...assumptions.cogs, [field]: val } });

  const updateOpex = (index, val) => {
    const newOpex = [...assumptions.opex];
    newOpex[index] = { ...newOpex[index], value: val };
    onChange({ ...assumptions, opex: newOpex });
  };

  const updateMonthlyLead = (col, val) => {
    onChange({ ...assumptions, monthly_leads: { ...assumptions.monthly_leads, [col]: val } });
  };

  const bulkModifyLeads = (multiplier) => {
    const updated = {};
    for (const [col, val] of Object.entries(assumptions.monthly_leads)) {
      updated[col] = Math.max(0, Math.round(val * multiplier));
    }
    onChange({ ...assumptions, monthly_leads: updated });
  };

  // --- Custom line items (user-added assumptions not in the workbook) ---
  const customItems = assumptions.custom_items || [];
  const setCustomItems = (items) => onChange({ ...assumptions, custom_items: items });
  const addCustomItem = (kind) => {
    const names = { expense: 'New expense', direct_cost: 'New direct cost', revenue: 'New revenue stream' };
    setCustomItems([...customItems, { id: `custom_${Date.now()}`, name: names[kind], kind, basis: 'per_month', amount: 0, start_month: 1 }]);
  };
  const updateCustomItem = (id, field, val) => setCustomItems(customItems.map(item => (item.id === id ? { ...item, [field]: val } : item)));
  const removeCustomItem = (id) => setCustomItems(customItems.filter(item => item.id !== id));

  // --- Tier shares ---
  const tiers = assumptions.pricing_tiers;
  const tierSum = (tiers?.trial?.customer_pct || 0) + (tiers?.pro?.customer_pct || 0) + (tiers?.enterprise?.customer_pct || 0);
  const isTierSumValid = Math.abs(tierSum - 1.0) < 0.0005;
  const trialRemainder = 1 - (tiers?.pro?.customer_pct || 0) - (tiers?.enterprise?.customer_pct || 0);

  // --- What differs from the workbook, per tab ---
  const differs = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) > 1e-9;
  const changed = {
    funnel: ['beginning_customers', 'monthly_churn', 'lead_to_trial_conversion', 'trial_to_paid_conversion']
      .filter(k => differs(assumptions[k], base[k])).length,
    pricing: ['trial', 'pro', 'enterprise'].flatMap(t => ['price_per_month', 'customer_pct']
      .map(f => differs(tiers?.[t]?.[f], base.pricing_tiers?.[t]?.[f]))).filter(Boolean).length,
    cogs: ['cloud_hosting_fixed', 'payment_processing_pct', 'api_per_customer', 'other_direct_per_trial']
      .filter(k => differs(assumptions.cogs?.[k], base.cogs?.[k])).length,
    opex: (assumptions.opex || []).filter((o, i) => differs(o.value, base.opex?.[i]?.value)).length,
    leads: Object.keys(assumptions.monthly_leads || {}).filter(c => differs(assumptions.monthly_leads[c], base.monthly_leads?.[c])).length,
    custom: customItems.length,
  };

  const tabs = [
    { id: 'funnel', label: 'Funnel & customers', icon: Users },
    { id: 'pricing', label: 'Pricing & tiers', icon: DollarSign },
    { id: 'cogs', label: 'Direct costs (COGS)', icon: Cpu },
    { id: 'opex', label: 'Operating expenses', icon: Sliders },
    { id: 'leads', label: 'Monthly leads', icon: FileSpreadsheet },
    { id: 'custom', label: 'Add your own', icon: PlusCircle },
  ];

  const pctIn = v => v * 100;
  const pctOut = v => Math.min(1, Math.max(0, v / 100));

  return (
    <div className="glass-panel" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Assumptions</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Change any input and the whole model recalculates. Changed inputs show their workbook value and can be reset one at a time.
          </p>
        </div>
        <button className="btn-secondary" onClick={onResetDefaults} title="Reset every input back to the Excel workbook values">
          <RotateCcw size={14} aria-hidden="true" /> Reset all to workbook
        </button>
      </div>

      <div role="tablist" aria-label="Assumption groups" className="editor-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const n = changed[tab.id];
          return (
            <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className="editor-tab" onClick={() => setActiveTab(tab.id)}>
              <Icon size={14} aria-hidden="true" />
              {tab.label}
              {n > 0 && (
                <span className="editor-tab-count" title={tab.id === 'custom' ? `${n} custom item${n === 1 ? '' : 's'}` : `${n} changed from workbook`}>
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FUNNEL & CUSTOMERS */}
      {activeTab === 'funnel' && (
        <div className="editor-grid">
          <Field
            label="Beginning active customers" unit="customers" cellRef="Assumptions !B3"
            description="Paying customers at the start of month 1."
            value={assumptions.beginning_customers} baseValue={base.beginning_customers}
            format={v => formatNumber(v, 0)} step={1} min={0}
            onChange={v => updateField('beginning_customers', Math.max(0, v))}
            onInspectCell={onInspectCell}
          />
          <Field
            label="Monthly churn" unit="%" cellRef="Assumptions !B5"
            description="Share of customers who cancel each month."
            value={pctIn(assumptions.monthly_churn)} baseValue={pctIn(base.monthly_churn)}
            format={v => v.toFixed(1)} step={0.5} min={0} max={100}
            onChange={v => updateField('monthly_churn', pctOut(v))}
            onInspectCell={onInspectCell}
          />
          <Field
            label="Lead → trial conversion" unit="%" cellRef="Assumptions !B19"
            description="Share of leads who start a trial."
            value={pctIn(assumptions.lead_to_trial_conversion)} baseValue={pctIn(base.lead_to_trial_conversion)}
            format={v => v.toFixed(1)} step={1} min={0} max={100}
            onChange={v => updateField('lead_to_trial_conversion', pctOut(v))}
            onInspectCell={onInspectCell}
          />
          <Field
            label="Trial → paid conversion" unit="%" cellRef="Assumptions !B20"
            description="Share of trials that become paying customers."
            value={pctIn(assumptions.trial_to_paid_conversion)} baseValue={pctIn(base.trial_to_paid_conversion)}
            format={v => v.toFixed(1)} step={0.5} min={0} max={100}
            onChange={v => updateField('trial_to_paid_conversion', pctOut(v))}
            onInspectCell={onInspectCell}
          />
        </div>
      )}

      {/* PRICING & TIERS */}
      {activeTab === 'pricing' && (
        <div>
          <div className={`tier-total ${isTierSumValid ? 'ok' : 'bad'}`} role="status">
            {isTierSumValid ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
            <span>
              Customer shares add up to <strong>{(tierSum * 100).toFixed(1)}%</strong>
              {isTierSumValid ? '.' : '. They need to add up to 100% before you can save a scenario.'}
            </span>
            {!isTierSumValid && trialRemainder >= 0 && (
              <button className="chip-btn" onClick={() => updatePricing('trial', 'customer_pct', Math.round(trialRemainder * 1000) / 1000)}>
                Set Trial to {(trialRemainder * 100).toFixed(1)}% to balance
              </button>
            )}
          </div>

          <div className="editor-grid">
            {[
              { key: 'trial', name: 'Trial', cells: 'B12:C12' },
              { key: 'pro', name: 'Pro', cells: 'B13:C13' },
              { key: 'enterprise', name: 'Enterprise', cells: 'B14:C14' },
            ].map(t => (
              <div key={t.key} className="glass-panel editor-card">
                <div className="editor-card-head">
                  <span className="editor-card-title">{t.name} tier</span>
                  <SourceButton
                    cellRef={`Assumptions !${t.cells}`}
                    onClick={() => onInspectCell({ cell: `Assumptions !${t.cells}`, name: `${t.name} tier`, formula: `Price and share of customers for the ${t.name} tier` })}
                  />
                </div>
                <Field
                  bare label="Price per month" unit="$"
                  value={tiers[t.key].price_per_month} baseValue={base.pricing_tiers?.[t.key]?.price_per_month}
                  format={v => v.toFixed(2)} step={1} min={0}
                  onChange={v => updatePricing(t.key, 'price_per_month', Math.max(0, v))}
                />
                <Field
                  bare label="Share of customers" unit="%"
                  value={pctIn(tiers[t.key].customer_pct)} baseValue={pctIn(base.pricing_tiers?.[t.key]?.customer_pct)}
                  format={v => v.toFixed(1)} step={1} min={0} max={100}
                  onChange={v => updatePricing(t.key, 'customer_pct', pctOut(v))}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COGS */}
      {activeTab === 'cogs' && (
        <div className="editor-grid">
          <Field
            label="Cloud hosting" unit="$/month" cellRef="Financial Model !C37"
            description="Fixed hosting cost every month."
            value={assumptions.cogs.cloud_hosting_fixed} baseValue={base.cogs?.cloud_hosting_fixed}
            format={v => v.toFixed(2)} min={0}
            onChange={v => updateCOGS('cloud_hosting_fixed', Math.max(0, v))}
            onInspectCell={onInspectCell}
          />
          <Field
            label="Payment processing" unit="% of revenue" cellRef="Assumptions !B25"
            description="Card / Stripe fees taken from revenue."
            value={pctIn(assumptions.cogs.payment_processing_pct)} baseValue={pctIn(base.cogs?.payment_processing_pct)}
            format={v => v.toFixed(1)} step={0.1} min={0} max={100}
            onChange={v => updateCOGS('payment_processing_pct', pctOut(v))}
            onInspectCell={onInspectCell}
          />
          <Field
            label="Third-party APIs" unit="$/customer" cellRef="Assumptions !B26"
            description="Support and tooling cost per active customer each month."
            value={assumptions.cogs.api_per_customer} baseValue={base.cogs?.api_per_customer}
            format={v => v.toFixed(2)} step={0.25} min={0}
            onChange={v => updateCOGS('api_per_customer', Math.max(0, v))}
            onInspectCell={onInspectCell}
          />
          <Field
            label="Other direct costs" unit="$/trial customer" cellRef="Assumptions !B27"
            description="Extra cost per trial-tier customer each month."
            value={assumptions.cogs.other_direct_per_trial} baseValue={base.cogs?.other_direct_per_trial}
            format={v => v.toFixed(2)} step={0.25} min={0}
            onChange={v => updateCOGS('other_direct_per_trial', Math.max(0, v))}
            onInspectCell={onInspectCell}
          />
        </div>
      )}

      {/* OPEX, grouped by category */}
      {activeTab === 'opex' && (() => {
        const groups = [];
        assumptions.opex.forEach((item, idx) => {
          let g = groups.find(x => x.category === item.category);
          if (!g) groups.push(g = { category: item.category, items: [] });
          g.items.push({ item, idx });
        });
        const total = assumptions.opex.reduce((a, o) => a + o.value, 0);
        return (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              Monthly operating expenses: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(total, 0)}</strong> per month
              {customItems.some(i => i.kind === 'expense') && ' (plus custom expenses from “Add your own”)'}.
            </p>
            {groups.map(g => (
              <div key={g.category} style={{ marginBottom: 'var(--space-5)' }}>
                <div className="editor-group-head">
                  <span>{g.category}</span>
                  <span className="num-val">{formatCurrency(g.items.reduce((a, x) => a + x.item.value, 0), 0)}/mo</span>
                </div>
                <div className="editor-grid">
                  {g.items.map(({ item, idx }) => (
                    <Field
                      key={idx}
                      label={item.name} unit="$/month" cellRef={`Financial Model !Row ${item.row}`}
                      value={item.value} baseValue={base.opex?.[idx]?.value}
                      format={v => formatNumber(v, 0)} min={0}
                      onChange={v => updateOpex(idx, Math.max(0, v))}
                      onInspectCell={onInspectCell}
                      compact
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* MONTHLY LEADS */}
      {activeTab === 'leads' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              New leads each month. Total: <strong style={{ color: 'var(--text-primary)' }}>{formatNumber(Object.values(assumptions.monthly_leads).reduce((a, v) => a + v, 0), 0)}</strong>
            </span>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button className="chip-btn" onClick={() => bulkModifyLeads(0.9)}>−10% all months</button>
              <button className="chip-btn" onClick={() => bulkModifyLeads(1.1)}>+10% all months</button>
              <button className="chip-btn" onClick={() => bulkModifyLeads(1.5)}>+50% all months</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 'var(--space-2)' }}>
            {Object.entries(assumptions.monthly_leads).map(([col, val], i) => {
              const baseVal = base.monthly_leads?.[col];
              const isChanged = differs(val, baseVal);
              return (
                <label key={col} className={`glass-panel lead-cell${isChanged ? ' changed' : ''}`}>
                  <span className="lead-cell-label">{periods[i]?.label || `M${i + 1}`}</span>
                  <NumberInput
                    value={val} format={v => formatNumber(v, 0)} min={0}
                    onChange={v => updateMonthlyLead(col, Math.max(0, v))}
                    ariaLabel={`Leads in ${periods[i]?.label || `month ${i + 1}`}`}
                    style={{ textAlign: 'center' }}
                  />
                  {isChanged && <span className="lead-cell-base">Workbook {formatNumber(baseVal, 0)}</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* CUSTOM LINE ITEMS */}
      {activeTab === 'custom' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)', lineHeight: 1.5 }}>
            Add assumptions that aren't in the workbook, such as a new hire, a marketing campaign or a consulting revenue stream.
            Expenses go into OPEX, direct costs into COGS, and revenue into total revenue. The workbook's own numbers are unchanged until you add something here.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <button className="btn-secondary" onClick={() => addCustomItem('expense')}><PlusCircle size={14} aria-hidden="true" /> Add expense</button>
            <button className="btn-secondary" onClick={() => addCustomItem('direct_cost')}><PlusCircle size={14} aria-hidden="true" /> Add direct cost</button>
            <button className="btn-secondary" onClick={() => addCustomItem('revenue')}><PlusCircle size={14} aria-hidden="true" /> Add revenue</button>
          </div>

          {customItems.length === 0 ? (
            <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: '10px', padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No custom items yet. Use the buttons above to add one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {customItems.map(item => (
                <div key={item.id} className="glass-panel custom-item-row">
                  <label className="field-label" style={{ gridColumn: 'span 2' }}>
                    Name
                    <input type="text" className="form-input" value={item.name} maxLength={80} onChange={e => updateCustomItem(item.id, 'name', e.target.value)} />
                  </label>
                  <label className="field-label">
                    Type
                    <select className="form-input" value={item.kind} onChange={e => updateCustomItem(item.id, 'kind', e.target.value)}>
                      <option value="expense">Expense (OPEX)</option>
                      <option value="direct_cost">Direct cost (COGS)</option>
                      <option value="revenue">Revenue</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Amount ($)
                    <NumberInput value={item.amount} format={v => v.toFixed(2)} min={0} onChange={v => updateCustomItem(item.id, 'amount', Math.max(0, v))} />
                  </label>
                  <label className="field-label">
                    Charged
                    <select className="form-input" value={item.basis} onChange={e => updateCustomItem(item.id, 'basis', e.target.value)}>
                      <option value="per_month">Per month</option>
                      <option value="per_customer">Per active customer / month</option>
                    </select>
                  </label>
                  <label className="field-label">
                    Starts
                    <select className="form-input" value={item.start_month} onChange={e => updateCustomItem(item.id, 'start_month', parseInt(e.target.value, 10))}>
                      {Array.from({ length: 23 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>{periods[i]?.label || `Month ${i + 1}`}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="btn-secondary"
                    onClick={() => removeCustomItem(item.id)}
                    title={`Remove ${item.name}`}
                    aria-label={`Remove ${item.name}`}
                    style={{ color: '#fb7185', justifySelf: 'start' }}
                  >
                    <Trash2 size={14} aria-hidden="true" /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * Number input that lets you type freely. While the field has focus it keeps
 * exactly what you typed; it only reformats when you leave the field or when
 * the value changes from somewhere else (e.g. "Reset").
 */
function NumberInput({ value, onChange, format = v => String(v), min, max, step = 'any', ariaLabel, style }) {
  const [text, setText] = useState(Number.isFinite(value) ? format(value) : '');
  const [focused, setFocused] = useState(false);
  const lastSent = useRef(value); // the value this field last reported

  useEffect(() => {
    // Reformat when not typing, or when the value was changed from elsewhere (e.g. Reset).
    const changedElsewhere = !(Number.isFinite(value) && Number.isFinite(lastSent.current) && Math.abs(value - lastSent.current) < 1e-9);
    if (!focused || changedElsewhere) {
      setText(Number.isFinite(value) ? format(value) : '');
      lastSent.current = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      className="form-input"
      aria-label={ariaLabel}
      value={text}
      style={style}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={e => {
        const raw = e.target.value;
        setText(raw);
        const parsed = parseFloat(raw.replace(/[,$%\s]/g, ''));
        if (raw.trim() === '') return; // wait for a number
        if (Number.isFinite(parsed)) {
          let v = parsed;
          if (min !== undefined) v = Math.max(min, v);
          if (max !== undefined) v = Math.min(max, v);
          lastSent.current = v;
          onChange(v);
        }
      }}
      onKeyDown={e => {
        if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
        e.preventDefault();
        const inc = typeof step === 'number' ? step : 1;
        let v = (Number.isFinite(value) ? value : 0) + (e.key === 'ArrowUp' ? inc : -inc);
        if (min !== undefined) v = Math.max(min, v);
        if (max !== undefined) v = Math.min(max, v);
        v = Math.round(v * 1e6) / 1e6;
        setText(format(v));
        lastSent.current = v;
        onChange(v);
      }}
    />
  );
}

function SourceButton({ cellRef, onClick }) {
  return (
    <button className="kpi-source-btn" title={`Excel source: ${cellRef}`} aria-label={`Show Excel source (${cellRef})`} onClick={onClick}>
      <FileSpreadsheet size={14} aria-hidden="true" />
    </button>
  );
}

function Field({ label, unit, cellRef, description, value, baseValue, format, onChange, onInspectCell, min, max, step, bare, compact }) {
  const isChanged = Number.isFinite(value) && Number.isFinite(baseValue) && Math.abs(value - baseValue) > 1e-9;
  const body = (
    <>
      {!bare ? (
        <div className="editor-card-head">
          <span className="editor-card-title">{label}</span>
          {cellRef && <SourceButton cellRef={cellRef} onClick={() => onInspectCell?.({ cell: cellRef, name: label, unit, description, value })} />}
        </div>
      ) : (
        <div className="field-label" style={{ marginTop: 'var(--space-2)' }}>{label}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <NumberInput value={value} format={format} min={min} max={max} step={step} onChange={onChange} ariaLabel={label} />
        <span className="field-unit">{unit}</span>
      </div>
      {isChanged ? (
        <div className="field-changed">
          <span>Workbook: {unit?.startsWith('$') ? '$' : ''}{format(baseValue)}{unit === '%' ? '%' : ''}</span>
          <button className="field-reset" onClick={() => onChange(baseValue)} aria-label={`Reset ${label} to workbook value`}>
            <Undo2 size={12} aria-hidden="true" /> Reset
          </button>
        </div>
      ) : (
        description && !compact && <p className="field-help">{description}</p>
      )}
    </>
  );
  if (bare) return <div className={isChanged ? 'field-bare changed' : 'field-bare'}>{body}</div>;
  return <div className={`glass-panel editor-card${isChanged ? ' changed' : ''}`}>{body}</div>;
}
