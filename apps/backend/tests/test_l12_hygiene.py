"""
Layer 12 — Platform hygiene: middleware exports, bounce stats route, AIModel config.
"""

import importlib

from app.main import app
from app.models.ai_models import AIModel


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_require_super_admin_not_exported():
    middleware = importlib.import_module("app.middleware")
    assert "require_super_admin" not in middleware.__all__
    assert not hasattr(middleware, "require_super_admin")


def test_bounce_stats_route_registered():
    paths = _paths()
    assert any("/bounces/stats" in p for p in paths)


def test_aimodel_protected_namespace_config():
    cfg = AIModel.model_config
    assert cfg.get("protected_namespaces") == ()
