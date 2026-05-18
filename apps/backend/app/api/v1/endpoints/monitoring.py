from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId

from app.models.monitoring_models import (
    PlatformLogCreate, AlertCreate, SystemHealthUpdate,
    LogLevel, LogCategory, AlertSeverity, AlertStatus, SystemComponent
)
from app.services.monitoring_service import (
    LoggingService, MonitoringService, AlertService,
    WorkerLogService, ScrapingLogService, MetricsService
)

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/health", response_model=dict)
async def get_health_summary():
    return await MonitoringService.get_health_summary()


@router.get("/health/all", response_model=List[dict])
async def get_all_health():
    return await MonitoringService.get_all_health()


@router.post("/health/check")
async def check_system_health():
    backend_health = await MonitoringService.check_system_health()
    await MonitoringService.save_health_status(backend_health)
    
    mongodb_health = await MonitoringService.check_mongodb_health()
    await MonitoringService.save_health_status(mongodb_health)
    
    ollama_health = await MonitoringService.check_ollama_health()
    await MonitoringService.save_health_status(ollama_health)
    
    return {
        "backend": backend_health,
        "mongodb": mongodb_health,
        "ollama": ollama_health
    }


@router.get("/metrics", response_model=dict)
async def get_metrics_summary(hours: int = Query(24, ge=1, le=168)):
    return await MetricsService.get_metrics_summary(hours)


@router.post("/logs", response_model=dict)
async def create_log(log: PlatformLogCreate):
    log_dict = log.model_dump()
    return await LoggingService.create_log(log_dict)


@router.get("/logs", response_model=List[dict])
async def get_logs(
    level: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    organization_id: Optional[str] = Query(None),
    endpoint: Optional[str] = Query(None),
    status_code: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    return await LoggingService.get_logs(
        level=level,
        category=category,
        start_date=start,
        end_date=end,
        search=search,
        source=source,
        user_id=user_id,
        organization_id=organization_id,
        endpoint=endpoint,
        status_code=status_code,
        skip=skip,
        limit=limit
    )


@router.get("/logs/counts", response_model=dict)
async def get_log_counts(days: int = Query(7, ge=1, le=30)):
    return await LoggingService.get_log_counts(days)


@router.post("/alerts", response_model=dict)
async def create_alert(alert: AlertCreate):
    alert_dict = alert.model_dump()
    return await AlertService.create_alert(alert_dict)


@router.get("/alerts", response_model=List[dict])
async def get_alerts(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    component: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    return await AlertService.get_alerts(severity, status, component, skip, limit)


@router.get("/alerts/counts", response_model=dict)
async def get_alert_counts():
    return await AlertService.get_alert_counts()


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, user_id: str = Query(...)):
    result = await AlertService.acknowledge_alert(alert_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, user_id: str = Query(...)):
    result = await AlertService.resolve_alert(alert_id, user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result


@router.post("/alerts/{alert_id}/snooze")
async def snooze_alert(alert_id: str, hours: int = Query(1, ge=1, le=24)):
    until = datetime.utcnow() + timedelta(hours=hours)
    result = await AlertService.snooze_alert(alert_id, until)
    if not result:
        raise HTTPException(status_code=404, detail="Alert not found")
    return result


@router.get("/worker-logs", response_model=List[dict])
async def get_worker_logs(
    worker_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    return await WorkerLogService.get_worker_logs(worker_id, status, skip, limit)


@router.post("/worker-logs", response_model=dict)
async def create_worker_log(
    worker_id: str,
    worker_name: str,
    task_type: str,
    status: str,
    message: str,
    details: dict = {},
    error: Optional[str] = None
):
    return await WorkerLogService.create_worker_log({
        "worker_id": worker_id,
        "worker_name": worker_name,
        "task_type": task_type,
        "status": status,
        "message": message,
        "details": details,
        "error": error
    })


@router.get("/scraping-logs", response_model=List[dict])
async def get_scraping_logs(
    organization_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    return await ScrapingLogService.get_scraping_logs(organization_id, status, skip, limit)


@router.post("/scraping-logs", response_model=dict)
async def create_scraping_log(
    organization_id: str,
    source: str,
    url: str,
    status: str,
    pages_scraped: int = 0,
    records_extracted: int = 0,
    error_message: Optional[str] = None
):
    return await ScrapingLogService.create_scraping_log({
        "organization_id": organization_id,
        "source": source,
        "url": url,
        "status": status,
        "pages_scraped": pages_scraped,
        "records_extracted": records_extracted,
        "error_message": error_message
    })


@router.get("/log-levels")
async def get_log_levels():
    return {"levels": [e.value for e in LogLevel]}


@router.get("/log-categories")
async def get_log_categories():
    return {"categories": [e.value for e in LogCategory]}


@router.get("/components")
async def get_components():
    return {"components": [e.value for e in SystemComponent]}


@router.get("/alert-severities")
async def get_alert_severities():
    return {"severities": [e.value for e in AlertSeverity]}