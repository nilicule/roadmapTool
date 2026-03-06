import pytest
from pathlib import Path
import tempfile
from roadmaptool.parser import load_roadmap, save_roadmap
from roadmaptool.models import Roadmap

SAMPLE_YAML_CONTENT = """\
title: My Awesome Project Roadmap
start: '2025-01-01'
end: '2025-12-31'
groups:
  - id: phase1
    name: Phase 1
    color: '#4f46e5'
    tasks:
      - id: task1
        name: Task One
        start: '2025-01-01'
        end: '2025-03-31'
      - id: task2
        name: Task Two
        start: '2025-04-01'
        end: '2025-06-30'
  - id: phase2
    name: Phase 2
    color: '#7c3aed'
    tasks:
      - id: task3
        name: Task Three
        start: '2025-07-01'
        end: '2025-09-30'
  - id: phase3
    name: Phase 3
    color: '#db2777'
    tasks:
      - id: task4
        name: Task Four
        start: '2025-10-01'
        end: '2025-12-31'
"""


@pytest.fixture
def sample_yaml(tmp_path):
    p = tmp_path / "roadmap.yaml"
    p.write_text(SAMPLE_YAML_CONTENT)
    return p


def test_load_roadmap_from_file(sample_yaml):
    roadmap = load_roadmap(sample_yaml)
    assert roadmap.title == "My Awesome Project Roadmap"
    assert len(roadmap.groups) >= 3
    assert roadmap.groups[0].id == "phase1"
    assert len(roadmap.groups[0].tasks) >= 2


def test_load_roadmap_validates_schema():
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode='w', delete=False) as f:
        f.write("title: Bad\nstart: '2025-12-31'\nend: '2025-01-01'\ngroups: []\n")
        path = Path(f.name)
    with pytest.raises(ValueError, match="start must be before end"):
        load_roadmap(path)


def test_round_trip_preserves_data(sample_yaml):
    original = load_roadmap(sample_yaml)
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode='w', delete=False) as f:
        path = Path(f.name)
    save_roadmap(original, path)
    reloaded = load_roadmap(path)
    assert reloaded.title == original.title
    assert len(reloaded.groups) == len(original.groups)
    assert reloaded.groups[0].tasks[0].name == original.groups[0].tasks[0].name


def test_round_trip_is_stable(sample_yaml):
    """Exporting twice produces identical YAML bytes."""
    original = load_roadmap(sample_yaml)
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode='w', delete=False) as f:
        path1 = Path(f.name)
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode='w', delete=False) as f:
        path2 = Path(f.name)
    save_roadmap(original, path1)
    save_roadmap(original, path2)
    assert path1.read_text() == path2.read_text()
