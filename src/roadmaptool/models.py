import re
from datetime import date
from pydantic import BaseModel, field_validator, model_validator

SLUG_RE = re.compile(r'^[a-z0-9_]+$')


class Task(BaseModel):
    id: str
    name: str
    start: date
    end: date
    assignee: str | None = None
    notes: str | None = None
    depends_on: list[str] = []
    progress: int | None = None
    tags: list[str] = []

    @field_validator('progress')
    @classmethod
    def check_progress(cls, v):
        if v is not None and not (0 <= v <= 100):
            raise ValueError('progress must be 0–100')
        return v

    @model_validator(mode='after')
    def check_dates(self):
        if self.end < self.start:
            raise ValueError("end must be on or after start")
        return self

    @field_validator('id')
    @classmethod
    def id_must_be_slug(cls, v):
        if not SLUG_RE.match(v):
            raise ValueError("id must be alphanumeric (lowercase letters, digits, underscores)")
        return v


class Group(BaseModel):
    id: str
    name: str
    color: str
    collapsed: bool = False
    tasks: list[Task] = []
    depends_on: list[str] = []

    @field_validator('id')
    @classmethod
    def id_must_be_slug(cls, v):
        if not SLUG_RE.match(v):
            raise ValueError("id must be alphanumeric (lowercase letters, digits, underscores)")
        return v

    @field_validator('color')
    @classmethod
    def color_must_be_hex(cls, v):
        if not re.match(r'^#[0-9a-fA-F]{6}$', v):
            raise ValueError("color must be a hex color like #FF0000")
        return v


class Roadmap(BaseModel):
    title: str
    start: date
    end: date
    groups: list[Group] = []

    @model_validator(mode='after')
    def check_dates(self):
        if self.end <= self.start:
            raise ValueError("start must be before end")
        return self

    @model_validator(mode='after')
    def check_unique_task_ids(self):
        seen = set()
        for group in self.groups:
            for task in group.tasks:
                if task.id in seen:
                    raise ValueError(f"duplicate task id: {task.id!r}")
                seen.add(task.id)
        return self

    @model_validator(mode='after')
    def check_no_dependency_cycles(self):
        deps: dict[str, list[str]] = {}
        for g in self.groups:
            for t in g.tasks:
                deps[t.id] = list(t.depends_on)
            deps[g.id] = list(g.depends_on)

        WHITE, GRAY, BLACK = 0, 1, 2
        color = {n: WHITE for n in deps}

        def dfs(n: str) -> bool:
            color[n] = GRAY
            for dep in deps.get(n, []):
                if dep not in color:
                    continue
                if color[dep] == GRAY:
                    return True
                if color[dep] == WHITE and dfs(dep):
                    return True
            color[n] = BLACK
            return False

        for n in list(color.keys()):
            if color[n] == WHITE and dfs(n):
                raise ValueError("dependency graph contains a cycle")
        return self
