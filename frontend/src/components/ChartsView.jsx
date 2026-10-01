import React, { useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/formatters';

export default function ChartsView({ monthlyResults }) {
  const [activeChart, setActiveChart] = useState('revenue');
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!monthlyResults || monthlyResults.length === 0) return null;

  // Chart Dimensions
  const width = 850;
  const height = 300;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  // Periods
  const count = monthlyResults.length;
  const stepX = innerW / count;

  // Helper for max
  const maxRev = Math.max(...monthlyResults.map(m => m.total_mrr), 100);
  const maxCust = Math.max(...monthlyResults.map(m => m.ending_active_customers), 20);
  const minEbit = Math.min(...monthlyResults.map(m => m.ebit), -200);
  const maxEbit = Math.max(...monthlyResults.map(m => m.ebit), 400);

  return (
    <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Financial Performance & Trajectory Visualizations
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Dynamic charts reflecting workbook assumptions across all 23 monthly periods
          </p>
        </div>

        {/* Chart Selector Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px' }}>
          {[
            { id: 'revenue', label: 'Revenue Build (MRR)' },
            { id: 'profitability', label: 'EBIT & Profitability' },
            { id: 'customers', label: 'Customer Growth' },
            { id: 'funnel', label: 'Acquisition Funnel' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              style={{
                background: activeChart === tab.id ? '#2563eb' : 'transparent',
                color: activeChart === tab.id ? '#ffffff' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Container */}
      <div style={{ overflowX: 'auto', width: '100%', position: 'relative' }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', minWidth: '680px', height: 'auto', display: 'block' }}>
          {/* Background Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padding.top + innerH * (1 - pct);
            return (
              <g key={i}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
                <text x={padding.left - 8} y={y + 4} fill="#6b7280" fontSize="10" textAnchor="end" fontFamily="var(--font-mono)">
                  {activeChart === 'revenue' && formatCurrency(maxRev * pct, 0)}
                  {activeChart === 'customers' && Math.round(maxCust * pct)}
                  {activeChart === 'profitability' && formatCurrency(minEbit + (maxEbit - minEbit) * pct, 0)}
                  {activeChart === 'funnel' && Math.round(Math.max(...monthlyResults.map(m => m.leads_generated)) * pct)}
                </text>
              </g>
            );
          })}

          {/* Zero Axis for EBIT */}
          {activeChart === 'profitability' && minEbit < 0 && (
            <line
              x1={padding.left}
              y1={padding.top + innerH * (1 - (0 - minEbit) / (maxEbit - minEbit))}
              x2={width - padding.right}
              y2={padding.top + innerH * (1 - (0 - minEbit) / (maxEbit - minEbit))}
              stroke="rgba(244, 63, 94, 0.5)"
              strokeWidth="1.5"
            />
          )}

          {/* Bars / Lines rendering */}
          {activeChart === 'revenue' && (
            monthlyResults.map((m, idx) => {
              const x = padding.left + idx * stepX + stepX * 0.15;
              const barW = stepX * 0.7;
              const proH = (m.pro_plan_revenue / maxRev) * innerH;
              const entH = (m.enterprise_plan_revenue / maxRev) * innerH;

              const entY = padding.top + innerH - entH;
              const proY = entY - proH;

              return (
                <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} onMouseLeave={() => setHoveredIdx(null)}>
                  {/* Enterprise Bar */}
                  <rect x={x} y={entY} width={barW} height={Math.max(entH, 0)} fill="#3b82f6" rx="2" opacity={hoveredIdx === idx ? 1 : 0.85} />
                  {/* Pro Bar */}
                  <rect x={x} y={proY} width={barW} height={Math.max(proH, 0)} fill="#60a5fa" rx="2" opacity={hoveredIdx === idx ? 1 : 0.85} />
                </g>
              );
            })
          )}

          {activeChart === 'customers' && (
            <>
              {/* Customer line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                points={monthlyResults.map((m, idx) => {
                  const x = padding.left + idx * stepX + stepX * 0.5;
                  const y = padding.top + innerH * (1 - m.ending_active_customers / maxCust);
                  return `${x},${y}`;
                }).join(' ')}
              />
              {monthlyResults.map((m, idx) => {
                const x = padding.left + idx * stepX + stepX * 0.5;
                const y = padding.top + innerH * (1 - m.ending_active_customers / maxCust);
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={hoveredIdx === idx ? 5 : 3.5}
                    fill="#10b981"
                    stroke="#111827"
                    strokeWidth="1.5"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </>
          )}

          {activeChart === 'profitability' && (
            <>
              {/* Area for EBIT */}
              <polygon
                fill="rgba(52, 211, 153, 0.12)"
                points={`
                  ${padding.left + stepX * 0.5},${padding.top + innerH * (1 - (0 - minEbit) / (maxEbit - minEbit))}
                  ${monthlyResults.map((m, idx) => {
                    const x = padding.left + idx * stepX + stepX * 0.5;
                    const y = padding.top + innerH * (1 - (m.ebit - minEbit) / (maxEbit - minEbit));
                    return `${x},${y}`;
                  }).join(' ')}
                  ${padding.left + (count - 1) * stepX + stepX * 0.5},${padding.top + innerH * (1 - (0 - minEbit) / (maxEbit - minEbit))}
                `}
              />
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="2.5"
                points={monthlyResults.map((m, idx) => {
                  const x = padding.left + idx * stepX + stepX * 0.5;
                  const y = padding.top + innerH * (1 - (m.ebit - minEbit) / (maxEbit - minEbit));
                  return `${x},${y}`;
                }).join(' ')}
              />
              {monthlyResults.map((m, idx) => {
                const x = padding.left + idx * stepX + stepX * 0.5;
                const y = padding.top + innerH * (1 - (m.ebit - minEbit) / (maxEbit - minEbit));
                return (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={hoveredIdx === idx ? 5 : 3.5}
                    fill={m.ebit >= 0 ? '#34d399' : '#fb7185'}
                    stroke="#111827"
                    strokeWidth="1.5"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </>
          )}

          {activeChart === 'funnel' && (
            monthlyResults.map((m, idx) => {
              const maxL = Math.max(...monthlyResults.map(x => x.leads_generated), 100);
              const x = padding.left + idx * stepX + stepX * 0.15;
              const barW = stepX * 0.7;
              const h = (m.leads_generated / maxL) * innerH;
              const y = padding.top + innerH - h;
              return (
                <rect
                  key={idx}
                  x={x}
                  y={y}
                  width={barW}
                  height={Math.max(h, 0)}
                  fill="#8b5cf6"
                  rx="2"
                  opacity={hoveredIdx === idx ? 1 : 0.8}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })
          )}

          {/* Month Labels along bottom */}
          {monthlyResults.map((m, idx) => {
            const x = padding.left + idx * stepX + stepX * 0.5;
            return (
              <text
                key={idx}
                x={x}
                y={height - 12}
                fill={hoveredIdx === idx ? '#3b82f6' : '#6b7280'}
                fontSize="9"
                fontWeight={hoveredIdx === idx ? 'bold' : 'normal'}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
              >
                M{idx + 1}
              </text>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredIdx !== null && monthlyResults[hoveredIdx] && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '20px',
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              padding: '10px 14px',
              pointerEvents: 'none',
              boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
              fontSize: '0.8rem',
              zIndex: 10
            }}
          >
            <div style={{ fontWeight: 700, color: '#3b82f6', marginBottom: '4px' }}>
              {monthlyResults[hoveredIdx].label} ({monthlyResults[hoveredIdx].column})
            </div>
            <div>MRR: <span className="num-val" style={{ fontWeight: 600 }}>{formatCurrency(monthlyResults[hoveredIdx].total_mrr, 0)}</span></div>
            <div>EBIT: <span className="num-val" style={{ fontWeight: 600, color: monthlyResults[hoveredIdx].ebit >= 0 ? '#34d399' : '#fb7185' }}>{formatCurrency(monthlyResults[hoveredIdx].ebit, 0)}</span></div>
            <div>Ending Customers: <span className="num-val" style={{ fontWeight: 600 }}>{monthlyResults[hoveredIdx].ending_active_customers}</span></div>
            <div>Leads Generated: <span className="num-val" style={{ fontWeight: 600 }}>{monthlyResults[hoveredIdx].leads_generated}</span></div>
            <div>New Paid Customers: <span className="num-val" style={{ fontWeight: 600 }}>{monthlyResults[hoveredIdx].new_paid_customers}</span></div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '14px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
        {activeChart === 'revenue' && (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: '#60a5fa', borderRadius: '2px' }}></span> Pro Plan ($20/mo)
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px' }}></span> Enterprise Plan ($80/mo)
            </span>
          </>
        )}
        {activeChart === 'customers' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', background: '#10b981', borderRadius: '50%' }}></span> Ending Active Customers
          </span>
        )}
        {activeChart === 'profitability' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', background: '#34d399', borderRadius: '50%' }}></span> Monthly EBIT (Earnings Before Interest & Taxes)
          </span>
        )}
        {activeChart === 'funnel' && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', background: '#8b5cf6', borderRadius: '2px' }}></span> Top of Funnel Leads
          </span>
        )}
      </div>
    </div>
  );
}
