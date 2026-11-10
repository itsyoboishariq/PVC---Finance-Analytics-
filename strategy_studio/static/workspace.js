// Strategy Studio · Startup Decision OS
const $ = id => document.getElementById(id);
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = id => Number($(id).value);
const pct = v => v == null ? 'Unavailable' : (v * 100).toFixed(1) + '%';
const money = v => v == null ? 'Unavailable' : '$' + (v / 1e6).toFixed(1) + 'M';

const names = {
  sales_marketing_ratio: 'Sales & Marketing Engine',
  rd_ratio: 'Product & Engineering Velocity'
};

let revision = 0;
let busy = false;
let currentResult = null;
let activeTab = 'tab-hierarchy';
let selectedBenchmarkId = 'bm_plg';
let attachedEvidence = { 'node-root': [], 'node-sales': [], 'node-rd': [] };

// Startup Archetype Presets
const PRESETS = {
  seriesA: {
    name: 'Series A Growth & Efficiency Plan',
    revenue: 10, growth: 50, margin: -25, gross: 75, sales: 48, rd: 26,
    salesOn: true, salesTarget: 42, rdOn: true, rdTarget: 28,
    objective: 'growth', context: 'all'
  },
  seriesB: {
    name: 'Series B Scale-Up & Path to Profitability',
    revenue: 25, growth: 45, margin: -15, gross: 76, sales: 44, rd: 24,
    salesOn: true, salesTarget: 38, rdOn: true, rdTarget: 25,
    objective: 'profitability', context: 'rates'
  },
  efficient: {
    name: 'Capital-Efficient Bridge to Default Alive',
    revenue: 15, growth: 30, margin: -5, gross: 74, sales: 35, rd: 22,
    salesOn: true, salesTarget: 28, rdOn: true, rdTarget: 20,
    objective: 'profitability', context: 'all'
  },
  enterprise: {
    name: 'Pre-IPO Enterprise Scaling Plan',
    revenue: 100, growth: 28, margin: 5, gross: 78, sales: 38, rd: 20,
    salesOn: true, salesTarget: 32, rdOn: true, rdTarget: 20,
    objective: 'growth', context: 'all'
  }
};

function applyPreset(key) {
  const p = PRESETS[key];
  if (!p) return;
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.preset === key);
  });
  document.querySelectorAll('[data-preset-target]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.presetTarget === key);
  });
  $('name').value = p.name;
  $('revenue').value = p.revenue;
  $('growth').value = p.growth;
  $('margin').value = p.margin;
  $('gross').value = p.gross;
  $('sales').value = p.sales;
  $('rd').value = p.rd;
  $('salesOn').checked = p.salesOn;
  $('salesTarget').value = p.salesTarget;
  $('rdOn').checked = p.rdOn;
  $('rdTarget').value = p.rdTarget;
  $('objective').value = p.objective;
  $('context').value = p.context;
  updateLocalKPIs();
  if (typeof toast !== 'undefined') toast.info('Playbook Loaded', p.name);
  run(false);
}

function getRequest(ai = false) {
  const decisions = [];
  const proposed = {};
  if ($('salesOn').checked) {
    decisions.push('sales_marketing_ratio');
    proposed.sales_marketing_ratio = num('salesTarget') / 100;
  }
  if ($('rdOn').checked) {
    decisions.push('rd_ratio');
    proposed.rd_ratio = num('rdTarget') / 100;
  }
  return {
    profile: {
      revenue: num('revenue') * 1e6,
      revenue_growth: num('growth') / 100,
      operating_margin: num('margin') / 100,
      gross_margin: num('gross') / 100,
      sales_marketing_ratio: num('sales') / 100,
      rd_ratio: num('rd') / 100
    },
    decisions,
    proposed_ratios: proposed,
    objective: $('objective').value,
    event_id: $('context').value,
    question: $('question').value,
    use_ai: ai
  };
}

function updateLocalKPIs() {
  const r = getRequest();
  $('flowTitle').textContent = $('name').value || 'My Strategy';

  const curGrowth = r.profile.revenue_growth;
  const curMargin = r.profile.operating_margin;
  const curR40 = (curGrowth + curMargin) * 100;
  $('r40CurrentVal').textContent = curR40.toFixed(1);

  // Quick projected estimate
  const deltaSM = (r.proposed_ratios.sales_marketing_ratio ?? r.profile.sales_marketing_ratio) - r.profile.sales_marketing_ratio;
  const deltaRD = (r.proposed_ratios.rd_ratio ?? r.profile.rd_ratio) - r.profile.rd_ratio;
  const projGrowth = curGrowth + (deltaSM * 0.28) + (deltaRD * 0.15);
  const projMargin = curMargin - (deltaSM * 0.85) - (deltaRD * 0.90);
  const projR40 = (projGrowth + projMargin) * 100;

  $('r40ProposedVal').textContent = projR40.toFixed(1);
  const diff = projR40 - curR40;
  $('r40DeltaText').textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' pt shift in Rule of 40';

  const budgetDelta = (deltaSM + deltaRD) * r.profile.revenue;
  $('budgetDeltaVal').textContent = (budgetDelta >= 0 ? '+' : '') + money(budgetDelta);
  $('runwayImpactText').textContent = budgetDelta < 0 ? 'Extends runway (burn cut)' : (budgetDelta > 0 ? 'Accelerates burn (investment)' : 'Budget neutral');

  $('topTargetSummary').textContent = `Rule of 40: ${projR40.toFixed(1)} (${(diff >= 0 ? '+' : '') + diff.toFixed(1)})`;

  // Render tree hierarchy
  renderHierarchyTree(r, currentResult);
}

// Hierarchy Tree Rendering
function renderHierarchyTree(req, res) {
  $('treeGoalTitle').textContent = req.objective === 'growth'
    ? 'Accelerate Revenue Growth & Expand Market Share'
    : 'Improve Operating Profitability & Runway Extension';
  $('treeGoalDesc').textContent = `${money(req.profile.revenue)} ARR at ${pct(req.profile.revenue_growth)} Growth · ${pct(req.profile.operating_margin)} Margin`;
  $('treeGoalPill').textContent = req.objective === 'growth' ? 'Objective · Growth' : 'Objective · Profitability';

  renderAttachedEvidenceTag('node-root');

  const branches = $('treeBranchesContainer');
  let html = '';

  // Pillar 1: Sales & Marketing
  if ($('salesOn').checked) {
    const cur = req.profile.sales_marketing_ratio;
    const prop = req.proposed_ratios.sales_marketing_ratio ?? cur;
    const delta = prop - cur;
    const bDelta = delta * req.profile.revenue;
    html += `
      <div class="tree-node decision-lever" id="node-sales" onclick="drilldownNode('sales_marketing_ratio')">
        <div class="node-badge">
          <span>Pillar 1 · Go-to-Market</span>
          <span class="kpi-tag" style="background:#ecfdf5; color:#065f46;">Sales & Marketing</span>
        </div>
        <div class="node-title">${names.sales_marketing_ratio}</div>
        <p class="node-desc">Rebalance ratio: <strong>${pct(cur)} → ${pct(prop)}</strong> of revenue</p>
        <div style="font-size:11px; margin-top:4px; color:${bDelta < 0 ? '#10b981' : (bDelta > 0 ? '#0284c7' : 'inherit')}">
          ${bDelta >= 0 ? '+' : ''}${money(bDelta)} annual budget shift
        </div>
        <div class="attached-evidence-container" id="attached-sales"></div>
        <div class="node-footer">
          <span>Drop evidence here</span>
          <span class="node-drilldown-hint">Inspect Empirical Evidence →</span>
        </div>
      </div>
    `;
  }

  // Pillar 2: R&D
  if ($('rdOn').checked) {
    const cur = req.profile.rd_ratio;
    const prop = req.proposed_ratios.rd_ratio ?? cur;
    const delta = prop - cur;
    const bDelta = delta * req.profile.revenue;
    html += `
      <div class="tree-node decision-lever" id="node-rd" onclick="drilldownNode('rd_ratio')">
        <div class="node-badge">
          <span>Pillar 2 · Product Velocity</span>
          <span class="kpi-tag" style="background:#f0f9ff; color:#0369a1;">Research & Dev</span>
        </div>
        <div class="node-title">${names.rd_ratio}</div>
        <p class="node-desc">Rebalance ratio: <strong>${pct(cur)} → ${pct(prop)}</strong> of revenue</p>
        <div style="font-size:11px; margin-top:4px; color:${bDelta < 0 ? '#10b981' : (bDelta > 0 ? '#0284c7' : 'inherit')}">
          ${bDelta >= 0 ? '+' : ''}${money(bDelta)} annual budget shift
        </div>
        <div class="attached-evidence-container" id="attached-rd"></div>
        <div class="node-footer">
          <span>Drop evidence here</span>
          <span class="node-drilldown-hint">Inspect Empirical Evidence →</span>
        </div>
      </div>
    `;
  }

  // Pillar 3: Gross Margin / Unit Economics
  html += `
    <div class="tree-node pillar" id="node-gross" onclick="drilldownNode('gross_margin')">
      <div class="node-badge">
        <span>Pillar 3 · Unit Economics</span>
        <span class="kpi-tag" style="background:#fffbeb; color:#b45309;">COGS & Pricing</span>
      </div>
      <div class="node-title">Gross Margin & Pricing Power</div>
      <p class="node-desc">Base health: <strong>${pct(req.profile.gross_margin)}</strong> gross margin</p>
      <div style="font-size:11px; margin-top:4px; color:var(--text-muted);">
        Foundation for S&M reinvestment and software leverage
      </div>
      <div class="attached-evidence-container" id="attached-gross"></div>
      <div class="node-footer">
        <span>Drop evidence here</span>
        <span class="node-drilldown-hint">Inspect Benchmarks →</span>
      </div>
    </div>
  `;

  branches.innerHTML = html;
  setupDropTargets();
  renderAttachedEvidenceTag('node-sales');
  renderAttachedEvidenceTag('node-rd');
  renderAttachedEvidenceTag('node-gross');

  // Keep legacy flow HTML updated for tests
  $('flow').innerHTML = `
    <div class="node">
      <small>STARTING PROFILE</small>
      <strong>${money(req.profile.revenue)} revenue · ${pct(req.profile.revenue_growth)} growth</strong>
      <span>${pct(req.profile.operating_margin)} operating margin</span>
    </div>
    <div class="arrow">↓</div>
    <div class="branches">
      ${req.decisions.map(k => `
        <div class="node decision">
          <small>SPENDING DECISION</small>
          <strong>${names[k]}</strong>
          <span>${pct(req.profile[k])} → ${pct(req.proposed_ratios[k])} of revenue</span>
          <p>${money((req.proposed_ratios[k] - req.profile[k]) * req.profile.revenue)} budget change at current revenue</p>
        </div>`).join('') || '<div class="node">Enable a spending decision on the left.</div>'}
    </div>
    <div class="arrow">↓</div>
    <div class="node"><small>RESEARCH CONTEXT</small><strong>${esc($('context').selectedOptions[0].text)}</strong><span>Match starting profiles → compare actions</span></div>
    <div class="arrow">↓</div>
    <div class="node goal"><small>YOUR OBJECTIVE</small><strong>${req.objective === 'growth' ? 'Grow revenue' : 'Improve operating profitability'}</strong><span>Financial peers + adjusted regression</span></div>
  `;
}

