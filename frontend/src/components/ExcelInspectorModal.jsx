import React from 'react';
import { X, FileSpreadsheet, Code, Info, Check } from 'lucide-react';

export default function ExcelInspectorModal({ cellInfo, onClose }) {
  if (!cellInfo) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: '#162032' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={18} color="#60a5fa" />
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Excel Workbook Cell Inspector
            </h4>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Workbook Reference:</span>
            <span className="cell-badge" style={{ fontSize: '0.85rem', padding: '3px 8px' }}>
              {cellInfo.cell}
            </span>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              Metric Name
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {cellInfo.name || 'Financial Metric'}
            </div>
          </div>

          {cellInfo.formula && (
            <div style={{ background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', padding: '14px', marginBottom: '16px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                <Code size={13} />
                Original Excel Formula
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#60a5fa', wordBreak: 'break-all' }}>
                {cellInfo.formula}
              </div>
            </div>
          )}

          {cellInfo.value !== undefined && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Evaluated Value</div>
                <div className="num-val" style={{ fontSize: '1.1rem', fontWeight: 600, color: '#34d399', marginTop: '2px' }}>
                  {cellInfo.value}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Unit / Precision</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {cellInfo.unit || 'Standard'}
                </div>
              </div>
            </div>
          )}

          {cellInfo.description && (
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '6px' }}>
              <Info size={16} color="#9ca3af" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{cellInfo.description}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', background: '#111827' }}>
          <button className="btn-primary" onClick={onClose} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
            <Check size={14} /> Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
