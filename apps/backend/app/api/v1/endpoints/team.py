"""
Team API Endpoints (MongoDB)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.middleware.rbac import get_current_user_with_role, require_permissions
from app.repositories.mongo_repositories import TeamMemberRepository, TeamInvitationRepository

router = APIRouter(prefix="/team", tags=["Team"])


class TeamMemberResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool = True
    created_at: Optional[str] = None


class TeamInvitationResponse(BaseModel):
    id: str
    email: EmailStr
    role: str
    status: str
    invited_by: str
    created_at: str


@router.get("/members", response_model=List[TeamMemberResponse])
@require_permissions(["teams:read"])
async def list_team_members(
    current_user: dict = Depends(get_current_user_with_role),
):
    org_id = current_user.get("organization_id")
    member_repo = TeamMemberRepository(org_id)
    members = await member_repo.get_active_members()
    return members


@router.post("/members", response_model=TeamMemberResponse, status_code=status.HTTP_201_CREATED)
@require_permissions(["teams:create"])
async def add_team_member(
    member_in: dict,
    current_user: dict = Depends(get_current_user_with_role),
):
    org_id = current_user.get("organization_id")
    member_repo = TeamMemberRepository(org_id)
    member_data = {
        "email": member_in.get("email"),
        "full_name": member_in.get("full_name"),
        "role": member_in.get("role", "member"),
        "is_active": True,
        "organization_id": org_id,
    }
    member = await member_repo.create(member_data)
    return member


@router.put("/members/{member_id}", response_model=TeamMemberResponse)
@require_permissions(["teams:update"])
async def update_team_member(
    member_id: str,
    member_in: dict,
    current_user: dict = Depends(get_current_user_with_role),
):
    org_id = current_user.get("organization_id")
    member_repo = TeamMemberRepository(org_id)
    update_data = {k: v for k, v in member_in.items() if v is not None}
    member = await member_repo.update(member_id, update_data)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permissions(["teams:delete"])
async def remove_team_member(
    member_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    org_id = current_user.get("organization_id")
    member_repo = TeamMemberRepository(org_id)
    result = await member_repo.delete(member_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return None


@router.get("/invitations", response_model=List[TeamInvitationResponse])
@require_permissions(["teams:read"])
async def list_pending_invitations(
    current_user: dict = Depends(get_current_user_with_role),
):
    org_id = current_user.get("organization_id")
    invite_repo = TeamInvitationRepository(org_id)
    invitations = await invite_repo.get_pending_invitations()
    return invitations


@router.post("/invitations", response_model=TeamInvitationResponse, status_code=status.HTTP_201_CREATED)
@require_permissions(["teams:create"])
async def invite_team_member(
    invitation_in: dict,
    current_user: dict = Depends(get_current_user_with_role),
):
    org_id = current_user.get("organization_id")
    invite_repo = TeamInvitationRepository(org_id)
    invitation_data = {
        "email": invitation_in.get("email"),
        "role": invitation_in.get("role", "member"),
        "status": "pending",
        "invited_by": current_user.get("email"),
        "organization_id": org_id,
    }
    invitation = await invite_repo.create(invitation_data)
    return invitation


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permissions(["teams:delete"])
async def cancel_invitation(
    invitation_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    org_id = current_user.get("organization_id")
    invite_repo = TeamInvitationRepository(org_id)
    result = await invite_repo.delete(invitation_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    return None


@router.post("/invitations/{invitation_id}/resend", response_model=TeamInvitationResponse)
@require_permissions(["teams:update"])
async def resend_invitation(
    invitation_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    org_id = current_user.get("organization_id")
    invite_repo = TeamInvitationRepository(org_id)
    invitation = await invite_repo.update(invitation_id, {"resent_at": datetime.utcnow()})
    if not invitation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    return invitation