VALID_YAML = """\
title: Test Roadmap
start: '2026-01-01'
end: '2026-12-31'
groups:
- id: phase_one_abc123
  name: Phase One
  color: '#4CAF50'
  collapsed: false
  tasks:
  - id: task_one_def456
    name: Task One
    start: '2026-01-01'
    end: '2026-03-31'
    assignee: null
    depends_on: []
    progress: null
    tags: []
  depends_on: []
"""

INVALID_YAML = """\
title: 123
start: not-a-date
end: also-not-a-date
groups: []
"""


def test_import_valid_yaml(client):
    resp = client.post("/api/roadmap/import", content=VALID_YAML, headers={"Content-Type": "text/plain"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Test Roadmap"
    assert len(data["groups"]) == 1
    assert data["groups"][0]["name"] == "Phase One"


def test_import_invalid_yaml(client):
    resp = client.post("/api/roadmap/import", content=INVALID_YAML, headers={"Content-Type": "text/plain"})
    assert resp.status_code == 422


def test_export_roadmap(client):
    roadmap_json = {
        "title": "Test Roadmap",
        "start": "2026-01-01",
        "end": "2026-12-31",
        "groups": [
            {
                "id": "phase_one_abc123",
                "name": "Phase One",
                "color": "#4CAF50",
                "collapsed": False,
                "tasks": [
                    {
                        "id": "task_one_def456",
                        "name": "Task One",
                        "start": "2026-01-01",
                        "end": "2026-03-31",
                        "assignee": None,
                        "depends_on": [],
                        "progress": None,
                        "tags": [],
                    }
                ],
                "depends_on": [],
            }
        ],
    }
    resp = client.post("/api/roadmap/export", json=roadmap_json)
    assert resp.status_code == 200
    assert "text/yaml" in resp.headers["content-type"]
    assert "Test Roadmap" in resp.text
    assert resp.headers["content-disposition"] == "attachment; filename=roadmap.yaml"
