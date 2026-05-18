import asyncio
import psutil
import time
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from bson import ObjectId
import random

from app.db.mongodb import MongoDB, serialize_doc
from app.models.monitoring_models import (
    LogLevel, LogCategory, HealthStatus, AlertSeverity, AlertStatus,
    SystemComponent
)


class LoggingService:
    @staticmethod
    async def create_log(log_data: Dict) -> Dict:
        log_doc = {
            "level": log_data.get("level"),
            "category": log_data.get("category"),
            "message": log_data.get("message"),
            "details": log_data.get("details", {}),
            "source": log_data.get("source"),
            "user_id": log_data.get("user_id"),
            "organization_id": log_data.get("organization_id"),
            "endpoint": log_data.get("endpoint"),
            "method": log_data.get("method"),
            "status_code": log_data.get("status_code"),
            "response_time_ms": log_data.get("response_time_ms"),
            "ip_address": log_data.get("ip_address"),
            "user_agent": log_data.get("user_agent"),
            "stack_trace": log_data.get("stack_trace"),
            "error_code": log_data.get("error_code"),
            "timestamp": datetime.utcnow()
        }
        
        result = await MongoDB.get_collection("platform_logs").insert_one(log_doc)
        log_doc["_id"] = str(result.inserted_id)
        return log_doc

    @staticmethod
    async def log_auth(user_id: str, organization_id: str, action: str, success: bool, ip_address: str = None):
        await LoggingService.create_log({
            "level": LogLevel.INFO if success else LogLevel.ERROR,
            "category": LogCategory.AUTH,
            "message": f"Auth {action}: {'Success' if success else 'Failed'}",
            "details": {"action": action, "success": success},
            "user_id": user_id,
            "organization_id": organization_id,
            "ip_address": ip_address
        })

    @staticmethod
    async def log_api(request_data: Dict, response_status: int, response_time_ms: int):
        await LoggingService.create_log({
            "level": LogLevel.ERROR if response_status >= 400 else LogLevel.INFO,
            "category": LogCategory.API,
            "message": f"API {request_data.get('method', 'GET')} {request_data.get('endpoint', '')}: {response_status}",
            "details": {"response_status": response_status},
            "endpoint": request_data.get("endpoint"),
            "method": request_data.get("method"),
            "status_code": response_status,
            "response_time_ms": response_time_ms,
            "user_id": request_data.get("user_id"),
            "organization_id": request_data.get("organization_id"),
            "ip_address": request_data.get("ip_address")
        })

    @staticmethod
    async def log_scraping(org_id: str, source: str, url: str, status: str, error: str = None, pages: int = 0, records: int = 0):
        await LoggingService.create_log({
            "level": LogLevel.ERROR if status == "failed" else LogLevel.INFO,
            "category": LogCategory.SCRAPING,
            "message": f"Scraping {source}: {status}",
            "details": {"url": url, "pages": pages, "records": records, "error": error},
            "organization_id": org_id,
            "source": source
        })

    @staticmethod
    async def log_ai(model: str, prompt_tokens: int, completion_tokens: int, duration_ms: int, error: str = None):
        await LoggingService.create_log({
            "level": LogLevel.ERROR if error else LogLevel.INFO,
            "category": LogCategory.AI,
            "message": f"AI {model}: {'Success' if not error else 'Error'}",
            "details": {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens, "duration_ms": duration_ms, "error": error},
            "source": model
        })

    @staticmethod
    async def log_smtp(config_id: str, recipient: str, status: str, error: str = None):
        await LoggingService.create_log({
            "level": LogLevel.ERROR if status == "failed" else LogLevel.INFO,
            "category": LogCategory.SMTP,
            "message": f"SMTP to {recipient}: {status}",
            "details": {"config_id": config_id, "recipient": recipient, "error": error},
            "source": config_id
        })

    @staticmethod
    async def log_billing(org_id: str, action: str, amount: float, status: str, error: str = None):
        await LoggingService.create_log({
            "level": LogLevel.ERROR if status == "failed" else LogLevel.INFO,
            "category": LogCategory.BILLING,
            "message": f"Billing {action}: {status}",
            "details": {"amount": amount, "error": error},
            "organization_id": org_id
        })

    @staticmethod
    async def get_logs(
        level: str = None,
        category: str = None,
        start_date: datetime = None,
        end_date: datetime = None,
        search: str = None,
        source: str = None,
        user_id: str = None,
        organization_id: str = None,
        endpoint: str = None,
        status_code: int = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict]:
        
        query = {}
        
        if level:
            query["level"] = level
        if category:
            query["category"] = category
        if source:
            query["source"] = source
        if user_id:
            query["user_id"] = user_id
        if organization_id:
            query["organization_id"] = organization_id
        if endpoint:
            query["endpoint"] = {"$regex": endpoint, "$options": "i"}
        if status_code:
            query["status_code"] = status_code
        
        if start_date or end_date:
            query["timestamp"] = {}
            if start_date:
                query["timestamp"]["$gte"] = start_date
            if end_date:
                query["timestamp"]["$lte"] = end_date
        
        if search:
            query["$or"] = [
                {"message": {"$regex": search, "$options": "i"}},
                {"details": {"$regex": search, "$options": "i"}}
            ]

        logs = await MongoDB.get_collection("platform_logs").find(query).sort("timestamp", -1).skip(skip).limit(limit).to_list(length=limit)
        return [serialize_doc(log) for log in logs]

    @staticmethod
    async def get_log_counts(days: int = 7) -> Dict:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {
                "_id": "$level",
                "count": {"$sum": 1}
            }}
        ]
        
        level_counts = await MongoDB.get_collection("platform_logs").aggregate(pipeline).to_list(length=10)
        
        category_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$group": {
                "_id": "$category",
                "count": {"$sum": 1}
            }}
        ]
        
        category_counts = await MongoDB.get_collection("platform_logs").aggregate(category_pipeline).to_list(length=20)
        
        return {
            "by_level": {item["_id"]: item["count"] for item in level_counts},
            "by_category": {item["_id"]: item["count"] for item in category_counts}
        }


