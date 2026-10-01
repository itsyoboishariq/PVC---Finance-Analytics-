import React, { useState } from 'react';
import { X, Save, Copy, Trash2, Edit2, Check, FolderOpen } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

export default function ScenarioManagerModal({
  isOpen,
  onClose,
  scenarios,
  onSaveScenario,
  onLoadScenario,
  onDuplicateScenario,
  onDeleteScenario,
  onRenameScenario,
  activeScenarioName
}) {
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newScenarioDesc, setNewScenarioDesc] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!newScenarioName.trim()) return;
    onSaveScenario(newScenarioName.trim(), newScenarioDesc.trim());
    setNewScenarioName('');
    setNewScenarioDesc('');
  };

  const handleStartRename = (sc) => {
    setEditingId(sc.id);
    setEditName(sc.name);
  };

  const handleSaveRename = (id) => {
    if (editName.trim()) {
      onRenameScenario(id, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', background: '#162032' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderOpen size={18} color="#60a5fa" />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Scenario Manager (Local JSON & Storage)
            </h4>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Create New Scenario Form */}
          <form onSubmit={handleSave} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#60a5fa', marginBottom: '10px' }}>
              Save Active Assumptions as New Scenario
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Scenario Name (e.g. Bull Case 2027)"
                value={newScenarioName}
                onChange={e => setNewScenarioName(e.target.value)}
                required
              />
              <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                <Save size={14} /> Save Scenario
              </button>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="Optional notes / description..."
              value={newScenarioDesc}
              onChange={e => setNewScenarioDesc(e.target.value)}
            />
          </form>

          {/* Scenario List */}
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Saved Scenarios ({scenarios.length})
          </div>

          <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scenarios.map(sc => {
              const isActive = activeScenarioName === sc.name;

              return (
                <div
                  key={sc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    background: isActive ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: isActive ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    gap: '12px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingId === sc.id ? (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                        />
                        <button className="btn-primary" style={{ padding: '4px 8px' }} onClick={() => handleSaveRename(sc.id)}>
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {sc.name}
                          </span>
                          {isActive && (
                            <span style={{ fontSize: '0.7rem', background: '#2563eb', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              Active
                            </span>
                          )}
                        </div>
                        {sc.description && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sc.description}
                          </div>
                        )}
                        {sc.summary_kpis && (
                          <div style={{ fontSize: '0.72rem', color: '#93c5fd', marginTop: '4px' }}>
                            Rev: {formatCurrency(sc.summary_kpis.total_revenue_sum, 0)} | EBIT: {formatCurrency(sc.summary_kpis.total_ebit_sum, 0)}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={() => onLoadScenario(sc.id)}
                      title="Load scenario"
                    >
                      Load
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 8px' }}
                      onClick={() => onDuplicateScenario(sc.id)}
                      title="Duplicate scenario"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 8px' }}
                      onClick={() => handleStartRename(sc)}
                      title="Rename scenario"
                    >
                      <Edit2 size={13} />
                    </button>
                    {sc.id !== 'baseline' && (
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 8px', color: '#fb7185' }}
                        onClick={() => onDeleteScenario(sc.id)}
                        title="Delete scenario"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 20px', borderTop: '1px solid var(--border-subtle)', background: '#111827' }}>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
