"""
Outflo - Scrape Job Manager
Queue management, retries, failures, logs, progress tracking
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import List, Dict, Any, Optional, Callable
from uuid import uuid4
import json

from .base import ScrapeResult, ScrapeSource, ScrapeStatus
from .config import SafetyConfig


class JobType(Enum):
    GOOGLE_MAPS_SEARCH = "google_maps_search"
    GOOGLE_MAPS_DETAIL = "google_maps_detail"
    WEBSITE_CRAWL = "website_crawl"
    LINKEDIN_ENRICH = "linkedin_enrich"
    CSV_IMPORT = "csv_import"
    BULK_ENRICH = "bulk_enrich"


class JobPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    URGENT = 4


@dataclass
class ScrapeJob:
    """Scrape job definition"""
    job_id: str
    job_type: JobType
    status: ScrapeStatus = ScrapeStatus.PENDING
    
    # Job data
    params: Dict[str, Any] = field(default_factory=dict)
    results: List[ScrapeResult] = field(default_factory=list)
    
    # Progress tracking
    total_items: int = 0
    processed_items: int = 0
    failed_items: int = 0
    
    # Timing
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Error tracking
    error_message: Optional[str] = None
    retry_count: int = 0
    
    # Organization
    organization_id: int = 0
    created_by: int = 0
    
    # Settings
    priority: JobPriority = JobPriority.NORMAL
    
    # Logs
    logs: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "job_id": self.job_id,
            "job_type": self.job_type.value if isinstance(self.job_type, Enum) else self.job_type,
            "status": self.status.value if isinstance(self.status, Enum) else self.status,
            "params": self.params,
            "progress": {
                "total": self.total_items,
                "processed": self.processed_items,
                "failed": self.failed_items,
                "percentage": (self.processed_items / self.total_items * 100) if self.total_items > 0 else 0,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "priority": self.priority.value if isinstance(self.priority, Enum) else self.priority,
            "logs": self.logs[-50:],  # Last 50 logs
        }
    
    def add_log(self, level: str, message: str, details: Optional[Dict] = None) -> None:
        """Add log entry"""
        self.logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            "details": details or {}
        })
    
    def update_progress(self, processed: int, failed: int = 0) -> None:
        """Update job progress"""
        self.processed_items = processed
        self.failed_items = failed


class JobManager:
    """
    Scrape Job Manager
    
    Features:
    - Job queue management
    - Progress tracking
    - Retry logic
    - Failure handling
    - Real-time updates
    """
    
    def __init__(self, safety_config: Optional[SafetyConfig] = None):
        self.safety_config = safety_config or SafetyConfig()
        self.logger = logging.getLogger(self.__class__.__name__)
        
        self.jobs: Dict[str, ScrapeJob] = {}
        self.job_queues: Dict[JobPriority, asyncio.Queue] = {
            JobPriority.URGENT: asyncio.Queue(),
            JobPriority.HIGH: asyncio.Queue(),
            JobPriority.NORMAL: asyncio.Queue(),
            JobPriority.LOW: asyncio.Queue(),
        }
        
        self.active_jobs: Dict[str, asyncio.Task] = {}
        self._running = False
        self._worker_tasks: List[asyncio.Task] = []
    
    async def start(self) -> None:
        """Start job manager workers"""
        self._running = True
        
        # Start worker tasks
        num_workers = 3
        for i in range(num_workers):
            task = asyncio.create_task(self._worker(i))
            self._worker_tasks.append(task)
        
        self.logger.info(f"Job manager started with {num_workers} workers")
    
    async def stop(self) -> None:
        """Stop job manager"""
        self._running = False
        
        # Cancel active jobs
        for task in self.active_jobs.values():
            task.cancel()
        
        # Wait for workers
        for task in self._worker_tasks:
            task.cancel()
        
        await asyncio.gather(*self._worker_tasks, return_exceptions=True)
        self.logger.info("Job manager stopped")
    
    async def create_job(
        self,
        job_type: JobType,
        params: Dict[str, Any],
        organization_id: int,
        created_by: int,
        priority: JobPriority = JobPriority.NORMAL,
        total_items: int = 0
    ) -> str:
        """Create a new scrape job"""
        job_id = str(uuid4())
        
        job = ScrapeJob(
            job_id=job_id,
            job_type=job_type,
            params=params,
            organization_id=organization_id,
            created_by=created_by,
            priority=priority,
            total_items=total_items
        )
        
        self.jobs[job_id] = job
        
        # Add to queue based on priority
        await self.job_queues[priority].put(job_id)
        
        job.add_log("INFO", f"Job created: {job_type.value}")
        
        self.logger.info(f"Created job {job_id} of type {job_type.value}")
        
        return job_id
    
    async def _worker(self, worker_id: int) -> None:
        """Worker coroutine to process jobs"""
        self.logger.info(f"Worker {worker_id} started")
        
        while self._running:
            try:
                # Check queues in priority order
                job_id = None
                for priority in [JobPriority.URGENT, JobPriority.HIGH, JobPriority.NORMAL, JobPriority.LOW]:
                    try:
                        job_id = await asyncio.wait_for(
                            self.job_queues[priority].get(),
                            timeout=1.0
                        )
                        break
                    except asyncio.TimeoutError:
                        continue
                
                if not job_id:
                    continue
                
                job = self.jobs.get(job_id)
                if not job:
                    continue
                
                # Process job
                self.logger.info(f"Worker {worker_id} processing job {job_id}")
                await self._process_job(job)
                
            except Exception as e:
                self.logger.error(f"Worker {worker_id} error: {e}")
            
            await asyncio.sleep(0.1)
    
    async def _process_job(self, job: ScrapeJob) -> None:
        """Process a single job"""
        job.status = ScrapeStatus.RUNNING
        job.started_at = datetime.utcnow()
        job.add_log("INFO", "Job started processing")
        
        try:
            # Import scraper based on job type
            if job.job_type == JobType.GOOGLE_MAPS_SEARCH:
                from .google_maps import GoogleMapsScraper
                scraper = GoogleMapsScraper(self.safety_config)
                await scraper.initialize()
                
                results = await scraper.search(
                    keyword=job.params.get("keyword", ""),
                    location=job.params.get("location"),
                    limit=job.params.get("limit", 50)
                )
                
                for result in results:
                    job.results.append(result)
                
                await scraper.cleanup()
                
            elif job.job_type == JobType.WEBSITE_CRAWL:
                from .website import WebsiteCrawler
                scraper = WebsiteCrawler(self.safety_config)
                await scraper.initialize()
                
                result = await scraper.scrape(job.params.get("url", ""))
                job.results.append(result)
                
                await scraper.cleanup()
                
            elif job.job_type == JobType.LINKEDIN_ENRICH:
                from .linkedin import LinkedInEnricher
                scraper = LinkedInEnricher(self.safety_config)
                await scraper.initialize()
                
                result = await scraper.enrich(job.params.get("linkedin_url", ""))
                job.results.append(result)
                
                await scraper.cleanup()
            
            job.status = ScrapeStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.add_log("INFO", f"Job completed with {len(job.results)} results")
            
        except Exception as e:
            self.logger.error(f"Error processing job {job.job_id}: {e}")
            job.status = ScrapeStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            job.add_log("ERROR", f"Job failed: {str(e)}")
    
    async def get_job(self, job_id: str) -> Optional[ScrapeJob]:
        """Get job by ID"""
        return self.jobs.get(job_id)
    
    async def get_jobs(
        self,
        organization_id: int,
        status: Optional[ScrapeStatus] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get jobs for organization"""
        jobs = [
            job.to_dict()
            for job in self.jobs.values()
            if job.organization_id == organization_id
            and (status is None or job.status == status)
        ]
        
        # Sort by created_at desc
        jobs.sort(key=lambda x: x["created_at"] or "", reverse=True)
        
        return jobs[:limit]
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job"""
        job = self.jobs.get(job_id)
        if not job:
            return False
        
        if job.status in [ScrapeStatus.COMPLETED, ScrapeStatus.FAILED]:
            return False
        
        job.status = ScrapeStatus.CANCELLED
        job.completed_at = datetime.utcnow()
        job.add_log("INFO", "Job cancelled by user")
        
        return True
    
    async def retry_job(self, job_id: str) -> bool:
        """Retry a failed job"""
        job = self.jobs.get(job_id)
        if not job:
            return False
        
        if job.status != ScrapeStatus.FAILED:
            return False
        
        job.status = ScrapeStatus.RETRYING
        job.retry_count += 1
        job.error_message = None
        job.started_at = None
        job.completed_at = None
        
        # Re-add to queue
        await self.job_queues[job.priority].put(job_id)
        
        job.add_log("INFO", f"Job retry #{job.retry_count}")
        
        return True
    
    async def get_job_stats(self, organization_id: int) -> Dict[str, Any]:
        """Get job statistics for organization"""
        jobs = [j for j in self.jobs.values() if j.organization_id == organization_id]
        
        stats = {
            "total": len(jobs),
            "pending": sum(1 for j in jobs if j.status == ScrapeStatus.PENDING),
            "running": sum(1 for j in jobs if j.status == ScrapeStatus.RUNNING),
            "completed": sum(1 for j in jobs if j.status == ScrapeStatus.COMPLETED),
            "failed": sum(1 for j in jobs if j.status == ScrapeStatus.FAILED),
            "total_results": sum(len(j.results) for j in jobs),
            "total_processed": sum(j.processed_items for j in jobs),
        }
        
        return stats