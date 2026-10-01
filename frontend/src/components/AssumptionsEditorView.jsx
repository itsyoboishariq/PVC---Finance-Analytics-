import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { RotateCcw, Sliders, DollarSign, Users, Cpu, FileSpreadsheet, AlertCircle } from 'lucide-react';

export default function AssumptionsEditorView({
  assumptions,
  onChange,
  onResetDefaults,
  onInspectCell,
  baselineAssumptions
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
