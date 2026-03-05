// ============================================================
// Constants
// ============================================================
const LABEL_W = 220;
const HEADER_H = 40;
const GROUP_H = 34;
const TASK_H = 30;
const BAR_MARGIN = 5;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ============================================================
// State
// ============================================================
let state = null;  // Roadmap object from API

// ============================================================
// Date utilities
// ============================================================
function parseDate(s) { return new Date(s + 'T00:00:00'); }
function daysDiff(a, b) { return Math.round((b - a) / 86400000); }
function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }

// ============================================================
// API
// ============================================================
async function api(method, path, body) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? {'Content-Type': 'application/json'} : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

async function loadRoadmap() {
  state = await api('GET', '/roadmap');
  render();
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
  const timeStart = parseDate(state.start);
  const timeEnd   = parseDate(state.end);
  const totalDays = daysDiff(timeStart, timeEnd);
  const dayW = (containerW - LABEL_W) / totalDays;

  // Compute total height
  let totalH = HEADER_H;
  for (const g of state.groups) {
    totalH += GROUP_H;
    if (!g.collapsed) totalH += g.tasks.length * TASK_H;
  }
  totalH += 10;

  svg.setAttribute('width', containerW);
  svg.setAttribute('height', totalH);
  svg.setAttribute('viewBox', `0 0 ${containerW} ${totalH}`);

  // Background
  svg.appendChild(svgEl('rect', { x: 0, y: 0, width: containerW, height: totalH, fill: '#fff' }));

  // Month headers
  renderMonthHeaders(svg, timeStart, timeEnd, totalDays, dayW, containerW, totalH);

  // Today marker
  const tod = today();
  if (tod >= timeStart && tod <= timeEnd) {
    const tx = LABEL_W + daysDiff(timeStart, tod) * dayW;
    svg.appendChild(svgEl('line', {
      x1: tx, y1: HEADER_H, x2: tx, y2: totalH,
      stroke: '#2563eb', 'stroke-width': 1.5, 'stroke-dasharray': '4,3', opacity: 0.7
    }));
    svg.appendChild(svgEl('text', {
      x: tx + 3, y: HEADER_H - 6, fill: '#2563eb', 'font-size': 11
    }, 'Today'));
  }

  // Groups and tasks
  let y = HEADER_H;
  for (const g of state.groups) {
    renderGroup(svg, g, y, containerW);
    y += GROUP_H;
    if (!g.collapsed) {
      for (const t of g.tasks) {
        renderTask(svg, t, g, y, timeStart, dayW, containerW);
        y += TASK_H;
      }
    }
  }

  // Label panel separator
  svg.appendChild(svgEl('line', {
    x1: LABEL_W, y1: HEADER_H, x2: LABEL_W, y2: totalH,
    stroke: '#e0e0e0', 'stroke-width': 1
  }));
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

  // Collapse toggle + group name
  const arrow = g.collapsed ? '▶' : '▼';
  svg.appendChild(svgEl('text', {
    x: 14, y: y + GROUP_H / 2 + 5,
    fill: g.color, 'font-size': 13, 'font-weight': '600', cursor: 'pointer',
    'data-action': 'toggle-group', 'data-gid': g.id
  }, `${arrow} ${g.name}`));

  // Edit button
  svg.appendChild(svgEl('text', {
    x: LABEL_W - 24, y: y + GROUP_H / 2 + 5,
    fill: '#6b7280', 'font-size': 13, cursor: 'pointer',
    'data-action': 'edit-group', 'data-gid': g.id
  }, '✎'));

  // "+ task" button
  svg.appendChild(svgEl('text', {
    x: LABEL_W - 6, y: y + GROUP_H / 2 + 5,
    fill: '#9ca3af', 'font-size': 11, cursor: 'pointer',
    'data-action': 'add-task', 'data-gid': g.id
  }, '+'));
}

function renderTask(svg, t, g, y, timeStart, dayW, containerW) {
  svg.appendChild(svgEl('rect', { x: 0, y, width: containerW, height: TASK_H, fill: '#fafafa' }));
  svg.appendChild(svgEl('line', { x1: 0, y1: y + TASK_H, x2: containerW, y2: y + TASK_H, stroke: '#f0f0f0', 'stroke-width': 1 }));

  // Task name label (left panel)
  svg.appendChild(svgEl('text', {
    x: 12, y: y + TASK_H / 2 + 4,
    fill: '#374151', 'font-size': 12
  }, truncate(t.name, 28)));

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

  // Bar label
  if (barW > 30) {
    svg.appendChild(svgEl('text', {
      x: barX + 6, y: barY + barH / 2 + 4,
      fill: '#fff', 'font-size': 11, 'pointer-events': 'none'
    }, truncate(t.name, Math.floor(barW / 7))));
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
// Event delegation on SVG
// ============================================================
document.getElementById('roadmap-svg').addEventListener('click', async (e) => {
  const action = e.target.dataset.action;
  if (!action) return;
  const gid = e.target.dataset.gid;
  const tid = e.target.dataset.tid;

  try {
    if (action === 'toggle-group') {
      const g = state.groups.find(g => g.id === gid);
      await api('PUT', `/groups/${gid}`, { name: g.name, color: g.color, collapsed: !g.collapsed });
      await loadRoadmap();
    } else if (action === 'edit-group') {
      openEditGroupModal(gid);
    } else if (action === 'add-task') {
      openAddTaskModal(gid);
    } else if (action === 'edit-task') {
      openEditTaskModal(tid);
    }
  } catch (err) {
    showToast(err.message);
  }
});

window.addEventListener('resize', () => render());

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
    div.innerHTML = `<label for="field-${f.name}">${f.label}</label>
      <input id="field-${f.name}" name="${f.name}" type="${f.type || 'text'}"
             value="${f.value || ''}" placeholder="${f.placeholder || ''}" required>`;
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
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ============================================================
// Group modals
// ============================================================
function openAddGroupModal() {
  openModal('Add Group', [
    { name: 'name', label: 'Group name', placeholder: 'e.g. Phase 1' },
    { name: 'color', label: 'Color', type: 'color', value: '#4CAF50' },
  ], async (data) => {
    await api('POST', '/groups', { name: data.name, color: data.color });
  });
}

function openEditGroupModal(gid) {
  const g = state.groups.find(g => g.id === gid);
  openModal('Edit Group', [
    { name: 'name', label: 'Group name', value: g.name },
    { name: 'color', label: 'Color', type: 'color', value: g.color },
  ], async (data) => {
    await api('PUT', `/groups/${gid}`, { name: data.name, color: data.color, collapsed: g.collapsed });
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
  ], async (data) => {
    await api('POST', `/groups/${gid}/tasks`, data);
  });
}

function openEditTaskModal(tid) {
  let task;
  for (const g of state.groups) {
    const t = g.tasks.find(t => t.id === tid);
    if (t) { task = t; break; }
  }
  openModal('Edit Task', [
    { name: 'name', label: 'Task name', value: task.name },
    { name: 'start', label: 'Start date', type: 'date', value: task.start },
    { name: 'end', label: 'End date', type: 'date', value: task.end },
  ], async (data) => {
    await api('PUT', `/tasks/${tid}`, data);
  }, async () => {
    await api('DELETE', `/tasks/${tid}`);
  });
}

// ============================================================
// Toolbar buttons
// ============================================================
document.getElementById('btn-add-group').addEventListener('click', openAddGroupModal);

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
loadRoadmap();
