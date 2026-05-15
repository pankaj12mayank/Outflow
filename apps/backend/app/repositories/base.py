"""
Outflo - Base Repository Pattern
Multi-tenant data access with soft delete support
"""

from typing import Optional, List, Generic, TypeVar, Type, Any, Dict
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func, and_, or_, Select
from sqlalchemy.orm import selectinload, joinedload
from ..db.database import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Base repository with multi-tenant isolation and soft delete support.

    All queries automatically filter by:
    1. organization_id (tenant isolation)
    2. deleted_at IS NULL (soft delete)
    """

    model: Type[ModelType]

    def __init__(self, db: AsyncSession, organization_id: int):
        self.db = db
        self.organization_id = organization_id

    def _apply_tenant_filters(self, query: Select) -> Select:
        """Apply organization_id and soft delete filters to all queries."""
        model = self.model

        if hasattr(model, 'organization_id'):
            query = query.where(model.organization_id == self.organization_id)

        if hasattr(model, 'deleted_at'):
            query = query.where(model.deleted_at.is_(None))

        return query

    async def get_by_id(self, id: int) -> Optional[ModelType]:
        """Get single record by ID with tenant filtering."""
        query = select(self.model).where(self.model.id == id)
        query = self._apply_tenant_filters(query)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        order_desc: bool = True
    ) -> List[ModelType]:
        """Get all records with pagination."""
        query = select(self.model)
        query = self._apply_tenant_filters(query)

        if order_by:
            order_col = getattr(self.model, order_by, None)
            if order_col:
                query = query.order_by(order_col.desc() if order_desc else order_col.asc())

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, obj_in: Dict[str, Any]) -> ModelType:
        """Create new record with organization_id."""
        obj_data = {**obj_in}

        if hasattr(self.model, 'organization_id') and 'organization_id' not in obj_data:
            obj_data['organization_id'] = self.organization_id

        if hasattr(self.model, 'created_at'):
            obj_data['created_at'] = datetime.utcnow()

        db_obj = self.model(**obj_data)
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def update(self, id: int, obj_in: Dict[str, Any]) -> Optional[ModelType]:
        """Update record by ID."""
        obj_data = {k: v for k, v in obj_in.items() if v is not None}

        if hasattr(self.model, 'updated_at'):
            obj_data['updated_at'] = datetime.utcnow()

        query = (
            update(self.model)
            .where(self.model.id == id)
            .values(**obj_data)
            .returning(self.model)
        )
        query = self._apply_tenant_filters(query)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def delete(self, id: int, hard: bool = False) -> bool:
        """Delete record by ID (soft delete by default)."""
        if hard:
            query = delete(self.model).where(self.model.id == id)
            query = self._apply_tenant_filters(query)
            result = await self.db.execute(query)
        else:
            query = (
                update(self.model)
                .where(self.model.id == id)
                .values(deleted_at=datetime.utcnow())
            )
            query = self._apply_tenant_filters(query)
            result = await self.db.execute(query)

        await self.db.flush()
        return result.rowcount > 0

    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """Count records with optional filters."""
        query = select(func.count()).select_from(self.model)

        if filters:
            for key, value in filters.items():
                if hasattr(self.model, key):
                    query = query.where(getattr(self.model, key) == value)

        query = self._apply_tenant_filters(query)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def exists(self, filters: Dict[str, Any]) -> bool:
        """Check if record exists with given filters."""
        return await self.count(filters) > 0

    async def get_one_by(self, filters: Dict[str, Any]) -> Optional[ModelType]:
        """Get single record by filters."""
        conditions = []
        for key, value in filters.items():
            if hasattr(self.model, key):
                conditions.append(getattr(self.model, key) == value)

        query = select(self.model).where(and_(*conditions))
        query = self._apply_tenant_filters(query)

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_many_by(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        order_desc: bool = True
    ) -> List[ModelType]:
        """Get multiple records by filters."""
        conditions = []
        for key, value in filters.items():
            if hasattr(self.model, key):
                conditions.append(getattr(self.model, key) == value)

        query = select(self.model).where(and_(*conditions))
        query = self._apply_tenant_filters(query)

        if order_by:
            order_col = getattr(self.model, order_by, None)
            if order_col:
                query = query.order_by(order_col.desc() if order_desc else order_col.asc())

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def search(
        self,
        query_text: str,
        search_fields: List[str],
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """Full-text search across specified fields."""
        conditions = []
        for field in search_fields:
            if hasattr(self.model, field):
                conditions.append(
                    getattr(self.model, field).ilike(f"%{query_text}%")
                )

        if not conditions:
            return []

        query = select(self.model).where(or_(*conditions))
        query = self._apply_tenant_filters(query)
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def bulk_create(self, objects_data: List[Dict[str, Any]]) -> List[ModelType]:
        """Bulk create records."""
        objs = []
        for data in objects_data:
            obj_data = {**data}
            if hasattr(self.model, 'organization_id') and 'organization_id' not in obj_data:
                obj_data['organization_id'] = self.organization_id
            if hasattr(self.model, 'created_at'):
                obj_data['created_at'] = datetime.utcnow()
            objs.append(self.model(**obj_data))

        self.db.add_all(objs)
        await self.db.flush()
        return objs

    async def bulk_update(self, ids: List[int], update_data: Dict[str, Any]) -> int:
        """Bulk update records by IDs."""
        obj_data = {k: v for k, v in update_data.items() if v is not None}
        if hasattr(self.model, 'updated_at'):
            obj_data['updated_at'] = datetime.utcnow()

        query = (
            update(self.model)
            .where(self.model.id.in_(ids))
            .values(**obj_data)
        )
        query = self._apply_tenant_filters(query)

        result = await self.db.execute(query)
        await self.db.flush()
        return result.rowcount

    async def get_with_relations(
        self,
        id: int,
        relations: List[str]
    ) -> Optional[ModelType]:
        """Get record with specified relations loaded."""
        query = select(self.model).where(self.model.id == id)

        for relation in relations:
            if hasattr(self.model, relation):
                query = query.options(selectinload(getattr(self.model, relation)))

        query = self._apply_tenant_filters(query)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()


class UserRepository(BaseRepository):
    """User repository with auth-specific methods."""

    model = None

    async def get_by_email(self, email: str) -> Optional["User"]:
        """Get user by email within organization."""
        return await self.get_one_by({"email": email})

    async def get_by_email_any_org(self, email: str) -> Optional["User"]:
        """Get user by email across all organizations (for login)."""
        query = select(__import__('app.models.models', fromlist=['User']).User).where(
            __import__('app.models.models', fromlist=['User']).User.email == email,
            __import__('app.models.models', fromlist=['User']).User.deleted_at.is_(None)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_active_users(self) -> List["User"]:
        """Get all active users in organization."""
        return await self.get_many_by({"is_active": True})


class LeadRepository(BaseRepository):
    """Lead repository with lead-specific methods."""

    model = None

    async def get_by_email(self, email: str) -> Optional["Lead"]:
        """Get lead by email."""
        return await self.get_one_by({"email": email})

    async def get_by_company_domain(self, domain: str) -> List["Lead"]:
        """Get all leads from company domain."""
        return await self.get_many_by({"company_domain": domain})

    async def search_leads(
        self,
        query: str,
        skip: int = 0,
        limit: int = 100
    ) -> List["Lead"]:
        """Search leads by name, email, company."""
        from app.models.models import Lead
        return await self.search(query, ["first_name", "last_name", "email", "company_name"], skip, limit)

    async def bulk_create_from_list(
        self,
        leads_data: List[Dict[str, Any]]
    ) -> List["Lead"]:
        """Bulk create leads, skip duplicates by email."""
        existing = await self.get_all(limit=10000)
        existing_emails = {lead.email.lower() for lead in existing}

        new_leads = [
            data for data in leads_data
            if data.get('email', '').lower() not in existing_emails
        ]

        return await self.bulk_create(new_leads)


class CampaignRepository(BaseRepository):
    """Campaign repository with campaign-specific methods."""

    model = None

    async def get_by_status(self, status: str) -> List["Campaign"]:
        """Get campaigns by status."""
        return await self.get_many_by({"status": status})

    async def get_active_campaigns(self) -> List["Campaign"]:
        """Get all active campaigns."""
        return await self.get_by_status("running")

    async def get_scheduled_campaigns(self) -> List["Campaign"]:
        """Get scheduled campaigns ready to run."""
        now = datetime.utcnow()
        from app.models.models import Campaign
        query = select(Campaign).where(
            Campaign.status == "scheduled",
            Campaign.schedule_date <= now,
            Campaign.deleted_at.is_(None),
            Campaign.organization_id == self.organization_id
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())


class EmailRepository(BaseRepository):
    """Email repository with email-specific methods."""

    model = None

    async def get_by_lead(self, lead_id: int) -> List["EmailMessage"]:
        """Get all emails for a lead."""
        return await self.get_many_by({"lead_id": lead_id})

    async def get_by_status(self, status: str) -> List["EmailMessage"]:
        """Get emails by status."""
        return await self.get_by_status(status)

    async def get_pending_emails(self, limit: int = 100) -> List["EmailMessage"]:
        """Get pending emails for sending."""
        from app.models.models import EmailMessage
        query = select(EmailMessage).where(
            EmailMessage.status == "pending",
            EmailMessage.deleted_at.is_(None),
            EmailMessage.organization_id == self.organization_id
        ).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())


class DealRepository(BaseRepository):
    """Deal repository with CRM-specific methods."""

    model = None

    async def get_by_stage(self, stage_id: int) -> List["Deal"]:
        """Get all deals in a stage."""
        return await self.get_many_by({"stage_id": stage_id})

    async def get_by_status(self, status: str) -> List["Deal"]:
        """Get deals by status."""
        return await self.get_many_by({"status": status})

    async def get_assigned_to_user(self, user_id: int) -> List["Deal"]:
        """Get deals assigned to specific user."""
        return await self.get_many_by({"assigned_to": user_id})


class TaskRepository(BaseRepository):
    """Task repository with task-specific methods."""

    model = None

    async def get_due_tasks(self) -> List["Task"]:
        """Get tasks that are due."""
        now = datetime.utcnow()
        from app.models.models import Task
        query = select(Task).where(
            Task.due_date <= now,
            Task.status == "pending",
            Task.deleted_at.is_(None),
            Task.organization_id == self.organization_id
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_assignee(self, user_id: int) -> List["Task"]:
        """Get tasks assigned to user."""
        return await self.get_many_by({"assigned_to": user_id})


class AuditLogRepository:
    """Audit log repository (not tenant-filtered for admin access)."""

    async def create_log(
        self,
        db: AsyncSession,
        action: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        organization_id: Optional[int] = None,
        user_id: Optional[int] = None,
        changes: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> "AuditLog":
        """Create audit log entry."""
        from app.models.models import AuditLog

        log = AuditLog(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            organization_id=organization_id,
            user_id=user_id,
            changes=changes,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.utcnow()
        )
        db.add(log)
        await db.flush()
        return log

    async def get_by_entity(
        self,
        db: AsyncSession,
        entity_type: str,
        entity_id: int,
        limit: int = 100
    ) -> List["AuditLog"]:
        """Get audit logs for specific entity."""
        from app.models.models import AuditLog

        query = select(AuditLog).where(
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id
        ).order_by(AuditLog.created_at.desc()).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        limit: int = 100
    ) -> List["AuditLog"]:
        """Get audit logs for specific user."""
        from app.models.models import AuditLog

        query = select(AuditLog).where(
            AuditLog.user_id == user_id
        ).order_by(AuditLog.created_at.desc()).limit(limit)

        result = await db.execute(query)
        return list(result.scalars().all())