class MonitoringService:
    @staticmethod
    async def check_system_health() -> Dict:
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            backend_health = {
                "component": SystemComponent.BACKEND,
                "status": HealthStatus.HEALTHY if cpu_percent < 80 else HealthStatus.DEGRADED if cpu_percent < 95 else HealthStatus.CRITICAL,
                "is_online": True,
                "cpu_usage_percent": cpu_percent,
                "ram_usage_percent": memory.percent,
                "ram_used_mb": memory.used / (1024 * 1024),
                "ram_total_mb": memory.total / (1024 * 1024),
                "disk_usage_percent": disk.percent,
                "disk_used_gb": disk.used / (1024 * 1024 * 1024),
                "disk_total_gb": disk.total / (1024 * 1024 * 1024),
                "last_check": datetime.utcnow()
            }
            
            return backend_health
        except Exception as e:
            return {
                "component": SystemComponent.BACKEND,
                "status": HealthStatus.UNKNOWN,
                "is_online": False,
                "last_error": str(e),
                "last_check": datetime.utcnow()
            }

    @staticmethod
    async def check_mongodb_health() -> Dict:
        try:
            start = time.time()
            await MongoDB.db.command("ping")
            latency = (time.time() - start) * 1000
            
            stats = await MongoDB.db.command("dbstats")
            db_size_mb = stats.get("storageSize", 0) / (1024 * 1024)
            
            return {
                "component": SystemComponent.MONGODB,
                "status": HealthStatus.HEALTHY,
                "is_online": True,
                "response_time_ms": int(latency),
                "database_size_mb": round(db_size_mb, 2),
                "last_check": datetime.utcnow()
            }
        except Exception as e:
            return {
                "component": SystemComponent.MONGODB,
                "status": HealthStatus.CRITICAL,
                "is_online": False,
                "last_error": str(e),
                "last_check": datetime.utcnow()
            }

    @staticmethod
    async def check_ollama_health() -> Dict:
        try:
            import requests
            start = time.time()
            response = requests.get("http://localhost:11434/api/tags", timeout=5)
            latency = (time.time() - start) * 1000
            
            if response.status_code == 200:
                models = response.json().get("models", [])
                return {
                    "component": SystemComponent.OLLAMA,
                    "status": HealthStatus.HEALTHY,
                    "is_online": True,
                    "response_time_ms": int(latency),
                    "metadata": {"models_count": len(models)},
                    "last_check": datetime.utcnow()
                }
            else:
                return {
                    "component": SystemComponent.OLLAMA,
                    "status": HealthStatus.DEGRADED,
                    "is_online": True,
                    "last_error": f"Status: {response.status_code}",
                    "last_check": datetime.utcnow()
                }
        except Exception as e:
            return {
                "component": SystemComponent.OLLAMA,
                "status": HealthStatus.OFFLINE,
                "is_online": False,
                "last_error": str(e),
                "last_check": datetime.utcnow()
            }

    @staticmethod
    async def save_health_status(health_data: Dict) -> Dict:
        existing = await MongoDB.get_collection("system_health").find_one({"component": health_data["component"]})
        
        health_doc = {
            "component": health_data["component"],
            "status": health_data.get("status", HealthStatus.UNKNOWN),
            "is_online": health_data.get("is_online", True),
            "cpu_usage_percent": health_data.get("cpu_usage_percent"),
            "ram_usage_percent": health_data.get("ram_usage_percent"),
            "ram_used_mb": health_data.get("ram_used_mb"),
            "ram_total_mb": health_data.get("ram_total_mb"),
            "disk_usage_percent": health_data.get("disk_usage_percent"),
            "disk_used_gb": health_data.get("disk_used_gb"),
            "disk_total_gb": health_data.get("disk_total_gb"),
            "response_time_ms": health_data.get("response_time_ms"),
            "database_size_mb": health_data.get("database_size_mb"),
            "last_error": health_data.get("last_error"),
            "last_check": health_data.get("last_check", datetime.utcnow()),
            "metadata": health_data.get("metadata", {}),
            "updated_at": datetime.utcnow()
        }
        
        if existing:
            await MongoDB.get_collection("system_health").update_one(
                {"_id": existing["_id"]},
                {"$set": health_doc}
            )
            health_doc["_id"] = str(existing["_id"])
        else:
            health_doc["created_at"] = datetime.utcnow()
            result = await MongoDB.get_collection("system_health").insert_one(health_doc)
            health_doc["_id"] = str(result.inserted_id)
        
        return health_doc

    @staticmethod
    async def get_all_health() -> List[Dict]:
        health_records = await MongoDB.get_collection("system_health").find({}).to_list(length=20)
        return [serialize_doc(h) for h in health_records]

    @staticmethod
    async def get_health_summary() -> Dict:
        all_health = await MonitoringService.get_all_health()
        
        total = len(all_health)
        healthy = sum(1 for h in all_health if h.get("status") == "healthy")
        degraded = sum(1 for h in all_health if h.get("status") == "degraded")
        critical = sum(1 for h in all_health if h.get("status") in ["critical", "offline"])
        
        return {
            "total_components": total,
            "healthy": healthy,
            "degraded": degraded,
            "critical": critical,
            "overall_status": "healthy" if critical == 0 else "degraded" if degraded == 0 else "critical",
            "components": all_health
        }


