from typing import Optional, List, Callable
from functools import wraps
from fastapi import HTTPException, status, Request, Depends
from app.services.plan_service import PlanService, UsageService, FeatureFlagService, SubscriptionService


async def get_current_user_with_plan(request: Request):
    from app.middleware import get_current_user
    
    try:
        user = await get_current_user(request)
        
        org_id = user.get("organization_id")
        if org_id:
            subscription = await SubscriptionService.get_subscription(org_id)
            if subscription:
                user["subscription"] = subscription
                plan = await PlanService.get_plan(subscription.get("plan_id"))
                if plan:
                    user["plan"] = plan
                    user["plan_features"] = await PlanService.get_plan_features(plan.get("_id"))
            else:
                default_plan = await PlanService.get_default_plan()
                if default_plan:
                    user["plan"] = default_plan
                    user["plan_features"] = await PlanService.get_plan_features(default_plan.get("_id"))
        
        return user
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


def check_feature(feature_key: str):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            
            if not current_user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
            
            plan_features = current_user.get("plan_features", {})
            feature = plan_features.get(feature_key, {})
            
            if not feature.get("enabled", False):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Feature '{feature_key}' is not available on your plan"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def check_limit(resource: str):
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get("current_user")
            
            if not current_user:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHENTICATED, detail="Not authenticated")
            
            org_id = current_user.get("organization_id")
            if not org_id:
                return await func(*args, **kwargs)
            
            plan_features = current_user.get("plan_features", {})
            feature = plan_features.get(resource, {})
            
            limit = feature.get("limit")
            if limit == -1:
                return await func(*args, **kwargs)
            
            if limit is not None and limit > 0:
                current_usage = await UsageService.get_usage(org_id, resource)
                
                if current_usage >= limit:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Limit reached for '{resource}'. Upgrade your plan for more."
                    )
                
                await UsageService.record_usage(org_id, resource, 1)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator


def require_feature(feature_key: str):
    async def feature_checker(current_user: dict = Depends(get_current_user_with_plan)):
        plan_features = current_user.get("plan_features", {})
        feature = plan_features.get(feature_key, {})
        
        if not feature.get("enabled", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Feature '{feature_key}' is not available on your plan"
            )
        
        return current_user
    
    return feature_checker


async def get_organization_features(organization_id: str) -> dict:
    subscription = await SubscriptionService.get_subscription(organization_id)
    
    if subscription:
        plan = await PlanService.get_plan(subscription.get("plan_id"))
        if plan:
            return await PlanService.get_plan_features(plan.get("_id"))
    
    default_plan = await PlanService.get_default_plan()
    if default_plan:
        return await PlanService.get_plan_features(default_plan.get("_id"))
    
    return {}


async def check_feature_for_organization(
    organization_id: str,
    feature_key: str,
    role: Optional[str] = None
) -> bool:
    enabled = await FeatureFlagService.is_enabled(
        feature_key,
        role=role,
        organization_id=organization_id
    )
    
    if not enabled:
        return False
    
    features = await get_organization_features(organization_id)
    feature = features.get(feature_key, {})
    
    return feature.get("enabled", False)


async def get_usage_for_organization(organization_id: str) -> dict:
    return await UsageService.get_all_usage(organization_id)


async def get_organization_limits(organization_id: str) -> dict:
    from app.db.mongodb import MongoDB
    from app.db.mongodb import serialize_doc
    
    limits = await MongoDB.get_collection("organization_limits").find({
        "organization_id": organization_id
    }).to_list(length=100)
    
    return {
        l.get("resource"): {
            "current": l.get("current_usage", 0),
            "limit": l.get("limit", 0),
            "remaining": max(0, l.get("limit", 0) - l.get("current_usage", 0))
        }
        for l in limits
    }


class UsageLimiter:
    @staticmethod
    async def check_and_record(organization_id: str, resource: str, count: int = 1) -> bool:
        features = await get_organization_features(organization_id)
        feature = features.get(resource, {})
        
        limit = feature.get("limit")
        if limit == -1:
            await UsageService.record_usage(organization_id, resource, count)
            return True
        
        if limit is not None and limit > 0:
            current_usage = await UsageService.get_usage(organization_id, resource)
            
            if current_usage + count > limit:
                return False
            
            await UsageService.record_usage(organization_id, resource, count)
            return True
        
        await UsageService.record_usage(organization_id, resource, count)
        return True