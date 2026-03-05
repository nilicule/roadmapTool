import re
from datetime import date
from pydantic import BaseModel, field_validator, model_validator

SLUG_RE = re.compile(r'^[a-z0-9_]+$')


class Task(BaseModel):
    id: str
    name: str
    start: date
    end: date

    @model_validator(mode='after')
    def check_dates(self):
        if self.end < self.start:
            raise ValueError("start must be before or equal to end")
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