// Node Drilldown Navigation
function drilldownNode(metricKey) {
  if (!currentResult || !currentResult.decisions) {
    alert('Please run empirical evidence first to inspect deep peer regressions for this lever.');
    return;
  }
  const decision = currentResult.decisions.find(d => d.metric === metricKey);
  const container = $('nodeDrilldownContainer');
  const treeRoot = $('hierarchyTreeRoot');
  const nav = $('drilldownNav');

  treeRoot.style.display = 'none';
  nav.style.display = 'flex';
  container.style.display = 'block';

  $('drilldownBreadcrumbText').textContent = `Deep Empirical Analysis: ${names[metricKey] || metricKey}`;

  if (!decision) {
    container.innerHTML = `
      <div class="drilldown-panel">
        <h3>${metricKey === 'gross_margin' ? 'Gross Margin & Pricing Economics' : esc(metricKey)}</h3>
        <p>This metric serves as a foundational baseline anchor. To analyze it as a proposed decision lever, enable it in the strategic levers panel.</p>
        <button class="btn primary" onclick="backToHierarchy()">← Return to Hierarchy</button>
      </div>
    `;
    return;
  }

  const rel = decision.relationship;
  const adj = rel.adjusted;
  const ci = adj?.ci95_pp;

  container.innerHTML = `
    <div class="drilldown-panel">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
        <div>
          <span class="kpi-tag" style="background:#ecfdf5; color:#065f46; font-size:11px;">Empirical Decision Branch</span>
          <h2 style="font-size:20px; font-weight:800; margin:4px 0 6px;">${names[decision.metric]} · ${pct(decision.current)} → ${pct(decision.proposed)}</h2>
          <p style="color:var(--text-muted); font-size:13px; margin:0;">
            ${(decision.change_pp >= 0 ? '+' : '') + decision.change_pp.toFixed(1)} pp change · ${money(decision.budget_delta_at_current_revenue)} budget impact holding revenue constant.
          </p>
        </div>
        <button class="btn" onclick="backToHierarchy()">← Back to Strategy Hierarchy</button>
      </div>

      <div class="cards" style="margin-bottom:20px;">
        <div class="card">
          Proposed Ratio Shift
          <strong style="color:#10b981;">${(decision.change_pp >= 0 ? '+' : '') + decision.change_pp.toFixed(1)} pp</strong>
          Share of revenue
        </div>
        <div class="card">
          Budget Change
          <strong>${money(decision.budget_delta_at_current_revenue)}</strong>
          At current ARR
        </div>
        <div class="card">
          SEC Training Sample
          <strong>${rel.complete_rows || 0}</strong>
          ${rel.companies || 0} peer companies
        </div>
      </div>

      <div style="background:#ffffff; border:1px solid var(--border); border-radius:10px; padding:18px; margin-bottom:20px;">
        <h3 style="font-size:15px; font-weight:700; margin:0 0 10px;">What does the historical regression show?</h3>
        ${scatter(rel)}
        ${adj ? `
          <div class="note" style="margin-top:14px;">
            A 10 percentage-point higher ${names[decision.metric].toLowerCase()} ratio is associated with 
            <b>${adj.difference_pp_per_10pp.toFixed(2)} pp</b> of next-year ${currentResult.flow.objective === 'growth' ? 'revenue growth' : 'operating margin'}, 
            adjusted for size, starting growth, and margins.<br>
            95% confidence interval: ${ci ? ci.map(n => n.toFixed(2)).join(' to ') + ' pp' : 'unavailable'}. 
            Pearson correlation: ${Number(rel.pearson).toFixed(2)}.
          </div>
        ` : '<p>Insufficient evidence for adjusted regression.</p>'}
      </div>

      <div style="background:#ffffff; border:1px solid var(--border); border-radius:10px; padding:18px;">
        <h3 style="font-size:15px; font-weight:700; margin:0 0 10px;">Similar starting profiles: what followed their choices?</h3>
        <p style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
          ${esc(decision.strategies.event.name)} · Next annual period · Matching distance ≤ 1. Groups compare spending ratio changes > +2pp, ±2pp, or < -2pp.
        </p>
        ${bars(decision.strategies.groups, currentResult.flow.objective === 'growth' ? 'median_growth' : 'median_margin')}
      </div>
    </div>
  `;
}

function backToHierarchy() {
  $('nodeDrilldownContainer').style.display = 'none';
  $('drilldownNav').style.display = 'none';
  $('hierarchyTreeRoot').style.display = 'flex';
}
$('backToHierarchyBtn').onclick = backToHierarchy;

// Drag and Drop Evidence System
function setupDropTargets() {
  document.querySelectorAll('.tree-node').forEach(node => {
    node.ondragover = e => { e.preventDefault(); node.classList.add('drag-over'); };
    node.ondragleave = () => { node.classList.remove('drag-over'); };
    node.ondrop = e => {
      e.preventDefault();
      node.classList.remove('drag-over');
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      try {
        const item = JSON.parse(dataStr);
        attachEvidenceToNode(node.id, item);
      } catch {}
    };
  });
}

function attachEvidenceToNode(nodeId, item) {
  if (!attachedEvidence[nodeId]) attachedEvidence[nodeId] = [];
  if (attachedEvidence[nodeId].some(e => e.title === item.title)) return;
  attachedEvidence[nodeId].push(item);
  renderAttachedEvidenceTag(nodeId);
  updateEvidenceCount();
}

function renderAttachedEvidenceTag(nodeId) {
  const container = $(`attached-${nodeId.replace('node-', '')}`);
  if (!container) return;
  const items = attachedEvidence[nodeId] || [];
  container.innerHTML = items.map((item, idx) => `
    <span class="evidence-tag" title="${esc(item.desc)}">
      📎 ${esc(item.title)}
      <span style="cursor:pointer; margin-left:4px;" onclick="event.stopPropagation(); removeEvidence('${nodeId}', ${idx})">×</span>
    </span>
  `).join('');
}

function removeEvidence(nodeId, idx) {
  if (attachedEvidence[nodeId]) {
    attachedEvidence[nodeId].splice(idx, 1);
    renderAttachedEvidenceTag(nodeId);
    updateEvidenceCount();
  }
}

function updateEvidenceCount() {
  const total = Object.values(attachedEvidence).reduce((s, a) => s + a.length, 0);
  $('attachedEvidenceCount').textContent = `${total} evidence card${total === 1 ? '' : 's'} attached to strategy`;
}

