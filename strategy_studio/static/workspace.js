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
  if ($('flowTitle')) $('flowTitle').textContent = $('name')?.value || 'My Strategy';

  const curGrowth = r.profile.revenue_growth;
  const curMargin = r.profile.operating_margin;
  const curR40 = (curGrowth + curMargin) * 100;
  if ($('r40CurrentVal')) $('r40CurrentVal').textContent = curR40.toFixed(1);

  // Quick projected estimate
  const deltaSM = (r.proposed_ratios.sales_marketing_ratio ?? r.profile.sales_marketing_ratio) - r.profile.sales_marketing_ratio;
  const deltaRD = (r.proposed_ratios.rd_ratio ?? r.profile.rd_ratio) - r.profile.rd_ratio;
  const projGrowth = curGrowth + (deltaSM * 0.28) + (deltaRD * 0.15);
  const projMargin = curMargin - (deltaSM * 0.85) - (deltaRD * 0.90);
  const projR40 = (projGrowth + projMargin) * 100;

  if ($('r40ProposedVal')) $('r40ProposedVal').textContent = projR40.toFixed(1);
  const diff = projR40 - curR40;
  if ($('r40DeltaText')) $('r40DeltaText').textContent = (diff >= 0 ? '+' : '') + diff.toFixed(1) + ' pt shift in Rule of 40';

  const budgetDelta = (deltaSM + deltaRD) * r.profile.revenue;
  if ($('budgetDeltaVal')) $('budgetDeltaVal').textContent = (budgetDelta >= 0 ? '+' : '') + money(budgetDelta);
  if ($('runwayImpactText')) $('runwayImpactText').textContent = budgetDelta < 0 ? 'Extends runway (burn cut)' : (budgetDelta > 0 ? 'Accelerates burn (investment)' : 'Budget neutral');

  if ($('topTargetSummary')) $('topTargetSummary').textContent = `Rule of 40: ${projR40.toFixed(1)} (${(diff >= 0 ? '+' : '') + diff.toFixed(1)})`;

  // Render tree hierarchy
  try {
    renderHierarchyTree(r, currentResult);
  } catch (err) {
    console.warn('renderHierarchyTree skipped:', err);
  }
}

