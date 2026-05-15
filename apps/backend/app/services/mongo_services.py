from datetime import datetime
from typing import Optional, List, Dict, Any, Callable
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection
import logging

from app.db.mongodb import MongoDB, get_collection, serialize_doc, serialize_docs, create_document

logger = logging.getLogger(__name__)


class BaseService:
    _collection_name: str = ""

    @classmethod
    def get_collection(cls) -> AsyncIOMotorCollection:
        return get_collection(cls._collection_name)

    @classmethod
    async def find_by_id(cls, id: str) -> Optional[Dict]:
        try:
            doc = await cls.get_collection().find_one({"_id": ObjectId(id)})
            return serialize_doc(doc) if doc else None
        except Exception as e:
            logger.error(f"Error finding {cls._collection_name} by id {id}: {e}")
            return None

    @classmethod
    async def find_one(cls, filter: Dict, projection: Dict = None) -> Optional[Dict]:
        try:
            cursor = cls.get_collection().find_one(filter, projection)
            doc = await cursor if projection else await cls.get_collection().find_one(filter)
            return serialize_doc(doc) if doc else None
        except Exception as e:
            logger.error(f"Error finding one in {cls._collection_name}: {e}")
            return None

    @classmethod
    async def find(
        cls,
        filter: Dict,
        skip: int = 0,
        limit: int = 100,
        sort: List = None,
        projection: Dict = None
    ) -> List[Dict]:
        try:
            cursor = cls.get_collection().find(filter, projection)
            if sort:
                cursor = cursor.sort(sort)
            cursor = cursor.skip(skip).limit(limit)
            docs = await cursor.to_list(length=limit)
            return serialize_docs(docs)
        except Exception as e:
            logger.error(f"Error finding in {cls._collection_name}: {e}")
            return []

    @classmethod
    async def find_all(cls, filter: Dict = None, sort: List = None) -> List[Dict]:
        return await cls.find(filter or {}, skip=0, limit=0, sort=sort)

    @classmethod
    async def count(cls, filter: Dict = None) -> int:
        try:
            return await cls.get_collection().count_documents(filter or {})
        except Exception as e:
            logger.error(f"Error counting in {cls._collection_name}: {e}")
            return 0

    @classmethod
    async def create(cls, data: Dict) -> Dict:
        try:
            doc = create_document(data)
            if "_id" in doc:
                doc.pop("_id")
            result = await cls.get_collection().insert_one(doc)
            doc["_id"] = result.inserted_id
            return serialize_doc(doc)
        except Exception as e:
            logger.error(f"Error creating in {cls._collection_name}: {e}")
            raise

    @classmethod
    async def update(cls, id: str, data: Dict) -> Optional[Dict]:
        try:
            data["updated_at"] = datetime.utcnow()
            result = await cls.get_collection().find_one_and_update(
                {"_id": ObjectId(id)},
                {"$set": data},
                return_document=True
            )
            return serialize_doc(result) if result else None
        except Exception as e:
            logger.error(f"Error updating {cls._collection_name} by id {id}: {e}")
            return None

    @classmethod
    async def update_one(cls, filter: Dict, data: Dict) -> int:
        try:
            data["updated_at"] = datetime.utcnow()
            result = await cls.get_collection().update_one(filter, {"$set": data})
            return result.modified_count
        except Exception as e:
            logger.error(f"Error updating one in {cls._collection_name}: {e}")
            return 0

    @classmethod
    async def delete(cls, id: str) -> bool:
        try:
            result = await cls.get_collection().delete_one({"_id": ObjectId(id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting from {cls._collection_name} by id {id}: {e}")
            return False

    @classmethod
    async def delete_one(cls, filter: Dict) -> int:
        try:
            result = await cls.get_collection().delete_one(filter)
            return result.deleted_count
        except Exception as e:
            logger.error(f"Error deleting one from {cls._collection_name}: {e}")
            return 0

    @classmethod
    async def aggregate(cls, pipeline: List) -> List[Dict]:
        try:
            cursor = cls.get_collection().aggregate(pipeline)
            docs = await cursor.to_list(length=None)
            return serialize_docs(docs)
        except Exception as e:
            logger.error(f"Error aggregating in {cls._collection_name}: {e}")
            return []

    @classmethod
    async def find_one_and_update(
        cls,
        filter: Dict,
        update: Dict,
        upsert: bool = False,
        return_document: str = "after"
    ) -> Optional[Dict]:
        try:
            result = await cls.get_collection().find_one_and_update(
                filter,
                {"$set": update},
                upsert=upsert,
                return_document=return_document
            )
            return serialize_doc(result) if result else None
        except Exception as e:
            logger.error(f"Error find_one_and_update in {cls._collection_name}: {e}")
            return None

    @classmethod
    async def increment(cls, id: str, field: str, amount: int = 1) -> Optional[Dict]:
        try:
            result = await cls.get_collection().find_one_and_update(
                {"_id": ObjectId(id)},
                {
                    "$inc": {field: amount},
                    "$set": {"updated_at": datetime.utcnow()}
                },
                return_document=True
            )
            return serialize_doc(result) if result else None
        except Exception as e:
            logger.error(f"Error incrementing in {cls._collection_name}: {e}")
            return None

    @classmethod
    async def push_to_array(cls, id: str, array_field: str, value: Any) -> int:
        try:
            result = await cls.get_collection().update_one(
                {"_id": ObjectId(id)},
                {
                    "$push": {array_field: value},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Error pushing to array in {cls._collection_name}: {e}")
            return 0

    @classmethod
    async def pull_from_array(cls, id: str, array_field: str, value: Any) -> int:
        try:
            result = await cls.get_collection().update_one(
                {"_id": ObjectId(id)},
                {
                    "$pull": {array_field: value},
                    "$set": {"updated_at": datetime.utcnow()}
                }
            )
            return result.modified_count
        except Exception as e:
            logger.error(f"Error pulling from array in {cls._collection_name}: {e}")
            return 0


class OrganizationService(BaseService):
    _collection_name = "organizations"

    @classmethod
    async def find_by_slug(cls, slug: str) -> Optional[Dict]:
        return await cls.find_one({"slug": slug})

    @classmethod
    async def find_active(cls, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"is_active": True}, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def count_active(cls) -> int:
        return await cls.count({"is_active": True})


class UserService(BaseService):
    _collection_name = "users"

    @classmethod
    async def find_by_email(cls, email: str) -> Optional[Dict]:
        return await cls.find_one({"email": email})

    @classmethod
    async def find_by_organization(cls, org_id: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"organization_id": org_id}, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def count_by_organization(cls, org_id: str) -> int:
        return await cls.count({"organization_id": org_id})

    @classmethod
    async def verify_email(cls, id: str) -> Optional[Dict]:
        return await cls.update(id, {"is_email_verified": True})

    @classmethod
    async def update_last_login(cls, id: str) -> Optional[Dict]:
        return await cls.update(id, {"last_login_at": datetime.utcnow()})


class LeadService(BaseService):
    _collection_name = "leads"

    @classmethod
    async def find_by_email(cls, email: str, org_id: str) -> Optional[Dict]:
        return await cls.find_one({"email": email, "organization_id": org_id})

    @classmethod
    async def find_by_organization(cls, org_id: str, skip: int = 0, limit: int = 100, status: str = None) -> List[Dict]:
        filter = {"organization_id": org_id}
        if status:
            filter["status"] = status
        return await cls.find(filter, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def count_by_organization(cls, org_id: str, status: str = None) -> int:
        filter = {"organization_id": org_id}
        if status:
            filter["status"] = status
        return await cls.count(filter)

    @classmethod
    async def search(cls, org_id: str, query: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        filter = {
            "organization_id": org_id,
            "$or": [
                {"email": {"$regex": query, "$options": "i"}},
                {"first_name": {"$regex": query, "$options": "i"}},
                {"last_name": {"$regex": query, "$options": "i"}},
                {"company": {"$regex": query, "$options": "i"}},
            ]
        }
        return await cls.find(filter, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def bulk_create(cls, leads: List[Dict]) -> List[Dict]:
        if not leads:
            return []
        docs = [create_document(lead) for lead in leads]
        for doc in docs:
            doc.pop("_id", None)
        result = await cls.get_collection().insert_many(docs)
        created_ids = result.inserted_ids
        created_docs = await cls.get_collection().find({"_id": {"$in": created_ids}}).to_list(length=None)
        return serialize_docs(list(created_docs))


class CampaignService(BaseService):
    _collection_name = "campaigns"

    @classmethod
    async def find_by_organization(cls, org_id: str, skip: int = 0, limit: int = 100, status: str = None) -> List[Dict]:
        filter = {"organization_id": org_id}
        if status:
            filter["status"] = status
        return await cls.find(filter, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def count_by_organization(cls, org_id: str, status: str = None) -> int:
        filter = {"organization_id": org_id}
        if status:
            filter["status"] = status
        return await cls.count(filter)

    @classmethod
    async def search(cls, org_id: str, query: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        filter = {
            "organization_id": org_id,
            "name": {"$regex": query, "$options": "i"}
        }
        return await cls.find(filter, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def update_stats(cls, id: str, stats: Dict) -> Optional[Dict]:
        return await cls.update(id, stats)

    @classmethod
    async def increment_stat(cls, id: str, stat_field: str, amount: int = 1) -> Optional[Dict]:
        return await cls.increment(id, stat_field, amount)


class NotificationService(BaseService):
    _collection_name = "notifications"

    @classmethod
    async def find_by_user(cls, user_id: str, skip: int = 0, limit: int = 100, unread_only: bool = False) -> List[Dict]:
        filter = {"user_id": user_id}
        if unread_only:
            filter["is_read"] = False
        return await cls.find(filter, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def count_unread(cls, user_id: str) -> int:
        return await cls.count({"user_id": user_id, "is_read": False})

    @classmethod
    async def mark_as_read(cls, id: str) -> Optional[Dict]:
        return await cls.update(id, {"is_read": True, "read_at": datetime.utcnow()})

    @classmethod
    async def mark_all_read(cls, user_id: str) -> int:
        result = await cls.get_collection().update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.utcnow()}}
        )
        return result.modified_count


class BackgroundTaskService(BaseService):
    _collection_name = "background_tasks"

    @classmethod
    async def find_pending(cls, limit: int = 10) -> List[Dict]:
        return await cls.find(
            {"status": "pending"},
            skip=0,
            limit=limit,
            sort=[("priority", -1), ("created_at", 1)]
        )

    @classmethod
    async def mark_started(cls, id: str) -> Optional[Dict]:
        return await cls.update(id, {"status": "running", "started_at": datetime.utcnow()})

    @classmethod
    async def mark_completed(cls, id: str, result: Dict) -> Optional[Dict]:
        return await cls.update(id, {
            "status": "completed",
            "result": result,
            "completed_at": datetime.utcnow()
        })

    @classmethod
    async def mark_failed(cls, id: str, error: str) -> Optional[Dict]:
        return await cls.update(id, {
            "status": "failed",
            "error": error
        })

    @classmethod
    async def increment_attempts(cls, id: str) -> Optional[Dict]:
        return await cls.increment(id, "attempts", 1)


class EmailMessageService(BaseService):
    _collection_name = "email_messages"

    @classmethod
    async def find_by_campaign(cls, campaign_id: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"campaign_id": campaign_id}, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def find_by_lead(cls, lead_id: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"lead_id": lead_id}, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def find_by_status(cls, status: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"status": status}, skip=skip, limit=limit, sort=[("created_at", 1)])


class AuditLogService(BaseService):
    _collection_name = "audit_logs"

    @classmethod
    async def log(cls, org_id: str, user_id: str, action: str, resource_type: str = None, resource_id: str = None, details: Dict = None) -> Dict:
        return await cls.create({
            "organization_id": org_id,
            "user_id": user_id,
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "details": details or {}
        })

    @classmethod
    async def find_by_organization(cls, org_id: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"organization_id": org_id}, skip=skip, limit=limit, sort=[("created_at", -1)])


class AIUsageLogService(BaseService):
    _collection_name = "ai_usage_logs"

    @classmethod
    async def log_usage(
        cls,
        org_id: str,
        user_id: str,
        feature: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        latency_ms: float,
        success: bool = True,
        error: str = None
    ) -> Dict:
        return await cls.create({
            "organization_id": org_id,
            "user_id": user_id,
            "feature": feature,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
            "latency_ms": latency_ms,
            "success": success,
            "error": error
        })


class ScrapingJobService(BaseService):
    _collection_name = "scraping_jobs"

    @classmethod
    async def find_by_user(cls, user_id: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"user_id": user_id}, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def find_by_status(cls, status: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"status": status}, skip=skip, limit=limit, sort=[("created_at", 1)])

    @classmethod
    async def update_progress(cls, id: str, processed: int) -> Optional[Dict]:
        return await cls.update_one({"_id": ObjectId(id)}, {"processed_items": processed})

    @classmethod
    async def complete(cls, id: str, results: List[Dict]) -> Optional[Dict]:
        return await cls.update(id, {
            "status": "completed",
            "results": results,
            "total_items": len(results),
            "processed_items": len(results),
            "completed_at": datetime.utcnow()
        })


class CMSPageService(BaseService):
    _collection_name = "cms_pages"

    @classmethod
    async def find_by_slug(cls, slug: str, org_id: str = None) -> Optional[Dict]:
        filter = {"slug": slug}
        if org_id:
            filter["organization_id"] = org_id
        return await cls.find_one(filter)

    @classmethod
    async def find_published(cls, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"status": "published"}, skip=skip, limit=limit, sort=[("published_at", -1)])


class FeatureFlagService(BaseService):
    _collection_name = "feature_flags"

    @classmethod
    async def is_enabled(cls, key: str, role: str = None) -> bool:
        flag = await cls.find_one({"key": key, "is_enabled": True})
        if not flag:
            return False
        if flag.get("rollout_percentage", 100) < 100:
            if role and role not in flag.get("target_roles", []):
                return False
        return True

    @classmethod
    async def find_active(cls) -> List[Dict]:
        return await cls.find({"is_enabled": True})


class SessionService(BaseService):
    _collection_name = "sessions"

    @classmethod
    async def find_by_user(cls, user_id: str) -> List[Dict]:
        return await cls.find({"user_id": user_id})

    @classmethod
    async def delete_by_user(cls, user_id: str) -> int:
        result = await cls.get_collection().delete_many({"user_id": user_id})
        return result.deleted_count

    @classmethod
    async def delete_expired(cls) -> int:
        result = await cls.get_collection().delete_many({
            "expires_at": {"$lt": datetime.utcnow()}
        })
        return result.deleted_count


class EmailTemplateService(BaseService):
    _collection_name = "email_templates"

    @classmethod
    async def find_by_organization(cls, org_id: str, skip: int = 0, limit: int = 100, template_type: str = None) -> List[Dict]:
        filter = {"organization_id": org_id}
        if template_type:
            filter["template_type"] = template_type
        return await cls.find(filter, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def find_public(cls, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"is_public": True, "is_active": True}, skip=skip, limit=limit)


class EmailAccountService(BaseService):
    _collection_name = "email_accounts"

    @classmethod
    async def find_by_email(cls, email: str) -> Optional[Dict]:
        return await cls.find_one({"email": email})

    @classmethod
    async def increment_usage(cls, id: str) -> Optional[Dict]:
        return await cls.increment(id, "used_today", 1)

    @classmethod
    async def reset_daily_usage(cls) -> int:
        result = await cls.get_collection().update_many(
            {"daily_reset_at": {"$lt": datetime.utcnow()}},
            {"$set": {"used_today": 0}}
        )
        return result.modified_count


class DealService(BaseService):
    _collection_name = "deals"

    @classmethod
    async def find_by_pipeline(cls, pipeline_id: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"pipeline_id": pipeline_id}, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def find_by_stage(cls, stage: str, org_id: str, skip: int = 0, limit: int = 100) -> List[Dict]:
        return await cls.find({"stage": stage, "organization_id": org_id}, skip=skip, limit=limit, sort=[("created_at", -1)])

    @classmethod
    async def move_stage(cls, id: str, new_stage: str) -> Optional[Dict]:
        return await cls.update(id, {"stage": new_stage})

    @classmethod
    async def close_deal(cls, id: str, won: bool) -> Optional[Dict]:
        return await cls.update(id, {
            "closed_at": datetime.utcnow(),
            "stage": "won" if won else "lost"
        })