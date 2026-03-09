// ============================================================
// Constants
// ============================================================
const LABEL_W = 220;
const HEADER_H = 40;
const GROUP_H = 34;
const TASK_H = 30;
const BAR_MARGIN = 5;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ZOOM_LEVELS = [
  { label: 'Year',    days: null },
  { label: 'Quarter', days: 91  },
  { label: 'Month',   days: 30  },
  { label: 'Week',    days: 7   },
];

function getColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

const TEMPLATES = [
  {
    id: 'software-launch',
    name: 'Software Launch',
    icon: '🚀',
    description: '5-phase product launch: discovery, design, dev, QA, and release.',
    defaultTitle: 'Product Launch',
    durationWeeks: 16,
    groups: [
      { name: 'Discovery', color: '#8b5cf6', tasks: [
        { name: 'User research', startWeek: 0, endWeek: 2 },
        { name: 'Competitor analysis', startWeek: 0, endWeek: 2 },
        { name: 'Requirements doc', startWeek: 2, endWeek: 4 },
      ]},
      { name: 'Design', color: '#ec4899', tasks: [
        { name: 'Wireframes', startWeek: 3, endWeek: 5 },
        { name: 'UI design', startWeek: 5, endWeek: 7 },
        { name: 'Design review', startWeek: 7, endWeek: 8 },
      ]},
      { name: 'Development', color: '#2563eb', tasks: [
        { name: 'Backend API', startWeek: 7, endWeek: 12 },
        { name: 'Frontend', startWeek: 8, endWeek: 13 },
        { name: 'Integration', startWeek: 12, endWeek: 14 },
      ]},
      { name: 'QA & Testing', color: '#f59e0b', tasks: [
        { name: 'Test plan', startWeek: 12, endWeek: 13 },
        { name: 'QA testing', startWeek: 13, endWeek: 15 },
        { name: 'Bug fixes', startWeek: 14, endWeek: 16 },
      ]},
      { name: 'Launch', color: '#16a34a', tasks: [
        { name: 'Staging deploy', startWeek: 15, endWeek: 16 },
        { name: 'Production release', startWeek: 16, endWeek: 16 },
      ]},
    ],
  },
  {
    id: 'security-roadmap',
    name: 'Security Roadmap',
    icon: '🔒',
    description: 'Assess, remediate, and harden: vulnerability management through to compliance.',
    defaultTitle: 'Security Roadmap',
    durationWeeks: 24,
    groups: [
      { name: 'Assessment', color: '#dc2626', tasks: [
        { name: 'Asset inventory', startWeek: 0, endWeek: 2 },
        { name: 'Threat modelling', startWeek: 1, endWeek: 3 },
        { name: 'Penetration test', startWeek: 2, endWeek: 5 },
        { name: 'Risk register', startWeek: 4, endWeek: 6 },
      ]},
      { name: 'Remediation', color: '#f59e0b', tasks: [
        { name: 'Patch critical CVEs', startWeek: 5, endWeek: 8 },
        { name: 'Secrets rotation', startWeek: 6, endWeek: 8 },
        { name: 'Fix high-severity findings', startWeek: 7, endWeek: 12 },
      ]},
      { name: 'Hardening', color: '#2563eb', tasks: [
        { name: 'MFA rollout', startWeek: 8, endWeek: 10 },
        { name: 'Network segmentation', startWeek: 9, endWeek: 14 },
        { name: 'SIEM / logging setup', startWeek: 10, endWeek: 14 },
        { name: 'Endpoint protection', startWeek: 12, endWeek: 16 },
      ]},
      { name: 'Compliance', color: '#16a34a', tasks: [
        { name: 'Policy & procedure docs', startWeek: 14, endWeek: 18 },
        { name: 'Security training', startWeek: 16, endWeek: 20 },
        { name: 'Audit preparation', startWeek: 18, endWeek: 22 },
        { name: 'Certification audit', startWeek: 22, endWeek: 24 },
      ]},
    ],
  },
  {
    id: 'marketing-campaign',
    name: 'Marketing Campaign',
    icon: '📣',
    description: 'End-to-end campaign: research, creative, launch, and analysis.',
    defaultTitle: 'Campaign Roadmap',
    durationWeeks: 10,
    groups: [
      { name: 'Research', color: '#8b5cf6', tasks: [
        { name: 'Audience research', startWeek: 0, endWeek: 2 },
        { name: 'Competitive audit', startWeek: 0, endWeek: 2 },
        { name: 'Brief & strategy', startWeek: 2, endWeek: 3 },
      ]},
      { name: 'Creative', color: '#ec4899', tasks: [
        { name: 'Copywriting', startWeek: 3, endWeek: 5 },
        { name: 'Visual assets', startWeek: 3, endWeek: 6 },
        { name: 'Creative review', startWeek: 6, endWeek: 7 },
      ]},
      { name: 'Launch', color: '#f59e0b', tasks: [
        { name: 'Channel setup', startWeek: 6, endWeek: 7 },
        { name: 'Campaign goes live', startWeek: 7, endWeek: 7 },
        { name: 'Paid media run', startWeek: 7, endWeek: 9 },
      ]},
      { name: 'Analysis', color: '#16a34a', tasks: [
        { name: 'Performance report', startWeek: 9, endWeek: 10 },
        { name: 'Learnings & recommendations', startWeek: 10, endWeek: 10 },
      ]},
    ],
  },
];

// ============================================================
// State
// ============================================================
const STORAGE_KEY = 'roadmap_v1';
let state = null;  // Roadmap object from API
let undoStack = [];
let redoStack = [];
let zoomLevel = 0;    // index into ZOOM_LEVELS; 0 = Year (default)
let dayW = 0;         // pixels per day (module-level, set in renderSVG)
let timeStart = null; // Date object (module-level, set in renderSVG)
let barPos = {};      // tid/gid → { x, y, w, h, midY } for dependency arrows
let groupYPos = [];   // [{gid, y, h}] for drag-to-reorder
let taskYPos = [];    // [{tid, gid, y, h}] for task reorder drag hit detection
let reorderIndicator = null; // <line> shown during group/task reorder drag
let _hoverTid = null;
let _hidePopupTimer = null;
let selectedTid = null;
let filterState = { assignee: '', tag: '', overdueOnly: false, hideCompleted: false };
let swimlaneMode = false;
let urlState = null;   // deep copy of state loaded from ?url=, for revert
let isReadOnly = false;
let sourceUrl = null;  // original ?url= value, persisted for the link icon
let isFromUrl = false; // true only in the session where ?url= was present (not persisted)
let swimlaneCollapsed = new Set();

// ============================================================
// Date utilities
// ============================================================
function parseDate(s) { return new Date(s + 'T00:00:00'); }
function formatDateRange(start, end) {
  const fmt = s => parseDate(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}
function daysDiff(a, b) { return Math.round((b - a) / 86400000); }
function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }
// Expand "MM/YYYY" shorthand to a full YYYY-MM-DD date.
// isEnd=true → last day of month; isEnd=false → first day.
function normalizeDate(str, isEnd = false) {
  const m = str.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return str.trim();
  const month = m[1].padStart(2, '0');
  const year  = m[2];
  if (isEnd) {
    const last = new Date(parseInt(year), parseInt(m[1]), 0).getDate();
    return `${year}-${month}-${String(last).padStart(2, '0')}`;
  }
  return `${year}-${month}-01`;
}
function tagColor(tag) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) % 360;
  return `hsl(${h}, 65%, 48%)`;
}
function isOverdue(t) {
  return parseDate(t.end) < today() && (t.progress ?? 0) < 100;
}

function getAssignees() {
  return [...new Set(state.groups.flatMap(g => g.tasks.map(t => t.assignee).filter(Boolean)))].sort();
}

function getTags() {
  return [...new Set(state.groups.flatMap(g => g.tasks.flatMap(t => t.tags)))].sort();
}

function isTaskVisible(t) {
  if (filterState.hideCompleted && (t.progress ?? 0) >= 100) return false;
  if (filterState.overdueOnly && !isOverdue(t)) return false;
  if (filterState.assignee && t.assignee !== filterState.assignee) return false;
  if (filterState.tag && !t.tags.includes(filterState.tag)) return false;
  return true;
}

function assigneeColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h}, 50%, 45%)`;
}

function buildSwimlaneGroups() {
  const map = new Map();
  for (const g of state.groups) {
    for (const t of g.tasks) {
      if (!isTaskVisible(t)) continue;
      const key = t.assignee || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
  }
  const result = [];
  if (map.has('')) {
    const id = '__unassigned__';
    result.push({ id, name: 'Unassigned', color: '#9ca3af', collapsed: swimlaneCollapsed.has(id), tasks: map.get(''), depends_on: [] });
  }
  for (const [key, tasks] of [...map.entries()].filter(([k]) => k).sort()) {
    const id = `__swimlane_${key}__`;
    result.push({ id, name: key, color: assigneeColor(key), collapsed: swimlaneCollapsed.has(id), tasks, depends_on: [] });
  }
  return result;
}

// ============================================================
// localStorage helpers
// ============================================================
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function _slug(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const hex = Math.random().toString(16).slice(2, 8);
  return `${base}_${hex}`;
}

function mutate(fn) {
  undoStack.push(JSON.parse(JSON.stringify(state)));
  redoStack.length = 0;
  fn();
  saveState();
  render();
}

// ============================================================
// API (import/export only)
// ============================================================
async function api(method, path, body, contentType = 'application/json') {
  const res = await fetch('api' + path, {
    method,
    headers: body ? {'Content-Type': contentType} : {},
    body: body ? (contentType === 'application/json' ? JSON.stringify(body) : body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

function scrollToToday() {
  const tod = today();
  if (!timeStart || !dayW) return;
  const tx = LABEL_W + daysDiff(timeStart, tod) * dayW;
  const container = document.querySelector('.chart-container');
  container.scrollLeft = tx - container.clientWidth / 2;
}

let _firstLoad = true;
async function loadRoadmap() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    state = JSON.parse(stored);
  }
  const storedUrlState = localStorage.getItem('roadmap_url_state_v1');
  if (storedUrlState) urlState = JSON.parse(storedUrlState);
  if (localStorage.getItem('roadmap_readonly_v1') === 'true') isReadOnly = true;
  const storedSourceUrl = localStorage.getItem('roadmap_source_url_v1');
  if (storedSourceUrl) sourceUrl = storedSourceUrl;
  // isFromUrl intentionally not restored — badge only shows on direct ?url= load
  render();
  updateReadOnlyUI();
  if (_firstLoad) { _firstLoad = false; scrollToToday(); }
}

// ============================================================
// SVG helpers
// ============================================================
function svgEl(tag, attrs = {}, text = null) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text !== null) el.textContent = text;
  return el;
}

// ============================================================
// Rendering
// ============================================================
function render() {
  document.getElementById('empty-state').classList.toggle('hidden', !!state);
  if (!state) return;
  document.getElementById('roadmap-title').textContent = state.title;
  renderLegend();
  renderFilterBar();
  renderSVG();
  updateReadOnlyUI();
}

function renderFilterBar() {
  const bar = document.getElementById('filter-bar');
  bar.classList.toggle('hidden', !state);
  if (!state) return;

  const assignees = getAssignees();
  const tags = getTags();

  const assigneeSelect = document.getElementById('filter-assignee');
  assigneeSelect.innerHTML = '<option value="">All assignees</option>' +
    assignees.map(a => `<option value="${a}"${a === filterState.assignee ? ' selected' : ''}>${a}</option>`).join('');

  const tagSelect = document.getElementById('filter-tag');
  tagSelect.innerHTML = '<option value="">All tags</option>' +
    tags.map(t => `<option value="${t}"${t === filterState.tag ? ' selected' : ''}>${t}</option>`).join('');

  document.getElementById('filter-overdue').classList.toggle('active', filterState.overdueOnly);
  document.getElementById('filter-completed').classList.toggle('active', filterState.hideCompleted);

  const hasFilter = filterState.assignee || filterState.tag || filterState.overdueOnly || filterState.hideCompleted;
  document.getElementById('filter-clear').classList.toggle('hidden', !hasFilter);
  document.getElementById('btn-swimlane').classList.toggle('active', swimlaneMode);
  const anyExpanded = !swimlaneMode && state.groups.some(g => !g.collapsed);
  const anyCollapsed = !swimlaneMode && state.groups.some(g => g.collapsed);
  document.getElementById('btn-collapse-all').classList.toggle('hidden', !anyExpanded);
  document.getElementById('btn-expand-all').classList.toggle('hidden', !anyCollapsed);
}

function renderLegend() {
  const el = document.getElementById('legend');
  el.innerHTML = '';
  for (const g of state.groups) {
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${g.color}"></span><span>${g.name}</span>`;
    el.appendChild(item);
  }
}

function renderSVG() {
  const svg = document.getElementById('roadmap-svg');
  svg.innerHTML = '';

  const containerW = Math.max(svg.parentElement.clientWidth - 40, 900);
  timeStart = parseDate(state.start);
  const timeEnd   = parseDate(state.end);
  const totalDays = daysDiff(timeStart, timeEnd);
  const targetDays = ZOOM_LEVELS[zoomLevel].days ?? totalDays;
  dayW = (containerW - LABEL_W) / targetDays;
  const svgW = LABEL_W + totalDays * dayW;

  // Compute total height
  const groups = swimlaneMode ? buildSwimlaneGroups() : state.groups;
  let totalH = HEADER_H;
  for (const g of groups) {
    totalH += GROUP_H;
    if (!g.collapsed) {
      const visibleTasks = swimlaneMode ? g.tasks : g.tasks.filter(isTaskVisible);
      totalH += visibleTasks.length * TASK_H;
    }
  }
  if (!swimlaneMode) totalH += GROUP_H + 10; // "+ Add group" row

  svg.setAttribute('width', svgW);
  svg.setAttribute('height', totalH);
  svg.setAttribute('viewBox', `0 0 ${svgW} ${totalH}`);

  // Background
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: svgW, height: totalH, fill: getColor('--bg-surface') }));


  // Month headers
  renderMonthHeaders(svg, timeStart, timeEnd, totalDays, dayW, svgW, totalH);

  // Today pill label (drawn before rows so it sits in the header)
  const tod = today();
  let todayX = null;
  if (tod >= timeStart && tod <= timeEnd) {
    todayX = LABEL_W + daysDiff(timeStart, tod) * dayW;
    const tSize = 7;
    const tY = HEADER_H - 2;
    svg.appendChild(svgEl('polygon', {
      points: `${todayX - tSize},${tY - tSize * 1.4} ${todayX + tSize},${tY - tSize * 1.4} ${todayX},${tY}`,
      fill: '#f87171', opacity: 0.85, 'pointer-events': 'none'
    }));
  }

  // "+ Add group" row (top of label column, only in normal mode)
  let y = HEADER_H;
  if (!swimlaneMode) {
    svg.appendChild(svgEl('rect', { x: 0, y, width: LABEL_W, height: GROUP_H, fill: getColor('--bg-alt') }));
    svg.appendChild(svgEl('line', { x1: 0, y1: y, x2: LABEL_W, y2: y, stroke: getColor('--border'), 'stroke-width': 1 }));
    svg.appendChild(svgEl('text', {
      x: 20, y: y + GROUP_H / 2 + 5,
      fill: getColor('--text-muted'), 'font-size': 13, cursor: 'pointer',
      'data-action': 'add-group',
    }, '+ Add group'));
    y += GROUP_H;
  }

  // Groups and tasks
  barPos = {};
  groupYPos = [];
  taskYPos = [];
  for (const g of groups) {
    const groupStartY = y;
    renderGroup(svg, g, y, svgW);
    y += GROUP_H;
    if (!g.collapsed) {
      for (const t of g.tasks) {
        if (!swimlaneMode && !isTaskVisible(t)) continue;
        taskYPos.push({ tid: t.id, gid: g.id, y, h: TASK_H });
        renderTask(svg, t, g, y, timeStart, dayW, svgW);
        y += TASK_H;
      }
    }
    groupYPos.push({ gid: g.id, y: groupStartY, h: y - groupStartY });
  }

  // Label panel separator
  svg.appendChild(svgEl('line', {
    x1: LABEL_W, y1: HEADER_H, x2: LABEL_W, y2: totalH,
    stroke: getColor('--border'), 'stroke-width': 1
  }));

  // Today line (drawn last so it sits on top of all task rows)
  if (todayX !== null) {
    svg.appendChild(svgEl('line', {
      x1: todayX, y1: HEADER_H, x2: todayX, y2: totalH,
      stroke: '#f87171', 'stroke-width': 1, opacity: 0.5, 'pointer-events': 'none'
    }));
  }

  renderDependencyArrows(svg);
}