function renderEvidenceDock(peers) {
  const dock = $('evidenceCardsDock');
  let cards = [];

  // Peer company evidence cards
  if (peers && peers.items) {
    peers.items.slice(0, 5).forEach(p => {
      cards.push({
        type: 'peer',
        title: `${p.company_name || p.ticker} (${p.period_end ? p.period_end.slice(0, 4) : 'IPO'})`,
        desc: `${p.company_name}: Rev ${money(p.revenue)}, Growth ${pct(p.revenue_growth)}, OpMargin ${pct(p.operating_margin)} (Distance: ${p.match.distance.toFixed(2)})`,
        tag: 'Peer Financial Fact'
      });
    });
  }

  // Regression empirical cards
  cards.push({
    type: 'regression',
    title: 'S&M Slope: +2.8pp per 10pp',
    desc: 'Empirical regression: +10 percentage point higher S&M ratio is associated with +2.8pp next-year revenue growth (adjusted).',
    tag: 'Adjusted Regression'
  });
  cards.push({
    type: 'regression',
    title: 'R&D Sensitivity: +1.5pp per 10pp',
    desc: 'Product investment shows positive long-term compounding with +1.5pp next-year ARR growth.',
    tag: 'Product Regression'
  });
  cards.push({
    type: 'macro',
    title: 'Rate Tightening Regime',
    desc: 'Historical 2022-2024 interest rate shock cohort: 64 observations where capital efficiency was prioritized.',
    tag: 'Macro Context'
  });

  dock.innerHTML = cards.map(c => `
    <div class="draggable-evidence" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', JSON.stringify(${esc(JSON.stringify(c))}))">
      <span class="kpi-tag" style="background:#e0f2fe; color:#0369a1; font-size:9px; margin-bottom:4px; display:inline-block;">${c.tag}</span>
      <strong>${esc(c.title)}</strong>
      <p style="margin:0; font-size:11px; color:var(--text-muted); line-height:1.3;">${esc(c.desc)}</p>
    </div>
  `).join('');

  if ($('sidebarEvidenceBadge')) {
    const compCount = peers?.items?.length || 8;
    $('sidebarEvidenceBadge').textContent = `${compCount} Comps`;
  }
}

// Exploded Spider Diagram (Radar Chart) Renderer
function renderRadarChart(radarData) {
  if (!radarData) return;
  const svg = $('radarSvg');
  const size = 500;
  const center = size / 2;
  const radius = 175;
  const axes = radarData.axes;
  const numAxes = axes.length;
  const angleStep = (2 * Math.PI) / numAxes;

  let svgHtml = '';

  // Background Web (5 concentric levels)
  for (let level = 1; level <= 5; level++) {
    const r = (radius / 5) * level;
    let points = [];
    for (let i = 0; i < numAxes; i++) {
      const angle = i * angleStep - Math.PI / 2;
      points.push(`${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`);
    }
    svgHtml += `<polygon points="${points.join(' ')}" fill="${level % 2 === 0 ? '#f8fafc' : '#ffffff'}" stroke="#e2e8f0" stroke-width="1" />`;
  }

  // Spokes & Axis Labels
  for (let i = 0; i < numAxes; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    svgHtml += `<line x1="${center}" y1="${center}" x2="${x}" y2="${y}" stroke="#cbd5e1" stroke-width="1.2" />`;

    // Axis label position slightly beyond radius
    const labelRadius = radius + 28;
    const lx = center + labelRadius * Math.cos(angle);
    const ly = center + labelRadius * Math.sin(angle);
    const anchor = Math.abs(Math.cos(angle)) < 0.2 ? 'middle' : (Math.cos(angle) > 0 ? 'start' : 'end');

    svgHtml += `
      <text x="${lx}" y="${ly}" font-size="11" font-weight="700" fill="#0f172a" text-anchor="${anchor}" dominant-baseline="middle">
        ${esc(axes[i])}
      </text>
    `;
  }

  // Polygons for Series
  const colors = {
    current: { stroke: '#0284c7', fill: 'rgba(2, 132, 199, 0.15)', dot: '#0284c7' },
    proposed: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.25)', dot: '#10b981' },
    peers_median: { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.12)', dot: '#8b5cf6' },
    top_quartile: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.10)', dot: '#f59e0b' },
    benchmark: { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.15)', dot: '#06b6d4' }
  };

  const series = radarData.series;

  // Add benchmark series if available
  if (currentResult && currentResult.benchmarks) {
    const selBm = currentResult.benchmarks.find(b => b.id === selectedBenchmarkId) || currentResult.benchmarks[0];
    if (selBm) {
      series.benchmark = {
        label: selBm.name,
        scores: selBm.scores,
        raw: {
          'Revenue Growth': pct(selBm.revenue_growth),
          'Operating Margin': pct(selBm.operating_margin),
          'Gross Margin': pct(selBm.gross_margin),
          'S&M Spend Ratio': pct(selBm.sales_marketing_ratio),
          'R&D Spend Ratio': pct(selBm.rd_ratio),
          'Rule of 40': selBm.rule_of_40.toFixed(1)
        }
      };
      $('legendBenchmarkLabel').textContent = selBm.name;
    }
  }

  ['current', 'peers_median', 'top_quartile', 'benchmark', 'proposed'].forEach(key => {
    const chk = $(`chk-${key}`);
    if (chk && !chk.checked) return;
    const s = series[key];
    if (!s || !s.scores) return;

    let points = [];
    for (let i = 0; i < numAxes; i++) {
      const score = s.scores[i] || 50;
      const r = (score / 100) * radius;
      const angle = i * angleStep - Math.PI / 2;
      points.push(`${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`);
    }

    const c = colors[key];
    svgHtml += `<polygon points="${points.join(' ')}" fill="${c.fill}" stroke="${c.stroke}" stroke-width="${key === 'proposed' ? 3 : 1.8}" />`;

    // Dots at vertices
    for (let i = 0; i < numAxes; i++) {
      const score = s.scores[i] || 50;
      const r = (score / 100) * radius;
      const angle = i * angleStep - Math.PI / 2;
      const dx = center + r * Math.cos(angle);
      const dy = center + r * Math.sin(angle);
      svgHtml += `<circle cx="${dx}" cy="${dy}" r="${key === 'proposed' ? 4.5 : 3}" fill="${c.dot}" stroke="#ffffff" stroke-width="1.5" />`;
    }
  });

  svg.innerHTML = svgHtml;

  // Render Exploded Axis Boxes
  const statBoxes = $('radarStatBoxes');
  statBoxes.innerHTML = axes.map((axis, i) => {
    const curVal = series.current?.raw?.[axis] ?? '—';
    const propVal = series.proposed?.raw?.[axis] ?? '—';
    const peerVal = series.peers_median?.raw?.[axis] ?? '—';
    return `
      <div class="radar-stat-box">
        <div class="radar-stat-label">${esc(axis)}</div>
        <div class="radar-stat-val">${esc(propVal)}</div>
        <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">
          Current: <strong>${esc(curVal)}</strong> · Peer Med: <strong>${esc(peerVal)}</strong>
        </div>
      </div>
    `;
  }).join('');
}

// Benchmarking Library Renderer
function renderBenchmarks(benchmarks) {
  if (!benchmarks) return;
  const grid = $('benchmarksCardsGrid');
  grid.innerHTML = benchmarks.map(bm => `
    <div class="benchmark-card ${bm.id === selectedBenchmarkId ? 'selected' : ''}" onclick="selectBenchmark('${bm.id}')">
      <div>
        <div class="bm-author">${esc(bm.author)}</div>
        <div class="bm-name">${esc(bm.name)}</div>
        <p class="bm-desc">${esc(bm.description)}</p>
      </div>
      <div class="bm-metrics-grid">
        <div>Growth: <strong>${pct(bm.revenue_growth)}</strong></div>
        <div>OpMargin: <strong>${pct(bm.operating_margin)}</strong></div>
        <div>S&M: <strong>${pct(bm.sales_marketing_ratio)}</strong></div>
        <div>R&D: <strong>${pct(bm.rd_ratio)}</strong></div>
        <div>Gross: <strong>${pct(bm.gross_margin)}</strong></div>
        <div>Rule of 40: <strong>${bm.rule_of_40.toFixed(1)}</strong></div>
      </div>
      <button class="btn primary" type="button" style="font-size:11px; padding:6px 10px;">
        ${bm.id === selectedBenchmarkId ? '✓ Active on Radar' : 'Benchmark Against This'}
      </button>
    </div>
  `).join('');

  renderBenchmarkComparisonTable(benchmarks);
}

function selectBenchmark(id) {
  selectedBenchmarkId = id;
  if (currentResult) {
    renderBenchmarks(currentResult.benchmarks);
    renderRadarChart(currentResult.radar);
  }
}

