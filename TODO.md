# TODO

## UX / Interactions

- [ ] `Delete`/`Backspace` key shortcut to delete the selected task
- [ ] Duplicate/copy task — no way to clone an existing task from the UI
- [ ] Collapse all / Expand all button for groups
- [ ] Cross-group task move — drag a task row into a different group (currently same-group only)
- [ ] Show start/end dates in the task hover popup (only name, assignee, and tags are shown today)

## Data model

- [ ] Task notes/description field — free-text per task; not in model or UI
- [ ] Multiple dependencies per task — the model already stores `depends_on: list[str]` but the edit modal only exposes a single `<select>`; needs a multi-select or tag-input widget

## Toolbar / Roadmap management

- [ ] Roadmap date range editing from the UI — `PUT /roadmap` exists but there is no button/modal to change the global start/end dates or title

---

## Filtering & Search

- [ ] Filter by assignee — toolbar dropdown to show only tasks belonging to one person; unmatched tasks dimmed or hidden
- [ ] Filter by tag — same pattern; clicking a tag pill in the legend or toolbar filters to tasks carrying that tag
- [ ] Search tasks by name — text input that highlights or isolates matching tasks as you type
- [ ] Hide completed tasks — toggle to suppress tasks with progress = 100 (useful when a roadmap is long-running)
- [ ] Filter overdue tasks — one-click view of tasks past their end date with < 100% progress

## Alternative Views

- [ ] List / table view — spreadsheet-style view of all tasks (name, group, assignee, dates, progress, tags) as an alternative to the Gantt; useful for bulk reviewing
- [ ] By-assignee swimlane — collapse tasks into rows per person instead of per group, so workload is immediately visible
- [ ] Critical path highlighting — colour the chain of tasks that determines the earliest possible finish date

## Workload & Reporting

- [ ] Workload summary panel — per-assignee count of tasks and aggregate % complete; answers "who is overloaded?"
- [ ] Summary stats bar — headline numbers: total tasks, % complete, overdue count, days until end
- [ ] Milestone list — dedicated sidebar or panel listing all milestones in date order with their status

## Export

- [ ] CSV / spreadsheet export — flat table of tasks for stakeholders who don't use YAML
- [ ] PDF export — single-page landscape print-friendly output (SVG → PDF via browser print)

## Multi-file / Project Management

- [ ] Multiple roadmap files — currently hardcoded to a single `roadmap.yaml`; support named files or a project switcher backed by the local filesystem
- [ ] Roadmap templates — start from a pre-built template (e.g. "Software Launch", "Quarterly Planning") rather than from scratch
