import os
import uvicorn
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from roadmaptool.api import router

BASE_DIR = Path(__file__).parent.parent.parent
STATIC_DIR = BASE_DIR / "static"

ROOT_PATH = os.environ.get("ROOT_PATH", "").rstrip("/")  # e.g. "/roadmap"

app = FastAPI(title="Roadmap Tool")
app.include_router(router, prefix="/api")

_index_html = (STATIC_DIR / "index.html").read_text()
if ROOT_PATH:
    _index_html = _index_html.replace(
        "<head>", f'<head>\n  <base href="{ROOT_PATH}/">', 1
    )


@app.get("/")
async def index():
    return HTMLResponse(content=_index_html)


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


def run():
    reload = os.environ.get("RELOAD", "").lower() in ("1", "true", "yes")
    uvicorn.run("roadmaptool.main:app", host="0.0.0.0", port=5006, reload=reload)
