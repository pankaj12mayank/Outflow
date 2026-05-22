"""
Layer 10 — Scraping sub-tool API routes registered.
"""

from app.main import app


def _paths():
    return [getattr(r, "path", "") or "" for r in app.routes]


def test_scraping_linkedin_routes():
    paths = _paths()
    assert any("/scraping/linkedin/enrich" in p for p in paths)


def test_scraping_website_routes():
    paths = _paths()
    assert any("/scraping/website/crawl" in p for p in paths)


def test_scraping_csv_routes():
    paths = _paths()
    assert any("/scraping/csv/parse" in p for p in paths)
    assert any("/scraping/csv/import" in p for p in paths)