function renderMonthHeaders(svg, timeStart, timeEnd, totalDays, dayW, containerW, totalH) {
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: containerW, height: HEADER_H, fill: getColor('--bg-header') }));
  svg.appendChild(svgEl('line', { x1: 0, y1: HEADER_H, x2: containerW, y2: HEADER_H, stroke: getColor('--border-lighter'), 'stroke-width': 1 }));

  let cur = new Date(timeStart);
  cur.setDate(1);

  while (cur <= timeEnd) {
    const monthStart = Math.max(0, daysDiff(timeStart, cur));
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const monthEnd = Math.min(totalDays, daysDiff(timeStart, nextMonth));
    const mW = (monthEnd - monthStart) * dayW;
    const mX = LABEL_W + monthStart * dayW;

    if (mX < containerW && mW > 0) {
      svg.appendChild(svgEl('line', { x1: mX, y1: 0, x2: mX, y2: totalH, stroke: getColor('--border-light'), 'stroke-width': 1 }));
      svg.appendChild(svgEl('text', {
        x: mX + mW / 2, y: HEADER_H / 2 + 5,
        'text-anchor': 'middle', fill: getColor('--text-secondary'),
        'font-size': 12, 'font-weight': '500'
      }, `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`));
    }

    cur = nextMonth;
  }
}

function renderGroup(svg, g, y, containerW) {
  const bg = hexToRgba(g.color, 0.15);
  svg.appendChild(svgEl('rect', { x: 0, y, width: containerW, height: GROUP_H, fill: bg }));
  svg.appendChild(svgEl('line', { x1: 0, y1: y, x2: containerW, y2: y, stroke: getColor('--border'), 'stroke-width': 1 }));

  // Color indicator
  svg.appendChild(svgEl('rect', { x: 0, y, width: 4, height: GROUP_H, fill: g.color }));

  // Drag handle ≡ (hidden in swimlane mode)
  if (!swimlaneMode) svg.appendChild(svgEl('text', {
    x: 8, y: y + GROUP_H / 2 + 5,
    fill: getColor('--text-muted'), 'font-size': 12, 'text-anchor': 'middle', cursor: 'grab',
    'data-action': 'reorder-group', 'data-gid': g.id,
  }, '\u2630'));

  // Compute aggregate progress (duration-weighted) for label
  let groupProgressLabel = '';
  const tasksWithProgress = g.tasks.filter(t => t.progress != null);
  if (tasksWithProgress.length > 0) {
    const totalDays = tasksWithProgress.reduce((s, t) => s + Math.max(1, daysDiff(parseDate(t.start), parseDate(t.end))), 0);
    const avg = Math.round(tasksWithProgress.reduce((s, t) => s + t.progress * Math.max(1, daysDiff(parseDate(t.start), parseDate(t.end))), 0) / totalDays);
    groupProgressLabel = ` (${avg}%)`;
  }

  // Collapse toggle + group name
  const arrow = g.collapsed ? '▶' : '▼';
  // Truncate name to leave room for progress suffix and the edit/+ buttons
  // Available ~19 chars total (145px at ~7.5px/char, 13px bold)
  const maxNameChars = groupProgressLabel ? 19 - groupProgressLabel.length : 19;
  const groupNameLabel = `${arrow} ${truncate(g.name, maxNameChars - 2)}${groupProgressLabel}`;
  svg.appendChild(svgEl('text', {
    x: 20, y: y + GROUP_H / 2 + 5,
    fill: g.color, 'font-size': 13, 'font-weight': '600', cursor: 'pointer',
    'data-action': 'toggle-group', 'data-gid': g.id
  }, groupNameLabel));

  if (!swimlaneMode) {
    // Edit button — \uFE0E forces text (not emoji) rendering of ✎
    svg.appendChild(svgEl('text', {
      x: LABEL_W - 38, y: y + GROUP_H / 2 + 5,
      fill: getColor('--text-secondary'), 'font-size': 13, cursor: 'pointer',
      'text-anchor': 'middle',
      'data-action': 'edit-group', 'data-gid': g.id
    }, '\u270E\uFE0E'));

    // "+ task" button
    svg.appendChild(svgEl('text', {
      x: LABEL_W - 28, y: y + GROUP_H / 2 + 5,
      fill: getColor('--text-muted'), 'font-size': 14, cursor: 'pointer',
      'text-anchor': 'middle',
      'data-action': 'add-task', 'data-gid': g.id
    }, '+'));

    // "◇ milestone" button
    svg.appendChild(svgEl('text', {
      x: LABEL_W - 14, y: y + GROUP_H / 2 + 5,
      'text-anchor': 'middle', fill: g.color, 'font-size': 14,
      cursor: 'pointer', 'font-weight': 'bold',
      'data-action': 'add-milestone', 'data-gid': g.id,
      title: 'Add milestone'
    }, '◇'));
  }

  // Summary bar (collapsed) + barPos for dependency arrows
  if (g.tasks.length > 0) {
    const starts = g.tasks.map(t => parseDate(t.start));
    const ends   = g.tasks.map(t => parseDate(t.end));
    const minStart = new Date(Math.min(...starts));
    const maxEnd   = new Date(Math.max(...ends));
    const gBarX = LABEL_W + daysDiff(timeStart, minStart) * dayW;
    const gBarW = Math.max(daysDiff(minStart, maxEnd) * dayW, 4);
    const gBarH = 8;
    const gBarY = y + (GROUP_H - gBarH) / 2;
    barPos[g.id] = { x: gBarX, y: gBarY, w: gBarW, h: gBarH, midY: gBarY + gBarH / 2 };
    if (g.collapsed) {
      svg.appendChild(svgEl('rect', {
        x: gBarX, y: gBarY, width: gBarW, height: gBarH,
        rx: 3, fill: hexToRgba(g.color, 0.5), 'pointer-events': 'none',
      }));
    }
  }
}

function renderTask(svg, t, g, y, timeStart, dayW, containerW) {
  svg.appendChild(svgEl('rect', { x: 0, y, width: containerW, height: TASK_H, fill: getColor('--bg-alt') }));
  svg.appendChild(svgEl('line', { x1: 0, y1: y + TASK_H, x2: containerW, y2: y + TASK_H, stroke: getColor('--row-divider'), 'stroke-width': 1 }));

  // Drag handle ≡ for task reorder
  svg.appendChild(svgEl('text', {
    x: 6, y: y + TASK_H / 2 + 4,
    fill: getColor('--text-muted2'), 'font-size': 10, 'text-anchor': 'middle', cursor: 'grab',
    'data-action': 'reorder-task', 'data-tid': t.id, 'data-gid': g.id,
  }, '\u2630'));

  // Task name label (left panel)
  svg.appendChild(svgEl('text', {
    x: 16, y: y + TASK_H / 2 + 4,
    fill: getColor('--text-strong'), 'font-size': 12, cursor: 'pointer',
    'data-action': 'edit-task', 'data-tid': t.id
  }, truncate(t.name, 26)));

  const isMilestone = t.start === t.end;

  if (isMilestone) {
    const cx = LABEL_W + daysDiff(timeStart, parseDate(t.start)) * dayW;
    const cy = y + TASK_H / 2;
    const R = 9;
    svg.appendChild(svgEl('polygon', {
      points: `${cx},${cy-R} ${cx+R},${cy} ${cx},${cy+R} ${cx-R},${cy}`,
      fill: g.color, opacity: 0.9, cursor: 'pointer',
      'data-action': 'edit-task', 'data-tid': t.id, 'data-milestone': '1'
    }));
    if (t.id === selectedTid) {
      const SR = R + 4;
      svg.appendChild(svgEl('polygon', {
        points: `${cx},${cy-SR} ${cx+SR},${cy} ${cx},${cy+SR} ${cx-SR},${cy}`,
        fill: 'none', stroke: '#2563eb', 'stroke-width': 2, 'pointer-events': 'none'
      }));
    }
    barPos[t.id] = { x: cx, y: cy - R, w: 0, h: R * 2, midY: cy };
    svg.appendChild(svgEl('text', {
      x: cx + R + 6, y: cy + 4,
      fill: getColor('--text-strong'), 'font-size': 12, 'font-weight': '500',
      'pointer-events': 'none'
    }, truncate(t.name, 28)));
    return;
  }

  // Bar
  const barX = LABEL_W + daysDiff(timeStart, parseDate(t.start)) * dayW;
  const barW = Math.max(daysDiff(parseDate(t.start), parseDate(t.end)) * dayW, 4);
  const barY = y + BAR_MARGIN;
  const barH = TASK_H - 2 * BAR_MARGIN;

  svg.appendChild(svgEl('rect', {
    x: barX, y: barY, width: barW, height: barH,
    rx: 4, fill: g.color, opacity: 0.85, cursor: 'pointer',
    'data-action': 'edit-task', 'data-tid': t.id
  }));

  // Progress overlay
  if (t.progress != null && t.progress < 100) {
    const unfilledW = barW * (1 - t.progress / 100);
    svg.appendChild(svgEl('rect', {
      x: barX + barW - unfilledW, y: barY, width: unfilledW, height: barH,
      rx: 0, fill: '#fff', opacity: 0.4, 'pointer-events': 'none'
    }));
  }

  // Bar label
  if (barW > 30) {
    svg.appendChild(svgEl('text', {
      x: barX + 6, y: barY + barH / 2 + 4,
      fill: '#fff', 'font-size': 11, 'pointer-events': 'none',
      'data-tid': t.id
    }, truncate(t.name, Math.floor(barW / 7))));
  }

  // Assignee initials
  if (t.assignee && barW > 50) {
    const initials = t.assignee.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('');
    svg.appendChild(svgEl('text', {
      x: barX + barW - 5, y: barY + barH / 2 + 4,
      fill: '#fff', 'font-size': 10, 'text-anchor': 'end', 'pointer-events': 'none', opacity: 0.85
    }, initials));
  }

  // Tag squares (left of assignee, right side of bar)
  const tags = t.tags || [];
  if (tags.length > 0 && barW > 20) {
    const SQ = 10, GAP = 4;
    const assigneeW = (t.assignee && barW > 50) ? 22 : 6;
    const rightEdge = barX + barW - assigneeW;
    tags.forEach((tag, i) => {
      const sqX = rightEdge - (i + 1) * (SQ + GAP) + GAP;
      if (sqX < barX + 4) return; // skip if no room
      svg.appendChild(svgEl('rect', {
        x: sqX, y: barY + (barH - SQ) / 2,
        width: SQ, height: SQ, rx: 2,
        fill: tagColor(tag), 'pointer-events': 'none'
      }));
    });
  }

  // Resize handles (transparent hit targets at left/right edges)
  const EDGE_W = 8;
  svg.appendChild(svgEl('rect', {
    x: barX, y: barY, width: EDGE_W, height: barH,
    fill: 'transparent', cursor: 'ew-resize',
    'data-action': 'resize-task', 'data-tid': t.id, 'data-edge': 'left'
  }));
  svg.appendChild(svgEl('rect', {
    x: barX + barW - EDGE_W, y: barY, width: EDGE_W, height: barH,
    fill: 'transparent', cursor: 'ew-resize',
    'data-action': 'resize-task', 'data-tid': t.id, 'data-edge': 'right'
  }));

  barPos[t.id] = { x: barX, y: barY, w: barW, h: barH, midY: barY + barH / 2 };

  // Overdue inset border
  if (isOverdue(t)) {
    svg.appendChild(svgEl('rect', {
      x: barX + 1, y: barY + 1, width: barW - 2, height: barH - 2,
      rx: 3, fill: 'none', stroke: '#dc2626', 'stroke-width': 2, 'pointer-events': 'none'
    }));
  }

  if (t.id === selectedTid) {
    svg.appendChild(svgEl('rect', {
      x: barX - 2, y: barY - 2, width: barW + 4, height: barH + 4,
      rx: 6, fill: 'none', stroke: '#2563eb', 'stroke-width': 2, 'pointer-events': 'none'
    }));
  }
}

