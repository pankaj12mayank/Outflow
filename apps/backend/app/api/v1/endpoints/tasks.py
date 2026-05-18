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
    status: str = None,
    current_user: dict = Depends(get_current_user),
):
    from app.repositories.mongo_repositories import TaskRepository
    org_id = current_user.get("organization_id")
    task_repo = TaskRepository(org_id)
    if status:
        tasks = await task_repo.get_many_by({"status": status})
    else:
        tasks = await task_repo.get_all(skip, limit)
    return tasks


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