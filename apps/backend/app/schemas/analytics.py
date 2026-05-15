from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field
from enum import Enum


class ReportType(str, Enum):
    LEADS = "leads"
    CAMPAIGN = "campaign"
    SALES = "sales"
    AI = "ai"
    SYSTEM = "system"
    EXECUTIVE = "executive"
    CUSTOM = "custom"


class ExportFormat(str, Enum):
    CSV = "csv"
    EXCEL = "excel"
    PDF = "pdf"
    JSON = "json"


class DateRange(BaseModel):
    start_date: datetime
    end_date: datetime
    preset: Optional[str] = None


class MetricValue(BaseModel):
    value: float
    previous_value: Optional[float] = None
    change_percent: Optional[float] = None
    change_direction: Optional[str] = None
    trend: list[float] = Field(default_factory=list)


class ChartData(BaseModel):
    labels: list[str]
    datasets: list[dict]
    type: str = "line"


class TableData(BaseModel):
    headers: list[str]
    rows: list[list[Any]]
    total: int
    page: int = 1
    pages: int = 1


class LeadMetrics(BaseModel):
    total_leads: MetricValue
    leads_discovered: MetricValue
    valid_emails: MetricValue
    email_validity_rate: MetricValue
    enriched_leads: MetricValue
    enrichment_score: MetricValue
    by_source: dict
    by_status: dict
    by_industry: dict
    trend_chart: ChartData


class CampaignMetrics(BaseModel):
    total_campaigns: MetricValue
    active_campaigns: MetricValue
    emails_sent: MetricValue
    emails_delivered: MetricValue
    delivery_rate: MetricValue
    open_rate: MetricValue
    click_rate: MetricValue
    reply_rate: MetricValue
    bounce_rate: MetricValue
    unsubscribe_rate: MetricValue
    by_campaign: list[dict]
    funnel_data: list[dict]
    trend_chart: ChartData


class SalesMetrics(BaseModel):
    meetings_booked: MetricValue
    meetings_completed: MetricValue
    meeting_completion_rate: MetricValue
    conversions: MetricValue
    conversion_rate: MetricValue
    pipeline_value: MetricValue
    revenue: MetricValue
    roi: MetricValue
    avg_deal_size: MetricValue
    sales_cycle_days: MetricValue
    by_source: dict
    funnel_data: list[dict]


class AIMetrics(BaseModel):
    total_generations: MetricValue
    total_tokens: MetricValue
    avg_latency_ms: MetricValue
    success_rate: MetricValue
    by_feature: dict
    by_model: dict
    personalization_score: MetricValue
    cost_savings: MetricValue
    trend_chart: ChartData


class SystemMetrics(BaseModel):
    scraping_jobs: MetricValue
    scraping_success_rate: MetricValue
    items_extracted: MetricValue
    queue_size: MetricValue
    worker_health: dict
    api_latency: MetricValue
    error_rate: MetricValue


class ExecutiveSummary(BaseModel):
    period: DateRange
    revenue: MetricValue
    conversions: MetricValue
    active_campaigns: MetricValue
    emails_sent: MetricValue
    reply_rate: MetricValue
    ai_usage: MetricValue
    top_campaigns: list[dict]
    top_sources: list[dict]
    key_insights: list[str]


class AnalyticsFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    organization_id: Optional[int] = None
    campaign_id: Optional[int] = None
    sequence_id: Optional[int] = None
    source: Optional[str] = None
    status: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    include_comparison: bool = False
    comparison_period_days: int = 30


class ExportRequest(BaseModel):
    report_type: ReportType
    format: ExportFormat
    filters: AnalyticsFilter
    columns: Optional[list[str]] = None
    include_charts: bool = False
    include_raw_data: bool = False


class ReportResponse(BaseModel):
    report_type: str
    generated_at: datetime
    period: DateRange
    metrics: dict
    chart_data: Optional[dict] = None
    table_data: Optional[TableData] = None
    download_url: Optional[str] = None


class DashboardWidget(BaseModel):
    id: str
    type: str
    title: str
    size: str = "medium"
    position: dict
    config: dict = Field(default_factory=dict)
    data_source: str
    refresh_interval: int = 300


class DashboardLayout(BaseModel):
    widgets: list[DashboardWidget]
    grid_columns: int = 12
    gap: int = 16


class QuickStat(BaseModel):
    label: str
    value: float
    previous_value: Optional[float] = None
    change_percent: Optional[float] = None
    icon: str
    color: str
    trend_direction: Optional[str] = None


class ActivityFeedItem(BaseModel):
    id: str
    type: str
    title: str
    description: str
    timestamp: datetime
    metadata: dict = Field(default_factory=dict)


class FunnelStep(BaseModel):
    name: str
    value: int
    percentage: float
    drop_off: Optional[float] = None


class CohortData(BaseModel):
    cohort: str
    period: str
    initial_size: int
    retention_data: list[float]