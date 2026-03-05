# TODO

## Completed (v1)

- [x] FastAPI backend serving single-page app
- [x] YAML storage with ruamel.yaml, Pydantic v2 validation
- [x] SVG Gantt timeline: month headers, today marker, group rows, task bars
- [x] Collapsible groups
- [x] Add / edit / delete groups and tasks via modal UI
- [x] Reorder groups API
- [x] Export roadmap.yaml download
- [x] Error toasts on API failures
- [x] Full test suite (18 tests)

## Post-MVP

### Interactions
- [x] Drag task bars to move dates
- [x] Drag bar edges to resize (change start/end)
- [x] Drag groups to reorder (replace reorder API with drag-and-drop)
- [x] Undo / redo

### View
- [x] Zoom levels (week / month / quarter / year)
- [x] Scroll to / jump-to-today button or auto-scroll on load — today marker line exists but may be off-screen; need a way to navigate to it
- [x] Task dependency arrows between bars
- [x] Collapsed group summary bar (thin bar shown when group is collapsed)
- [x] Milestone markers (diamond shape, zero-duration tasks)

### Data
- [x] Import from clipboard or URL
- [x] Task progress percentage (partially filled bar; group shows aggregate progress)
- [x] Load roadmap from remote YAML URL via `?url=` query string — on page load, if `?url=<remote>` is present, fetch and import that YAML automatically
- [x] Task assignees / owners

### Bugs
- [x] Dependency arrows not visible when source or target group is collapsed — when a group collapses, its tasks lose their `barPos` entries; arrows to/from those tasks disappear
- [x] Color picker in Add/Edit Group modal shows no preview of the selected color (input renders as blank/grey bar; color is picked but not visually reflected in the field)
- [x] "+" add task button sits on the bottom border of the group header row, overlapping with the first task row below it — needs to be vertically centered within the group header

### UX
- [ ] Keyboard shortcuts (n = new task, e = edit selected, del = delete)
- [ ] Search / filter tasks by name
- [x] Export to PNG
