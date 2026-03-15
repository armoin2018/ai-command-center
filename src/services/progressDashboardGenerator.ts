/**
 * PROGRESS.html Interactive Dashboard Generator
 * AICC-0279 / 0280 / 0281 / 0282
 *
 * Generates a standalone HTML dashboard from a PLAN.json document (v1 or v2).
 * The output is a single HTML file with embedded CSS/JS and CDN links for
 * Bootstrap 5.3.2, Chart.js 4.4.1, and Mermaid 10.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlanDocument, StatusCounts } from '../types/plan';
import { PlanDocumentV2, PlanItemV2 } from '../types/planV2';
import { SchemaCompatLayer } from './schemaCompat';
import { Logger } from '../logger';

const logger = Logger.getInstance();

// ---------------------------------------------------------------------------
// Dashboard data types (AICC-0282)
// ---------------------------------------------------------------------------

/** Aggregated data consumed by the dashboard template */
export interface DashboardData {
  /** Project-level metadata */
  projectName: string;
  projectCode: string;
  generatedAt: string;
  schemaVersion: string;

  /** Aggregate status counts */
  statusCounts: StatusCounts;
  totalItems: number;

  /** Velocity by sprint/batch */
  velocityByBatch: VelocityBatch[];

  /** Epic-level summaries */
  epicSummaries: EpicSummary[];

  /** Sprint-by-sprint timeline */
  sprintTimeline: SprintTimelineEntry[];

  /** Compliance / acceptance-criteria pass/fail */
  complianceItems: ComplianceItem[];

  /** Priority distribution */
  priorityDistribution: Record<string, number>;
}

export interface VelocityBatch {
  name: string;
  done: number;
  total: number;
}

export interface EpicSummary {
  id: string;
  summary: string;
  status: string;
  totalChildren: number;
  doneChildren: number;
  completionPct: number;
  stories: StorySummary[];
}

export interface StorySummary {
  id: string;
  summary: string;
  status: string;
}

export interface SprintTimelineEntry {
  sprint: string;
  cumDone: number;
  cumTotal: number;
  target: number;
}

export interface ComplianceItem {
  id: string;
  summary: string;
  hasAcceptanceCriteria: boolean;
  status: string;
  pass: boolean;
}

// ---------------------------------------------------------------------------
// Generator class
// ---------------------------------------------------------------------------

/**
 * Generates a standalone interactive PROGRESS.html dashboard from plan data.
 */
export class ProgressDashboardGenerator {
  private compat: SchemaCompatLayer;

  constructor() {
    this.compat = new SchemaCompatLayer();
  }