class AlertService:
    @staticmethod
    async def create_alert(alert_data: Dict) -> Dict:
        alert_doc = {
            "title": alert_data.get("title"),
            "description": alert_data.get("description"),
            "severity": alert_data.get("severity"),
            "status": AlertStatus.ACTIVE,
            "component": alert_data.get("component"),
            "source": alert_data.get("source"),
            "triggered_by": alert_data.get("triggered_by"),
            "notification_sent": False,
            "notification_channels": alert_data.get("notification_channels", []),
            "metadata": alert_data.get("metadata", {}),
            "triggered_at": datetime.utcnow()
        }
        
        result = await MongoDB.get_collection("alerts").insert_one(alert_doc)
        alert_doc["_id"] = str(result.inserted_id)
        
        await LoggingService.create_log({
            "level": LogLevel.WARNING if alert_data.get("severity") in [AlertSeverity.LOW, AlertSeverity.MEDIUM] else LogLevel.ERROR,
            "category": LogCategory.SYSTEM,
            "message": f"Alert: {alert_data.get('title')}",
            "details": alert_data.get("metadata", {}),
            "source": alert_data.get("component")
        })
        
        return alert_doc

    @staticmethod
    async def get_alerts(
        severity: str = None,
        status: str = None,
        component: str = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Dict]:
        
        query = {}
        
        if severity:
            query["severity"] = severity
        if status:
            query["status"] = status
        if component:
            query["component"] = component
        
        alerts = await MongoDB.get_collection("alerts").find(query).sort("triggered_at", -1).skip(skip).limit(limit).to_list(length=limit)
        return [serialize_doc(a) for a in alerts]

    @staticmethod
    async def acknowledge_alert(alert_id: str, user_id: str) -> Optional[Dict]:
        result = await MongoDB.get_collection("alerts").update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"status": AlertStatus.ACKNOWLEDGED, "acknowledged_at": datetime.utcnow(), "acknowledged_by": user_id}}
        )
        
        if result.modified_count > 0:
            alert = await MongoDB.get_collection("alerts").find_one({"_id": ObjectId(alert_id)})
            return serialize_doc(alert)
        return None

    @staticmethod
    async def resolve_alert(alert_id: str, user_id: str) -> Optional[Dict]:
        result = await MongoDB.get_collection("alerts").update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"status": AlertStatus.RESOLVED, "resolved_at": datetime.utcnow(), "resolved_by": user_id}}
        )
        
        if result.modified_count > 0:
            alert = await MongoDB.get_collection("alerts").find_one({"_id": ObjectId(alert_id)})
            return serialize_doc(alert)
        return None

    @staticmethod
    async def snooze_alert(alert_id: str, until: datetime) -> Optional[Dict]:
        result = await MongoDB.get_collection("alerts").update_one(
            {"_id": ObjectId(alert_id)},
            {"$set": {"status": AlertStatus.SNOOZED, "snoozed_until": until}}
        )
        
        if result.modified_count > 0:
            alert = await MongoDB.get_collection("alerts").find_one({"_id": ObjectId(alert_id)})
            return serialize_doc(alert)
        return None

    @staticmethod
    async def get_alert_counts() -> Dict:
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        status_counts = await MongoDB.get_collection("alerts").aggregate(pipeline).to_list(length=10)
        
        severity_pipeline = [
            {"$match": {"status": {"$ne": "resolved"}}},
            {"$group": {
                "_id": "$severity",
                "count": {"$sum": 1}
            }}
        ]
        
        severity_counts = await MongoDB.get_collection("alerts").aggregate(severity_pipeline).to_list(length=10)
        
        return {
            "by_status": {item["_id"]: item["count"] for item in status_counts},
            "active_by_severity": {item["_id"]: item["count"] for item in severity_counts}
        }


