"""
Email Queue Service
Lightweight internal queue system for email processing
"""

import asyncio
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId

from app.db.mongodb import MongoDB, serialize_doc

logger = logging.getLogger(__name__)


class EmailQueueService:
    COLLECTION = "email_queue"
    
    PRIORITY_ORDER = {
        "high": 1,
        "urgent": 1,
        "normal": 5,
        "low": 10
    }
    
    MAX_RETRIES = 3
    RETRY_DELAYS = [60, 300, 900]
    
    @staticmethod
    async def add_to_queue(queue_data: Dict) -> str:
        queue_data["status"] = queue_data.get("status", "pending")
        queue_data["created_at"] = datetime.utcnow()
        queue_data["updated_at"] = datetime.utcnow()
        queue_data["retry_count"] = 0
        
        result = await MongoDB.get_collection(EmailQueueService.COLLECTION).insert_one(queue_data)
        return str(result.inserted_id)

    @staticmethod
    async def get_queue_item(queue_id: str) -> Optional[Dict]:
        try:
            item = await MongoDB.get_collection(EmailQueueService.COLLECTION).find_one(
                {"_id": ObjectId(queue_id)}
            )
            return serialize_doc(item) if item else None
        except:
            return None

    @staticmethod
    async def get_pending_emails(limit: int = 50) -> List[Dict]:
        now = datetime.utcnow()
        
        items = await MongoDB.get_collection(EmailQueueService.COLLECTION).find({
            "status": {"$in": ["pending", "scheduled"]},
            "$or": [
                {"scheduled_at": {"$lte": now}},
                {"scheduled_at": {"$exists": False}}
            ]
        }).sort([
            ("priority", 1),
            ("created_at", 1)
        ]).limit(limit).to_list(length=limit)
        
        return [serialize_doc(i) for i in items]

    @staticmethod
    async def get_failed_emails(limit: int = 50) -> List[Dict]:
        items = await MongoDB.get_collection(EmailQueueService.COLLECTION).find({
            "status": "failed",
            "retry_count": {"$lt": 3}
        }).sort("created_at", -1).limit(limit).to_list(length=limit)
        
        return [serialize_doc(i) for i in items]

    @staticmethod
    async def get_scheduled_emails(limit: int = 50) -> List[Dict]:
        items = await MongoDB.get_collection(EmailQueueService.COLLECTION).find({
            "status": "scheduled",
            "scheduled_at": {"$gt": datetime.utcnow()}
        }).sort("scheduled_at", 1).limit(limit).to_list(length=limit)
        
        return [serialize_doc(i) for i in items]

    @staticmethod
    async def update_queue_status(
        queue_id: str,
        status: str,
        error_message: Optional[str] = None,
        sent_at: Optional[datetime] = None
    ) -> bool:
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow()
        }
        
        if error_message:
            update_data["error_message"] = error_message
        if sent_at:
            update_data["sent_at"] = sent_at
            
        result = await MongoDB.get_collection(EmailQueueService.COLLECTION).update_one(
            {"_id": ObjectId(queue_id)},
            {"$set": update_data}
        )
        
        return result.modified_count > 0

    @staticmethod
    async def increment_retry(queue_id: str) -> bool:
        item = await EmailQueueService.get_queue_item(queue_id)
        if not item:
            return False
        
        retry_count = item.get("retry_count", 0) + 1
        max_retries = item.get("max_retries", EmailQueueService.MAX_RETRIES)
        
        if retry_count >= max_retries:
            await EmailQueueService.update_queue_status(
                queue_id, "failed", f"Max retries ({max_retries}) exceeded"
            )
            return False
        
        delay = EmailQueueService.RETRY_DELAYS[min(retry_count - 1, len(EmailQueueService.RETRY_DELAYS) - 1)]
        
        result = await MongoDB.get_collection(EmailQueueService.COLLECTION).update_one(
            {"_id": ObjectId(queue_id)},
            {"$set": {
                "retry_count": retry_count,
                "status": "pending",
                "scheduled_at": datetime.utcnow() + timedelta(seconds=delay),
                "updated_at": datetime.utcnow()
            }}
        )
        
        return result.modified_count > 0

    @staticmethod
    async def process_queue_item(queue_id: str) -> bool:
        try:
            item = await EmailQueueService.get_queue_item(queue_id)
            if not item:
                return False
            
            await EmailQueueService.update_queue_status(queue_id, "processing")
            
            from app.email_engine.services.email_delivery import EmailDeliveryService
            
            result = await EmailDeliveryService.send_email(
                to_email=item.get("to_email"),
                to_name=item.get("to_name"),
                subject=item.get("subject"),
                html_content=item.get("html_content"),
                text_content=item.get("text_content"),
                from_email=item.get("from_email"),
                from_name=item.get("from_name"),
                organization_id=item.get("organization_id"),
                metadata={
                    "queue_id": queue_id,
                    "template_id": item.get("template_id"),
                    "trigger_id": item.get("trigger_id")
                }
            )
            
            if result.get("success"):
                await EmailQueueService.update_queue_status(
                    queue_id, "sent", sent_at=datetime.utcnow()
                )
                
                await EmailQueueService._create_email_log(item, "sent", result)
                
                logger.info(f"Email sent successfully: {queue_id}")
                return True
            else:
                error_msg = result.get("error", "Unknown error")
                await EmailQueueService.update_queue_status(queue_id, "failed", error_msg)
                
                await EmailQueueService.increment_retry(queue_id)
                
                await EmailQueueService._create_email_log(item, "failed", result)
                
                logger.error(f"Email failed: {queue_id} - {error_msg}")
                return False
                
        except Exception as e:
            logger.error(f"Error processing queue item {queue_id}: {str(e)}")
            await EmailQueueService.update_queue_status(queue_id, "failed", str(e))
            return False

    @staticmethod
    async def _create_email_log(item: Dict, status: str, result: Dict):
        try:
            log_data = {
                "message_id": result.get("message_id"),
                "queue_id": item.get("_id"),
                "template_id": item.get("template_id"),
                "trigger_id": item.get("trigger_id"),
                "organization_id": item.get("organization_id"),
                "from_email": item.get("from_email"),
                "to_email": item.get("to_email"),
                "to_name": item.get("to_name"),
                "subject": item.get("subject"),
                "status": status,
                "sent_at": datetime.utcnow() if status == "sent" else None,
                "error_message": result.get("error"),
                "smtp_response": result.get("smtp_response"),
                "metadata": item.get("metadata", {}),
                "created_at": datetime.utcnow()
            }
            
            await MongoDB.get_collection("email_logs").insert_one(log_data)
        except Exception as e:
            logger.error(f"Error creating email log: {str(e)}")

    @staticmethod
    async def process_queue(limit: int = 20):
        pending_emails = await EmailQueueService.get_pending_emails(limit)
        
        results = []
        for item in pending_emails:
            success = await EmailQueueService.process_queue_item(str(item.get("_id")))
            results.append({"id": str(item.get("_id")), "success": success})
        
        return results

    @staticmethod
    async def process_scheduled_emails():
        scheduled = await EmailQueueService.get_scheduled_emails(limit=50)
        
        for item in scheduled:
            if item.get("scheduled_at") <= datetime.utcnow():
                await EmailQueueService.process_queue_item(str(item.get("_id")))
        
        return len(scheduled)

    @staticmethod
    async def retry_failed_emails(limit: int = 20):
        failed = await EmailQueueService.get_failed_emails(limit)
        
        results = []
        for item in failed:
            success = await EmailQueueService.process_queue_item(str(item.get("_id")))
            results.append({"id": str(item.get("_id")), "success": success})
        
        return results

    @staticmethod
    async def cancel_scheduled_email(queue_id: str) -> bool:
        result = await MongoDB.get_collection(EmailQueueService.COLLECTION).update_one(
            {"_id": ObjectId(queue_id), "status": "scheduled"},
            {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
        )
        return result.modified_count > 0

    @staticmethod
    async def get_queue_stats(organization_id: Optional[str] = None) -> Dict:
        query = {}
        if organization_id:
            query["organization_id"] = organization_id
            
        pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        
        results = await MongoDB.get_collection(EmailQueueService.COLLECTION).aggregate(pipeline).to_list(length=10)
        
        stats = {
            "pending": 0,
            "processing": 0,
            "sent": 0,
            "failed": 0,
            "scheduled": 0,
            "total": 0
        }
        
        for r in results:
            status = r.get("_id", "pending")
            if status in stats:
                stats[status] = r.get("count", 0)
            stats["total"] += r.get("count", 0)
        
        return stats