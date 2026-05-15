from typing import List, Optional
from datetime import datetime
from app.repositories.mongo_repositories import BaseRepository
from app.db.mongodb import MongoDB, serialize_doc


class TaskRepository(BaseRepository):
    collection_name = "background_tasks"


class TaskService:
    def __init__(self, organization_id: Optional[str] = None):
        self.organization_id = organization_id
        self.repo = TaskRepository(organization_id) if organization_id else None

    async def create_task(self, task_in: dict) -> dict:
        task_data = {
            "task_name": task_in.get("task_name"),
            "task_type": task_in.get("task_type"),
            "entity_type": task_in.get("entity_type"),
            "entity_id": task_in.get("entity_id"),
            "organization_id": task_in.get("organization_id", self.organization_id),
            "priority": task_in.get("priority", 0),
            "payload": task_in.get("payload", {}),
            "status": "pending",
            "scheduled_at": task_in.get("scheduled_at"),
            "attempts": 0,
            "max_attempts": 3,
        }
        if self.repo:
            return await self.repo.create(task_data)
        
        coll = MongoDB.get_collection("background_tasks")
        task_data["created_at"] = datetime.utcnow()
        task_data["updated_at"] = datetime.utcnow()
        result = await coll.insert_one(task_data)
        task_data["id"] = str(result.inserted_id)
        return task_data

    async def get_pending_tasks(self, limit: int = 10) -> List[dict]:
        coll = MongoDB.get_collection("background_tasks")
        cursor = coll.find({"status": "pending"}).sort([
            ("priority", -1),
            ("created_at", 1)
        ]).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]

    async def mark_task_started(self, task_id: str) -> Optional[dict]:
        coll = MongoDB.get_collection("background_tasks")
        from bson import ObjectId
        try:
            doc_id = ObjectId(task_id)
        except:
            return None
        
        result = await coll.update_one(
            {"_id": doc_id},
            {"$set": {"status": "running", "started_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
        if result.modified_count > 0:
            doc = await coll.find_one({"_id": doc_id})
            return serialize_doc(doc)
        return None

    async def mark_task_completed(self, task_id: str, result_data: dict) -> Optional[dict]:
        coll = MongoDB.get_collection("background_tasks")
        from bson import ObjectId
        try:
            doc_id = ObjectId(task_id)
        except:
            return None
        
        result = await coll.update_one(
            {"_id": doc_id},
            {"$set": {"status": "completed", "result": result_data, "completed_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
        if result.modified_count > 0:
            doc = await coll.find_one({"_id": doc_id})
            return serialize_doc(doc)
        return None

    async def mark_task_failed(self, task_id: str, error: str) -> Optional[dict]:
        coll = MongoDB.get_collection("background_tasks")
        from bson import ObjectId
        try:
            doc_id = ObjectId(task_id)
        except:
            return None
        
        doc = await coll.find_one({"_id": doc_id})
        if not doc:
            return None
        
        retry_count = doc.get("retry_count", 0) + 1
        max_attempts = doc.get("max_attempts", 3)
        
        new_status = "failed" if retry_count >= max_attempts else "pending"
        
        result = await coll.update_one(
            {"_id": doc_id},
            {"$set": {
                "status": new_status,
                "error": error,
                "attempts": retry_count,
                "updated_at": datetime.utcnow()
            }}
        )
        if result.modified_count > 0:
            doc = await coll.find_one({"_id": doc_id})
            return serialize_doc(doc)
        return None