class WorkerLogService:
    @staticmethod
    async def create_worker_log(log_data: Dict) -> Dict:
        log_doc = {
            "worker_id": log_data.get("worker_id"),
            "worker_name": log_data.get("worker_name"),
            "task_type": log_data.get("task_type"),
            "status": log_data.get("status"),
            "message": log_data.get("message"),
            "details": log_data.get("details", {}),
            "started_at": log_data.get("started_at"),
            "completed_at": log_data.get("completed_at"),
            "duration_seconds": log_data.get("duration_seconds"),
            "retry_count": log_data.get("retry_count", 0),
            "max_retries": log_data.get("max_retries", 3),
            "error": log_data.get("error"),
            "result": log_data.get("result", {}),
            "created_at": datetime.utcnow()
        }
        
        result = await MongoDB.get_collection("worker_logs").insert_one(log_doc)
        log_doc["_id"] = str(result.inserted_id)
        return log_doc

    @staticmethod
    async def get_worker_logs(worker_id: str = None, status: str = None, skip: int = 0, limit: int = 50) -> List[Dict]:
        
        query = {}
        if worker_id:
            query["worker_id"] = worker_id
        if status:
            query["status"] = status
        
        logs = await MongoDB.get_collection("worker_logs").find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        return [serialize_doc(log) for log in logs]


class ScrapingLogService:
    @staticmethod
    async def create_scraping_log(log_data: Dict) -> Dict:
        log_doc = {
            "job_id": log_data.get("job_id"),
            "organization_id": log_data.get("organization_id"),
            "source": log_data.get("source"),
            "url": log_data.get("url"),
            "status": log_data.get("status"),
            "pages_scraped": log_data.get("pages_scraped", 0),
            "records_extracted": log_data.get("records_extracted", 0),
            "error_message": log_data.get("error_message"),
            "started_at": log_data.get("started_at", datetime.utcnow()),
            "completed_at": log_data.get("completed_at"),
            "duration_seconds": log_data.get("duration_seconds"),
            "metadata": log_data.get("metadata", {}),
            "created_at": datetime.utcnow()
        }
        
        result = await MongoDB.get_collection("scraping_logs").insert_one(log_doc)
        log_doc["_id"] = str(result.inserted_id)
        return log_doc

    @staticmethod
    async def get_scraping_logs(org_id: str = None, status: str = None, skip: int = 0, limit: int = 50) -> List[Dict]:
        
        query = {}
        if org_id:
            query["organization_id"] = org_id
        if status:
            query["status"] = status
        
        logs = await MongoDB.get_collection("scraping_logs").find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        return [serialize_doc(log) for log in logs]


class MetricsService:
    @staticmethod
    async def get_metrics_summary(hours: int = 24) -> Dict:
        start_date = datetime.utcnow() - timedelta(hours=hours)
        
        api_logs = await MongoDB.get_collection("platform_logs").find({
            "category": LogCategory.API,
            "timestamp": {"$gte": start_date}
        }).to_list(length=10000)
        
        total_requests = len(api_logs)
        failed_requests = sum(1 for log in api_logs if log.get("status_code", 200) >= 400)
        
        response_times = [log.get("response_time_ms", 0) for log in api_logs if log.get("response_time_ms")]
        avg_response_time = sum(response_times) / max(len(response_times), 1)
        
        log_counts = await LoggingService.get_log_counts(days=1)
        
        return {
            "period_hours": hours,
            "total_requests": total_requests,
            "failed_requests": failed_requests,
            "success_rate": round(((total_requests - failed_requests) / max(total_requests, 1)) * 100, 2),
            "avg_response_time_ms": round(avg_response_time, 2),
            "log_counts": log_counts
        }