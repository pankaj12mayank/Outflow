"""
Organization Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime

from app.middleware.system_owner_auth import get_current_system_owner
from app.services.organization_service import (
    OrganizationService, OrganizationAnalyticsService,
    ImpersonationService, OrganizationMembersService
)


router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("")
async def list_organizations(
    query: Optional[str] = None,
    status: Optional[str] = None,
    plan_id: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    """List all organizations with search and filters."""
    skip = (page - 1) * page_size
    
    result = await OrganizationService.get_organizations(
        query=query,
        status=status,
        plan_id=plan_id,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order,
        skip=skip,
        limit=page_size
    )
    
    return result


@router.get("/{organization_id}")
async def get_organization(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organization details."""
    org = await OrganizationService.get_organization(organization_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.put("/{organization_id}")
async def update_organization(
    organization_id: str,
    update_data: dict,
    current_user: dict = Depends(get_current_system_owner)
):
    """Update organization details."""
    org = await OrganizationService.update_organization(organization_id, update_data)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.post("/{organization_id}/suspend")
async def suspend_organization(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Suspend an organization."""
    result = await OrganizationService.suspend_organization(organization_id)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"message": "Organization suspended successfully"}


@router.post("/{organization_id}/activate")
async def activate_organization(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Activate a suspended organization."""
    result = await OrganizationService.activate_organization(organization_id)
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    return {"message": "Organization activated successfully"}


@router.post("/{organization_id}/change-plan")
async def change_plan(
    organization_id: str,
    plan_id: str,
    billing_cycle: str = "monthly",
    current_user: dict = Depends(get_current_system_owner)
):
    """Change organization's plan."""
    result = await OrganizationService.change_plan(organization_id, plan_id, billing_cycle)
    return {"message": "Plan changed successfully"}


@router.get("/{organization_id}/analytics")
async def get_organization_analytics(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organization analytics."""
    return await OrganizationAnalyticsService.get_organization_analytics(organization_id)


@router.get("/{organization_id}/billing")
async def get_organization_billing(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organization billing details."""
    return await OrganizationAnalyticsService.get_organization_billing(organization_id)


@router.get("/{organization_id}/activity")
async def get_organization_activity(
    organization_id: str,
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organization activity timeline."""
    activities = await OrganizationAnalyticsService.get_organization_activity(organization_id, limit)
    return {"activities": activities, "count": len(activities)}


@router.get("/{organization_id}/members")
async def get_organization_members(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organization members."""
    members = await OrganizationMembersService.get_members(organization_id)
    return {"members": members, "count": len(members)}


@router.delete("/{organization_id}/members/{user_id}")
async def remove_member(
    organization_id: str,
    user_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Remove a member from organization."""
    result = await OrganizationMembersService.remove_member(organization_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member removed successfully"}


router2 = APIRouter(prefix="/impersonate", tags=["Impersonation"])


@router2.post("/{organization_id}")
async def start_impersonation(
    organization_id: str,
    target_user_id: Optional[str] = None,
    current_user: dict = Depends(get_current_system_owner)
):
    """Start impersonating an organization admin."""
    try:
        result = await ImpersonationService.start_impersonation(organization_id, target_user_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router2.get("/verify")
async def verify_impersonation(token: str):
    """Verify impersonation token."""
    import jwt
    try:
        payload = jwt.decode(token, "system-owner-impersonation-secret", algorithms=["HS256"])
        return {"valid": True, "payload": payload}
    except:
        return {"valid": False}