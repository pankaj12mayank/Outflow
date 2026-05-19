"""
Email Analytics Service
Track and analyze email performance metrics
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc

logger = logging.getLogger(__name__)


class EmailAnalyticsService:
    LOGS_COLLECTION = "email_logs"
    FAILURES_COLLECTION = "email_failures"
    RETRY_COLLECTION = "email_retry_logs"
    
    @staticmethod
    async def create_log(log_data: Dict) -> str:
        log_data["created_at"] = datetime.utcnow()
        result = await MongoDB.get_collection(EmailAnalyticsService.LOGS_COLLECTION).insert_one(log_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_log(log_id: str) -> Optional[Dict]:
        try:
            log = await MongoDB.get_collection(EmailAnalyticsService.LOGS_COLLECTION).find_one(
                {"_id": ObjectId(log_id)}
            )
            return serialize_doc(log) if log else None
        except:
            return None

    @staticmethod
    async def list_logs(
        organization_id: Optional[str] = None,
        status: Optional[str] = None,
        template_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict]:
        query = {}
        
        if organization_id:
            query["organization_id"] = organization_id
        if status:
            query["status"] = status
        if template_id:
            query["template_id"] = template_id
            
        if from_date or to_date:
            query["created_at"] = {}
            if from_date:
                query["created_at"]["$gte"] = from_date
            if to_date:
                query["created_at"]["$lte"] = to_date
            
        logs = await MongoDB.get_collection(EmailAnalyticsService.LOGS_COLLECTION)\
            .find(query)\
            .sort("created_at", -1)\
            .skip(skip)\
            .limit(limit)\
            .to_list(length=limit)
            
        return [serialize_doc(l) for l in logs]

    @staticmethod
    async def update_log_status(
        log_id: str,
        status: str,
        timestamp: Optional[datetime] = None
    ) -> bool:
        update_field = f"{status}_at" if status in ["delivered", "opened", "clicked", "bounced", "unsubscribed"] else None
        
        update_data = {"updated_at": datetime.utcnow()}
        if update_field:
            update_data[update_field] = timestamp or datetime.utcnow()
        
        result = await MongoDB.get_collection(EmailAnalyticsService.LOGS_COLLECTION).update_one(
            {"_id": ObjectId(log_id)},
            {"$set": update_data}
        )
        
        return result.modified_count > 0

    @staticmethod
    async def track_open(log_id: str) -> bool:
        return await EmailAnalyticsService.update_log_status(log_id, "opened")

    @staticmethod
    async def track_click(log_id: str) -> bool:
        result1 = await EmailAnalyticsService.update_log_status(log_id, "opened")
        result2 = await EmailAnalyticsService.update_log_status(log_id, "clicked")
        return result1 or result2

    @staticmethod
    async def track_bounce(log_id: str, bounce_type: str = "hard") -> bool:
        return await EmailAnalyticsService.update_log_status(log_id, "bounced")

    @staticmethod
    async def track_unsubscribe(log_id: str) -> bool:
        return await EmailAnalyticsService.update_log_status(log_id, "unsubscribed")

    @staticmethod
    async def get_analytics(
        organization_id: Optional[str] = None,
        days: int = 30
    ) -> Dict[str, Any]:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = {"created_at": {"$gte": start_date}}
        if organization_id:
            query["organization_id"] = organization_id
            
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        results = await MongoDB.get_collection(EmailAnalyticsService.LOGS_COLLECTION)\
            .aggregate(pipeline).to_list(length=10)
        
        stats = {
            "total_sent": 0,
            "total_delivered": 0,
            "total_opened": 0,
            "total_clicked": 0,
            "total_bounced": 0,
            "total_unsubscribed": 0,
            "total_spam": 0
        }
        
        for r in results:
            status = r.get("_id")
            count = r.get("count", 0)
            
            if status == "sent":
                stats["total_sent"] = count
            elif status == "delivered":
                stats["total_delivered"] = count
            elif status == "opened":
                stats["total_opened"] = count
            elif status == "clicked":
                stats["total_clicked"] = count
            elif status == "bounced":
                stats["total_bounced"] = count
            elif status == "unsubscribed":
                stats["total_unsubscribed"] = count
            elif status == "spam":
                stats["total_spam"] = count
        
        total = stats["total_sent"] or 1
        stats["open_rate"] = round((stats["total_opened"] / total) * 100, 2)
        stats["click_rate"] = round((stats["total_clicked"] / stats["total_opened"]) * 100, 2) if stats["total_opened"] > 0 else 0
        stats["bounce_rate"] = round((stats["total_bounced"] / total) * 100, 2)
        stats["delivery_rate"] = round(((total - stats["total_bounced"]) / total) * 100, 2)
        
        stats["period_start"] = start_date.isoformat()
        stats["period_end"] = datetime.utcnow().isoformat()
        
        return stats

    @staticmethod
    async def get_time_series(
        organization_id: Optional[str] = None,
        days: int = 30,
        metric: str = "sent"
    ) -> List[Dict]:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = {
            "created_at": {"$gte": start_date},
            "status": metric
        }
        if organization_id:
            query["organization_id"] = organization_id
            
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": {
                    "year": {"$year": "$created_at"},
                    "month": {"$month": "$created_at"},
                    "day": {"$dayOfMonth": "$created_at"}
                },
                "count": {"$sum": 1}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1, "_id.day": 1}}
        ]
        
        results = await MongoDB.get_collection(EmailAnalyticsService.LOGS_COLLECTION)\
            .aggregate(pipeline).to_list(length=days)
        
        series = []
        for r in results:
            date = datetime(
                r["_id"]["year"],
                r["_id"]["month"],
                r["_id"]["day"]
            )
            series.append({
                "date": date.isoformat(),
                "count": r.get("count", 0)
            })
        
        return series

    @staticmethod
    async def log_failure(failure_data: Dict) -> str:
        failure_data["created_at"] = datetime.utcnow()
        result = await MongoDB.get_collection(EmailAnalyticsService.FAILURES_COLLECTION).insert_one(failure_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_failure_stats(
        organization_id: Optional[str] = None,
        days: int = 7
    ) -> Dict[str, Any]:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = {"created_at": {"$gte": start_date}}
        if organization_id:
            query["organization_id"] = organization_id
            
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$error_type",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}}
        ]
        
        results = await MongoDB.get_collection(EmailAnalyticsService.FAILURES_COLLECTION)\
            .aggregate(pipeline).to_list(length=20)
        
        failures = []
        for r in results:
            failures.append({
                "type": r.get("_id", "unknown"),
                "count": r.get("count", 0)
            })
        
        return {"failures": failures, "total": sum(f["count"] for f in failures)}

    @staticmethod
    async def log_retry(retry_data: Dict) -> str:
        retry_data["created_at"] = datetime.utcnow()
        result = await MongoDB.get_collection(EmailAnalyticsService.RETRY_COLLECTION).insert_one(retry_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_retry_stats(days: int = 7) -> Dict[str, Any]:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        pipeline = [
            {"$match": {"created_at": {"$gte": start_date}}},
            {"$group": {
                "_id": None,
                "total_retries": {"$sum": 1},
                "successful_retries": {"$sum": {"$cond": ["$success", 1, 0]}},
                "failed_retries": {"$sum": {"$cond": ["$success", 0, 1]}}
            }}
        ]
        
        results = await MongoDB.get_collection(EmailAnalyticsService.RETRY_COLLECTION)\
            .aggregate(pipeline).to_list(length=1)
        
        if results:
            return results[0]
        return {"total_retries": 0, "successful_retries": 0, "failed_retries": 0}