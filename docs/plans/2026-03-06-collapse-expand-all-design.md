# Design: Collapse All / Expand All Buttons

## Overview

Add two buttons above the SVG chart that let users collapse or expand all groups at once, complementing the existing per-group toggle.

## Button Logic

| Button | Visible when | Action |
|--------|-------------|--------|
| "Collapse all" | Any group is expanded (`!g.collapsed`) | Set all groups `collapsed = true` |
| "Expand all" | Any group is collapsed (`g.collapsed`) | Set all groups `collapsed = false` |

Both buttons can be visible simultaneously in a mixed state (some groups collapsed, some expanded).

## Placement

Inside the existing `#filter-bar` div, before the assignee/tag selects. The filter bar already appears above the SVG chart and is shown/hidden with the roadmap.

## Implementation

- **HTML:** Two `<button>` elements (`#btn-collapse-all`, `#btn-expand-all`) using existing `.btn .btn--filter` classes, with `.hidden` for visibility control.
- **JS:** Two click event listeners + `updateGroupToggleButtons()` helper that checks state and applies `.hidden`. Called from `render()` so buttons stay in sync after individual group toggles.
- **CSS:** No new styles needed — reuses `.btn` and `.btn--filter`.

## Undo Support

Each button triggers a single `mutate()` call, making the entire collapse/expand operation a single undoable step.
