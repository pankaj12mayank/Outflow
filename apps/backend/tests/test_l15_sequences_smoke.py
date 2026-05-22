"""
Layer 15 — Sequences API routes and steps payload support.
"""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_sequences_routes_registered():
    paths = _paths()
    assert any(p.rstrip("/").endswith("/sequences") or "/sequences" in p for p in paths)


def test_sequences_create_requires_auth():
    response = client.post("/api/v1/sequences/", json={"name": "Test"})
    assert response.status_code in (401, 403)


def test_sequences_create_with_steps_payload_schema():
    """OpenAPI-less smoke: module accepts steps in create body."""
    from app.api.v1.endpoints import sequences as seq_mod

    defaults = seq_mod._sequence_defaults(
        {
            "name": "Outreach",
            "steps": [{"id": "1", "type": "email", "title": "Hi"}],
            "status": "draft",
        }
    )
    assert defaults["steps"][0]["type"] == "email"
    assert defaults["status"] == "draft"


def test_team_member_lacks_sequences_create_permission():
    from app.services.auth_service import PermissionChecker

    assert PermissionChecker.has_permission("team_member", "sequences", "read")
    assert not PermissionChecker.has_permission("team_member", "sequences", "create")
