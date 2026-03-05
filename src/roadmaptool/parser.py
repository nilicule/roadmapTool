import io
from pathlib import Path
from ruamel.yaml import YAML
from roadmaptool.models import Roadmap

_yaml = YAML()
_yaml.default_flow_style = False
_yaml.width = 120


def load_roadmap(path: Path) -> Roadmap:
    """Load and validate a roadmap YAML file."""
    raw = _yaml.load(path.read_text())
    if raw is None:
        raise ValueError("Empty YAML file")
    try:
        return Roadmap.model_validate(raw)
    except Exception as e:
        raise ValueError(f"Roadmap validation failed: {e}") from e


def save_roadmap(roadmap: Roadmap, path: Path) -> None:
    """Write roadmap to YAML, deterministically."""
    data = roadmap.model_dump(mode="json")
    buf = io.StringIO()
    _yaml.dump(data, buf)
    path.write_text(buf.getvalue(), encoding="utf-8")
