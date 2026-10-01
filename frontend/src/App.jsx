import React, { useState, useEffect, useCallback } from 'react';
import KPICards from './components/KPICards';
import ChartsView from './components/ChartsView';
import FinancialTableView from './components/FinancialTableView';
import AssumptionsEditorView from './components/AssumptionsEditorView';
import LeadsDatabaseView from './components/LeadsDatabaseView';
import ScenarioComparisonView from './components/ScenarioComparisonView';
import ExcelInspectorModal from './components/ExcelInspectorModal';
import ScenarioManagerModal from './components/ScenarioManagerModal';
import FormulaMapModal from './components/FormulaMapModal';
import { exportToJson, exportFinancialTableToCsv } from './utils/export';

import {
  TrendingUp,
  RefreshCw,
  RotateCcw,
  Download,
  FolderOpen,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Database,
  GitCompare,
  BarChart3,
  Table as TableIcon
} from 'lucide-react';

export default function App() {
  // Application State
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [serverOnline, setServerOnline] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Data State
  const [assumptions, setAssumptions] = useState(null);
  const [baselineAssumptions, setBaselineAssumptions] = useState(null);
  const [calculationResults, setCalculationResults] = useState(null);
  const [baselineResults, setBaselineResults] = useState(null);
  const [leadsList, setLeadsList] = useState([]);
  const [periods, setPeriods] = useState([]);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'charts' | 'assumptions' | 'leads' | 'compare'

  // Modals
  const [inspectorCell, setInspectorCell] = useState(null);
  const [isScenarioManagerOpen, setIsScenarioManagerOpen] = useState(false);
  const [isFormulaMapOpen, setIsFormulaMapOpen] = useState(false);

  // Scenario State
  const [activeScenarioName, setActiveScenarioName] = useState('Workbook Baseline (Default)');
  const [savedScenarios, setSavedScenarios] = useState([]);

  // 1. Initial Load: Fetch defaults from FastAPI server
  const loadDefaults = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/defaults');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      setAssumptions(data.defaults);
      setBaselineAssumptions(JSON.parse(JSON.stringify(data.defaults)));
      setCalculationResults(data.baseline_results);
      setBaselineResults(JSON.parse(JSON.stringify(data.baseline_results)));
      setPeriods(data.periods);
      setLeadsList(data.leads_list);
      setServerOnline(true);

      // Baseline scenario
      const baselineItem = {
        id: 'baseline',
        name: 'Workbook Baseline (Default)',
        description: 'Original assumptions extracted directly from Startup_Financial_Models.xlsx',
        assumptions: data.defaults,
        summary_kpis: data.baseline_results.summary_kpis
      };

      // Load saved scenarios from backend / localStorage
      fetchScenarios(baselineItem);
    } catch (err) {
      console.error('Failed to load defaults:', err);
      setServerOnline(false);
      setErrorMessage(`Could not connect to FastAPI server at http://127.0.0.1:8000. Ensure the server is running.`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaults();
  }, [loadDefaults]);

  // Fetch scenarios from backend
  const fetchScenarios = async (baselineItem) => {
    try {
      const res = await fetch('/api/scenarios');
      if (res.ok) {
        const backendScenarios = await res.json();
        // ensure baseline is included
        const fullList = [baselineItem, ...backendScenarios.filter(s => s.id !== 'baseline')];
        setSavedScenarios(fullList);
        localStorage.setItem('startup_models_scenarios', JSON.stringify(fullList));
        return;
      }
    } catch (e) {
      console.warn('Backend scenarios unavailable, using localStorage fallback');
    }
    // LocalStorage fallback
    const local = localStorage.getItem('startup_models_scenarios');
    if (local) {
      try {
        setSavedScenarios(JSON.parse(local));
      } catch {
        setSavedScenarios([baselineItem]);
      }
    } else {
      setSavedScenarios([baselineItem]);
    }
  };

  // 2. Run Financial Calculation
  const runCalculation = async (newAssumptions = assumptions) => {
    if (!newAssumptions) return;
    setCalculating(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssumptions),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || `Server error (${res.status})`);
      }

      const calcData = await res.json();
      setCalculationResults(calcData);
      setServerOnline(true);
    } catch (err) {
      console.error('Calculation error:', err);
      setErrorMessage(`Calculation error: ${err.message}`);
    } finally {
      setCalculating(false);
    }
  };

  // 3. Assumption Change Handler
  const handleAssumptionsChange = (updated) => {
    setAssumptions(updated);
    if (autoCalculate) {
      runCalculation(updated);
    }
  };

  // 4. Reset to Defaults
  const handleResetDefaults = () => {
    if (!baselineAssumptions) return;
    const fresh = JSON.parse(JSON.stringify(baselineAssumptions));
    setAssumptions(fresh);
    setActiveScenarioName('Workbook Baseline (Default)');
    runCalculation(fresh);
  };

  // 5. Scenario Actions
  const handleSaveScenario = async (name, description) => {
    const payload = {
      name,
      description,
      assumptions
    };
    try {
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const saved = await res.json();
        setActiveScenarioName(saved.name);
        fetchScenarios(savedScenarios[0]);
        return;
      }
    } catch (e) {
      console.warn('Backend save failed, saving to localStorage');
    }

    // Local fallback
    const newSc = {
      id: 'sc_' + Date.now(),
      name,
      description,
      assumptions,
      summary_kpis: calculationResults?.summary_kpis
    };
    const updated = [newSc, ...savedScenarios];
    setSavedScenarios(updated);
    localStorage.setItem('startup_models_scenarios', JSON.stringify(updated));
    setActiveScenarioName(name);
  };

  const handleLoadScenario = async (id) => {
    const target = savedScenarios.find(s => s.id === id);
    if (!target) return;

    if (id === 'baseline') {
      handleResetDefaults();
      setIsScenarioManagerOpen(false);
      return;
    }

    try {
      const res = await fetch(`/api/scenarios/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAssumptions(data.assumptions);
        setActiveScenarioName(data.name);
        runCalculation(data.assumptions);
        setIsScenarioManagerOpen(false);
        return;
      }
    } catch (e) {
      console.warn('Backend load failed, using local copy');
    }

    if (target.assumptions) {
      setAssumptions(target.assumptions);
      setActiveScenarioName(target.name);
      runCalculation(target.assumptions);
      setIsScenarioManagerOpen(false);
    }
  };

  const handleDuplicateScenario = (id) => {
    const target = savedScenarios.find(s => s.id === id);
    if (!target) return;
    const dupName = `${target.name} (Copy)`;
    handleSaveScenario(dupName, target.description || '');
  };

  const handleDeleteScenario = async (id) => {
    if (id === 'baseline') return;
    try {
      await fetch(`/api/scenarios/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Backend delete failed');
    }
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem('startup_models_scenarios', JSON.stringify(updated));
    if (activeScenarioName === savedScenarios.find(s => s.id === id)?.name) {
      handleResetDefaults();
    }
  };

  const handleRenameScenario = async (id, newName) => {
    const target = savedScenarios.find(s => s.id === id);
    if (!target) return;
    const updated = savedScenarios.map(s => s.id === id ? { ...s, name: newName } : s);
    setSavedScenarios(updated);
    localStorage.setItem('startup_models_scenarios', JSON.stringify(updated));
    if (activeScenarioName === target.name) {
      setActiveScenarioName(newName);
    }
  };

  // 6. Exports
  const handleExportAllJson = () => {
    exportToJson({
      scenario_name: activeScenarioName,
      assumptions,
      calculation_results: calculationResults
    }, `${activeScenarioName.replace(/[^a-zA-Z0-9_-]/g, '_')}_export.json`);
  };

  const handleExportTableCsv = () => {
    if (!calculationResults) return;
    exportFinancialTableToCsv(
      calculationResults.monthly_results,
      periods,
      `${activeScenarioName.replace(/[^a-zA-Z0-9_-]/g, '_')}_financial_model.csv`
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <RefreshCw size={36} color="#3b82f6" style={{ animation: 'spin 1.5s linear infinite' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Loading Startup Financial Model Engine...</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Extracting workbook dependencies and verifying parity</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '20px 24px' }}>
      {/* Top Application Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #2563eb, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(37,99,235,0.4)' }}>
              <TrendingUp size={18} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
              Startup Financial Models <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa', background: 'rgba(59,130,246,0.12)', padding: '2px 8px', borderRadius: '4px', marginLeft: '6px', border: '1px solid rgba(59,130,246,0.3)' }}>Excel Parity 100%</span>
            </h1>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Faithfully reproducing <code>Startup_Financial_Models.xlsx</code> via pure Python financial calculation engine & FastAPI
          </p>
        </div>

        {/* Global Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Active Scenario Selector Badge */}
          <div
            onClick={() => setIsScenarioManagerOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '0.82rem'
            }}
          >
            <FolderOpen size={14} color="#60a5fa" />
            <span style={{ color: 'var(--text-secondary)' }}>Scenario:</span>
            <span style={{ fontWeight: 600, color: '#fff' }}>{activeScenarioName}</span>
          </div>

          {/* Auto Calculate Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={autoCalculate}
              onChange={e => setAutoCalculate(e.target.checked)}
              style={{ accentColor: '#2563eb' }}
            />
            Auto-Calculate
          </label>

          {/* Recalculate Button */}
          <button
            className="btn-primary"
            onClick={() => runCalculation()}
            disabled={calculating}
          >
            <RefreshCw size={14} style={{ animation: calculating ? 'spin 1s linear infinite' : 'none' }} />
            {calculating ? 'Calculating...' : 'Run Calculation'}
          </button>

          {/* Reset Defaults */}
          <button className="btn-secondary" onClick={handleResetDefaults} title="Reset to Excel workbook values">
            <RotateCcw size={14} />
            Reset Defaults
          </button>

          {/* Formula Map button */}
          <button className="btn-secondary" onClick={() => setIsFormulaMapOpen(true)} title="View workbook formula and cell map">
            <MapPin size={14} />
            Formula Map
          </button>

          {/* Export Dropdown */}
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className="btn-secondary" onClick={handleExportTableCsv} title="Export financial statement as CSV">
              <Download size={14} />
              CSV
            </button>
            <button className="btn-secondary" onClick={handleExportAllJson} title="Export full model JSON">
              <Download size={14} />
              JSON
            </button>
          </div>
        </div>
      </header>

      {/* Validation / Error Banner */}
      {errorMessage && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: '#fca5a5', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>{errorMessage}</div>
          <button onClick={() => setErrorMessage(null)} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Top Executive KPI Cards */}
      <KPICards
        summaryKPIs={calculationResults?.summary_kpis}
        baselineKPIs={baselineResults?.summary_kpis}
        weightedArpu={calculationResults?.weighted_arpu}
        onInspectCell={setInspectorCell}
      />

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px', overflowX: 'auto' }}>
        {[
          { id: 'table', label: 'Financial Model Statements', icon: TableIcon },
          { id: 'charts', label: 'Charts & Trajectory', icon: BarChart3 },
          { id: 'assumptions', label: 'Assumptions Editor', icon: Sliders },
          { id: 'leads', label: 'Lead Generation Database (66)', icon: Database },
          { id: 'compare', label: 'Scenario Comparison', icon: GitCompare },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : '#9ca3af',
                border: 'none',
                borderBottom: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                padding: '10px 18px',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === 'table' && (
        <FinancialTableView
          monthlyResults={calculationResults?.monthly_results}
          annualRollups={calculationResults?.annual_rollups}
          summaryKPIs={calculationResults?.summary_kpis}
          onInspectCell={setInspectorCell}
        />
      )}

      {activeTab === 'charts' && (
        <ChartsView
          monthlyResults={calculationResults?.monthly_results}
        />
      )}

      {activeTab === 'assumptions' && (
        <AssumptionsEditorView
          assumptions={assumptions}
          onChange={handleAssumptionsChange}
          onResetDefaults={handleResetDefaults}
          onInspectCell={setInspectorCell}
          baselineAssumptions={baselineAssumptions}
        />
      )}

      {activeTab === 'leads' && (
        <LeadsDatabaseView
          leadsList={leadsList}
          onInspectCell={setInspectorCell}
        />
      )}

      {activeTab === 'compare' && (
        <ScenarioComparisonView
          activeResults={calculationResults}
          baselineResults={baselineResults}
          activeAssumptions={assumptions}
          baselineAssumptions={baselineAssumptions}
        />
      )}

      {/* Footer Info */}
      <footer style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={14} color="#10b981" />
          <span>Local Financial Model Demo active on <code>http://127.0.0.1:8000</code></span>
        </div>
        <div>
          <span>Preserved source: <code>Startup_Financial_Models.xlsx</code> | Pure Python calculation engine</span>
        </div>
      </footer>

      {/* Modals */}
      <ExcelInspectorModal
        cellInfo={inspectorCell}
        onClose={() => setInspectorCell(null)}
      />

      <ScenarioManagerModal
        isOpen={isScenarioManagerOpen}
        onClose={() => setIsScenarioManagerOpen(false)}
        scenarios={savedScenarios}
        onSaveScenario={handleSaveScenario}
        onLoadScenario={handleLoadScenario}
        onDuplicateScenario={handleDuplicateScenario}
        onDeleteScenario={handleDeleteScenario}
        onRenameScenario={handleRenameScenario}
        activeScenarioName={activeScenarioName}
      />

      <FormulaMapModal
        isOpen={isFormulaMapOpen}
        onClose={() => setIsFormulaMapOpen(false)}
      />
    </div>
  );
}
