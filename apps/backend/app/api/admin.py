"""
Admin API Endpoints
Super Admin - Organizations, Plans, Billing, Monitoring, Abuse
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.middleware import get_current_user, require_super_admin
from app.db.mongodb import MongoDB
from app.services.admin.service import get_admin_service, get_abuse_service, get_monitoring_service
from app.core.logging import admin_logger

router = APIRouter(prefix="/admin", tags=["Admin"])


class CreatePlanRequest(BaseModel):
    name: str
    slug: str
    description: Optional[str] = ""
    monthly_price: float
    yearly_price: float
    features: Dict[str, Any] = {}
    limits: Dict[str, Any] = {}
    ai_limits: Dict[str, Any] = {}
    email_limits: Dict[str, Any] = {}
    scraping_limits: Dict[str, Any] = {}
    is_active: bool = True
    is_featured: bool = False


class UpdatePlanRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    monthly_price: Optional[float] = None
    yearly_price: Optional[float] = None
    features: Optional[Dict[str, Any]] = None
    limits: Optional[Dict[str, Any]] = None
    ai_limits: Optional[Dict[str, Any]] = None
    email_limits: Optional[Dict[str, Any]] = None
    scraping_limits: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None


class SuspendOrgRequest(BaseModel):
    reason: Optional[str] = None


class ResolveAbuseRequest(BaseModel):
    action_taken: str


# ==================== PLATFORM STATS ====================

@router.get("/stats")
async def get_platform_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get platform statistics - MRR, ARR, users, orgs"""
    require_super_admin(current_user)
    from app.db import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.models import Organization, User
    from app.models.admin_models import Subscription, Invoice
    from datetime import timedelta

    async with AsyncSessionLocal() as db:
        from sqlalchemy import func
        
        org_count = await db.execute(select(func.count(Organization.id)))
        total_orgs = org_count.scalar() or 0
        
        active_orgs = await db.execute(select(func.count(Organization.id)).where(Organization.is_active == True))
        active_orgs_count = active_orgs.scalar() or 0
        
        user_count = await db.execute(select(func.count(User.id)))
        total_users = user_count.scalar() or 0
        
        mrr_result = await db.execute(
            select(func.sum(Invoice.total)).where(
                Invoice.status == "paid",
                Invoice.created_at >= datetime.utcnow() - timedelta(days=30)
            )
        )
        mrr = mrr_result.scalar() or 0.0
        
        active_subs = await db.execute(
            select(func.count(Subscription.id)).where(Subscription.status == "active")
        )
        active_subs_count = active_subs.scalar() or 0

        return {
            "total_organizations": total_orgs,
            "active_organizations": active_orgs_count,
            "total_users": total_users,
            "mrr": round(mrr / 12, 2) if mrr > 0 else 0,
            "arr": round(mrr, 2),
            "active_subscriptions": active_subs_count,
            "churn_rate": 0.0,
            "new_orgs_this_month": 0,
        }


