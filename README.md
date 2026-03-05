# Roadmap Tool

A browser-based Gantt/roadmap visualizer. Edit your roadmap in the UI or directly in `roadmap.yaml`.

## Quick Start

```
uv sync
uv run app
```

Open http://localhost:8000

## Editing roadmap.yaml directly

The roadmap is stored in `roadmap.yaml` at the project root. Edit it with any text editor.
The server picks up changes on the next API call (no restart needed).

## Running tests

```
uv run pytest -v
```
