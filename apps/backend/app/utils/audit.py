from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from ..models import AuditLog


async def create_audit_log(
    db: AsyncSession,
    action: str,
    organization_id: Optional[int] = None,
    user_id: Optional[int] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    details: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    log = AuditLog(
        action=action,
        organization_id=organization_id,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.utcnow(),
    )
    db.add(log)
    await db.flush()
    return log