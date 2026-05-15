"""
Scraping API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from app.middleware import get_current_user

router = APIRouter(prefix="/scraping", tags=["Scraping"])


class ScrapingJobResponse(BaseModel):
    id: str
    status: str = "pending"
    job_type: str
    total_items: int = 0


@router.get("/jobs", response_model=List[ScrapingJobResponse])
async def list_jobs(
    current_user: dict = Depends(get_current_user),
):
    """List scraping jobs."""
    return []


@router.post("/jobs")
async def create_job(
    job_config: dict,
    current_user: dict = Depends(get_current_user),
):
    """Create new scraping job."""
    from app.services.task_service import TaskService
    task_service = TaskService()
    task = await task_service.create_task({
        "task_type": "scraping",
        "organization_id": current_user.get("organization_id"),
        "user_id": current_user.get("sub"),
        "payload": job_config,
    })
    return task