import React from 'react';
import { X, BookOpen, ExternalLink } from 'lucide-react';

export default function FormulaMapModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const mappings = [
    { section: 'Summary KPIs', row: 'Row 4', sheet: 'Financial Model ', cell: 'N4', formula: '=SUM(C28:Y28)', desc: 'Total cumulative customers across all 23 months' },
    { section: 'Summary KPIs', row: 'Row 10', sheet: 'Financial Model ', cell: 'N10', formula: '=SUM(C35:Y35)', desc: 'Total cumulative MRR revenue ($9,352 baseline)' },
    { section: 'Summary KPIs', row: 'Row 9', sheet: 'Financial Model ', cell: 'S9', formula: '=SUM(C56:Y56)', desc: 'Total cumulative EBIT ($1,456.99 baseline)' },
    { section: 'Lead Generation', row: 'Row 4', sheet: 'Lead Generation ', cell: 'H4', formula: '=COUNT(F4:F69)', desc: 'Total count of prospect leads (66 leads)' },
    { section: 'Acquisition Funnel', row: 'Row 20', sheet: 'Financial Model ', cell: 'C20', formula: "='Lead Generation '!$H$4", desc: 'Month 1 leads sourced from lead generation sheet count' },
    { section: 'Acquisition Funnel', row: 'Row 21', sheet: 'Financial Model ', cell: 'C21:Y21', formula: "='Assumptions  '!$B$19", desc: 'Lead to Trial Conversion rate (20.0%)' },
    { section: 'Acquisition Funnel', row: 'Row 22', sheet: 'Financial Model ', cell: 'C22:Y22', formula: '=Col20*Col21', desc: 'Trials Started (Leads * Conversion)' },
    { section: 'Acquisition Funnel', row: 'Row 23', sheet: 'Financial Model ', cell: 'C23:Y23', formula: "='Assumptions  '!$B$20", desc: 'Trial to Paid Conversion rate (5.0%)' },
    { section: 'Acquisition Funnel', row: 'Row 24', sheet: 'Financial Model ', cell: 'C24:Y24', formula: '=ROUNDUP(Col22*Col23, 0)', desc: 'New Paid Customers (rounded up away from zero)' },
    { section: 'Customer Waterfall', row: 'Row 25', sheet: 'Financial Model ', cell: 'C25', formula: "='Assumptions  '!$B$3", desc: 'Beginning active customers in Month 1 (10)' },
    { section: 'Customer Waterfall', row: 'Row 25', sheet: 'Financial Model ', cell: 'D25:Y25', formula: '=PrevCol28', desc: 'Beginning active customers in Months 2–23 (prior month ending)' },
    { section: 'Customer Waterfall', row: 'Row 26', sheet: 'Financial Model ', cell: 'C26:Y26', formula: "='Assumptions  '!$B$5", desc: 'Monthly customer churn rate (3.0%)' },
    { section: 'Customer Waterfall', row: 'Row 27', sheet: 'Financial Model ', cell: 'C27:Y27', formula: '=ROUNDUP(SUM(Col25:Col25)*Col26, 0)', desc: 'Churned customers (rounded up away from zero)' },
    { section: 'Customer Waterfall', row: 'Row 28', sheet: 'Financial Model ', cell: 'C28', formula: '=SUM(C25:C25)-C27', desc: 'Month 1 ending customers: Beginning - Churned (9)' },
    { section: 'Customer Waterfall', row: 'Row 28', sheet: 'Financial Model ', cell: 'D28:Y28', formula: '=SUM(Col24:Col25)-Col27', desc: 'Months 2–23 ending: New Paid + Beginning - Churned' },
    { section: 'Customer Breakdown', row: 'Row 29', sheet: 'Financial Model ', cell: 'C29:Y29', formula: "=ROUND(Col28*'Assumptions  '!$C$12, 1)", desc: 'Trial tier customers (60% of ending active, 1 decimal)' },
    { section: 'Customer Breakdown', row: 'Row 30', sheet: 'Financial Model ', cell: 'C30:Y30', formula: "=ROUND(Col28*'Assumptions  '!$C$13, 1)", desc: 'Pro tier customers (30% of ending active, 1 decimal)' },
    { section: 'Customer Breakdown', row: 'Row 31', sheet: 'Financial Model ', cell: 'C31:Y31', formula: "=ROUND(Col28*'Assumptions  '!$C$14, 1)", desc: 'Enterprise tier customers (10% of ending active, 1 decimal)' },
    { section: 'Revenue Build', row: 'Row 32', sheet: 'Financial Model ', cell: 'C32:Y32', formula: "='Assumptions  '!$B$12*Col29", desc: 'Trial tier revenue ($0 * Trial customers = $0)' },
    { section: 'Revenue Build', row: 'Row 33', sheet: 'Financial Model ', cell: 'C33:Y33', formula: "=Col30*'Assumptions  '!$B$13", desc: 'Pro tier revenue ($20 * Pro tier customers)' },
    { section: 'Revenue Build', row: 'Row 34', sheet: 'Financial Model ', cell: 'C34:Y34', formula: "='Assumptions  '!$B$14*'Financial Model '!Col31", desc: 'Enterprise tier revenue ($80 * Enterprise customers)' },
    { section: 'Revenue Build', row: 'Row 35', sheet: 'Financial Model ', cell: 'C35:Y35', formula: '=SUM(Col32:Col34)', desc: 'Total Monthly Recurring Revenue (MRR)' },
    { section: 'COGS', row: 'Row 37', sheet: 'Financial Model ', cell: 'C37:Y37', formula: '45', desc: 'Cloud hosting baseline ($45/mo flat)' },
    { section: 'COGS', row: 'Row 38', sheet: 'Financial Model ', cell: 'C38:Y38', formula: '=0.029*Col35', desc: 'Payment processing (2.9% of Total MRR)' },
    { section: 'COGS', row: 'Row 39', sheet: 'Financial Model ', cell: 'C39:Y39', formula: '=1*Col28', desc: 'Third-party APIs ($1 per ending active customer)' },
    { section: 'COGS', row: 'Row 40', sheet: 'Financial Model ', cell: 'C40:Y40', formula: '=1*Col29', desc: 'Other direct costs ($1 per trial tier customer)' },
    { section: 'COGS', row: 'Row 41', sheet: 'Financial Model ', cell: 'C41:Y41', formula: '=SUM(Col37:Col40)', desc: 'Total Cost of Goods Sold' },
    { section: 'OPEX', row: 'Row 53', sheet: 'Financial Model ', cell: 'C53:Y53', formula: '=SUM(Col42:Col52)', desc: 'Total Operating Expenses ($240/mo baseline)' },
    { section: 'EBIT', row: 'Row 56', sheet: 'Financial Model ', cell: 'C56:Y56', formula: '=Col35-Col41-Col53', desc: 'EBIT (Total MRR - Total COGS - Total OPEX)' },
    { section: 'Assumptions', row: 'Row 8', sheet: 'Assumptions  ', cell: 'B8', formula: '=(B12*C12)+(B13*C13)+(B14*C14)', desc: 'Weighted Average ARPU ($14.00 baseline)' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '820px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: '#162032' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="#60a5fa" />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Complete Workbook Formula & Cell Map
            </h4>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', maxHeight: '520px', overflowY: 'auto' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Every formula, dependency, and cell reference implemented in the Python calculation engine directly maps to <code>Startup_Financial_Models.xlsx</code>:
          </p>

          <table className="model-table" style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th>Section</th>
                <th>Sheet</th>
                <th>Cell / Range</th>
                <th>Excel Formula</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600, color: '#93c5fd' }}>{m.section}</td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{m.sheet}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#60a5fa' }}>{m.cell}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontSize: '0.75rem' }}>{m.formula}</td>
                  <td style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{m.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', background: '#111827' }}>
          <button className="btn-secondary" onClick={onClose}>Close Map</button>
        </div>
      </div>
    </div>
  );
}