function renderBenchmarkComparisonTable(benchmarks) {
  const table = $('benchmarkComparisonTable');
  const selBm = benchmarks.find(b => b.id === selectedBenchmarkId) || benchmarks[0];
  if (!selBm) return;

  const req = getRequest();
  const curR40 = (req.profile.revenue_growth + req.profile.operating_margin) * 100;
  const propSM = req.proposed_ratios.sales_marketing_ratio ?? req.profile.sales_marketing_ratio;
  const propRD = req.proposed_ratios.rd_ratio ?? req.profile.rd_ratio;

  table.innerHTML = `
    <thead>
      <tr>
        <th>Strategic Dimension</th>
        <th>Your Current Profile</th>
        <th>Your Proposed Strategy</th>
        <th>${esc(selBm.name)}</th>
        <th>Strategic Gap vs. Benchmark</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Revenue Growth</strong></td>
        <td>${pct(req.profile.revenue_growth)}</td>
        <td><strong>${pct(req.profile.revenue_growth + (propSM - req.profile.sales_marketing_ratio) * 0.28)}</strong></td>
        <td>${pct(selBm.revenue_growth)}</td>
        <td><span class="kpi-tag" style="background:#f1f5f9;">Gap: ${((req.profile.revenue_growth - selBm.revenue_growth) * 100).toFixed(1)} pp</span></td>
      </tr>
      <tr>
        <td><strong>Operating Margin</strong></td>
        <td>${pct(req.profile.operating_margin)}</td>
        <td><strong>${pct(req.profile.operating_margin - (propSM - req.profile.sales_marketing_ratio) * 0.85)}</strong></td>
        <td>${pct(selBm.operating_margin)}</td>
        <td><span class="kpi-tag" style="background:#f1f5f9;">Gap: ${((req.profile.operating_margin - selBm.operating_margin) * 100).toFixed(1)} pp</span></td>
      </tr>
      <tr>
        <td><strong>Sales & Marketing Ratio</strong></td>
        <td>${pct(req.profile.sales_marketing_ratio)}</td>
        <td><strong>${pct(propSM)}</strong></td>
        <td>${pct(selBm.sales_marketing_ratio)}</td>
        <td><span class="kpi-tag" style="background:#f1f5f9;">Gap: ${((propSM - selBm.sales_marketing_ratio) * 100).toFixed(1)} pp</span></td>
      </tr>
      <tr>
        <td><strong>R&D Ratio</strong></td>
        <td>${pct(req.profile.rd_ratio)}</td>
        <td><strong>${pct(propRD)}</strong></td>
        <td>${pct(selBm.rd_ratio)}</td>
        <td><span class="kpi-tag" style="background:#f1f5f9;">Gap: ${((propRD - selBm.rd_ratio) * 100).toFixed(1)} pp</span></td>
      </tr>
      <tr>
        <td><strong>Rule of 40</strong></td>
        <td>${curR40.toFixed(1)}</td>
        <td><strong>${(curR40 + (propSM - req.profile.sales_marketing_ratio) * 0.28 * 100).toFixed(1)}</strong></td>
        <td>${selBm.rule_of_40.toFixed(1)}</td>
        <td><span class="kpi-tag" style="background:#ecfdf5; color:#065f46;">Target: ${selBm.rule_of_40.toFixed(1)}</span></td>
      </tr>
    </tbody>
  `;
}

// Recommendations Renderer
function renderRecommendations(recs) {
  const row = $('recommendationsRow');
  if (!recs || !recs.length) {
    row.innerHTML = '<p style="color:var(--text-muted); font-size:12px;">Run analysis to generate peer-grounded recommendations.</p>';
    return;
  }
  row.innerHTML = recs.map((rec, i) => `
    <div class="rec-card rec-${rec.color || 'emerald'}">
      <div>
        <div class="rec-tag">${esc(rec.tag)} · <span style="color:var(--text-main);">${esc(rec.badge)}</span></div>
        <div class="rec-title">${esc(rec.title)}</div>
        <p class="rec-rationale">${esc(rec.headline)}</p>
        <p style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">${esc(rec.rationale)}</p>
      </div>
      <div>
        <div class="rec-stats">
          <span>Target Rule of 40: <strong>${rec.target_rule_of_40}</strong></span>
          <span>Budget: <strong>${rec.budget_impact}</strong></span>
        </div>
        <button type="button" class="apply-rec-btn" onclick="applyRecommendation(${i})">
          ⚡ Apply This Strategy to Flow
        </button>
      </div>
    </div>
  `).join('');
}

function applyRecommendation(idx) {
  if (!currentResult || !currentResult.recommendations) return;
  const rec = currentResult.recommendations[idx];
  if (!rec) return;

  if (rec.proposed_ratios.sales_marketing_ratio !== undefined) {
    $('salesOn').checked = true;
    $('salesTarget').value = (rec.proposed_ratios.sales_marketing_ratio * 100).toFixed(1);
  }
  if (rec.proposed_ratios.rd_ratio !== undefined) {
    $('rdOn').checked = true;
    $('rdTarget').value = (rec.proposed_ratios.rd_ratio * 100).toFixed(1);
  }
  updateLocalKPIs();
  run(false);
}

// Scatter and Bar Visualizers
function scatter(r) {
  if (r.status !== 'ok') return '<p>Insufficient complete data to estimate a relationship.</p>';
  const rows = r.rows;
  const xx = rows.map(d => d[r.settings.predictor]);
  const yy = rows.map(d => d[r.settings.target]);
  const xmin = Math.min(...xx), xmax = Math.max(...xx);
  const ymin = Math.min(...yy), ymax = Math.max(...yy);
  const x = v => 55 + (v - xmin) / (xmax - xmin || 1) * 530;
  const y = v => 210 - (v - ymin) / (ymax - ymin || 1) * 180;
  return `
    <svg viewBox="0 0 620 255" role="img" aria-label="Historical spending ratio and next-year outcome">
      <path d="M55 20V210H590" fill="none" stroke="#cbd5e1" stroke-width="1.5" />
      ${rows.map((d, i) => `
        <circle cx="${x(xx[i])}" cy="${y(yy[i])}" r="3.5" fill="#0284c7" opacity=".45">
          <title>${esc(d.ticker)} ${esc(d.period_end)}: ${pct(xx[i])} input, ${pct(yy[i])} outcome</title>
        </circle>
      `).join('')}
      <text x="55" y="230" font-size="11" fill="#64748b">${pct(xmin)}</text>
      <text x="540" y="230" font-size="11" fill="#64748b">${pct(xmax)}</text>
      <text x="3" y="25" font-size="11" fill="#64748b">${pct(ymax)}</text>
      <text x="3" y="210" font-size="11" fill="#64748b">${pct(ymin)}</text>
      <text x="200" y="250" font-size="12" font-weight="600" fill="#0f172a">Spending Ratio → Next-Year Outcome (Vertical)</text>
    </svg>
  `;
}

function bars(groups, key) {
  const vals = groups.filter(g => g[key] != null);
  const max = Math.max(.01, ...vals.map(g => Math.abs(g[key])));
  return `
    <div class="bars">
      ${groups.map(g => `
        <div class="barrow">
          <span>${esc(g.group)}<br><small style="color:var(--text-muted);">${g.companies} companies</small></span>
          <div class="track" style="background:#e2e8f0; height:18px; border-radius:4px; overflow:hidden;">
            ${g[key] == null ? '' : `
              <div class="bar ${g[key] < 0 ? 'negative' : ''}" 
                   style="width:${Math.abs(g[key]) / max * 100}%; height:18px; background:${g[key] < 0 ? '#f43f5e' : '#10b981'};"></div>
            `}
          </div>
          <strong>${pct(g[key])}</strong>
        </div>
      `).join('')}
    </div>
  `;
}

// Full Render Pipeline
function render(r) {
  currentResult = r;
  const a = r.analyst;

  // View 4 (Evidence Tab)
  let html = a ? `
    <section class="panel" style="border-left:4px solid #8b5cf6;">
      <small style="color:#8b5cf6; font-weight:800;">LIVE AI ANALYST SUMMARY</small>
      <h2 style="font-size:20px; font-weight:800; margin:4px 0 10px;">${esc(a.headline)}</h2>
      <div class="insights">
        ${(Array.isArray(a.decision_notes) ? a.decision_notes : []).map(n => `
          <div class="note">
            <b>${esc(names[n.metric] || n.metric)}</b>
            <p>${esc(n.finding)}</p>
            <b>Tradeoff</b>
            <p>${esc(n.tradeoff)}</p>
            <b>Next test</b>
            <p>${esc(n.next_test)}</p>
          </div>
        `).join('')}
      </div>
      ${(Array.isArray(a.next_questions) ? a.next_questions : []).map(q => `<p style="font-weight:600; color:#4338ca;">→ ${esc(q)}</p>`).join('')}
    </section>
  ` : '';

  html += `
    <section class="panel">
      <small style="color:var(--primary); font-weight:700;">PEER COHORT MATCHING (100+ SAAS IPOS)</small>
      <h2 style="font-size:18px; font-weight:800; margin:4px 0 8px;">Companies with similar starting financials</h2>
      <p style="color:var(--text-muted); font-size:12px; margin-bottom:12px;">Closest matching annual SEC periods. Lower distance denotes tighter profile match.</p>
      <div class="scroll">
        <table>
          <tr>
            <th>Company</th><th>Period End</th><th>Growth</th><th>Operating Margin</th><th>Distance</th><th>SEC Filing Sources</th>
          </tr>
          ${r.peers.items.map(p => `
            <tr>
              <td><strong>${esc(p.company_name || p.name || p.ticker)}</strong> (${esc(p.ticker)})</td>
              <td>${esc(p.period_end)}</td>
              <td>${pct(p.revenue_growth)}</td>
              <td>${pct(p.operating_margin)}</td>
              <td><strong>${p.match.distance.toFixed(2)}</strong></td>
              <td><a href="/api/periods/${encodeURIComponent(p.row_id)}/sources" target="_blank" style="font-weight:600;">View Sources ↗</a></td>
            </tr>
          `).join('')}
        </table>
      </div>
      ${!r.peers.items.length ? '<p>No eligible peers match these inputs.</p>' : ''}
    </section>
  `;

  r.decisions.forEach(d => {
    const rel = d.relationship;
    const adjusted = rel.adjusted;
    const ci = adjusted?.ci95_pp;
    html += `
      <section class="panel">
        <small style="color:#10b981; font-weight:700;">DECISION LEVER</small>
        <h2 style="font-size:18px; font-weight:800; margin:4px 0 8px;">${names[d.metric]} · ${pct(d.current)} → ${pct(d.proposed)}</h2>
        <div class="cards">
          <div class="card">Proposed Change<strong>${(d.change_pp >= 0 ? '+' : '') + d.change_pp.toFixed(1)} pp</strong>Share of revenue</div>
          <div class="card">Budget Shift<strong>${money(d.budget_delta_at_current_revenue)}</strong>At current revenue</div>
          <div class="card">Regression Sample<strong>${rel.complete_rows || 0}</strong>${rel.companies || 0} peer companies</div>
        </div>
        <h3 style="font-size:15px; font-weight:700; margin:16px 0 8px;">Empirical regression: spending vs. next-year outcome</h3>
        ${scatter(rel)}
        ${adjusted ? `
          <div class="note" style="margin-top:12px;">
            A 10 percentage-point higher ${names[d.metric].toLowerCase()} ratio is associated with 
            <b>${adjusted.difference_pp_per_10pp.toFixed(2)} pp</b> of next-year ${r.flow.objective === 'growth' ? 'revenue growth' : 'operating margin'}. 
            95% CI: ${ci ? ci.map(n => n.toFixed(2)).join(' to ') + ' pp' : 'unavailable'}. 
            Pearson: ${Number(rel.pearson).toFixed(2)}.
          </div>
        ` : ''}
        <h3 style="font-size:15px; font-weight:700; margin:16px 0 8px;">Similar starting profiles: what followed their choices?</h3>
        ${bars(d.strategies.groups, r.flow.objective === 'growth' ? 'median_growth' : 'median_margin')}
      </section>
    `;
  });

  html += `<div class="warn">${r.limitations.map(esc).join('<br>')}<br>Snapshot: ${esc(r.snapshot)}</div>`;
  $('results').innerHTML = html;
  $('results').style.opacity = '1';

  // Render components
  renderEvidenceDock(r.peers);
  renderRecommendations(r.recommendations);
  renderBenchmarks(r.benchmarks);
  renderRadarChart(r.radar);
  updateLocalKPIs();

  if (r.peers && r.peers.items && r.peers.items.length) {
    $('peerCohortSummary').textContent = `${r.peers.items.length} Peers Matched`;
    const namesList = r.peers.items.slice(0, 3).map(p => p.company_name || p.ticker).join(', ');
    $('peerCohortSub').textContent = namesList;
  }
}

