"""
Outflo - Base Scraper Interface
Abstract base class for all scrapers with safety features
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import asyncio
import logging
import traceback

from .config import SafetyConfig, DEFAULT_SAFETY_CONFIG
from app.core.logging import scraping_logger


class ScrapeStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class ScrapeSource(Enum):
    GOOGLE_MAPS = "google_maps"
    WEBSITE = "website"
    LINKEDIN = "linkedin"
    CSV = "csv"
    MANUAL = "manual"


@dataclass
class ScrapeResult:
    """Standardized scrape result"""
    success: bool
    source: ScrapeSource
    
    # Business data
    business_name: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Location
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    
    # Classification
    category: Optional[str] = None
    subcategory: Optional[str] = None
    industry: Optional[str] = None
    
    # Social & Web
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    twitter_url: Optional[str] = None
    instagram_url: Optional[str] = None
    
    # Website extraction
    whatsapp: Optional[str] = None
    calendly: Optional[str] = None
    facebook_page: Optional[str] = None
    has_contact_form: bool = False
    has_cta: bool = False
    
    # LinkedIn specific
    linkedin_name: Optional[str] = None
    linkedin_title: Optional[str] = None
    linkedin_company: Optional[str] = None
    linkedin_location: Optional[str] = None
    
    # Metadata
    source_url: Optional[str] = None
    scraped_at: datetime = field(default_factory=datetime.utcnow)
    enrichment_status: str = "pending"
    
    # Quality indicators
    data_quality_score: float = 0.0
    missing_fields: List[str] = field(default_factory=list)
    
    # Raw data
    raw_data: Dict[str, Any] = field(default_factory=dict)
    
    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "business_name": self.business_name,
            "website": self.website,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "postal_code": self.postal_code,
            "category": self.category,
            "subcategory": self.subcategory,
            "industry": self.industry,
            "linkedin_url": self.linkedin_url,
            "facebook_url": self.facebook_url,
            "twitter_url": self.twitter_url,
            "instagram_url": self.instagram_url,
            "whatsapp": self.whatsapp,
            "calendly": self.calendly,
            "facebook_page": self.facebook_page,
            "has_contact_form": self.has_contact_form,
            "has_cta": self.has_cta,
            "linkedin_name": self.linkedin_name,
            "linkedin_title": self.linkedin_title,
            "linkedin_company": self.linkedin_company,
            "linkedin_location": self.linkedin_location,
            "source_url": self.source_url,
            "scraped_at": self.scraped_at.isoformat() if self.scraped_at else None,
            "enrichment_status": self.enrichment_status,
            "data_quality_score": self.data_quality_score,
            "missing_fields": self.missing_fields,
            "source": self.source.value if isinstance(self.source, Enum) else self.source,
            "raw_data": self.raw_data,
            "success": self.success,
            "error_message": self.error_message,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScrapeResult":
        """Create from dictionary"""
        result = cls(
            success=data.get("success", False),
            source=ScrapeSource(data.get("source", "manual")),
        )
        
        for key, value in data.items():
            if hasattr(result, key):
                setattr(result, key, value)
        
        return result


class BaseScraper(ABC):
    """Abstract base class for all scrapers"""
    
    def __init__(self, safety_config: Optional[SafetyConfig] = None):
        self.safety_config = safety_config or DEFAULT_SAFETY_CONFIG
        self.logger = logging.getLogger(self.__class__.__name__)
        self._browser = None
        self._context = None
    
    async def initialize(self) -> None:
        """Initialize browser and context"""
        raise NotImplementedError
    
    async def cleanup(self) -> None:
        """Cleanup resources"""
        raise NotImplementedError
    
    async def _safe_delay(self) -> None:
        """Apply safe random delay"""
        delay = self.safety_config.get_random_delay()
        await asyncio.sleep(delay)
    
    async def _retry_with_backoff(
        self,
        func,
        max_retries: Optional[int] = None,
        base_delay: Optional[float] = None
    ):
        """Retry function with exponential backoff"""
        max_retries = max_retries or self.safety_config.max_retries
        base_delay = base_delay or self.safety_config.retry_delay_seconds
        
        for attempt in range(max_retries):
            try:
                return await func()
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
                delay = base_delay * (2 ** attempt)
                self.logger.warning(f"Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                await asyncio.sleep(delay)
    
    @abstractmethod
    async def scrape(self, url: str, **kwargs) -> ScrapeResult:
        """Main scrape method - must be implemented by subclasses"""
        pass
    
    async def validate_url(self, url: str) -> bool:
        """Validate URL before scraping"""
        if not url:
            return False
        
        blocked = any(domain in url.lower() for domain in self.safety_config.blocked_domains)
        if blocked:
            self.logger.warning(f"URL blocked by safety policy: {url}")
            return False
        
        return True
    
    def calculate_quality_score(self, result: ScrapeResult) -> float:
        """Calculate data quality score based on completeness"""
        score = 0.0
        total_fields = 0
        
        important_fields = [
            "business_name",
            "email",
            "phone",
            "address",
            "category",
            "website",
        ]
        
        for field_name in important_fields:
            total_fields += 1
            if getattr(result, field_name, None):
                score += 2 if field_name == "email" else 1
        
        secondary_fields = [
            "city",
            "state",
            "country",
            "linkedin_url",
            "whatsapp",
            "calendly",
        ]
        
        for field_name in secondary_fields:
            total_fields += 1
            if getattr(result, field_name, None):
                score += 0.5
        
        return min(score / total_fields * 10, 10.0) if total_fields > 0 else 0.0