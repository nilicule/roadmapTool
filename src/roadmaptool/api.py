import re
import uuid
from datetime import date as date_type
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, field_validator
import io

from roadmaptool.models import Roadmap, Group, Task
from roadmaptool.parser import load_roadmap, save_roadmap, _yaml

router = APIRouter()
ROADMAP_PATH = Path(__file__).parent.parent.parent / "roadmap.yaml"


def _load() -> Roadmap:
    return load_roadmap(ROADMAP_PATH)


def _save(roadmap: Roadmap) -> None:
    save_roadmap(roadmap, ROADMAP_PATH)


def _slug(name: str) -> str:
    base = re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')
    return f"{base}_{uuid.uuid4().hex[:6]}"


# --- Roadmap ---

@router.get("/roadmap")
def get_roadmap():
    return _load().model_dump(mode="json")


@router.put("/roadmap")
def update_roadmap_meta(data: dict):
    rm = _load()
    updated = rm.model_copy(update={k: v for k, v in data.items() if k in ("title", "start", "end")})
    _save(updated)
    return updated.model_dump(mode="json")


@router.get("/roadmap/export", response_class=PlainTextResponse)
def export_roadmap():
    rm = _load()
    buf = io.StringIO()
    _yaml.dump(rm.model_dump(mode="json"), buf)
    return PlainTextResponse(
        content=buf.getvalue(),
        media_type="text/yaml",
        headers={"Content-Disposition": "attachment; filename=roadmap.yaml"}
    )


@router.put("/roadmap/restore")
def restore_roadmap(rm: Roadmap):
    _save(rm)
    return rm.model_dump(mode="json")


@router.post("/roadmap/import")
async def import_roadmap(request: Request):
    body = await request.body()
    text = body.decode("utf-8")
    try:
        raw = _yaml.load(text)
        roadmap = Roadmap.model_validate(raw)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
    _save(roadmap)
    return roadmap.model_dump(mode="json")


# --- Groups ---

class GroupCreate(BaseModel):
    name: str
    color: str

    @field_validator('color')
    @classmethod
    def color_must_be_hex(cls, v):
        if not re.match(r'^#[0-9a-fA-F]{6}$', v):
            raise ValueError("color must be a hex color like #FF0000")
        return v


class GroupUpdate(BaseModel):
    name: str
    color: str
    collapsed: bool
    depends_on: list[str] = []


@router.post("/groups")
def add_group(body: GroupCreate):
    rm = _load()
    group = Group(id=_slug(body.name), name=body.name, color=body.color, collapsed=False, tasks=[])
    rm.groups.append(group)
    _save(rm)
    return group.model_dump(mode="json")


@router.put("/groups/{gid}")
def update_group(gid: str, body: GroupUpdate):
    rm = _load()
    for g in rm.groups:
        if g.id == gid:
            g.name = body.name
            g.color = body.color
            g.collapsed = body.collapsed
            g.depends_on = body.depends_on
            _save(rm)
            return g.model_dump(mode="json")
    raise HTTPException(status_code=404, detail=f"Group {gid!r} not found")


@router.delete("/groups/{gid}")
def delete_group(gid: str):
    rm = _load()
    rm.groups = [g for g in rm.groups if g.id != gid]
    _save(rm)
    return {"ok": True}


class ReorderBody(BaseModel):
    ids: list[str]


@router.post("/groups/reorder")
def reorder_groups(body: ReorderBody):
    rm = _load()
    index = {g.id: g for g in rm.groups}
    rm.groups = [index[i] for i in body.ids if i in index]
    _save(rm)
    return {"ok": True}


# --- Tasks ---

class TaskCreate(BaseModel):
    name: str
    start: str
    end: str
    assignee: str | None = None
    depends_on: list[str] = []
    progress: int | None = None
    tags: list[str] = []


class TaskUpdate(BaseModel):
    name: str
    start: str
    end: str
    assignee: str | None = None
    depends_on: list[str] = []
    progress: int | None = None
    tags: list[str] = []


@router.post("/groups/{gid}/tasks")
def add_task(gid: str, body: TaskCreate):
    rm = _load()
    for g in rm.groups:
        if g.id == gid:
            task = Task(id=_slug(body.name), name=body.name, start=body.start, end=body.end,
                        assignee=body.assignee, depends_on=body.depends_on,
                        progress=body.progress, tags=body.tags)
            g.tasks.append(task)
            _save(rm)
            return task.model_dump(mode="json")
    raise HTTPException(status_code=404, detail=f"Group {gid!r} not found")


@router.put("/tasks/{tid}")
def update_task(tid: str, body: TaskUpdate):
    rm = _load()
    for g in rm.groups:
        for t in g.tasks:
            if t.id == tid:
                t.name = body.name
                t.start = date_type.fromisoformat(body.start)
                t.end = date_type.fromisoformat(body.end)
                t.assignee = body.assignee
                t.depends_on = body.depends_on
                t.progress = body.progress
                t.tags = body.tags
                _save(rm)
                return t.model_dump(mode="json")
    raise HTTPException(status_code=404, detail=f"Task {tid!r} not found")


@router.delete("/tasks/{tid}")
def delete_task(tid: str):
    rm = _load()
    for g in rm.groups:
        g.tasks = [t for t in g.tasks if t.id != tid]
    _save(rm)
    return {"ok": True}
