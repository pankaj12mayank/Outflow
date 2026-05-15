"""
Outflo - Google Maps Scraper
Safe, respectful scraping of Google Maps business listings
"""

import asyncio
import re
from typing import List, Optional, Dict, Any
from urllib.parse import quote_plus

from playwright.async_api import async_playwright, Page, Browser, BrowserContext

from .base import BaseScraper, ScrapeResult, ScrapeSource
from .config import SafetyConfig, DEFAULT_SAFETY_CONFIG


class GoogleMapsScraper(BaseScraper):
    """
    Google Maps Scraper with safe practices
    
    Features:
    - Keyword-based search
    - Business extraction
    - Pagination support
    - Rate limiting
    - Error handling
    """
    
    def __init__(self, safety_config: Optional[SafetyConfig] = None):
        super().__init__(safety_config or DEFAULT_SAFETY_CONFIG)
        self.base_url = "https://www.google.com/maps/search/"
        self.results_limit = 50
    
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
        
        # Add stealth scripts
        await self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => false });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
        """)
    
    async def cleanup(self) -> None:
        """Cleanup browser resources"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def search(self, keyword: str, location: Optional[str] = None, limit: int = 50) -> List[ScrapeResult]:
        """
        Search Google Maps and extract business listings
        
        Args:
            keyword: Search keyword (e.g., "restaurants", "lawyers near NYC")
            location: Optional location filter
            limit: Maximum results to extract
            
        Returns:
            List of ScrapeResult objects
        """
        if not await self.validate_url(self.base_url):
            return []
        
        await self._safe_delay()
        
        query = keyword
        if location:
            query = f"{keyword} in {location}"
        
        search_url = f"{self.base_url}{quote_plus(query)}"
        self.logger.info(f"Searching Google Maps: {search_url}")
        
        page = await self.context.new_page()
        results = []
        
        try:
            await page.goto(search_url, wait_until="networkidle", timeout=45000)
            await self._safe_delay()
            
            # Scroll and extract results
            seen_urls = set()
            scroll_count = 0
            max_scrolls = min(limit // 10 + 2, 10)
            
            while len(results) < limit and scroll_count < max_scrolls:
                # Wait for results to load
                await page.wait_for_selector("div[aria-label][data-candidates]", timeout=5000)
                
                # Extract current visible results
                new_results = await self._extract_listing_results(page)
                
                for result in new_results:
                    if result.source_url and result.source_url not in seen_urls:
                        seen_urls.add(result.source_url)
                        results.append(result)
                        if len(results) >= limit:
                            break
                
                if len(results) < limit:
                    # Scroll to load more
                    await self._scroll_results(page)
                    scroll_count += 1
                    await self._safe_delay()
            
            self.logger.info(f"Extracted {len(results)} business listings")
            
        except Exception as e:
            self.logger.error(f"Error during Google Maps search: {e}")
        finally:
            await page.close()
        
        return results[:limit]
    
    async def _extract_listing_results(self, page: Page) -> List[ScrapeResult]:
        """Extract business listings from current page view"""
        results = []
        
        # Find listing elements
        listings = await page.query_selector_all('div[data-candidates] > div')
        
        for listing in listings:
            try:
                # Extract business name
                name_elem = await listing.query_selector('div.fontMedium')
                business_name = await name_elem.inner_text() if name_elem else None
                
                if not business_name:
                    continue
                
                # Extract rating
                rating_elem = await listing.query_selector('span.kvMDzf')
                rating = await rating_elem.inner_text() if rating_elem else None
                
                # Extract reviews count
                reviews_elem = await listing.query_selector('span.hpKjrc')
                reviews = await reviews_elem.inner_text() if reviews_elem else None
                
                # Extract category
                category_elem = await listing.query_selector('div.fontCaption')
                category = await category_elem.inner_text() if category_elem else None
                
                # Extract address
                address_elem = await listing.query_selector('div.fontBodyMedium span')
                address = await address_elem.inner_text() if address_elem else None
                
                # Extract phone
                phone_elem = await listing.query_selector('div[data-item-id="phone"]')
                phone = None
                if phone_elem:
                    phone_text = await phone_elem.inner_text()
                    phone = self._extract_phone(phone_text)
                
                # Extract website URL
                website_elem = await listing.query_selector('a[data-item-id="website"]')
                website_url = None
                if website_elem:
                    website_url = await website_elem.get_attribute("href")
                
                # Get the listing URL for detailed extraction
                listing_link = await listing.query_selector('a[href*="/maps/place"]')
                place_url = None
                if listing_link:
                    place_url = await listing_link.get_attribute("href")
                
                result = ScrapeResult(
                    success=True,
                    source=ScrapeSource.GOOGLE_MAPS,
                    business_name=business_name.strip() if business_name else None,
                    address=address.strip() if address else None,
                    category=category.strip() if category else None,
                    source_url=place_url,
                    raw_data={
                        "rating": rating,
                        "reviews": reviews,
                        "full_address": address,
                    }
                )
                
                if website_url:
                    result.website = self._clean_url(website_url)
                
                if phone:
                    result.phone = phone
                
                results.append(result)
                
            except Exception as e:
                self.logger.debug(f"Error extracting listing: {e}")
                continue
        
        return results
    
    async def scrape(self, url: str, **kwargs) -> ScrapeResult:
        """
        Scrape detailed information from a Google Maps place URL
        
        Args:
            url: Google Maps place URL
            **kwargs: Additional parameters
            
        Returns:
            ScrapeResult with detailed business information
        """
        if not await self.validate_url(url):
            return ScrapeResult(
                success=False,
                source=ScrapeSource.GOOGLE_MAPS,
                error_message="URL blocked or invalid"
            )
        
        await self._safe_delay()
        
        page = await self.context.new_page()
        
        try:
            await page.goto(url, wait_until="networkidle", timeout=45000)
            await self._safe_delay()
            
            # Extract all details
            result = await self._extract_place_details(page)
            result.source_url = url
            
            # Try to extract website from details
            website_link = await page.query_selector('a[data-item-id="website"]')
            if website_link:
                href = await website_link.get_attribute("href")
                result.website = self._clean_url(href)
            
            # Calculate quality score
            result.data_quality_score = self.calculate_quality_score(result)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Error scraping Google Maps place: {e}")
            return ScrapeResult(
                success=False,
                source=ScrapeSource.GOOGLE_MAPS,
                source_url=url,
                error_message=str(e)
            )
        finally:
            await page.close()
    
    async def _extract_place_details(self, page: Page) -> ScrapeResult:
        """Extract detailed information from a place page"""
        result = ScrapeResult(
            success=True,
            source=ScrapeSource.GOOGLE_MAPS
        )
        
        # Business name
        name_elem = await page.query_selector('h1.DY5Txe')
        if not name_elem:
            name_elem = await page.query_selector('h1[class*="header"]')
        if name_elem:
            result.business_name = (await name_elem.inner_text()).strip()
        
        # Rating and reviews
        rating_elem = await page.query_selector('div.fAhjGe span.kvMDzf')
        if rating_elem:
            result.raw_data["rating"] = await rating_elem.inner_text()
        
        # Address
        address_elem = await page.query_selector('div[data-item-id="address"] span')
        if address_elem:
            full_address = (await address_elem.inner_text()).strip()
            result.address = full_address
            result = self._parse_address(full_address, result)
        
        # Phone
        phone_elem = await page.query_selector('div[data-item-id="phone"] span')
        if phone_elem:
            phone_text = await phone_elem.inner_text()
            result.phone = self._extract_phone(phone_text)
        
        # Website (from business)
        website_elem = await page.query_selector('a[data-item-id="website"]')
        if website_elem:
            href = await website_elem.get_attribute("href")
            result.website = self._clean_url(href)
        
        # Category
        category_elem = await page.query_selector('button.jsbQE')
        if category_elem:
            result.category = (await category_elem.inner_text()).strip()
        
        return result
    
    async def _scroll_results(self, page: Page) -> None:
        """Scroll results section to load more"""
        try:
            # Scroll the results container
            await page.evaluate("""
                () => {
                    const container = document.querySelector('[aria-label][data-candidates]');
                    if (container) {
                        container.scrollBy(0, 500);
                    }
                }
            """)
            await asyncio.sleep(1)
        except Exception as e:
            self.logger.debug(f"Error scrolling results: {e}")
    
    def _extract_phone(self, text: str) -> Optional[str]:
        """Extract phone number from text"""
        phone_pattern = r'\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        match = re.search(phone_pattern, text)
        if match:
            return re.sub(r'[^\d+]', '', match.group())
        return None
    
    def _clean_url(self, url: str) -> Optional[str]:
        """Clean and validate URL"""
        if not url:
            return None
        # Remove tracking parameters
        url = url.split('?')[0]
        if url.startswith('http'):
            return url
        return None
    
    def _parse_address(self, full_address: str, result: ScrapeResult) -> ScrapeResult:
        """Parse full address into components"""
        parts = full_address.split(',')
        
        if len(parts) >= 1:
            result.address = parts[0].strip()
        if len(parts) >= 2:
            result.city = parts[1].strip()
        if len(parts) >= 3:
            # State and ZIP
            state_zip = parts[2].strip()
            match = re.search(r'([A-Z]{2})\s*(\d{5})', state_zip)
            if match:
                result.state = match.group(1)
                result.postal_code = match.group(2)
        
        return result
    
    async def enrich_from_website(self, result: ScrapeResult) -> ScrapeResult:
        """
        Enrich Google Maps result by crawling the business website
        
        Args:
            result: ScrapeResult to enrich
            
        Returns:
            Enriched ScrapeResult
        """
        if not result.website:
            return result
        
        website_crawler = WebsiteCrawler(self.safety_config)
        await website_crawler.initialize()
        
        try:
            website_result = await website_crawler.scrape(result.website)
            
            # Copy enrichment data
            if website_result.email:
                result.email = website_result.email
            if website_result.whatsapp:
                result.whatsapp = website_result.whatsapp
            if website_result.calendly:
                result.calendly = website_result.calendly
            if website_result.has_contact_form:
                result.has_contact_form = website_result.has_contact_form
            if website_result.has_cta:
                result.has_cta = website_result.has_cta
            
            # Update enrichment status
            result.enrichment_status = "completed"
            result.data_quality_score = self.calculate_quality_score(result)
            
        except Exception as e:
            self.logger.warning(f"Failed to enrich from website: {e}")
            result.enrichment_status = "failed"
        finally:
            await website_crawler.cleanup()
        
        return result


# Import here to avoid circular imports
from .website import WebsiteCrawler