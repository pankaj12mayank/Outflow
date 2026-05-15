"""
Analytics Models (MongoDB)
Simplified models for MongoDB
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AnalyticsEvent(BaseModel):
    id: Optional[str] = None
    organization_id: str
    event_type: str
    event_data: Dict[str, Any] = {}
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class CampaignMetric(BaseModel):
    id: Optional[str] = None
    organization_id: str
    campaign_id: str
    date: datetime
    emails_sent: int = 0
    emails_delivered: int = 0
    emails_opened: int = 0
    emails_clicked: int = 0
    emails_replied: int = 0
    emails_bounced: int = 0


class DashboardMetric(BaseModel):
    id: Optional[str] = None
    organization_id: str
    metric_type: str
    value: float = 0.0
    previous_value: float = 0.0
    change_percent: float = 0.0
    period: str = "daily"