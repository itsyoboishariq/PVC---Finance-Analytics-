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
    <div class="node"><small>RESEARCH CONTEXT</small><strong>${esc($('context')?.selectedOptions?.[0]?.text || $('context')?.value || 'Historical SaaS Periods')}</strong><span>Match starting profiles → compare actions</span></div>
    <div class="arrow">↓</div>
    <div class="node goal"><small>YOUR OBJECTIVE</small><strong>${req.objective === 'growth' ? 'Grow revenue' : 'Improve operating profitability'}</strong><span>Financial peers + actual execution</span></div>
  `;
}

// Node Drilldown Navigation
function drilldownNode(metricKey) {
  if (!currentResult || !currentResult.decisions) {
    alert('Please run strategic evidence first to inspect peer benchmarks for this lever.');
    return;
  }
  const decision = currentResult.decisions.find(d => d.metric === metricKey);
  const container = $('nodeDrilldownContainer');
  const treeRoot = $('hierarchyTreeRoot');
  const nav = $('drilldownNav');

  treeRoot.style.display = 'none';
  nav.style.display = 'flex';
  container.style.display = 'block';

  $('drilldownBreadcrumbText').textContent = `Deep Strategic Analysis: ${names[metricKey] || metricKey}`;

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
          SEC Peer Sample
          <strong>${rel.complete_rows || 0}</strong>
          ${rel.companies || 0} peer companies
        </div>
      </div>

      <div style="background:#ffffff; border:1px solid var(--border); border-radius:10px; padding:18px; margin-bottom:20px;">
        <h3 style="font-size:15px; font-weight:700; margin:0 0 10px;">What do peer benchmarks & SEC filings show?</h3>
        ${scatter(rel)}
        ${adj ? `
          <div class="note" style="margin-top:14px;">
            A 10 percentage-point higher ${names[decision.metric].toLowerCase()} ratio is associated with 
            <b>${adj.difference_pp_per_10pp.toFixed(2)} pp</b> of next-year ${currentResult.flow.objective === 'growth' ? 'revenue growth' : 'operating margin'}, 
            benchmarked against peers of similar scale and margins.<br>
            95% range: ${ci ? ci.map(n => n.toFixed(2)).join(' to ') + ' pp' : 'unavailable'}. 
            Pearson correlation: ${Number(rel.pearson).toFixed(2)}.
          </div>
        ` : '<p>Select a strategic stage to inspect SEC operating benchmarks.</p>'}
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
if ($('backToHierarchyBtn')) $('backToHierarchyBtn').onclick = backToHierarchy;

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

  // Executive Strategy Lever cards
  cards.push({
    type: 'strategy-lever',
    title: 'GTM Acceleration & Net Expansion',
    desc: 'High-velocity SaaS cohorts deploy 35-45% S&M intensity to drive Net Dollar Retention (NDR > 120%) and enterprise expansion.',
    tag: 'GTM Strategy'
  });
  cards.push({
    type: 'strategy-lever',
    title: 'R&D Technological Moat & Velocity',
    desc: 'Product & Engineering velocity expands multi-product cross-sell and reduces customer churn while defending pricing power.',
    tag: 'Platform Moat'
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
          <div class="card">Benchmarked Cohort<strong>${rel.complete_rows || 0}</strong>${rel.companies || 0} peer companies</div>
        </div>
        <h3 style="font-size:15px; font-weight:700; margin:16px 0 8px;">Peer Financial Benchmarks: Spending vs. Next-Year Outcome</h3>
        ${scatter(rel)}
        ${adjusted ? `
          <div class="note" style="margin-top:12px;">
            Peer benchmark: A 10 percentage-point higher ${names[d.metric].toLowerCase()} allocation is historically associated with 
            <b>${adjusted.difference_pp_per_10pp.toFixed(2)} pp</b> higher next-year ${r.flow.objective === 'growth' ? 'revenue growth' : 'operating margin'}. 
            95% range: ${ci ? ci.map(n => n.toFixed(2)).join(' to ') + ' pp' : 'unavailable'}. 
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
    localStorage.setItem('athena_theme', theme);
    if (typeof currentCompanyFlowData !== 'undefined' && currentCompanyFlowData) {
      renderMermaidDiagram(currentCompanyFlowData);
    }
  }

  const savedTheme = localStorage.getItem('athena_theme') || 'light';
  setTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'light' : 'dark');
      toast.info('Theme Updated', `Switched to ${isDark ? 'Light' : 'Dark'} mode.`);
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
  'tab-evidence': 'Peer Financial Benchmarks',
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
if ($('editor')) {
  $('editor').addEventListener('input', () => {
    revision++;
    updateLocalKPIs();
    if ($('state')) {
      $('state').textContent = 'Draft · changes unanalyzed';
      $('state').className = 'flow-status-pill';
    }
  });
}

if ($('editor')) $('editor').onsubmit = e => { e.preventDefault(); run(false); };
if ($('askAnalyst')) $('askAnalyst').onclick = () => run(true);

if ($('save')) {
  $('save').onclick = () => {
    const data = {};
    document.querySelectorAll('#editor input, #editor select, #editor textarea').forEach(e => {
      data[e.id] = e.type === 'checkbox' ? e.checked : e.value;
    });
    localStorage.setItem('saas-strategy-flow-v1', JSON.stringify(data));
    toast.success('Strategy Plan Saved', 'Parameters have been saved locally in this browser.');
  };
}

if ($('exportJson')) {
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
}

if ($('saveToTeamLibraryBtn')) {
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
}