// Hierarchy Tree Rendering
function renderHierarchyTree(req, res) {
  if ($('treeGoalTitle')) {
    $('treeGoalTitle').textContent = req.objective === 'growth'
      ? 'Accelerate Revenue Growth & Expand Market Share'
      : 'Improve Operating Profitability & Runway Extension';
  }
  if ($('treeGoalDesc')) {
    $('treeGoalDesc').textContent = `${money(req.profile.revenue)} ARR at ${pct(req.profile.revenue_growth)} Growth · ${pct(req.profile.operating_margin)} Margin`;
  }
  if ($('treeGoalPill')) {
    $('treeGoalPill').textContent = req.objective === 'growth' ? 'Objective · Growth' : 'Objective · Profitability';
  }

  renderAttachedEvidenceTag('node-root');

  const branches = $('treeBranchesContainer');
  if (!branches) {
    if ($('flow')) {
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
    return;
  }
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

  if (treeRoot) treeRoot.style.display = 'none';
  if (nav) nav.style.display = 'flex';
  if (container) container.style.display = 'block';

  if ($('drilldownBreadcrumbText')) $('drilldownBreadcrumbText').textContent = `Deep Strategic Analysis: ${names[metricKey] || metricKey}`;

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
  if ($('nodeDrilldownContainer')) $('nodeDrilldownContainer').style.display = 'none';
  if ($('drilldownNav')) $('drilldownNav').style.display = 'none';
  if ($('hierarchyTreeRoot')) $('hierarchyTreeRoot').style.display = 'flex';
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
  if ($('attachedEvidenceCount')) {
    $('attachedEvidenceCount').textContent = `${total} evidence card${total === 1 ? '' : 's'} attached to strategy`;
  }
}

function renderEvidenceDock(peers) {
  const dock = $('evidenceCardsDock');
  if (!dock) return;
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
      if ($('legendBenchmarkLabel')) $('legendBenchmarkLabel').textContent = selBm.name;
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

  if (svg) svg.innerHTML = svgHtml;

  // Render Exploded Axis Boxes
  const statBoxes = $('radarStatBoxes');
  if (statBoxes) {
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
}

// Benchmarking Library Renderer
function renderBenchmarks(benchmarks) {
  if (!benchmarks) return;
  const grid = $('benchmarksCardsGrid');
  if (grid) {
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
  }

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
  if (!table) return;
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
  if (!row) return;
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
  if ($('results')) {
    $('results').innerHTML = html;
    $('results').style.opacity = '1';
  }

  // Render components defensively
  try { renderEvidenceDock(r.peers); } catch (e) { console.warn('renderEvidenceDock error:', e); }
  try { renderRecommendations(r.recommendations); } catch (e) { console.warn('renderRecommendations error:', e); }
  try { renderBenchmarks(r.benchmarks); } catch (e) { console.warn('renderBenchmarks error:', e); }
  try { renderRadarChart(r.radar); } catch (e) { console.warn('renderRadarChart error:', e); }
  try { updateLocalKPIs(); } catch (e) { console.warn('updateLocalKPIs error:', e); }

  if (r.peers && r.peers.items && r.peers.items.length) {
    if ($('peerCohortSummary')) $('peerCohortSummary').textContent = `${r.peers.items.length} Peers Matched`;
    const namesList = r.peers.items.slice(0, 3).map(p => p.company_name || p.ticker).join(', ');
    if ($('peerCohortSub')) $('peerCohortSub').textContent = namesList;
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

  if (tabId === 'tab-hierarchy' && $('view-hierarchy')) $('view-hierarchy').style.display = 'block';
  if (tabId === 'tab-spider' && $('view-spider')) {
    $('view-spider').style.display = 'block';
    if (currentResult) renderRadarChart(currentResult.radar);
  }
  if (tabId === 'tab-benchmarks' && $('view-benchmarks')) {
    $('view-benchmarks').style.display = 'block';
    if (currentResult) renderBenchmarks(currentResult.benchmarks);
  }
  if (tabId === 'tab-evidence' && $('view-evidence')) $('view-evidence').style.display = 'block';
  if (tabId === 'tab-company-flow' && $('view-company-flow')) {
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
  const railUserBtn = $('railUserBtn');

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
  if (railUserBtn) railUserBtn.onclick = toggleSidebar;
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
let activeHoveredStage = null;
let hideHoverTimeout = null;

// =========================================================================
// Floating Hovered Node Preview Popover Box Handlers
// =========================================================================
function showNodeHoverPopover(nodeEl, stageData) {
  if (hideHoverTimeout) {
    clearTimeout(hideHoverTimeout);
    hideHoverTimeout = null;
  }
  activeHoveredStage = stageData;
  const popover = $('flowNodeHoverPopover');
  if (!popover || !nodeEl) return;

  if ($('hoverPopoverStagePill')) $('hoverPopoverStagePill').textContent = stageData.year || `Phase ${stageData.index}`;
  if ($('hoverPopoverR40Pill')) $('hoverPopoverR40Pill').textContent = `Rule of 40: ${stageData.rule_of_40 != null ? stageData.rule_of_40 : 70}`;
  if ($('hoverPopoverTitle')) $('hoverPopoverTitle').textContent = stageData.phase_title || 'Strategy Milestone';
  if ($('hoverPopoverArr')) $('hoverPopoverArr').textContent = stageData.revenue_formatted || '$45.0M';
  if ($('hoverPopoverGrowth')) $('hoverPopoverGrowth').textContent = stageData.growth_formatted || '+85%';
  if ($('hoverPopoverSm')) $('hoverPopoverSm').textContent = stageData.sales_marketing_formatted || '42%';
  if ($('hoverPopoverRd')) $('hoverPopoverRd').textContent = stageData.rd_formatted || '28%';
  if ($('hoverPopoverWhy')) $('hoverPopoverWhy').textContent = stageData.strategic_why?.executive_summary || stageData.phase_desc || 'Executing GTM milestone.';

  const rect = nodeEl.getBoundingClientRect();
  const viewport = $('companyFlowDiagramBox');
  const vRect = viewport ? viewport.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

  let leftPos = rect.left - vRect.left + (rect.width / 2) - 145;
  leftPos = Math.max(10, Math.min(leftPos, (vRect.width || window.innerWidth) - 310));
  
  let topPos = rect.top - vRect.top - 185;
  if (topPos < 10) {
    topPos = rect.bottom - vRect.top + 15;
  }

  popover.style.left = `${leftPos}px`;
  popover.style.top = `${topPos}px`;
  popover.style.display = 'block';
}

function scheduleHideNodeHoverPopover() {
  if (hideHoverTimeout) clearTimeout(hideHoverTimeout);
  hideHoverTimeout = setTimeout(() => {
    const popover = $('flowNodeHoverPopover');
    if (popover) popover.style.display = 'none';
  }, 220);
}

function cancelHideNodeHoverPopover() {
  if (hideHoverTimeout) {
    clearTimeout(hideHoverTimeout);
    hideHoverTimeout = null;
  }
}

function hideNodeHoverPopoverImmediate() {
  if (hideHoverTimeout) {
    clearTimeout(hideHoverTimeout);
    hideHoverTimeout = null;
  }
  const popover = $('flowNodeHoverPopover');
  if (popover) popover.style.display = 'none';
}

// =========================================================================
// Exploding Full Screen Stage Intelligence Modal
// =========================================================================
function openExplodeModal(stageData) {
  if (!stageData) return;
  const modal = $('stageExplodeModal');
  const backdrop = $('stageExplodeBackdrop');
  if (!modal || !backdrop) return;

  const comp = stageData.company || currentCompanyFlowData?.company || { name: 'SaaS Platform', ticker: 'SAAS' };
  const stageYear = stageData.year || `Phase ${stageData.index || 1}`;
  const why = stageData.strategic_why || {};
  const fin = stageData.financial_strategy || {};

  if ($('explodeModalStageBadge')) $('explodeModalStageBadge').textContent = stageYear;
  if ($('explodeModalCompanyBadge')) $('explodeModalCompanyBadge').textContent = `${comp.name || ''} (${comp.ticker || ''})`;
  if ($('explodeModalR40Badge')) $('explodeModalR40Badge').textContent = `Rule of 40: ${stageData.rule_of_40 != null ? stageData.rule_of_40 : 70}`;
  if ($('explodeModalTitle')) $('explodeModalTitle').textContent = stageData.phase_title || 'Strategy Trajectory Phase';
  if ($('explodeModalSubtitle')) $('explodeModalSubtitle').textContent = stageData.phase_desc || 'GTM scaling and capital allocation architecture.';

  if ($('explodeArrVal')) $('explodeArrVal').textContent = stageData.revenue_formatted || fin.revenue || '$45.0M';
  if ($('explodeGrowthVal')) $('explodeGrowthVal').textContent = `${stageData.growth_formatted || fin.revenue_growth || '+80%'} YoY Growth`;
  if ($('explodeSmVal')) $('explodeSmVal').textContent = stageData.sales_marketing_formatted || fin.sales_marketing || '42.0%';
  if ($('explodeRdVal')) $('explodeRdVal').textContent = stageData.rd_formatted || fin.rd || '28.0%';
  if ($('explodeMarginVal')) $('explodeMarginVal').textContent = stageData.operating_margin_formatted || fin.operating_margin || '-15.0%';
  if ($('explodeFcfVal')) $('explodeFcfVal').textContent = fin.fcf_margin || stageData.fcf_margin || '+18.0%';

  if ($('explodeExecutiveSummary')) $('explodeExecutiveSummary').textContent = why.executive_summary || stageData.phase_desc || 'Execution roadmap phase.';
  if ($('explodeSmWhy')) $('explodeSmWhy').textContent = why.sm_why || 'GTM scaling and quota ramp.';
  if ($('explodeRdWhy')) $('explodeRdWhy').textContent = why.rd_why || 'R&D investment defending technical differentiation.';
  if ($('explodeMarginWhy')) $('explodeMarginWhy').textContent = why.margin_why || 'Operating leverage and fixed cost absorption.';

  const fw = stageData.frameworks || {};
  if ($('explodeAnsoffStrategy')) $('explodeAnsoffStrategy').textContent = fw.ansoff?.strategy || 'Market Penetration & Platform Expansion';
  if ($('explodeAnsoffWhy')) $('explodeAnsoffWhy').textContent = fw.ansoff?.why || stageData.phase_desc || 'Deepening enterprise customer wallet share.';

  if ($('explodePorterForce')) $('explodePorterForce').textContent = fw.porter?.primary_force || 'Threat of New Entrants & Substitutes';
  if ($('explodePorterCounter')) $('explodePorterCounter').textContent = fw.porter?.countermeasure || 'Moat fortified through proprietary product lock-in and high switching costs.';

  if ($('explodeMoatType')) $('explodeMoatType').textContent = fw.moat?.type || 'High Switching Costs & Multi-Product Integration';
  if ($('explodeMoatEvidence')) $('explodeMoatEvidence').textContent = fw.moat?.evidence || 'Enterprise multi-year agreements driving strong net revenue retention.';

  if ($('explodeHorizonLabel')) $('explodeHorizonLabel').textContent = fw.mckinsey?.horizon || (stageData.index <= 1 ? 'Horizon 1: Core Wedge' : (stageData.index <= 2 ? 'Horizon 2: Scale Engines' : 'Horizon 3: Global Moat'));
  if ($('explodeHorizonWhy')) $('explodeHorizonWhy').textContent = fw.mckinsey?.why || 'Expanding addressable market and extending sustainable unit economics.';

  const vitalsEl = $('explodeSecVitals');
  if (vitalsEl) {
    vitalsEl.innerHTML = `
      <div class="explode-sec-item"><small>Revenue</small><strong>${stageData.revenue_formatted || '$45.0M'}</strong></div>
      <div class="explode-sec-item"><small>YoY Growth</small><strong class="text-emerald">${stageData.growth_formatted || '+80%'}</strong></div>
      <div class="explode-sec-item"><small>S&M Ratio</small><strong class="text-sky">${stageData.sales_marketing_formatted || '42.0%'}</strong></div>
      <div class="explode-sec-item"><small>R&D Ratio</small><strong class="text-purple">${stageData.rd_formatted || '28.0%'}</strong></div>
      <div class="explode-sec-item"><small>Op Margin</small><strong>${stageData.operating_margin_formatted || '-15.0%'}</strong></div>
      <div class="explode-sec-item"><small>Rule of 40</small><strong class="text-emerald">${stageData.rule_of_40 || 70}</strong></div>
    `;
  }

  const adoptBtn = $('explodeModalAdoptBtn');
  if (adoptBtn) {
    adoptBtn.onclick = () => {
      adoptStageLevers(stageData);
      toast.success('Levers Adopted', `Loaded ${stageYear} financial ratios into your startup model.`);
      closeExplodeModal();
    };
  }

  const saveBpBtn = $('explodeModalSaveBackpackBtn');
  if (saveBpBtn) {
    saveBpBtn.onclick = () => {
      saveStageToBackpack(stageData);
    };
  }

  modal.style.display = 'flex';
  backdrop.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeExplodeModal() {
  const modal = $('stageExplodeModal');
  const backdrop = $('stageExplodeBackdrop');
  if (modal) modal.style.display = 'none';
  if (backdrop) backdrop.style.display = 'none';
  document.body.style.overflow = '';
}

window.openExplodeModal = openExplodeModal;
window.closeExplodeModal = closeExplodeModal;

// =========================================================================
// Interactive Strategy Copilot (Live Coaching & Benchmarks)
// =========================================================================
const MODEL_MOTIONS_CLIENT = {
  plg_wedge: {
    title: 'Product-Led Growth (PLG) & Developer Wedge',
    arr: '$12.0M', growth: '+120%', r40: '90.0',
    advice: 'Bottom-up practitioner land validates core product-market fit with low initial CAC. Reinvest 34% in R&D to expand platform capabilities before hiring enterprise reps.',
    suggestMotion: 'enterprise_sales', suggestLabel: '💡 Next: Layer Enterprise Sales Pods (High ACV)'
  },
  enterprise_sales: {
    title: 'Enterprise Outbound & Field Sales Pods',
    arr: '$45.0M', growth: '+85%', r40: '70.0',
    advice: 'Deploying paired SDR/AE pods targeting mid-market and enterprise accounts unlocks six-figure ACVs. S&M increases to ~42% during initial territory ramp.',
    suggestMotion: 'multi_product', suggestLabel: '💡 Next: Multi-Product Platform Cross-Sell (125%+ NDR)'
  },
  multi_product: {
    title: 'Multi-Product Platform Cross-Sell',
    arr: '$125.0M', growth: '+65%', r40: '60.0',
    advice: 'Second core product module turns single-point tool into an enterprise system of record, driving Net Dollar Retention over 125% and drastically raising customer switching costs.',
    suggestMotion: 'consumption_infra', suggestLabel: '💡 Next: Usage-Based Cloud Infrastructure Scale'
  },
  consumption_infra: {
    title: 'Usage-Based Consumption & Cloud Infra Scale',
    arr: '$240.0M', growth: '+55%', r40: '60.0',
    advice: 'Elastic compute credit consumption expands automatically alongside customer workload data volume, eliminating annual contract renegotiation friction.',
    suggestMotion: 'marketplace', suggestLabel: '💡 Next: Hyperscaler Marketplace Co-Sell Drawdown'
  },
  marketplace: {
    title: 'Hyperscaler Co-Sell & Cloud Marketplaces',
    arr: '$180.0M', growth: '+60%', r40: '62.0',
    advice: 'Listing on AWS, Azure, and Google Cloud Marketplaces allows enterprise buyers to drawdown committed cloud spend, accelerating procurement cycles by ~40%.',
    suggestMotion: 'international', suggestLabel: '💡 Next: Cross-Border International Expansion'
  },
  international: {
    title: 'International Expansion & Cross-Border Clearing',
    arr: '$310.0M', growth: '+48%', r40: '56.0',
    advice: 'Establishing EMEA and APAC regional sales headquarters with sovereign in-region data residency unlocks massive non-US addressable enterprise demand.',
    suggestMotion: 'rule_40_moat', suggestLabel: '💡 Next: Rule of 40 Margin Leverage & FCF Compounding'
  },
  rule_40_moat: {
    title: 'Rule of 40 Margin Leverage & FCF Machine',
    arr: '$650.0M', growth: '+32%', r40: '54.0',
    advice: 'Fixed G&A leverage and high gross margin retention generate substantial free cash flow (25%+), creating an elite self-funding compounder.',
    suggestMotion: 'multi_product', suggestLabel: '💡 Next: Platform Suite Add-On Acquisitions'
  }
};

function updateBuilderAgentCopilot() {
  const motion = $('builderModelMotion')?.value || 'enterprise_sales';
  const peer = $('builderPeerCompany')?.value || 'DDOG';
  const focus = $('builderLeverFocus')?.value || 'growth';

  const mInfo = MODEL_MOTIONS_CLIENT[motion] || MODEL_MOTIONS_CLIENT.enterprise_sales;

  if ($('copilotPeerTag')) $('copilotPeerTag').textContent = `${peer} SEC Grounded`;
  if ($('copilotEstArr')) $('copilotEstArr').textContent = mInfo.arr;
  if ($('copilotEstGrowth')) $('copilotEstGrowth').textContent = mInfo.growth;
  if ($('copilotEstR40')) $('copilotEstR40').textContent = mInfo.r40;

  let advice = mInfo.advice;
  if (peer === 'SNOW') advice += ` Grounded in Snowflake's consumption expansion curves.`;
  else if (peer === 'CRWD') advice += ` Matches CrowdStrike's Falcon security module expansion.`;
  else if (peer === 'DDOG') advice += ` Aligned with Datadog's multi-product infrastructure observability.`;
  else if (peer === 'HUBS') advice += ` Reflects HubSpot's inbound upmarket journey.`;

  if ($('copilotInsightText')) $('copilotInsightText').textContent = advice;

  const pillsContainer = $('copilotPillsContainer');
  if (pillsContainer) {
    pillsContainer.innerHTML = `
      <button type="button" class="copilot-pill" data-copilot-motion="${mInfo.suggestMotion}" data-copilot-focus="${focus}">
        ${mInfo.suggestLabel}
      </button>
      <button type="button" class="copilot-pill" data-copilot-motion="${motion}" data-copilot-focus="rule40">
        🎯 Optimize S&M for Rule of 40 Efficiency (+8 pp)
      </button>
    `;

    pillsContainer.querySelectorAll('.copilot-pill').forEach(pill => {
      pill.onclick = () => {
        const mot = pill.dataset.copilotMotion;
        const foc = pill.dataset.copilotFocus;
        if (mot && $('builderModelMotion')) $('builderModelMotion').value = mot;
        if (foc && $('builderLeverFocus')) $('builderLeverFocus').value = foc;
        updateBuilderAgentCopilot();
        toast.info('Copilot Applied', `Updated builder to ${mot ? mot.replace(/_/g, ' ') : ''}`);
      };
    });
  }
}

function initBuilderAgentCopilot() {
  ['builderModelMotion', 'builderPeerCompany', 'builderHorizonPhase', 'builderLeverFocus'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('change', updateBuilderAgentCopilot);
  });
  updateBuilderAgentCopilot();
}

// Global callback for Mermaid click binding
window.selectFlowPhase = function(nodeId) {
  hideNodeHoverPopoverImmediate();
  if (currentCompanyFlowData && currentCompanyFlowData.stages) {
    const stage = currentCompanyFlowData.stages.find(s => s.id === nodeId || String(s.index) === String(nodeId).replace(/\D/g, ''));
    if (stage) {
      openExplodeModal(stage);
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

  // Sidebar Diligence quick-jump button
  const sidebarOpenDiligenceBtn = $('sidebarOpenDiligenceBtn');
  if (sidebarOpenDiligenceBtn) {
    sidebarOpenDiligenceBtn.onclick = () => {
      const viewDiligenceBtn = $('viewDiligenceBtn');
      if (viewDiligenceBtn) viewDiligenceBtn.click();
    };
  }

  // View Switcher (Strategy Canvas vs Executive Bento Dashboard)
  const viewCanvasBtn = $('viewCanvasBtn');
  const viewDashboardBtn = $('viewDashboardBtn');
  const canvasCard = document.querySelector('.flowchart-hero-card');
  const dashView = $('executiveDashboardView');
  const breadcrumb = $('currentTopBreadcrumb');

  const viewDiligenceBtn = $('viewDiligenceBtn');
  const diligenceView = $('commercialDiligenceView');
  const viewBackpackBtn = $('viewBackpackBtn');
  const backpackView = $('backpackEditorView');

  function switchView(mode) {
    if (mode === 'dashboard') {
      if (canvasCard) canvasCard.style.display = 'none';
      if (diligenceView) diligenceView.style.display = 'none';
      if (backpackView) backpackView.style.display = 'none';
      if (dashView) dashView.style.display = 'flex';
      viewCanvasBtn?.classList.remove('active');
      viewDashboardBtn?.classList.add('active');
      viewDiligenceBtn?.classList.remove('active');
      viewBackpackBtn?.classList.remove('active');
      if (breadcrumb) breadcrumb.textContent = 'Executive Dashboard';
      if (currentDeepdiveData) renderPhaseDeepdive(currentDeepdiveData);
    } else if (mode === 'diligence') {
      if (canvasCard) canvasCard.style.display = 'none';
      if (dashView) dashView.style.display = 'none';
      if (backpackView) backpackView.style.display = 'none';
      if (diligenceView) diligenceView.style.display = 'flex';
      viewCanvasBtn?.classList.remove('active');
      viewDashboardBtn?.classList.remove('active');
      viewDiligenceBtn?.classList.add('active');
      viewBackpackBtn?.classList.remove('active');
      if (breadcrumb) breadcrumb.textContent = 'Commercial Diligence';
      const appSidebar = $('appSidebar');
      if (appSidebar) appSidebar.setAttribute('data-state', 'collapsed');
      initCommercialDiligence();
    } else if (mode === 'backpack') {
      if (canvasCard) canvasCard.style.display = 'none';
      if (dashView) dashView.style.display = 'none';
      if (diligenceView) diligenceView.style.display = 'none';
      if (backpackView) backpackView.style.display = 'flex';
      viewCanvasBtn?.classList.remove('active');
      viewDashboardBtn?.classList.remove('active');
      viewDiligenceBtn?.classList.remove('active');
      viewBackpackBtn?.classList.add('active');
      if (breadcrumb) breadcrumb.textContent = 'Strategy Backpack';
      const appSidebar = $('appSidebar');
      if (appSidebar) appSidebar.setAttribute('data-state', 'collapsed');
      renderBackpackEditor();
      fetchBackpackRecommendations(false);
    } else {
      if (canvasCard) canvasCard.style.display = 'flex';
      if (dashView) dashView.style.display = 'none';
      if (diligenceView) diligenceView.style.display = 'none';
      if (backpackView) backpackView.style.display = 'none';
      viewCanvasBtn?.classList.add('active');
      viewDashboardBtn?.classList.remove('active');
      viewDiligenceBtn?.classList.remove('active');
      viewBackpackBtn?.classList.remove('active');
      if (breadcrumb) breadcrumb.textContent = 'Strategy Canvas';
    }
  }

  window.switchStudioView = switchView;

  if (viewCanvasBtn) viewCanvasBtn.onclick = () => switchView('canvas');
  if (viewDashboardBtn) viewDashboardBtn.onclick = () => switchView('dashboard');
  if (viewDiligenceBtn) viewDiligenceBtn.onclick = () => switchView('diligence');
  if (viewBackpackBtn) viewBackpackBtn.onclick = () => switchView('backpack');
  if ($('railNavDiligence')) $('railNavDiligence').onclick = () => switchView('diligence');

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

  // =========================================================================
  // Guided Strategy Flow Builder Event Listeners (Incremental & Periodic)
  // =========================================================================
  const flowAppendBtn = $('flowAppendPhaseBtn');
  if (flowAppendBtn) {
    flowAppendBtn.onclick = async () => {
      const modelType = $('builderModelMotion')?.value || 'enterprise_sales';
      const peerTicker = $('builderPeerCompany')?.value || 'DDOG';
      const horizon = $('builderHorizonPhase')?.value || 'phase_2';
      const focus = $('builderLeverFocus')?.value || 'growth';
      const customLabel = ($('builderCustomLabel')?.value || '').trim();

      flowAppendBtn.disabled = true;
      flowAppendBtn.innerHTML = '<span>⏳ Appending Phase...</span>';
      toast.info('Strategy Builder', `Appending new ${modelType.replace(/_/g, ' ')} milestone grounded in ${peerTicker}...`);

      try {
        const res = await fetch('/api/strategy/extend-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'append',
            model_type: modelType,
            company_ticker: peerTicker,
            horizon_phase: horizon,
            strategic_focus: focus,
            custom_label: customLabel,
            current_flow: currentCompanyFlowData
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        currentCompanyFlowData = data;
        renderCompanyFlow(data);
        if (data.added_stage) {
          toast.success('Phase Appended', `Added ${data.added_stage.year} · ${data.added_stage.phase_title}`);
          loadPhaseDeepdive(data.added_stage.index);
        }
      } catch (err) {
        console.error('Append phase failed:', err);
        toast.error('Builder Error', err.message);
      } finally {
        flowAppendBtn.disabled = false;
        flowAppendBtn.innerHTML = '<span>➕ Append Next Phase</span>';
      }
    };
  }

  const flowBranchBtn = $('flowAddBranchBtn');
  if (flowBranchBtn) {
    flowBranchBtn.onclick = async () => {
      const modelType = $('builderModelMotion')?.value || 'enterprise_sales';
      const peerTicker = $('builderPeerCompany')?.value || 'DDOG';
      const horizon = $('builderHorizonPhase')?.value || 'phase_2';
      const focus = $('builderLeverFocus')?.value || 'moat';
      const customLabel = ($('builderCustomLabel')?.value || '').trim();
      const activeStageId = currentDeepdiveData?.id || (currentCompanyFlowData?.stages?.[currentCompanyFlowData.stages.length - 1]?.id);

      flowBranchBtn.disabled = true;
      flowBranchBtn.innerHTML = '<span>⏳ Branching...</span>';
      toast.info('Strategy Builder', `Branching alternative trajectory from stage ${activeStageId || 'latest'}...`);

      try {
        const res = await fetch('/api/strategy/extend-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'branch',
            model_type: modelType,
            company_ticker: peerTicker,
            horizon_phase: horizon,
            strategic_focus: focus,
            custom_label: customLabel,
            branch_from_id: activeStageId,
            current_flow: currentCompanyFlowData
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        currentCompanyFlowData = data;
        renderCompanyFlow(data);
        if (data.added_stage) {
          toast.success('Branch Added', `Created ${data.added_stage.year} · ${data.added_stage.phase_title}`);
          loadPhaseDeepdive(data.added_stage.index);
        }
      } catch (err) {
        console.error('Add branch failed:', err);
        toast.error('Builder Error', err.message);
      } finally {
        flowBranchBtn.disabled = false;
        flowBranchBtn.innerHTML = '<span>🌿 Branch from Phase</span>';
      }
    };
  }

  const flowBuildBtn = $('flowBuildCompleteBtn');
  if (flowBuildBtn) {
    flowBuildBtn.onclick = async () => {
      const modelType = $('builderModelMotion')?.value || 'enterprise_sales';
      const peerTicker = $('builderPeerCompany')?.value || 'DDOG';
      const horizon = $('builderHorizonPhase')?.value || 'phase_2';
      const focus = $('builderLeverFocus')?.value || 'growth';
      const customLabel = ($('builderCustomLabel')?.value || '').trim();

      flowBuildBtn.disabled = true;
      flowBuildBtn.innerHTML = '<span>⏳ Synthesizing...</span>';
      toast.info('Strategy Builder', `Building full fresh flow grounded in ${peerTicker} data...`);

      try {
        const res = await fetch('/api/strategy/extend-flow', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'build',
            model_type: modelType,
            company_ticker: peerTicker,
            horizon_phase: horizon,
            strategic_focus: focus,
            custom_label: customLabel
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        currentCompanyFlowData = data;
        renderCompanyFlow(data);
        toast.success('Complete Flow Synthesized', `Generated full multi-phase blueprint for ${peerTicker}`);
      } catch (err) {
        console.error('Build complete flow failed:', err);
        toast.error('Builder Error', err.message);
      } finally {
        flowBuildBtn.disabled = false;
        flowBuildBtn.innerHTML = '<span>✦ Build Complete Flow</span>';
      }
    };
  }

  const flowResetBtn = $('flowResetBtn');
  if (flowResetBtn) {
    flowResetBtn.onclick = () => {
      loadPresetFlow('template-process-flow');
      toast.info('Canvas Reset', 'Reset flowchart canvas to baseline template.');
    };
  }

  // Initialize Interactive Agent Strategy Copilot
  initBuilderAgentCopilot();

  // Initialize Floating Hover Popover listeners
  const hoverPopover = $('flowNodeHoverPopover');
  if (hoverPopover) {
    hoverPopover.addEventListener('mouseenter', cancelHideNodeHoverPopover);
    hoverPopover.addEventListener('mouseleave', scheduleHideNodeHoverPopover);
    hoverPopover.onclick = (e) => {
      e.stopPropagation();
      if (activeHoveredStage) {
        openExplodeModal(activeHoveredStage);
        hideNodeHoverPopoverImmediate();
      }
    };
  }

  // Explode Modal Event Handlers
  if ($('closeExplodeModalBtn')) $('closeExplodeModalBtn').onclick = closeExplodeModal;
  if ($('stageExplodeBackdrop')) $('stageExplodeBackdrop').onclick = closeExplodeModal;
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeExplodeModal();
  });

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

// ==========================================================================
// Corporate Strategy, Market Sizing & Commercial Diligence Studio (40/30/20/10)
// ==========================================================================
let diligenceInitialized = false;
let currentDiligenceData = null;
let currentSlideIndex = 0;
let activePillarTab = 'pillar-tam';
let selectedGuidingAnswers = {
  space_id: 'prediction-markets',
  mandate: 'ma_acquisition',
  data_source: 'hybrid_diligence',
  monetization: 'blended_exchange',
  financial_ambition: 'balanced_growth'
};

async function initCommercialDiligence() {
  if (diligenceInitialized) return;
  diligenceInitialized = true;

  // Space Switcher Chips
  document.querySelectorAll('.diligence-space-chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('.diligence-space-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedGuidingAnswers.space_id = chip.dataset.spaceId;
      loadDiligenceGuide(selectedGuidingAnswers.space_id);
      runDiligenceSynthesis();
    };
  });

  // Pillar Tab Navigation (synced with Agent Advisor "What do you need?" sidebar)
  function activateDiligencePillar(tabId) {
    activePillarTab = tabId;
    document.querySelectorAll('.diligence-pillar-btn').forEach(b => b.classList.toggle('active', b.dataset.pillarTab === tabId));
    document.querySelectorAll('.advisor-need-btn').forEach(b => b.classList.toggle('active', b.dataset.advisorPillar === tabId));
    document.querySelectorAll('.diligence-panel').forEach(p => {
      p.style.display = p.id === tabId ? 'flex' : 'none';
    });
    if (tabId === 'pillar-pitchbook') {
      executePitchbookQuery();
    }
  }

  document.querySelectorAll('.diligence-pillar-btn').forEach(btn => {
    btn.onclick = () => activateDiligencePillar(btn.dataset.pillarTab);
  });

  document.querySelectorAll('.advisor-need-btn').forEach(btn => {
    btn.onclick = () => activateDiligencePillar(btn.dataset.advisorPillar);
  });

  // Agent Advisor Sidebar Toggle
  const advisorSidebar = $('diligenceAdvisorSidebar');
  const toggleAdvisorBtn = $('toggleDiligenceAdvisorBtn');
  const closeAdvisorBtn = $('closeDiligenceAdvisorBtn');

  function setAdvisorOpen(isOpen) {
    if (!advisorSidebar) return;
    advisorSidebar.style.display = isOpen ? 'flex' : 'none';
    if (toggleAdvisorBtn) toggleAdvisorBtn.classList.toggle('active', isOpen);
  }

  if (toggleAdvisorBtn) {
    toggleAdvisorBtn.onclick = () => {
      const isHidden = advisorSidebar && advisorSidebar.style.display === 'none';
      setAdvisorOpen(isHidden);
    };
  }
  if (closeAdvisorBtn) {
    closeAdvisorBtn.onclick = () => setAdvisorOpen(false);
  }

  // Slide Deck Navigation
  const prevBtn = $('deckPrevSlideBtn');
  const nextBtn = $('deckNextSlideBtn');
  if (prevBtn) prevBtn.onclick = () => changeSlide(currentSlideIndex - 1);
  if (nextBtn) nextBtn.onclick = () => changeSlide(currentSlideIndex + 1);

  document.querySelectorAll('.deck-pill').forEach(pill => {
    pill.onclick = () => {
      const idx = parseInt(pill.dataset.slideIndex, 10);
      changeSlide(idx);
    };
  });

  const fullBtn = $('deckFullscreenBtn');
  if (fullBtn) {
    fullBtn.onclick = () => {
      const slide = $('activeSlideCard');
      if (slide) {
        if (!document.fullscreenElement) {
          slide.requestFullscreen().catch(e => console.warn(e));
        } else {
          document.exitFullscreen().catch(e => console.warn(e));
        }
      }
    };
  }

  // Target Filter Pills
  document.querySelectorAll('.screening-filter-pill').forEach(pill => {
    pill.onclick = () => {
      document.querySelectorAll('.screening-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      renderScreeningTable(pill.dataset.targetFilter);
    };
  });

  // PitchBook Explorer Executor
  const pbBtn = $('pbExecuteQueryBtn');
  if (pbBtn) pbBtn.onclick = executePitchbookQuery;
  const pbSelect = $('pbEndpointSelect');
  if (pbSelect) pbSelect.onchange = executePitchbookQuery;

  const pbCopy = $('pbCopyJsonBtn');
  if (pbCopy) {
    pbCopy.onclick = () => {
      const raw = $('pbJsonResponseBox')?.textContent;
      if (raw) {
        navigator.clipboard.writeText(raw);
        toast.success('Copied', 'PitchBook JSON copied to clipboard');
      }
    };
  }

  // Synthesis CTA button
  const synthBtn = $('runDiligenceSynthesisBtn');
  if (synthBtn) synthBtn.onclick = runDiligenceSynthesis;

  // Adopt Levers CTA button
  const adoptBtn = $('adoptDiligenceLeversBtn');
  if (adoptBtn) {
    adoptBtn.onclick = () => {
      if (currentDiligenceData && currentDiligenceData.pillar_3_financial_model) {
        const m = currentDiligenceData.pillar_3_financial_model.projections_table[0];
        adoptDiligenceLeversIntoPlan({
          name: `${currentDiligenceData.space.name} - 5-Yr Plan`,
          revenue: m.revenue_usd_m,
          growth: 50.0,
          margin: m.ebitda_margin_pct,
          gross: m.gross_margin_pct,
          sales: 38.0,
          rd: 24.0
        });
      }
    };
  }

  // Initial load
  await loadDiligenceGuide(selectedGuidingAnswers.space_id);
  await runDiligenceSynthesis();
}

async function loadDiligenceGuide(spaceId) {
  const container = $('copilotQuestionsList');
  if (!container) return;

  try {
    const res = await fetch(`/api/diligence/agent-guide?space_id=${encodeURIComponent(spaceId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    container.innerHTML = '';
    (data.questions || []).forEach(q => {
      const qDiv = document.createElement('div');
      qDiv.className = 'copilot-q-item';

      const stepBadge = document.createElement('span');
      stepBadge.className = 'copilot-q-step-badge';
      stepBadge.textContent = `STEP ${q.step} · ${q.pillar}`;

      const title = document.createElement('div');
      title.className = 'copilot-q-title';
      title.textContent = q.question;

      const helper = document.createElement('div');
      helper.className = 'copilot-q-helper';
      helper.textContent = q.helper_text;

      const optsDiv = document.createElement('div');
      optsDiv.className = 'copilot-q-options';

      // Map question id to selectedGuidingAnswers field
      const fieldMap = {
        'q_space': 'space_id',
        'q_mandate': 'mandate',
        'q_data_source': 'data_source',
        'q_monetization': 'monetization',
        'q_financial_target': 'financial_ambition'
      };
      const stateKey = fieldMap[q.id] || 'space_id';

      (q.options || []).forEach(opt => {
        const optBtn = document.createElement('button');
        optBtn.type = 'button';
        optBtn.className = 'copilot-opt-btn';
        if (selectedGuidingAnswers[stateKey] === opt.value) {
          optBtn.classList.add('active');
        }

        const labelSpan = document.createElement('span');
        labelSpan.textContent = opt.label;

        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'opt-badge';
        badgeSpan.textContent = opt.badge;

        optBtn.appendChild(labelSpan);
        optBtn.appendChild(badgeSpan);

        optBtn.onclick = () => {
          optsDiv.querySelectorAll('.copilot-opt-btn').forEach(b => b.classList.remove('active'));
          optBtn.classList.add('active');
          selectedGuidingAnswers[stateKey] = opt.value;

          // If space changed, also sync chips
          if (stateKey === 'space_id') {
            document.querySelectorAll('.diligence-space-chip').forEach(c => {
              c.classList.toggle('active', c.dataset.spaceId === opt.value);
            });
          }

          runDiligenceSynthesis();
        };

        optsDiv.appendChild(optBtn);
      });

      qDiv.appendChild(stepBadge);
      qDiv.appendChild(title);
      qDiv.appendChild(helper);
      qDiv.appendChild(optsDiv);
      container.appendChild(qDiv);
    });
  } catch (err) {
    console.warn('Failed to load diligence guide:', err);
  }
}

async function runDiligenceSynthesis() {
  toast.info('Strategy Copilot', 'Synthesizing market TAM, PitchBook screening, and 5-year FCF business case...');

  try {
    const res = await fetch('/api/diligence/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedGuidingAnswers)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    currentDiligenceData = data;

    // 1. Render Pillar 1: Market Sizing (40%)
    renderPillar1MarketSizing(data.pillar_1_market_sizing, data.space);

    // 2. Render Pillar 2: Competitor & Target Screening (30%)
    renderPillar2Screening(data.pillar_2_target_screening);

    // 3. Render Pillar 3: 5-Year Financial Model & Business Case (20%)
    renderPillar3FinancialModel(data.pillar_3_financial_model);

    // 4. Render Pillar 4: Executive Slide Deck (10%)
    currentSlideIndex = 0;
    renderSlide(0);

    toast.success('Diligence Synthesized', `Complete business case generated for ${data.space.name}`);
  } catch (err) {
    console.error('Synthesis failed:', err);
    toast.error('Synthesis Failed', err.message);
  }
}

function renderPillar1MarketSizing(tamData, space) {
  if (!tamData) return;

  const topDown = tamData.top_down || {};
  const bottomUp = tamData.bottom_up || {};
  const adoption = tamData.adoption || {};
  const reg = tamData.regulatory || {};
  const verdict = tamData.verdict || {};

  // Top KPI Cards
  if ($('tamVal')) $('tamVal').textContent = `$${topDown.implied_tam_usd_bn || space.tam_bn}B`;
  if ($('samVal')) $('samVal').textContent = `$${topDown.sam_usd_bn || space.sam_bn}B`;
  if ($('somVal')) $('somVal').textContent = `$${topDown.som_target_usd_bn || space.som_bn}B`;
  if ($('cagrVal')) $('cagrVal').textContent = `+${space.cagr_pct}%`;
  if ($('adoptionPhaseText')) $('adoptionPhaseText').textContent = adoption.current_lifecycle_stage || space.adoption_phase;

  // Sizing Waterfall Breakdown
  const waterfallBox = $('tamWaterfallContent');
  if (waterfallBox) {
    waterfallBox.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border);">
          <span style="color:var(--text-muted);">Global Financial Derivatives Contracts (Annual):</span>
          <span style="font-weight:700;">${topDown.global_derivatives_contracts_annual_bn}B contracts</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border);">
          <span style="color:var(--text-muted);">Addressable Retail & Hedging Penetration:</span>
          <span style="font-weight:700;">${topDown.addressable_retail_event_hedging_share_pct}%</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border);">
          <span style="color:var(--text-muted);">Serviceable Available Market (SAM):</span>
          <span style="font-weight:700; color:var(--sky);">$${topDown.sam_usd_bn}B (${topDown.sam_to_tam_penetration_pct}% of TAM)</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border);">
          <span style="color:var(--text-muted);">Target Obtainable SOM (5-Year Target):</span>
          <span style="font-weight:800; color:var(--emerald);">$${topDown.som_target_usd_bn}B (${topDown.som_target_share_of_sam_pct}% of SAM)</span>
        </div>
        <div style="margin-top:6px; padding:8px 10px; background:var(--surface-subtle); border-radius:6px; font-size:11.5px;">
          <strong>Bottom-Up Unit Economics:</strong> ${bottomUp.target_active_retail_hedgers_millions}M target users × ${bottomUp.avg_annual_contracts_per_user} contracts/yr = <strong>${bottomUp.total_annual_contract_volume_m}M contracts</strong> at $${bottomUp.avg_take_rate_per_contract_usd} avg fee = <strong>$${bottomUp.implied_annual_gross_fee_pool_usd_m}M gross fee pool</strong>.
        </div>
      </div>
    `;
  }

  // Regulatory Moat Content
  const regBox = $('regulatoryMoatContent');
  if (regBox) {
    regBox.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px;">
        <div>
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Primary Federal Jurisdiction:</span>
          <div style="font-weight:700; color:var(--text-main); font-size:13px; margin-top:2px;">${reg.primary_jurisdiction}</div>
        </div>
        <div>
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Required Regulatory Licenses:</span>
          <div style="font-weight:600; font-size:12.5px; color:#0284c7; margin-top:2px;">${reg.required_licenses}</div>
        </div>
        <div>
          <span style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase;">Legal Precedent & Catalysts:</span>
          <div style="font-size:12px; color:var(--text-main); margin-top:2px; line-height:1.45;">${reg.key_legal_milestones}</div>
        </div>
        <div style="padding:8px 10px; background:rgba(2,132,199,0.06); border:1px solid rgba(2,132,199,0.2); border-radius:6px; font-size:11.5px; color:#0369a1;">
          <strong>Compliance Strategy:</strong> ${reg.compliance_strategy}
        </div>
      </div>
    `;
  }

  // Verdict Banner
  if ($('verdictStatusText')) $('verdictStatusText').textContent = verdict.status || 'APPROVED FOR EXECUTION';
  if ($('verdictMoatText')) $('verdictMoatText').textContent = `Strategic Moat: ${verdict.strategic_moat_strength || 'High Network Effects'}`;
  const killBox = $('verdictKillCriteria');
  if (killBox) {
    killBox.innerHTML = `
      <span style="font-weight:700;">Kill Criteria (Risk Guardrails):</span>
      <ul style="margin:4px 0 0; padding-left:18px;">
        ${(verdict.kill_criteria || []).map(k => `<li>${k}</li>`).join('')}
      </ul>
    `;
  }
}

function renderPillar2Screening(screeningData) {
  if (!screeningData) return;
  renderScreeningTable('all');

  // Precedent Deals Table
  const dealsBox = $('precedentDealsContent');
  if (dealsBox) {
    const deals = screeningData.summary?.deal_comps_referenced || [];
    dealsBox.innerHTML = `
      <table style="width:100%; border-collapse:collapse; font-size:12px;">
        <thead>
          <tr style="border-bottom:1.5px solid var(--border); text-align:left; color:var(--text-muted); font-size:10.5px; text-transform:uppercase;">
            <th style="padding:6px 8px;">Target</th>
            <th style="padding:6px 8px;">Acquirer</th>
            <th style="padding:6px 8px;">Deal Size</th>
            <th style="padding:6px 8px;">Multiple (EV/Rev)</th>
            <th style="padding:6px 8px;">Deal Type & Rationale</th>
          </tr>
        </thead>
        <tbody>
          ${deals.map(d => `
            <tr style="border-bottom:1px solid var(--border);">
              <td style="padding:8px; font-weight:700;">${d.target_name}</td>
              <td style="padding:8px;">${d.acquirer_name}</td>
              <td style="padding:8px; font-weight:700; color:var(--text-main);">$${d.deal_size_usd ? (d.deal_size_usd / 1e6).toFixed(1) + 'M' : 'Undisclosed'}</td>
              <td style="padding:8px; color:var(--emerald); font-weight:700;">${d.implied_ev_revenue ? d.implied_ev_revenue + 'x' : 'N/A'}</td>
              <td style="padding:8px; font-size:11.5px; color:var(--text-muted);">${d.deal_rationale}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

function renderScreeningTable(filter) {
  const tbody = $('screeningTableBody');
  if (!tbody || !currentDiligenceData) return;

  const allTargets = currentDiligenceData.pillar_2_target_screening?.screened_targets || [];
  const filtered = allTargets.filter(t => {
    if (!filter || filter === 'all') return true;
    if (filter === 'Private') return t.entity_type === 'Private' || t.entity_type === 'Acquired';
    if (filter === 'Public Incumbent') return t.entity_type === 'Public Incumbent';
    return true;
  });

  tbody.innerHTML = filtered.map(t => {
    const rev = t.est_revenue_2024_usd ? `$${(t.est_revenue_2024_usd / 1e6).toFixed(1)}M` : 'N/A';
    const growth = t.revenue_growth_yoy !== null && t.revenue_growth_yoy !== undefined ? `+${(t.revenue_growth_yoy * 100).toFixed(0)}%` : 'N/A';
    const val = t.last_valuation_usd ? `$${(t.last_valuation_usd >= 1e9 ? (t.last_valuation_usd / 1e9).toFixed(1) + 'B' : (t.last_valuation_usd / 1e6).toFixed(0) + 'M')}` : 'N/A';
    const mult = t.ev_to_revenue ? `${t.ev_to_revenue}x` : 'N/A';
    const fitScore = t.strategic_fit_score || 80;
    const scoreColor = fitScore >= 90 ? 'color:#059669; font-weight:800;' : 'color:#0284c7; font-weight:700;';

    return `
      <tr>
        <td style="font-weight:700; white-space:nowrap;">
          ${t.name}
          <div style="font-size:10.5px; color:var(--text-dim); font-weight:500;">${t.pb_id}</div>
        </td>
        <td>
          <span style="font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px; background:var(--surface-subtle); border:1px solid var(--border);">
            ${t.entity_type}
          </span>
          <div style="font-size:10.5px; color:var(--text-muted); margin-top:2px;">${t.sub_vertical}</div>
        </td>
        <td style="font-weight:700; text-align:right;">${rev}</td>
        <td style="color:#059669; font-weight:700; text-align:right;">${growth}</td>
        <td style="font-weight:700; text-align:right;">${val}</td>
        <td style="font-weight:700; text-align:right; color:#7c3aed;">${mult}</td>
        <td style="text-align:center; ${scoreColor}">${fitScore}/100</td>
        <td style="font-size:11px; color:var(--text-muted); max-width:240px;">${t.strategic_rationale}</td>
        <td style="white-space:nowrap; text-align:center;">
          <button type="button" class="btn" style="font-size:10.5px; padding:3px 8px;" onclick="window.adoptTargetLevers('${t.pb_id}')">
            📋 Adopt Levers
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.adoptTargetLevers = function(pbId) {
  if (!currentDiligenceData) return;
  const targets = currentDiligenceData.pillar_2_target_screening?.screened_targets || [];
  const target = targets.find(t => t.pb_id === pbId);
  if (!target) return;

  const revM = target.est_revenue_2024_usd ? target.est_revenue_2024_usd / 1e6 : 25.0;
  const growthPct = target.revenue_growth_yoy ? target.revenue_growth_yoy * 100 : 45.0;
  const grossPct = target.gross_margin ? target.gross_margin * 100 : 80.0;

  adoptDiligenceLeversIntoPlan({
    name: `${target.name} Strategic Comps Plan`,
    revenue: revM,
    growth: growthPct,
    margin: 18.0,
    gross: grossPct,
    sales: 38.0,
    rd: 26.0
  });
};

function adoptDiligenceLeversIntoPlan(params) {
  if (!params) return;
  if ($('name')) $('name').value = params.name || 'Diligence Plan';
  if ($('revenue') && params.revenue != null) $('revenue').value = Number(params.revenue).toFixed(1);
  if ($('growth') && params.growth != null) $('growth').value = Number(params.growth).toFixed(0);
  if ($('margin') && params.margin != null) $('margin').value = Number(params.margin).toFixed(0);
  if ($('gross') && params.gross != null) $('gross').value = Number(params.gross).toFixed(0);
  if ($('sales') && params.sales != null) $('sales').value = Number(params.sales).toFixed(0);
  if ($('rd') && params.rd != null) $('rd').value = Number(params.rd).toFixed(0);

  if ($('salesTarget') && params.sales != null) $('salesTarget').value = Number(params.sales).toFixed(0);
  if ($('rdTarget') && params.rd != null) $('rdTarget').value = Number(params.rd).toFixed(0);
  if ($('salesOn')) $('salesOn').checked = true;
  if ($('rdOn')) $('rdOn').checked = true;

  // Switch to canvas view
  const canvasBtn = $('viewCanvasBtn');
  if (canvasBtn) canvasBtn.click();

  updateLocalKPIs();
  run(false);
  if (typeof toast !== 'undefined') {
    toast.success('Levers Adopted', `Transferred financial profile into Startup Plan & Strategy Flowchart.`);
  }
}

function renderPillar3FinancialModel(modelData) {
  if (!modelData) return;

  // Highlights
  if ($('modelY5Rev')) $('modelY5Rev').textContent = `$${modelData.year_5_revenue_m}M`;
  if ($('modelY5Ebitda')) $('modelY5Ebitda').textContent = `$${modelData.year_5_ebitda_m}M`;
  if ($('modelY5Margin')) $('modelY5Margin').textContent = `${modelData.year_5_ebitda_margin_pct}% EBITDA Margin`;
  if ($('modelCumFcf')) $('modelCumFcf').textContent = `$${modelData.cumulative_5yr_fcf_m}M`;
  if ($('modelIrrVal')) $('modelIrrVal').textContent = `${modelData.projected_5yr_irr_pct}% / ${modelData.multiple_on_invested_capital_moic}x`;
  if ($('modelExitVal')) $('modelExitVal').textContent = `Terminal Value: $${modelData.terminal_valuation_usd_m}M (${modelData.implied_exit_multiple})`;

  // Projections Table
  const tbody = $('financialModelTableBody');
  if (!tbody) return;

  const rows = modelData.projections_table || [];
  const metrics = [
    { label: 'Contract Volume (M)', key: 'contract_volume_millions', format: v => v ? `${v}M` : '-' },
    { label: 'Revenue ($M)', key: 'revenue_usd_m', format: v => `$${v.toFixed(1)}M`, bold: true },
    { label: 'YoY Revenue Growth %', key: 'revenue_growth_yoy_pct', format: v => v ? `+${v}%` : '-' },
    { label: 'Gross Profit ($M)', key: 'gross_profit_usd_m', format: v => `$${v.toFixed(1)}M` },
    { label: 'Gross Margin %', key: 'gross_margin_pct', format: v => `${v}%` },
    { label: 'Sales & Marketing ($M)', key: 'sales_marketing_usd_m', format: v => `$${v.toFixed(1)}M` },
    { label: 'R&D / Technology ($M)', key: 'rd_technology_usd_m', format: v => `$${v.toFixed(1)}M` },
    { label: 'G&A / Compliance ($M)', key: 'ga_compliance_usd_m', format: v => `$${v.toFixed(1)}M` },
    { label: 'EBITDA ($M)', key: 'ebitda_usd_m', format: v => `$${v.toFixed(1)}M`, bold: true, color: '#059669' },
    { label: 'EBITDA Margin %', key: 'ebitda_margin_pct', format: v => `${v}%` },
    { label: 'CapEx ($M)', key: 'capex_usd_m', format: v => `($${v.toFixed(1)}M)` },
    { label: 'Free Cash Flow (FCF) ($M)', key: 'free_cash_flow_usd_m', format: v => `$${v.toFixed(1)}M`, bold: true, color: '#0284c7' },
    { label: 'Cumulative FCF ($M)', key: 'cumulative_fcf_usd_m', format: v => `$${v.toFixed(1)}M`, bold: true }
  ];

  tbody.innerHTML = metrics.map(m => `
    <tr style="${m.bold ? 'font-weight:700; background:rgba(0,0,0,0.015);' : ''}">
      <td style="color:${m.color || 'inherit'};">${m.label}</td>
      ${rows.map(r => `<td style="color:${m.color || 'inherit'};">${m.format(r[m.key])}</td>`).join('')}
    </tr>
  `).join('');
}

function changeSlide(newIdx) {
  const slides = currentDiligenceData?.pillar_4_executive_slides || [];
  if (!slides.length) return;
  if (newIdx < 0) newIdx = 0;
  if (newIdx >= slides.length) newIdx = slides.length - 1;
  currentSlideIndex = newIdx;
  renderSlide(newIdx);
}

function renderSlide(idx) {
  const slides = currentDiligenceData?.pillar_4_executive_slides || [];
  if (!slides.length || !slides[idx]) return;

  const s = slides[idx];
  if ($('deckSlideCounter')) $('deckSlideCounter').textContent = `Slide ${idx + 1} of ${slides.length}`;

  document.querySelectorAll('.deck-pill').forEach((pill, i) => {
    pill.classList.toggle('active', i === idx);
  });

  const slideCard = $('activeSlideCard');
  if (slideCard) {
    slideCard.innerHTML = `
      <div>
        <div class="slide-kicker">${s.kicker}</div>
        <h2 class="slide-title">${s.title}</h2>
        <div class="slide-subtitle">${s.subtitle}</div>

        <div class="slide-metrics-row">
          ${(s.metrics || []).map(m => `
            <div class="slide-metric-box">
              <span class="d-kpi-label">${m.label}</span>
              <div style="font-size:20px; font-weight:900; color:var(--text-main); margin-top:2px;">${m.value}</div>
              <div class="d-kpi-sub">${m.sub}</div>
            </div>
          `).join('')}
        </div>

        <div class="slide-bullets-list">
          ${(s.bullet_points || []).map(b => `
            <div class="slide-bullet">
              <span class="slide-bullet-dot">▪</span>
              <span>${b}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="slide-footer-strip">
        <span>CONFIDENTIAL · PVC STRATEGY STUDIO · SENIOR LEADERSHIP CAPSTONE</span>
        <span>${idx + 1} / ${slides.length}</span>
      </div>
    `;
  }
}

async function executePitchbookQuery() {
  const select = $('pbEndpointSelect');
  const box = $('pbJsonResponseBox');
  if (!select || !box) return;

  const endpoint = select.value;
  box.textContent = `Sending request to ${endpoint}...`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    box.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    box.textContent = `Error executing PitchBook query: ${err.message}`;
  }
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
    let data = null;
    const res = await fetch(`/api/strategy/phase-deepdive/${encodeURIComponent(currentCompany)}/${encodeURIComponent(stageIdxOrYear)}`);
    if (res.ok) {
      data = await res.json();
    } else {
      // Graceful fallback for dynamic / appended / branched stages
      const sIdx = parseInt(stageIdxOrYear, 10);
      const stage = currentCompanyFlowData?.stages?.find(s => s.index === sIdx || s.id === stageIdxOrYear || s.year === stageIdxOrYear) ||
                    currentCompanyFlowData?.stages?.[sIdx - 1];
      if (stage) {
        data = {
          stage_index: stage.index || sIdx,
          year: stage.year,
          phase_title: stage.phase_title,
          phase_desc: stage.phase_desc,
          revenue_formatted: stage.revenue_formatted,
          growth_formatted: stage.growth_formatted,
          sales_marketing_formatted: stage.sales_marketing_formatted,
          rd_formatted: stage.rd_formatted,
          operating_margin_formatted: stage.operating_margin_formatted,
          rule_of_40: stage.rule_of_40,
          strategic_why: stage.strategic_why || {
            executive_summary: `${stage.phase_title}: Scaled trajectory milestone targeting ${stage.revenue_formatted} ARR.`,
            sm_why: `S&M intensity maintained at ${stage.sales_marketing_formatted} to execute GTM motions.`,
            rd_why: `R&D investment maintained at ${stage.rd_formatted} to protect product moat.`
          },
          financial_strategy: {
            revenue: stage.revenue_formatted,
            revenue_growth: stage.growth_formatted,
            sales_marketing: stage.sales_marketing_formatted,
            rd: stage.rd_formatted,
            operating_margin: stage.operating_margin_formatted,
            rule_of_40: stage.rule_of_40
          },
          frameworks: {
            ansoff: {
              strategy: stage.is_branch ? 'Diversification & Alternative Branch' : 'Market Penetration & Scaling Engine',
              why: stage.phase_desc || 'Executing strategic market expansion.'
            },
            porter: {
              primary_force: 'Threat of New Entrants & Substitutes',
              countermeasure: `Moat fortified via R&D reinvestment (${stage.rd_formatted}) and customer retention.`
            },
            moat: {
              type: 'High Switching Costs & Platform Integration',
              evidence: 'Sticky multi-product footprint with expanding contract value.'
            }
          },
          company: currentCompanyFlowData?.company || { name: currentCompany, ticker: currentCompany }
        };
      }
    }
    if (data) {
      currentDeepdiveData = data;
      renderPhaseDeepdive(data);
      highlightFlowchartNode(data.stage_index);
      if (window.openExplodeModal) window.openExplodeModal(data);
    }
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

  // Direct click and hover bindings on all Mermaid flowchart nodes
  container.querySelectorAll('g.node').forEach((nodeEl, idx) => {
    nodeEl.style.cursor = 'pointer';

    nodeEl.addEventListener('mouseenter', () => {
      const stage = currentCompanyFlowData?.stages?.[idx] || (currentCompanyFlowData?.stages?.find(s => String(s.index) === String(idx + 1)));
      if (stage) {
        showNodeHoverPopover(nodeEl, stage);
      }
    });

    nodeEl.addEventListener('mouseleave', () => {
      scheduleHideNodeHoverPopover();
    });

    nodeEl.onclick = (e) => {
      e.stopPropagation();
      hideNodeHoverPopoverImmediate();
      const stage = currentCompanyFlowData?.stages?.[idx] || (currentCompanyFlowData?.stages?.find(s => String(s.index) === String(idx + 1)));
      if (stage) {
        openExplodeModal(stage);
        loadPhaseDeepdive(stage.index || idx + 1);
      } else {
        loadPhaseDeepdive(idx + 1);
      }
    };
  });

  // Direct click bindings on edge labels
  container.querySelectorAll('.edgeLabel').forEach((edgeEl, idx) => {
    edgeEl.style.cursor = 'pointer';
    edgeEl.onclick = (e) => {
      e.stopPropagation();
      loadPhaseDeepdive(idx + 2);
    };
  });
}

function bindSvgNodeClicks() {
  const container = $('companyFlowMermaid');
  if (!container) return;

  container.querySelectorAll('.flow-svg-node').forEach((nodeEl, idx) => {
    nodeEl.style.cursor = 'pointer';

    nodeEl.addEventListener('mouseenter', () => {
      const stage = currentCompanyFlowData?.stages?.[idx] || (currentCompanyFlowData?.stages?.find(s => String(s.index) === String(idx + 1)));
      if (stage) {
        showNodeHoverPopover(nodeEl, stage);
      }
    });

    nodeEl.addEventListener('mouseleave', () => {
      scheduleHideNodeHoverPopover();
    });

    nodeEl.onclick = (e) => {
      e.stopPropagation();
      hideNodeHoverPopoverImmediate();
      const stage = currentCompanyFlowData?.stages?.[idx] || (currentCompanyFlowData?.stages?.find(s => String(s.index) === String(idx + 1)));
      if (stage) {
        openExplodeModal(stage);
        loadPhaseDeepdive(stage.index || idx + 1);
      } else {
        loadPhaseDeepdive(idx + 1);
      }
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
    clusterBg: '#0b1120', clusterBorder: '#1e293b', clusterHeader: '#94a3b8',
    cardBg: '#111827', cardBorder: '#1f2937',
    title: '#f8fafc', sub: '#94a3b8',
    edgeLine: '#475569', badgeBg: '#1e293b', badgeBorder: '#334155', badgeText: '#cbd5e1'
  } : {
    clusterBg: '#f8fafc', clusterBorder: '#e2e8f0', clusterHeader: '#475569',
    cardBg: '#ffffff', cardBorder: '#e2e8f0',
    title: '#0f172a', sub: '#64748b',
    edgeLine: '#94a3b8', badgeBg: '#ffffff', badgeBorder: '#cbd5e1', badgeText: '#475569'
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
      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.04"/>
      </filter>
      <marker id="arrowHead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 7 5 L 0 8 z" fill="${pal.edgeLine}"/>
      </marker>
    </defs>
  `;

  // 1. Cluster 1: Initial Traction & PMF
  const g1H = g1Stages.length * 118 + 55;
  let g1Html = `
    <g class="process-subgraph-cluster">
      <rect x="${c1X}" y="${c1Y}" width="${cW + 40}" height="${g1H}" rx="12" fill="${pal.clusterBg}" stroke="${pal.clusterBorder}" stroke-width="1.25"/>
      <rect x="${c1X + 16}" y="${c1Y + 12}" width="220" height="22" rx="4" fill="${pal.cardBg}" stroke="${pal.clusterBorder}" stroke-width="1"/>
      <text x="${c1X + 24}" y="${c1Y + 27}" font-size="10" font-weight="700" fill="${pal.clusterHeader}" letter-spacing="0.4">PHASE 1 · INITIAL GTM &amp; TRACTION</text>
  `;
  g1Stages.forEach((s, i) => {
    const cardY = c1Y + 44 + i * 115;
    const cardX = c1X + 20;
    const r40Val = s.rule_of_40 != null ? `R40: ${s.rule_of_40}` : '';
    g1Html += `
      <g class="flow-svg-node" onclick="selectFlowPhase('${s.id || s.index}')" filter="url(#cardShadow)" data-stage="${s.index || s.id}" style="cursor:pointer;">
        <rect class="card-bg" x="${cardX}" y="${cardY}" width="${cW}" height="${cH}" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <rect x="${cardX + 14}" y="${cardY + 12}" width="80" height="18" rx="4" fill="${pal.clusterBg}" stroke="${pal.cardBorder}" stroke-width="0.75"/>
        <text x="${cardX + 20}" y="${cardY + 25}" font-size="10" font-weight="700" fill="${pal.clusterHeader}">${esc(s.year)} · STAGE ${s.index || i+1}</text>
        <text x="${cardX + 14}" y="${cardY + 47}" font-size="13" font-weight="700" fill="${pal.title}">${esc(s.phase_title.length > 28 ? s.phase_title.slice(0, 27) + '…' : s.phase_title)}</text>
        <text x="${cardX + 14}" y="${cardY + 68}" font-size="13.5" font-weight="800" fill="${pal.title}">ARR: ${esc(s.revenue_formatted)} <tspan font-size="11" font-weight="600" fill="#10b981">(${esc(s.growth_formatted)})</tspan></text>
        <text x="${cardX + 14}" y="${cardY + 86}" font-size="10.5" font-weight="500" fill="${pal.sub}">S&amp;M: ${esc(s.sales_marketing_formatted)} | R&amp;D: ${esc(s.rd_formatted)} ${r40Val ? '| ' + r40Val : ''}</text>
        <circle cx="${cardX + cW}" cy="${cardY + cH/2}" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>
    `;
    if (i > 0) {
      const prevY = c1Y + 44 + (i - 1) * 115 + cH;
      g1Html += `
        <line x1="${cardX + cW/2}" y1="${prevY}" x2="${cardX + cW/2}" y2="${cardY}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      `;
    }
  });
  g1Html += `</g>`;

  // 2. Cluster 2: Scale Engine & Multi-Product
  const c2X = c1X;
  const c2Y = c1Y + g1H + 30;
  const g2H = g2Stages.length * 118 + 55;
  let g2Html = `
    <g class="process-subgraph-cluster">
      <rect x="${c2X}" y="${c2Y}" width="${cW + 40}" height="${g2H}" rx="12" fill="${pal.clusterBg}" stroke="${pal.clusterBorder}" stroke-width="1.25"/>
      <rect x="${c2X + 16}" y="${c2Y + 12}" width="245" height="22" rx="4" fill="${pal.cardBg}" stroke="${pal.clusterBorder}" stroke-width="1"/>
      <text x="${c2X + 24}" y="${c2Y + 27}" font-size="10" font-weight="700" fill="${pal.clusterHeader}" letter-spacing="0.4">PHASE 2 · SCALE ENGINE &amp; MULTI-PRODUCT</text>
  `;
  g2Stages.forEach((s, i) => {
    const cardY = c2Y + 44 + i * 115;
    const cardX = c2X + 20;
    const r40Val = s.rule_of_40 != null ? `R40: ${s.rule_of_40}` : '';
    g2Html += `
      <g class="flow-svg-node" onclick="selectFlowPhase('${s.id || s.index}')" filter="url(#cardShadow)" data-stage="${s.index || s.id}" style="cursor:pointer;">
        <rect class="card-bg" x="${cardX}" y="${cardY}" width="${cW}" height="${cH}" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <rect x="${cardX + 14}" y="${cardY + 12}" width="80" height="18" rx="4" fill="${pal.clusterBg}" stroke="${pal.cardBorder}" stroke-width="0.75"/>
        <text x="${cardX + 20}" y="${cardY + 25}" font-size="10" font-weight="700" fill="${pal.clusterHeader}">${esc(s.year)} · STAGE ${s.index || (k1 + i + 1)}</text>
        <text x="${cardX + 14}" y="${cardY + 47}" font-size="13" font-weight="700" fill="${pal.title}">${esc(s.phase_title.length > 28 ? s.phase_title.slice(0, 27) + '…' : s.phase_title)}</text>
        <text x="${cardX + 14}" y="${cardY + 68}" font-size="13.5" font-weight="800" fill="${pal.title}">ARR: ${esc(s.revenue_formatted)} <tspan font-size="11" font-weight="600" fill="#10b981">(${esc(s.growth_formatted)})</tspan></text>
        <text x="${cardX + 14}" y="${cardY + 86}" font-size="10.5" font-weight="500" fill="${pal.sub}">S&amp;M: ${esc(s.sales_marketing_formatted)} | R&amp;D: ${esc(s.rd_formatted)} ${r40Val ? '| ' + r40Val : ''}</text>
        <circle cx="${cardX + cW}" cy="${cardY + cH/2}" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>
    `;
    if (i > 0) {
      const prevY = c2Y + 44 + (i - 1) * 115 + cH;
      g2Html += `
        <line x1="${cardX + cW/2}" y1="${prevY}" x2="${cardX + cW/2}" y2="${cardY}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      `;
    }
  });
  g2Html += `</g>`;

  // Connector between Cluster 1 and Cluster 2
  const interLine = `
    <line x1="${c1X + 20 + cW/2}" y1="${c1Y + g1H}" x2="${c1X + 20 + cW/2}" y2="${c2Y}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    <circle cx="${c1X + 20 + cW/2}" cy="${c1Y + g1H}" r="3" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    <circle cx="${c1X + 20 + cW/2}" cy="${c2Y}" r="3" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
  `;

  // 3. Cluster 3: Enterprise Platform & Moat
  const c3X = 720;
  const c3Y = 45;
  const g3H = Math.max(g3Stages.length * 128 + 55, 360);
  let g3Html = `
    <g class="process-subgraph-cluster">
      <rect x="${c3X}" y="${c3Y}" width="${cW + 40}" height="${g3H}" rx="12" fill="${pal.clusterBg}" stroke="${pal.clusterBorder}" stroke-width="1.25"/>
      <rect x="${c3X + 16}" y="${c3Y + 12}" width="245" height="22" rx="4" fill="${pal.cardBg}" stroke="${pal.clusterBorder}" stroke-width="1"/>
      <text x="${c3X + 24}" y="${c3Y + 27}" font-size="10" font-weight="700" fill="${pal.clusterHeader}" letter-spacing="0.4">PHASE 3 · ENTERPRISE PLATFORM &amp; MOAT</text>
  `;
  g3Stages.forEach((s, i) => {
    const cardY = c3Y + 44 + i * 125;
    const cardX = c3X + 20;
    const r40Val = s.rule_of_40 != null ? `Rule of 40: ${s.rule_of_40}` : '';
    g3Html += `
      <g class="flow-svg-node" onclick="selectFlowPhase('${s.id || s.index}')" filter="url(#cardShadow)" data-stage="${s.index || s.id}" style="cursor:pointer;">
        <rect class="card-bg" x="${cardX}" y="${cardY}" width="${cW}" height="${cH + 8}" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <rect x="${cardX + 14}" y="${cardY + 12}" width="80" height="18" rx="4" fill="${pal.clusterBg}" stroke="${pal.cardBorder}" stroke-width="0.75"/>
        <text x="${cardX + 20}" y="${cardY + 25}" font-size="10" font-weight="700" fill="${pal.clusterHeader}">${esc(s.year)} · STAGE ${s.index || (k2 + i + 1)}</text>
        <text x="${cardX + 14}" y="${cardY + 48}" font-size="13.5" font-weight="700" fill="${pal.title}">${esc(s.phase_title.length > 28 ? s.phase_title.slice(0, 27) + '…' : s.phase_title)}</text>
        <text x="${cardX + 14}" y="${cardY + 70}" font-size="13.5" font-weight="800" fill="${pal.title}">ARR: ${esc(s.revenue_formatted)} <tspan font-size="11" font-weight="600" fill="#10b981">(${esc(s.growth_formatted)})</tspan></text>
        <text x="${cardX + 14}" y="${cardY + 90}" font-size="10.5" font-weight="500" fill="${pal.sub}">S&amp;M: ${esc(s.sales_marketing_formatted)} | R&amp;D: ${esc(s.rd_formatted)} | ${r40Val}</text>
        <circle cx="${cardX}" cy="${cardY + (cH+8)/2}" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>
    `;
    if (i > 0) {
      const prevY = c3Y + 44 + (i - 1) * 125 + cH + 8;
      g3Html += `
        <line x1="${cardX + cW/2}" y1="${prevY}" x2="${cardX + cW/2}" y2="${cardY}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      `;
    }
  });
  g3Html += `</g>`;

  // Middle Bridge Connectors
  const bridgeX1 = c1X + 20 + cW;
  const bridgeY1 = c1Y + 44 + cH/2;
  const bridgeX2 = c3X + 20;
  const bridgeY2 = c3Y + 44 + cH/2;

  const bridgePath1 = `M ${bridgeX1} ${bridgeY1} C ${bridgeX1 + 130} ${bridgeY1}, ${bridgeX2 - 130} ${bridgeY2}, ${bridgeX2} ${bridgeY2}`;
  
  const bridge2Y1 = c2Y + 44 + cH/2;
  const bridge2Y2 = c3Y + 44 + (g3Stages.length > 1 ? 125 : 0) + cH/2;
  const bridgePath2 = `M ${bridgeX1} ${bridge2Y1} C ${bridgeX1 + 130} ${bridge2Y1}, ${bridgeX2 - 130} ${bridge2Y2}, ${bridgeX2} ${bridge2Y2}`;

  const bridgeHtml = `
    <!-- Top Bridge Connector -->
    <path d="${bridgePath1}" fill="none" stroke="${pal.edgeLine}" stroke-width="1.5" marker-end="url(#arrowHead)"/>
    <g class="edge-badge-group" transform="translate(${(bridgeX1 + bridgeX2)/2 - 60}, ${(bridgeY1 + bridgeY2)/2 - 12})" onclick="selectFlowPhase('${g3Stages[0]?.id || g3Stages[0]?.index || 3}')">
      <rect width="120" height="22" rx="11" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1"/>
      <text x="60" y="15" font-size="9.5" font-weight="600" fill="${pal.badgeText}" text-anchor="middle">Enterprise Expansion ↗</text>
    </g>

    <!-- Bottom Bridge Connector -->
    <path d="${bridgePath2}" fill="none" stroke="${pal.edgeLine}" stroke-width="1.5" marker-end="url(#arrowHead)"/>
    <g class="edge-badge-group" transform="translate(${(bridgeX1 + bridgeX2)/2 - 65}, ${(bridge2Y1 + bridge2Y2)/2 - 12})" onclick="selectFlowPhase('${stages[stages.length-1]?.id || stages[stages.length-1]?.index || stages.length}')">
      <rect width="130" height="22" rx="11" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1"/>
      <text x="65" y="15" font-size="9.5" font-weight="600" fill="${pal.badgeText}" text-anchor="middle">Rule of 40 Compounding ↗</text>
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

/* Vector-Sharp Replica of the Process Flow Diagram Template - Refined, Clean, Non-Flashy */
function renderProcessFlowTemplateSvg(stages) {
  const W = 1040;
  const H = 640;
  const isDark = document.documentElement.classList.contains('dark');

  const pal = isDark ? {
    clusterBg: '#0b1120', clusterBorder: '#1e293b', clusterHeader: '#94a3b8',
    cardBg: '#111827', cardBorder: '#1f2937',
    title: '#f8fafc', sub: '#94a3b8',
    edgeLine: '#475569', badgeBg: '#1e293b', badgeBorder: '#334155', badgeText: '#cbd5e1'
  } : {
    clusterBg: '#f8fafc', clusterBorder: '#e2e8f0', clusterHeader: '#475569',
    cardBg: '#ffffff', cardBorder: '#e2e8f0',
    title: '#0f172a', sub: '#64748b',
    edgeLine: '#94a3b8', badgeBg: '#ffffff', badgeBorder: '#cbd5e1', badgeText: '#475569'
  };

  return `
  <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="min-width:${W}px; min-height:${H}px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <defs>
      <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.04"/>
      </filter>
      <marker id="arrowRight" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 2 L 7 5 L 0 8 z" fill="${pal.edgeLine}"/>
      </marker>
    </defs>

    <!-- Subgraph 1: Phase 1 Container (Top-Left) -->
    <g class="process-subgraph-cluster">
      <rect x="40" y="40" width="280" height="260" rx="12" fill="${pal.clusterBg}" stroke="${pal.clusterBorder}" stroke-width="1.25"/>
      <rect x="58" y="52" width="200" height="22" rx="4" fill="${pal.cardBg}" stroke="${pal.clusterBorder}" stroke-width="1"/>
      <text x="68" y="67" font-size="10" font-weight="700" fill="${pal.clusterHeader}" letter-spacing="0.4">PHASE 1 · PRODUCT-MARKET FIT</text>
      
      <!-- Card A1 (Core Dev) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('A1')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="58" y="85" width="244" height="85" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <text x="76" y="112" font-size="13.5" font-weight="700" fill="${pal.title}">Etiam elem</text>
        <text x="76" y="132" font-size="11.5" fill="${pal.sub}">Quisque ore sapien</text>
        <text x="76" y="152" font-size="11" font-weight="700" fill="${pal.title}">ARR: $5.0M <tspan font-weight="500" fill="${pal.sub}">· S&amp;M: 52%</tspan></text>
        <!-- Clean Port Dot -->
        <circle cx="180" cy="170" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>

      <!-- Card A2 (PLG Funnel) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('A2')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="58" y="195" width="244" height="85" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <text x="76" y="222" font-size="13.5" font-weight="700" fill="${pal.title}">Etiam elem</text>
        <text x="76" y="242" font-size="11.5" fill="${pal.sub}">Quisque ore sapien</text>
        <text x="76" y="262" font-size="11" font-weight="700" fill="${pal.title}">ARR: $15.0M <tspan font-weight="500" fill="${pal.sub}">· S&amp;M: 46%</tspan></text>
        <!-- Clean Port Dot Right -->
        <circle cx="302" cy="237" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>
      
      <!-- Internal vertical connector -->
      <line x1="180" y1="170" x2="180" y2="195" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    </g>

    <!-- Subgraph 2: Phase 2 Container (Bottom-Left) -->
    <g class="process-subgraph-cluster">
      <rect x="40" y="330" width="280" height="260" rx="12" fill="${pal.clusterBg}" stroke="${pal.clusterBorder}" stroke-width="1.25"/>
      <rect x="58" y="342" width="190" height="22" rx="4" fill="${pal.cardBg}" stroke="${pal.clusterBorder}" stroke-width="1"/>
      <text x="68" y="357" font-size="10" font-weight="700" fill="${pal.clusterHeader}" letter-spacing="0.4">PHASE 2 · GTM SCALE ENGINE</text>

      <!-- Card B1 (Inside Sales) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('B1')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="58" y="375" width="244" height="85" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <text x="76" y="402" font-size="13.5" font-weight="700" fill="${pal.title}">Etiam elem</text>
        <text x="76" y="422" font-size="11.5" fill="${pal.sub}">Quisque ore sapien</text>
        <text x="76" y="442" font-size="11" font-weight="700" fill="${pal.title}">ARR: $35.0M <tspan font-weight="500" fill="${pal.sub}">· S&amp;M: 42%</tspan></text>
        <circle cx="180" cy="460" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>

      <!-- Card B2 (Multi-Product) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('B2')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="58" y="485" width="244" height="85" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <text x="76" y="512" font-size="13.5" font-weight="700" fill="${pal.title}">Etiam elem</text>
        <text x="76" y="532" font-size="11.5" fill="${pal.sub}">Quisque ore sapien</text>
        <text x="76" y="552" font-size="11" font-weight="700" fill="${pal.title}">ARR: $75.0M <tspan font-weight="500" fill="${pal.sub}">· S&amp;M: 38%</tspan></text>
        <circle cx="302" cy="527" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>

      <!-- Internal vertical connector -->
      <line x1="180" y1="460" x2="180" y2="485" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    </g>

    <!-- Connector between Container 1 and 2 -->
    <line x1="180" y1="300" x2="180" y2="330" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    <circle cx="180" cy="300" r="3" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    <circle cx="180" cy="330" r="3" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>

    <!-- Middle Floating Cards (Bridge Trajectory) -->
    <!-- Card M1 (Mid-Market Inflection) -->
    <g class="flow-svg-node" onclick="selectFlowPhase('M1')" style="cursor:pointer;" filter="url(#cardShadow)">
      <rect class="card-bg" x="390" y="235" width="190" height="95" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
      <text x="410" y="265" font-size="13.5" font-weight="700" fill="${pal.title}">Etiam elementum</text>
      <text x="410" y="287" font-size="11.5" fill="${pal.sub}">Quisque ornare sapien</text>
      <text x="410" y="309" font-size="11" font-weight="700" fill="${pal.title}">ARR: $120.0M <tspan font-weight="500" fill="${pal.sub}">· 60%</tspan></text>
      <circle cx="390" cy="282" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      <circle cx="580" cy="282" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    </g>

    <!-- Card M2 (Channel Ecosystem) -->
    <g class="flow-svg-node" onclick="selectFlowPhase('M2')" style="cursor:pointer;" filter="url(#cardShadow)">
      <rect class="card-bg" x="390" y="465" width="190" height="95" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
      <text x="410" y="495" font-size="13.5" font-weight="700" fill="${pal.title}">Etiam elementum</text>
      <text x="410" y="517" font-size="11.5" fill="${pal.sub}">Quisque ornare sapien</text>
      <text x="410" y="539" font-size="11" font-weight="700" fill="${pal.title}">ARR: $200.0M <tspan font-weight="500" fill="${pal.sub}">· 50%</tspan></text>
      <circle cx="390" cy="512" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      <circle cx="580" cy="512" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    </g>

    <!-- Subgraph 3: Phase 3 Container (Right) -->
    <g class="process-subgraph-cluster">
      <rect x="670" y="160" width="330" height="400" rx="12" fill="${pal.clusterBg}" stroke="${pal.clusterBorder}" stroke-width="1.25"/>
      <rect x="692" y="174" width="250" height="22" rx="4" fill="${pal.cardBg}" stroke="${pal.clusterBorder}" stroke-width="1"/>
      <text x="702" y="189" font-size="10" font-weight="700" fill="${pal.clusterHeader}" letter-spacing="0.4">PHASE 3 · ENTERPRISE PLATFORM &amp; MOAT</text>

      <!-- Card C1 (Enterprise Suite GA) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('C1')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="692" y="210" width="286" height="120" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <text x="714" y="240" font-size="14" font-weight="700" fill="${pal.title}">Etiam elementum</text>
        <text x="714" y="262" font-size="11.5" fill="${pal.sub}">Quisque ornare sapien</text>
        <text x="714" y="286" font-size="12" font-weight="700" fill="${pal.title}">Enterprise Security · ARR: $450.0M</text>
        <text x="714" y="306" font-size="10.5" font-weight="500" fill="${pal.sub}">S&amp;M: 32% | R&amp;D: 23% | Rule of 40: 52</text>
        <circle cx="692" cy="270" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>

      <!-- Card C2 (Operating Cash Machine) -->
      <g class="flow-svg-node" onclick="selectFlowPhase('C2')" style="cursor:pointer;" filter="url(#cardShadow)">
        <rect class="card-bg" x="692" y="350" width="286" height="120" rx="8" fill="${pal.cardBg}" stroke="${pal.cardBorder}" stroke-width="1"/>
        <text x="714" y="380" font-size="14" font-weight="700" fill="${pal.title}">Etiam elementum</text>
        <text x="714" y="402" font-size="11.5" fill="${pal.sub}">Quisque ornare sapien</text>
        <text x="714" y="426" font-size="12" font-weight="700" fill="#10b981">Operating Leverage · ARR: $850.0M</text>
        <text x="714" y="446" font-size="10.5" font-weight="500" fill="${pal.sub}">FCF Margin: 28% | Rule of 40: 54</text>
        <circle cx="692" cy="410" r="3.5" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      </g>

      <!-- Internal vertical connector between C1 and C2 -->
      <line x1="835" y1="330" x2="835" y2="350" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      <circle cx="835" cy="330" r="3" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
      <circle cx="835" cy="350" r="3" fill="${pal.cardBg}" stroke="${pal.edgeLine}" stroke-width="1.5"/>
    </g>

    <!-- Edge Connectors with Clean Minimal Pill Badges (No Distracting Pulse) -->
    <!-- Edge 1: Card A2 -> Card M1 -->
    <path d="M 302 237 L 340 237 L 340 282 L 384 282" fill="none" stroke="${pal.edgeLine}" stroke-width="1.5" marker-end="url(#arrowRight)"/>
    <g class="edge-badge-group" transform="translate(315, 218)" onclick="selectFlowPhase('M1')">
      <rect width="130" height="22" rx="11" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1"/>
      <text x="65" y="15" font-size="9.5" font-weight="600" fill="${pal.badgeText}" text-anchor="middle">Quisque ornare ut nequetemes</text>
    </g>

    <!-- Edge 2: Card B2 -> Card M2 -->
    <path d="M 302 527 L 384 527" fill="none" stroke="${pal.edgeLine}" stroke-width="1.5" marker-end="url(#arrowRight)"/>
    <g class="edge-badge-group" transform="translate(320, 510)" onclick="selectFlowPhase('M2')">
      <rect width="80" height="22" rx="11" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1"/>
      <text x="40" y="15" font-size="9.5" font-weight="600" fill="${pal.badgeText}" text-anchor="middle">Quisque ornare</text>
    </g>

    <!-- Edge 3: Card M1 -> Card C1 -->
    <path d="M 580 282 L 686 270" fill="none" stroke="${pal.edgeLine}" stroke-width="1.5" marker-end="url(#arrowRight)"/>

    <!-- Edge 4: Card M2 -> Card C2 -->
    <path d="M 580 512 L 630 512 L 630 410 L 686 410" fill="none" stroke="${pal.edgeLine}" stroke-width="1.5" marker-end="url(#arrowRight)"/>

    <!-- Edge 5: Cross Bridge G1 -> G3 -->
    <path d="M 320 125 L 670 125 L 835 125 L 835 160" fill="none" stroke="${pal.edgeLine}" stroke-dasharray="3,3" stroke-width="1.25"/>
    <g class="edge-badge-group" transform="translate(460, 112)" onclick="selectFlowPhase('C1')">
      <rect width="90" height="22" rx="11" fill="${pal.badgeBg}" stroke="${pal.badgeBorder}" stroke-width="1"/>
      <text x="45" y="15" font-size="9.5" font-weight="600" fill="${pal.badgeText}" text-anchor="middle">Quisque ornare</text>
    </g>
  </svg>
  `;
}

// =========================================================================
// Strategy Backpack & Custom Flow Composer Engine
// =========================================================================
const BACKPACK_ITEMS_KEY = 'strategy_backpack_items_v1';
const BACKPACK_DRAFT_KEY = 'strategy_backpack_draft_v1';

let backpackItems = [];
let backpackDraft = [];

function loadBackpackState() {
  try {
    backpackItems = JSON.parse(localStorage.getItem(BACKPACK_ITEMS_KEY) || '[]');
    if (!Array.isArray(backpackItems)) backpackItems = [];
  } catch { backpackItems = []; }
  try {
    backpackDraft = JSON.parse(localStorage.getItem(BACKPACK_DRAFT_KEY) || '[]');
    if (!Array.isArray(backpackDraft)) backpackDraft = [];
  } catch { backpackDraft = []; }
}

function persistBackpackState() {
  try {
    localStorage.setItem(BACKPACK_ITEMS_KEY, JSON.stringify(backpackItems));
    localStorage.setItem(BACKPACK_DRAFT_KEY, JSON.stringify(backpackDraft));
  } catch {}
  updateBackpackBadge();
}

function updateBackpackBadge() {
  const badge = $('backpackCountBadge');
  if (badge) {
    badge.textContent = String(backpackItems.length);
  }
  const savedText = $('backpackSavedCountText');
  if (savedText) {
    savedText.textContent = `${backpackItems.length} connection${backpackItems.length === 1 ? '' : 's'} saved`;
  }
  const draftCount = $('backpackDraftCount');
  if (draftCount) {
    draftCount.textContent = String(backpackDraft.length);
  }
}

function saveStageToBackpack(stageData) {
  if (!stageData) return;
  const comp = stageData.company || currentCompanyFlowData?.company || {
    name: $('companyFlowSelect')?.selectedOptions?.[0]?.textContent?.split('(')[0]?.trim() || 'Company',
    ticker: $('companyFlowSelect')?.value || 'SAAS'
  };
  const ticker = (comp.ticker || 'SAAS').toUpperCase();
  const yearLabel = stageData.year || `Stage ${stageData.index || 1}`;
  const title = stageData.phase_title || 'Strategy Stage';

  // Avoid duplicate identical ticker + year + title
  const exists = backpackItems.some(it => it.ticker === ticker && it.year === yearLabel && it.phase_title === title);
  if (exists) {
    toast.info('Already in Backpack', `${ticker} · ${yearLabel} is already saved in your Backpack.`);
    return;
  }

  const item = {
    uid: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    companyName: comp.name || ticker,
    ticker,
    year: yearLabel,
    phase_title: title,
    phase_desc: stageData.phase_desc || stageData.strategic_why?.executive_summary || '',
    revenue: stageData.revenue || 50e6,
    revenue_formatted: stageData.revenue_formatted || stageData.financial_strategy?.revenue || '$50.0M',
    growth: stageData.growth || 0.5,
    growth_formatted: stageData.growth_formatted || stageData.financial_strategy?.revenue_growth || '+50%',
    sales_marketing_ratio: stageData.sales_marketing_ratio || 0.4,
    sales_marketing_formatted: stageData.sales_marketing_formatted || stageData.financial_strategy?.sales_marketing || '40.0%',
    rd_ratio: stageData.rd_ratio || 0.25,
    rd_formatted: stageData.rd_formatted || stageData.financial_strategy?.rd || '25.0%',
    operating_margin: stageData.operating_margin || 0.0,
    operating_margin_formatted: stageData.operating_margin_formatted || stageData.financial_strategy?.operating_margin || '0.0%',
    rule_of_40: stageData.rule_of_40 ?? stageData.financial_strategy?.rule_of_40 ?? 50,
    strategic_why: stageData.strategic_why || { executive_summary: stageData.phase_desc || '' },
    frameworks: stageData.frameworks || {},
    deltas: stageData.deltas || { sm_pp: 0, rd_pp: 0, growth_pp: 0 },
    copy_payload: stageData.copy_payload || null
  };

  backpackItems.unshift(item);
  persistBackpackState();
  toast.success('Saved to Backpack 🎒', `${ticker} · ${yearLabel} added. Open Backpack to compose your flow.`);

  if ($('backpackEditorView')?.style.display !== 'none') {
    renderBackpackEditor();
  }
}

function buildFlowFromBackpackDraft() {
  const titleInput = $('backpackFlowTitleInput');
  const flowTitle = (titleInput?.value || '').trim() || 'Custom Multi-Company Strategy Flow';

  const stages = backpackDraft.map((item, idx) => {
    const prev = idx > 0 ? backpackDraft[idx - 1] : null;
    const smDelta = prev ? Math.round(((item.sales_marketing_ratio || 0.4) - (prev.sales_marketing_ratio || 0.4)) * 1000) / 10 : 0;
    const rdDelta = prev ? Math.round(((item.rd_ratio || 0.25) - (prev.rd_ratio || 0.25)) * 1000) / 10 : 0;
    const grDelta = prev ? Math.round(((item.growth || 0.5) - (prev.growth || 0.5)) * 1000) / 10 : 0;

    return {
      ...item,
      id: `N_${idx + 1}`,
      index: idx + 1,
      year: `${item.ticker} · ${item.year}`,
      company: { name: item.companyName, ticker: item.ticker },
      is_branch: Boolean(item.is_branch),
      deltas: { sm_pp: smDelta, rd_pp: rdDelta, growth_pp: grDelta }
    };
  });

  const mLines = [
    'flowchart LR',
    '  classDef card fill:#111927,stroke:#334155,stroke-width:1.5px,color:#f8fafc,rx:8px;'
  ];
  stages.forEach((s, i) => {
    const lbl = `"<b>${s.year} · ${s.phase_title}</b><br/>ARR: ${s.revenue_formatted} · Growth: ${s.growth_formatted}<br/><i>S&M: ${s.sales_marketing_formatted} | R&D: ${s.rd_formatted} | R40: ${s.rule_of_40}</i>"`;
    mLines.push(`  ${s.id}[${lbl}]:::card`);
    if (i > 0) {
      const prev = stages[i - 1];
      const arrow = s.is_branch ? '-.->' : '-->';
      const sign = s.deltas.sm_pp >= 0 ? '+' : '';
      mLines.push(`  ${prev.id} ${arrow}|"${sign}${s.deltas.sm_pp}pp S&M"| ${s.id}`);
    }
  });

  return {
    id: 'backpack-custom-flow',
    title: flowTitle,
    subtitle: `Custom ${stages.length}-stage flow composed from ${[...new Set(stages.map(s => s.ticker))].join(', ')}.`,
    company: { name: flowTitle, ticker: 'CUSTOM' },
    stages,
    stages_count: stages.length,
    mermaid_code: mLines.join('\n')
  };
}

function renderBackpackEditor() {
  updateBackpackBadge();
  const listEl = $('backpackSavedList');
  const seqEl = $('backpackSequenceStrip');
  const previewEl = $('backpackFlowPreview');
  if (!listEl || !seqEl || !previewEl) return;

  // 1. Render Saved Items Library
  if (!backpackItems.length) {
    listEl.innerHTML = `
      <div class="backpack-empty-state">
        <div style="font-size:28px; margin-bottom:8px;">🎒</div>
        <strong>Your Strategy Backpack is empty</strong>
        <p style="font-size:12.5px; color:var(--text-muted); margin:6px 0 0; line-height:1.5;">
          Explore any company on the <b>Canvas</b>, hover or click a stage node, and hit <b>🎒 Save to Backpack</b> to collect strategic connections here.
        </p>
      </div>
    `;
  } else {
    listEl.innerHTML = backpackItems.map(item => `
      <div class="backpack-item-card" data-bp-uid="${esc(item.uid)}">
        <div class="bp-card-top">
          <span class="bp-ticker-pill">${esc(item.ticker)} · ${esc(item.year)}</span>
          <button type="button" class="bp-delete-btn" data-bp-delete="${esc(item.uid)}" title="Remove from Backpack">×</button>
        </div>
        <div class="bp-card-title">${esc(item.phase_title)}</div>
        <div class="bp-card-metrics">
          <span>ARR <b>${esc(item.revenue_formatted)}</b></span>
          <span>Growth <b class="text-emerald">${esc(item.growth_formatted)}</b></span>
          <span>S&amp;M <b>${esc(item.sales_marketing_formatted)}</b></span>
          <span>R40 <b>${esc(String(item.rule_of_40))}</b></span>
        </div>
        <button type="button" class="btn secondary bp-add-btn" data-bp-add="${esc(item.uid)}">
          + Add to Flow Sequence
        </button>
      </div>
    `).join('');

    listEl.querySelectorAll('[data-bp-add]').forEach(btn => {
      btn.onclick = () => {
        const item = backpackItems.find(x => x.uid === btn.dataset.bpAdd);
        if (item) {
          backpackDraft.push({ ...item, draft_uid: `dr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, is_branch: false });
          persistBackpackState();
          renderBackpackEditor();
        }
      };
    });

    listEl.querySelectorAll('[data-bp-delete]').forEach(btn => {
      btn.onclick = () => {
        backpackItems = backpackItems.filter(x => x.uid !== btn.dataset.bpDelete);
        persistBackpackState();
        renderBackpackEditor();
      };
    });
  }

  // 2. Render Ordered Flow Sequence Strip
  if (!backpackDraft.length) {
    seqEl.innerHTML = `<span style="font-size:13px; color:var(--text-muted);">Click <b>+ Add to Flow Sequence</b> on any saved connection to start building your custom strategy flow.</span>`;
    previewEl.innerHTML = `
      <div class="backpack-preview-empty">
        <div style="font-size:32px; margin-bottom:8px;">✨</div>
        <div style="font-size:15px; font-weight:700;">Custom Flow Canvas Ready</div>
        <p style="font-size:13px; color:var(--text-muted); margin:4px 0 0;">Add saved company stages from the left tray to visualize and connect your strategy.</p>
      </div>
    `;
    return;
  }

  seqEl.innerHTML = backpackDraft.map((item, idx) => `
    <div class="bp-seq-chip ${item.is_branch ? 'is-branch' : ''}">
      <div class="bp-seq-chip-top">
        <span class="bp-seq-num">${idx + 1}</span>
        <strong>${esc(item.ticker)} · ${esc(item.year)}</strong>
        <button type="button" class="bp-seq-remove" data-draft-remove="${idx}" title="Remove from sequence">×</button>
      </div>
      <div class="bp-seq-title">${esc(item.phase_title)}</div>
      <div class="bp-seq-actions">
        <button type="button" data-draft-left="${idx}" ${idx === 0 ? 'disabled' : ''} title="Move Left">←</button>
        <button type="button" data-draft-right="${idx}" ${idx === backpackDraft.length - 1 ? 'disabled' : ''} title="Move Right">→</button>
        <button type="button" data-draft-branch="${idx}" class="${item.is_branch ? 'active' : ''}" title="Toggle Branch">🌿 Branch</button>
      </div>
    </div>
    ${idx < backpackDraft.length - 1 ? '<span class="bp-seq-arrow">→</span>' : ''}
  `).join('');

  seqEl.querySelectorAll('[data-draft-remove]').forEach(btn => {
    btn.onclick = () => {
      backpackDraft.splice(parseInt(btn.dataset.draftRemove, 10), 1);
      persistBackpackState();
      renderBackpackEditor();
    };
  });
  seqEl.querySelectorAll('[data-draft-left]').forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.draftLeft, 10);
      if (i > 0) {
        [backpackDraft[i - 1], backpackDraft[i]] = [backpackDraft[i], backpackDraft[i - 1]];
        persistBackpackState();
        renderBackpackEditor();
      }
    };
  });
  seqEl.querySelectorAll('[data-draft-right]').forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.draftRight, 10);
      if (i < backpackDraft.length - 1) {
        [backpackDraft[i], backpackDraft[i + 1]] = [backpackDraft[i + 1], backpackDraft[i]];
        persistBackpackState();
        renderBackpackEditor();
      }
    };
  });
  seqEl.querySelectorAll('[data-draft-branch]').forEach(btn => {
    btn.onclick = () => {
      const i = parseInt(btn.dataset.draftBranch, 10);
      if (backpackDraft[i]) {
        backpackDraft[i].is_branch = !backpackDraft[i].is_branch;
        persistBackpackState();
        renderBackpackEditor();
      }
    };
  });

  // 3. Render Live Interactive SVG Flowchart Preview
  const draftFlow = buildFlowFromBackpackDraft();
  previewEl.innerHTML = renderClusteredCompanySvg(draftFlow.stages, draftFlow);
  previewEl.querySelectorAll('.flow-svg-node').forEach((nodeEl, idx) => {
    nodeEl.style.cursor = 'pointer';
    nodeEl.onclick = () => {
      if (draftFlow.stages[idx]) openExplodeModal(draftFlow.stages[idx]);
    };
  });
}

