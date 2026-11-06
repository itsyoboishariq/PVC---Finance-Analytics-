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

async function run(ai) {
  if (busy || !$('editor').reportValidity()) return;
  const body = getRequest(ai);
  if (!body.decisions.length) {
    alert('Please enable at least one spending decision lever on the left.');
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
  } catch (e) {
    alert(e.message || 'Error running analysis');
    $('state').textContent = 'Error during analysis';
  } finally {
    busy = false;
    document.querySelectorAll('#editor button').forEach(b => b.disabled = false);
  }
}

// Tab navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    activeTab = tabId;
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
  };
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
  alert('Strategy saved in this browser!');
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
  alert(`Strategy "${name}" saved to Team Benchmark Library!`);
};

// Initial boot
try {
  const data = JSON.parse(localStorage.getItem('saas-strategy-flow-v1') || 'null');
  if (data) {
    Object.entries(data).forEach(([k, v]) => {
      if ($(k)) $(k).type === 'checkbox' ? $(k).checked = Boolean(v) : $(k).value = v;
    });
  }
} catch {}

updateLocalKPIs();
run(false);
