# Overdue Detection — Design

**Date:** 2026-03-05

## Summary

Tasks past their end date without 100% completion are visually flagged with a red inset border on the task bar. Pure frontend change, no backend modifications.

## Overdue Condition

A task is overdue when:
- `today > task.end` (strictly past the end date, not on it)
- `(task.progress ?? 0) < 100` (null progress counts as not done)

## Visual Treatment

A `fill: none` SVG rect drawn inside the bar:
- Position: `barX+1, barY+1`
- Size: `barW-2, barH-2`
- Style: `rx: 3, stroke: #dc2626, stroke-width: 2, pointer-events: none`

Sits on top of the bar and progress overlay without affecting click/drag. The existing selection ring (offset `-2`, blue) is outset — no conflict.

## Implementation

One helper function added to `app.js`:
```javascript
function isOverdue(t) {
  return parseDate(t.end) < today() && (t.progress ?? 0) < 100;
}
```

Called inside `renderTask` for regular bars only. Milestones (early return path) are skipped.

## Out of Scope

- Label column styling for overdue tasks
- Overdue indicator in hover popup
- Backend changes
- Group-level overdue rollup
