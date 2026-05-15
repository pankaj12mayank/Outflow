"""
Admin Models (MongoDB)
Simplified models for MongoDB
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class SystemAlert(BaseModel):
    id: Optional[str] = None
    alert_type: str
    severity: str = "info"
    title: str
    message: Optional[str] = None
    details: Dict[str, Any] = {}
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    metadata_json: Dict[str, Any] = {}


class AbuseReport(BaseModel):
    id: Optional[str] = None
    organization_id: str
    reported_by: str
    report_type: str
    description: str
    evidence: Dict[str, Any] = {}
    status: str = "pending"
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None


class AdminLog(BaseModel):
    id: Optional[str] = None
    admin_id: str
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None


class Plan(BaseModel):
    id: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = None
    price_monthly: float = 0.0
    price_yearly: float = 0.0
    currency: str = "USD"
    features: List[str] = []
    limits: Dict[str, int] = {}
    is_active: bool = True


class Subscription(BaseModel):
    id: Optional[str] = None
    organization_id: str
    plan_id: str
    status: str = "active"
    billing_cycle: str = "monthly"
    current_period_start: datetime
    current_period_end: datetime
    cancelled_at: Optional[datetime] = None


class Invoice(BaseModel):
    id: Optional[str] = None
    organization_id: str
    subscription_id: Optional[str] = None
    amount: float
    currency: str = "USD"
    status: str = "pending"
    paid_at: Optional[datetime] = None
    due_date: datetime
    invoice_number: Optional[str] = None