@router.get("/monitoring")
async def get_monitoring_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get real-time system monitoring stats"""
    require_super_admin(current_user)
    
    monitoring_service = get_monitoring_service()
    status = await monitoring_service.get_system_status()
    polling = await monitoring_service.get_polling_health()
    queue = await monitoring_service.get_queue_status()
    
    return {
        "server_status": status.get("server_status", "unknown"),
        "uptime_seconds": status.get("uptime_seconds", 0),
        "active_connections": polling.get("active_connections", 0),
        "active_polling_users": polling.get("active_connections", 0),
        "avg_response_time_ms": polling.get("avg_latency_ms", 0),
        "error_rate": polling.get("error_rate", 0),
        "queue_size": queue.get("queue_size", 0),
        "scraping_jobs_running": queue.get("active_tasks", 0),
        "scraping_jobs_pending": queue.get("pending_tasks", 0),
    }


# ==================== ORGANIZATIONS ====================

@router.get("/organizations")
async def list_organizations(
    search: str = "",
    status: str = "",
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """List all organizations with pagination"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    admin_service = get_admin_service()
    
    async with AsyncSessionLocal() as db:
        orgs, total = await admin_service.list_organizations(
            db, search=search, status=status, page=page, limit=limit
        )
    
    return {
        "data": orgs,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/organizations/{org_id}")
async def get_organization(
    org_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get organization details"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    admin_service = get_admin_service()
    
    async with AsyncSessionLocal() as db:
        org = await admin_service.get_organization(org_id, db)
    
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return org


@router.post("/organizations/{org_id}/suspend")
async def suspend_organization(
    org_id: int,
    request: SuspendOrgRequest,
    current_user: dict = Depends(get_current_user),
):
    """Suspend an organization"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    admin_service = get_admin_service()
    
    async with AsyncSessionLocal() as db:
        result = await admin_service.suspend_organization(org_id, db, request.reason)
    
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    admin_logger.info(f"Organization {org_id} suspended", admin_id=current_user.get("id"))
    return {"success": True, "message": "Organization suspended"}


@router.post("/organizations/{org_id}/reactivate")
async def reactivate_organization(
    org_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Reactivate a suspended organization"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    admin_service = get_admin_service()
    
    async with AsyncSessionLocal() as db:
        result = await admin_service.reactivate_organization(org_id, db)
    
    if not result:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    admin_logger.info(f"Organization {org_id} reactivated", admin_id=current_user.get("id"))
    return {"success": True, "message": "Organization reactivated"}


@router.post("/organizations/{org_id}/update-subscription")
async def update_subscription(
    org_id: int,
    plan_id: int,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Update organization's subscription plan"""
    require_super_admin(current_user)
    
    admin_service = get_admin_service()
    result = await admin_service.update_subscription(org_id, plan_id, status)
    
    if not result:
        raise HTTPException(status_code=404, detail="Failed to update subscription")
    
    return {"success": True, "message": "Subscription updated"}


# ==================== PLANS ====================

@router.get("/plans")
async def list_plans(
    current_user: dict = Depends(get_current_user),
):
    """List all pricing plans"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.admin_models import Plan
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Plan).order_by(Plan.monthly_price.asc()))
        plans = result.scalars().all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "description": p.description,
            "monthly_price": p.monthly_price,
            "yearly_price": p.yearly_price,
            "features": p.features or {},
            "limits": p.limits or {},
            "ai_limits": p.ai_limits or {},
            "email_limits": p.email_limits or {},
            "scraping_limits": p.scraping_limits or {},
            "is_active": p.is_active,
            "is_featured": p.is_featured,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in plans
    ]


@router.post("/plans")
async def create_plan(
    request: CreatePlanRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a new pricing plan"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    from app.models.admin_models import Plan
    
    async with AsyncSessionLocal() as db:
        plan = Plan(
            name=request.name,
            slug=request.slug,
            description=request.description,
            monthly_price=request.monthly_price,
            yearly_price=request.yearly_price,
            features=request.features,
            limits=request.limits,
            ai_limits=request.ai_limits,
            email_limits=request.email_limits,
            scraping_limits=request.scraping_limits,
            is_active=request.is_active,
            is_featured=request.is_featured,
        )
        db.add(plan)
        await db.commit()
        await db.refresh(plan)
    
    admin_logger.info(f"Plan created: {request.name}", admin_id=current_user.get("id"))
    return {"success": True, "plan_id": plan.id}


@router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: int,
    request: UpdatePlanRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update a pricing plan"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.admin_models import Plan
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Plan).where(Plan.id == plan_id))
        plan = result.scalar_one_or_none()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        if request.name is not None:
            plan.name = request.name
        if request.description is not None:
            plan.description = request.description
        if request.monthly_price is not None:
            plan.monthly_price = request.monthly_price
        if request.yearly_price is not None:
            plan.yearly_price = request.yearly_price
        if request.features is not None:
            plan.features = request.features
        if request.limits is not None:
            plan.limits = request.limits
        if request.ai_limits is not None:
            plan.ai_limits = request.ai_limits
        if request.email_limits is not None:
            plan.email_limits = request.email_limits
        if request.scraping_limits is not None:
            plan.scraping_limits = request.scraping_limits
        if request.is_active is not None:
            plan.is_active = request.is_active
        if request.is_featured is not None:
            plan.is_featured = request.is_featured
        
        await db.commit()
    
    admin_logger.info(f"Plan updated: {plan_id}", admin_id=current_user.get("id"))
    return {"success": True, "message": "Plan updated"}


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Delete a pricing plan"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    from sqlalchemy import select
    from app.models.admin_models import Plan
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Plan).where(Plan.id == plan_id))
        plan = result.scalar_one_or_none()
        
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        await db.delete(plan)
        await db.commit()
    
    admin_logger.info(f"Plan deleted: {plan_id}", admin_id=current_user.get("id"))
    return {"success": True, "message": "Plan deleted"}


# ==================== BILLING ====================

@router.get("/billing")
async def get_billing_stats(
    current_user: dict = Depends(get_current_user),
):
    """Get billing statistics"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    from sqlalchemy import select, func
    from app.models.admin_models import Invoice
    
    async with AsyncSessionLocal() as db:
        total_result = await db.execute(select(func.sum(Invoice.total)))
        total = total_result.scalar() or 0.0
        
        paid_result = await db.execute(select(func.sum(Invoice.total)).where(Invoice.status == "paid"))
        paid = paid_result.scalar() or 0.0
        
        pending_result = await db.execute(select(func.sum(Invoice.total)).where(Invoice.status == "pending"))
        pending = pending_result.scalar() or 0.0
        
        failed_result = await db.execute(select(func.sum(Invoice.total)).where(Invoice.status == "failed"))
        failed = failed_result.scalar() or 0.0
        
        count_result = await db.execute(select(func.count(Invoice.id)))
        total_count = count_result.scalar() or 0

    return {
        "total_invoices": total_count,
        "total_revenue": round(total, 2),
        "paid_invoices": round(paid, 2),
        "pending_invoices": round(pending, 2),
        "failed_invoices": round(failed, 2),
        "average_invoice_value": round(total / max(total_count, 1), 2),
    }


@router.get("/billing/invoices")
async def list_invoices(
    status: str = "",
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """List all invoices"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    from sqlalchemy import select, desc
    from app.models.admin_models import Invoice
    
    async with AsyncSessionLocal() as db:
        query = select(Invoice).order_by(desc(Invoice.created_at))
        
        if status:
            query = query.where(Invoice.status == status)
        
        query = query.offset((page - 1) * limit).limit(limit)
        result = await db.execute(query)
        invoices = result.scalars().all()
        
        count_query = select(func.count(Invoice.id))
        if status:
            count_query = count_query.where(Invoice.status == status)
        count_result = await db.execute(count_query)
        total = count_result.scalar() or 0

    return {
        "data": [
            {
                "id": i.id,
                "organization_id": i.organization_id,
                "amount": i.total,
                "status": i.status,
                "created_at": i.created_at.isoformat() if i.created_at else None,
            }
            for i in invoices
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


# ==================== ABUSE ====================

@router.get("/abuse")
async def list_abuse_reports(
    status: str = "",
    severity: str = "",
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user),
):
    """List all abuse reports"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    abuse_service = get_abuse_service()
    
    async with AsyncSessionLocal() as db:
        reports, total = await abuse_service.list_abuse_reports(db, status, severity, page, limit)
    
    return {
        "data": reports,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/abuse/{report_id}/resolve")
async def resolve_abuse_report(
    report_id: int,
    request: ResolveAbuseRequest,
    current_user: dict = Depends(get_current_user),
):
    """Resolve an abuse report"""
    require_super_admin(current_user)
    
    from app.db import AsyncSessionLocal
    abuse_service = get_abuse_service()
    
    async with AsyncSessionLocal() as db:
        result = await abuse_service.resolve_abuse_report(report_id, request.action_taken, db)
    
    if not result:
        raise HTTPException(status_code=404, detail="Report not found")
    
    admin_logger.info(f"Abuse report {report_id} resolved", admin_id=current_user.get("id"))
    return {"success": True, "message": "Report resolved"}


# ==================== LIMITS ====================

@router.get("/organizations/{org_id}/limits")
async def get_org_limits(
    org_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Get organization limits"""
    require_super_admin(current_user)
    
    admin_service = get_admin_service()
    limits = await admin_service.get_limits(org_id)
    return limits


@router.put("/organizations/{org_id}/limits")
async def update_org_limits(
    org_id: int,
    limits: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
):
    """Update organization limits"""
    require_super_admin(current_user)
    
    admin_service = get_admin_service()
    await admin_service.update_limits(org_id, limits)
    
    admin_logger.info(f"Organization {org_id} limits updated", admin_id=current_user.get("id"))
    return {"success": True, "message": "Limits updated"}


# ==================== FEATURE FLAGS ====================

@router.get("/feature-flags")
async def get_feature_flags(
    current_user: dict = Depends(get_current_user),
):
    """Get all feature flags"""
    require_super_admin(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        doc = await db.cms_settings.find_one({"type": "feature_toggles"})
        if doc and doc.get("features"):
            flags = []
            for key, value in doc["features"].items():
                flags.append({
                    "key": key,
                    "is_enabled": value,
                    "rollout": 100 if value else 0,
                })
            return flags
    except Exception:
        pass
    return [
        {"key": "ai_scraping", "is_enabled": True, "rollout": 100},
        {"key": "email_sequences", "is_enabled": True, "rollout": 100},
        {"key": "analytics", "is_enabled": True, "rollout": 100},
        {"key": "api_access", "is_enabled": False, "rollout": 0},
        {"key": "custom_domain", "is_enabled": False, "rollout": 0},
    ]


@router.put("/feature-flags/{flag_key}")
async def update_feature_flag(
    flag_key: str,
    enabled: bool,
    rollout: int = 100,
    current_user: dict = Depends(get_current_user),
):
    """Update a feature flag"""
    require_super_admin(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        doc = await db.cms_settings.find_one({"type": "feature_toggles"})
        features = doc.get("features", {}) if doc else {}
        features[flag_key] = enabled
        await db.cms_settings.update_one(
            {"type": "feature_toggles"},
            {"$set": {"features": features, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== GLOBAL SETTINGS ====================

@router.get("/global-settings")
async def get_global_settings(
    current_user: dict = Depends(get_current_user),
):
    """Get global platform settings"""
    require_super_admin(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        doc = await db.cms_settings.find_one({"type": "global_settings"})
        if doc and doc.get("settings"):
            return [{"key": k, "value": v, "category": "general"} for k, v in doc["settings"].items()]
    except Exception:
        pass
    return [
        {"key": "max_orgs", "value": 1000, "category": "limits"},
        {"key": "max_users_per_org", "value": 50, "category": "limits"},
        {"key": "default_plan", "value": "starter", "category": "billing"},
        {"key": "enable_trial", "value": True, "category": "billing"},
        {"key": "trial_days", "value": 14, "category": "billing"},
    ]


@router.put("/global-settings/{setting_key}")
async def update_global_setting(
    setting_key: str,
    value: Any,
    current_user: dict = Depends(get_current_user),
):
    """Update a global setting"""
    require_super_admin(current_user)
    try:
        from app.db.mongodb import get_database
        db = await get_database()
        doc = await db.cms_settings.find_one({"type": "global_settings"})
        settings = doc.get("settings", {}) if doc else {}
        settings[setting_key] = value
        await db.cms_settings.update_one(
            {"type": "global_settings"},
            {"$set": {"settings": settings, "updated_at": datetime.utcnow()}},
            upsert=True
        )
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))