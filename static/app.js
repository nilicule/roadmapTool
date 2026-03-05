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

// ============================================================
// State
// ============================================================
let state = null;  // Roadmap object from API
let undoStack = [];
let redoStack = [];
let _skipHistory = false;
let zoomLevel = 0;    // index into ZOOM_LEVELS; 0 = Year (default)
let dayW = 0;         // pixels per day (module-level, set in renderSVG)
let timeStart = null; // Date object (module-level, set in renderSVG)
let barPos = {};      // tid/gid → { x, y, w, h, midY } for dependency arrows
let groupYPos = [];   // [{gid, y, h}] for drag-to-reorder
let reorderIndicator = null; // <line> shown during group reorder drag
let _hoverTid = null;
let _hidePopupTimer = null;
let selectedTid = null;

// ============================================================
// Date utilities
// ============================================================
function parseDate(s) { return new Date(s + 'T00:00:00'); }
function daysDiff(a, b) { return Math.round((b - a) / 86400000); }
function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function tagColor(tag) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) % 360;
  return `hsl(${h}, 65%, 48%)`;
}
function isOverdue(t) {
  return parseDate(t.end) < today() && (t.progress ?? 0) < 100;
}

// ============================================================
// API
// ============================================================
async function api(method, path, body, contentType = 'application/json') {
  if (method !== 'GET' && state && !_skipHistory) {
    undoStack.push(JSON.parse(JSON.stringify(state)));
    redoStack.length = 0;
  }
  const res = await fetch('/api' + path, {
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
  state = await api('GET', '/roadmap');
  render();
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
  if (!state) return;
  document.getElementById('roadmap-title').textContent = state.title;
  renderLegend();
  renderSVG();
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
  let totalH = HEADER_H;
  for (const g of state.groups) {
    totalH += GROUP_H;
    if (!g.collapsed) totalH += g.tasks.length * TASK_H;
  }
  totalH += GROUP_H + 10; // "+ Add group" row

  svg.setAttribute('width', svgW);
  svg.setAttribute('height', totalH);
  svg.setAttribute('viewBox', `0 0 ${svgW} ${totalH}`);

  // Background
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: svgW, height: totalH, fill: '#fff' }));


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

  // "+ Add group" row (top of label column)
  let y = HEADER_H;
  svg.appendChild(svgEl('rect', { x: 0, y, width: LABEL_W, height: GROUP_H, fill: '#fafafa' }));
  svg.appendChild(svgEl('line', { x1: 0, y1: y, x2: LABEL_W, y2: y, stroke: '#e0e0e0', 'stroke-width': 1 }));
  svg.appendChild(svgEl('text', {
    x: 20, y: y + GROUP_H / 2 + 5,
    fill: '#9ca3af', 'font-size': 13, cursor: 'pointer',
    'data-action': 'add-group',
  }, '+ Add group'));
  y += GROUP_H;

  // Groups and tasks
  barPos = {};
  groupYPos = [];
  for (const g of state.groups) {
    const groupStartY = y;
    renderGroup(svg, g, y, svgW);
    y += GROUP_H;
    if (!g.collapsed) {
      for (const t of g.tasks) {
        renderTask(svg, t, g, y, timeStart, dayW, svgW);
        y += TASK_H;
      }
    }
    groupYPos.push({ gid: g.id, y: groupStartY, h: y - groupStartY });
  }

  // Label panel separator
  svg.appendChild(svgEl('line', {
    x1: LABEL_W, y1: HEADER_H, x2: LABEL_W, y2: totalH,
    stroke: '#e0e0e0', 'stroke-width': 1
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
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: containerW, height: HEADER_H, fill: '#f3f4f6' }));
  svg.appendChild(svgEl('line', { x1: 0, y1: HEADER_H, x2: containerW, y2: HEADER_H, stroke: '#d1d5db', 'stroke-width': 1 }));

  let cur = new Date(timeStart);
  cur.setDate(1);

  while (cur <= timeEnd) {
    const monthStart = Math.max(0, daysDiff(timeStart, cur));
    const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    const monthEnd = Math.min(totalDays, daysDiff(timeStart, nextMonth));
    const mW = (monthEnd - monthStart) * dayW;
    const mX = LABEL_W + monthStart * dayW;

    if (mX < containerW && mW > 0) {
      svg.appendChild(svgEl('line', { x1: mX, y1: 0, x2: mX, y2: totalH, stroke: '#e5e7eb', 'stroke-width': 1 }));
      svg.appendChild(svgEl('text', {
        x: mX + mW / 2, y: HEADER_H / 2 + 5,
        'text-anchor': 'middle', fill: '#6b7280',
        'font-size': 12, 'font-weight': '500'
      }, `${MONTH_NAMES[cur.getMonth()]} ${cur.getFullYear()}`));
    }

    cur = nextMonth;
  }
}

