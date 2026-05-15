"""
Notification Models (MongoDB)
These are now just Pydantic schemas for validation, not SQLAlchemy models
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class BackgroundTask(BaseModel):
    id: Optional[str] = None
    organization_id: Optional[str] = None
    user_id: Optional[str] = None
    task_type: str
    status: str = "pending"
    priority: int = 0
    payload: Dict[str, Any] = {}
    result: Optional[Dict] = None
    attempts: int = 0
    max_attempts: int = 3
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = None
    updated_at: datetime = None


class NotificationPreference(BaseModel):
    id: Optional[str] = None
    organization_id: str
    user_id: str
    category: Optional[str] = None
    event_type: Optional[str] = None
    in_app_enabled: bool = True
    email_enabled: bool = True
    push_enabled: bool = False
    email_frequency: Optional[str] = None
    min_priority: int = 0


class NotificationBatch(BaseModel):
    id: Optional[str] = None
    organization_id: str
    name: str
    status: str = "pending"
    notification_ids: List[str] = []
    sent_count: int = 0
    failed_count: int = 0


class EmailLog(BaseModel):
    id: Optional[str] = None
    organization_id: str
    user_id: Optional[str] = None
    to_email: str
    subject: str
    template_data: Dict[str, Any] = {}
    status: str = "pending"
    sent_at: Optional[datetime] = None
    message_id: Optional[str] = None
    error_message: Optional[str] = None


class PollingState(BaseModel):
    id: Optional[str] = None
    organization_id: str
    user_id: Optional[str] = None
    entity_type: str
    entity_id: Optional[str] = None
    last_checked_at: Optional[datetime] = None
    state_data: Dict[str, Any] = {}