  /**
   * Generate the dashboard HTML file from a plan document.
   *
   * @param planDoc - A v1 {@link PlanDocument} or v2 {@link PlanDocumentV2}
   * @param outputPath - Absolute path where PROGRESS.html will be written
   */
  public async generateDashboard(
    planDoc: PlanDocument | PlanDocumentV2,
    outputPath: string,
  ): Promise<void> {
    logger.info('Generating PROGRESS.html dashboard', { outputPath });

    const data = this.extractDashboardData(planDoc);
    const html = this.renderHtml(data, planDoc);

    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, html, 'utf-8');
    logger.info('PROGRESS.html written', {
      outputPath,
      sizeBytes: Buffer.byteLength(html, 'utf-8'),
    });
  }

  // -----------------------------------------------------------------------
  // Data extraction (AICC-0282)
  // -----------------------------------------------------------------------

  /**
   * Extract all dashboard-required data from a plan document.
   *
   * @param planDoc - v1 or v2 plan document
   * @returns A {@link DashboardData} ready for template rendering
   */
  public extractDashboardData(
    planDoc: PlanDocument | PlanDocumentV2,
  ): DashboardData {
    // Normalize to v2 for uniform access
    const doc = this.compat.normalize(planDoc);
    const items = doc.items;

    const projectName = doc.metadata.projectName || 'Project';
    const projectCode = doc.metadata.projectCode || '';

    // Status counts
    const statusCounts = doc.statusCounts;
    const totalItems = items.length;

    // Priority distribution
    const priorityDistribution: Record<string, number> = {};
    for (const item of items) {
      const p = item.priority || 'medium';
      priorityDistribution[p] = (priorityDistribution[p] || 0) + 1;
    }

    // Velocity by sprint
    const velocityByBatch = this.computeVelocity(items);

    // Epic summaries
    const epicSummaries = this.computeEpicSummaries(items);

    // Sprint timeline
    const sprintTimeline = this.computeSprintTimeline(items);

    // Compliance
    const complianceItems = this.computeCompliance(items);

    return {
      projectName,
      projectCode,
      generatedAt: doc.generatedAt,
      schemaVersion: doc.version,
      statusCounts,
      totalItems,
      velocityByBatch,
      epicSummaries,
      sprintTimeline,
      complianceItems,
      priorityDistribution,
    };
  }

  // -----------------------------------------------------------------------
  // Computation helpers
  // -----------------------------------------------------------------------

  private computeVelocity(items: PlanItemV2[]): VelocityBatch[] {
    const sprintMap = new Map<string, { done: number; total: number }>();
    for (const item of items) {
      const sprint = item.sprint || 'Unassigned';
      if (!sprintMap.has(sprint)) {
        sprintMap.set(sprint, { done: 0, total: 0 });
      }
      const entry = sprintMap.get(sprint)!;
      entry.total++;
      if (item.status === 'DONE') {
        entry.done++;
      }
    }

    return Array.from(sprintMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, v]) => ({ name, done: v.done, total: v.total }));
  }

  private computeEpicSummaries(items: PlanItemV2[]): EpicSummary[] {
    const epics = items.filter((i) => i.type === 'epic');
    return epics.map((epic) => {
      const childIds = new Set(epic.children || []);
      const stories = items
        .filter((i) => i.type === 'story' && (childIds.has(i.id) || i.parentId === epic.id));
      const allDescendants = items.filter(
        (i) => i.parentId === epic.id || stories.some((s) => s.id === i.parentId),
      );
      const totalChildren = allDescendants.length;
      const doneChildren = allDescendants.filter((i) => i.status === 'DONE').length;
      const completionPct = totalChildren > 0 ? Math.round((doneChildren / totalChildren) * 100) : 0;

      return {
        id: epic.id,
        summary: epic.summary,
        status: epic.status,
        totalChildren,
        doneChildren,
        completionPct,
        stories: stories.map((s) => ({
          id: s.id,
          summary: s.summary,
          status: s.status,
        })),
      };
    });
  }

  private computeSprintTimeline(items: PlanItemV2[]): SprintTimelineEntry[] {
    const sprints = new Map<string, { done: number; total: number }>();
    for (const item of items) {
      const sprint = item.sprint;
      if (!sprint) { continue; }
      if (!sprints.has(sprint)) {
        sprints.set(sprint, { done: 0, total: 0 });
      }
      const entry = sprints.get(sprint)!;
      entry.total++;
      if (item.status === 'DONE') {
        entry.done++;
      }
    }

    const sorted = Array.from(sprints.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const grandTotal = items.length;
    let cumDone = 0;
    let cumTotal = 0;

    return sorted.map(([sprint, v], idx) => {
      cumDone += v.done;
      cumTotal += v.total;
      const target = Math.round((grandTotal / Math.max(sorted.length, 1)) * (idx + 1));
      return { sprint, cumDone, cumTotal, target };
    });
  }

  private computeCompliance(items: PlanItemV2[]): ComplianceItem[] {
    // Only stories and tasks that have acceptance criteria are compliance-relevant
    return items
      .filter((i) => i.type === 'story' || i.type === 'task')
      .map((item) => ({
        id: item.id,
        summary: item.summary,
        hasAcceptanceCriteria: !!item.acceptanceCriteria,
        status: item.status,
        pass: item.status === 'DONE' && !!item.acceptanceCriteria,
      }));
  }

  // -----------------------------------------------------------------------
  // Mermaid diagram (AICC-0281)
  // -----------------------------------------------------------------------

  private buildMermaidDiagram(epicSummaries: EpicSummary[]): string {
    const lines: string[] = ['graph LR'];

    for (const epic of epicSummaries) {
      const epicNodeId = this.sanitizeMermaidId(epic.id);
      const epicColor = this.statusColor(epic.status);
      lines.push(`  ${epicNodeId}["${this.escapeMermaid(epic.summary)}"]`);
      lines.push(`  style ${epicNodeId} fill:${epicColor},color:#fff`);

      for (const story of epic.stories) {
        const storyNodeId = this.sanitizeMermaidId(story.id);
        const storyColor = this.statusColor(story.status);
        lines.push(`  ${storyNodeId}["${this.escapeMermaid(story.summary)}"]`);
        lines.push(`  style ${storyNodeId} fill:${storyColor},color:#fff`);
        lines.push(`  ${epicNodeId} --> ${storyNodeId}`);
      }
    }

    return lines.join('\n');
  }

  private sanitizeMermaidId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, '_');
  }

  private escapeMermaid(text: string): string {
    return text.replace(/"/g, "'").replace(/[[\]]/g, '');
  }

  private statusColor(status: string): string {
    switch (status) {
      case 'DONE':
        return '#27ae60';
      case 'IN-PROGRESS':
        return '#2980b9';
      case 'REVIEW':
        return '#8e44ad';
      case 'BLOCKED':
        return '#c0392b';
      case 'READY':
        return '#f39c12';
      default:
        return '#7f8c8d';
    }
  }

  // -----------------------------------------------------------------------
  // HTML rendering
  // -----------------------------------------------------------------------

  /**
   * Render the complete dashboard HTML string.
   */
  private renderHtml(data: DashboardData, planDoc: PlanDocument | PlanDocumentV2): string {
    const mermaidDiagram = this.buildMermaidDiagram(data.epicSummaries);
    // Attach items for the plan table (client-side JS reads DATA.__items)
    const dataWithItems = { ...data, __items: this.getItemsForTable(planDoc) };
    const dataJson = JSON.stringify(dataWithItems);

    return /* html */ `<!DOCTYPE html>
<html lang="en" data-bs-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.projectName} — PROGRESS Dashboard</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css"
        rel="stylesheet"
        integrity="sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN"
        crossorigin="anonymous">
  <style>
    :root {
      --bg-primary: #1a1a2e;
      --bg-card: #16213e;
      --text-primary: #eee;
      --accent: #0f3460;
    }
    body {
      background: var(--bg-primary);
      color: var(--text-primary);
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    }
    .card {
      background: var(--bg-card);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px;
    }
    .card-title { font-size: .85rem; text-transform: uppercase; opacity: .7; }
    .card-value { font-size: 2rem; font-weight: 700; }
    .stat-done   { color: #27ae60; }
    .stat-wip    { color: #2980b9; }
    .stat-backlog{ color: #7f8c8d; }
    .stat-blocked{ color: #c0392b; }
    .nav-tabs .nav-link {
      color: rgba(255,255,255,.6);
      border: none;
      border-bottom: 2px solid transparent;
      border-radius: 0;
    }
    .nav-tabs .nav-link.active {
      color: #fff;
      background: transparent;
      border-bottom-color: #0d6efd;
    }
    .table { color: var(--text-primary); }
    .badge-done       { background: #27ae60; }
    .badge-inprogress { background: #2980b9; }
    .badge-backlog    { background: #7f8c8d; }
    .badge-blocked    { background: #c0392b; }
    .badge-review     { background: #8e44ad; }
    .badge-ready      { background: #f39c12; }
    .badge-skip       { background: #95a5a6; }
    canvas { max-height: 360px; }
    .mermaid { text-align: center; overflow-x: auto; }
    .progress-bar-animated {
      animation: progress-bar-stripes 1s linear infinite;
    }
    footer { opacity: .5; font-size: .8rem; }
  </style>
</head>
<body>
  <div class="container-fluid py-4 px-4">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-0">${data.projectName} ${data.projectCode ? '(' + data.projectCode + ')' : ''}</h1>
        <small class="text-muted">Schema v${data.schemaVersion} &bull; Generated ${new Date(data.generatedAt).toLocaleString()}</small>
      </div>
      <span class="badge bg-secondary">${data.totalItems} items</span>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-tabs mb-4" role="tablist">
      <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#tab-overview">Overview</a></li>
      <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-plan">Plan</a></li>
      <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-timeline">Timeline</a></li>
      <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-arch">Architecture</a></li>
      <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#tab-compliance">Compliance</a></li>
    </ul>

    <div class="tab-content">
      <!-- ==================== OVERVIEW ==================== -->
      <div class="tab-pane fade show active" id="tab-overview">
        <!-- Stats cards -->
        <div class="row g-3 mb-4">
          ${this.renderStatCard('Done', data.statusCounts.DONE, 'stat-done')}
          ${this.renderStatCard('In Progress', data.statusCounts['IN-PROGRESS'], 'stat-wip')}
          ${this.renderStatCard('Backlog', data.statusCounts.BACKLOG, 'stat-backlog')}
          ${this.renderStatCard('Blocked', data.statusCounts.BLOCKED, 'stat-blocked')}
          ${this.renderStatCard('Review', data.statusCounts.REVIEW, 'stat-wip')}
          ${this.renderStatCard('Ready', data.statusCounts.READY, 'stat-backlog')}
        </div>

        <!-- Charts row -->
        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <div class="card p-3"><canvas id="chartStatus"></canvas></div>
          </div>
          <div class="col-md-4">
            <div class="card p-3"><canvas id="chartVelocity"></canvas></div>
          </div>
          <div class="col-md-4">
            <div class="card p-3"><canvas id="chartPriority"></canvas></div>
          </div>
        </div>

        <!-- Epic progress bars -->
        <div class="card p-3 mb-4">
          <h5>Epic Progress</h5>
          ${data.epicSummaries
            .map(
              (e) => `
          <div class="mb-2">
            <div class="d-flex justify-content-between mb-1">
              <span>${e.id}: ${e.summary}</span>
              <span>${e.completionPct}%</span>
            </div>
            <div class="progress" style="height:8px">
              <div class="progress-bar bg-success" style="width:${e.completionPct}%"></div>
            </div>
          </div>`,
            )
            .join('')}
        </div>
      </div>

      <!-- ==================== PLAN TABLE ==================== -->
      <div class="tab-pane fade" id="tab-plan">
        <div class="card p-3">
          <div class="mb-3 d-flex gap-2">
            <input type="text" id="planSearch" class="form-control form-control-sm" placeholder="Search items…" style="max-width:300px">
            <select id="planFilterType" class="form-select form-select-sm" style="max-width:140px">
              <option value="">All Types</option>
              <option value="epic">Epic</option>
              <option value="story">Story</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
            </select>
            <select id="planFilterStatus" class="form-select form-select-sm" style="max-width:160px">
              <option value="">All Statuses</option>
              <option value="BACKLOG">Backlog</option>
              <option value="READY">Ready</option>
              <option value="IN-PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
              <option value="SKIP">Skip</option>
            </select>
          </div>
          <div class="table-responsive">
            <table class="table table-sm table-hover" id="planTable">
              <thead>
                <tr>
                  <th data-sort="id" style="cursor:pointer">ID ⇅</th>
                  <th data-sort="type" style="cursor:pointer">Type ⇅</th>
                  <th data-sort="summary" style="cursor:pointer">Summary ⇅</th>
                  <th data-sort="status" style="cursor:pointer">Status ⇅</th>
                  <th data-sort="priority" style="cursor:pointer">Priority ⇅</th>
                  <th data-sort="sprint" style="cursor:pointer">Sprint ⇅</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ==================== TIMELINE ==================== -->
      <div class="tab-pane fade" id="tab-timeline">
        <div class="row g-3">
          <div class="col-md-6">
            <div class="card p-3"><canvas id="chartCumulative"></canvas></div>
          </div>
          <div class="col-md-6">
            <div class="card p-3"><canvas id="chartBurndown"></canvas></div>
          </div>
        </div>
      </div>

      <!-- ==================== ARCHITECTURE ==================== -->
      <div class="tab-pane fade" id="tab-arch">
        <div class="card p-3">
          <h5>Epic → Story Dependency Map</h5>
          <pre class="mermaid">
${mermaidDiagram}
          </pre>
        </div>
      </div>

      <!-- ==================== COMPLIANCE ==================== -->
      <div class="tab-pane fade" id="tab-compliance">
        <div class="card p-3">
          <table class="table table-sm table-hover">
            <thead>
              <tr>
                <th>ID</th>
                <th>Summary</th>
                <th>Acceptance Criteria</th>
                <th>Status</th>
                <th>Pass</th>
              </tr>
            </thead>
            <tbody>
              ${data.complianceItems
                .map(
                  (c) => `
              <tr>
                <td>${c.id}</td>
                <td>${c.summary}</td>
                <td>${c.hasAcceptanceCriteria ? '✅ Yes' : '❌ No'}</td>
                <td><span class="badge badge-${this.statusBadgeClass(c.status)}">${c.status}</span></td>
                <td>${c.pass ? '✅' : '—'}</td>
              </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div><!-- /tab-content -->

    <footer class="text-center mt-4">
      AI Command Center &bull; PROGRESS Dashboard &bull; Generated ${new Date().toISOString()}
    </footer>
  </div>

  <!-- CDN Scripts -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
          crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({ startOnLoad: true, theme: 'dark' });
  </script>

  <script>
  // =========================================================================
  // Dashboard data (injected at generation time)
  // =========================================================================
  const DATA = ${dataJson};

  // =========================================================================
  // Chart.js — dark defaults
  // =========================================================================
  Chart.defaults.color = '#ccc';
  Chart.defaults.borderColor = 'rgba(255,255,255,.08)';

  // Status doughnut (AICC-0280)
  new Chart(document.getElementById('chartStatus'), {
    type: 'doughnut',
    data: {
      labels: ['Done','In Progress','Backlog','Blocked','Review','Ready','Skip'],
      datasets: [{
        data: [
          DATA.statusCounts.DONE,
          DATA.statusCounts['IN-PROGRESS'],
          DATA.statusCounts.BACKLOG,
          DATA.statusCounts.BLOCKED,
          DATA.statusCounts.REVIEW,
          DATA.statusCounts.READY,
          DATA.statusCounts.SKIP
        ],
        backgroundColor: ['#27ae60','#2980b9','#7f8c8d','#c0392b','#8e44ad','#f39c12','#95a5a6']
      }]
    },
    options: { plugins: { title: { display: true, text: 'Status Distribution' } } }
  });

  // Velocity bar chart (AICC-0280)
  new Chart(document.getElementById('chartVelocity'), {
    type: 'bar',
    data: {
      labels: DATA.velocityByBatch.map(v => v.name),
      datasets: [
        { label: 'Done', data: DATA.velocityByBatch.map(v => v.done), backgroundColor: '#27ae60' },
        { label: 'Total', data: DATA.velocityByBatch.map(v => v.total), backgroundColor: 'rgba(255,255,255,.15)' }
      ]
    },
    options: {
      plugins: { title: { display: true, text: 'Velocity by Sprint' } },
      scales: { y: { beginAtZero: true } }
    }
  });

  // Priority pie chart (AICC-0280)
  const prioLabels = Object.keys(DATA.priorityDistribution);
  const prioColors = { critical:'#c0392b', high:'#e67e22', medium:'#f39c12', low:'#27ae60' };
  new Chart(document.getElementById('chartPriority'), {
    type: 'pie',
    data: {
      labels: prioLabels,
      datasets: [{
        data: prioLabels.map(l => DATA.priorityDistribution[l]),
        backgroundColor: prioLabels.map(l => prioColors[l] || '#7f8c8d')
      }]
    },
    options: { plugins: { title: { display: true, text: 'Priority Distribution' } } }
  });

  // Cumulative progress line chart (AICC-0280)
  if (DATA.sprintTimeline.length > 0) {
    new Chart(document.getElementById('chartCumulative'), {
      type: 'line',
      data: {
        labels: DATA.sprintTimeline.map(s => s.sprint),
        datasets: [
          {
            label: 'Cumulative Done',
            data: DATA.sprintTimeline.map(s => s.cumDone),
            borderColor: '#27ae60',
            fill: false, tension: .3
          },
          {
            label: 'Target',
            data: DATA.sprintTimeline.map(s => s.target),
            borderColor: 'rgba(255,255,255,.3)',
            borderDash: [5,5],
            fill: false, tension: .3
          }
        ]
      },
      options: {
        plugins: { title: { display: true, text: 'Cumulative Progress' } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // Burn-down chart (AICC-0280)
  if (DATA.sprintTimeline.length > 0) {
    const totalItems = DATA.totalItems;
    new Chart(document.getElementById('chartBurndown'), {
      type: 'line',
      data: {
        labels: DATA.sprintTimeline.map(s => s.sprint),
        datasets: [
          {
            label: 'Remaining',
            data: DATA.sprintTimeline.map(s => totalItems - s.cumDone),
            borderColor: '#e74c3c',
            fill: true,
            backgroundColor: 'rgba(231,76,60,.15)',
            tension: .3
          },
          {
            label: 'Ideal Burn-down',
            data: DATA.sprintTimeline.map((s,i,arr) =>
              Math.round(totalItems - (totalItems / arr.length) * (i + 1))
            ),
            borderColor: 'rgba(255,255,255,.3)',
            borderDash: [5,5],
            fill: false, tension: .3
          }
        ]
      },
      options: {
        plugins: { title: { display: true, text: 'Sprint Burn-down' } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // =========================================================================
  // Plan table with sorting & filtering
  // =========================================================================
  const ALL_ITEMS = DATA.__items || [];

  let sortCol = 'id';
  let sortDir = 1;

  function statusBadge(s) {
    const cls = {
      DONE:'badge-done','IN-PROGRESS':'badge-inprogress',BACKLOG:'badge-backlog',
      BLOCKED:'badge-blocked',REVIEW:'badge-review',READY:'badge-ready',SKIP:'badge-skip'
    };
    return '<span class="badge '+(cls[s]||'bg-secondary')+'">'+s+'</span>';
  }

  function renderTable() {
    const search = (document.getElementById('planSearch').value || '').toLowerCase();
    const fType = document.getElementById('planFilterType').value;
    const fStatus = document.getElementById('planFilterStatus').value;

    let rows = ALL_ITEMS.filter(r => {
      if (fType && r.type !== fType) return false;
      if (fStatus && r.status !== fStatus) return false;
      if (search && !r.summary.toLowerCase().includes(search) && !r.id.toLowerCase().includes(search)) return false;
      return true;
    });

    rows.sort((a,b) => {
      const va = (a[sortCol]||'').toString();
      const vb = (b[sortCol]||'').toString();
      return va.localeCompare(vb) * sortDir;
    });

    const tbody = document.querySelector('#planTable tbody');
    tbody.innerHTML = rows.map(r =>
      '<tr>' +
        '<td>'+r.id+'</td>' +
        '<td>'+r.type+'</td>' +
        '<td>'+r.summary+'</td>' +
        '<td>'+statusBadge(r.status)+'</td>' +
        '<td>'+(r.priority||'—')+'</td>' +
        '<td>'+(r.sprint||'—')+'</td>' +
        '<td>'+(r.storyPoints!=null?r.storyPoints:'—')+'</td>' +
      '</tr>'
    ).join('');
  }

  document.querySelectorAll('#planTable th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (sortCol === col) { sortDir *= -1; } else { sortCol = col; sortDir = 1; }
      renderTable();
    });
  });

  document.getElementById('planSearch')?.addEventListener('input', renderTable);
  document.getElementById('planFilterType')?.addEventListener('change', renderTable);
  document.getElementById('planFilterStatus')?.addEventListener('change', renderTable);

  renderTable();
  </script>
</body>
</html>`;
  }

  // -----------------------------------------------------------------------
  // Small rendering helpers
  // -----------------------------------------------------------------------

  private renderStatCard(label: string, value: number, cssClass: string): string {
    return `
          <div class="col-md-2 col-sm-4">
            <div class="card p-3 text-center">
              <div class="card-title">${label}</div>
              <div class="card-value ${cssClass}">${value}</div>
            </div>
          </div>`;
  }

  private statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      DONE: 'done',
      'IN-PROGRESS': 'inprogress',
      BACKLOG: 'backlog',
      BLOCKED: 'blocked',
      REVIEW: 'review',
      READY: 'ready',
      SKIP: 'skip',
    };
    return map[status] || 'secondary';
  }

  /**
   * Extract a simplified item list for the plan table.
   */
  private getItemsForTable(
    planDoc: PlanDocument | PlanDocumentV2,
  ): Array<{ id: string; type: string; summary: string; status: string; priority: string; sprint: string; storyPoints: number | null }> {
    const doc = this.compat.normalize(planDoc);
    return doc.items.map((item) => ({
      id: item.id,
      type: item.type,
      summary: item.summary,
      status: item.status,
      priority: item.priority || 'medium',
      sprint: item.sprint || '',
      storyPoints: item.storyPoints ?? null,
    }));
  }
}
