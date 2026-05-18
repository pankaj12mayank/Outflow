from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


class BillingCycle(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
    LIFETIME = "lifetime"


class PlanStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"
    DRAFT = "draft"


class FeatureType(str, Enum):
    BOOLEAN = "boolean"
    LIMIT = "limit"
    COUNT = "count"


class Feature(BaseModel):
    id: str = Field(default=None, alias="_id")
    key: str
    name: str
    description: str
    type: FeatureType
    default_value: Optional[Any] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PlanFeature(BaseModel):
    feature_key: str
    enabled: bool = True
    value: Optional[Any] = None
    limit: Optional[int] = None


class PlanLimit(BaseModel):
    resource: str
    limit: int
    unit: str
    hard_limit: bool = False


class Plan(BaseModel):
    id: str = Field(default=None, alias="_id")
    name: str
    description: str
    price_monthly: float
    price_yearly: float
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    status: PlanStatus = PlanStatus.ACTIVE
    is_default: bool = False
    is_popular: bool = False
    features: List[PlanFeature] = []
    limits: List[PlanLimit] = []
    stripe_price_id_monthly: Optional[str] = None
    stripe_price_id_yearly: Optional[str] = None
    trial_days: int = 0
    sort_order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrganizationLimit(BaseModel):
    id: str = Field(default=None, alias="_id")
    organization_id: str
    plan_id: str
    resource: str
    current_usage: int = 0
    limit: int
    reset_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Subscription(BaseModel):
    id: str = Field(default=None, alias="_id")
    organization_id: str
    plan_id: str
    status: str = "active"
    billing_cycle: BillingCycle
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool = False
    canceled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class FeatureFlag(BaseModel):
    id: str = Field(default=None, alias="_id")
    key: str
    name: str
    description: str
    enabled: bool = True
    rollout_percentage: int = 100
    target_roles: List[str] = []
    target_plans: List[str] = []
    target_organizations: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UsageRecord(BaseModel):
    id: str = Field(default=None, alias="_id")
    organization_id: str
    resource: str
    count: int = 1
    metadata: Dict = {}
    period: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PlanResponse(BaseModel):
    id: str
    name: str
    description: str
    price_monthly: float
    price_yearly: float
    billing_cycle: str
    status: str
    is_default: bool
    is_popular: bool
    features: List[Dict]
    limits: List[Dict]


class PlanCreateRequest(BaseModel):
    name: str
    description: str
    price_monthly: float
    price_yearly: float
    billing_cycle: BillingCycle = BillingCycle.MONTHLY
    is_default: bool = False
    is_popular: bool = False
    features: List[Dict] = []
    limits: List[Dict] = []
    trial_days: int = 0


class PlanUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    billing_cycle: Optional[BillingCycle] = None
    status: Optional[PlanStatus] = None
    is_default: Optional[bool] = None
    is_popular: Optional[bool] = None
    features: Optional[List[Dict]] = None
    limits: Optional[List[Dict]] = None
    trial_days: Optional[int] = None
    sort_order: Optional[int] = None
    show_on_landing: Optional[bool] = None


class FeatureFlagCreate(BaseModel):
    key: str
    name: str
    description: str = ""
    enabled: bool = True
    rollout_percentage: int = 100
    target_roles: List[str] = []
    target_plans: List[str] = []
    target_organizations: List[str] = []