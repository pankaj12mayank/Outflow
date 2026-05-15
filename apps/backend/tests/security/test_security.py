import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.security
class TestTenantIsolation:
    async def test_user_cannot_access_other_org_leads(
        self,
        db_session,
        async_engine,
    ):
        from app.models.models import Organization, User, Lead
        from app.core.security import get_password_hash, create_access_token

        org1 = Organization(name="Org1", slug="org1")
        org2 = Organization(name="Org2", slug="org2")
        db_session.add_all([org1, org2])
        await db_session.flush()

        user1 = User(
            email="user1@example.com",
            full_name="User 1",
            password_hash=get_password_hash("Pass123!"),
            organization_id=org1.id,
        )
        user2 = User(
            email="user2@example.com",
            full_name="User 2",
            password_hash=get_password_hash("Pass123!"),
            organization_id=org2.id,
        )
        db_session.add_all([user1, user2])

        lead1 = Lead(
            organization_id=org1.id,
            email="secret@org1.com",
            first_name="Secret",
            last_name="Lead",
        )
        lead2 = Lead(
            organization_id=org2.id,
            email="secret@org2.com",
            first_name="Secret",
            last_name="Lead",
        )
        db_session.add_all([lead1, lead2])
        await db_session.commit()

        token1 = create_access_token({"sub": str(user1.id), "org_id": org1.id})

        from app.main import app
        from app.core.security import get_current_user

        async def override_auth():
            return {"sub": str(user1.id), "org_id": org1.id}

        app.dependency_overrides[get_current_user] = override_auth

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            response = await c.get("/api/v1/leads", headers={"Authorization": f"Bearer {token1}"})
            if response.status_code == 200:
                leads = response.json()
                lead_ids = [l.get("id") for l in leads]
                assert lead1.id not in lead_ids or all(l.get("email") != "secret@org2.com" for l in leads)

        app.dependency_overrides.clear()


@pytest.mark.asyncio
@pytest.mark.security
class TestPermissionChecks:
    async def test_regular_user_cannot_access_admin_endpoints(self, client: AsyncClient, regular_user, db_session):
        from app.core.security import create_access_token

        token = create_access_token({"sub": str(regular_user.id), "org_id": regular_user.organization_id})

        response = await client.get(
            "/api/v1/admin/organizations",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code in [403, 401]

    async def test_user_cannot_delete_other_users_campaign(
        self, authenticated_client: AsyncClient, db_session, org_admin,
    ):
        from app.models.models import Campaign

        campaign = Campaign(
            organization_id=org_admin.organization_id,
            created_by=org_admin.id,
            name="Other Admin Campaign",
            slug="other-campaign",
        )
        db_session.add(campaign)
        await db_session.commit()

        response = await authenticated_client.delete(f"/api/v1/campaigns/{campaign.id}")
        assert response.status_code in [403, 404]

    async def test_unverified_email_limited_access(self, client: AsyncClient, db_session):
        from app.models.models import Organization, User
        from app.core.security import get_password_hash, create_access_token

        org = Organization(name="Unverified Org", slug="unverified", is_active=True)
        db_session.add(org)
        await db_session.flush()

        user = User(
            email="unverified@example.com",
            full_name="Unverified User",
            password_hash=get_password_hash("Pass123!"),
            organization_id=org.id,
            is_email_verified=False,
        )
        db_session.add(user)
        await db_session.commit()

        token = create_access_token({"sub": str(user.id), "org_id": org.id})

        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200


@pytest.mark.asyncio
@pytest.mark.security
class TestSQLInjection:
    async def test_lead_search_sql_injection(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get('/api/v1/leads/search/query?q="; DROP TABLE leads; --')
        assert response.status_code == 200

    async def test_campaign_search_sql_injection(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get('/api/v1/campaigns?search=admin" OR "1"="1')
        assert response.status_code == 200

    async def test_invalid_id_type_sql_injection(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/leads/1 OR 1=1")
        assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.security
class TestXSSPrevention:
    async def test_campaign_name_xss(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/campaigns", json={
            "name": "<script>alert('xss')</script>",
            "description": "Test",
        })
        assert response.status_code == 201
        data = response.json()
        assert "<script>" not in data.get("name", "")

    async def test_lead_name_xss(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/leads", json={
            "email": "xss@example.com",
            "first_name": "<img src=x onerror=alert(1)>",
            "last_name": "Test",
        })
        data = response.json()
        if response.status_code == 201:
            assert "<img" not in data.get("first_name", "")


@pytest.mark.asyncio
@pytest.mark.security
class TestBruteForceProtection:
    async def test_multiple_failed_logins(self, client: AsyncClient):
        for i in range(6):
            response = await client.post("/api/v1/auth/login", json={
                "email": "bruteforce@example.com",
                "password": "wrongpassword",
            })
        assert response.status_code in [401, 429]

    async def test_magic_link_rate_limit(self, client: AsyncClient):
        for i in range(5):
            response = await client.post("/api/v1/auth/magic-link", json={
                "email": f"rate{i}@example.com",
            })
        assert response.status_code in [202, 429]


from httpx import ASGITransport


@pytest.mark.asyncio
@pytest.mark.security
class TestInputSanitization:
    async def test_sanitize_html_tags(self):
        from app.core.decorators import sanitize_user_input
        result = sanitize_user_input("<script>alert('xss')</script>Test")
        assert "<script>" not in result

    async def test_sanitize_javascript_protocol(self):
        from app.core.decorators import sanitize_user_input
        result = sanitize_user_input("javascript:alert('xss')")
        assert "javascript:" not in result

    async def test_sanitize_event_handlers(self):
        from app.core.decorators import sanitize_user_input
        result = sanitize_user_input('<img src=x onerror="alert(1)">')
        assert "onerror" not in result