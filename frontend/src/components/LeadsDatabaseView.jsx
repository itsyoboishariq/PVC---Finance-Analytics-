import React, { useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { exportLeadsToCsv } from '../utils/export';
import { Search, Download, CheckCircle, XCircle, Database } from 'lucide-react';

export default function LeadsDatabaseView({ leadsList, onInspectCell }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterConverted, setFilterConverted] = useState('ALL');

  if (!leadsList) return null;

  const filtered = leadsList.filter(item => {
    const matchesSearch =
      item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.primary_contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterConverted === 'ALL' ||
      item.customer_converted.toUpperCase() === filterConverted;

    return matchesSearch && matchesStatus;
  });

  const totalLeadsCount = leadsList.length;
  const convertedCount = leadsList.filter(l => l.customer_converted.toLowerCase() === 'yes').length;
  const totalContractVal = leadsList.reduce((acc, l) => acc + (l.contract_amount_yearly || 0), 0);

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} color="#3b82f6" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Lead Generation Prospect Database
            </h3>
            <button
              className="cell-badge"
              onClick={() => onInspectCell({
                cell: 'Lead Generation !H4',
                name: 'Total Leads Formula',
                formula: '=COUNT(F4:F69)',
                value: '66 leads',
                description: 'Formula in cell H4 of sheet "Lead Generation " linking to Financial Model cell C20'
              })}
            >
              Lead Generation!H4: =COUNT(F4:F69)
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            All 66 raw prospect records directly feeding into Month 1 acquisition funnel
          </p>
        </div>

        <button className="btn-secondary" onClick={() => exportLeadsToCsv(leadsList)}>
          <Download size={14} />
          Export Leads CSV
        </button>
      </div>

      {/* Mini KPI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="glass-panel" style={{ padding: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Leads (H4)</div>
          <div className="num-val" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#60a5fa' }}>{totalLeadsCount}</div>
        </div>
        <div className="glass-panel" style={{ padding: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Converted Leads</div>
          <div className="num-val" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#34d399' }}>
            {convertedCount} ({((convertedCount / totalLeadsCount) * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '12px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Contract Pipeline</div>
          <div className="num-val" style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b' }}>
            {formatCurrency(totalContractVal, 0)}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '32px' }}
            placeholder="Search by customer name, contact, or summary..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          {['ALL', 'YES', 'NO'].map(status => (
            <button
              key={status}
              onClick={() => setFilterConverted(status)}
              style={{
                background: filterConverted === status ? '#2563eb' : 'rgba(255,255,255,0.05)',
                color: filterConverted === status ? '#fff' : '#9ca3af',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {status === 'ALL' ? 'All Leads' : status === 'YES' ? 'Converted Only' : 'Unconverted'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="model-table-container" style={{ maxHeight: '420px', overflowY: 'auto' }}>
        <table className="model-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Row</th>
              <th>Customer Name</th>
              <th>Date Found</th>
              <th>Primary Contact</th>
              <th>Summary</th>
              <th style={{ textAlign: 'center' }}>Converted</th>
              <th>Contract Amount (Yearly)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.row}>
                <td style={{ textAlign: 'center', color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
                  {item.row}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.customer_name}
                </td>
                <td className="num-val" style={{ color: 'var(--text-secondary)' }}>
                  {item.date_found}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {item.primary_contact || '—'}
                </td>
                <td style={{ color: '#9ca3af', maxWidth: '320px', whiteSpace: 'normal', fontSize: '0.78rem' }}>
                  {item.summary}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {item.customer_converted.toLowerCase() === 'yes' ? (
                    <span style={{ color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                      <CheckCircle size={13} /> Yes
                    </span>
                  ) : (
                    <span style={{ color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <XCircle size={13} /> No
                    </span>
                  )}
                </td>
                <td className="num-val" style={{ fontWeight: 600, color: item.contract_amount_yearly > 0 ? '#60a5fa' : '#6b7280' }}>
                  {formatCurrency(item.contract_amount_yearly, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
