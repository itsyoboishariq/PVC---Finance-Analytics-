import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { RotateCcw, Sliders, DollarSign, Users, Cpu, FileSpreadsheet, AlertCircle, PlusCircle, Trash2 } from 'lucide-react';

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

  const updateField = (field, val) => {
    onChange({ ...assumptions, [field]: val });
  };

  const updatePricing = (tier, field, val) => {
    onChange({
      ...assumptions,
      pricing_tiers: {
        ...assumptions.pricing_tiers,
        [tier]: {
          ...assumptions.pricing_tiers[tier],
          [field]: val
        }
      }
    });
  };

  const updateCOGS = (field, val) => {
    onChange({
      ...assumptions,
      cogs: {
        ...assumptions.cogs,
        [field]: val
      }
    });
  };

  const updateOpex = (index, val) => {
    const newOpex = [...assumptions.opex];
    newOpex[index] = { ...newOpex[index], value: val };
    onChange({ ...assumptions, opex: newOpex });
  };

  // --- Custom line items (user-added assumptions not in the workbook) ---
  const customItems = assumptions.custom_items || [];

  const setCustomItems = (items) => onChange({ ...assumptions, custom_items: items });

  const addCustomItem = (kind) => {
    const defaults = {
      expense: 'New expense',
      direct_cost: 'New direct cost',
      revenue: 'New revenue stream',
    };
    setCustomItems([
      ...customItems,
      {
        id: `custom_${Date.now()}`,
        name: defaults[kind],
        kind,
        basis: 'per_month',
        amount: 0,
        start_month: 1,
      },
    ]);
  };

  const updateCustomItem = (id, field, val) => {
    setCustomItems(customItems.map(item => (item.id === id ? { ...item, [field]: val } : item)));
  };

  const removeCustomItem = (id) => {
    setCustomItems(customItems.filter(item => item.id !== id));
  };

  const updateMonthlyLead = (col, val) => {
    onChange({
      ...assumptions,
      monthly_leads: {
        ...assumptions.monthly_leads,
        [col]: val
      }
    });
  };

  const bulkModifyLeads = (multiplier) => {
    const updated = {};
    for (const [col, val] of Object.entries(assumptions.monthly_leads)) {
      updated[col] = Math.max(0, Math.round(val * multiplier));
    }
    onChange({ ...assumptions, monthly_leads: updated });
  };

  // Tier Percentage Sum check
  const tiers = assumptions.pricing_tiers;
  const tierSum = (tiers?.trial?.customer_pct || 0) + (tiers?.pro?.customer_pct || 0) + (tiers?.enterprise?.customer_pct || 0);
  const isTierSumValid = Math.abs(tierSum - 1.0) < 0.001;

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Model Assumptions & Operational Inputs
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Workbook-backed financial levers. Each field corresponds to an original cell in <code>'Assumptions  '</code>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={onResetDefaults}
            title="Reset all inputs back to original Excel defaults"
          >
            <RotateCcw size={14} />
            Reset to Workbook Defaults
          </button>
        </div>
      </div>

      {/* Editor Sub-Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px', marginBottom: '18px', overflowX: 'auto' }}>
        {[
          { id: 'funnel', label: 'Funnel & Customers', icon: Users },
          { id: 'pricing', label: 'SaaS Pricing & Tiers', icon: DollarSign },
          { id: 'cogs', label: 'COGS Parameters', icon: Cpu },
          { id: 'opex', label: 'OPEX Line Items', icon: Sliders },
          { id: 'leads', label: 'Monthly Leads (M1–M23)', icon: FileSpreadsheet },
          { id: 'custom', label: `Add Your Own${customItems.length ? ` (${customItems.length})` : ''}`, icon: PlusCircle },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: activeTab === tab.id ? '#60a5fa' : '#9ca3af',
                border: activeTab === tab.id ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap'
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: FUNNEL & CUSTOMERS */}
      {activeTab === 'funnel' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <AssumptionCard
            label="Beginning Active Customers"
            cellRef="Assumptions !B3"
            unit="customers"
            formula="Direct input"
            description="Initial customer count at start of Month 1"
            value={assumptions.beginning_customers}
            onChange={v => updateField('beginning_customers', Math.max(0, parseFloat(v) || 0))}
            onInspectCell={onInspectCell}
            min={0}
            step={1}
          />
          <AssumptionCard
            label="Monthly Churn Rate"
            cellRef="Assumptions !B5"
            unit="%"
            isPct
            formula="Direct input"
            description="Customer attrition percentage applied monthly"
            value={assumptions.monthly_churn}
            onChange={v => updateField('monthly_churn', Math.min(1, Math.max(0, parseFloat(v) / 100 || 0)))}
            onInspectCell={onInspectCell}
            min={0}
            max={100}
            step={0.5}
          />
          <AssumptionCard
            label="Lead → Trial Conversion"
            cellRef="Assumptions !B19"
            unit="%"
            isPct
            formula="Direct input"
            description="Percentage of top-of-funnel leads that start a trial"
            value={assumptions.lead_to_trial_conversion}
            onChange={v => updateField('lead_to_trial_conversion', Math.min(1, Math.max(0, parseFloat(v) / 100 || 0)))}
            onInspectCell={onInspectCell}
            min={0}
            max={100}
            step={1}
          />
          <AssumptionCard
            label="Trial → Paid Conversion"
            cellRef="Assumptions !B20"
            unit="%"
            isPct
            formula="Direct input"
            description="Percentage of trial users converting into paying customers"
            value={assumptions.trial_to_paid_conversion}
            onChange={v => updateField('trial_to_paid_conversion', Math.min(1, Math.max(0, parseFloat(v) / 100 || 0)))}
            onInspectCell={onInspectCell}
            min={0}
            max={100}
            step={0.5}
          />
        </div>
      )}

      {/* TAB 2: SAAS PRICING & TIERS */}
      {activeTab === 'pricing' && (
        <div>
          {!isTierSumValid && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#fca5a5' }}>
              <AlertCircle size={16} />
              <span>Warning: Tier customer percentages sum to {(tierSum * 100).toFixed(1)}% (should sum to 100%).</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {/* Trial Tier */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, color: '#93c5fd' }}>Trial Tier</span>
                <button className="cell-badge" onClick={() => onInspectCell({ cell: 'Assumptions !B12:C12', name: 'Trial Tier', formula: 'Price: B12 ($0), Share: C12 (60%)' })}>
                  Assumptions!B12:C12
                </button>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Price / Month ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={tiers.trial.price_per_month}
                  onChange={e => updatePricing('trial', 'price_per_month', parseFloat(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Customer Share (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={(tiers.trial.customer_pct * 100).toFixed(1)}
                  onChange={e => updatePricing('trial', 'customer_pct', (parseFloat(e.target.value) || 0) / 100)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            {/* Pro Tier */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, color: '#60a5fa' }}>Pro Tier</span>
                <button className="cell-badge" onClick={() => onInspectCell({ cell: 'Assumptions !B13:C13', name: 'Pro Tier', formula: 'Price: B13 ($20), Share: C13 (30%)' })}>
                  Assumptions!B13:C13
                </button>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Price / Month ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={tiers.pro.price_per_month}
                  onChange={e => updatePricing('pro', 'price_per_month', parseFloat(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Customer Share (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={(tiers.pro.customer_pct * 100).toFixed(1)}
                  onChange={e => updatePricing('pro', 'customer_pct', (parseFloat(e.target.value) || 0) / 100)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>

            {/* Enterprise Tier */}
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>Enterprise Tier</span>
                <button className="cell-badge" onClick={() => onInspectCell({ cell: 'Assumptions !B14:C14', name: 'Enterprise Tier', formula: 'Price: B14 ($80), Share: C14 (10%)' })}>
                  Assumptions!B14:C14
                </button>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Price / Month ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={tiers.enterprise.price_per_month}
                  onChange={e => updatePricing('enterprise', 'price_per_month', parseFloat(e.target.value) || 0)}
                  min={0}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Customer Share (%)</label>
                <input
                  type="number"
                  className="form-input"
                  value={(tiers.enterprise.customer_pct * 100).toFixed(1)}
                  onChange={e => updatePricing('enterprise', 'customer_pct', (parseFloat(e.target.value) || 0) / 100)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COGS PARAMETERS */}
      {activeTab === 'cogs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <AssumptionCard
            label="Cloud Hosting (Fixed)"
            cellRef="Financial Model !C37"
            unit="$/mo"
            formula="Fixed $45/mo across model"
            description="Base cloud infrastructure hosting costs"
            value={assumptions.cogs.cloud_hosting_fixed}
            onChange={v => updateCOGS('cloud_hosting_fixed', Math.max(0, parseFloat(v) || 0))}
            onInspectCell={onInspectCell}
            min={0}
          />
          <AssumptionCard
            label="Payment Processing Fee"
            cellRef="Assumptions !B25"
            unit="%"
            isPct
            formula="=0.029*Total MRR"
            description="Stripe/merchant transaction fee (2.9% of MRR)"
            value={assumptions.cogs.payment_processing_pct}
            onChange={v => updateCOGS('payment_processing_pct', Math.max(0, parseFloat(v) / 100 || 0))}
            onInspectCell={onInspectCell}
            min={0}
            step={0.1}
          />
          <AssumptionCard
            label="Third-Party APIs (Customer Support)"
            cellRef="Assumptions !B26"
            unit="$/cust"
            formula="=1*Ending Active Cust"
            description="Support and tooling APIs ($1 per ending active customer)"
            value={assumptions.cogs.api_per_customer}
            onChange={v => updateCOGS('api_per_customer', Math.max(0, parseFloat(v) || 0))}
            onInspectCell={onInspectCell}
            min={0}
            step={0.25}
          />
          <AssumptionCard
            label="Other Direct Costs"
            cellRef="Assumptions !B27"
            unit="$/trial cust"
            formula="=1*Trial Tier Customers"
            description="Direct incremental cost per trial customer ($1/mo)"
            value={assumptions.cogs.other_direct_per_trial}
            onChange={v => updateCOGS('other_direct_per_trial', Math.max(0, parseFloat(v) || 0))}
            onInspectCell={onInspectCell}
            min={0}
            step={0.25}
          />
        </div>
      )}

      {/* TAB 4: OPEX LINE ITEMS */}
      {activeTab === 'opex' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {assumptions.opex.map((item, idx) => (
              <div key={idx} className="glass-panel" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                  <button
                    className="cell-badge"
                    onClick={() => onInspectCell({
                      cell: `Financial Model !Row ${item.row}`,
                      name: item.name,
                      formula: `Row ${item.row}: ${item.category}`,
                      description: `Category: ${item.category}`
                    })}
                  >
                    Row {item.row}
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>$</span>
                  <input
                    type="number"
                    className="form-input"
                    value={item.value}
                    onChange={e => updateOpex(idx, Math.max(0, parseFloat(e.target.value) || 0))}
                    min={0}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/mo</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: CUSTOM LINE ITEMS */}
      {activeTab === 'custom' && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
            Add assumptions that aren't in the workbook, such as a new hire, a marketing campaign or a consulting revenue stream.
            They flow straight into the forecast: expenses into OPEX, direct costs into COGS, and revenue into total revenue.
            The workbook's own numbers are unchanged until you add something here.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button className="btn-secondary" onClick={() => addCustomItem('expense')}>
              <PlusCircle size={14} /> Add expense
            </button>
            <button className="btn-secondary" onClick={() => addCustomItem('direct_cost')}>
              <PlusCircle size={14} /> Add direct cost
            </button>
            <button className="btn-secondary" onClick={() => addCustomItem('revenue')}>
              <PlusCircle size={14} /> Add revenue
            </button>
          </div>

          {customItems.length === 0 ? (
            <div style={{ border: '1px dashed var(--border-subtle)', borderRadius: '10px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No custom items yet. Use the buttons above to add one.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {customItems.map(item => (
                <div key={item.id} className="glass-panel" style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', alignItems: 'end' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)', gridColumn: 'span 2' }}>
                    Name
                    <input
                      type="text"
                      className="form-input"
                      value={item.name}
                      maxLength={80}
                      onChange={e => updateCustomItem(item.id, 'name', e.target.value)}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Type
                    <select className="form-input" value={item.kind} onChange={e => updateCustomItem(item.id, 'kind', e.target.value)}>
                      <option value="expense">Expense (OPEX)</option>
                      <option value="direct_cost">Direct cost (COGS)</option>
                      <option value="revenue">Revenue</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Amount ($)
                    <input
                      type="number"
                      className="form-input"
                      value={item.amount}
                      min={0}
                      step="any"
                      onChange={e => updateCustomItem(item.id, 'amount', Math.max(0, parseFloat(e.target.value) || 0))}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Charged
                    <select className="form-input" value={item.basis} onChange={e => updateCustomItem(item.id, 'basis', e.target.value)}>
                      <option value="per_month">Per month</option>
                      <option value="per_customer">Per active customer / month</option>
                    </select>
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Starts
                    <select className="form-input" value={item.start_month} onChange={e => updateCustomItem(item.id, 'start_month', parseInt(e.target.value, 10))}>
                      {Array.from({ length: 23 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {periods[i]?.label || `Month ${i + 1}`}
                        </option>
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
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MONTHLY LEADS EDITOR */}
      {activeTab === 'leads' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Edit monthly top-of-funnel lead counts (Month 1 starts at 66 from <code>='Lead Generation '!$H$4</code>)
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => bulkModifyLeads(1.1)}>+10% Leads</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => bulkModifyLeads(0.9)}>-10% Leads</button>
              <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => bulkModifyLeads(1.5)}>+50% Surge</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))', gap: '8px' }}>
            {Object.entries(assumptions.monthly_leads).map(([col, val], i) => (
              <div key={col} className="glass-panel" style={{ padding: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#60a5fa' }}>M{i + 1} ({col})</div>
                <input
                  type="number"
                  className="form-input"
                  style={{ textAlign: 'center', padding: '4px 6px', marginTop: '4px' }}
                  value={val}
                  onChange={e => updateMonthlyLead(col, Math.max(0, parseFloat(e.target.value) || 0))}
                  min={0}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssumptionCard({ label, cellRef, unit, formula, description, value, onChange, onInspectCell, isPct, min = 0, max, step = 1 }) {
  const displayVal = isPct ? (value * 100).toFixed(1) : value;

  return (
    <div className="glass-panel" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <button
          className="cell-badge"
          onClick={() => onInspectCell({ cell: cellRef, name: label, formula, unit, description })}
        >
          {cellRef}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <input
          type="number"
          className="form-input"
          value={displayVal}
          onChange={e => onChange(e.target.value)}
          min={min}
          max={max}
          step={step}
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '40px' }}>{unit}</span>
      </div>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>{description}</p>
    </div>
  );
}
