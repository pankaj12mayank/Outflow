"""Layer 20 — System owner ops: org delete route, purge route, api-auth sync."""

from app.main import app
from app.services.notification_service import NotificationService


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_delete_organization_route_registered():
    paths = _paths()
    assert any("/organizations/" in p for p in paths)


def test_purge_demo_data_route_registered():
    paths = _paths()
    assert any("purge-demo-data" in p for p in paths)


def test_notification_service_has_list_method():
    assert hasattr(NotificationService, "get_notifications")


def test_frontend_system_owner_wildcard_permission():
    from app.core.role_permissions import ROLE_PERMISSIONS_BY_NAME

    assert ROLE_PERMISSIONS_BY_NAME["system_owner"] == ["*"]
