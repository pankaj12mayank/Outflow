"""
Outflo - Scraping API Schemas
Pydantic models for scraping endpoints
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, HttpUrl
from enum import Enum


class JobTypeEnum(str, Enum):
    GOOGLE_MAPS_SEARCH = "google_maps_search"
    GOOGLE_MAPS_DETAIL = "google_maps_detail"
    WEBSITE_CRAWL = "website_crawl"
    LINKEDIN_ENRICH = "linkedin_enrich"
    CSV_IMPORT = "csv_import"
    BULK_ENRICH = "bulk_enrich"


class JobStatusEnum(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class JobPriorityEnum(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


# === Google Maps ===

class GoogleMapsSearchRequest(BaseModel):
    keyword: str = Field(..., description="Search keyword (e.g., 'restaurants', 'lawyers')")
    location: Optional[str] = Field(None, description="Location filter (e.g., 'NYC', 'Los Angeles')")
    limit: int = Field(50, ge=1, le=200, description="Maximum results to extract")


class GoogleMapsSearchResponse(BaseModel):
    job_id: str
    status: JobStatusEnum
    message: str


# === Website Crawl ===

class WebsiteCrawlRequest(BaseModel):
    url: HttpUrl = Field(..., description="Website URL to crawl")
    crawl_contact_pages: bool = Field(True, description="Also crawl contact/about pages")


class WebsiteCrawlResponse(BaseModel):
    job_id: str
    status: JobStatusEnum
    message: str


# === LinkedIn Enrich ===

class LinkedInEnrichRequest(BaseModel):
    linkedin_url: HttpUrl = Field(..., description="LinkedIn profile or company URL")


class LinkedInEnrichResponse(BaseModel):
    job_id: str
    status: JobStatusEnum
    message: str


# === CSV Import ===

class CSVColumnMapping(BaseModel):
    csv_column: str
    lead_field: str
    transformer: Optional[str] = None


class CSVImportRequest(BaseModel):
    filename: str
    total_rows: int
    mappings: List[CSVColumnMapping]
    options: Dict[str, Any] = Field(
        default_factory=lambda: {"skip_duplicates": True, "validate": True}
    )


class CSVPreviewResponse(BaseModel):
    columns: List[Dict[str, Any]]
    preview_rows: List[Dict[str, Any]]
    total_rows: int


# === Job Management ===

class JobResponse(BaseModel):
    job_id: str
    job_type: JobTypeEnum
    status: JobStatusEnum
    progress: Dict[str, Any]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    retry_count: int
    results_count: int
    logs: List[Dict[str, Any]]


class JobListResponse(BaseModel):
    jobs: List[JobResponse]
    total: int
    stats: Dict[str, Any]


class BulkEnrichRequest(BaseModel):
    lead_ids: List[int] = Field(..., description="Lead IDs to enrich")
    enrich_websites: bool = Field(True, description="Also crawl websites for enrichment")


# === Scraping Result ===

class LeadScrapedData(BaseModel):
    """Scraped lead data"""
    business_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    category: Optional[str] = None
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    twitter_url: Optional[str] = None
    instagram_url: Optional[str] = None
    whatsapp: Optional[str] = None
    calendly: Optional[str] = None
    has_contact_form: bool = False
    has_cta: bool = False
    data_quality_score: float = 0.0
    source_url: Optional[str] = None
    source_type: str


class ScrapeResultResponse(BaseModel):
    success: bool
    data: Optional[LeadScrapedData]
    error: Optional[str] = None


# === Dashboard ===

class ScrapingStatsResponse(BaseModel):
    total_leads: int
    enriched_leads: int
    leads_needing_enrichment: int
    active_jobs: int
    completed_jobs: int
    failed_jobs: int
    recent_results: List[LeadScrapedData]


# === Webhook ===

class ScrapeCompletedWebhook(BaseModel):
    job_id: str
    status: JobStatusEnum
    results_count: int
    errors: List[str]