import asyncio
import random
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from bs4 import BeautifulSoup
import httpx


@dataclass
class ScrapedData:
    url: str
    title: Optional[str]
    emails: List[str]
    phones: List[str]
    company_info: Dict[str, Any]
    social_links: Dict[str, str]
    raw_html: str


class UserAgentRotator:
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
    ]

    @classmethod
    def get_random(cls) -> str:
        return random.choice(cls.USER_AGENTS)


class Scraper:
    def __init__(
        self,
        delay_ms: int = 2000,
        max_concurrent: int = 5,
        retry_attempts: int = 3,
    ):
        self.delay_ms = delay_ms
        self.max_concurrent = max_concurrent
        self.retry_attempts = retry_attempts
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch(self, url: str) -> Optional[str]:
        async with self.semaphore:
            headers = {"User-Agent": UserAgentRotator.get_random()}
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                for attempt in range(self.retry_attempts):
                    try:
                        response = await client.get(url, headers=headers)
                        if response.status_code == 200:
                            await asyncio.sleep(self.delay_ms / 1000)
                            return response.text
                    except Exception:
                        if attempt == self.retry_attempts - 1:
                            return None
            return None

    async def scrape_page(self, url: str) -> ScrapedData:
        html = await self.fetch(url)
        if not html:
            return ScrapedData(
                url=url,
                title=None,
                emails=[],
                phones=[],
                company_info={},
                social_links={},
                raw_html="",
            )

        soup = BeautifulSoup(html, "lxml")
        title = soup.find("title")
        emails = self._extract_emails(html)
        phones = self._extract_phones(html)
        social_links = self._extract_social_links(soup)
        company_info = self._extract_company_info(soup)

        return ScrapedData(
            url=url,
            title=title.get_text() if title else None,
            emails=emails,
            phones=phones,
            company_info=company_info,
            social_links=social_links,
            raw_html=html,
        )

    def _extract_emails(self, text: str) -> List[str]:
        import re
        email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
        return list(set(re.findall(email_pattern, text)))

    def _extract_phones(self, text: str) -> List[str]:
        import re
        phone_pattern = r"\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
        return list(set(re.findall(phone_pattern, text)))

    def _extract_social_links(self, soup: BeautifulSoup) -> Dict[str, str]:
        social = {}
        social_platforms = {
            "linkedin": "linkedin.com",
            "twitter": "twitter.com",
            "facebook": "facebook.com",
            "instagram": "instagram.com",
        }
        for link in soup.find_all("a", href=True):
            href = link["href"].lower()
            for platform, domain in social_platforms.items():
                if domain in href:
                    social[platform] = link["href"]
                    break
        return social

    def _extract_company_info(self, soup: BeautifulSoup) -> Dict[str, Any]:
        info = {}

        meta_tags = ["og:site_name", "application-name", "twitter:site"]
        for tag in meta_tags:
            meta = soup.find("meta", property=tag) or soup.find("meta", attrs={"name": tag})
            if meta:
                info["site_name"] = meta.get("content")

        description = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
        if description:
            info["description"] = description.get("content")

        return info


class ScrapingWorker:
    def __init__(self, scraper: Scraper):
        self.scraper = scraper

    async def scrape_urls(self, urls: List[str]) -> List[ScrapedData]:
        tasks = [self.scraper.scrape_page(url) for url in urls]
        return await asyncio.gather(*tasks)

    async def scrape_with_fallback(self, primary_url: str, fallback_urls: List[str]) -> ScrapedData:
        result = await self.scraper.scrape_page(primary_url)
        if not result.title and fallback_urls:
            for url in fallback_urls:
                result = await self.scraper.scrape_page(url)
                if result.title:
                    break
        return result