from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    TRIALING = "trialing"
    PAUSED = "paused"


class BillingInterval(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"
    WEEKLY = "weekly"
    ONE_TIME = "one_time"


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    BANK_TRANSFER = "bank_transfer"
    STRIPE = "stripe"
    RAZORPAY = "razorpay"


class Subscription(BaseModel):
    id: str = Field(default=None, alias="_id")
    organization_id: str
    plan_id: str
    plan_name: str
    status: SubscriptionStatus = SubscriptionStatus.ACTIVE
    billing_interval: BillingInterval = BillingInterval.MONTHLY
    price_amount: float
    currency: str = "USD"
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    cancelled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Invoice(BaseModel):
    id: str = Field(default=None, alias="_id")
    invoice_number: str
    organization_id: str
    subscription_id: Optional[str] = None
    status: InvoiceStatus = InvoiceStatus.DRAFT
    issue_date: datetime
    due_date: datetime
    paid_at: Optional[datetime] = None
    
    line_items: List[Dict] = []
    subtotal: float
    tax_rate: float = 0
    tax_amount: float = 0
    discount_amount: float = 0
    total: float
    currency: str = "USD"
    
    customer_name: str
    customer_email: EmailStr
    customer_address: Optional[Dict] = {}
    billing_address: Optional[Dict] = {}
    shipping_address: Optional[Dict] = {}
    
    notes: Optional[str] = None
    terms: Optional[str] = None
    
    branding_config: Optional[Dict] = {}
    template_id: Optional[str] = None
    
    pdf_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Payment(BaseModel):
    id: str = Field(default=None, alias="_id")
    invoice_id: str
    organization_id: str
    subscription_id: Optional[str] = None
    amount: float
    currency: str = "USD"
    status: PaymentStatus = PaymentStatus.PENDING
    payment_method: PaymentMethod
    transaction_id: Optional[str] = None
    gateway_response: Optional[Dict] = {}
    
    failure_reason: Optional[str] = None
    failure_code: Optional[str] = None
    
    refunded_amount: float = 0
    refund_reason: Optional[str] = None
    
    processed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RevenueReport(BaseModel):
    id: str = Field(default=None, alias="_id")
    period_start: datetime
    period_end: datetime
    period_type: str
    
    total_revenue: float = 0
    new_revenue: float = 0
    recurring_revenue: float = 0
    refunded_amount: float = 0
    
    total_invoices: int = 0
    paid_invoices: int = 0
    overdue_invoices: int = 0
    failed_invoices: int = 0
    
    mrr: float = 0
    arr: float = 0
    churn_rate: float = 0
    
    subscriptions_active: int = 0
    subscriptions_new: int = 0
    subscriptions_cancelled: int = 0
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class InvoiceTemplate(BaseModel):
    id: str = Field(default=None, alias="_id")
    name: str
    is_default: bool = False
    is_active: bool = True
    
    header_config: Dict = {}
    footer_config: Dict = {}
    colors: Dict = {}
    fonts: Dict = {}
    
    logo_url: Optional[str] = None
    company_name: str
    company_address: Optional[Dict] = {}
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    
    tax_number: Optional[str] = None
    tax_label: str = "Tax"
    
    notes_template: Optional[str] = None
    terms_template: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BillingAnalytics(BaseModel):
    period: str
    total_revenue: float
    revenue_growth: float
    mrr: float
    arr: float
    churn_rate: float
    avg_revenue_per_user: float
    subscriptions: Dict


class InvoiceCreate(BaseModel):
    organization_id: str
    subscription_id: Optional[str] = None
    customer_name: str
    customer_email: EmailStr
    customer_address: Optional[Dict] = {}
    line_items: List[Dict]
    tax_rate: float = 0
    discount_amount: float = 0
    due_date: datetime
    notes: Optional[str] = None
    terms: Optional[str] = None
    template_id: Optional[str] = None


class SubscriptionCreate(BaseModel):
    organization_id: str
    plan_id: str
    plan_name: str
    billing_interval: BillingInterval = BillingInterval.MONTHLY
    price_amount: float
    trial_days: int = 0


class PaymentCreate(BaseModel):
    invoice_id: str
    organization_id: str
    subscription_id: Optional[str] = None
    amount: float
    payment_method: PaymentMethod
    transaction_id: Optional[str] = None
    gateway_response: Optional[Dict] = {}


class RefundCreate(BaseModel):
    payment_id: str
    amount: float
    reason: str


class InvoiceTemplateCreate(BaseModel):
    name: str
    is_default: bool = False
    header_config: Dict = {}
    footer_config: Dict = {}
    colors: Dict = {}
    logo_url: Optional[str] = None
    company_name: str
    company_address: Optional[Dict] = {}
    company_email: Optional[str] = None
    company_phone: Optional[str] = None
    tax_number: Optional[str] = None
    tax_label: str = "Tax"
    notes_template: Optional[str] = None
    terms_template: Optional[str] = None