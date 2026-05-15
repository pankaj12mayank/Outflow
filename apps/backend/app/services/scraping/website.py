"""
Outflo - Website Crawler
Safe website content extraction with contact discovery
"""

import asyncio
import re
from typing import List, Optional, Set, Dict, Any
from urllib.parse import urljoin, urlparse, unquote
from bs4 import BeautifulSoup

from playwright.async_api import async_playwright, Page, Browser, BrowserContext

from .base import BaseScraper, ScrapeResult, ScrapeSource
from .config import SafetyConfig, DEFAULT_SAFETY_CONFIG


class WebsiteCrawler(BaseScraper):
    """
    Website Crawler for contact and lead data extraction
    
    Features:
    - Multi-page crawling (homepage, contact, about, footer)
    - Email extraction with validation
    - Social link discovery
    - CTA and form detection
    - WhatsApp/ Calendly detection
    - Rate limiting
    """
    
    def __init__(self, safety_config: Optional[SafetyConfig] = None):
        super().__init__(safety_config or DEFAULT_SAFETY_CONFIG)
        self.email_pattern = re.compile(
            r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        )
        self.whatsapp_pattern = re.compile(
            r'wa\.me/|whatsapp\.com/(?:[a-z]{2}/)?\+?'
        )
        self.calendly_pattern = re.compile(
            r'calendly\.com/[a-zA-Z0-9_-]+'
        )
        self.max_pages = 10
        self.crawl_timeout = 120  # seconds
    
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
        """)
    
    async def cleanup(self) -> None:
        """Cleanup browser resources"""
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def scrape(self, url: str, **kwargs) -> ScrapeResult:
        """
        Crawl website and extract contact information
        
        Args:
            url: Website URL to crawl
            **kwargs: Additional parameters
            
        Returns:
            ScrapeResult with extracted data
        """
        if not await self.validate_url(url):
            return ScrapeResult(
                success=False,
                source=ScrapeSource.WEBSITE,
                error_message="URL blocked or invalid"
            )
        
        result = ScrapeResult(
            success=True,
            source=ScrapeSource.WEBSITE,
            source_url=url
        )
        
        page = await self.context.new_page()
        visited_urls: Set[str] = set()
        extracted_data: Dict[str, Any] = {
            "emails": [],
            "phones": [],
            "social_links": {},
            "whatsapp": None,
            "calendly": None,
            "forms": [],
            "ctas": [],
        }
        
        try:
            # Start with homepage
            await self._crawl_page(page, url, visited_urls, extracted_data, depth=0)
            
            # Crawl contact page
            contact_urls = await self._find_contact_url(page, url)
            for contact_url in contact_urls[:3]:  # Limit to 3
                if contact_url not in visited_urls:
                    await self._crawl_page(page, contact_url, visited_urls, extracted_data, depth=1)
            
            # Extract business info from homepage
            result = await self._extract_business_info(page, result)
            
            # Process collected data
            result.emails = self._deduplicate_emails(extracted_data["emails"])
            result.phone = extracted_data["phones"][0] if extracted_data["phones"] else None
            result.whatsapp = extracted_data.get("whatsapp")
            result.calendly = extracted_data.get("calendly")
            
            # Social links
            if extracted_data["social_links"]:
                result.facebook_url = extracted_data["social_links"].get("facebook")
                result.twitter_url = extracted_data["social_links"].get("twitter")
                result.instagram_url = extracted_data["social_links"].get("instagram")
                result.linkedin_url = extracted_data["social_links"].get("linkedin")
            
            # Forms and CTAs
            result.has_contact_form = len(extracted_data["forms"]) > 0
            result.has_cta = len(extracted_data["ctas"]) > 0
            
            # Calculate quality
            result.data_quality_score = self.calculate_quality_score(result)
            
        except Exception as e:
            self.logger.error(f"Error crawling website: {e}")
            result.success = False
            result.error_message = str(e)
        finally:
            await page.close()
        
        return result
    
    async def _crawl_page(
        self,
        page: Page,
        url: str,
        visited: Set[str],
        data: Dict[str, Any],
        depth: int = 0
    ) -> None:
        """Crawl a single page and extract data"""
        if url in visited or len(visited) >= self.max_pages:
            return
        
        visited.add(url)
        
        try:
            await page.goto(url, wait_until="domcontentloaded", timeout=30000)
            await self._safe_delay()
            
            # Get page content
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            # Remove script and style elements
            for script in soup(["script", "style", "nav", "footer", "header"]):
                script.decompose()
            
            text = soup.get_text(separator=' ', strip=True)
            
            # Extract emails
            emails = self.email_pattern.findall(text)
            data["emails"].extend([e.lower() for e in emails if self._is_valid_email(e)])
            
            # Extract phones
            phones = self._extract_phones(text)
            data["phones"].extend(phones)
            
            # Extract WhatsApp
            whatsapp_links = await page.query_selector_all('a[href*="wa.me"], a[href*="whatsapp.com"]')
            for link in whatsapp_links:
                href = await link.get_attribute("href")
                if href:
                    data["whatsapp"] = href
            
            # Extract Calendly
            page_text = await page.inner_text("body")
            calendly_matches = self.calendly_pattern.findall(page_text)
            if calendly_matches:
                data["calendly"] = f"https://calendly.com/{calendly_matches[0]}"
            
            # Extract social links
            social_links = await page.query_selector_all('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"]')
            for link in social_links:
                href = await link.get_attribute("href")
                if href:
                    data["social_links"].update(self._parse_social_link(href))
            
            # Detect forms
            forms = await page.query_selector_all("form")
            data["forms"].extend([url] * len(forms))
            
            # Detect CTAs
            cta_elements = await page.query_selector_all('[class*="cta"], [class*="CTA"], button[type="submit"]')
            data["ctas"].extend([url] * len(cta_elements))
            
        except Exception as e:
            self.logger.debug(f"Error crawling page {url}: {e}")
    
    async def _find_contact_url(self, page: Page, base_url: str) -> List[str]:
        """Find contact-related URLs"""
        contact_urls = []
        contact_patterns = ['contact', 'about', 'team', 'get-in-touch', 'reach-us']
        
        try:
            links = await page.query_selector_all('a[href]')
            for link in links:
                href = await link.get_attribute("href")
                if href:
                    full_url = urljoin(base_url, href)
                    parsed = urlparse(full_url)
                    
                    for pattern in contact_patterns:
                        if pattern in parsed.path.lower():
                            contact_urls.append(full_url)
                            break
        except Exception as e:
            self.logger.debug(f"Error finding contact URLs: {e}")
        
        return contact_urls
    
    async def _extract_business_info(self, page: Page, result: ScrapeResult) -> ScrapeResult:
        """Extract business name and info from page"""
        try:
            # Try meta tags first
            title = await page.title()
            if title and not result.business_name:
                result.business_name = title.split('|')[0].split('-')[0].strip()
            
            # Try Open Graph
            og_title = await page.get_attribute('meta[property="og:title"]', "content")
            if og_title and not result.business_name:
                result.business_name = og_title
            
            # Try favicon for business indication
            favicon = await page.get_attribute('link[rel="icon"]', "href")
            if favicon:
                result.raw_data["favicon"] = favicon
            
        except Exception as e:
            self.logger.debug(f"Error extracting business info: {e}")
        
        return result
    
    def _extract_phones(self, text: str) -> List[str]:
        """Extract phone numbers from text"""
        phone_patterns = [
            r'\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
            r'\+?\d{1,3}[-.\s]?\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}',
        ]
        
        phones = []
        for pattern in phone_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                clean = re.sub(r'[^\d+]', '', match)
                if len(clean) >= 10:
                    phones.append(match)
        
        return list(set(phones))
    
    def _is_valid_email(self, email: str) -> bool:
        """Validate email address"""
        # Filter out common false positives
        invalid = [
            'example.com', 'test.com', 'domain.com',
            'noreply', 'no-reply', 'donotreply',
            '.png', '.jpg', '.svg', '@.',
        ]
        
        email_lower = email.lower()
        for inv in invalid:
            if inv in email_lower:
                return False
        
        # Must have valid TLD
        if not re.search(r'\.[a-z]{2,}$', email_lower):
            return False
        
        return True
    
    def _deduplicate_emails(self, emails: List[str]) -> Optional[str]:
        """Deduplicate and return primary email"""
        if not emails:
            return None
        
        # Priority order for primary email
        priority_patterns = ['info@', 'contact@', 'hello@', 'sales@', 'support@']
        
        for pattern in priority_patterns:
            for email in emails:
                if pattern in email.lower():
                    return email
        
        # Return first valid email
        return emails[0] if emails else None
    
    def _parse_social_link(self, href: str) -> Dict[str, str]:
        """Parse social link and return platform"""
        result = {}
        
        if 'facebook.com' in href or 'fb.com' in href:
            result['facebook'] = href
        elif 'twitter.com' in href or 'x.com' in href:
            result['twitter'] = href
        elif 'instagram.com' in href:
            result['instagram'] = href
        elif 'linkedin.com' in href:
            result['linkedin'] = href
        
        return result
    
    async def validate_url(self, url: str) -> bool:
        """Validate URL for crawling"""
        if not url:
            return False
        
        # Check blocked domains
        blocked = any(domain in url.lower() for domain in self.safety_config.blocked_domains)
        if blocked:
            return False
        
        # Must be http/https
        if not url.startswith(('http://', 'https://')):
            return False
        
        return True