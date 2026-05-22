"""
Layer 16 — Team, inbox, and calendar API routes.
"""

from app.main import app
from app.services.auth_service import PermissionChecker


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_team_members_route_registered():
    paths = _paths()
    assert any("/team/members" in p for p in paths)


def test_team_invitations_route_registered():
    paths = _paths()
    assert any("/team/invitations" in p for p in paths)


def test_emails_inbox_route_registered():
    paths = _paths()
    assert any("/emails/inbox" in p for p in paths)


def test_meetings_routes_registered():
    paths = _paths()
    assert any(p.rstrip("/").endswith("/meetings") or "/meetings" in p for p in paths)


def test_team_member_has_teams_read_not_create():
    assert PermissionChecker.has_permission("team_member", "teams", "read")
    assert not PermissionChecker.has_permission("team_member", "teams", "create")


def test_org_admin_can_invite_team():
    assert PermissionChecker.has_permission("organization_admin", "teams", "create")


def test_settings_read_for_calendar_list():
    assert PermissionChecker.has_permission("team_member", "settings", "read")
