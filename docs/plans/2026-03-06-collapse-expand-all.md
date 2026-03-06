# Collapse All / Expand All Buttons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Collapse all" and "Expand all" buttons above the SVG chart that batch-toggle all group collapse states in one undo-able action.

**Architecture:** Two buttons live inside the existing `#filter-bar` div. Their visibility is controlled each render cycle by `renderFilterBar()` based on group state. Click handlers call `mutate()` so the action is undoable.

**Tech Stack:** Vanilla JS, HTML, existing `.btn .btn--filter` CSS classes — no new dependencies.

---

### Task 1: Add buttons to HTML

**Files:**
- Modify: `static/index.html:69-79`

**Step 1: Add the two buttons inside `#filter-bar`, before the `<select>` elements**

Open `static/index.html`. Find the `#filter-bar` div (line 69). Add the two buttons as the first children, before the assignee select:

```html
  <div id="filter-bar" class="filter-bar hidden">
    <button id="btn-collapse-all" class="btn btn--filter hidden">Collapse all</button>
    <button id="btn-expand-all" class="btn btn--filter hidden">Expand all</button>
    <select id="filter-assignee" class="filter-select">
```

Both start as `hidden` — `renderFilterBar()` will control their visibility.

**Step 2: Verify HTML renders without errors**

Start the dev server (`RELOAD=true uv run app`) and open `http://localhost:8000`. Confirm the page loads without console errors. The buttons are not visible yet (correct — they're hidden).

**Step 3: Commit**

```bash
git add static/index.html
git commit -m "feat: add collapse-all/expand-all button elements to filter bar"
```

---

### Task 2: Wire up JS logic

**Files:**
- Modify: `static/app.js` — `renderFilterBar()` (~line 290) and event listeners section

**Step 1: Add visibility logic to `renderFilterBar()`**

In `static/app.js`, find `renderFilterBar()` (~line 290). At the end of the function, after the `filter-clear` line, add:

```javascript
  const anyExpanded = state.groups.some(g => !g.collapsed);
  const anyCollapsed = state.groups.some(g => g.collapsed);
  document.getElementById('btn-collapse-all').classList.toggle('hidden', !anyExpanded);
  document.getElementById('btn-expand-all').classList.toggle('hidden', !anyCollapsed);
```

The full end of `renderFilterBar()` should now read:

```javascript
  const hasFilter = filterState.assignee || filterState.tag || filterState.overdueOnly || filterState.hideCompleted;
  document.getElementById('filter-clear').classList.toggle('hidden', !hasFilter);
  document.getElementById('btn-swimlane').classList.toggle('active', swimlaneMode);

  const anyExpanded = state.groups.some(g => !g.collapsed);
  const anyCollapsed = state.groups.some(g => g.collapsed);
  document.getElementById('btn-collapse-all').classList.toggle('hidden', !anyExpanded);
  document.getElementById('btn-expand-all').classList.toggle('hidden', !anyCollapsed);
}
```

**Step 2: Add click event listeners**

Find the block where other filter button listeners are registered (search for `filter-overdue` click handler). Add the two new listeners nearby:

```javascript
document.getElementById('btn-collapse-all').addEventListener('click', () => {
  mutate(() => { state.groups.forEach(g => { g.collapsed = true; }); });
});

document.getElementById('btn-expand-all').addEventListener('click', () => {
  mutate(() => { state.groups.forEach(g => { g.collapsed = false; }); });
});
```

**Step 3: Verify manually**

1. Load the app with a roadmap that has multiple groups.
2. All groups expanded → only "Collapse all" is visible.
3. Click "Collapse all" → all groups collapse, button changes to "Expand all" only.
4. Click "Expand all" → all groups expand, back to "Collapse all" only.
5. Manually collapse one group → both buttons appear simultaneously.
6. Press Ctrl+Z (undo) after collapsing all → groups re-expand in one step.
7. Individual group ▶/▼ toggles still work correctly.

**Step 4: Commit**

```bash
git add static/app.js
git commit -m "feat: implement collapse all / expand all group buttons"
```
