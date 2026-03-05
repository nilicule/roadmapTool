import pytest
from pathlib import Path
import tempfile
from roadmaptool.parser import load_roadmap, save_roadmap
from roadmaptool.models import Roadmap

SAMPLE_YAML = Path(__file__).parent.parent / "roadmap.yaml"


def test_load_roadmap_from_file():
    roadmap = load_roadmap(SAMPLE_YAML)
    assert roadmap.title == "My Project Roadmap"
    assert len(roadmap.groups) == 2
    assert roadmap.groups[0].id == "phase1"
    assert len(roadmap.groups[0].tasks) == 2


def test_load_roadmap_validates_schema():
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode='w', delete=False) as f:
        f.write("title: Bad\nstart: '2025-12-31'\nend: '2025-01-01'\ngroups: []\n")
        path = Path(f.name)
    with pytest.raises(ValueError, match="start must be before end"):
        load_roadmap(path)


def test_round_trip_preserves_data():
    original = load_roadmap(SAMPLE_YAML)
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode='w', delete=False) as f:
        path = Path(f.name)
    save_roadmap(original, path)
    reloaded = load_roadmap(path)
    assert reloaded.title == original.title
    assert len(reloaded.groups) == len(original.groups)
    assert reloaded.groups[0].tasks[0].name == original.groups[0].tasks[0].name


def test_round_trip_is_stable():
    """Exporting twice produces identical YAML bytes."""
    original = load_roadmap(SAMPLE_YAML)
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode='w', delete=False) as f:
        path1 = Path(f.name)
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode='w', delete=False) as f:
        path2 = Path(f.name)
    save_roadmap(original, path1)
    save_roadmap(original, path2)
    assert path1.read_text() == path2.read_text()
