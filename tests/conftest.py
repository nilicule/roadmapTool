import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from roadmaptool.main import app
    return TestClient(app)
