# Overdue Detection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Flag overdue task bars with a red inset border — tasks whose end date is in the past and whose progress is not 100%.

**Architecture:** Two additions to `static/app.js`: a pure `isOverdue(t)` helper function, and a red `fill:none` inset rect drawn inside the bar in `renderTask`. No backend changes. The selection ring (blue, outset -2px) is unaffected — the overdue border is inset (+1px) so they never conflict.

**Tech Stack:** Vanilla JS, SVG.

---

## Task 1: Add `isOverdue` helper and render the overdue border

**Files:**
- Modify: `static/app.js`

**Step 1: Add `isOverdue` helper after `tagColor`**

In `static/app.js`, after the `tagColor` function (currently ending at line 44), add:

```javascript
function isOverdue(t) {
  return parseDate(t.end) < today() && (t.progress ?? 0) < 100;
}
```

`parseDate` and `today` are already defined just above. `t.progress ?? 0` treats null/undefined progress as 0 (not done).

**Step 2: Add the overdue inset border in `renderTask`**

In `renderTask`, after `barPos[t.id] = ...` (currently line 401) and before the `if (t.id === selectedTid)` selection ring block (currently line 403), insert:

```javascript
  // Overdue inset border
  if (isOverdue(t)) {
    svg.appendChild(svgEl('rect', {
      x: barX + 1, y: barY + 1, width: barW - 2, height: barH - 2,
      rx: 3, fill: 'none', stroke: '#dc2626', 'stroke-width': 2, 'pointer-events': 'none'
    }));
  }
```

- `barX + 1, barY + 1` — inset 1px from bar edges (never overlaps selection ring which is outset -2px)
- `barW - 2, barH - 2` — shrunk to match the 1px inset on both sides
- `rx: 3` — slightly less than bar's rx of 4 to sit neatly inside
- `fill: 'none'` — transparent, doesn't obscure bar content
- `pointer-events: none` — won't interfere with drag/click

**Step 3: Run all tests to confirm no regressions**

```
uv run pytest -v
```
Expected: 28 passed.

**Step 4: Manual verification**

Run `uv run app` and open `http://localhost:8000`. To test:
- Find any task whose end date is before today (2026-03-05) and progress < 100 — it should show a red inset border
- A task with progress = 100 and past end date should NOT show the border
- A task with a future end date should NOT show the border
- Select an overdue task with keyboard (arrow keys) — blue selection ring (outset) and red overdue ring (inset) should both be visible simultaneously with no overlap
- Drag an overdue task — border updates correctly after re-render

**Step 5: Commit**

```bash
git add static/app.js
git commit -m "feat: flag overdue tasks with red inset border"
```
