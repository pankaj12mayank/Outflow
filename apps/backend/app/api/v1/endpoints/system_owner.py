"""
Legacy System Owner API (RBAC/plan helpers).

DEPRECATED for new features (L18): use canonical routes instead:
- Auth: ``/api/v1/system-owner-auth/*``
- Dashboard: ``/api/v1/system-owner-dashboard/*``
- Orgs/plans: ``/api/v1/organizations/*``, ``/api/v1/plans/*``

Kept for backward compatibility; do not add new endpoints here.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

from fastapi import Request

from app.middleware.rbac import (
    get_current_user_with_role, 
    require_role, 
    require_permissions,
    require_feature
)
from app.services.rbac_service import (
    RoleService, PlanService, OrganizationPlanService,
    FeatureToggleService, SystemOwnerService
)
from app.models.rbac_models import Role


async def get_current_system_owner(request: Request):
    user = await get_current_user_with_role(request)
    if user.get("role") != Role.SYSTEM_OWNER.value:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System owner access required")
    return user


router = APIRouter(prefix="/system-owner", tags=["System Owner"], dependencies=[Depends(get_current_system_owner)])


class SystemOwnerUser(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool = True


class PlanCreate(BaseModel):
    name: str
    description: str
    price: float
    billing_cycle: str = "monthly"
    features: List[str] = []
    is_default: bool = False


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    billing_cycle: Optional[str] = None
    features: Optional[List[str]] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class PlanResponse(BaseModel):
    id: str
    name: str
    description: str
    price: float
    billing_cycle: str
    features: List[str]
    is_active: bool
    is_default: bool


class FeatureCreate(BaseModel):
    key: str
    name: str
    description: str = ""
    is_enabled: bool = True
    rollout_percentage: int = 100
    roles: List[str] = []
    organizations: List[str] = []


class FeatureResponse(BaseModel):
    key: str
    name: str
    description: str
    is_enabled: bool
    rollout_percentage: int


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    plan_id: Optional[str] = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    is_active: bool
    created_at: str


@router.get("/me", response_model=SystemOwnerUser)
async def get_system_owner_profile(
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    return current_user


@router.get("/organizations", response_model=List[OrganizationResponse])
async def list_organizations(
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    organizations = await SystemOwnerService.get_all_organizations(skip, limit)
    return organizations


@router.get("/organizations/{organization_id}", response_model=OrganizationResponse)
async def get_organization(
    organization_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    organization = await SystemOwnerService.get_organization(organization_id)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return organization


@router.put("/organizations/{organization_id}", response_model=OrganizationResponse)
async def update_organization(
    organization_id: str,
    org_update: OrganizationUpdate,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    org_data = org_update.model_dump(exclude_none=True)
    
    if org_data.get("plan_id"):
        await OrganizationPlanService.assign_plan(organization_id, org_data.pop("plan_id"))
    
    organization = await SystemOwnerService.update_organization(organization_id, org_data)
    if not organization:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return organization


@router.get("/users", response_model=List[SystemOwnerUser])
async def list_all_users(
    organization_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    users = await SystemOwnerService.get_all_users(organization_id, skip, limit)
    return users


@router.get("/plans", response_model=List[PlanResponse])
async def list_plans(
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    plans = await PlanService.get_plans()
    return plans


@router.post("/plans", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan: PlanCreate,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    plan_doc = await PlanService.create_plan(plan.model_dump())
    return plan_doc


@router.get("/plans/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    plan = await PlanService.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.put("/plans/{plan_id}", response_model=PlanResponse)
async def update_plan(
    plan_id: str,
    plan_update: PlanUpdate,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    plan = await PlanService.update_plan(plan_id, plan_update.model_dump(exclude_none=True))
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return plan


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    result = await PlanService.delete_plan(plan_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    return None


@router.get("/features", response_model=List[FeatureResponse])
async def list_features(
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    features = await FeatureToggleService.get_features()
    return features


@router.post("/features", response_model=FeatureResponse, status_code=status.HTTP_201_CREATED)
async def create_feature(
    feature: FeatureCreate,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    feature_doc = await FeatureToggleService.create_feature(feature.model_dump())
    return feature_doc


@router.put("/features/{feature_key}", response_model=FeatureResponse)
async def update_feature(
    feature_key: str,
    feature_update: dict,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    feature = await FeatureToggleService.update_feature(feature_key, feature_update)
    if not feature:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature not found")
    return feature


@router.delete("/features/{feature_key}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feature(
    feature_key: str,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    result = await FeatureToggleService.delete_feature(feature_key)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feature not found")
    return None


@router.get("/analytics/overview")
async def get_analytics_overview(
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    return await SystemOwnerService.get_analytics_overview()


@router.get("/billing/overview")
async def get_billing_overview(
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    return await SystemOwnerService.get_billing_overview()


@router.post("/assign-role")
async def assign_user_role(
    user_id: str,
    role: Role,
    organization_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    user_role = await RoleService.assign_role(user_id, role, organization_id)
    return user_role


@router.get("/permissions")
async def get_user_permissions(
    user_id: str,
    organization_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user_with_role),
):
    if current_user.get("role") != Role.SYSTEM_OWNER.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="System Owner access required")
    
    from app.middleware.rbac import RBACMiddleware
    permissions = await RBACMiddleware.get_user_permissions(user_id, organization_id)
    return {"user_id": user_id, "permissions": permissions}