function findGroupForTask(tid) {
  for (const g of state.groups)
    for (const t of g.tasks)
      if (t.id === tid) return g;
  return null;
}

function renderDependencyArrows(svg) {
  const defs = svgEl('defs', {});
  for (const [id, color] of [['dep-arrow', '#94a3b8'], ['dep-arrow-warn', '#f59e0b']]) {
    const marker = svgEl('marker', {
      id, markerWidth: '8', markerHeight: '8',
      refX: '6', refY: '3', orient: 'auto', markerUnits: 'userSpaceOnUse',
    });
    marker.appendChild(svgEl('polygon', { points: '0,0 6,3 0,6', fill: color }));
    defs.appendChild(marker);
  }
  svg.appendChild(defs);

  const pairs = [];
  for (const g of state.groups) {
    for (const t of g.tasks)
      for (const depId of (t.depends_on || []))
        pairs.push({ fromId: depId, toId: t.id });
    for (const depId of (g.depends_on || []))
      pairs.push({ fromId: depId, toId: g.id });
  }

  for (const { fromId, toId } of pairs) {
    const from = barPos[fromId] ?? barPos[findGroupForTask(fromId)?.id];
    const to   = barPos[toId]   ?? barPos[findGroupForTask(toId)?.id];
    if (!from || !to) continue;

    const fromTask = findTask(fromId);
    const toTask   = findTask(toId);
    const isViolation = fromTask && toTask &&
      parseDate(toTask.start) < parseDate(fromTask.end);
    const stroke = isViolation ? '#f59e0b' : '#94a3b8';
    const markerId = isViolation ? 'dep-arrow-warn' : 'dep-arrow';

    // Tasks are "touching" when the gap between end and start is 0 or 1 day
    const isAdjacent = fromTask && toTask &&
      daysDiff(parseDate(fromTask.end), parseDate(toTask.start)) <= 1;

    const x2 = to.x, y2 = to.midY;
    let d;
    if (to.x < from.x + from.w) {
      const dropX = Math.max(from.x, to.x - 10);
      d = `M ${dropX} ${from.y + from.h} L ${dropX} ${y2} L ${x2} ${y2}`;
    } else {
      const x1 = from.x + from.w, y1 = from.midY;
      if (Math.abs(y1 - y2) < 2) {
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else if (!isAdjacent && x2 - x1 >= 32) {
        // Enough horizontal room and not touching — standard S-curve
        const midX = x1 + (x2 - x1) / 2;
        d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
      } else {
        // Adjacent or nearly adjacent — hook left at the bottom so the final
        // segment always approaches the target bar rightward (correct arrowhead)
        const hookX = x1 - 12;
        d = `M ${x1} ${from.y + from.h} L ${hookX} ${from.y + from.h} L ${hookX} ${y2} L ${x2} ${y2}`;
      }
    }
    svg.appendChild(svgEl('path', {
      d, stroke, 'stroke-width': isViolation ? '2' : '1.5', fill: 'none',
      'marker-end': `url(#${markerId})`, 'pointer-events': 'none',
      'data-dep': `${fromId}:${toId}`,
    }));
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function truncate(s, n) { return s.length <= n ? s : s.slice(0, n - 1) + '…'; }

// ============================================================
// Undo / Redo
// ============================================================
function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.parse(JSON.stringify(state)));
  state = undoStack.pop();
  saveState();
  render();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.parse(JSON.stringify(state)));
  state = redoStack.pop();
  saveState();
  render();
}

// ============================================================
// Drag state
// ============================================================
let dragState = null;

function findTask(tid) {
  for (const g of state.groups)
    for (const t of g.tasks)
      if (t.id === tid) return t;
}

// Returns Set of task IDs that transitively depend on tid (downstream)
function getDownstream(tid) {
  const result = new Set();
  const queue = [tid];
  while (queue.length) {
    const id = queue.shift();
    for (const g of state.groups)
      for (const t of g.tasks)
        if ((t.depends_on || []).includes(id) && !result.has(t.id)) {
          result.add(t.id);
          queue.push(t.id);
        }
  }
  return result;
}

// Returns Set of task IDs that tid transitively depends on (upstream)
function getUpstream(tid) {
  const result = new Set();
  const queue = [tid];
  while (queue.length) {
    const id = queue.shift();
    const t = findTask(id);
    for (const depId of (t?.depends_on || []))
      if (!result.has(depId)) { result.add(depId); queue.push(depId); }
  }
  return result;
}

// Would adding "taskId depends_on depId" create a cycle?
function wouldCreateCycle(depId, taskId) {
  if (depId === taskId) return true;
  return getDownstream(taskId).has(depId);
}

function isModalOpen() {
  return !document.getElementById('modal-overlay').classList.contains('hidden');
}

function getVisibleTaskIds() {
  const ids = [];
  for (const g of state.groups)
    if (!g.collapsed)
      for (const t of g.tasks) ids.push(t.id);
  return ids;
}

function scrollTaskIntoView(tid) {
  const pos = barPos[tid];
  if (!pos) return;
  const container = document.querySelector('.chart-container');
  const midX = pos.x + pos.w / 2;
  if (midX < container.scrollLeft + LABEL_W || midX > container.scrollLeft + container.clientWidth)
    container.scrollLeft = midX - container.clientWidth / 2;
}