// ==========================================================================
// Shadcn Sidebar Controller (Inspired by satnaing/shadcn-admin)
// ==========================================================================
function initSidebar() {
  const sidebar = $('appSidebar');
  const collapseBtn = $('sidebarCollapseBtn');
  const topbarTrigger = $('topbarSidebarTrigger');
  const backdrop = $('sidebarBackdrop');
  const railLogoBtn = $('railLogoBtn');
  const railToggleBtn = $('railToggleBtn');

  function setSidebarState(state) {
    if (!sidebar) return;
    sidebar.setAttribute('data-state', state);
    if (backdrop) {
      if (state === 'expanded' && window.innerWidth <= 1024) {
        backdrop.setAttribute('data-state', 'open');
        backdrop.setAttribute('data-visible', 'true');
        backdrop.classList.add('active');
      } else {
        backdrop.removeAttribute('data-state');
        backdrop.setAttribute('data-visible', 'false');
        backdrop.classList.remove('active');
      }
    }
    localStorage.setItem('shadcn_sidebar_state', state);
  }

  function toggleSidebar() {
    if (!sidebar) return;
    const cur = sidebar.getAttribute('data-state') || 'collapsed';
    setSidebarState(cur === 'expanded' ? 'collapsed' : 'expanded');
  }

  if (collapseBtn) collapseBtn.onclick = () => setSidebarState('collapsed');
  if (topbarTrigger) topbarTrigger.onclick = toggleSidebar;
  if (railLogoBtn) railLogoBtn.onclick = toggleSidebar;
  if (railToggleBtn) railToggleBtn.onclick = toggleSidebar;
  if (backdrop) backdrop.onclick = () => setSidebarState('collapsed');

  function scrollToSidebarSection(secId) {
    if (!secId) return;
    const sec = $(secId);
    if (sec) {
      sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Handle Rail Nav Icon Clicks: opens sidebar to that feature!
  document.querySelectorAll('.sidebar-rail button[data-target-sec]').forEach(btn => {
    btn.onclick = () => {
      setSidebarState('expanded');
      document.querySelectorAll('.sidebar-rail .rail-icon-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const secId = btn.dataset.targetSec;
      scrollToSidebarSection(secId);
      // Synchronize category pills
      document.querySelectorAll('.sidebar-category-nav .sidebar-cat-pill').forEach(pill => {
        pill.classList.toggle('active', pill.dataset.targetSec === secId);
      });
    };
  });

  // Handle Rail Dashboard button
  if ($('railNavDashboard')) {
    $('railNavDashboard').onclick = () => {
      const viewDashBtn = $('viewDashboardBtn');
      if (viewDashBtn) viewDashBtn.click();
    };
  }

  // Handle Expanded Category Nav Pills
  document.querySelectorAll('.sidebar-category-nav .sidebar-cat-pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.sidebar-category-nav .sidebar-cat-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const secId = pill.dataset.targetSec;
      scrollToSidebarSection(secId);
      // Synchronize rail icons
      document.querySelectorAll('.sidebar-rail button[data-target-sec]').forEach(b => {
        b.classList.toggle('active', b.dataset.targetSec === secId);
      });
    };
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sidebar && sidebar.getAttribute('data-state') === 'expanded') {
      setSidebarState('collapsed');
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
  });

  // Flowchart is the centerpiece: default to clean collapsed icon rail
  setSidebarState('collapsed');

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
  { group: 'Navigation Views', title: 'Peer Financial Benchmarks', action: () => switchTab('tab-evidence'), badge: 'View 4' },
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
// Mermaid-Centric Interactive Strategy Flowchart & Deep-Dive Inspector
// ==========================================================================
let currentCompanyFlowData = null;
let currentDeepdiveData = null;
let activeInspTab = 'insp-why';

// Global callback for Mermaid click binding
window.selectFlowPhase = function(nodeId) {
  if (window.openInspectorSheet) window.openInspectorSheet();
  if (currentCompanyFlowData && currentCompanyFlowData.stages) {
    const stage = currentCompanyFlowData.stages.find(s => s.id === nodeId || String(s.index) === String(nodeId).replace(/\D/g, ''));
    if (stage) {
      renderPhaseDeepdive(stage);
      highlightFlowchartNode(stage.index || nodeId);
      return;
    }
  }
  const stageIdx = parseInt(String(nodeId).replace(/\D/g, ''), 10) || 1;
  loadPhaseDeepdive(stageIdx);
};

let canvasZoom = 1.0;
let canvasPanX = 0;
let canvasPanY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;

function updateCanvasTransform() {
  const el = $('canvasTransformContainer');
  if (el) {
    el.style.transform = `translate(${canvasPanX}px, ${canvasPanY}px) scale(${canvasZoom})`;
  }
}

async function initCompanyFlow() {
  const select = $('companyFlowSelect');
  const toggleBtn = $('toggleMermaidCodeBtn');
  const askAnalystBtn = $('askAnalyst');
  const aiPromptInput = $('aiFlowPromptInput');
  const aiGenBtn = $('aiFlowGenerateBtn');
  const copyMermaidBtn = $('copyMermaidBtn');
  const applyMermaidBtn = $('applyMermaidBtn');
  const toggleInspectorBtn = $('toggleInspectorBtn');
  const zoomInBtn = $('zoomInBtn');
  const zoomOutBtn = $('zoomOutBtn');
  const zoomResetBtn = $('zoomResetBtn');
  const toggleFullscreenBtn = $('toggleFullscreenBtn');
  const viewport = $('companyFlowDiagramBox');

  // Pan & Zoom Event Listeners
  if (zoomInBtn) zoomInBtn.onclick = () => { canvasZoom = Math.min(2.5, canvasZoom + 0.15); updateCanvasTransform(); };
  if (zoomOutBtn) zoomOutBtn.onclick = () => { canvasZoom = Math.max(0.4, canvasZoom - 0.15); updateCanvasTransform(); };
  if (zoomResetBtn) zoomResetBtn.onclick = () => { canvasZoom = 1.0; canvasPanX = 0; canvasPanY = 0; updateCanvasTransform(); };
  
  if (toggleFullscreenBtn) {
    toggleFullscreenBtn.onclick = () => {
      const card = document.querySelector('.flowchart-hero-card');
      if (card) {
        if (!document.fullscreenElement) {
          card.requestFullscreen().catch(e => console.warn(e));
          toggleFullscreenBtn.textContent = '✕';
        } else {
          document.exitFullscreen().catch(e => console.warn(e));
          toggleFullscreenBtn.textContent = '⛶';
        }
      }
    };
  }

  // Floating Toolbar Dock Toggle
  const toggleDockBtn = $('toggleDockBtn');
  if (toggleDockBtn) {
    toggleDockBtn.onclick = () => {
      const dock = $('aiFlowFloatingDock');
      if (dock) {
        const isMin = dock.classList.toggle('minimized');
        toggleDockBtn.textContent = isMin ? '+' : '−';
        toggleDockBtn.title = isMin ? 'Expand Toolbar' : 'Minimize Toolbar';
      }
    };
  }

  // View Switcher (Strategy Canvas vs Executive Bento Dashboard)
  const viewCanvasBtn = $('viewCanvasBtn');
  const viewDashboardBtn = $('viewDashboardBtn');
  const canvasCard = document.querySelector('.flowchart-hero-card');
  const dashView = $('executiveDashboardView');
  const breadcrumb = $('currentTopBreadcrumb');

  function switchView(mode) {
    if (mode === 'dashboard') {
      if (canvasCard) canvasCard.style.display = 'none';
      if (dashView) dashView.style.display = 'flex';
      viewCanvasBtn?.classList.remove('active');
      viewDashboardBtn?.classList.add('active');
      if (breadcrumb) breadcrumb.textContent = 'Executive Dashboard';
      if (currentDeepdiveData) renderPhaseDeepdive(currentDeepdiveData);
    } else {
      if (canvasCard) canvasCard.style.display = 'flex';
      if (dashView) dashView.style.display = 'none';
      viewCanvasBtn?.classList.add('active');
      viewDashboardBtn?.classList.remove('active');
      if (breadcrumb) breadcrumb.textContent = 'Strategy Canvas';
    }
  }

  if (viewCanvasBtn) viewCanvasBtn.onclick = () => switchView('canvas');
  if (viewDashboardBtn) viewDashboardBtn.onclick = () => switchView('dashboard');

  // AI Model Selector Handler
  const aiModelSelect = $('aiModelSelect');
  if (aiModelSelect) {
    fetch('/api/ai/model-config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg.current_model) aiModelSelect.value = cfg.current_model;
      })
      .catch(e => console.warn(e));

    aiModelSelect.onchange = async () => {
      const selectedModel = aiModelSelect.value;
      try {
        await fetch('/api/ai/set-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: selectedModel })
        });
        toast.success('AI Model Configured', `Active model set to ${selectedModel}`);
      } catch (e) {
        toast.error('Model Error', e.message);
      }
    };
  }

  // Shadcn Sheet Drawer Open / Close Handlers
  function openInspectorSheet() {
    const sheet = $('stageInspectorSheet');
    const backdrop = $('stageInspectorBackdrop');
    if (sheet) sheet.style.display = 'flex';
    if (backdrop) backdrop.style.display = 'block';
  }

  function closeInspectorSheet() {
    const sheet = $('stageInspectorSheet');
    const backdrop = $('stageInspectorBackdrop');
    if (sheet) sheet.style.display = 'none';
    if (backdrop) backdrop.style.display = 'none';
  }

  window.openInspectorSheet = openInspectorSheet;
  window.closeInspectorSheet = closeInspectorSheet;

  if ($('closeInspectorSheetBtn')) $('closeInspectorSheetBtn').onclick = closeInspectorSheet;
  if ($('stageInspectorBackdrop')) $('stageInspectorBackdrop').onclick = closeInspectorSheet;
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeInspectorSheet();
  });

  if (toggleInspectorBtn) {
    toggleInspectorBtn.onclick = () => {
      const sheet = $('stageInspectorSheet');
      if (sheet && sheet.style.display !== 'none') {
        closeInspectorSheet();
      } else {
        openInspectorSheet();
      }
    };
  }

  // Mouse drag to pan
  if (viewport) {
    viewport.addEventListener('mousedown', e => {
      if (e.target.closest('.node') || e.target.closest('button') || e.target.closest('input')) return;
      isPanning = true;
      startPanX = e.clientX - canvasPanX;
      startPanY = e.clientY - canvasPanY;
      viewport.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
      if (!isPanning) return;
      canvasPanX = e.clientX - startPanX;
      canvasPanY = e.clientY - startPanY;
      updateCanvasTransform();
    });
    window.addEventListener('mouseup', () => {
      isPanning = false;
      if (viewport) viewport.style.cursor = 'grab';
    });
  }

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

  // Handle company select change
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

  // Handle Preset Pills
  document.querySelectorAll('.preset-pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.preset-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const pid = pill.dataset.presetId;
      loadPresetFlow(pid);
    };
  });

  // Handle AI Flow Generation via ChatGPT
  async function triggerAiFlowGen() {
    const prompt = (aiPromptInput?.value || '').trim();
    if (!prompt) {
      toast.info('AI Prompt', 'Please enter a description for the strategy flow you want to create.');
      aiPromptInput?.focus();
      return;
    }
    const spinner = $('aiFlowSpinner');
    const btnText = $('aiFlowBtnText');
    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.textContent = 'Generating...';
    if (aiGenBtn) aiGenBtn.disabled = true;

    toast.info('ChatGPT Agent', 'Synthesizing strategy flow architecture and writing Mermaid code with gpt-5-mini...');

    try {
      const profile = typeof getRequest === 'function' ? getRequest().profile : null;
      const res = await fetch('/api/strategy/ai-generate-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          company_context: select?.value || 'DDOG',
          startup_profile: profile
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      currentCompanyFlowData = data;
      renderCompanyFlow(data);
      toast.success('Strategy Flow Created', `Generated: ${data.title}`);
    } catch (err) {
      console.error('AI Flow generation failed:', err);
      toast.error('AI Flow Failed', err.message);
    } finally {
      if (spinner) spinner.style.display = 'none';
      if (btnText) btnText.textContent = 'Generate Strategy Flow';
      if (aiGenBtn) aiGenBtn.disabled = false;
    }
  }

  if (aiGenBtn) aiGenBtn.onclick = triggerAiFlowGen;
  if (aiPromptInput) {
    aiPromptInput.onkeydown = e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerAiFlowGen();
      }
    };
  }

  // Handle syntax toggle
  document.querySelectorAll('#toggleMermaidCodeBtn, #toggleMermaidCodeBtnTopbar, .toggle-mermaid-btn').forEach(btn => {
    btn.onclick = () => {
      const drawer = $('mermaidCodeDrawer');
      if (drawer) {
        const isShown = drawer.style.display === 'block';
        drawer.style.display = isShown ? 'none' : 'block';
        btn.classList.toggle('active', !isShown);
      }
    };
  });

  if (copyMermaidBtn) {
    copyMermaidBtn.onclick = () => {
      const raw = $('companyFlowRawCode');
      if (raw) {
        navigator.clipboard.writeText(raw.value);
        toast.success('Copied', 'Mermaid code copied to clipboard');
      }
    };
  }

  if (applyMermaidBtn) {
    applyMermaidBtn.onclick = () => {
      const raw = $('companyFlowRawCode');
      if (raw && currentCompanyFlowData) {
        currentCompanyFlowData.mermaid_code = raw.value;
        renderMermaidDiagram(currentCompanyFlowData);
        toast.success('Applied', 'Rendered updated Mermaid syntax');
      }
    };
  }

  // Handle Ask Live AI Analyst
  if (askAnalystBtn) {
    askAnalystBtn.onclick = async () => {
      const curComp = select?.value || 'DDOG';
      const curStage = currentDeepdiveData?.stage_index || 3;
      toast.info('AI Strategic Reasoning', `Synthesizing ${curComp} FY${currentDeepdiveData?.year || ''} with gpt-5-mini...`);
      try {
        await loadPhaseDeepdive(curStage);
        toast.success('Strategic Reasoning Ready', `Analyzed strategic shift and product lines for ${curComp}.`);
      } catch (e) {
        toast.error('AI Reasoning', e.message);
      }
    };
  }

  // Initialize Inspector Sub-Tabs
  document.querySelectorAll('.insp-tab-btn').forEach(btn => {
    btn.onclick = () => {
      const targetId = btn.dataset.inspTarget;
      if (!targetId) return;
      activeInspTab = targetId;

      document.querySelectorAll('.insp-tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.insp-tab-panel').forEach(p => {
        p.style.display = p.id === targetId ? 'block' : 'none';
      });
    };
  });

  // Global Helpers for Sidebar & Quick Actions
  window.selectCompany = function(ticker) {
    if (select) {
      select.value = ticker;
      select.dispatchEvent(new Event('change'));
    } else {
      loadCompanyFlow(ticker);
    }
  };
  window.loadPresetFlow = loadPresetFlow;

  // Default initial load: Process Flow Diagram Template matching reference image!
  loadPresetFlow('template-process-flow');
}

