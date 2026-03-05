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
- [ ] Drag groups to reorder (replace reorder API with drag-and-drop)
- [ ] Undo / redo

### View
- [x] Zoom levels (week / month / quarter / year)
- [ ] Scroll to today on load
- [ ] Task dependency arrows between bars
- [ ] Milestone markers (diamond shape, zero-duration tasks)

### Data
- [ ] Multiple roadmap files (file picker / switcher)
- [ ] Import from clipboard or URL
- [ ] Task progress percentage (partially filled bar)
- [ ] Task assignees / owners

### Bugs
- [x] Color picker in Add/Edit Group modal shows no preview of the selected color (input renders as blank/grey bar; color is picked but not visually reflected in the field)
- [x] "+" add task button sits on the bottom border of the group header row, overlapping with the first task row below it — needs to be vertically centered within the group header

### UX
- [ ] Keyboard shortcuts (n = new task, e = edit selected, del = delete)
- [ ] Search / filter tasks by name
- [ ] Print / export to PNG or PDF
