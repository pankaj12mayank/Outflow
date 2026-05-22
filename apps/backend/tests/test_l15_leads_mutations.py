"""
Layer 15 — Lead enrich/delete routes and enrich field defaults.
"""

import inspect

from fastapi.testclient import TestClient

from app.api.v1.endpoints import leads as leads_mod
from app.main import app

client = TestClient(app)


def test_lead_enrich_route_registered():
    paths = [getattr(r, "path", "") or "" for r in app.routes]
    assert any("/leads/{lead_id}/enrich" in p or p.endswith("/enrich") for p in paths)


def test_lead_delete_route_registered():
    paths = [getattr(r, "path", "") or "" for r in app.routes]
    assert any("{lead_id}" in p and "leads" in p for p in paths)


def test_enrich_endpoint_passes_default_fields():
    source = inspect.getsource(leads_mod.enrich_lead)
    assert "_DEFAULT_ENRICH_FIELDS" in source


def test_bulk_enrich_passes_default_fields():
    source = inspect.getsource(leads_mod.bulk_enrich_leads)
    assert "_DEFAULT_ENRICH_FIELDS" in source


def test_leads_create_unauthenticated_rejected():
    response = client.post("/api/v1/leads/", json={"email": "a@b.com"})
    assert response.status_code in (401, 403)