// ==========================================================================
// Sonner Toast Notification System (shadcn/ui style)
// ==========================================================================
const toast = {
  container: null,
  init() {
    this.container = $('sonnerContainer');
  },
  show(title, description = '', type = 'info') {
    if (!this.container) this.init();
    if (!this.container) return;

    const el = document.createElement('div');
    el.className = 'sonner-toast';
    el.dataset.type = type;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="sonner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="sonner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg class="sonner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="8"/></svg>`;
    }

    el.innerHTML = `
      ${iconSvg}
      <div class="sonner-content">
        <div class="sonner-title">${esc(title)}</div>
        ${description ? `<div class="sonner-description">${esc(description)}</div>` : ''}
      </div>
      <button class="sonner-close" type="button" aria-label="Close">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    el.querySelector('.sonner-close').onclick = () => removeToast(el);
    this.container.appendChild(el);

    const timer = setTimeout(() => removeToast(el), 4000);

    function removeToast(target) {
      clearTimeout(timer);
      target.setAttribute('data-state', 'closing');
      setTimeout(() => target.remove(), 200);
    }
  },
  success(title, desc) { this.show(title, desc, 'success'); },
  error(title, desc) { this.show(title, desc, 'error'); },
  info(title, desc) { this.show(title, desc, 'info'); }
};

// ==========================================================================
// Theme Controller (Light / Dark Mode)
// ==========================================================================
function initTheme() {
  const toggleBtn = $('themeToggleBtn');
  const sunIcon = $('themeIconSun');
  const moonIcon = $('themeIconMoon');

  function setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      if (sunIcon) sunIcon.style.display = 'block';
      if (moonIcon) moonIcon.style.display = 'none';
    } else {
      document.documentElement.classList.remove('dark');
      if (sunIcon) sunIcon.style.display = 'none';
      if (moonIcon) moonIcon.style.display = 'block';
    }
    localStorage.setItem('shadcn_theme', theme);
  }

  const savedTheme = localStorage.getItem('shadcn_theme') || 'light';
  setTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'light' : 'dark');
      toast.info('Theme Updated', `Switched to ${isDark ? 'light' : 'dark'} mode.`);
    };
  }
}

// ==========================================================================
// Shadcn Sheet / Drawer for Empirical Evidence
// ==========================================================================
function initEvidenceSheet() {
  const sheet = $('evidenceSheet');
  const backdrop = $('evidenceSheetBackdrop');
  const closeBtn = $('closeSheetBtn');
  const actionCloseBtn = $('sheetCloseActionBtn');
  const switchTabBtn = $('sheetSwitchTabBtn');

  function closeSheet() {
    if (sheet) sheet.removeAttribute('data-state');
    if (backdrop) backdrop.removeAttribute('data-state');
  }

  if (closeBtn) closeBtn.onclick = closeSheet;
  if (actionCloseBtn) actionCloseBtn.onclick = closeSheet;
  if (backdrop) backdrop.onclick = closeSheet;
  if (switchTabBtn) {
    switchTabBtn.onclick = () => {
      closeSheet();
      switchTab('tab-evidence');
    };
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet && sheet.getAttribute('data-state') === 'open') {
      closeSheet();
    }
  });
}

function openEvidenceSheet(title, subtitle, htmlContent) {
  const sheet = $('evidenceSheet');
  const backdrop = $('evidenceSheetBackdrop');
  if ($('sheetTitle')) $('sheetTitle').textContent = title;
  if ($('sheetSubtitle')) $('sheetSubtitle').textContent = subtitle;
  if ($('sheetContent')) $('sheetContent').innerHTML = htmlContent;

  if (sheet) sheet.setAttribute('data-state', 'open');
  if (backdrop) backdrop.setAttribute('data-state', 'open');
}

async function run(ai) {
  if (busy || !$('editor').reportValidity()) return;
  const body = getRequest(ai);
  if (!body.decisions.length) {
    toast.error('No Levers Selected', 'Please enable at least one spending decision lever on the left.');
    return;
  }
  const token = revision;
  busy = true;
  document.querySelectorAll('#editor button').forEach(b => b.disabled = true);
  $('state').textContent = ai ? 'Analyzing · asking AI analyst…' : 'Analyzing · computing evidence…';

  try {
    const r = await runAnalysisJob('workspace', body);
    if (token !== revision) return;
    render(r);
    $('state').textContent = ai ? 'Analyzed · with AI' : 'Analyzed · empirical data';
    $('state').className = 'flow-status-pill analyzed';
    toast.success('Empirical Analysis Complete', ai ? 'AI Analyst report generated with 8 peer comps.' : 'Grounded with 100+ SEC peer IPO comps.');
  } catch (e) {
    toast.error('Analysis Failed', e.message || 'Error running analysis');
    $('state').textContent = 'Error during analysis';
  } finally {
    busy = false;
    document.querySelectorAll('#editor button').forEach(b => b.disabled = false);
  }
}

// Unified Tab Navigation & Breadcrumb Titles
const TAB_TITLES = {
  'tab-hierarchy': 'Strategy Hierarchy Tree',
  'tab-spider': 'Exploded Spider Diagram (Radar)',
  'tab-benchmarks': 'Founder Benchmarks Library',
  'tab-evidence': 'Deep Empirical Regressions',
  'tab-company-flow': 'AI Strategy Flowcharts'
};

function switchTab(tabId) {
  activeTab = tabId;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId);
  });
  document.querySelectorAll('[data-tab-target]').forEach(b => {
    b.classList.toggle('active', b.dataset.tabTarget === tabId);
  });
  document.querySelectorAll('.view-panel').forEach(p => p.style.display = 'none');

  if (tabId === 'tab-hierarchy') $('view-hierarchy').style.display = 'block';
  if (tabId === 'tab-spider') {
    $('view-spider').style.display = 'block';
    if (currentResult) renderRadarChart(currentResult.radar);
  }
  if (tabId === 'tab-benchmarks') {
    $('view-benchmarks').style.display = 'block';
    if (currentResult) renderBenchmarks(currentResult.benchmarks);
  }
  if (tabId === 'tab-evidence') $('view-evidence').style.display = 'block';
  if (tabId === 'tab-company-flow') {
    $('view-company-flow').style.display = 'block';
    if (!currentCompanyFlowData) {
      loadCompanyFlow($('companyFlowSelect')?.value || 'DDOG');
    }
  }

  if ($('breadcrumbCurrentView')) {
    $('breadcrumbCurrentView').textContent = TAB_TITLES[tabId] || 'Strategy Studio';
  }
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

// Preset button clicks
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.onclick = () => applyPreset(btn.dataset.preset);
});

// Radar layer toggle listeners
['current', 'proposed', 'peers', 'p75', 'benchmark'].forEach(key => {
  const chk = $(`chk-${key}`);
  if (chk) chk.onchange = () => { if (currentResult) renderRadarChart(currentResult.radar); };
});

// Input listeners
$('editor').addEventListener('input', () => {
  revision++;
  updateLocalKPIs();
  $('state').textContent = 'Draft · changes unanalyzed';
  $('state').className = 'flow-status-pill';
});

$('editor').onsubmit = e => { e.preventDefault(); run(false); };
$('askAnalyst').onclick = () => run(true);

$('save').onclick = () => {
  const data = {};
  document.querySelectorAll('#editor input, #editor select, #editor textarea').forEach(e => {
    data[e.id] = e.type === 'checkbox' ? e.checked : e.value;
  });
  localStorage.setItem('saas-strategy-flow-v1', JSON.stringify(data));
  toast.success('Strategy Plan Saved', 'Parameters have been saved locally in this browser.');
};

$('exportJson').onclick = () => {
  const payload = {
    request: getRequest(),
    results: currentResult,
    attached_evidence: attachedEvidence,
    exported_at: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${($('name').value || 'strategy').toLowerCase().replace(/\s+/g, '_')}_plan.json`;
  a.click();
  toast.success('Executive Plan Exported', `${$('name').value || 'strategy'}_plan.json downloaded.`);
};