function shiftDate(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// ============================================================
// Event delegation on SVG
// ============================================================
const svgEl_root = document.getElementById('roadmap-svg');

svgEl_root.addEventListener('pointerdown', (e) => {
  if (isReadOnly) return;
  const el = e.target;
  if (el.dataset.action === 'edit-task' && !el.dataset.milestone && el.tagName === 'rect') {
    const task = findTask(el.dataset.tid);
    if (!task) return;
    dragState = {
      type: 'move',
      tid: el.dataset.tid,
      barEl: el,
      startX: e.clientX,
      origStart: task.start,
      origEnd: task.end,
      origBarX: parseFloat(el.getAttribute('x')),
      hasMoved: false,
    };
    svgEl_root.setPointerCapture(e.pointerId);
    e.preventDefault();
  } else if (el.dataset.action === 'reorder-group') {
    dragState = {
      type: 'reorder-group',
      gid: el.dataset.gid,
      startY: e.clientY,
      origIndex: state.groups.findIndex(g => g.id === el.dataset.gid),
      currentIndex: state.groups.findIndex(g => g.id === el.dataset.gid),
      hasMoved: false,
    };
    svgEl_root.setPointerCapture(e.pointerId);
    e.preventDefault();
  } else if (el.dataset.action === 'reorder-task') {
    const group = state.groups.find(g => g.id === el.dataset.gid);
    if (!group) return;
    const origIndex = group.tasks.findIndex(t => t.id === el.dataset.tid);
    dragState = {
      type: 'reorder-task',
      tid: el.dataset.tid,
      gid: el.dataset.gid,
      startY: e.clientY,
      origIndex,
      currentIndex: origIndex,
      hasMoved: false,
    };
    svgEl_root.setPointerCapture(e.pointerId);
    e.preventDefault();
  } else if (el.dataset.action === 'resize-task') {
    const task = findTask(el.dataset.tid);
    if (!task) return;
    // Walk back to find the bar rect (data-action='edit-task') for this tid
    let barEl = el.previousElementSibling;
    while (barEl && !(barEl.dataset.action === 'edit-task' && barEl.dataset.tid === el.dataset.tid)) {
      barEl = barEl.previousElementSibling;
    }
    if (!barEl) return;
    dragState = {
      type: el.dataset.edge === 'left' ? 'resize-left' : 'resize-right',
      tid: el.dataset.tid,
      barEl,
      startX: e.clientX,
      origStart: task.start,
      origEnd: task.end,
      origBarX: parseFloat(barEl.getAttribute('x')),
      origBarW: parseFloat(barEl.getAttribute('width')),
      hasMoved: false,
    };
    svgEl_root.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
});

svgEl_root.addEventListener('pointermove', (e) => {
  if (!dragState) return;

  if (dragState.type === 'reorder-group') {
    const dy = e.clientY - dragState.startY;
    if (Math.abs(dy) > 4) dragState.hasMoved = true;
    if (!dragState.hasMoved) return;

    const svgRect = svgEl_root.getBoundingClientRect();
    const svgY = e.clientY - svgRect.top;

    let targetSlot = groupYPos.length;
    for (let i = 0; i < groupYPos.length; i++) {
      if (svgY < groupYPos[i].y + groupYPos[i].h / 2) { targetSlot = i; break; }
    }
    dragState.currentIndex = targetSlot;

    const last = groupYPos[groupYPos.length - 1];
    const indicatorY = targetSlot < groupYPos.length
      ? groupYPos[targetSlot].y
      : last.y + last.h;

    if (!reorderIndicator) {
      reorderIndicator = svgEl('line', {
        x1: 0, y1: indicatorY, x2: svgEl_root.getAttribute('width'), y2: indicatorY,
        stroke: '#2563eb', 'stroke-width': 2, 'pointer-events': 'none',
      });
      svgEl_root.appendChild(reorderIndicator);
    } else {
      reorderIndicator.setAttribute('y1', indicatorY);
      reorderIndicator.setAttribute('y2', indicatorY);
    }
    return;
  }

  if (dragState.type === 'reorder-task') {
    const dy = e.clientY - dragState.startY;
    if (Math.abs(dy) > 4) dragState.hasMoved = true;
    if (!dragState.hasMoved) return;

    const svgRect = svgEl_root.getBoundingClientRect();
    const svgY = e.clientY - svgRect.top;

    const groupTasks = taskYPos.filter(tp => tp.gid === dragState.gid);
    let targetSlot = groupTasks.length;
    for (let i = 0; i < groupTasks.length; i++) {
      if (svgY < groupTasks[i].y + groupTasks[i].h / 2) { targetSlot = i; break; }
    }
    dragState.currentIndex = targetSlot;

    const indicatorY = targetSlot < groupTasks.length
      ? groupTasks[targetSlot].y
      : groupTasks[groupTasks.length - 1].y + groupTasks[groupTasks.length - 1].h;

    if (!reorderIndicator) {
      reorderIndicator = svgEl('line', {
        x1: 0, y1: indicatorY, x2: svgEl_root.getAttribute('width'), y2: indicatorY,
        stroke: '#2563eb', 'stroke-width': 2, 'pointer-events': 'none',
      });
      svgEl_root.appendChild(reorderIndicator);
    } else {
      reorderIndicator.setAttribute('y1', indicatorY);
      reorderIndicator.setAttribute('y2', indicatorY);
    }
    return;
  }

  const dx = e.clientX - dragState.startX;
  if (Math.abs(dx) > 5) dragState.hasMoved = true;
  if (!dragState.hasMoved) return;

  if (dragState.type === 'move') {
    const newX = dragState.origBarX + dx;
    dragState.barEl.setAttribute('x', newX);
    const labelEl = dragState.barEl.nextElementSibling;
    if (labelEl && labelEl.tagName === 'text') {
      labelEl.setAttribute('x', newX + 6);
    }
  } else if (dragState.type === 'resize-left') {
    const newX = Math.min(dragState.origBarX + dx, dragState.origBarX + dragState.origBarW - 4);
    const newW = dragState.origBarW - (newX - dragState.origBarX);
    dragState.barEl.setAttribute('x', newX);
    dragState.barEl.setAttribute('width', Math.max(4, newW));
  } else if (dragState.type === 'resize-right') {
    dragState.barEl.setAttribute('width', Math.max(4, dragState.origBarW + dx));
  }
});

svgEl_root.addEventListener('pointerup', async (e) => {
  if (!dragState) return;
  const ds = dragState;
  dragState = null;

  if (reorderIndicator) { reorderIndicator.remove(); reorderIndicator = null; }

  if (!ds.hasMoved) {
    if (ds.type === 'reorder-task') return; // handle gesture on handle, not task bar
    openEditTaskModal(ds.tid);
    return;
  }

  if (ds.type === 'reorder-group') {
    const ids = state.groups.map(g => g.id);
    ids.splice(ds.origIndex, 1);
    const insertAt = ds.currentIndex > ds.origIndex ? ds.currentIndex - 1 : ds.currentIndex;
    ids.splice(insertAt, 0, ds.gid);
    mutate(() => {
      const index = Object.fromEntries(state.groups.map(g => [g.id, g]));
      state.groups = ids.filter(id => id in index).map(id => index[id]);
    });
    return;
  }

  if (ds.type === 'reorder-task') {
    const group = state.groups.find(g => g.id === ds.gid);
    if (!group) return;
    const ids = group.tasks.map(t => t.id);
    ids.splice(ds.origIndex, 1);
    const insertAt = ds.currentIndex > ds.origIndex ? ds.currentIndex - 1 : ds.currentIndex;
    ids.splice(insertAt, 0, ds.tid);
    mutate(() => {
      const grp = state.groups.find(g => g.id === ds.gid);
      const index = Object.fromEntries(grp.tasks.map(t => [t.id, t]));
      grp.tasks = ids.filter(id => id in index).map(id => index[id]);
    });
    return;
  }

  const dx = e.clientX - ds.startX;
  const dayDelta = Math.round(dx / dayW);

  if (ds.type === 'move') {
    if (dayDelta === 0) { render(); return; }
    const downstream = getDownstream(ds.tid);
    mutate(() => {
      for (const g of state.groups)
        for (const t of g.tasks)
          if (t.id === ds.tid || downstream.has(t.id)) {
            t.start = shiftDate(t.start, dayDelta);
            t.end   = shiftDate(t.end,   dayDelta);
          }
    });
    return;
  }

  let newStart, newEnd;
  if (ds.type === 'resize-left') {
    newStart = shiftDate(ds.origStart, dayDelta);
    newEnd   = ds.origEnd;
  } else if (ds.type === 'resize-right') {
    newStart = ds.origStart;
    newEnd   = shiftDate(ds.origEnd, dayDelta);
  }

  mutate(() => {
    const t = findTask(ds.tid);
    if (t) { t.start = newStart; t.end = newEnd; }
  });
});

svgEl_root.addEventListener('dblclick', (e) => {
  if (isReadOnly) return;
  // Double-clicking anywhere on a task bar or its label always opens the modal
  const el = e.target;
  const tid = el.dataset.tid;
  if (!tid || !findTask(tid)) return;
  dragState = null; // cancel any drag in progress
  e.preventDefault();
  openEditTaskModal(tid);
});

svgEl_root.addEventListener('click', async (e) => {
  if (dragState && dragState.hasMoved) return;
  const action = e.target.dataset.action;
  if (!action) return;
  if (isReadOnly && action !== 'toggle-group') return;
  const gid = e.target.dataset.gid;
  const tid = e.target.dataset.tid;

  try {
    if (action === 'add-group') {
      openAddGroupModal();
    } else if (action === 'toggle-group') {
      if (swimlaneMode) {
        if (swimlaneCollapsed.has(gid)) swimlaneCollapsed.delete(gid);
        else swimlaneCollapsed.add(gid);
        render();
      } else {
        const g = state.groups.find(g => g.id === gid);
        mutate(() => { g.collapsed = !g.collapsed; });
      }
    } else if (action === 'edit-group') {
      openEditGroupModal(gid);
    } else if (action === 'add-task') {
      openAddTaskModal(gid);
    } else if (action === 'add-milestone') {
      openAddMilestoneModal(gid);
    } else if (action === 'edit-task' || action === 'resize-task') {
      openEditTaskModal(tid);
    }
  } catch (err) {
    showToast(err.message);
  }
});

window.addEventListener('resize', () => render());

// ============================================================
// Task hover popup
// ============================================================
function showTaskPopup(tid) {
  const task = findTask(tid);
  if (!task) return;
  const pos = barPos[tid];
  if (!pos) return;
  if (pos.w === 0) return;  // skip milestones
  const popup = document.getElementById('task-popup');
  const container = document.querySelector('.chart-container');

  // Name
  document.getElementById('task-popup-name').textContent = task.name;

  // Dates
  const datesEl = document.getElementById('task-popup-dates');
  datesEl.textContent = formatDateRange(task.start, task.end);

  // Tags
  const tagsEl = document.getElementById('task-popup-tags');
  tagsEl.innerHTML = '';
  for (const tag of (task.tags || [])) {
    const pill = document.createElement('span');
    pill.className = 'tag-pill';
    pill.style.background = tagColor(tag);
    pill.textContent = tag;
    tagsEl.appendChild(pill);
  }

  // Assignee (only shown when set)
  const assigneeEl = document.getElementById('task-popup-assignee');
  assigneeEl.textContent = task.assignee ? `👤 ${task.assignee}` : '';

  // Notes preview
  const notesEl = document.getElementById('task-popup-notes');
  notesEl.textContent = task.notes ?? '';
  notesEl.style.display = task.notes ? '' : 'none';

  // Position: flush below the bar, aligned to bar left edge
  const left = pos.x - container.scrollLeft;
  const top = pos.y + pos.h + 2 - container.scrollTop;
  const maxLeft = container.clientWidth - 320;
  popup.style.left = `${Math.max(0, Math.min(left, maxLeft))}px`;
  popup.style.top = `${top}px`;

  clearTimeout(_hidePopupTimer);
  popup.classList.add('visible');
}

function hideTaskPopup() {
  _hidePopupTimer = setTimeout(() => {
    document.getElementById('task-popup').classList.remove('visible');
  }, 120);
}

// ============================================================
// Dependency chain hover highlighting
// ============================================================
function applyChainHighlight(tid) {
  const chain = new Set([tid, ...getUpstream(tid), ...getDownstream(tid)]);
  for (const el of svgEl_root.querySelectorAll('[data-tid]')) {
    el.style.opacity = chain.has(el.dataset.tid) ? '1' : '0.15';
  }
  for (const el of svgEl_root.querySelectorAll('[data-dep]')) {
    const [from, to] = el.dataset.dep.split(':');
    const inChain = chain.has(from) && chain.has(to);
    el.style.opacity = inChain ? '1' : '0.05';
    if (inChain) el.style.strokeWidth = '2.5';
  }
}

function clearChainHighlight() {
  for (const el of svgEl_root.querySelectorAll('[data-tid]'))
    el.style.opacity = '';
  for (const el of svgEl_root.querySelectorAll('[data-dep]')) {
    el.style.opacity = '';
    el.style.strokeWidth = '';
  }
}

svgEl_root.addEventListener('mousemove', (e) => {
  const tid = e.target.dataset.tid;
  const newTid = (tid && findTask(tid)) ? tid : null;
  if (newTid === _hoverTid) return;
  _hoverTid = newTid;
  if (newTid) { applyChainHighlight(newTid); showTaskPopup(newTid); }
  else { clearChainHighlight(); hideTaskPopup(); }
});

svgEl_root.addEventListener('mouseleave', () => {
  if (!_hoverTid) return;
  _hoverTid = null;
  clearChainHighlight();
  hideTaskPopup();
});

// ============================================================
// Toast
// ============================================================
function showToast(msg, isError = true) {
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast--error' : 'toast--ok'}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ============================================================
// Modal system
// ============================================================
function openModal(title, fields, onSave, onDelete = null) {
  document.getElementById('modal-title').textContent = title;
  const fieldsEl = document.getElementById('modal-fields');
  fieldsEl.innerHTML = '';

  for (const f of fields) {
    const div = document.createElement('div');
    div.className = 'modal-field';
    if (f.type === 'textarea') {
      div.innerHTML = `<label for="field-${f.name}">${f.label}</label>
        <textarea id="field-${f.name}" name="${f.name}" placeholder="${f.placeholder || ''}" rows="8"></textarea>`;
      div.querySelector('textarea').value = f.value || '';
    } else if (f.type === 'date') {
      div.innerHTML = `<label for="field-${f.name}">${f.label}</label>
        <div style="display:flex;gap:4px;align-items:center">
          <input id="field-${f.name}" name="${f.name}" type="text"
                 value="${f.value || ''}" placeholder="YYYY-MM-DD or MM/YYYY"${f.required !== false ? ' required' : ''}>
          <button type="button" class="btn btn--icon" title="Pick date"
                  onclick="this.nextElementSibling.showPicker()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>
          <input type="date" style="width:0;height:0;opacity:0;pointer-events:none;position:absolute"
                 form="__datepicker__"
                 onchange="document.getElementById('field-${f.name}').value=this.value">
        </div>`;
    } else if (f.type === 'select') {
      const opts = (f.options || [])
        .map(o => `<option value="${o.value}"${o.value === (f.value ?? '') ? ' selected' : ''}>${o.label}</option>`)
        .join('');
      div.innerHTML = `<label for="field-${f.name}">${f.label}</label>
        <select id="field-${f.name}" name="${f.name}">${opts}</select>`;
    } else if (f.type === 'multiselect') {
      const items = (f.options || []).map((o, i) => {
        const checked = (f.value || []).includes(o.value) ? ' checked' : '';
        const uid = `ms-${f.name}-${i}`;
        return `<div class="multiselect-list__item"><input type="checkbox" id="${uid}" name="${f.name}" value="${o.value}"${checked}><label for="${uid}">${o.label}</label></div>`;
      }).join('');
      div.innerHTML = `<label>${f.label}</label>` +
        (items ? `<div class="multiselect-list">${items}</div>`
               : `<div class="multiselect-list--empty">No other tasks available</div>`);
    } else {
      div.innerHTML = `<label for="field-${f.name}">${f.label}</label>
        <input id="field-${f.name}" name="${f.name}" type="${f.type || 'text'}"
               value="${f.value || ''}" placeholder="${f.placeholder || ''}"${f.required !== false ? ' required' : ''}>`;
    }
    fieldsEl.appendChild(div);
  }

  const deleteBtn = document.getElementById('modal-delete');
  if (onDelete) {
    deleteBtn.classList.remove('hidden');
    deleteBtn.onclick = async () => {
      try {
        await onDelete();
        closeModal();
      } catch (err) {
        showToast(err.message);
      }
    };
  } else {
    deleteBtn.classList.add('hidden');
  }

  document.getElementById('modal-overlay').classList.remove('hidden');
  const firstField = fieldsEl.querySelector('input, textarea, select');
  if (firstField) firstField.focus();
  document.getElementById('modal-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      for (const f of fields) {
        if (f.type === 'multiselect') data[f.name] = formData.getAll(f.name);
      }
      await onSave(data);
      closeModal();
    } catch (err) {
      showToast(err.message);
    }
  };
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function updateReadOnlyUI() {
  const badge = document.getElementById('readonly-badge');
  if (badge) badge.classList.toggle('hidden', !isFromUrl);
  const link = document.getElementById('title-source-link');
  if (link) {
    link.classList.toggle('hidden', !sourceUrl);
    const isDifferent = !!(urlState && state && JSON.stringify(state) !== JSON.stringify(urlState));
    link.classList.toggle('modified', isDifferent);
    if (isDifferent) {
      link.removeAttribute('href');
      link.title = 'Revert to original';
    } else if (sourceUrl) {
      link.href = sourceUrl;
      link.title = 'Open source URL';
    }
  }
}

document.getElementById('readonly-badge').addEventListener('click', () => {
  isReadOnly = false;
  isFromUrl = false;
  localStorage.removeItem('roadmap_readonly_v1');
  updateReadOnlyUI();
  render();
});

document.getElementById('title-source-link').addEventListener('click', (e) => {
  if (!urlState || !state) return;
  const isDifferent = JSON.stringify(state) !== JSON.stringify(urlState);
  if (isDifferent) {
    e.preventDefault();
    undoStack.push(JSON.parse(JSON.stringify(state)));
    redoStack.length = 0;
    state = JSON.parse(JSON.stringify(urlState));
    isReadOnly = true;
    isFromUrl = true;
    localStorage.setItem('roadmap_readonly_v1', 'true');
    saveState();
    render();
  }
});

document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape') { closeModal(); return; }
  if (isReadOnly) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return; }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }

  if (isModalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;

  if (e.key === 'g') { e.preventDefault(); openAddGroupModal(); return; }
  if (e.key === 't') {
    e.preventDefault();
    const gid = (selectedTid ? findGroupForTask(selectedTid)?.id : null) ?? state?.groups[0]?.id;
    if (gid) openAddTaskModal(gid);
    return;
  }
  if (e.key === 'Enter' && selectedTid) { e.preventDefault(); openEditTaskModal(selectedTid); return; }

  if (!state) return;
  const ids = getVisibleTaskIds();
  if (!ids.length) return;

  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault();
    if (!selectedTid || !ids.includes(selectedTid)) {
      selectedTid = e.key === 'ArrowDown' ? ids[0] : ids[ids.length - 1];
    } else {
      const idx = ids.indexOf(selectedTid);
      selectedTid = ids[e.key === 'ArrowDown' ? Math.min(idx + 1, ids.length - 1) : Math.max(idx - 1, 0)];
    }
    render();
    scrollTaskIntoView(selectedTid);
    return;
  }

  if (e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && selectedTid) {
    e.preventDefault();
    if (!findTask(selectedTid)) return;
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const downstream = getDownstream(selectedTid);
    mutate(() => {
      for (const g of state.groups)
        for (const t of g.tasks)
          if (t.id === selectedTid || downstream.has(t.id)) {
            t.start = shiftDate(t.start, delta);
            t.end   = shiftDate(t.end,   delta);
          }
    });
    scrollTaskIntoView(selectedTid);
  }
});
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ============================================================
// Group modals
// ============================================================
function randomGroupColor() {
  const colors = ['#4CAF50','#2196F3','#9C27B0','#FF5722','#FF9800','#00BCD4','#E91E63','#607D8B'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function openAddGroupModal() {
  openModal('Add Group', [
    { name: 'name', label: 'Group name', placeholder: 'e.g. Phase 1' },
    { name: 'color', label: 'Color', type: 'color', value: randomGroupColor() },
  ], (data) => {
    mutate(() => {
      state.groups.push({ id: _slug(data.name), name: data.name, color: data.color, collapsed: false, tasks: [], depends_on: [] });
    });
  });
}

function openEditGroupModal(gid) {
  const g = state.groups.find(g => g.id === gid);
  const groupOptions = [{ value: '', label: '(none)' }];
  for (const other of state.groups)
    if (other.id !== gid) groupOptions.push({ value: other.id, label: other.name });
  const currentDep = (g.depends_on?.length > 0) ? g.depends_on[0] : '';
  openModal('Edit Group', [
    { name: 'name', label: 'Group name', value: g.name },
    { name: 'color', label: 'Color', type: 'color', value: g.color },
    { name: 'depends_on', label: 'Depends on', type: 'select', value: currentDep, options: groupOptions },
  ], (data) => {
    mutate(() => {
      const grp = state.groups.find(g => g.id === gid);
      grp.name = data.name;
      grp.color = data.color;
      grp.depends_on = data.depends_on ? [data.depends_on] : [];
    });
  }, () => {
    if (confirm('Delete this group and all its tasks?')) {
      mutate(() => { state.groups = state.groups.filter(g => g.id !== gid); });
    }
  });
}

// ============================================================
// Task modals
// ============================================================
function openAddTaskModal(gid) {
  openModal('Add Task', [
    { name: 'name', label: 'Task name', placeholder: 'e.g. Deploy to staging' },
    { name: 'start', label: 'Start date', type: 'date', value: state.start },
    { name: 'end', label: 'End date', type: 'date', value: state.start },
    { name: 'assignee', label: 'Assignee', placeholder: 'e.g. Alice', required: false },
    { name: 'progress', label: 'Progress (%)', type: 'number', value: '', required: false, placeholder: '0–100' },
    { name: 'tags', label: 'Tags', placeholder: 'security, backend, ...', required: false, value: '' },
  ], (data) => {
    mutate(() => {
      const g = state.groups.find(g => g.id === gid);
      if (g) g.tasks.push({
        id: _slug(data.name), name: data.name,
        start: normalizeDate(data.start), end: normalizeDate(data.end, true),
        assignee: data.assignee || null,
        progress: data.progress !== '' ? parseInt(data.progress) : null,
        tags: data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        depends_on: [],
      });
    });
  });
}

function openAddMilestoneModal(gid) {
  openModal('Add Milestone', [
    { name: 'name', label: 'Milestone name', placeholder: 'e.g. v1.0 Release' },
    { name: 'date', label: 'Date', type: 'date', value: state.start },
    { name: 'assignee', label: 'Assignee', placeholder: 'e.g. Alice', required: false },
    { name: 'tags', label: 'Tags', placeholder: 'launch, external, ...', required: false, value: '' },
  ], (data) => {
    const d = normalizeDate(data.date);
    mutate(() => {
      const g = state.groups.find(g => g.id === gid);
      if (g) g.tasks.push({
        id: _slug(data.name), name: data.name,
        start: d, end: d,
        assignee: data.assignee || null,
        progress: null,
        tags: data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        depends_on: [],
      });
    });
  });
}

function openEditTaskModal(tid) {
  let task;
  for (const g of state.groups) {
    const t = g.tasks.find(t => t.id === tid);
    if (t) { task = t; break; }
  }

  // Milestone: simplified modal (single date, no progress)
  if (task.start === task.end) {
    openModal('Edit Milestone', [
      { name: 'name', label: 'Milestone name', value: task.name },
      { name: 'date', label: 'Date', type: 'date', value: task.start },
      { name: 'assignee', label: 'Assignee', value: task.assignee || '', required: false },
      { name: 'tags', label: 'Tags', value: (task.tags || []).join(', '), required: false, placeholder: 'launch, external, ...' },
    ], (data) => {
      const d = normalizeDate(data.date);
      mutate(() => {
        for (const g of state.groups) {
          const t = g.tasks.find(t => t.id === tid);
          if (t) { t.name = data.name; t.start = d; t.end = d; t.assignee = data.assignee || null; t.tags = data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : []; break; }
        }
      });
    }, () => {
      mutate(() => { for (const g of state.groups) g.tasks = g.tasks.filter(t => t.id !== tid); });
    });
    return;
  }

  const taskOptions = [];
  for (const g of state.groups)
    for (const t of g.tasks)
      if (t.id !== tid && !wouldCreateCycle(t.id, tid))
        taskOptions.push({ value: t.id, label: `${g.name} / ${t.name}` });
  openModal('Edit Task', [
    { name: 'name', label: 'Task name', value: task.name },
    { name: 'start', label: 'Start date', type: 'date', value: task.start },
    { name: 'end', label: 'End date', type: 'date', value: task.end },
    { name: 'assignee', label: 'Assignee', value: task.assignee || '', required: false },
    { name: 'notes', label: 'Notes', type: 'textarea', value: task.notes || '', required: false, placeholder: 'Optional description…' },
    { name: 'depends_on', label: 'Depends on', type: 'multiselect', value: task.depends_on || [], options: taskOptions },
    { name: 'progress', label: 'Progress (%)', type: 'number', value: task.progress ?? '', required: false, placeholder: '0–100' },
    { name: 'tags', label: 'Tags', value: (task.tags || []).join(', '), required: false, placeholder: 'security, backend, ...' },
  ], (data) => {
    const depIds = data.depends_on || [];
    for (const depId of depIds) {
      if (wouldCreateCycle(depId, tid)) throw new Error(`Dependency on "${depId}" would create a cycle`);
    }
    mutate(() => {
      for (const g of state.groups) {
        const t = g.tasks.find(t => t.id === tid);
        if (t) {
          t.name = data.name;
          t.start = normalizeDate(data.start);
          t.end = normalizeDate(data.end, true);
          t.assignee = data.assignee || null;
          t.depends_on = depIds;
          t.notes = data.notes?.trim() || null;
          t.progress = data.progress !== '' ? parseInt(data.progress) : null;
          t.tags = data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [];
          break;
        }
      }
    });
  }, () => {
    mutate(() => { for (const g of state.groups) g.tasks = g.tasks.filter(t => t.id !== tid); });
  });
}

// ============================================================
// Toolbar buttons
// ============================================================
// ============================================================
// Zoom controls
// ============================================================
function applyZoom(delta) {
  zoomLevel = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, zoomLevel + delta));
  document.getElementById('zoom-label').textContent = ZOOM_LEVELS[zoomLevel].label;
  render();
}
document.getElementById('btn-zoom-in').addEventListener('click', () => applyZoom(+1));
document.getElementById('btn-zoom-out').addEventListener('click', () => applyZoom(-1));

