# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
uv sync --dev          # install all dependencies
RELOAD=true uv run app # start dev server at http://localhost:8000 (hot reload enabled)
uv run pytest -v       # run all tests
uv run pytest tests/test_models.py::test_valid_roadmap -v  # run a single test
```

## Architecture

**Backend:** FastAPI app (`src/roadmaptool/`) served via `uv run app` → `roadmaptool.main:run`.

- `main.py` — FastAPI app, mounts `/api` router and serves `static/` as SPA root
- `models.py` — Pydantic v2 models: `Roadmap > Group > Task`, with slug/hex/date/uniqueness validators
- `parser.py` — ruamel.yaml `load_roadmap` / `save_roadmap`; exposes `_yaml` instance (used by `api.py` for export)
- `api.py` — all REST routes; `ROADMAP_PATH` module-level variable is monkeypatched in tests to a temp file

**Frontend:** Single-page app in `static/` — no build step, no framework.

- `app.js` — loads roadmap from `/api/roadmap`, renders SVG directly via DOM (`svgEl` helper), event delegation on the SVG for clicks
- SVG layout constants at top of `app.js`: `LABEL_W=220`, `HEADER_H=40`, `GROUP_H=34`, `TASK_H=30`
- Modal system is generic (`openModal(title, fields, onSave, onDelete)`) — group/task modals compose it

**Data:** `roadmap.yaml` at project root is the single source of truth. Every mutating API call re-writes it atomically. The server picks up direct file edits on the next request.

**Tests:** `tests/conftest.py` copies `roadmap.yaml` to a temp file and monkeypatches `api.ROADMAP_PATH` so tests never touch the real file.
