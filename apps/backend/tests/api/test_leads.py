import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.api
class TestLeadEndpoints:
    async def test_list_leads_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/v1/leads")
        assert response.status_code == 401

    async def test_list_leads_empty(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/leads")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_create_lead(self, authenticated_client: AsyncClient, sample_lead_data):
        response = await authenticated_client.post("/api/v1/leads", json=sample_lead_data)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == sample_lead_data["email"]
        assert data["first_name"] == sample_lead_data["first_name"]

    async def test_create_lead_invalid_email(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/leads", json={
            "email": "not-an-email",
            "first_name": "Test",
        })
        assert response.status_code == 422

    async def test_create_lead_invalid_linkedin(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/leads", json={
            "email": "valid@example.com",
            "first_name": "Test",
            "linkedin_url": "https://twitter.com/invalid",
        })
        assert response.status_code == 422

    async def test_bulk_create_leads(self, authenticated_client: AsyncClient):
        leads = [
            {"email": f"lead{i}@example.com", "first_name": f"Lead{i}", "last_name": "Test"}
            for i in range(5)
        ]
        response = await authenticated_client.post("/api/v1/leads/bulk", json={"leads": leads})
        assert response.status_code == 201
        data = response.json()
        assert len(data) == 5

    async def test_get_lead(self, authenticated_client: AsyncClient, sample_lead_data):
        create_resp = await authenticated_client.post("/api/v1/leads", json=sample_lead_data)
        lead_id = create_resp.json()["id"]

        response = await authenticated_client.get(f"/api/v1/leads/{lead_id}")
        assert response.status_code == 200
        assert response.json()["id"] == lead_id

    async def test_update_lead(self, authenticated_client: AsyncClient, sample_lead_data):
        create_resp = await authenticated_client.post("/api/v1/leads", json=sample_lead_data)
        lead_id = create_resp.json()["id"]

        response = await authenticated_client.put(
            f"/api/v1/leads/{lead_id}",
            json={"first_name": "Updated"},
        )
        assert response.status_code == 200
        assert response.json()["first_name"] == "Updated"

    async def test_delete_lead(self, authenticated_client: AsyncClient, sample_lead_data):
        create_resp = await authenticated_client.post("/api/v1/leads", json=sample_lead_data)
        lead_id = create_resp.json()["id"]

        response = await authenticated_client.delete(f"/api/v1/leads/{lead_id}")
        assert response.status_code == 204

    async def test_search_leads(self, authenticated_client: AsyncClient, sample_lead_data):
        await authenticated_client.post("/api/v1/leads", json=sample_lead_data)

        response = await authenticated_client.get("/api/v1/leads/search/query?q=Acme")
        assert response.status_code == 200

    async def test_enrich_lead(self, authenticated_client: AsyncClient, sample_lead_data):
        create_resp = await authenticated_client.post("/api/v1/leads", json=sample_lead_data)
        lead_id = create_resp.json()["id"]

        response = await authenticated_client.post(
            f"/api/v1/leads/{lead_id}/enrich",
            json={"fields": ["company", "title"]},
        )
        assert response.status_code == 200

    async def test_lead_pagination(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/leads?skip=0&limit=10")
        assert response.status_code == 200

    async def test_lead_invalid_id(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/leads/invalid")
        assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.api
class TestLeadValidation:
    async def test_invalid_phone_format(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/leads", json={
            "email": "test@example.com",
            "first_name": "Test",
            "phone": "123",
        })
        assert response.status_code == 422

    async def test_duplicate_email_same_org(self, authenticated_client: AsyncClient, sample_lead_data):
        await authenticated_client.post("/api/v1/leads", json=sample_lead_data)
        response = await authenticated_client.post("/api/v1/leads", json=sample_lead_data)
        assert response.status_code == 400

    async def test_website_url_validation(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/leads", json={
            "email": "test@example.com",
            "first_name": "Test",
            "website": "not-a-url",
        })
        assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.api
class TestBulkOperations:
    async def test_bulk_create_limit(self, authenticated_client: AsyncClient):
        leads = [{"email": f"lead{i}@example.com", "first_name": f"L{i}"} for i in range(2001)]
        response = await authenticated_client.post("/api/v1/leads/bulk", json={"leads": leads})
        assert response.status_code == 422

    async def test_bulk_with_duplicates(self, authenticated_client: AsyncClient):
        leads = [
            {"email": "dup@example.com", "first_name": "Dup1"},
            {"email": "dup@example.com", "first_name": "Dup2"},
        ]
        response = await authenticated_client.post("/api/v1/leads/bulk", json={"leads": leads})
        assert response.status_code == 400