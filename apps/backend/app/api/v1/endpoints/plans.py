"""
Plan Management API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional

from app.middleware.system_owner_auth import get_current_system_owner
from app.services.plan_service import (
    PlanService, FeatureFlagService, UsageService, 
    SubscriptionService, PlanBuilderService
)
from app.models.plan_models import (
    PlanCreateRequest, PlanUpdateRequest, FeatureFlagCreate,
    PlanStatus, BillingCycle
)


router = APIRouter(prefix="/plans", tags=["Plans"])


@router.get("")
async def get_plans(include_archived: bool = False):
    """Get all plans."""
    plans = await PlanService.get_all_plans(include_archived)
    return {"plans": plans, "count": len(plans)}


@router.get("/templates")
async def get_plan_templates():
    """Get default plan templates."""
    templates = await PlanBuilderService.get_default_plan_templates()
    return {"templates": templates}


@router.get("/{plan_id}")
async def get_plan(plan_id: str):
    """Get a specific plan."""
    plan = await PlanService.get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.post("")
async def create_plan(
    plan: PlanCreateRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    """Create a new plan."""
    plan_doc = await PlanService.create_plan(plan.model_dump())
    return plan_doc


@router.put("/{plan_id}")
async def update_plan(
    plan_id: str,
    plan_update: PlanUpdateRequest,
    current_user: dict = Depends(get_current_system_owner)
):
    """Update a plan."""
    plan = await PlanService.update_plan(plan_id, plan_update.model_dump(exclude_none=True))
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.delete("/{plan_id}")
async def delete_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Delete (archive) a plan."""
    result = await PlanService.delete_plan(plan_id)
    if not result:
        raise HTTPException(status_code=400, detail="Cannot delete default plan")
    return {"message": "Plan archived successfully"}


@router.post("/{plan_id}/set-default")
async def set_default_plan(
    plan_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Set a plan as default."""
    plan = await PlanService.update_plan(plan_id, {"is_default": True})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan set as default"}


router2 = APIRouter(prefix="/features", tags=["Features"])


@router2.get("")
async def get_feature_flags():
    """Get all feature flags."""
    flags = await FeatureFlagService.get_all_flags()
    return {"features": flags, "count": len(flags)}


@router2.get("/{key}")
async def get_feature_flag(key: str):
    """Get a specific feature flag."""
    flag = await FeatureFlagService.get_flag(key)
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    return flag


@router2.post("")
async def create_feature_flag(
    flag: FeatureFlagCreate,
    current_user: dict = Depends(get_current_system_owner)
):
    """Create a new feature flag."""
    flag_doc = await FeatureFlagService.create_flag(flag.model_dump())
    return flag_doc


@router2.put("/{key}")
async def update_feature_flag(
    key: str,
    flag_update: dict,
    current_user: dict = Depends(get_current_system_owner)
):
    """Update a feature flag."""
    flag = await FeatureFlagService.update_flag(key, flag_update)
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    return flag


@router2.delete("/{key}")
async def delete_feature_flag(
    key: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Delete a feature flag."""
    result = await FeatureFlagService.delete_flag(key)
    if not result:
        raise HTTPException(status_code=404, detail="Feature flag not found")
    return {"message": "Feature flag deleted successfully"}


router3 = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router3.get("/organization/{organization_id}")
async def get_organization_subscription(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organization's subscription."""
    subscription = await SubscriptionService.get_subscription(organization_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription")
    
    plan = await PlanService.get_plan(subscription.get("plan_id"))
    subscription["plan"] = plan
    return subscription


@router3.post("/organization/{organization_id}")
async def create_subscription(
    organization_id: str,
    plan_id: str,
    billing_cycle: str = "monthly",
    current_user: dict = Depends(get_current_system_owner)
):
    """Create or update organization's subscription."""
    subscription = await SubscriptionService.create_subscription(
        organization_id, plan_id, billing_cycle
    )
    return subscription


@router3.post("/organization/{organization_id}/cancel")
async def cancel_subscription(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Cancel organization's subscription."""
    result = await SubscriptionService.cancel_subscription(organization_id)
    if not result:
        raise HTTPException(status_code=404, detail="No active subscription")
    return {"message": "Subscription canceled"}


router4 = APIRouter(prefix="/usage", tags=["Usage"])


@router4.get("/organization/{organization_id}")
async def get_usage(
    organization_id: str,
    resource: Optional[str] = None,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organization's usage."""
    if resource:
        usage = await UsageService.get_usage(organization_id, resource)
        return {"resource": resource, "usage": usage}
    
    usage = await UsageService.get_all_usage(organization_id)
    return {"usage": usage}


@router4.post("/record")
async def record_usage(
    organization_id: str,
    resource: str,
    count: int = 1,
    metadata: dict = {},
    current_user: dict = Depends(get_current_system_owner)
):
    """Record usage for an organization."""
    record = await UsageService.record_usage(organization_id, resource, count, metadata)
    return record


@router4.get("/limits/{organization_id}")
async def get_limits(
    organization_id: str,
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organization's limits and current usage."""
    from app.middleware.plan_limiter import get_organization_limits
    limits = await get_organization_limits(organization_id)
    return {"limits": limits}