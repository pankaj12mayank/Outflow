from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from enum import Enum


class HealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    UNKNOWN = "unknown"
    OFFLINE = "offline"


class LogLevel(str, Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogCategory(str, Enum):
    AUTH = "auth"
    SCRAPING = "scraping"
    AI = "ai"
    SMTP = "smtp"
    BILLING = "billing"
    API = "api"
    SYSTEM = "system"
    WORKER = "worker"
    DATABASE = "database"


class AlertSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SNOOZED = "snoozed"


class SystemComponent(str, Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    MONGODB = "mongodb"
    OLLAMA = "ollama"
    REDIS = "redis"
    WORKER = "worker"
    SCRAPER = "scraper"
    SMTP = "smtp"
    BILLING = "billing"
    API_GATEWAY = "api_gateway"


class PlatformLog(BaseModel):
    id: str = Field(default=None, alias="_id")
    level: LogLevel
    category: LogCategory
    message: str
    details: Optional[Dict] = {}
    
    source: Optional[str] = None
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    response_time_ms: Optional[int] = None
    
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    stack_trace: Optional[str] = None
    error_code: Optional[str] = None
    
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SystemHealth(BaseModel):
    id: str = Field(default=None, alias="_id")
    component: SystemComponent
    status: HealthStatus
    
    is_online: bool = True
    uptime_seconds: Optional[int] = None
    
    cpu_usage_percent: Optional[float] = None
    ram_usage_percent: Optional[float] = None
    ram_used_mb: Optional[float] = None
    ram_total_mb: Optional[float] = None
    disk_usage_percent: Optional[float] = None
    disk_used_gb: Optional[float] = None
    disk_total_gb: Optional[float] = None
    
    response_time_ms: Optional[int] = None
    request_rate: Optional[float] = None
    error_rate: Optional[float] = None
    
    active_connections: Optional[int] = None
    database_size_mb: Optional[float] = None
    
    last_error: Optional[str] = None
    last_check: datetime = Field(default_factory=datetime.utcnow)
    next_check: Optional[datetime] = None
    
    metadata: Dict = {}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WorkerLog(BaseModel):
    id: str = Field(default=None, alias="_id")
    worker_id: str
    worker_name: str
    task_type: str
    
    status: str
    message: str
    details: Optional[Dict] = {}
    
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    
    retry_count: int = 0
    max_retries: int = 3
    
    error: Optional[str] = None
    result: Optional[Dict] = {}
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ScrapingLog(BaseModel):
    id: str = Field(default=None, alias="_id")
    job_id: Optional[str] = None
    organization_id: Optional[str] = None
    
    source: str
    url: str
    status: str
    
    pages_scraped: int = 0
    records_extracted: int = 0
    
    error_message: Optional[str] = None
    
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    
    metadata: Dict = {}


class Alert(BaseModel):
    id: str = Field(default=None, alias="_id")
    title: str
    description: str
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.ACTIVE
    
    component: Optional[SystemComponent] = None
    source: Optional[str] = None
    
    triggered_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    snoozed_until: Optional[datetime] = None
    
    triggered_by: Optional[str] = None
    acknowledged_by: Optional[str] = None
    resolved_by: Optional[str] = None
    
    notification_sent: bool = False
    notification_channels: List[str] = []
    
    metadata: Dict = {}


class MonitoringMetrics(BaseModel):
    period_start: datetime
    period_end: datetime
    
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    avg_response_time_ms: float = 0
    
    total_logs: int = 0
    error_logs: int = 0
    warning_logs: int = 0
    
    active_users: int = 0
    active_organizations: int = 0
    
    uptime_percent: float = 100.0
    
    alerts_triggered: int = 0
    alerts_resolved: int = 0


class PlatformLogCreate(BaseModel):
    level: LogLevel
    category: LogCategory
    message: str
    details: Optional[Dict] = {}
    source: Optional[str] = None
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    status_code: Optional[int] = None
    response_time_ms: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    stack_trace: Optional[str] = None
    error_code: Optional[str] = None


class AlertCreate(BaseModel):
    title: str
    description: str
    severity: AlertSeverity
    component: Optional[SystemComponent] = None
    source: Optional[str] = None
    triggered_by: Optional[str] = None
    notification_channels: List[str] = []
    metadata: Dict = {}


class SystemHealthUpdate(BaseModel):
    component: SystemComponent
    status: HealthStatus
    is_online: bool = True
    cpu_usage_percent: Optional[float] = None
    ram_usage_percent: Optional[float] = None
    disk_usage_percent: Optional[float] = None
    response_time_ms: Optional[int] = None
    error_rate: Optional[float] = None
    last_error: Optional[str] = None
    metadata: Dict = {}


class LogQuery(BaseModel):
    level: Optional[LogLevel] = None
    category: Optional[LogCategory] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    source: Optional[str] = None
    user_id: Optional[str] = None
    organization_id: Optional[str] = None
    endpoint: Optional[str] = None
    status_code: Optional[int] = None
    skip: int = 0
    limit: int = 50