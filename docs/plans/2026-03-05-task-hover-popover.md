# Task Hover Popover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a floating popover below a task bar when the mouse hovers over it, displaying the task's tags as colored pills and its assignee.

**Architecture:** A single `<div id="task-popup">` in `index.html` inside `.chart-container` (which gains `position: relative`). CSS transitions handle the show/hide animation. Two JS functions (`showTaskPopup` / `hideTaskPopup`) wire into the existing `mousemove` and `mouseleave` SVG handlers. No backend changes.

**Tech Stack:** Vanilla JS, HTML, CSS. No build step.

---

## Task 1: Add popup HTML element and CSS styles

**Files:**
- Modify: `static/index.html:51-53` (inside `.chart-container`)
- Modify: `static/style.css`

**Step 1: Add the popup `<div>` inside `.chart-container`**

In `static/index.html`, change the `.chart-container` block from:
```html
<div class="chart-container">
  <svg id="roadmap-svg" xmlns="http://www.w3.org/2000/svg"></svg>
</div>
```
to:
```html
<div class="chart-container">
  <svg id="roadmap-svg" xmlns="http://www.w3.org/2000/svg"></svg>
  <div id="task-popup">
    <div id="task-popup-tags"></div>
    <div id="task-popup-assignee"></div>
  </div>
</div>
```

**Step 2: Add CSS for `.chart-container` and `#task-popup`**

In `static/style.css`, add `position: relative` to the existing `.chart-container` rule (line 28):
```css
.chart-container { overflow-x: auto; padding: 0 20px 20px; position: relative; }
```

Then append these new rules at the end of the file:
```css
#task-popup {
  position: absolute;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.10);
  font-size: 13px;
  z-index: 50;
  min-width: 100px;
  max-width: 260px;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}
#task-popup.visible {
  opacity: 1;
  transform: translateY(0);
}
#task-popup-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
#task-popup-tags:empty { display: none; margin-bottom: 0; }
.tag-pill {
  padding: 2px 8px;
  border-radius: 10px;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
}
#task-popup-assignee {
  color: #374151;
  display: flex;
  align-items: center;
  gap: 5px;
}
```

**Step 3: Visual check**

Open `http://localhost:8000` (run `uv run app` first). Verify the popup is invisible at rest (no flicker, no layout shift). Nothing else should look different.

**Step 4: Commit**

```bash
git add static/index.html static/style.css
git commit -m "feat: add task hover popup HTML and CSS"
```

---

## Task 2: Wire popup show/hide in JavaScript

**Files:**
- Modify: `static/app.js` — add `showTaskPopup`/`hideTaskPopup` functions, modify `mousemove` and `mouseleave` handlers

**Step 1: Add module-level timer variable**

Near the top of `static/app.js`, after `let _hoverTid = null;` (line 30), add:
```javascript
let _hidePopupTimer = null;
```

**Step 2: Add `showTaskPopup` and `hideTaskPopup` functions**

Add these two functions just before the `applyChainHighlight` function (around line 792):

```javascript
function showTaskPopup(tid) {
  const task = findTask(tid);
  if (!task) return;
  const pos = barPos[tid];
  if (!pos) return;
  const popup = document.getElementById('task-popup');
  const container = document.querySelector('.chart-container');

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

  // Assignee
  document.getElementById('task-popup-assignee').textContent =
    task.assignee ? `👤 ${task.assignee}` : '👤 —';

  // Position: below the bar, clamped to container width
  const left = pos.x - container.scrollLeft;
  const top = pos.y + pos.h + 6 - container.scrollTop;
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
```

**Step 3: Update the `mousemove` handler**

Find the existing `mousemove` handler (around line 814):
```javascript
svgEl_root.addEventListener('mousemove', (e) => {
  const tid = e.target.dataset.tid;
  const newTid = (tid && findTask(tid)) ? tid : null;
  if (newTid === _hoverTid) return;
  _hoverTid = newTid;
  if (newTid) applyChainHighlight(newTid);
  else clearChainHighlight();
});
```

Change to:
```javascript
svgEl_root.addEventListener('mousemove', (e) => {
  const tid = e.target.dataset.tid;
  const newTid = (tid && findTask(tid)) ? tid : null;
  if (newTid === _hoverTid) return;
  _hoverTid = newTid;
  if (newTid) { applyChainHighlight(newTid); showTaskPopup(newTid); }
  else { clearChainHighlight(); hideTaskPopup(); }
});
```

**Step 4: Update the `mouseleave` handler**

Find the existing `mouseleave` handler (around line 823):
```javascript
svgEl_root.addEventListener('mouseleave', () => {
  if (!_hoverTid) return;
  _hoverTid = null;
  clearChainHighlight();
});
```

Change to:
```javascript
svgEl_root.addEventListener('mouseleave', () => {
  if (!_hoverTid) return;
  _hoverTid = null;
  clearChainHighlight();
  hideTaskPopup();
});
```

**Step 5: Manual verification**

Run `uv run app` and open `http://localhost:8000`. Verify:
- Hovering a task bar shows the popup below it with tags (colored pills) and assignee
- Moving to another task immediately updates the popup
- Moving off the chart fades the popup out
- Tasks with no tags show no tags row (just assignee)
- Tasks with no assignee show `👤 —`
- Popup doesn't interfere with clicking or dragging task bars

**Step 6: Run backend tests to confirm no regressions**

```
uv run pytest -v
```
Expected: 28 passed.

**Step 7: Commit**

```bash
git add static/app.js
git commit -m "feat: show task tags and assignee in hover popover"
```
