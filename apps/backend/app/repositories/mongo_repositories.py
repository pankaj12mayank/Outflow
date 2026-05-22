from typing import Optional, List, Generic, TypeVar, Type, Any, Dict
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.db.mongodb import MongoDB, serialize_doc

ModelType = TypeVar("ModelType")


class BaseRepository:
    """Base MongoDB repository with multi-tenant isolation and soft delete support."""

    collection_name: str = ""
    tenant_field: str = "organization_id"
    soft_delete_field: str = "deleted_at"

    def __init__(self, organization_id: str):
        self.organization_id = organization_id
        self._collection = MongoDB.get_collection(self.collection_name)

    def _get_tenant_filter(self, filters: Dict = None) -> Dict:
        """Apply organization_id filter for tenant isolation."""
        base_filter = {self.tenant_field: self.organization_id}
        if self.soft_delete_field:
            base_filter[self.soft_delete_field] = None
        
        if filters:
            base_filter.update(filters)
        return base_filter

    async def get_by_id(self, id: str) -> Optional[Dict]:
        """Get single record by ID with tenant filtering."""
        try:
            doc_id = ObjectId(id)
        except InvalidId:
            return None
        
        filter_dict = self._get_tenant_filter({"_id": doc_id})
        doc = await self._collection.find_one(filter_dict)
        return serialize_doc(doc) if doc else None

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        order_desc: bool = True
    ) -> List[Dict]:
        """Get all records with pagination."""
        filter_dict = self._get_tenant_filter()
        
        cursor = self._collection.find(filter_dict)
        
        if order_by:
            sort_order = -1 if order_desc else 1
            cursor = cursor.sort(order_by, sort_order)
        
        cursor = cursor.skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]

    async def create(self, obj_in: Dict[str, Any]) -> Dict:
        """Create new record with organization_id."""
        obj_data = {**obj_in}
        obj_data[self.tenant_field] = self.organization_id
        obj_data["created_at"] = datetime.utcnow()
        obj_data["updated_at"] = datetime.utcnow()
        
        if "id" in obj_data:
            del obj_data["id"]
        
        result = await self._collection.insert_one(obj_data)
        obj_data["id"] = str(result.inserted_id)
        return obj_data

    async def update(self, id: str, obj_in: Dict[str, Any]) -> Optional[Dict]:
        """Update record by ID."""
        try:
            doc_id = ObjectId(id)
        except InvalidId:
            return None
        
        obj_data = {k: v for k, v in obj_in.items() if v is not None}
        obj_data["updated_at"] = datetime.utcnow()
        
        filter_dict = self._get_tenant_filter({"_id": doc_id})
        result = await self._collection.update_one(filter_dict, {"$set": obj_data})
        
        if result.modified_count > 0:
            return await self.get_by_id(id)
        return None

    async def delete(self, id: str, hard: bool = False) -> bool:
        """Delete record by ID (soft delete by default)."""
        try:
            doc_id = ObjectId(id)
        except InvalidId:
            return False
        
        filter_dict = self._get_tenant_filter({"_id": doc_id})
        if hard:
            result = await self._collection.delete_one(filter_dict)
            return result.deleted_count > 0
        result = await self._collection.update_one(
            filter_dict,
            {"$set": {"deleted_at": datetime.utcnow()}},
        )
        return result.modified_count > 0

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters."""
        filter_dict = self._get_tenant_filter(filters)
        return await self._collection.count_documents(filter_dict)

    async def exists(self, filters: Dict[str, Any]) -> bool:
        """Check if record exists with given filters."""
        filter_dict = self._get_tenant_filter(filters)
        doc = await self._collection.find_one(filter_dict, {"_id": 1})
        return doc is not None

    async def get_one_by(self, filters: Dict[str, Any]) -> Optional[Dict]:
        """Get single record by filters."""
        filter_dict = self._get_tenant_filter(filters)
        doc = await self._collection.find_one(filter_dict)
        return serialize_doc(doc) if doc else None

    async def get_many_by(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        order_desc: bool = True
    ) -> List[Dict]:
        """Get multiple records by filters."""
        filter_dict = self._get_tenant_filter(filters)
        
        cursor = self._collection.find(filter_dict)
        
        if order_by:
            sort_order = -1 if order_desc else 1
            cursor = cursor.sort(order_by, sort_order)
        
        cursor = cursor.skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]

    async def search(
        self,
        query_text: str,
        search_fields: List[str],
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict]:
        """Full-text search across specified fields."""
        or_conditions = []
        for field in search_fields:
            or_conditions.append({field: {"$regex": query_text, "$options": "i"}})
        
        if not or_conditions:
            return []
        
        filter_dict = self._get_tenant_filter({"$or": or_conditions})
        
        cursor = self._collection.find(filter_dict).skip(skip).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]

    async def bulk_create(self, objects_data: List[Dict[str, Any]]) -> List[Dict]:
        """Bulk create records."""
        if not objects_data:
            return []
        
        documents = []
        for data in objects_data:
            doc = {**data}
            doc[self.tenant_field] = self.organization_id
            doc["created_at"] = datetime.utcnow()
            doc["updated_at"] = datetime.utcnow()
            doc.pop("id", None)
            documents.append(doc)
        
        result = await self._collection.insert_many(documents)
        
        created = []
        for i, doc in enumerate(documents):
            doc["id"] = str(result.inserted_ids[i])
            created.append(doc)
        
        return created

    async def bulk_update(self, ids: List[str], update_data: Dict[str, Any]) -> int:
        """Bulk update records by IDs."""
        if not ids:
            return 0
        
        try:
            object_ids = [ObjectId(id) for id in ids]
        except InvalidId:
            return 0
        
        obj_data = {k: v for k, v in update_data.items() if v is not None}
        obj_data["updated_at"] = datetime.utcnow()
        
        filter_dict = self._get_tenant_filter({"_id": {"$in": object_ids}})
        result = await self._collection.update_many(filter_dict, {"$set": obj_data})
        
        return result.modified_count


class UserRepository(BaseRepository):
    """User repository with auth-specific methods."""

    collection_name = "users"

    async def get_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email within organization."""
        return await self.get_one_by({"email": email})

    async def get_by_email_any_org(self, email: str) -> Optional[Dict]:
        """Get user by email across all organizations (for login)."""
        coll = MongoDB.get_collection("users")
        doc = await coll.find_one({"email": email, "deleted_at": None})
        return serialize_doc(doc) if doc else None

    async def get_active_users(self) -> List[Dict]:
        """Get all active users in organization."""
        return await self.get_many_by({"is_active": True})


