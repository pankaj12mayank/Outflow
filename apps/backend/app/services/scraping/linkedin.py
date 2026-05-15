"""
Outflo - LinkedIn Light Enrichment
Manual URL-based profile enrichment only
NO bulk scraping, NO automation
"""

import re
from typing import Optional, Dict, Any

from playwright.async_api import async_playwright, Page, Browser, BrowserContext

from .base import BaseScraper, ScrapeResult, ScrapeSource
from .config import SafetyConfig, DEFAULT_SAFETY_CONFIG


class LinkedInEnricher(BaseScraper):
    """
    LinkedIn Light Enrichment
    
    IMPORTANT: This module ONLY supports:
    - Manual URL input for single profile enrichment
    - Public profile data extraction
    
    STRICTLY PROHIBITED:
    - Bulk scraping
    - Automated profile discovery
    - Connection/message automation
    - Any form of scraping without explicit URL
    """
    
    # LinkedIn public profile patterns
    PROFILE_PATTERNS = [
        r'linkedin\.com/in/[a-zA-Z0-9-]+',
        r'linkedin\.com/company/[a-zA-Z0-9-]+',
    ]
    
    def __init__(self, safety_config: Optional[SafetyConfig] = None):
        super().__init__(safety_config or DEFAULT_SAFETY_CONFIG)
        self.blocked_domains.extend(['linkedin.com'])
    
    async def initialize(self) -> None:
        """Initialize Playwright browser"""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=self.safety_config.headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage",
            ]
        )
        self.context = await self.browser.new_context(
            user_agent=self.safety_config.get_random_user_agent(),
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
        )
        
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1] });
        """)
    
    async def cleanup(self) -> None:
        """Cleanup browser resources"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def enrich(self, linkedin_url: str, **kwargs) -> ScrapeResult:
        """
        Enrich a lead with LinkedIn profile data
        
        Args:
            linkedin_url: Full LinkedIn profile URL (manual input only)
            **kwargs: Additional parameters
            
        Returns:
            ScrapeResult with LinkedIn profile data
            
        Raises:
            ValueError: If URL is not a valid LinkedIn profile URL
        """
        # Validate URL is a LinkedIn profile/company URL
        if not self._is_valid_profile_url(linkedin_url):
            return ScrapeResult(
                success=False,
                source=ScrapeSource.LINKEDIN,
                error_message="Invalid LinkedIn URL. Must be a profile or company page."
            )
        
        await self._safe_delay()
        
        page = await self.context.new_page()
        
        try:
            # Navigate to profile
            await page.goto(linkedin_url, wait_until="domcontentloaded", timeout=30000)
            await self._safe_delay()
            
            result = ScrapeResult(
                success=True,
                source=ScrapeSource.LINKEDIN,
                linkedin_url=linkedin_url
            )
            
            # Extract profile data
            result = await self._extract_profile(page, result)
            
            # Calculate quality
            result.data_quality_score = self.calculate_quality_score(result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error enriching LinkedIn profile: {e}")
            return ScrapeResult(
                success=False,
                source=ScrapeSource.LINKEDIN,
                linkedin_url=linkedin_url,
                error_message=str(e)
            )
        finally:
            await page.close()
    
    async def _extract_profile(self, page: Page, result: ScrapeResult) -> ScrapeResult:
        """Extract profile data from LinkedIn page"""
        
        try:
            # Handle login wall
            if await page.query_selector('[data-test-id="wall-section"]'):
                result.error_message = "Profile requires authentication"
                result.success = False
                return result
            
            # Name
            name_elem = await page.query_selector('h1[class*="top-card__name"], h1[class*="profile-rail-card__name"]')
            if name_elem:
                result.linkedin_name = (await name_elem.inner_text()).strip()
            
            # Title/Headline
            title_elem = await page.query_selector('h2[class*="top-card__headline"], div[class*="profile-rail-card__headline"]')
            if title_elem:
                result.linkedin_title = (await title_elem.inner_text()).strip()
            
            # Location
            location_elem = await page.query_selector('span[class*="top-card__location"]')
            if not location_elem:
                location_elem = await page.query_selector('div[class*="profile-rail-card__location"]')
            if location_elem:
                result.linkedin_location = (await location_elem.inner_text()).strip()
            
            # Company (from current position)
            company_elem = await page.query_selector('a[class*="top-card__organization"]')
            if not company_elem:
                company_elem = await page.query_selector('span[class*="top-card__company"]')
            if company_elem:
                result.linkedin_company = (await company_elem.inner_text()).strip()
            
            # About/Summary
            about_elem = await page.query_selector('section[id="about"] p, div[class*="summary"]')
            if about_elem:
                result.raw_data["about"] = (await about_elem.inner_text()).strip()
            
            # Email (if visible - rare for public profiles)
            email_elem = await page.query_selector('a[href^="mailto:"]')
            if email_elem:
                href = await email_elem.get_attribute("href")
                if href:
                    result.email = href.replace("mailto:", "")
            
        except Exception as e:
            self.logger.debug(f"Error extracting profile data: {e}")
        
        return result
    
    def _is_valid_profile_url(self, url: str) -> bool:
        """Validate LinkedIn URL format"""
        if not url:
            return False
        
        # Must be a profile or company URL
        valid_patterns = [
            r'linkedin\.com/in/[a-zA-Z0-9-]+/?',
            r'linkedin\.com/company/[a-zA-Z0-9-]+/?',
        ]
        
        for pattern in valid_patterns:
            if re.search(pattern, url, re.IGNORECASE):
                return True
        
        return False
    
    async def scrape(self, url: str, **kwargs) -> ScrapeResult:
        """Alias for enrich method"""
        return await self.enrich(url, **kwargs)
    
    def validate_url(self, url: str) -> bool:
        """Validate URL before scraping"""
        return self._is_valid_profile_url(url)