async function loadPresetFlow(presetId) {
  const diagramBox = $('companyFlowDiagramBox');
  if (diagramBox) diagramBox.style.opacity = '0.5';

  try {
    const res = await fetch(`/api/strategy/flow-template/${encodeURIComponent(presetId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentCompanyFlowData = data;
    renderCompanyFlow(data);

    // Initial inspector stage
    if (data.stages && data.stages.length > 0) {
      renderPhaseDeepdive(data.stages[0]);
    }
  } catch (err) {
    console.error('Failed to load preset flow:', err);
    toast.error('Preset Error', `Could not load preset ${presetId}`);
  } finally {
    if (diagramBox) diagramBox.style.opacity = '1';
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

    // Auto-select initial stage (e.g. stage closest to user ARR or Stage 3)
    let bestStage = 3;
    if (data.comparison && data.comparison.benchmark_stage) {
      const match = data.stages.find(s => s.year === data.comparison.benchmark_stage);
      if (match) bestStage = match.index;
    }
    loadPhaseDeepdive(Math.min(bestStage, data.stages_count));
  } catch (err) {
    console.error('Failed to load company strategy flow:', err);
    if (typeof toast !== 'undefined') toast.error('Flowchart Error', `Could not load flow for ${identifier}`);
  } finally {
    if (diagramBox) diagramBox.style.opacity = '1';
  }
}

async function loadPhaseDeepdive(stageIdxOrYear) {
  const currentCompany = $('companyFlowSelect')?.value || 'DDOG';
  const inspector = $('stageInspectorSection');
  if (inspector) inspector.style.opacity = '0.7';

  try {
    const res = await fetch(`/api/strategy/phase-deepdive/${encodeURIComponent(currentCompany)}/${encodeURIComponent(stageIdxOrYear)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentDeepdiveData = data;
    renderPhaseDeepdive(data);
    highlightFlowchartNode(data.stage_index);
    if (window.openInspectorSheet) window.openInspectorSheet();
  } catch (err) {
    console.error('Failed to load phase deepdive:', err);
  } finally {
    if (inspector) inspector.style.opacity = '1';
  }
}

function highlightFlowchartNode(stageIndex) {
  // Highlight in Mermaid or native SVG
  document.querySelectorAll('.flowchart-viewport .node, .flowchart-viewport .flow-svg-node').forEach((el, idx) => {
    const isTarget = (el.dataset && el.dataset.stage && String(el.dataset.stage) === String(stageIndex)) ||
                     (el.getAttribute('onclick') && el.getAttribute('onclick').includes(`'${stageIndex}'`)) ||
                     idx === (parseInt(stageIndex, 10) - 1);
    el.classList.toggle('active-stage', Boolean(isTarget));
  });
}

function renderPhaseDeepdive(data) {
  if (!data) return;
  const comp = data.company || currentCompanyFlowData?.company || { name: 'SaaS Platform' };
  const stageIdx = data.stage_index || data.id || '1';
  const stageYear = data.year || `Phase ${stageIdx}`;
  const why = data.strategic_why || {
    executive_summary: data.phase_title ? `${data.phase_title} scaling phase targeting ${data.revenue_formatted || '$50.0M'} ARR.` : 'Strategic execution phase.'
  };
  const fin = data.financial_strategy || {
    revenue: data.revenue_formatted || '$50.0M',
    revenue_growth: data.growth_formatted || '+80%',
    sales_marketing: data.sales_marketing_formatted || '40.0%',
    rd: data.rd_formatted || '28.0%',
    operating_margin: data.operating_margin_formatted || '-15.0%',
    rule_of_40: data.rule_of_40 ?? 65,
    fcf: data.fcf || '$12.0M',
    fcf_margin: data.fcf_margin || '+15.0%',
    cash: data.cash || '$85.0M',
    debt: '$0.0M'
  };
  const fw = data.frameworks || {};
  const deltas = why.deltas || {};

  // Badges & Header
  if ($('inspStageBadge')) $('inspStageBadge').textContent = `STAGE ${stageIdx} · ${stageYear}`;
  if ($('inspRevBadge')) $('inspRevBadge').textContent = `ARR: ${fin.revenue} (${fin.revenue_growth})`;
  if ($('inspR40Badge')) {
    $('inspR40Badge').textContent = `Rule of 40: ${fin.rule_of_40 ?? 'N/A'}`;
    $('inspR40Badge').className = (fin.rule_of_40 >= 40) ? 'inspector-kpi-badge badge-green' : 'inspector-kpi-badge';
  }
  if ($('inspStageTitle')) {
    $('inspStageTitle').textContent = `${stageYear} · ${comp.name} Strategic Milestone`;
  }
  const cp = data.copy_payload || {
    sales_marketing_ratio: parseFloat(fin.sales_marketing) || 40,
    rd_ratio: parseFloat(fin.rd) || 25
  };
  if ($('inspAdoptBtn')) {
    $('inspAdoptBtn').textContent = `📋 Copy ${stageYear} Levers (${cp.sales_marketing_ratio}% S&M, ${cp.rd_ratio}% R&D)`;
    $('inspAdoptBtn').onclick = () => copyStageLevers(cp);
  }
  if ($('dashAdoptBtn')) {
    $('dashAdoptBtn').textContent = `📋 Copy ${stageYear} Levers (${cp.sales_marketing_ratio}% S&M, ${cp.rd_ratio}% R&D)`;
    $('dashAdoptBtn').onclick = () => copyStageLevers(cp);
  }

  // 1. Strategic Why Panel
  if ($('inspExecutiveSummary')) {
    const smShift = deltas.sm_pp != null ? (deltas.sm_pp >= 0 ? `+${deltas.sm_pp}pp` : `${deltas.sm_pp}pp`) : '0pp';
    const rdShift = deltas.rd_pp != null ? (deltas.rd_pp >= 0 ? `+${deltas.rd_pp}pp` : `${deltas.rd_pp}pp`) : '0pp';
    $('inspExecutiveSummary').innerHTML = `
      <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--primary); letter-spacing:0.5px; margin-bottom:4px;">
        EXECUTIVE STRATEGY SYNTHESIS (${stageYear})
      </div>
      <div style="font-weight:700; font-size:15px; margin-bottom:6px;">${esc(why.executive_summary)}</div>
      <div style="display:flex; gap:10px; font-size:12px; margin-top:8px;">
        <span style="background:var(--surface); padding:3px 8px; border-radius:4px; border:1px solid var(--border);">S&M Delta: <strong>${smShift}</strong></span>
        <span style="background:var(--surface); padding:3px 8px; border-radius:4px; border:1px solid var(--border);">R&D Delta: <strong>${rdShift}</strong></span>
        <span style="background:var(--surface); padding:3px 8px; border-radius:4px; border:1px solid var(--border);">Free Cash Flow: <strong>${deltas.fcf_dollars || 'N/A'}</strong></span>
      </div>
    `;
  }
  if ($('inspSmWhy')) $('inspSmWhy').textContent = why.sm_why || 'Steady GTM execution.';
  if ($('inspRdWhy')) $('inspRdWhy').textContent = why.rd_why || 'Continuous release cadence.';
  if ($('inspMarginWhy')) $('inspMarginWhy').textContent = why.margin_why || 'Margin stability.';
  if ($('inspCapitalWhy')) $('inspCapitalWhy').textContent = why.capital_allocation || 'Cash preservation.';

  // 2. Product Lines & Frameworks Panel
  if ($('inspProductsGrid')) {
    const prods = data.product_lines || [];
    $('inspProductsGrid').innerHTML = prods.map(p => `
      <div class="insp-product-chip-card">
        <div class="insp-product-name">${esc(p.name)}</div>
        <div class="insp-product-meta">
          <span class="insp-product-tier">${esc(p.tier)}</span>
          <span class="insp-product-horizon">${esc(p.horizon || 'H1')}</span>
        </div>
        <div class="insp-product-role">${esc(p.role)}</div>
      </div>
    `).join('') || '<p style="font-size:12px; color:var(--text-muted);">Product lines expanding natively on platform.</p>';
  }

  // Frameworks: Ansoff Matrix
  if ($('inspAnsoffContent') && fw.ansoff) {
    const a = fw.ansoff;
    $('inspAnsoffContent').innerHTML = `
      <div style="font-weight:700; color:var(--text-main); margin-bottom:4px;">1. Market Penetration (${a.market_penetration.posture})</div>
      <ul>${a.market_penetration.initiatives.map(it => `<li>${esc(it)}</li>`).join('')}</ul>
      <div style="font-weight:700; color:var(--text-main); margin:8px 0 4px;">2. Product Development (${a.product_development.posture})</div>
      <ul>${a.product_development.initiatives.map(it => `<li>${esc(it)}</li>`).join('')}</ul>
      <div style="font-weight:700; color:var(--text-main); margin:8px 0 4px;">3. Market Development & Global (${a.market_development.posture})</div>
      <ul>${a.market_development.initiatives.map(it => `<li>${esc(it)}</li>`).join('')}</ul>
    `;
  }

  // Frameworks: McKinsey 3 Horizons
  if ($('inspMcKinseyContent') && fw.mckinsey) {
    const m = fw.mckinsey;
    $('inspMcKinseyContent').innerHTML = `
      <div style="font-weight:700; color:var(--text-main);">${m.horizon_1.title} (${m.horizon_1.revenue_share})</div>
      <p style="font-size:11px; margin:2px 0 6px;">${esc(m.horizon_1.focus)}</p>
      <div style="font-weight:700; color:var(--text-main);">${m.horizon_2.title} (${m.horizon_2.revenue_share})</div>
      <p style="font-size:11px; margin:2px 0 6px;">${esc(m.horizon_2.focus)}</p>
      <div style="font-weight:700; color:var(--text-main);">${m.horizon_3.title} (${m.horizon_3.revenue_share})</div>
      <p style="font-size:11px; margin:2px 0 0;">${esc(m.horizon_3.focus)}</p>
    `;
  }

  // Frameworks: BCG Matrix
  if ($('inspBcgContent') && fw.bcg) {
    const b = fw.bcg;
    $('inspBcgContent').innerHTML = `
      <div style="font-weight:700; color:#10b981;">${b.stars.label}</div>
      <p style="font-size:11px; margin:2px 0 6px;">Products: <strong>${b.stars.items.join(', ')}</strong></p>
      <div style="font-weight:700; color:#fb7185;">${b.cash_cows.label}</div>
      <p style="font-size:11px; margin:2px 0 6px;">Core: <strong>${b.cash_cows.items.join(', ')}</strong></p>
      <div style="font-weight:700; color:#f59e0b;">${b.question_marks.label}</div>
      <p style="font-size:11px; margin:2px 0 0;">Emerging: <strong>${b.question_marks.items.join(', ')}</strong></p>
    `;
  }

  // Frameworks: Porter's Moats
  if ($('inspPortersContent') && fw.porters) {
    $('inspPortersContent').innerHTML = fw.porters.map(p => `
      <div style="margin-bottom:8px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:var(--text-main); font-size:12px;">${esc(p.moat)}</strong>
          <span style="font-size:11px; font-weight:800; background:rgba(190,18,60,0.18); color:#fda4af; border:1px solid rgba(225,29,72,0.3); padding:1px 6px; border-radius:4px;">${p.score}/10 Moat</span>
        </div>
        <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${esc(p.rationale)}</div>
      </div>
    `).join('');
  }

  // 3. Financial Strategy Vitals
  if ($('inspVitalsGrid')) {
    const vitals = [
      { label: 'Annual Revenue', val: fin.revenue },
      { label: 'YoY Growth', val: fin.revenue_growth },
      { label: 'S&M Ratio', val: fin.sales_marketing_ratio },
      { label: 'R&D Ratio', val: fin.rd_ratio },
      { label: 'Gross Margin', val: fin.gross_margin },
      { label: 'Operating Margin', val: fin.operating_margin },
      { label: 'Free Cash Flow', val: fin.fcf },
      { label: 'FCF Margin', val: fin.fcf_margin },
      { label: 'Cash & Short-Term Inv', val: fin.cash },
      { label: 'Total Debt', val: fin.debt },
      { label: 'Rule of 40', val: fin.rule_of_40 != null ? fin.rule_of_40 : 'N/A' },
      { label: 'Runway Months', val: fin.runway_months != null ? `${fin.runway_months} mos` : 'Profitable' }
    ];

    $('inspVitalsGrid').innerHTML = vitals.map(v => `
      <div class="insp-vital-box">
        <span class="insp-vital-label">${esc(v.label)}</span>
        <span class="insp-vital-value">${esc(v.val)}</span>
      </div>
    `).join('');
  }

  if ($('inspSecUrl') && fin.source_urls && fin.source_urls[0]) {
    $('inspSecUrl').href = fin.source_urls[0];
    $('inspSecUrl').textContent = `View Official SEC 10-K (${data.year}) Disclosures ↗`;
  }

  // 4. Peer Contrast Card
  renderFlowComparison(currentCompanyFlowData?.comparison);
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

  if ($('companyFlowRawCode')) {
    $('companyFlowRawCode').value = data.mermaid_code || '';
  }

  // Render Mermaid Diagram with interactive click binding
  renderMermaidDiagram(data);

  // Render Comparison Card
  renderFlowComparison(data.comparison);
}

async function renderMermaidDiagram(data) {
  const container = $('companyFlowMermaid');
  if (!container) return;

  // High-fidelity interactive component canvas with animated pulse connectors & Bento cards
  if (data.id === 'template-process-flow' || data.id === 'template' || data.id === 'process-flow') {
    container.innerHTML = renderProcessFlowTemplateSvg(data.stages);
  } else {
    container.innerHTML = renderClusteredCompanySvg(data.stages, data);
  }
  bindSvgNodeClicks();
}

async function renderRawMermaidDiagram(data) {
  const container = $('companyFlowMermaid');
  if (!container) return;
  if (typeof mermaid !== 'undefined' && mermaid.render) {
    try {
      const isDark = document.documentElement.classList.contains('dark');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'base',
        themeVariables: {
          background: isDark ? '#0f172a' : '#ffffff',
          primaryColor: isDark ? '#1e293b' : '#ffffff',
          primaryTextColor: isDark ? '#f8fafc' : '#0f172a',
          primaryBorderColor: isDark ? '#334155' : '#cbd5e1',
          lineColor: '#64748b',
          textColor: isDark ? '#f8fafc' : '#0f172a'
        }
      });
      const renderId = 'mermaid_svg_' + Math.floor(Math.random() * 1000000);
      const { svg } = await mermaid.render(renderId, data.mermaid_code || '');
      if (svg && svg.includes('<svg')) {
        container.innerHTML = svg;
        bindMermaidNodeClicks();
      }
    } catch (err) {
      console.warn('Mermaid rendering issue, keeping component canvas:', err);
      renderMermaidDiagram(data);
    }
  }
}

