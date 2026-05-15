import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.api
class TestHealthEndpoints:
    async def test_root_endpoint(self, client: AsyncClient):
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Outflo API"
        assert "version" in data

    async def test_health_check(self, client: AsyncClient):
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        assert "timestamp" in data


@pytest.mark.asyncio
@pytest.mark.api
class TestAuthEndpoints:
    async def test_register_validation(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/register", json={
            "email": "not-an-email",
            "password": "short",
            "full_name": "",
            "organization_name": "",
        })
        assert response.status_code == 422

    async def test_register_success(self, client: AsyncClient, db_session):
        response = await client.post("/api/v1/auth/register", json={
            "email": "newuser@example.com",
            "password": "ValidPass123!",
            "full_name": "New User",
            "organization_name": "New Org",
        })
        assert response.status_code == 201
        data = response.json()
        assert "user" in data
        assert "tokens" in data
        assert data["tokens"]["token_type"] == "bearer"

    async def test_register_duplicate_email(self, client: AsyncClient, db_session):
        await client.post("/api/v1/auth/register", json={
            "email": "duplicate@example.com",
            "password": "ValidPass123!",
            "full_name": "User One",
            "organization_name": "Org One",
        })
        response = await client.post("/api/v1/auth/register", json={
            "email": "duplicate@example.com",
            "password": "ValidPass123!",
            "full_name": "User Two",
            "organization_name": "Org Two",
        })
        assert response.status_code == 400

    async def test_login_invalid_credentials(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword",
        })
        assert response.status_code == 401

    async def test_login_success(self, client: AsyncClient, db_session):
        await client.post("/api/v1/auth/register", json={
            "email": "loginuser@example.com",
            "password": "ValidPass123!",
            "full_name": "Login User",
            "organization_name": "Login Org",
        })
        response = await client.post("/api/v1/auth/login", json={
            "email": "loginuser@example.com",
            "password": "ValidPass123!",
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    async def test_token_refresh(self, client: AsyncClient, db_session):
        await client.post("/api/v1/auth/register", json={
            "email": "refresh@example.com",
            "password": "ValidPass123!",
            "full_name": "Refresh User",
            "organization_name": "Refresh Org",
        })
        login_resp = await client.post("/api/v1/auth/login", json={
            "email": "refresh@example.com",
            "password": "ValidPass123!",
        })
        refresh_token = login_resp.json()["tokens"]["refresh_token"]

        response = await client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    async def test_logout(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/auth/logout")
        assert response.status_code == 204

    async def test_get_me_authenticated(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"

    async def test_get_me_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/me")
        assert response.status_code == 401

    async def test_forgot_password(self, client: AsyncClient):
        response = await client.post("/api/v1/auth/forgot-password", json={
            "email": "nonexistent@example.com",
        })
        assert response.status_code == 202

    async def test_auth_health(self, client: AsyncClient):
        response = await client.get("/api/v1/auth/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
@pytest.mark.api
class TestPaginationValidation:
    async def test_negative_page(self, client: AsyncClient):
        response = await client.get("/api/v1/campaigns?page=-1")
        assert response.status_code == 422

    async def test_limit_exceeds_max(self, client: AsyncClient):
        response = await client.get("/api/v1/campaigns?limit=500")
        assert response.status_code == 422

    async def test_valid_pagination(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/campaigns?page=1&limit=20")
        assert response.status_code == 200


@pytest.mark.asyncio
@pytest.mark.api
class TestRateLimiting:
    async def test_rate_limit_headers_present(self, client: AsyncClient):
        response = await client.get("/api/v1/health")
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers


@pytest.mark.asyncio
@pytest.mark.api
class TestCORS:
    async def test_cors_preflight(self, client: AsyncClient):
        response = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization",
            },
        )
        assert response.status_code == 200