document.getElementById('btn-today').addEventListener('click', scrollToToday);
document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);
document.getElementById('btn-new').addEventListener('click', startFresh);
document.getElementById('btn-get-started').addEventListener('click', showOnboarding);
document.getElementById('template-picker-cancel').addEventListener('click', hideTemplatePicker);
document.getElementById('template-picker-backdrop').addEventListener('click', hideTemplatePicker);

document.getElementById('btn-swimlane').addEventListener('click', () => {
  swimlaneMode = !swimlaneMode;
  swimlaneCollapsed.clear();
  render();
});

document.getElementById('filter-assignee').addEventListener('change', e => {
  filterState.assignee = e.target.value;
  render();
});
document.getElementById('filter-tag').addEventListener('change', e => {
  filterState.tag = e.target.value;
  render();
});
document.getElementById('filter-overdue').addEventListener('click', () => {
  filterState.overdueOnly = !filterState.overdueOnly;
  render();
});
document.getElementById('filter-completed').addEventListener('click', () => {
  filterState.hideCompleted = !filterState.hideCompleted;
  render();
});
document.getElementById('filter-clear').addEventListener('click', () => {
  filterState = { assignee: '', tag: '', overdueOnly: false, hideCompleted: false };
  render();
});
document.getElementById('btn-collapse-all').addEventListener('click', () => {
  if (swimlaneMode) return;
  mutate(() => { state.groups.forEach(g => { g.collapsed = true; }); });
});
document.getElementById('btn-expand-all').addEventListener('click', () => {
  if (swimlaneMode) return;
  mutate(() => { state.groups.forEach(g => { g.collapsed = false; }); });
});

