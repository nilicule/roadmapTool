# Roadmap Tool

A browser-based Gantt/roadmap visualizer. Define your roadmap in YAML and edit it through a visual UI — no database, no build step.

## Quick Start

```bash
uv sync
uv run app
```

Open http://localhost:5006

For hot reload during development:

```bash
RELOAD=true uv run app
```

## Features

- **SVG timeline** — renders groups and tasks as a scrollable Gantt chart
- **Click to edit** — click any group or task to open an edit modal
- **Filters** — filter by assignee, tag, overdue status, or hide completed tasks
- **Swimlane view** — toggle grouping by assignee
- **Undo / redo** — full history with Ctrl+Z / Ctrl+Y
- **Zoom** — switch between day, week, month, quarter, and year views
- **Dependencies** — declare `depends_on` between tasks or groups; cycles are rejected
- **Progress** — optional 0–100 progress field renders as a fill on task bars
- **Import / Export** — load a YAML file from disk or download the current roadmap
- **Export PNG** — screenshot the SVG to a PNG file
- **Read-only mode** — display a roadmap from a remote source URL without editing
- **Templates** — start from a pre-built roadmap structure

## Data Model

The roadmap is stored as `roadmap.yaml`. The structure is:

```yaml
title: My Roadmap
start: 2025-01-01
end: 2025-12-31
groups:
  - id: backend
    name: Backend
    color: "#4A90D9"
    tasks:
      - id: auth
        name: Authentication
        start: 2025-01-15
        end: 2025-02-28
        assignee: Alice
        progress: 80
        tags: [security]
        depends_on: []
        notes: OAuth2 + JWT
```

**Constraints enforced by the server:**

- `id` fields must be lowercase alphanumeric + underscores
- `color` must be a hex color (`#RRGGBB`)
- Task and group `end` must be on or after `start`
- Task IDs must be unique across the entire roadmap
- `depends_on` must not form cycles

The server picks up direct edits to `roadmap.yaml` on the next request — no restart needed.

## Deployment

To serve the app under a sub-path (e.g. behind a reverse proxy at `/roadmap`):

```bash
ROOT_PATH=/roadmap uv run app
```

## Running Tests

```bash
uv run pytest -v
```

Tests use a temporary copy of `roadmap.yaml` and never touch the real file.

## Architecture

| Layer | Technology |
|---|---|
| Backend | FastAPI + uvicorn |
| Frontend | Vanilla JS SPA (no framework, no build step) |
| Data | `roadmap.yaml` (ruamel.yaml) |
| Validation | Pydantic v2 |

- `src/roadmaptool/main.py` — FastAPI app, mounts the API router and serves `static/` as the SPA root
- `src/roadmaptool/api.py` — REST routes for import and export
- `src/roadmaptool/models.py` — Pydantic models: `Roadmap > Group > Task`
- `src/roadmaptool/parser.py` — YAML load/save with ruamel.yaml
- `static/app.js` — all frontend logic: SVG rendering, modals, undo/redo, filters
