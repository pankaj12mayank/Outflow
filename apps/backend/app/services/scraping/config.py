"""
Outflo - Safe Scraping Engine Configuration
Rate limits, delays, and safety settings
"""

from dataclasses import dataclass, field
from typing import List, Optional
import random


@dataclass
class SafetyConfig:
    """Safety configuration for scraping operations"""
    
    # Rate limiting
    requests_per_minute: int = 20
    requests_per_hour: int = 500
    min_delay_seconds: float = 3.0
    max_delay_seconds: float = 8.0
    
    # User agent rotation
    use_random_user_agent: bool = True
    desktop_user_agents: List[str] = field(default_factory=lambda: [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    ])
    mobile_user_agents: List[str] = field(default_factory=lambda: [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    ])
    
    # Browser settings
    headless: bool = True
    stealth_mode: bool = True
    disable_images: bool = False
    disable_css: bool = True
    
    # Retry settings
    max_retries: int = 3
    retry_delay_seconds: float = 5.0
    exponential_backoff: bool = True
    
    # Timeouts
    page_load_timeout: int = 30
    navigation_timeout: int = 45
    
    # Block lists
    blocked_domains: List[str] = field(default_factory=lambda: [
        "facebook.com",
        "instagram.com",
        "twitter.com",
        "linkedin.com",
        "google.com",
        "youtube.com",
    ])
    
    def get_random_delay(self) -> float:
        """Get random delay between min and max"""
        return random.uniform(self.min_delay_seconds, self.max_delay_seconds)
    
    def get_random_user_agent(self, mobile: bool = False) -> str:
        """Get random user agent from pool"""
        if mobile:
            return random.choice(self.mobile_user_agents)
        return random.choice(self.desktop_user_agents)


# Global safety config instance
DEFAULT_SAFETY_CONFIG = SafetyConfig()