let latestBackpackRecommendation = null;

async function fetchBackpackRecommendations(autoAssemble = false) {
  const diagEl = $('backpackAgentDiagnosis');
  const gridEl = $('backpackRecCardsGrid');
  const objective = $('backpackRecObjective')?.value || 'rule40';
  if (diagEl) diagEl.innerHTML = '<span>⏳ Analyzing Backpack against SEC 10-K dataset...</span>';

  try {
    const res = await fetch('/api/strategy/backpack-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backpack_items: backpackItems,
        draft_items: backpackDraft,
        objective
      })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    latestBackpackRecommendation = data;

    if ($('backpackDatasetBadge') && data.benchmarks) {
      $('backpackDatasetBadge').textContent = `${data.benchmarks.companies_count} Companies · Median R40 ${data.benchmarks.median_rule_of_40}`;
    }

    if (diagEl) {
      diagEl.innerHTML = (data.diagnosis || []).map(p => `<div>• ${esc(p)}</div>`).join('');
    }

    if (gridEl) {
      const recs = data.recommended_additions || [];
      gridEl.innerHTML = recs.map((r, i) => `
        <div class="bp-rec-card">
          <div>
            <div class="bp-rec-role">${esc(r.role_tag || 'RECOMMENDED STAGE')}</div>
            <div class="bp-rec-title">${esc(r.ticker)} · ${esc(r.year)} (${esc(r.revenue_formatted)})</div>
            <p class="bp-rec-reason">${esc(r.reason || r.phase_desc || '')}</p>
          </div>
          <button type="button" class="btn secondary bp-add-btn" data-rec-idx="${i}">
            🎒 Save &amp; Add to Flow
          </button>
        </div>
      `).join('');

      gridEl.querySelectorAll('[data-rec-idx]').forEach(btn => {
        btn.onclick = () => {
          const rec = recs[parseInt(btn.dataset.recIdx, 10)];
          if (!rec) return;
          if (!backpackItems.some(x => x.ticker === rec.ticker && x.year === rec.year)) {
            backpackItems.unshift({ ...rec, uid: `bp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
          }
          backpackDraft.push({ ...rec, draft_uid: `dr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, is_branch: false });
          persistBackpackState();
          renderBackpackEditor();
          fetchBackpackRecommendations(false);
          toast.success('Added Recommended Stage', `${rec.ticker} · ${rec.year} added to your flow.`);
        };
      });
    }

    if (autoAssemble && data.assembled_sequence && data.assembled_sequence.length) {
      backpackDraft = data.assembled_sequence.map((item, idx) => ({
        ...item,
        draft_uid: `dr_auto_${Date.now()}_${idx}`,
        is_branch: Boolean(item.is_branch)
      }));
      data.assembled_sequence.forEach(item => {
        if (!backpackItems.some(x => x.ticker === item.ticker && x.year === item.year)) {
          backpackItems.push({ ...item, uid: item.uid || `bp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` });
        }
      });
      persistBackpackState();
      renderBackpackEditor();
      toast.success('Flow Auto-Assembled ⚡', `Built a ${backpackDraft.length}-stage trajectory grounded in your Backpack and SEC data.`);
    }
  } catch (err) {
    console.error('Backpack recommendation failed:', err);
    if (diagEl) diagEl.innerHTML = `<span style="color:var(--destructive);">Could not load recommendations: ${esc(err.message)}</span>`;
  }
}