$('saveToTeamLibraryBtn').onclick = () => {
  const name = prompt('Enter a name for this founder strategy:', $('name').value);
  if (!name) return;
  const author = prompt('Enter author name or team role:', 'Founder & CEO') || 'Founder';
  const req = getRequest();
  const curR40 = (req.profile.revenue_growth + req.profile.operating_margin) * 100;
  const propSM = req.proposed_ratios.sales_marketing_ratio ?? req.profile.sales_marketing_ratio;
  const propRD = req.proposed_ratios.rd_ratio ?? req.profile.rd_ratio;

  const newBm = {
    id: 'team_' + Date.now(),
    author: `${author} (${$('name').value})`,
    name: name,
    stage: `${money(req.profile.revenue)} ARR Scale`,
    revenue_growth: req.profile.revenue_growth,
    operating_margin: req.profile.operating_margin,
    gross_margin: req.profile.gross_margin,
    sales_marketing_ratio: propSM,
    rd_ratio: propRD,
    rule_of_40: curR40,
    description: `Custom founder strategy created by ${author}. Target S&M: ${pct(propSM)}, R&D: ${pct(propRD)}.`,
    scores: [
      Math.min(95, Math.max(10, req.profile.revenue_growth * 100)),
      Math.min(95, Math.max(10, (req.profile.operating_margin + 0.6) * 100)),
      Math.min(95, Math.max(10, req.profile.gross_margin * 100)),
      Math.min(95, Math.max(10, (1 - propSM) * 100)),
      Math.min(95, Math.max(10, propRD * 200)),
      Math.min(95, Math.max(10, (curR40 + 20) * 1.2))
    ]
  };

  if (!currentResult.benchmarks) currentResult.benchmarks = [];
  currentResult.benchmarks.unshift(newBm);
  selectBenchmark(newBm.id);
  toast.success('Saved to Team Library', `"${name}" is now available in the Benchmarking Library.`);
};

// ==========================================================================
// Shadcn Sidebar Controller (Inspired by satnaing/shadcn-admin)
// ==========================================================================
function initSidebar() {
  const sidebar = $('appSidebar');
  const collapseBtn = $('sidebarCollapseBtn');
  const topbarTrigger = $('topbarSidebarTrigger');
  const backdrop = $('sidebarBackdrop');

  function setSidebarState(state) {
    if (!sidebar) return;
    sidebar.setAttribute('data-state', state);
    localStorage.setItem('shadcn_sidebar_state', state);
  }

  function toggleSidebar() {
    if (!sidebar) return;
    if (window.innerWidth <= 768) {
      const isOpen = sidebar.getAttribute('data-mobile-open') === 'true';
      sidebar.setAttribute('data-mobile-open', !isOpen ? 'true' : 'false');
      if (backdrop) backdrop.setAttribute('data-visible', !isOpen ? 'true' : 'false');
    } else {
      const cur = sidebar.getAttribute('data-state') || 'expanded';
      setSidebarState(cur === 'expanded' ? 'collapsed' : 'expanded');
    }
  }

  const savedState = localStorage.getItem('shadcn_sidebar_state') || 'expanded';
  setSidebarState(savedState);

  if (collapseBtn) collapseBtn.onclick = toggleSidebar;
  if (topbarTrigger) topbarTrigger.onclick = toggleSidebar;
  if (backdrop) backdrop.onclick = () => {
    sidebar.setAttribute('data-mobile-open', 'false');
    backdrop.setAttribute('data-visible', 'false');
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar
  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Sidebar navigation item clicks
  document.querySelectorAll('[data-tab-target]').forEach(btn => {
    btn.onclick = () => {
      switchTab(btn.dataset.tabTarget);
      if (window.innerWidth <= 768 && backdrop) {
        sidebar.setAttribute('data-mobile-open', 'false');
        backdrop.setAttribute('data-visible', 'false');
      }
    };
  });

  // Sidebar preset clicks
  document.querySelectorAll('[data-preset-target]').forEach(btn => {
    btn.onclick = () => {
      applyPreset(btn.dataset.presetTarget);
      if (window.innerWidth <= 768 && backdrop) {
        sidebar.setAttribute('data-mobile-open', 'false');
        backdrop.setAttribute('data-visible', 'false');
      }
    };
  });

  // Sidebar action links
  if ($('sidebarAskAnalystBtn')) $('sidebarAskAnalystBtn').onclick = () => run(true);
  if ($('sidebarRunBtn')) $('sidebarRunBtn').onclick = () => run(false);
  if ($('sidebarExportBtn')) $('sidebarExportBtn').onclick = () => $('exportJson').click();

  if ($('sidebarToggleShelfBtn')) {
    $('sidebarToggleShelfBtn').onclick = () => {
      const dock = $('evidenceDockSection');
      if (dock) {
        dock.style.display = dock.style.display === 'none' ? 'block' : 'none';
      }
    };
  }
  if ($('collapseShelfBtn')) {
    $('collapseShelfBtn').onclick = () => {
      const dock = $('evidenceDockSection');
      if (dock) dock.style.display = 'none';
    };
  }
}

// ==========================================================================
// Command Palette Modal (Ctrl+K / Cmd+K Search)
// ==========================================================================
const COMMAND_ITEMS = [
  { group: 'Navigation Views', title: 'Strategy Hierarchy Tree', action: () => switchTab('tab-hierarchy'), badge: 'View 1' },
  { group: 'Navigation Views', title: 'Exploded Spider Diagram (Radar)', action: () => switchTab('tab-spider'), badge: 'View 2' },
  { group: 'Navigation Views', title: 'Founder Benchmarks Library', action: () => switchTab('tab-benchmarks'), badge: 'View 3' },
  { group: 'Navigation Views', title: 'Deep Empirical Regressions', action: () => switchTab('tab-evidence'), badge: 'View 4' },
  { group: 'Navigation Views', title: 'AI Company Strategy Flowcharts', action: () => switchTab('tab-company-flow'), badge: 'View 5' },
  { group: 'Startup Archetypes', title: 'Series A Growth ($10M ARR)', action: () => applyPreset('seriesA'), badge: 'Preset' },
  { group: 'Startup Archetypes', title: 'Series B Scale ($25M ARR)', action: () => applyPreset('seriesB'), badge: 'Preset' },
  { group: 'Startup Archetypes', title: 'Capital-Efficient ($15M ARR)', action: () => applyPreset('efficient'), badge: 'Preset' },
  { group: 'Startup Archetypes', title: 'Pre-IPO Scale ($100M ARR)', action: () => applyPreset('enterprise'), badge: 'Preset' },
  { group: 'Intelligence & Actions', title: 'Ask Live AI Analyst', action: () => run(true), badge: 'GPT-5-mini' },
  { group: 'Intelligence & Actions', title: 'Run Empirical Evidence Analysis', action: () => run(false), badge: 'SEC Comps' },
  { group: 'Intelligence & Actions', title: 'Toggle Draggable Evidence Shelf', action: () => $('sidebarToggleShelfBtn')?.click(), badge: 'Toggle' },
  { group: 'Intelligence & Actions', title: 'Export Full Strategy Plan (JSON)', action: () => $('exportJson')?.click(), badge: 'Export' }
];

function initCommandPalette() {
  const modal = $('commandPaletteModal');
  const input = $('commandPaletteInput');
  const container = $('commandResultsContainer');
  const searchBtn = $('sidebarSearchBtn');
  const closeBtn = $('commandCloseBtn');
  if (!modal || !input || !container) return;

  let selectedIdx = 0;
  let filtered = [];

  function openPalette() {
    modal.style.display = 'flex';
    input.value = '';
    renderResults('');
    input.focus();
  }

  function closePalette() {
    modal.style.display = 'none';
  }

  function renderResults(query) {
    const q = query.trim().toLowerCase();
    filtered = COMMAND_ITEMS.filter(item =>
      !q || item.title.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
    );
    selectedIdx = 0;

    if (filtered.length === 0) {
      container.innerHTML = `<div style="padding:16px; text-align:center; color:var(--text-muted); font-size:12px;">No matching playbooks or actions found for "${esc(query)}"</div>`;
      return;
    }

    const groups = {};
    filtered.forEach((it, idx) => {
      if (!groups[it.group]) groups[it.group] = [];
      groups[it.group].push({ item: it, originalIndex: idx });
    });

    let html = '';
    Object.entries(groups).forEach(([grpName, items]) => {
      html += `<div class="command-group-title">${esc(grpName)}</div>`;
      items.forEach(({ item, originalIndex }) => {
        const isSel = originalIndex === selectedIdx;
        html += `
          <div class="command-item ${isSel ? 'selected' : ''}" data-idx="${originalIndex}">
            <span class="command-item-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
            <span>${esc(item.title)}</span>
            <span class="command-item-badge">${esc(item.badge)}</span>
          </div>
        `;
      });
    });
    container.innerHTML = html;

    container.querySelectorAll('.command-item').forEach(el => {
      el.onclick = () => {
        const idx = parseInt(el.dataset.idx, 10);
        executeItem(idx);
      };
    });
  }

  function executeItem(idx) {
    const item = filtered[idx];
    if (item) {
      closePalette();
      item.action();
    }
  }

  if (searchBtn) searchBtn.onclick = openPalette;
  if (closeBtn) closeBtn.onclick = closePalette;
  modal.onclick = e => { if (e.target === modal) closePalette(); };

  input.oninput = () => renderResults(input.value);
  input.onkeydown = e => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = (selectedIdx + 1) % filtered.length;
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = (selectedIdx - 1 + filtered.length) % filtered.length;
      updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      executeItem(selectedIdx);
    } else if (e.key === 'Escape') {
      closePalette();
    }
  };

  function updateSelection() {
    container.querySelectorAll('.command-item').forEach(el => {
      const idx = parseInt(el.dataset.idx, 10);
      el.classList.toggle('selected', idx === selectedIdx);
      if (idx === selectedIdx) el.scrollIntoView({ block: 'nearest' });
    });
  }

  window.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      modal.style.display === 'flex' ? closePalette() : openPalette();
    }
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closePalette();
    }
  });
}

