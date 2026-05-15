"""
Tasks API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from app.middleware import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskResponse(BaseModel):
    id: str
    title: str
    description: str = None
    status: str = "pending"
    priority: str = "medium"
    due_date: str = None


@router.get("", response_model=List[TaskResponse])
async def list_tasks(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user),
):
    return []


@router.post("", response_model=TaskResponse)
async def create_task(
    task_in: dict,
    current_user: dict = Depends(get_current_user),
):
    from app.services.task_service import TaskService
    org_id = current_user.get("organization_id")
    task_service = TaskService(org_id)
    task = await task_service.create_task(task_in)
    return task