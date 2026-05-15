import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
@pytest.mark.api
class TestScrapingEndpoints:
    async def test_google_maps_search(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/scraping/google-maps/search", json={
            "keyword": "restaurants",
            "location": "New York",
            "limit": 10,
        })
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data
        assert data["status"] == "pending"

    async def test_website_crawl(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/scraping/website/crawl", json={
            "url": "https://example.com",
        })
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data

    async def test_linkedin_enrich(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/scraping/linkedin/enrich", json={
            "linkedin_url": "https://linkedin.com/in/johndoe",
        })
        assert response.status_code == 200
        data = response.json()
        assert "job_id" in data

    async def test_linkedin_invalid_url(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/scraping/linkedin/enrich", json={
            "linkedin_url": "https://twitter.com/invalid",
        })
        assert response.status_code == 400

    async def test_csv_parse(self, authenticated_client: AsyncClient, sample_csv_content):
        from io import BytesIO
        files = {"file": ("test.csv", BytesIO(sample_csv_content), "text/csv")}
        response = await authenticated_client.post("/api/v1/scraping/csv/parse", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "columns" in data
        assert "total_rows" in data

    async def test_csv_invalid_format(self, authenticated_client: AsyncClient):
        from io import BytesIO
        files = {"file": ("test.txt", BytesIO(b"not a csv"), "text/plain")}
        response = await authenticated_client.post("/api/v1/scraping/csv/parse", files=files)
        assert response.status_code == 400

    async def test_list_jobs(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/scraping/jobs")
        assert response.status_code == 200
        data = response.json()
        assert "jobs" in data
        assert "total" in data

    async def test_list_jobs_filtered(self, authenticated_client: AsyncClient):
        response = await authenticated_client.get("/api/v1/scraping/jobs?status=pending&limit=10")
        assert response.status_code == 200


@pytest.mark.asyncio
@pytest.mark.api
class TestScrapingSafety:
    async def test_blocked_facebook_scrape(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/scraping/website/crawl", json={
            "url": "https://facebook.com/example",
        })
        assert response.status_code == 422

    async def test_blocked_twitter_scrape(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/scraping/website/crawl", json={
            "url": "https://twitter.com/example",
        })
        assert response.status_code == 422

    async def test_blocked_login_path(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/scraping/website/crawl", json={
            "url": "https://example.com/login",
        })
        assert response.status_code == 422

    async def test_invalid_url_format(self, authenticated_client: AsyncClient):
        response = await authenticated_client.post("/api/v1/scraping/website/crawl", json={
            "url": "not-a-valid-url",
        })
        assert response.status_code == 422

    async def test_empty_csv(self, authenticated_client: AsyncClient):
        from io import BytesIO
        files = {"file": ("empty.csv", BytesIO(b""), "text/csv")}
        response = await authenticated_client.post("/api/v1/scraping/csv/parse", files=files)
        assert response.status_code == 400


@pytest.mark.asyncio
@pytest.mark.unit
class TestScrapingValidation:
    async def test_csv_size_limit(self):
        from app.core.validation import validate_csv_content
        large_content = b"a" * (11 * 1024 * 1024)
        valid, error = validate_csv_content(large_content)
        assert not valid
        assert "too large" in error

    async def test_csv_encoding(self):
        from app.core.validation import validate_csv_content
        valid, error = validate_csv_content(b"email,name\ntest@example.com,Test")
        assert valid

    async def test_scraping_url_blocked_domain(self):
        from app.core.validation import validate_scraping_url
        valid, error = validate_scraping_url("https://facebook.com/page")
        assert not valid
        assert "not allowed" in error

    async def test_scraping_url_blocked_path(self):
        from app.core.validation import validate_scraping_url
        valid, error = validate_scraping_url("https://example.com/login")
        assert not valid
        assert "restricted path" in error