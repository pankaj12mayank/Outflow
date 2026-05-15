from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class FeatureType(str, Enum):
    EMAIL_GENERATION = "email_generation"
    PERSONALIZATION = "personalization"
    SUBJECT_LINE = "subject_line"
    CTA_GENERATION = "cta_generation"
    OPENER_GENERATION = "opener_generation"
    READABILITY_IMPROVEMENT = "readability_improvement"
    OUTREACH_OPTIMIZATION = "outreach_optimization"
    REPLY_CLASSIFICATION = "reply_classification"
    COMPANY_ANALYSIS = "company_analysis"
    PAIN_POINT_DETECTION = "pain_point_detection"
    CUSTOM = "custom"


class PersonalizeRequest(BaseModel):
    lead_id: str
    template: Optional[str] = None
    goal: Optional[str] = "book_demo"
    sender_context: Optional[str] = None
    generate_subject: bool = False
    generate_cta: bool = False


class PersonalizeResponse(BaseModel):
    opener: str
    body: str
    full_email: str
    subject: Optional[str] = None
    cta: Optional[str] = None
    personalization_data: Optional[dict] = None
    tokens_used: int
    latency_ms: float


class GenerateRequest(BaseModel):
    type: FeatureType
    context: dict = Field(default_factory=dict)
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class GenerateResponse(BaseModel):
    content: str
    tokens_used: int
    latency_ms: float
    model: str


class WebsiteAnalyzeRequest(BaseModel):
    website_url: str
    content: Optional[str] = None


class WebsiteAnalyzeResponse(BaseModel):
    company_name: str
    industry: str
    product_description: str
    key_value_props: list[str] = Field(default_factory=list)
    recent_news: str = ""
    pain_points: list[str] = Field(default_factory=list)
    tone: str = "professional"
    personalization_angles: list[str] = Field(default_factory=list)
    tokens_used: int
    latency_ms: float


class ClassifyReplyRequest(BaseModel):
    email_id: Optional[str] = None
    sender: str
    subject: str
    body: str


class ClassifyReplyResponse(BaseModel):
    category: str
    confidence: float
    reasoning: str
    sentiment: str
    action_required: Optional[str] = None
    tokens_used: int
    latency_ms: float


class PromptCreateRequest(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    category: str
    type: str
    prompt: str
    model: Optional[str] = "llama3.2"
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 500
    variables: Optional[list[str]] = Field(default_factory=list)


class PromptUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    variables: Optional[list[str]] = None
    is_active: Optional[bool] = None


class PromptResponse(BaseModel):
    id: int
    key: str
    name: str
    description: Optional[str]
    category: str
    type: str
    prompt: str
    model: str
    temperature: float
    max_tokens: int
    variables: list[str]
    version: int
    is_active: bool
    created_at: datetime


class AISettingsRequest(BaseModel):
    default_model: Optional[str] = None
    personalization_enabled: Optional[bool] = None
    auto_personalize: Optional[bool] = None
    ai_suggestions_enabled: Optional[bool] = None
    reply_classification_enabled: Optional[bool] = None
    max_email_length: Optional[int] = None
    default_tone: Optional[str] = None
    rate_limit_per_day: Optional[int] = None
    custom_config: Optional[dict] = None


class AISettingsResponse(BaseModel):
    id: int
    organization_id: int
    default_model: str
    personalization_enabled: bool
    auto_personalize: bool
    ai_suggestions_enabled: bool
    reply_classification_enabled: bool
    max_email_length: int
    default_tone: str
    rate_limit_per_day: int
    custom_config: dict


class AIProviderRequest(BaseModel):
    name: str
    display_name: str
    enabled: bool = True
    is_default: bool = False
    config: dict = Field(default_factory=dict)


class AIModelRequest(BaseModel):
    name: str
    provider_id: int
    display_name: str
    description: Optional[str] = None
    enabled: bool = True
    temperature: float = 0.7
    max_tokens: int = 500
    cost_per_1k_input: float = 0.0
    cost_per_1k_output: float = 0.0
    context_window: int = 4096
    config: dict = Field(default_factory=dict)


class AIUsageStats(BaseModel):
    total_generations: int
    total_tokens: int
    total_cost: float
    by_model: dict
    by_feature: dict
    avg_latency_ms: float
    success_rate: float


class AIUsageQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    model: Optional[str] = None
    feature: Optional[str] = None
    limit: int = 100
    offset: int = 0


class AIUsageResponse(BaseModel):
    records: list[dict]
    total: int
    stats: AIUsageStats


class OllamaStatus(BaseModel):
    connected: bool
    version: Optional[str] = None
    models: list[dict] = Field(default_factory=list)
    default_model: Optional[str] = None