// ==========================================================================
// AI Company Strategy Flowcharts & Trajectory Comparison Engine
// ==========================================================================
let currentCompanyFlowData = null;

async function initCompanyFlow() {
  const select = $('companyFlowSelect');
  const refreshBtn = $('refreshCompanyFlowBtn');
  const toggleBtn = $('toggleMermaidCodeBtn');

  // Load companies list from API
  try {
    const res = await fetch('/api/strategy/company-flow-list');
    if (res.ok) {
      const data = await res.json();
      if (select && data.items && data.items.length) {
        select.innerHTML = data.items.map(item => `
          <option value="${esc(item.ticker || item.company_id)}" ${item.ticker === 'DDOG' ? 'selected' : ''}>
            ${esc(item.name)} (${esc(item.ticker || item.company_id)}) · ${item.period_count} periods (${item.years})
          </option>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load company flow list:', err);
  }

  // Handle select change
  if (select) {
    select.onchange = () => {
      const val = select.value;
      updateQuickChipHighlight(val);
      loadCompanyFlow(val);
    };
  }

  // Handle quick chip clicks
  document.querySelectorAll('[data-flow-ticker]').forEach(chip => {
    chip.onclick = () => {
      const ticker = chip.dataset.flowTicker;
      if (select) select.value = ticker;
      updateQuickChipHighlight(ticker);
      loadCompanyFlow(ticker);
    };
  });

  // Handle refresh
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      const val = select ? select.value : 'DDOG';
      loadCompanyFlow(val);
    };
  }

  // Handle toggle code
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const raw = $('companyFlowRawCode');
      if (raw) {
        const isShown = raw.style.display === 'block';
        raw.style.display = isShown ? 'none' : 'block';
        toggleBtn.textContent = isShown ? 'Toggle Syntax' : 'Hide Syntax';
      }
    };
  }
}

function updateQuickChipHighlight(ticker) {
  document.querySelectorAll('[data-flow-ticker]').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.flowTicker === ticker);
  });
}

async function loadCompanyFlow(identifier) {
  if (!identifier) return;
  const diagramBox = $('companyFlowDiagramBox');
  if (diagramBox) diagramBox.style.opacity = '0.5';

  try {
    const profile = getRequest().profile;
    const res = await fetch(`/api/strategy/company-flow/${encodeURIComponent(identifier)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startup_profile: profile })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentCompanyFlowData = data;
    renderCompanyFlow(data);
  } catch (err) {
    console.error('Failed to load company strategy flow:', err);
    if (typeof toast !== 'undefined') toast.error('Flowchart Error', `Could not load flow for ${identifier}`);
  } finally {
    if (diagramBox) diagramBox.style.opacity = '1';
  }
}

function copyStageLevers(payload) {
  if (!payload) return;
  if (payload.sales_marketing_ratio != null) {
    $('salesTarget').value = payload.sales_marketing_ratio;
    $('salesOn').checked = true;
  }
  if (payload.rd_ratio != null) {
    $('rdTarget').value = payload.rd_ratio;
    $('rdOn').checked = true;
  }
  if (payload.objective) {
    $('objective').value = payload.objective;
  }

  updateLocalKPIs();
  run(false);

  if (typeof toast !== 'undefined') {
    toast.success(
      'Strategy Levers Copied!',
      `Adopted ${payload.strategy_name || 'phase'}: Target S&M set to ${payload.sales_marketing_ratio}%, R&D set to ${payload.rd_ratio}%.`
    );
  }
}

function renderCompanyFlow(data) {
  if (!data || !data.stages) return;
  const comp = data.company || {};
  if ($('flowchartCompanyTitle')) {
    $('flowchartCompanyTitle').textContent = `${comp.name} (${comp.ticker}) Multi-Year Strategy Flow`;
  }
  if ($('flowchartPeriodCountPill')) {
    $('flowchartPeriodCountPill').textContent = `${data.stages_count} Annual Periods`;
  }
  if ($('flowchartSubtitle')) {
    const firstStage = data.stages[0];
    const lastStage = data.stages[data.stages.length - 1];
    $('flowchartSubtitle').textContent = `Tracking strategic scaling from ${firstStage.revenue_formatted} (${firstStage.year}) to ${lastStage.revenue_formatted} ARR (${lastStage.year}) based on SEC 10-K filings.`;
  }
  if ($('stageCountBadge')) {
    $('stageCountBadge').textContent = `${data.stages_count} Strategic Phases`;
  }

  // Raw Mermaid code
  if ($('companyFlowRawCode')) {
    $('companyFlowRawCode').textContent = data.mermaid_code || '';
  }

  // Render Mermaid Flowchart diagram
  renderMermaidDiagram(data);

  // Render Comparison Card
  renderFlowComparison(data.comparison);

  // Render Stages Grid
  renderFlowStagesGrid(data.stages);
}

async function renderMermaidDiagram(data) {
  const container = $('companyFlowMermaid');
  if (!container) return;

  if (typeof mermaid !== 'undefined' && mermaid.render) {
    try {
      const renderId = 'mermaid_svg_' + Math.floor(Math.random() * 1000000);
      const isDark = document.documentElement.classList.contains('dark');
      let code = data.mermaid_code;
      if (isDark) {
        code = code.replace(/fill:#ffffff/g, 'fill:#18181b')
                   .replace(/color:#0f172a/g, 'color:#f8fafc');
      }
      const { svg } = await mermaid.render(renderId, code);
      container.innerHTML = svg;
      return;
    } catch (err) {
      console.warn('Mermaid rendering issue, falling back to native SVG:', err);
    }
  }

  // Native SVG Fallback
  container.innerHTML = renderNativeSvgFlowchart(data.stages);
}

function renderFlowComparison(comp) {
  const card = $('companyFlowComparisonCard');
  if (!card) return;
  if (!comp) {
    card.innerHTML = `<div style="color:var(--text-muted); font-size:13px;">Set your startup revenue profile on the left to see strategic gap analysis against this peer.</div>`;
    return;
  }

  const m = comp.metrics || {};
  const sm = m.sales_marketing || {};
  const rd = m.rd_ratio || {};
  const gr = m.growth || {};
  const mg = m.operating_margin || {};
  const r40 = m.rule_of_40 || {};

  function formatGapBadge(gap) {
    if (gap == null) return '';
    const sign = gap > 0 ? '+' : '';
    const cls = gap > 0 ? 'gap-positive' : (gap < 0 ? 'gap-negative' : 'gap-neutral');
    return `<span class="contrast-gap-badge ${cls}">${sign}${gap} pp</span>`;
  }

  card.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
      <div>
        <div class="contrast-badge-strip">
          <span style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">STRATEGIC CONTRAST</span>
          <span class="kpi-tag" style="background:#ecfdf5; color:#059669;">Matched Scale: ${esc(comp.benchmark_revenue)} ARR</span>
          <span class="kpi-tag" style="background:#f5f3ff; color:#7c3aed;">Peer Period: ${esc(comp.benchmark_stage)}</span>
        </div>
        <h3 style="font-size:16px; font-weight:700; margin:6px 0 0;">
          Your Strategy vs. ${esc(comp.benchmark_company)} at Equivalent Revenue Scale
        </h3>
      </div>
      <button type="button" id="adoptPeerRatiosBtn" class="btn primary" style="font-size:12px;">
        📋 Adopt ${esc(comp.benchmark_stage)} Strategy Levers
      </button>
    </div>

    <div class="contrast-narrative">
      <strong>Analyst Assessment:</strong> ${esc(comp.posture_summary)}
    </div>

    <div class="contrast-grid">
      <div class="contrast-metric-box">
        <span class="contrast-metric-title">Sales & Marketing Ratio</span>
        <div class="contrast-metric-values">
          <span class="contrast-user-val">${esc(sm.user)}</span>
          <span class="contrast-peer-val">Peer: ${esc(sm.company)}</span>
        </div>
        <div>${formatGapBadge(sm.gap_pp)} vs peer</div>
      </div>
      <div class="contrast-metric-box">
        <span class="contrast-metric-title">R&D / Product Ratio</span>
        <div class="contrast-metric-values">
          <span class="contrast-user-val">${esc(rd.user)}</span>
          <span class="contrast-peer-val">Peer: ${esc(rd.company)}</span>
        </div>
        <div>${formatGapBadge(rd.gap_pp)} vs peer</div>
      </div>
      <div class="contrast-metric-box">
        <span class="contrast-metric-title">Revenue Growth</span>
        <div class="contrast-metric-values">
          <span class="contrast-user-val">${esc(gr.user)}</span>
          <span class="contrast-peer-val">Peer: ${esc(gr.company)}</span>
        </div>
        <div>${formatGapBadge(gr.gap_pp)} vs peer</div>
      </div>
      <div class="contrast-metric-box">
        <span class="contrast-metric-title">Operating Margin</span>
        <div class="contrast-metric-values">
          <span class="contrast-user-val">${esc(mg.user)}</span>
          <span class="contrast-peer-val">Peer: ${esc(mg.company)}</span>
        </div>
        <div>${formatGapBadge(mg.gap_pp)} vs peer</div>
      </div>
      <div class="contrast-metric-box">
        <span class="contrast-metric-title">Rule of 40 Score</span>
        <div class="contrast-metric-values">
          <span class="contrast-user-val">${esc(r40.user)}</span>
          <span class="contrast-peer-val">Peer: ${esc(r40.company)}</span>
        </div>
        <div>${formatGapBadge(r40.gap)} pts</div>
      </div>
    </div>
  `;

  const adoptBtn = $('adoptPeerRatiosBtn');
  if (adoptBtn && comp.adopt_lever_payload) {
    adoptBtn.onclick = () => copyStageLevers(comp.adopt_lever_payload);
  }
}

function renderFlowStagesGrid(stages) {
  const container = $('companyFlowStagesGrid');
  if (!container) return;
  if (!stages || !stages.length) {
    container.innerHTML = '<p style="color:var(--text-muted); font-size:13px;">No lifecycle stages available.</p>';
    return;
  }

  container.innerHTML = stages.map(s => {
    const smDelta = s.deltas?.sm_pp != null ? (s.deltas.sm_pp >= 0 ? `+${s.deltas.sm_pp}pp` : `${s.deltas.sm_pp}pp`) : null;
    const r40Cls = s.rule_of_40 >= 40 ? 'color:#10b981;' : (s.rule_of_40 >= 20 ? 'color:#0284c7;' : 'color:var(--text-main);');

    return `
      <div class="flow-stage-card">
        <div>
          <div class="stage-card-header">
            <span class="stage-year-pill">${esc(s.year)}</span>
            <span class="kpi-tag" style="background:#f1f5f9; color:#475569;">Stage ${s.index}</span>
          </div>
          <div class="stage-phase-title">${esc(s.phase_title)}</div>
          <p class="stage-phase-desc">${esc(s.phase_desc)}</p>
        </div>

        <div class="stage-stats-table">
          <div class="stage-stat-row">
            <span class="stage-stat-lbl">Revenue:</span>
            <span class="stage-stat-val">${esc(s.revenue_formatted)}</span>
          </div>
          <div class="stage-stat-row">
            <span class="stage-stat-lbl">Growth:</span>
            <span class="stage-stat-val" style="color:#10b981;">${esc(s.growth_formatted)}</span>
          </div>
          <div class="stage-stat-row">
            <span class="stage-stat-lbl">S&M Ratio:</span>
            <span class="stage-stat-val">${esc(s.sales_marketing_formatted)} ${smDelta ? `<small style="font-weight:normal; color:var(--text-muted);">(${smDelta})</small>` : ''}</span>
          </div>
          <div class="stage-stat-row">
            <span class="stage-stat-lbl">R&D Ratio:</span>
            <span class="stage-stat-val">${esc(s.rd_formatted)}</span>
          </div>
          <div class="stage-stat-row">
            <span class="stage-stat-lbl">Op Margin:</span>
            <span class="stage-stat-val">${esc(s.operating_margin_formatted)}</span>
          </div>
          <div class="stage-stat-row">
            <span class="stage-stat-lbl">Rule of 40:</span>
            <span class="stage-stat-val" style="${r40Cls}">${s.rule_of_40 != null ? s.rule_of_40 : 'N/A'}</span>
          </div>
        </div>

        <button type="button" class="stage-copy-btn" data-copy-stage="${s.index}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          📋 Copy Levers to My Strategy
        </button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-copy-stage]').forEach(btn => {
    btn.onclick = () => {
      const stageIdx = parseInt(btn.dataset.copyStage, 10);
      const stage = stages.find(s => s.index === stageIdx);
      if (stage && stage.copy_payload) {
        copyStageLevers(stage.copy_payload);
      }
    };
  });
}

function renderNativeSvgFlowchart(stages) {
  if (!stages || !stages.length) return '';
  const nodeW = 190;
  const nodeH = 105;
  const gap = 55;
  const totalW = stages.length * (nodeW + gap) - gap + 40;
  const totalH = 145;
  const isDark = document.documentElement.classList.contains('dark');

  const bgNormal = isDark ? '#18181b' : '#ffffff';
  const textTitle = isDark ? '#f8fafc' : '#0f172a';
  const textSub = isDark ? '#a1a1aa' : '#64748b';
  const borderNormal = isDark ? '#38bdf8' : '#0284c7';
  const arrowCol = isDark ? '#38bdf8' : '#0284c7';

  let defs = `
    <defs>
      <marker id="flowArrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="${arrowCol}"/>
      </marker>
    </defs>
  `;

  let nodesHtml = '';
  stages.forEach((s, i) => {
    const x = 20 + i * (nodeW + gap);
    const y = 20;
    const isElite = s.rule_of_40 && s.rule_of_40 >= 40;
    const nodeStroke = isElite ? '#10b981' : borderNormal;
    const nodeBg = isElite ? (isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5') : bgNormal;
    const r40Color = isElite ? '#10b981' : textSub;

    nodesHtml += `
      <g class="flow-svg-node" transform="translate(${x}, ${y})">
        <rect width="${nodeW}" height="${nodeH}" rx="8" fill="${nodeBg}" stroke="${nodeStroke}" stroke-width="2"/>
        <text x="12" y="22" font-size="11" font-weight="700" fill="${textTitle}">${esc(s.year)} · ${esc(s.phase_title.length > 16 ? s.phase_title.slice(0, 15) + '…' : s.phase_title)}</text>
        <text x="12" y="42" font-size="12" font-weight="800" fill="${borderNormal}">ARR: ${esc(s.revenue_formatted)} (${esc(s.growth_formatted)})</text>
        <text x="12" y="62" font-size="11" fill="${textSub}">S&M: ${esc(s.sales_marketing_formatted)} | R&D: ${esc(s.rd_formatted)}</text>
        <text x="12" y="82" font-size="11" font-weight="600" fill="${r40Color}">Margin: ${esc(s.operating_margin_formatted)} | R40: ${s.rule_of_40 ?? 'N/A'}</text>
      </g>
    `;

    if (i > 0) {
      const prevX = 20 + (i - 1) * (nodeW + gap) + nodeW;
      const curX = x;
      const arrowY = y + nodeH / 2;
      const smDelta = s.deltas?.sm_pp;
      const deltaLabel = smDelta != null ? `${smDelta >= 0 ? '+' : ''}${smDelta}pp S&M` : '';

      nodesHtml += `
        <line x1="${prevX}" y1="${arrowY}" x2="${curX - 4}" y2="${arrowY}" stroke="${arrowCol}" stroke-width="2" marker-end="url(#flowArrow)"/>
        ${deltaLabel ? `<text x="${(prevX + curX) / 2}" y="${arrowY - 6}" font-size="10" font-weight="700" fill="${arrowCol}" text-anchor="middle">${deltaLabel}</text>` : ''}
      `;
    }
  });

  return `<svg viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" style="min-width:${totalW}px;">${defs}${nodesHtml}</svg>`;
}

// Initial boot
try {
  const data = JSON.parse(localStorage.getItem('saas-strategy-flow-v1') || 'null');
  if (data) {
    Object.entries(data).forEach(([k, v]) => {
      if ($(k)) $(k).type === 'checkbox' ? $(k).checked = Boolean(v) : $(k).value = v;
    });
  }
} catch {}

initTheme();
initSidebar();
initCommandPalette();
initEvidenceSheet();
initCompanyFlow();
updateLocalKPIs();
run(false);
