import pytest
from datetime import date
from pydantic import ValidationError
from roadmaptool.models import Roadmap, Group, Task


def test_valid_roadmap():
    r = Roadmap(
        title="Test",
        start=date(2025, 1, 1),
        end=date(2025, 12, 31),
        groups=[],
    )
    assert r.title == "Test"


def test_roadmap_start_must_be_before_end():
    with pytest.raises(ValidationError, match="start must be before end"):
        Roadmap(title="Bad", start=date(2025, 12, 31), end=date(2025, 1, 1), groups=[])


def test_task_end_must_not_be_before_start():
    with pytest.raises(ValidationError, match="start must be before or equal to end"):
        Task(id="t1", name="Bad", start=date(2025, 3, 1), end=date(2025, 2, 1))


def test_group_id_must_be_slug():
    with pytest.raises(ValidationError, match="id must be alphanumeric"):
        Group(id="has spaces", name="X", color="#FF0000", collapsed=False, tasks=[])


def test_task_ids_unique_in_roadmap():
    with pytest.raises(ValidationError, match="duplicate task id"):
        Roadmap(
            title="T", start=date(2025, 1, 1), end=date(2025, 12, 31),
            groups=[
                Group(id="g1", name="G1", color="#FF0000", collapsed=False, tasks=[
                    Task(id="dup", name="A", start=date(2025, 1, 1), end=date(2025, 2, 1)),
                    Task(id="dup", name="B", start=date(2025, 1, 1), end=date(2025, 2, 1)),
                ])
            ]
        )
