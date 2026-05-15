import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.api
class TestCampaignEndpoints:
    async def test_list_campaigns_unauthenticated(self, client: AsyncClient):
        response = await client.get("/api/v1/campaigns")
        assert response.status_code == 401

    async def test_list_campaigns_empty(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/campaigns")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_create_campaign(self, authenticated_client: AsyncClient, sample_campaign_data):
        response = await authenticated_client.post("/api/v1/campaigns", json=sample_campaign_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_campaign_data["name"]
        assert data["status"] == "draft"
        assert "id" in data

    async def test_create_campaign_validation(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/campaigns", json={
            "name": "A",
        })
        assert response.status_code == 422

    async def test_get_campaign(self, authenticated_client: AsyncClient, sample_campaign_data):
        create_resp = await authenticated_client.post("/api/v1/campaigns", json=sample_campaign_data)
        campaign_id = create_resp.json()["id"]

        response = await authenticated_client.get(f"/api/v1/campaigns/{campaign_id}")
        assert response.status_code == 200
        assert response.json()["id"] == campaign_id

    async def test_get_campaign_not_found(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/campaigns/99999")
        assert response.status_code == 404

    async def test_update_campaign(self, authenticated_client: AsyncClient, sample_campaign_data):
        create_resp = await authenticated_client.post("/api/v1/campaigns", json=sample_campaign_data)
        campaign_id = create_resp.json()["id"]

        response = await authenticated_client.patch(
            f"/api/v1/campaigns/{campaign_id}",
            json={"name": "Updated Campaign"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Campaign"

    async def test_delete_campaign(self, authenticated_client: AsyncClient, sample_campaign_data):
        create_resp = await authenticated_client.post("/api/v1/campaigns", json=sample_campaign_data)
        campaign_id = create_resp.json()["id"]

        response = await authenticated_client.delete(f"/api/v1/campaigns/{campaign_id}")
        assert response.status_code == 200

        get_resp = await authenticated_client.get(f"/api/v1/campaigns/{campaign_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["status"] == "archived"

    async def test_activate_campaign(self, authenticated_client: AsyncClient, sample_campaign_data):
        create_resp = await authenticated_client.post("/api/v1/campaigns", json=sample_campaign_data)
        campaign_id = create_resp.json()["id"]

        response = await authenticated_client.post(f"/api/v1/campaigns/{campaign_id}/activate")
        assert response.status_code == 200

        get_resp = await authenticated_client.get(f"/api/v1/campaigns/{campaign_id}")
        assert get_resp.json()["status"] == "active"

    async def test_search_campaigns(self, authenticated_client: AsyncClient, sample_campaign_data):
        await authenticated_client.post("/api/v1/campaigns", json=sample_campaign_data)

        response = await authenticated_client.get("/api/v1/campaigns?search=Test")
        assert response.status_code == 200
        assert len(response.json()) >= 1

    async def test_filter_campaigns_by_status(self, authenticated_client: AsyncClient, sample_campaign_data):
        await authenticated_client.post("/api/v1/campaigns", json=sample_campaign_data)

        response = await authenticated_client.get("/api/v1/campaigns?status=draft")
        assert response.status_code == 200
        for campaign in response.json():
            assert campaign["status"] == "draft"


@pytest.mark.asyncio
@pytest.mark.api
class TestSequenceEndpoints:
    async def test_list_sequences(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/sequences")
        assert response.status_code == 200

    async def test_create_sequence(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/sequences", json={
            "name": "Test Sequence",
            "description": "A test sequence",
            "steps": [
                {"type": "email", "order": 0, "subject": "Hello", "body": "Hi there"},
                {"type": "delay", "order": 1, "delay_hours": 24},
            ],
        })
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Sequence"

    async def test_sequence_validation(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/sequences", json={
            "name": "Bad Sequence",
        })
        assert response.status_code == 422


@pytest.mark.asyncio
@pytest.mark.api
class TestTemplateEndpoints:
    async def test_list_templates(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/templates")
        assert response.status_code == 200

    async def test_create_template(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/templates", json={
            "name": "Test Template",
            "slug": "test-template",
            "subject": "Hello {{first_name}}",
            "body_html": "<p>Hi {{first_name}},</p>",
            "body_text": "Hi {{first_name}},",
        })
        assert response.status_code == 201


@pytest.mark.asyncio
@pytest.mark.api
class TestEmailAccountEndpoints:
    async def test_list_email_accounts(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/email-accounts")
        assert response.status_code == 200

    async def test_create_email_account(self, authenticated_client: AsyncClient, sample_email_config):
        response = await authenticated_client.post("/api/v1/email-accounts", json=sample_email_config)
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == sample_email_config["email"]


@pytest.mark.asyncio
@pytest.mark.api
class TestNotificationEndpoints:
    async def test_list_notifications(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/notifications/")
        assert response.status_code == 200

    async def test_notification_counts(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/notifications/counts")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "unread" in data

    async def test_mark_all_read(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/notifications/mark-all-read")
        assert response.status_code == 200