function bindMermaidNodeClicks() {
  const container = $('companyFlowMermaid');
  if (!container) return;

  // Direct click bindings on all Mermaid flowchart nodes
  container.querySelectorAll('g.node').forEach((nodeEl, idx) => {
    nodeEl.style.cursor = 'pointer';
    nodeEl.onclick = () => {
      loadPhaseDeepdive(idx + 1);
      if (window.openInspectorSheet) window.openInspectorSheet();
    };
  });

  // Direct click bindings on edge labels
  container.querySelectorAll('.edgeLabel').forEach((edgeEl, idx) => {
    edgeEl.style.cursor = 'pointer';
    edgeEl.onclick = () => {
      loadPhaseDeepdive(idx + 2);
      if (window.openInspectorSheet) window.openInspectorSheet();
    };
  });
}

function bindSvgNodeClicks() {
  const container = $('companyFlowMermaid');
  if (!container) return;

  container.querySelectorAll('.flow-svg-node').forEach((nodeEl, idx) => {
    nodeEl.style.cursor = 'pointer';
    nodeEl.onclick = () => {
      loadPhaseDeepdive(idx + 1);
      if (window.openInspectorSheet) window.openInspectorSheet();
    };
  });
}

function renderFlowComparison(comp) {
  const card = $('companyFlowComparisonCard');
  if (!card) return;
  if (!comp) {
    card.innerHTML = `<div style="color:var(--text-muted); font-size:13px; padding:16px;">Set your startup revenue profile in the drawer to see strategic gap analysis against this peer.</div>`;
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
    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
      <div>
        <div class="contrast-badge-strip">
          <span style="font-size:11px; font-weight:800; text-transform:uppercase; color:var(--text-muted); letter-spacing:0.5px;">STRATEGIC CONTRAST</span>
          <span class="kpi-tag" style="background:rgba(16,185,129,0.15); color:#6ee7b7; border:1px solid rgba(16,185,129,0.3);">Matched Scale: ${esc(comp.benchmark_revenue)} ARR</span>
          <span class="kpi-tag" style="background:rgba(190,18,60,0.2); color:#fda4af; border:1px solid rgba(225,29,72,0.35);">Peer Period: ${esc(comp.benchmark_stage)}</span>
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

function copyStageLevers(payload) {
  if (!payload) return;
  if ($('salesTarget') && payload.sales_marketing_ratio != null) {
    $('salesTarget').value = payload.sales_marketing_ratio;
    if ($('salesOn')) $('salesOn').checked = true;
  }
  if ($('rdTarget') && payload.rd_ratio != null) {
    $('rdTarget').value = payload.rd_ratio;
    if ($('rdOn')) $('rdOn').checked = true;
  }
  if ($('objective') && payload.objective) {
    $('objective').value = payload.objective;
  }

  updateLocalKPIs();
  run(false);

  if (typeof toast !== 'undefined') {
    toast.success(
      'Strategy Levers Adopted!',
      `Injected ${payload.strategy_name || 'phase'}: Target S&M set to ${payload.sales_marketing_ratio}%, R&D set to ${payload.rd_ratio}%.`
    );
  }
}

/* ==========================================================================
   Component-Driven Clustered Company Strategy Flow Engine
   Renders rich Bento milestone cards, concentric port pins, and animated pulse paths
   ========================================================================== */
function renderClusteredCompanySvg(stages, flowData) {
  if (!stages || !stages.length) return '';
  const isDark = document.documentElement.classList.contains('dark');

  const pal = isDark ? {
    cyanBg: '#081421', cyanStroke: '#06b6d4', cyanHeader: '#22d3ee',
    purpleBg: '#160e24', purpleStroke: '#a855f7', purpleHeader: '#c084fc',
    blueBg: '#0a172a', blueStroke: '#3b82f6', blueHeader: '#60a5fa',
    cardBg: '#111d2e', cardBorder: '#1e293b',
    title: '#f8fafc', sub: '#94a3b8',
    edgeLine: '#475569', edgePulse: '#38bdf8', badgeBg: '#0f172a', badgeBorder: '#334155', badgeText: '#f8fafc'
  } : {
    cyanBg: '#f0fdfa', cyanStroke: '#0d9488', cyanHeader: '#0f766e',
    purpleBg: '#faf5ff', purpleStroke: '#9333ea', purpleHeader: '#7e22ce',
    blueBg: '#eff6ff', blueStroke: '#2563eb', blueHeader: '#1d4ed8',
    cardBg: '#ffffff', cardBorder: '#cbd5e1',
    title: '#0f172a', sub: '#64748b',
    edgeLine: '#94a3b8', edgePulse: '#0284c7', badgeBg: '#ffffff', badgeBorder: '#cbd5e1', badgeText: '#0f172a'
  };

  const n = stages.length;
  const k1 = Math.max(1, Math.floor(n / 3));
  const k2 = Math.max(k1 + 1, Math.floor((2 * n) / 3));

  const g1Stages = stages.slice(0, k1);
  const g2Stages = stages.slice(k1, k2);
  const g3Stages = stages.slice(k2);

  const W = 1120;
  const cW = 264;
  const cH = 98;
  const c1X = 40;
  const c1Y = 45;

  let defs = `
    <defs>
      <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#06b6d4" flood-opacity="0.2"/>
      </filter>
      <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#a855f7" flood-opacity="0.2"/>
      </filter>
      <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#3b82f6" flood-opacity="0.2"/>
      </filter>
      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.06"/>
      </filter>
      <marker id="arrowHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 7 5 L 0 8 z" fill="${pal.edgeLine}"/>
      </marker>
    </defs>
  `;

  // 1. Cluster 1: Initial Traction & PMF (Cyan)
  const g1H = g1Stages.length * 118 + 55;
  let g1Html = `
    <g class="process-subgraph-cyan" filter="url(#cyanGlow)">
      <rect x="${c1X}" y="${c1Y}" width="${cW + 40}" height="${g1H}" rx="16" fill="${pal.cyanBg}" stroke="${pal.cyanStroke}" stroke-width="2.5"/>
      <text x="${c1X + 20}" y="${c1Y + 28}" font-size="11" font-weight="800" fill="${pal.cyanHeader}" letter-spacing="0.5">PHASE 1 · INITIAL GTM &amp; TRACTION</text>
  `;
  g1Stages.forEach((s, i) => {
    const cardY = c1Y + 42 + i * 115;
    const cardX = c1X + 20;
    const r40Val = s.rule_of_40 != null ? `R40: ${s.rule_of_40}` : '';
    g1Html += `
      <g class="flow-svg-node" onclick="selectFlowPhase('${s.id || s.index}')" filter="url(#cardShadow)" data-stage="${s.index || s.id}" style="cursor:pointer;">
        <rect class="card-bg" x="${cardX}" y="${cardY}" width="${cW}" height="${cH}" rx="10" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1.5"/>
        <rect x="${cardX + 14}" y="${cardY + 12}" width="80" height="18" rx="4" fill="#e0f2fe"/>
        <text x="${cardX + 20}" y="${cardY + 25}" font-size="10" font-weight="800" fill="#0369a1">${esc(s.year)} · STAGE ${s.index || i+1}</text>
        <text x="${cardX + 14}" y="${cardY + 47}" font-size="13" font-weight="700" fill="${pal.title}">${esc(s.phase_title.length > 28 ? s.phase_title.slice(0, 27) + '…' : s.phase_title)}</text>
        <text x="${cardX + 14}" y="${cardY + 68}" font-size="14" font-weight="900" fill="#0284c7">ARR: ${esc(s.revenue_formatted)} <tspan font-size="11" font-weight="700" fill="#059669">(${esc(s.growth_formatted)})</tspan></text>
        <text x="${cardX + 14}" y="${cardY + 86}" font-size="10.5" font-weight="600" fill="${pal.sub}">S&amp;M: ${esc(s.sales_marketing_formatted)} | R&amp;D: ${esc(s.rd_formatted)} ${r40Val ? '| ' + r40Val : ''}</text>
        <circle cx="${cardX + cW}" cy="${cardY + cH/2}" r="6" fill="${pal.cardBg}" stroke="${pal.cyanStroke}" stroke-width="2"/>
        <circle cx="${cardX + cW}" cy="${cardY + cH/2}" r="2.5" fill="#0284c7"/>
      </g>
    `;
    if (i > 0) {
      const prevY = c1Y + 42 + (i - 1) * 115 + cH;
      g1Html += `
        <line x1="${cardX + cW/2}" y1="${prevY}" x2="${cardX + cW/2}" y2="${cardY}" stroke="${pal.edgeLine}" stroke-width="2"/>
        <path class="flow-pulse-edge" d="M ${cardX + cW/2} ${prevY} L ${cardX + cW/2} ${cardY}" stroke="${pal.edgePulse}" stroke-width="2"/>
      `;
    }
  });
  g1Html += `</g>`;

  // 2. Cluster 2: Scale Engine & Multi-Product (Purple)
  const c2X = c1X;
  const c2Y = c1Y + g1H + 35;
  const g2H = g2Stages.length * 118 + 55;
  let g2Html = `
    <g class="process-subgraph-purple" filter="url(#purpleGlow)">
      <rect x="${c2X}" y="${c2Y}" width="${cW + 40}" height="${g2H}" rx="16" fill="${pal.purpleBg}" stroke="${pal.purpleStroke}" stroke-width="2.5"/>
      <text x="${c2X + 20}" y="${c2Y + 28}" font-size="11" font-weight="800" fill="${pal.purpleHeader}" letter-spacing="0.5">PHASE 2 · SCALE ENGINE &amp; MULTI-PRODUCT</text>
  `;
  g2Stages.forEach((s, i) => {
    const cardY = c2Y + 42 + i * 115;
    const cardX = c2X + 20;
    const r40Val = s.rule_of_40 != null ? `R40: ${s.rule_of_40}` : '';
    g2Html += `
      <g class="flow-svg-node" onclick="selectFlowPhase('${s.id || s.index}')" filter="url(#cardShadow)" data-stage="${s.index || s.id}" style="cursor:pointer;">
        <rect class="card-bg" x="${cardX}" y="${cardY}" width="${cW}" height="${cH}" rx="10" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1.5"/>
        <rect x="${cardX + 14}" y="${cardY + 12}" width="80" height="18" rx="4" fill="#f3e8ff"/>
        <text x="${cardX + 20}" y="${cardY + 25}" font-size="10" font-weight="800" fill="#7e22ce">${esc(s.year)} · STAGE ${s.index || (k1 + i + 1)}</text>
        <text x="${cardX + 14}" y="${cardY + 47}" font-size="13" font-weight="700" fill="${pal.title}">${esc(s.phase_title.length > 28 ? s.phase_title.slice(0, 27) + '…' : s.phase_title)}</text>
        <text x="${cardX + 14}" y="${cardY + 68}" font-size="14" font-weight="900" fill="#7c3aed">ARR: ${esc(s.revenue_formatted)} <tspan font-size="11" font-weight="700" fill="#059669">(${esc(s.growth_formatted)})</tspan></text>
        <text x="${cardX + 14}" y="${cardY + 86}" font-size="10.5" font-weight="600" fill="${pal.sub}">S&amp;M: ${esc(s.sales_marketing_formatted)} | R&amp;D: ${esc(s.rd_formatted)} ${r40Val ? '| ' + r40Val : ''}</text>
        <circle cx="${cardX + cW}" cy="${cardY + cH/2}" r="6" fill="${pal.cardBg}" stroke="${pal.purpleStroke}" stroke-width="2"/>
        <circle cx="${cardX + cW}" cy="${cardY + cH/2}" r="2.5" fill="#7c3aed"/>
      </g>
    `;
    if (i > 0) {
      const prevY = c2Y + 42 + (i - 1) * 115 + cH;
      g2Html += `
        <line x1="${cardX + cW/2}" y1="${prevY}" x2="${cardX + cW/2}" y2="${cardY}" stroke="${pal.edgeLine}" stroke-width="2"/>
        <path class="flow-pulse-edge" d="M ${cardX + cW/2} ${prevY} L ${cardX + cW/2} ${cardY}" stroke="#a855f7" stroke-width="2"/>
      `;
    }
  });
  g2Html += `</g>`;

  // Connector between Cluster 1 and Cluster 2
  const interLine = `
    <path d="M ${c1X + 20 + cW/2} ${c1Y + g1H} L ${c1X + 20 + cW/2} ${c2Y}" stroke="${pal.edgeLine}" stroke-width="2"/>
    <path class="flow-pulse-edge" d="M ${c1X + 20 + cW/2} ${c1Y + g1H} L ${c1X + 20 + cW/2} ${c2Y}" stroke="${pal.edgePulse}" stroke-width="2.5"/>
    <circle cx="${c1X + 20 + cW/2}" cy="${c1Y + g1H}" r="4" fill="${pal.cyanStroke}"/>
    <circle cx="${c1X + 20 + cW/2}" cy="${c2Y}" r="4" fill="${pal.purpleStroke}"/>
  `;

  // 3. Cluster 3: Enterprise Platform & Moat (Blue - Right side)
  const c3X = 720;
  const c3Y = 45;
  const g3H = Math.max(g3Stages.length * 128 + 55, 360);
  let g3Html = `
    <g class="process-subgraph-blue" filter="url(#blueGlow)">
      <rect x="${c3X}" y="${c3Y}" width="${cW + 40}" height="${g3H}" rx="16" fill="${pal.blueBg}" stroke="${pal.blueStroke}" stroke-width="2.5"/>
      <text x="${c3X + 20}" y="${c3Y + 28}" font-size="11" font-weight="800" fill="${pal.blueHeader}" letter-spacing="0.5">PHASE 3 · ENTERPRISE PLATFORM &amp; MOAT</text>
  `;
  g3Stages.forEach((s, i) => {
    const cardY = c3Y + 42 + i * 125;
    const cardX = c3X + 20;
    const r40Val = s.rule_of_40 != null ? `Rule of 40: ${s.rule_of_40}` : '';
    g3Html += `
      <g class="flow-svg-node" onclick="selectFlowPhase('${s.id || s.index}')" filter="url(#cardShadow)" data-stage="${s.index || s.id}" style="cursor:pointer;">
        <rect class="card-bg" x="${cardX}" y="${cardY}" width="${cW}" height="${cH + 8}" rx="10" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1.5"/>
        <rect x="${cardX + 14}" y="${cardY + 12}" width="80" height="18" rx="4" fill="#dbeafe"/>
        <text x="${cardX + 20}" y="${cardY + 25}" font-size="10" font-weight="800" fill="#1d4ed8">${esc(s.year)} · STAGE ${s.index || (k2 + i + 1)}</text>
        <text x="${cardX + 14}" y="${cardY + 48}" font-size="13.5" font-weight="800" fill="${pal.title}">${esc(s.phase_title.length > 28 ? s.phase_title.slice(0, 27) + '…' : s.phase_title)}</text>
        <text x="${cardX + 14}" y="${cardY + 70}" font-size="14" font-weight="900" fill="#2563eb">ARR: ${esc(s.revenue_formatted)} <tspan font-size="11" font-weight="700" fill="#059669">(${esc(s.growth_formatted)})</tspan></text>
        <text x="${cardX + 14}" y="${cardY + 90}" font-size="10.5" font-weight="600" fill="#059669">S&amp;M: ${esc(s.sales_marketing_formatted)} | R&amp;D: ${esc(s.rd_formatted)} | ${r40Val}</text>
        <circle cx="${cardX}" cy="${cardY + (cH+8)/2}" r="6" fill="${pal.cardBg}" stroke="${pal.blueStroke}" stroke-width="2"/>
        <circle cx="${cardX}" cy="${cardY + (cH+8)/2}" r="2.5" fill="#2563eb"/>
      </g>
    `;
    if (i > 0) {
      const prevY = c3Y + 42 + (i - 1) * 125 + cH + 8;
      g3Html += `
        <line x1="${cardX + cW/2}" y1="${prevY}" x2="${cardX + cW/2}" y2="${cardY}" stroke="${pal.edgeLine}" stroke-width="2"/>
        <path class="flow-pulse-edge" d="M ${cardX + cW/2} ${prevY} L ${cardX + cW/2} ${cardY}" stroke="#2563eb" stroke-width="2"/>
      `;
    }
  });
  g3Html += `</g>`;

  // Middle Bridge Connectors (Between Cluster 1 / 2 and Cluster 3)
  const bridgeX1 = c1X + 20 + cW;
  const bridgeY1 = c1Y + 42 + cH/2;
  const bridgeX2 = c3X + 20;
  const bridgeY2 = c3Y + 42 + cH/2;

  const bridgePath1 = `M ${bridgeX1} ${bridgeY1} C ${bridgeX1 + 130} ${bridgeY1}, ${bridgeX2 - 130} ${bridgeY2}, ${bridgeX2} ${bridgeY2}`;
  
  const bridge2Y1 = c2Y + 42 + cH/2;
  const bridge2Y2 = c3Y + 42 + (g3Stages.length > 1 ? 125 : 0) + cH/2;
  const bridgePath2 = `M ${bridgeX1} ${bridge2Y1} C ${bridgeX1 + 130} ${bridge2Y1}, ${bridgeX2 - 130} ${bridge2Y2}, ${bridgeX2} ${bridge2Y2}`;

  const bridgeHtml = `
    <!-- Top Bridge Connector -->
    <path d="${bridgePath1}" fill="none" stroke="${pal.edgeLine}" stroke-width="2" marker-end="url(#arrowHead)"/>
    <path class="flow-pulse-edge" d="${bridgePath1}" fill="none" stroke="${pal.edgePulse}" stroke-width="2.5"/>
    <g class="edge-badge-group" transform="translate(${(bridgeX1 + bridgeX2)/2 - 60}, ${(bridgeY1 + bridgeY2)/2 - 13})" onclick="selectFlowPhase('${g3Stages[0]?.id || g3Stages[0]?.index || 3}')">
      <rect width="120" height="24" rx="12" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1.5"/>
      <text x="60" y="16" font-size="9.5" font-weight="700" fill="${pal.badgeText}" text-anchor="middle">Enterprise Expansion ↗</text>
    </g>

    <!-- Bottom Bridge Connector -->
    <path d="${bridgePath2}" fill="none" stroke="${pal.edgeLine}" stroke-width="2" marker-end="url(#arrowHead)"/>
    <path class="flow-pulse-edge" d="${bridgePath2}" fill="none" stroke="#7c3aed" stroke-width="2.5"/>
    <g class="edge-badge-group" transform="translate(${(bridgeX1 + bridgeX2)/2 - 65}, ${(bridge2Y1 + bridge2Y2)/2 - 13})" onclick="selectFlowPhase('${stages[stages.length-1]?.id || stages[stages.length-1]?.index || stages.length}')">
      <rect width="130" height="24" rx="12" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1.5"/>
      <text x="65" y="16" font-size="9.5" font-weight="700" fill="${pal.badgeText}" text-anchor="middle">Rule of 40 Compounding ↗</text>
    </g>
  `;

  const totalH = Math.max(680, c2Y + g2H + 45, c3Y + g3H + 45);

  return `
    <svg viewBox="0 0 ${W} ${totalH}" width="${W}" height="${totalH}" style="min-width:${W}px; min-height:${totalH}px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      ${defs}
      ${g1Html}
      ${g2Html}
      ${interLine}
      ${bridgeHtml}
      ${g3Html}
    </svg>
  `;
}

function renderNativeSvgFlowchart(stages) {
  if (currentCompanyFlowData && (currentCompanyFlowData.id === 'template-process-flow' || currentCompanyFlowData.id === 'template')) {
    return renderProcessFlowTemplateSvg(stages);
  }
  return renderClusteredCompanySvg(stages, currentCompanyFlowData);
}

/* Vector-Sharp Replica of the Process Flow Diagram Template with Animated Pulse Connectors */
function renderProcessFlowTemplateSvg(stages) {
  const W = 1040;
  const H = 640;
  const isDark = document.documentElement.classList.contains('dark');

  const pal = isDark ? {
    cyanBg: '#081421', cyanStroke: '#06b6d4', cyanHeader: '#22d3ee',
    purpleBg: '#160e24', purpleStroke: '#a855f7', purpleHeader: '#c084fc',
    blueBg: '#0a172a', blueStroke: '#3b82f6', blueHeader: '#60a5fa',
    cardBg: '#111d2e', cardBorder: '#1e293b',
    cardPurpleBg: '#1f1433', cardPurpleBorder: '#2e1b4d',
    cardBlueBg: '#0e223f', cardBlueBorder: '#1d3b66',
    cardMidBg: '#0f172a', cardMidBorder: '#334155',
    title: '#f8fafc', sub: '#94a3b8',
    edgeLine: '#64748b', badgeBg: '#ffffff', badgeBorder: '#94a3b8', badgeText: '#0f172a'
  } : {
    cyanBg: '#f0fdfa', cyanStroke: '#0d9488', cyanHeader: '#0f766e',
    purpleBg: '#faf5ff', purpleStroke: '#9333ea', purpleHeader: '#7e22ce',
    blueBg: '#eff6ff', blueStroke: '#2563eb', blueHeader: '#1d4ed8',
    cardBg: '#ffffff', cardBorder: '#cbd5e1',
    cardPurpleBg: '#ffffff', cardPurpleBorder: '#cbd5e1',
    cardBlueBg: '#ffffff', cardBlueBorder: '#cbd5e1',
    cardMidBg: '#ffffff', cardMidBorder: '#cbd5e1',
    title: '#0f172a', sub: '#64748b',
    edgeLine: '#64748b', badgeBg: '#ffffff', badgeBorder: '#cbd5e1', badgeText: '#0f172a'
  };

  return `
  <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="min-width:${W}px; min-height:${H}px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <defs>
      <!-- Pin / Dot Indicators -->
      <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#06b6d4" flood-opacity="0.2"/>
      </filter>
      <filter id="purpleGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#a855f7" flood-opacity="0.2"/>
      </filter>
      <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#3b82f6" flood-opacity="0.2"/>
      </filter>
      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.06"/>
      </filter>
      <marker id="arrowRight" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 7 5 L 0 8 z" fill="${pal.edgeLine}"/>
      </marker>
    </defs>

    <!-- Subgraph 1: Cyan Container (Top-Left) -->
    <g class="process-subgraph-cyan" filter="url(#cyanGlow)">
      <rect x="40" y="40" width="280" height="260" rx="16" ry="16" fill="${pal.cyanBg}" stroke="${pal.cyanStroke}" stroke-width="2.5"/>
      <text x="60" y="70" font-size="11" font-weight="800" fill="${pal.cyanHeader}" letter-spacing="0.5">PHASE 1 · PRODUCT-MARKET FIT</text>
      
      <!-- Card A1 (Core Dev) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('A1')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="58" y="85" width="244" height="85" rx="10" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1.5"/>
        <text x="76" y="112" font-size="14" font-weight="800" fill="${pal.title}">Etiam elem</text>
        <text x="76" y="132" font-size="11.5" fill="${pal.sub}">Quisque ore sapien</text>
        <text x="76" y="152" font-size="11" font-weight="700" fill="#0284c7">ARR: $5.0M · S&amp;M: 52%</text>
        <!-- Port Dot -->
        <circle cx="180" cy="170" r="7" fill="${pal.cardBg}" stroke="${pal.cyanStroke}" stroke-width="2"/>
        <circle cx="180" cy="170" r="2.5" fill="#0284c7"/>
      </g>

      <!-- Card A2 (PLG Funnel) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('A2')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="58" y="195" width="244" height="85" rx="10" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1.5"/>
        <text x="76" y="222" font-size="14" font-weight="800" fill="${pal.title}">Etiam elem</text>
        <text x="76" y="242" font-size="11.5" fill="${pal.sub}">Quisque ore sapien</text>
        <text x="76" y="262" font-size="11" font-weight="700" fill="#0284c7">ARR: $15.0M · S&amp;M: 46%</text>
        <!-- Port Dot Right -->
        <circle cx="302" cy="237" r="7" fill="${pal.cardBg}" stroke="${pal.cyanStroke}" stroke-width="2"/>
        <circle cx="302" cy="237" r="2.5" fill="#0284c7"/>
      </g>
      
      <!-- Internal vertical connector -->
      <line x1="180" y1="170" x2="180" y2="195" stroke="${pal.edgeLine}" stroke-width="2"/>
      <path class="flow-pulse-edge" d="M 180 170 L 180 195" fill="none" stroke="#06b6d4" stroke-width="2"/>
    </g>

    <!-- Subgraph 2: Purple Container (Bottom-Left) -->
    <g class="process-subgraph-purple" filter="url(#purpleGlow)">
      <rect x="40" y="340" width="280" height="260" rx="16" ry="16" fill="${pal.purpleBg}" stroke="${pal.purpleStroke}" stroke-width="2.5"/>
      <text x="60" y="370" font-size="11" font-weight="800" fill="${pal.purpleHeader}" letter-spacing="0.5">PHASE 2 · GTM SCALE ENGINE</text>

      <!-- Card B1 (Inside Sales) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('B1')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="58" y="385" width="244" height="85" rx="10" fill="${pal.cardPurpleBg}" stroke="${pal.cardPurpleBorder}" stroke-width="1.5"/>
        <text x="76" y="412" font-size="14" font-weight="800" fill="${pal.title}">Etiam elem</text>
        <text x="76" y="432" font-size="11.5" fill="${pal.sub}">Quisque ore sapien</text>
        <text x="76" y="452" font-size="11" font-weight="700" fill="#7c3aed">ARR: $35.0M · S&amp;M: 42%</text>
        <!-- Port Dot -->
        <circle cx="180" cy="470" r="7" fill="${pal.cardPurpleBg}" stroke="${pal.purpleStroke}" stroke-width="2"/>
        <circle cx="180" cy="470" r="2.5" fill="#7c3aed"/>
      </g>

      <!-- Card B2 (Multi-Product) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('B2')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="58" y="495" width="244" height="85" rx="10" fill="${pal.cardPurpleBg}" stroke="${pal.cardPurpleBorder}" stroke-width="1.5"/>
        <text x="76" y="522" font-size="14" font-weight="800" fill="${pal.title}">Etiam elem</text>
        <text x="76" y="542" font-size="11.5" fill="${pal.sub}">Quisque ore sapien</text>
        <text x="76" y="562" font-size="11" font-weight="700" fill="#7c3aed">ARR: $75.0M · S&amp;M: 38%</text>
        <!-- Port Dot Right -->
        <circle cx="302" cy="537" r="7" fill="${pal.cardPurpleBg}" stroke="${pal.purpleStroke}" stroke-width="2"/>
        <circle cx="302" cy="537" r="2.5" fill="#7c3aed"/>
      </g>

      <!-- Internal vertical connector -->
      <line x1="180" y1="470" x2="180" y2="495" stroke="${pal.edgeLine}" stroke-width="2"/>
      <path class="flow-pulse-edge" d="M 180 470 L 180 495" fill="none" stroke="#a855f7" stroke-width="2"/>
    </g>

    <!-- Connector between Cyan and Purple Containers -->
    <path d="M 180 300 L 180 340" stroke="${pal.edgeLine}" stroke-width="2"/>
    <path class="flow-pulse-edge" d="M 180 300 L 180 340" fill="none" stroke="#64748b" stroke-width="2"/>
    <circle cx="180" cy="300" r="5" fill="${pal.cardBg}" stroke="${pal.cyanStroke}" stroke-width="2"/>
    <circle cx="180" cy="340" r="5" fill="${pal.cardPurpleBg}" stroke="${pal.purpleStroke}" stroke-width="2"/>

    <!-- Middle Floating Cards (Bridge Trajectory) -->
    <!-- Card M1 (Mid-Market Inflection) -->
    <g class="flow-svg-node" onclick="selectFlowPhase('M1')" style="cursor:pointer;" filter="url(#cardShadow)">
      <rect class="card-bg" x="390" y="240" width="190" height="95" rx="10" fill="${pal.cardMidBg}" stroke="${pal.cardMidBorder}" stroke-width="1.5"/>
      <text x="410" y="270" font-size="14" font-weight="800" fill="${pal.title}">Etiam elementum</text>
      <text x="410" y="292" font-size="11.5" fill="${pal.sub}">Quisque ornare sapien</text>
      <text x="410" y="314" font-size="11" font-weight="700" fill="#0284c7">ARR: $120.0M · 60%</text>
      <circle cx="390" cy="287" r="6" fill="${pal.cardMidBg}" stroke="${pal.edgeLine}" stroke-width="2"/>
      <circle cx="580" cy="287" r="6" fill="${pal.cardMidBg}" stroke="${pal.edgeLine}" stroke-width="2"/>
    </g>

    <!-- Card M2 (Channel Ecosystem) -->
    <g class="flow-svg-node" onclick="selectFlowPhase('M2')" style="cursor:pointer;" filter="url(#cardShadow)">
      <rect class="card-bg" x="390" y="470" width="190" height="95" rx="10" fill="${pal.cardMidBg}" stroke="${pal.cardMidBorder}" stroke-width="1.5"/>
      <text x="410" y="500" font-size="14" font-weight="800" fill="${pal.title}">Etiam elementum</text>
      <text x="410" y="522" font-size="11.5" fill="${pal.sub}">Quisque ornare sapien</text>
      <text x="410" y="544" font-size="11" font-weight="700" fill="#7c3aed">ARR: $200.0M · 50%</text>
      <circle cx="390" cy="517" r="6" fill="${pal.cardMidBg}" stroke="${pal.edgeLine}" stroke-width="2"/>
      <circle cx="580" cy="517" r="6" fill="${pal.cardMidBg}" stroke="${pal.edgeLine}" stroke-width="2"/>
    </g>

    <!-- Subgraph 3: Blue Container (Right) -->
    <g class="process-subgraph-blue" filter="url(#blueGlow)">
      <rect x="670" y="170" width="330" height="390" rx="16" ry="16" fill="${pal.blueBg}" stroke="${pal.blueStroke}" stroke-width="2.5"/>
      <text x="695" y="205" font-size="11" font-weight="800" fill="${pal.blueHeader}" letter-spacing="0.5">PHASE 3 · ENTERPRISE PLATFORM &amp; MOAT</text>

      <!-- Card C1 (Enterprise Suite GA) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('C1')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="692" y="225" width="286" height="135" rx="12" fill="${pal.cardBlueBg}" stroke="${pal.cardBlueBorder}" stroke-width="1.5"/>
        <text x="714" y="260" font-size="15" font-weight="800" fill="${pal.title}">Etiam elementum</text>
        <text x="714" y="285" font-size="12" fill="${pal.sub}">Quisque ornare sapien</text>
        <text x="714" y="310" font-size="12" font-weight="700" fill="#2563eb">Enterprise Security · ARR: $450.0M</text>
        <text x="714" y="332" font-size="11" font-weight="600" fill="#059669">S&amp;M: 32% | R&amp;D: 23% | Rule of 40: 52</text>
        <circle cx="692" cy="292" r="7" fill="${pal.cardBlueBg}" stroke="${pal.blueStroke}" stroke-width="2"/>
        <circle cx="692" cy="292" r="2.5" fill="#2563eb"/>
      </g>

      <!-- Card C2 (Operating Cash Machine) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('C2')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="692" y="390" width="286" height="135" rx="12" fill="${pal.cardBlueBg}" stroke="${pal.cardBlueBorder}" stroke-width="1.5"/>
        <text x="714" y="425" font-size="15" font-weight="800" fill="${pal.title}">Etiam elementum</text>
        <text x="714" y="450" font-size="12" fill="${pal.sub}">Quisque ornare sapien</text>
        <text x="714" y="475" font-size="12" font-weight="700" fill="#059669">Operating Leverage · ARR: $850.0M</text>
        <text x="714" y="497" font-size="11" font-weight="600" fill="#0284c7">FCF Margin: 28% | Rule of 40: 54</text>
        <circle cx="692" cy="457" r="7" fill="${pal.cardBlueBg}" stroke="${pal.blueStroke}" stroke-width="2"/>
        <circle cx="692" cy="457" r="2.5" fill="#059669"/>
      </g>

      <!-- Internal vertical connector between C1 and C2 -->
      <line x1="835" y1="360" x2="835" y2="390" stroke="${pal.blueStroke}" stroke-width="2"/>
      <path class="flow-pulse-edge" d="M 835 360 L 835 390" fill="none" stroke="#3b82f6" stroke-width="2"/>
      <circle cx="835" cy="360" r="5" fill="${pal.cardBlueBg}" stroke="${pal.blueStroke}" stroke-width="1.5"/>
      <circle cx="835" cy="390" r="5" fill="${pal.cardBlueBg}" stroke="${pal.blueStroke}" stroke-width="1.5"/>
    </g>

    <!-- Edge Connectors with High-Contrast Pill Badges & Animated Pulses -->
    <!-- Edge 1: Card A2 -> Card M1 -->
    <path d="M 302 237 L 340 237 L 340 287 L 384 287" fill="none" stroke="${pal.edgeLine}" stroke-width="2" marker-end="url(#arrowRight)"/>
    <path class="flow-pulse-edge" d="M 302 237 L 340 237 L 340 287 L 384 287" fill="none" stroke="#0284c7" stroke-width="2.5"/>
    <g class="edge-badge-group" transform="translate(315, 218)" onclick="selectFlowPhase('M1')">
      <rect width="130" height="24" rx="12" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1.5"/>
      <text x="65" y="16" font-size="9.5" font-weight="700" fill="${pal.badgeText}" text-anchor="middle">Quisque ornare ut nequetemes</text>
    </g>

    <!-- Edge 2: Card B2 -> Card M2 -->
    <path d="M 302 537 L 384 537" fill="none" stroke="${pal.edgeLine}" stroke-width="2" marker-end="url(#arrowRight)"/>
    <path class="flow-pulse-edge" d="M 302 537 L 384 537" fill="none" stroke="#7c3aed" stroke-width="2.5"/>
    <g class="edge-badge-group" transform="translate(320, 520)" onclick="selectFlowPhase('M2')">
      <rect width="80" height="22" rx="11" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1.5"/>
      <text x="40" y="15" font-size="9.5" font-weight="700" fill="${pal.badgeText}" text-anchor="middle">Quisque ornare</text>
    </g>

    <!-- Edge 3: Card M1 -> Card C1 -->
    <path d="M 580 287 L 686 287" fill="none" stroke="${pal.edgeLine}" stroke-width="2" marker-end="url(#arrowRight)"/>
    <path class="flow-pulse-edge" d="M 580 287 L 686 287" fill="none" stroke="#0284c7" stroke-width="2.5"/>

    <!-- Edge 4: Card M2 -> Card C2 -->
    <path d="M 580 517 L 630 517 L 630 457 L 686 457" fill="none" stroke="${pal.edgeLine}" stroke-width="2" marker-end="url(#arrowRight)"/>
    <path class="flow-pulse-edge" d="M 580 517 L 630 517 L 630 457 L 686 457" fill="none" stroke="#7c3aed" stroke-width="2.5"/>

    <!-- Edge 5: Cross Bridge G1 -> G3 -->
    <path d="M 320 125 L 670 125 L 835 125 L 835 170" fill="none" stroke="${pal.edgeLine}" stroke-dasharray="4,4" stroke-width="1.5"/>
    <path class="flow-pulse-edge" d="M 320 125 L 670 125 L 835 125 L 835 170" fill="none" stroke="#0284c7" stroke-width="2"/>
    <g class="edge-badge-group" transform="translate(460, 112)" onclick="selectFlowPhase('C1')">
      <rect width="90" height="22" rx="11" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1.5"/>
      <text x="45" y="15" font-size="9.5" font-weight="700" fill="${pal.badgeText}" text-anchor="middle">Quisque ornare</text>
    </g>
  </svg>
  `;
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
initEvidenceSheet();
initCompanyFlow();
updateLocalKPIs();
run(false);

