"""
Team API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends
from typing import List
from pydantic import BaseModel
from app.middleware import get_current_user

router = APIRouter(prefix="/team", tags=["Team"])


class TeamMemberResponse(BaseModel):
    id: str
    email: str
    full_name: str = None
    role: str
    is_active: bool = True


@router.get("/members", response_model=List[TeamMemberResponse])
async def list_team_members(
    current_user: dict = Depends(get_current_user),
):
    return []


@router.get("/invitations")
async def list_pending_invitations(
    current_user: dict = Depends(get_current_user),
):
    return []