class LeadRepository(BaseRepository):
    """Lead repository with lead-specific methods."""

    collection_name = "leads"

    async def get_by_email(self, email: str) -> Optional[Dict]:
        """Get lead by email."""
        return await self.get_one_by({"email": email})

    async def get_by_company_domain(self, domain: str) -> List[Dict]:
        """Get all leads from company domain."""
        return await self.get_many_by({"company_domain": domain})

    async def search_leads(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Dict]:
        """Search leads by name, email, company."""
        return await self.search(query, ["first_name", "last_name", "email", "company"], skip, limit)

    async def bulk_create_from_list(
        self,
        leads_data: List[Dict[str, Any]]
    ) -> List[Dict]:
        """Bulk create leads, skip duplicates by email."""
        existing = await self.get_all(limit=10000)
        existing_emails = {lead.get("email", "").lower() for lead in existing}

        new_leads = [
            data for data in leads_data
            if data.get("email", "").lower() not in existing_emails
        ]

        return await self.bulk_create(new_leads)


class CampaignRepository(BaseRepository):
    """Campaign repository with campaign-specific methods."""

    collection_name = "campaigns"

    async def get_by_status(self, status: str) -> List[Dict]:
        """Get campaigns by status."""
        return await self.get_many_by({"status": status})

    async def get_active_campaigns(self) -> List[Dict]:
        """Get all active campaigns."""
        return await self.get_by_status("running")

    async def get_scheduled_campaigns(self) -> List[Dict]:
        """Get scheduled campaigns ready to run."""
        now = datetime.utcnow()
        coll = MongoDB.get_collection("campaigns")
        cursor = coll.find({
            "organization_id": self.organization_id,
            "status": "scheduled",
            "schedule_date": {"$lte": now},
            "deleted_at": None
        })
        docs = await cursor.to_list(length=None)
        return [serialize_doc(doc) for doc in docs]


