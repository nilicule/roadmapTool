# Task Hover Popover — Design

**Date:** 2026-03-05

## Summary

When the mouse hovers over a task bar, a floating popover appears below the bar showing the task's tags (as colored pills) and assignee. The popover floats on top of the chart — no row expansion, no layout shift.

## Structure

A single `<div id="task-popup">` inside `.chart-container` in `index.html`. `.chart-container` gets `position: relative`. The popup is `position: absolute`, initially invisible.

## Content

```
[security]  [backend]       ← colored pills (tagColor() per tag)
👤 Alice                    ← assignee, or "—" if none
```

Tags row omitted entirely if task has no tags. Assignee row always shown.

## Animation

CSS transition on the popup: `opacity 0→1` and `transform: translateY(6px→0)` in 150ms ease-out. Toggled via a `.visible` class. A short hide delay (via `setTimeout`, ~120ms) prevents flicker when the cursor briefly passes over the gap between bar and popup.

## Positioning

When `_hoverTid` changes to a non-null task ID, read from `barPos[tid]` (populated every render):

```
left = barPos[tid].x - container.scrollLeft
top  = barPos[tid].y + barPos[tid].h + 6 - container.scrollTop
```

Clamp `left` so the popup doesn't overflow the container's right edge.

## Trigger

Reuse the existing `mousemove` SVG handler that already sets `_hoverTid`. When `_hoverTid` becomes non-null, populate and show the popup. On `mouseleave` of the SVG root, hide it.

## Non-interaction

`pointer-events: none` on the popup — it never intercepts mouse events.

## Out of Scope

- Showing popup for group bars
- Showing popup for milestones
- Click/interaction inside the popup
