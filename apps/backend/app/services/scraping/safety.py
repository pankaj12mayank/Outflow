"""
Outflo - Safety System
Rate limiting, user agent rotation, retry logic
"""

import asyncio
import random
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional, Callable
from datetime import datetime, timedelta


@dataclass
class RateLimitEntry:
    """Rate limit tracking entry"""
    count: int
    window_start: datetime


class RateLimiter:
    """
    Rate Limiter with sliding window
    
    Features:
    - Per-domain rate limiting
    - Sliding window tracking
    - Automatic reset
    """
    
    def __init__(
        self,
        requests_per_minute: int = 20,
        requests_per_hour: int = 500
    ):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        
        self.domains: Dict[str, Dict[str, RateLimitEntry]] = defaultdict(dict)
    
    async def acquire(self, domain: str) -> bool:
        """
        Acquire rate limit token for domain
        
        Returns:
            True if allowed, False if rate limited
        """
        now = datetime.utcnow()
        
        # Initialize domain tracking
        if domain not in self.domains:
            self.domains[domain]["minute"] = RateLimitEntry(0, now)
            self.domains[domain]["hour"] = RateLimitEntry(0, now)
        
        # Check minute limit
        minute_entry = self.domains[domain]["minute"]
        if now - minute_entry.window_start > timedelta(minutes=1):
            minute_entry.count = 0
            minute_entry.window_start = now
        
        if minute_entry.count >= self.requests_per_minute:
            return False
        
        # Check hour limit
        hour_entry = self.domains[domain]["hour"]
        if now - hour_entry.window_start > timedelta(hours=1):
            hour_entry.count = 0
            hour_entry.window_start = now
        
        if hour_entry.count >= self.requests_per_hour:
            return False
        
        # Increment counters
        minute_entry.count += 1
        hour_entry.count += 1
        
        return True
    
    async def wait_if_needed(self, domain: str) -> None:
        """Wait if rate limited"""
        while not await self.acquire(domain):
            await asyncio.sleep(2)
    
    async def reset(self, domain: str) -> None:
        """Reset rate limits for domain"""
        if domain in self.domains:
            del self.domains[domain]


class UserAgentRotator:
    """
    User Agent Rotator
    
    Features:
    - Desktop/Mobile user agents
    - Random rotation
    - Browser diversity
    """
    
    DESKTOP_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    ]
    
    MOBILE_AGENTS = [
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
        "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    ]
    
    def __init__(self):
        self.usage_count: Dict[str, int] = defaultdict(int)
        self.last_used: Dict[str, datetime] = {}
    
    def get_random(self, mobile: bool = False) -> str:
        """Get random user agent"""
        if mobile:
            agent = random.choice(self.MOBILE_AGENTS)
        else:
            agent = random.choice(self.DESKTOP_AGENTS)
        
        self.usage_count[agent] += 1
        self.last_used[agent] = datetime.utcnow()
        
        return agent
    
    def get_balanced(self) -> str:
        """Get user agent with balanced usage"""
        now = datetime.utcnow()
        
        # Find agents not used recently
        available = [
            a for a in self.DESKTOP_AGENTS
            if self.usage_count[a] < 3 and
            (a not in self.last_used or now - self.last_used[a] > timedelta(minutes=5))
        ]
        
        if not available:
            # Reset and pick any
            self.usage_count.clear()
            available = self.DESKTOP_AGENTS
        
        agent = random.choice(available)
        self.usage_count[agent] += 1
        self.last_used[agent] = now
        
        return agent
    
    def get_for_domain(self, domain: str) -> str:
        """Get user agent optimized for domain"""
        # Most sites work best with Chrome on desktop
        return self.get_balanced()


class SafetyManager:
    """
    Centralized Safety Manager
    
    Coordinates:
    - Rate limiting
    - User agent rotation
    - Delays
    - Retry logic
    """
    
    def __init__(
        self,
        requests_per_minute: int = 20,
        requests_per_hour: int = 500,
        min_delay: float = 3.0,
        max_delay: float = 8.0,
        max_retries: int = 3
    ):
        self.rate_limiter = RateLimiter(requests_per_minute, requests_per_hour)
        self.user_agent_rotator = UserAgentRotator()
        
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.max_retries = max_retries
        
        self.blocked_domains = [
            "facebook.com",
            "instagram.com",
            "twitter.com",
            "x.com",
            "google.com",
            "youtube.com",
        ]
    
    async def wait_before_request(self, domain: str) -> None:
        """Wait before making request to respect rate limits"""
        await self.rate_limiter.wait_if_needed(domain)
        
        # Random delay between requests
        delay = random.uniform(self.min_delay, self.max_delay)
        await asyncio.sleep(delay)
    
    def should_block(self, url: str) -> bool:
        """Check if URL should be blocked"""
        url_lower = url.lower()
        return any(domain in url_lower for domain in self.blocked_domains)
    
    async def retry_with_backoff(
        self,
        func: Callable,
        context: str = "",
        base_delay: float = 2.0
    ) -> any:
        """Execute function with retry and exponential backoff"""
        last_exception = None
        
        for attempt in range(self.max_retries):
            try:
                return await func()
            except Exception as e:
                last_exception = e
                
                if attempt < self.max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    # Add randomness to avoid patterns
                    delay += random.uniform(0, 1)
                    
                    logging.warning(
                        f"{context}: Attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {delay:.1f}s..."
                    )
                    
                    await asyncio.sleep(delay)
                else:
                    logging.error(f"{context}: All {self.max_retries} attempts failed")
        
        raise last_exception
    
    def get_user_agent(self) -> str:
        """Get next user agent"""
        return self.user_agent_rotator.get_balanced()
    
    async def reset_domain(self, domain: str) -> None:
        """Reset rate limits for domain"""
        await self.rate_limiter.reset(domain)


# Global safety manager instance
_safety_manager: Optional[SafetyManager] = None


def get_safety_manager() -> SafetyManager:
    """Get or create global safety manager"""
    global _safety_manager
    if _safety_manager is None:
        _safety_manager = SafetyManager()
    return _safety_manager


import logging