class EmailRepository(BaseRepository):
    """Email repository with email-specific methods."""

    collection_name = "email_messages"

    async def get_by_lead(self, lead_id: str) -> List[Dict]:
        """Get all emails for a lead."""
        return await self.get_many_by({"lead_id": lead_id})

    async def get_by_status(self, status: str) -> List[Dict]:
        """Get emails by status."""
        return await self.get_many_by({"status": status})

    async def get_pending_emails(self, limit: int = 100) -> List[Dict]:
        """Get pending emails for sending."""
        coll = MongoDB.get_collection("email_messages")
        cursor = coll.find({
            "organization_id": self.organization_id,
            "status": "pending",
            "deleted_at": None
        }).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]


class DealRepository(BaseRepository):
    """Deal repository with CRM-specific methods."""

    collection_name = "deals"

    async def get_by_stage(self, stage_id: str) -> List[Dict]:
        """Get all deals in a stage."""
        return await self.get_many_by({"stage_id": stage_id})

    async def get_by_status(self, status: str) -> List[Dict]:
        """Get deals by status."""
        return await self.get_many_by({"status": status})

    async def get_assigned_to_user(self, user_id: str) -> List[Dict]:
        """Get deals assigned to specific user."""
        return await self.get_many_by({"assigned_to": user_id})


class TaskRepository(BaseRepository):
    """Task repository with task-specific methods."""

    collection_name = "tasks"

    async def get_due_tasks(self) -> List[Dict]:
        """Get tasks that are due."""
        now = datetime.utcnow()
        coll = MongoDB.get_collection("tasks")
        cursor = coll.find({
            "organization_id": self.organization_id,
            "due_date": {"$lte": now},
            "status": "pending",
            "deleted_at": None
        })
        docs = await cursor.to_list(length=None)
        return [serialize_doc(doc) for doc in docs]

    async def get_by_assignee(self, user_id: str) -> List[Dict]:
        """Get tasks assigned to user."""
        return await self.get_many_by({"assigned_to": user_id})


class AuditLogRepository:
    """Audit log repository (not tenant-filtered for admin access)."""

    collection_name = "audit_logs"

    async def create_log(
        self,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        organization_id: Optional[str] = None,
        user_id: Optional[str] = None,
        changes: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict:
        """Create audit log entry."""
        coll = MongoDB.get_collection("audit_logs")
        log = {
            "organization_id": organization_id,
            "user_id": user_id,
            "action": action,
            "resource_type": entity_type,
            "resource_id": entity_id,
            "details": changes or {},
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.utcnow()
        }
        result = await coll.insert_one(log)
        log["id"] = str(result.inserted_id)
        return log

    async def get_by_entity(
        self,
        entity_type: str,
        entity_id: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get audit logs for specific entity."""
        coll = MongoDB.get_collection("audit_logs")
        cursor = coll.find({
            "resource_type": entity_type,
            "resource_id": entity_id
        }).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]

    async def get_by_user(
        self,
        user_id: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get audit logs for specific user."""
        coll = MongoDB.get_collection("audit_logs")
        cursor = coll.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [serialize_doc(doc) for doc in docs]


class OrganizationRepository(BaseRepository):
    """Organization repository."""

    collection_name = "organizations"

    async def get_by_slug(self, slug: str) -> Optional[Dict]:
        """Get organization by slug."""
        coll = MongoDB.get_collection("organizations")
        doc = await coll.find_one({"slug": slug, "is_active": True})
        return serialize_doc(doc) if doc else None


class TeamMemberRepository(BaseRepository):
    """Team member repository."""

    collection_name = "team_members"

    async def get_active_members(self) -> List[Dict]:
        """Get all active team members."""
        return await self.get_many_by({"is_active": True})

    async def get_by_email(self, email: str) -> Optional[Dict]:
        """Get team member by email."""
        return await self.get_one_by({"email": email})


class TeamInvitationRepository(BaseRepository):
    """Team invitation repository."""

    collection_name = "team_invitations"

    async def get_pending_invitations(self) -> List[Dict]:
        """Get all pending invitations."""
        return await self.get_many_by({"status": "pending"})

    async def get_by_email(self, email: str) -> Optional[Dict]:
        """Get invitation by email."""
        return await self.get_one_by({"email": email})