function renderGroup(svg, g, y, containerW) {
  const bg = hexToRgba(g.color, 0.15);
  svg.appendChild(svgEl('rect', { x: 0, y, width: containerW, height: GROUP_H, fill: bg }));
  svg.appendChild(svgEl('line', { x1: 0, y1: y, x2: containerW, y2: y, stroke: '#e0e0e0', 'stroke-width': 1 }));

  // Color indicator
  svg.appendChild(svgEl('rect', { x: 0, y, width: 4, height: GROUP_H, fill: g.color }));

  // Drag handle ≡
  svg.appendChild(svgEl('text', {
    x: 8, y: y + GROUP_H / 2 + 5,
    fill: '#9ca3af', 'font-size': 12, 'text-anchor': 'middle', cursor: 'grab',
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

  // Edit button — \uFE0E forces text (not emoji) rendering of ✎
  svg.appendChild(svgEl('text', {
    x: LABEL_W - 38, y: y + GROUP_H / 2 + 5,
    fill: '#6b7280', 'font-size': 13, cursor: 'pointer',
    'text-anchor': 'middle',
    'data-action': 'edit-group', 'data-gid': g.id
  }, '\u270E\uFE0E'));

  // "+ task" button
  svg.appendChild(svgEl('text', {
    x: LABEL_W - 14, y: y + GROUP_H / 2 + 5,
    fill: '#9ca3af', 'font-size': 14, cursor: 'pointer',
    'text-anchor': 'middle',
    'data-action': 'add-task', 'data-gid': g.id
  }, '+'));

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
  svg.appendChild(svgEl('rect', { x: 0, y, width: containerW, height: TASK_H, fill: '#fafafa' }));
  svg.appendChild(svgEl('line', { x1: 0, y1: y + TASK_H, x2: containerW, y2: y + TASK_H, stroke: '#f0f0f0', 'stroke-width': 1 }));

  // Task name label (left panel)
  svg.appendChild(svgEl('text', {
    x: 12, y: y + TASK_H / 2 + 4,
    fill: '#374151', 'font-size': 12, cursor: 'pointer',
    'data-action': 'edit-task', 'data-tid': t.id
  }, truncate(t.name, 28)));

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

    const x2 = to.x, y2 = to.midY;
    let d;
    if (to.x < from.x + from.w) {
      const dropX = Math.max(from.x, to.x - 10);
      d = `M ${dropX} ${from.y + from.h} L ${dropX} ${y2} L ${x2} ${y2}`;
    } else {
      const x1 = from.x + from.w, y1 = from.midY;
      if (Math.abs(y1 - y2) < 2) {
        d = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        const midX = x1 + Math.max((x2 - x1) / 2, 16);
        d = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
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
async function undo() {
  if (!undoStack.length) return;
  redoStack.push(JSON.parse(JSON.stringify(state)));
  const snapshot = undoStack.pop();
  _skipHistory = true;
  try { await api('PUT', '/roadmap/restore', snapshot); await loadRoadmap(); }
  catch (err) { showToast(err.message); }
  finally { _skipHistory = false; }
}

async function redo() {
  if (!redoStack.length) return;
  undoStack.push(JSON.parse(JSON.stringify(state)));
  const snapshot = redoStack.pop();
  _skipHistory = true;
  try { await api('PUT', '/roadmap/restore', snapshot); await loadRoadmap(); }
  catch (err) { showToast(err.message); }
  finally { _skipHistory = false; }
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

  if (!ds.hasMoved) return;  // pure click — let click handler fire

  if (ds.type === 'reorder-group') {
    const ids = state.groups.map(g => g.id);
    ids.splice(ds.origIndex, 1);
    const insertAt = ds.currentIndex > ds.origIndex ? ds.currentIndex - 1 : ds.currentIndex;
    ids.splice(insertAt, 0, ds.gid);
    try {
      await api('POST', '/groups/reorder', { ids });
      await loadRoadmap();
    } catch (err) { showToast(err.message); render(); }
    return;
  }

  const dx = e.clientX - ds.startX;
  const task = findTask(ds.tid);
  const dayDelta = Math.round(dx / dayW);

  if (ds.type === 'move') {
    if (dayDelta === 0) { render(); return; }
    // Shift moved task and all downstream tasks
    const downstream = getDownstream(ds.tid);
    const snapshot = JSON.parse(JSON.stringify(state));
    for (const g of snapshot.groups)
      for (const t of g.tasks)
        if (t.id === ds.tid || downstream.has(t.id)) {
          t.start = shiftDate(t.start, dayDelta);
          t.end   = shiftDate(t.end,   dayDelta);
        }
    try {
      await api('PUT', '/roadmap/restore', snapshot);
      await loadRoadmap();
    } catch (err) { showToast(err.message); render(); }
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

  try {
    await api('PUT', `/tasks/${ds.tid}`, { name: task.name, start: newStart, end: newEnd, assignee: task.assignee || null, depends_on: task.depends_on || [], progress: task.progress ?? null, tags: task.tags || [] });
    await loadRoadmap();
  } catch (err) {
    showToast(err.message);
    render();
  }
});

svgEl_root.addEventListener('dblclick', (e) => {
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
  const gid = e.target.dataset.gid;
  const tid = e.target.dataset.tid;

  try {
    if (action === 'add-group') {
      openAddGroupModal();
    } else if (action === 'toggle-group') {
      const g = state.groups.find(g => g.id === gid);
      await api('PUT', `/groups/${gid}`, { name: g.name, color: g.color, collapsed: !g.collapsed, depends_on: g.depends_on || [] });
      await loadRoadmap();
    } else if (action === 'edit-group') {
      openEditGroupModal(gid);
    } else if (action === 'add-task') {
      openAddTaskModal(gid);
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

  // Position: flush below the bar, aligned to bar left edge
  const left = pos.x - container.scrollLeft;
  const top = pos.y + pos.h + 2 - container.scrollTop;
  const maxLeft = container.clientWidth - 280;
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
    } else if (f.type === 'select') {
      const opts = (f.options || [])
        .map(o => `<option value="${o.value}"${o.value === (f.value ?? '') ? ' selected' : ''}>${o.label}</option>`)
        .join('');
      div.innerHTML = `<label for="field-${f.name}">${f.label}</label>
        <select id="field-${f.name}" name="${f.name}">${opts}</select>`;
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
        await loadRoadmap();
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
      const data = Object.fromEntries(new FormData(e.target));
      await onSave(data);
      closeModal();
      await loadRoadmap();
    } catch (err) {
      showToast(err.message);
    }
  };
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.addEventListener('keydown', async (e) => {
  if (e.key === 'Escape') { closeModal(); return; }
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
    const task = findTask(selectedTid);
    if (!task) return;
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const downstream = getDownstream(selectedTid);
    const snapshot = JSON.parse(JSON.stringify(state));
    for (const g of snapshot.groups)
      for (const t of g.tasks)
        if (t.id === selectedTid || downstream.has(t.id)) {
          t.start = shiftDate(t.start, delta);
          t.end   = shiftDate(t.end,   delta);
        }
    try {
      await api('PUT', '/roadmap/restore', snapshot);
      await loadRoadmap();
      scrollTaskIntoView(selectedTid);
    } catch (err) { showToast(err.message); }
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
  ], async (data) => {
    await api('POST', '/groups', { name: data.name, color: data.color });
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
  ], async (data) => {
    await api('PUT', `/groups/${gid}`, {
      name: data.name, color: data.color, collapsed: g.collapsed,
      depends_on: data.depends_on ? [data.depends_on] : [],
    });
  }, async () => {
    if (confirm('Delete this group and all its tasks?')) {
      await api('DELETE', `/groups/${gid}`);
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
  ], async (data) => {
    await api('POST', `/groups/${gid}/tasks`, {
      name: data.name, start: data.start, end: data.end,
      assignee: data.assignee || null,
      progress: data.progress !== '' ? parseInt(data.progress) : null,
      tags: data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
    });
  });
}

function openEditTaskModal(tid) {
  let task;
  for (const g of state.groups) {
    const t = g.tasks.find(t => t.id === tid);
    if (t) { task = t; break; }
  }
  const taskOptions = [{ value: '', label: '(none)' }];
  for (const g of state.groups)
    for (const t of g.tasks)
      if (t.id !== tid && !wouldCreateCycle(t.id, tid))
        taskOptions.push({ value: t.id, label: `${g.name} / ${t.name}` });
  const currentDep = (task.depends_on?.length > 0) ? task.depends_on[0] : '';
  openModal('Edit Task', [
    { name: 'name', label: 'Task name', value: task.name },
    { name: 'start', label: 'Start date', type: 'date', value: task.start },
    { name: 'end', label: 'End date', type: 'date', value: task.end },
    { name: 'assignee', label: 'Assignee', value: task.assignee || '', required: false },
    { name: 'depends_on', label: 'Depends on', type: 'select', value: currentDep, options: taskOptions },
    { name: 'progress', label: 'Progress (%)', type: 'number', value: task.progress ?? '', required: false, placeholder: '0–100' },
    { name: 'tags', label: 'Tags', value: (task.tags || []).join(', '), required: false, placeholder: 'security, backend, ...' },
  ], async (data) => {
    if (data.depends_on && wouldCreateCycle(data.depends_on, tid))
      throw new Error('This dependency would create a cycle');
    await api('PUT', `/tasks/${tid}`, {
      name: data.name, start: data.start, end: data.end, assignee: data.assignee || null,
      depends_on: data.depends_on ? [data.depends_on] : [],
      progress: data.progress !== '' ? parseInt(data.progress) : null,
      tags: data.tags ? data.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
    });
  }, async () => {
    await api('DELETE', `/tasks/${tid}`);
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

document.getElementById('btn-import').addEventListener('click', () => {
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
    await api('POST', '/roadmap/import', text, 'text/plain');
  });
});

document.getElementById('btn-edit-yaml').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/roadmap/export');
    const text = await res.text();
    openModal('Edit YAML', [
      { name: 'yaml', label: '', type: 'textarea' },
    ], async (data) => {
      await api('POST', '/roadmap/import', data.yaml, 'text/plain');
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
    const res = await fetch('/api/roadmap/export');
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
      await api('POST', '/roadmap/import', text, 'text/plain');
      history.replaceState(null, '', window.location.pathname);
    } catch (err) {
      showToast(`Failed to load from URL: ${err.message}`);
    }
  }
  await loadRoadmap();
}
bootstrap();
