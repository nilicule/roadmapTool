import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from roadmaptool.api import router

BASE_DIR = Path(__file__).parent.parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Roadmap Tool")
app.include_router(router, prefix="/api")
app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


def run():
    uvicorn.run("roadmaptool.main:app", host="127.0.0.1", port=8000, reload=True)