function initBackpack() {
  loadBackpackState();
  updateBackpackBadge();

  const recBtn = $('backpackRecommendBtn');
  if (recBtn) recBtn.onclick = () => fetchBackpackRecommendations(false);

  const recObj = $('backpackRecObjective');
  if (recObj) recObj.onchange = () => fetchBackpackRecommendations(false);

  const autoBtn = $('backpackAutoAssembleBtn');
  if (autoBtn) autoBtn.onclick = () => fetchBackpackRecommendations(true);

  const hoverSaveBtn = $('hoverPopoverSaveBackpackBtn');
  if (hoverSaveBtn) {
    hoverSaveBtn.onclick = (e) => {
      e.stopPropagation();
      if (activeHoveredStage) {
        saveStageToBackpack(activeHoveredStage);
      }
    };
  }

  const clearAllBtn = $('backpackClearAllBtn');
  if (clearAllBtn) {
    clearAllBtn.onclick = () => {
      backpackItems = [];
      persistBackpackState();
      renderBackpackEditor();
      toast.info('Backpack Cleared', 'All saved connections removed from your Backpack.');
    };
  }

  const clearDraftBtn = $('backpackClearDraftBtn');
  if (clearDraftBtn) {
    clearDraftBtn.onclick = () => {
      backpackDraft = [];
      persistBackpackState();
      renderBackpackEditor();
    };
  }

  const loadToCanvasBtn = $('backpackLoadToCanvasBtn');
  if (loadToCanvasBtn) {
    loadToCanvasBtn.onclick = () => {
      if (!backpackDraft.length) {
        toast.info('Empty Flow', 'Add at least one saved stage to your flow sequence first.');
        return;
      }
      const draftFlow = buildFlowFromBackpackDraft();
      currentCompanyFlowData = draftFlow;
      renderCompanyFlow(draftFlow);
      if (window.switchStudioView) window.switchStudioView('canvas');
      toast.success('Custom Flow Loaded', `Opened "${draftFlow.title}" on the Strategy Canvas.`);
    };
  }
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
initBackpack();
updateLocalKPIs();
run(false);

