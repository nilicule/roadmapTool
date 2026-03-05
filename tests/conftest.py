import pytest
import shutil
from pathlib import Path
from fastapi.testclient import TestClient


@pytest.fixture
def roadmap_file(tmp_path):
    src = Path(__file__).parent.parent / "roadmap.yaml"
    dest = tmp_path / "roadmap.yaml"
    shutil.copy(src, dest)
    return dest


@pytest.fixture
def client(roadmap_file, monkeypatch):
    from roadmaptool import api as api_module
    monkeypatch.setattr(api_module, "ROADMAP_PATH", roadmap_file)
    from roadmaptool.main import app
    return TestClient(app)