document.getElementById('btn-import').addEventListener('click', () => {
  if (isReadOnly) return;
  openModal('Import YAML', [
    { name: 'yaml', label: 'Paste YAML', type: 'textarea', placeholder: 'title: My Roadmap\n...' },
    { name: 'url', label: 'Or fetch from URL', placeholder: 'https://...', required: false },
  ], async (data) => {
    let text = data.yaml.trim();
    if (!text && data.url.trim()) {
      const res = await fetch(data.url.trim());
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      text = await res.text();
    }
    if (!text) throw new Error('Provide YAML text or a URL');
    const validated = await api('POST', '/roadmap/import', text, 'text/plain');
    undoStack.push(JSON.parse(JSON.stringify(state)));
    redoStack.length = 0;
    state = validated;
    saveState();
    render();
  });
});

document.getElementById('btn-edit-yaml').addEventListener('click', async () => {
  try {
    const res = await fetch('api/roadmap/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    const text = await res.text();
    openModal('Edit YAML', [
      { name: 'yaml', label: '', type: 'textarea' },
    ], async (data) => {
      const validated = await api('POST', '/roadmap/import', data.yaml, 'text/plain');
      undoStack.push(JSON.parse(JSON.stringify(state)));
      redoStack.length = 0;
      state = validated;
      if (isReadOnly) {
        isReadOnly = false;
        isFromUrl = false;
        localStorage.removeItem('roadmap_readonly_v1');
        updateReadOnlyUI();
      }
      saveState();
      render();
    });
    document.getElementById('field-yaml').value = text;
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById('btn-export-png').addEventListener('click', () => {
  const svg = document.getElementById('roadmap-svg');
  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = svg.width.baseVal.value;
    canvas.height = svg.height.baseVal.value;
    canvas.getContext('2d').drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const a = document.createElement('a');
    a.download = 'roadmap.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = url;
});

document.getElementById('btn-export').addEventListener('click', async () => {
  try {
    const res = await fetch('api/roadmap/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'roadmap.yaml'; a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    showToast(err.message);
  }
});

// ============================================================
// Onboarding
// ============================================================
function showTemplatePicker() {
  const grid = document.getElementById('template-grid');
  grid.innerHTML = '';

  const blankCard = document.createElement('button');
  blankCard.type = 'button';
  blankCard.className = 'template-card template-card--blank';
  blankCard.innerHTML = `
    <div class="template-card__icon">📄</div>
    <div class="template-card__name">Blank roadmap</div>
    <div class="template-card__desc">Start with an empty canvas and build from scratch.</div>
  `;
  blankCard.addEventListener('click', () => openOnboardingForm(null));
  grid.appendChild(blankCard);

  for (const tpl of TEMPLATES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'template-card';
    card.innerHTML = `
      <div class="template-card__icon">${tpl.icon}</div>
      <div class="template-card__name">${tpl.name}</div>
      <div class="template-card__desc">${tpl.description}</div>
    `;
    card.addEventListener('click', () => openOnboardingForm(tpl));
    grid.appendChild(card);
  }

  document.getElementById('template-picker').classList.remove('hidden');
}

function hideTemplatePicker() {
  document.getElementById('template-picker').classList.add('hidden');
}

function openOnboardingForm(template) {
  hideTemplatePicker();
  const yr = new Date().getFullYear();
  const defaultEnd = template
    ? shiftDate(`${yr}-01-01`, template.durationWeeks * 7)
    : `${yr}-12-31`;
  openModal('Set up your roadmap', [
    { name: 'title', label: 'Roadmap name', value: template?.defaultTitle ?? '', placeholder: 'e.g. Product Roadmap 2026' },
    { name: 'start', label: 'Start date', type: 'date', value: `${yr}-01-01` },
    { name: 'end',   label: 'End date',   type: 'date', value: defaultEnd },
  ], (data) => {
    const startDate = normalizeDate(data.start);
    const endDate   = normalizeDate(data.end, true);
    state = buildStateFromTemplate(template, data.title || 'My Roadmap', startDate, endDate);
    undoStack.length = 0;
    redoStack.length = 0;
    saveState();
    render();
    scrollToToday();
  });
}

function buildStateFromTemplate(template, title, startDate, endDate) {
  if (!template) return { title, start: startDate, end: endDate, groups: [] };
  return {
    title, start: startDate, end: endDate,
    groups: template.groups.map(g => ({
      id: _slug(g.name), name: g.name, color: g.color, collapsed: false, depends_on: [],
      tasks: g.tasks.map(t => {
        const s = shiftDate(startDate, t.startWeek * 7);
        const e = t.startWeek === t.endWeek
          ? s
          : shiftDate(startDate, t.endWeek * 7 - 1);
        return { id: _slug(t.name), name: t.name, start: s, end: e, assignee: null, progress: null, tags: [], depends_on: [] };
      }),
    })),
  };
}

function showOnboarding() {
  showTemplatePicker();
}

function startFresh() {
  if (state && !confirm('Start fresh? Your current roadmap will be cleared from this browser.')) return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('roadmap_readonly_v1');
  localStorage.removeItem('roadmap_url_state_v1');
  localStorage.removeItem('roadmap_source_url_v1');
  isReadOnly = false;
  isFromUrl = false;
  urlState = null;
  sourceUrl = null;
  state = null;
  undoStack.length = 0;
  redoStack.length = 0;
  render();
  showOnboarding();
}

// ============================================================
// Theme
// ============================================================
const THEME_KEY = 'roadmap_theme_v1';

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved === 'dark');
  } else {
    applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
}

loadTheme();

document.getElementById('btn-theme').addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
  render();
});

// ============================================================
// Bootstrap
// ============================================================
async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const remoteUrl = params.get('url');
  if (remoteUrl) {
    try {
      const res = await fetch(remoteUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const text = await res.text();
      const validated = await fetch('api/roadmap/import', {
        method: 'POST', body: text,
        headers: { 'Content-Type': 'text/plain' },
      }).then(r => r.json());
      state = validated;
      urlState = JSON.parse(JSON.stringify(validated));
      isReadOnly = true;
      isFromUrl = true;
      sourceUrl = remoteUrl;
      localStorage.setItem('roadmap_url_state_v1', JSON.stringify(urlState));
      localStorage.setItem('roadmap_readonly_v1', 'true');
      localStorage.setItem('roadmap_source_url_v1', remoteUrl);
      saveState();
      history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      showToast(`Failed to load from URL: ${err.message}`);
    }
  }
  await loadRoadmap();
  if (!state) showOnboarding();
}
bootstrap();
