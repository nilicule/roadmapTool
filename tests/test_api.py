def test_get_roadmap(client):
    resp = client.get("/api/roadmap")
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "My Project Roadmap"
    assert len(data["groups"]) == 2


def test_add_group(client):
    resp = client.post("/api/groups", json={"name": "New Phase", "color": "#FF5722"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Phase"
    assert "id" in data


def test_update_group(client):
    groups = client.get("/api/roadmap").json()["groups"]
    gid = groups[0]["id"]
    resp = client.put(f"/api/groups/{gid}", json={"name": "Renamed", "color": "#FF0000", "collapsed": True})
    assert resp.status_code == 200
    updated = client.get("/api/roadmap").json()["groups"][0]
    assert updated["name"] == "Renamed"
    assert updated["collapsed"] is True


def test_delete_group(client):
    groups = client.get("/api/roadmap").json()["groups"]
    gid = groups[0]["id"]
    resp = client.delete(f"/api/groups/{gid}")
    assert resp.status_code == 200
    remaining = client.get("/api/roadmap").json()["groups"]
    assert all(g["id"] != gid for g in remaining)


def test_add_task(client):
    groups = client.get("/api/roadmap").json()["groups"]
    gid = groups[0]["id"]
    resp = client.post(f"/api/groups/{gid}/tasks", json={
        "name": "New Task", "start": "2025-03-01", "end": "2025-03-31"
    })
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Task"


def test_update_task(client):
    roadmap = client.get("/api/roadmap").json()
    task = roadmap["groups"][0]["tasks"][0]
    tid = task["id"]
    resp = client.put(f"/api/tasks/{tid}", json={
        "name": "Updated", "start": "2025-02-01", "end": "2025-03-01"
    })
    assert resp.status_code == 200


def test_delete_task(client):
    roadmap = client.get("/api/roadmap").json()
    task = roadmap["groups"][0]["tasks"][0]
    tid = task["id"]
    resp = client.delete(f"/api/tasks/{tid}")
    assert resp.status_code == 200


def test_reorder_groups(client):
    groups = client.get("/api/roadmap").json()["groups"]
    ids = [g["id"] for g in groups]
    reversed_ids = list(reversed(ids))
    resp = client.post("/api/groups/reorder", json={"ids": reversed_ids})
    assert resp.status_code == 200
    new_order = [g["id"] for g in client.get("/api/roadmap").json()["groups"]]
    assert new_order == reversed_ids


def test_validation_error_returns_422(client):
    resp = client.post("/api/groups", json={"name": "X", "color": "notahex"})
    assert resp.status_code == 422
