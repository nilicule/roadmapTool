# Task Tags — Design

**Date:** 2026-03-05

## Summary

Add free-form string tags to tasks, displayed as small colored squares on the right side of task bars (alongside the assignee initial), and editable via a comma-separated text field in the task modal.

## Data Model

Add `tags: list[str] = []` to the `Task` Pydantic model. Tags are free-form strings with no validation beyond being non-empty after trimming. YAML representation:

```yaml
tags:
  - security
  - backend
```

`TaskCreate` and `TaskUpdate` in `api.py` also gain a `tags: list[str] = []` field.

## Color Assignment

Each tag string is hashed (simple sum of char codes mod 360) to produce a hue. Color is `hsl(H, 65%, 48%)` — consistent per tag name across all tasks, visually distinct.

## Bar Rendering

Small 10×10px rounded squares (rx=2) rendered inside the task bar on the right side, to the left of the assignee circle. Spacing: 4px between squares, 6px from the right edge (or from the assignee circle when present). `pointer-events: none` so they don't interfere with drag or click handling.

If a bar is too narrow to show tags without overlapping the task name, squares are clipped (they simply won't appear when there's no room).

## Modal

A text input labeled **Tags** with placeholder `security, backend, ...`. On load: `tags.join(', ')`. On save: split by comma, trim each, filter empty strings.

## Out of Scope

- Tag filtering / search in the UI
- Predefined tag list or tag management screen
- Tag display in the group summary bar
