"""
System Owner Dashboard API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime

from app.middleware.system_owner_auth import get_current_system_owner
from app.services.analytics.system_owner_dashboard import SystemOwnerDashboardService


router = APIRouter(prefix="/system-owner-dashboard", tags=["System Owner Dashboard"])


@router.get("/overview")
async def get_platform_overview(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get platform overview with key metrics."""
    return await SystemOwnerDashboardService.get_platform_overview()


@router.get("/subscriptions")
async def get_subscription_metrics(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get subscription metrics (MRR, ARR, etc.)."""
    return await SystemOwnerDashboardService.get_subscription_metrics()


@router.get("/organizations")
async def get_organizations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_system_owner)
):
    """Get organizations list with subscription details."""
    organizations = await SystemOwnerDashboardService.get_organizations_list(skip, limit)
    return {"organizations": organizations, "count": len(organizations)}


@router.get("/revenue")
async def get_revenue_analytics(
    days: int = Query(30, ge=7, le=365),
    current_user: dict = Depends(get_current_system_owner)
):
    """Get revenue analytics with daily breakdown."""
    return await SystemOwnerDashboardService.get_revenue_analytics(days)


@router.get("/ai-usage")
async def get_ai_usage_analytics(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get AI usage metrics and trends."""
    return await SystemOwnerDashboardService.get_ai_usage_analytics()


@router.get("/smtp-health")
async def get_smtp_health(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get SMTP health metrics."""
    return await SystemOwnerDashboardService.get_smtp_health()


@router.get("/scraping-health")
async def get_scraping_health(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get scraping service health metrics."""
    return await SystemOwnerDashboardService.get_scraping_health()


@router.get("/worker-health")
async def get_worker_health(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get background worker health metrics."""
    return await SystemOwnerDashboardService.get_worker_health()


@router.get("/queue-monitoring")
async def get_queue_monitoring(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get queue monitoring data."""
    return await SystemOwnerDashboardService.get_queue_monitoring()


@router.get("/campaigns")
async def get_campaigns_analytics(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get campaigns performance analytics."""
    return await SystemOwnerDashboardService.get_campaigns_analytics()


@router.get("/leads")
async def get_leads_analytics(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get leads generation analytics."""
    return await SystemOwnerDashboardService.get_leads_analytics()


@router.get("/meetings")
async def get_meetings_analytics(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get meetings booking analytics."""
    return await SystemOwnerDashboardService.get_meetings_analytics()


@router.get("/comprehensive")
async def get_comprehensive_dashboard(
    current_user: dict = Depends(get_current_system_owner)
):
    """Get all dashboard data in one call."""
    return await SystemOwnerDashboardService.get_comprehensive_dashboard()