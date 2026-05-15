from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=100)
    domain: Optional[str] = None
    settings: dict = {}


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    domain: Optional[str] = None
    settings: Optional[dict] = None
    is_active: Optional[bool] = None


class OrganizationResponse(OrganizationBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    role: str = "team_member"


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    organization_id: Optional[int] = None


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)


class UserResponse(UserBase):
    id: int
    organization_id: Optional[int] = None
    is_active: bool
    is_super_admin: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserWithOrg(UserResponse):
    organization: Optional[OrganizationResponse] = None


class TokenData(BaseModel):
    user_id: int
    organization_id: Optional[int] = None
    role: str
    type: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class InvitationBase(BaseModel):
    email: EmailStr
    role: str = "team_member"


class InvitationCreate(InvitationBase):
    organization_id: int


class InvitationResponse(InvitationBase):
    id: int
    organization_id: int
    invited_by: int
    is_accepted: bool
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CampaignBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    email_account_id: Optional[int] = None
    settings: dict = {}


class CampaignCreate(CampaignBase):
    pass


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = None
    email_account_id: Optional[int] = None
    settings: Optional[dict] = None


class CampaignResponse(CampaignBase):
    id: int
    organization_id: int
    status: str
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class CampaignDetailResponse(CampaignResponse):
    email_account: Optional["EmailAccountResponse"] = None
    sequence_count: Optional[int] = None
    lead_count: Optional[int] = None


class LeadBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    company_size: Optional[str] = None
    job_title: Optional[str] = None
    linkedin_url: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    source: Optional[str] = None


class LeadCreate(LeadBase):
    pass


class LeadBulkCreate(BaseModel):
    leads: List[LeadBase]
    duplicate_handling: str = "skip"


class LeadUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    company_domain: Optional[str] = None
    company_size: Optional[str] = None
    job_title: Optional[str] = None
    linkedin_url: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    industry: Optional[str] = None
    enriched_data: Optional[dict] = None


class LeadResponse(LeadBase):
    id: int
    enriched_data: dict = {}
    organization_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LeadEnrichRequest(BaseModel):
    fields: List[str] = ["company_domain", "linkedin_url", "job_title"]


class CampaignLeadBase(BaseModel):
    campaign_id: int
    lead_id: int
    personalization_data: dict = {}


class CampaignLeadCreate(CampaignLeadBase):
    pass


class CampaignLeadUpdate(BaseModel):
    status: Optional[str] = None
    personalization_data: Optional[dict] = None
    ai_personalized_content: Optional[str] = None


class CampaignLeadResponse(CampaignLeadBase):
    id: int
    status: str
    ai_personalized_content: Optional[str] = None
    enrolled_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EmailAccountBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None


class EmailAccountCreate(EmailAccountBase):
    pass


class EmailAccountUpdate(BaseModel):
    display_name: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    is_active: Optional[bool] = None


class EmailAccountResponse(EmailAccountBase):
    id: int
    organization_id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SequenceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    step_number: int = Field(..., ge=1)
    subject_template: str
    body_template: str
    delay_days: int = 0
    delay_hours: int = 0
    is_ai_personalized: bool = False
    ai_prompt_template: Optional[str] = None


class SequenceCreate(SequenceBase):
    campaign_id: int


class SequenceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    subject_template: Optional[str] = None
    body_template: Optional[str] = None
    delay_days: Optional[int] = None
    delay_hours: Optional[int] = None
    is_ai_personalized: Optional[bool] = None
    ai_prompt_template: Optional[str] = None


class SequenceResponse(SequenceBase):
    id: int
    campaign_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EmailBase(BaseModel):
    email_account_id: int
    lead_id: int
    subject: str
    body: str


class EmailCreate(EmailBase):
    campaign_lead_id: Optional[int] = None
    sequence_id: Optional[int] = None


class EmailUpdate(BaseModel):
    status: Optional[str] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    bounced_at: Optional[datetime] = None
    error_message: Optional[str] = None


class EmailResponse(EmailBase):
    id: int
    campaign_lead_id: Optional[int] = None
    sequence_id: Optional[int] = None
    direction: str
    status: str
    sent_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    bounced_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EmailLogResponse(BaseModel):
    id: int
    campaign_lead_id: int
    sequence_id: Optional[int] = None
    email_id: Optional[int] = None
    event_type: str
    event_data: dict
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IntegrationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str
    credentials: Optional[str] = None
    settings: dict = {}


class IntegrationCreate(IntegrationBase):
    organization_id: int


class IntegrationUpdate(BaseModel):
    credentials: Optional[str] = None
    is_active: Optional[bool] = None
    settings: Optional[dict] = None


class IntegrationResponse(IntegrationBase):
    id: int
    organization_id: int
    is_active: bool
    last_sync_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    organization_id: Optional[int] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    details: dict
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScrapingJobBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    source_type: str
    source_url: Optional[str] = None
    config: dict = {}


class ScrapingJobCreate(ScrapingJobBase):
    organization_id: int


class ScrapingJobUpdate(BaseModel):
    status: Optional[str] = None
    results: Optional[dict] = None
    error_message: Optional[str] = None


class ScrapingJobResponse(ScrapingJobBase):
    id: int
    organization_id: int
    status: str
    results: dict = {}
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class BackgroundTaskBase(BaseModel):
    task_name: str
    task_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    priority: int = 0
    payload: dict = {}


class BackgroundTaskCreate(BackgroundTaskBase):
    organization_id: int
    scheduled_at: Optional[datetime] = None


class BackgroundTaskUpdate(BaseModel):
    status: Optional[str] = None
    result: Optional[dict] = None
    error_message: Optional[str] = None


class BackgroundTaskResponse(BackgroundTaskBase):
    id: int
    organization_id: int
    status: str
    payload: dict = {}
    result: dict = {}
    error_message: Optional[str] = None
    max_retries: int
    retry_count: int
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel):
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


class AICompletionRequest(BaseModel):
    model: str = "llama3.2"
    prompt: str
    system: Optional[str] = None
    temperature: float = 0.7
    max_tokens: int = 500
    stream: bool = False


class AIPersonalizationRequest(BaseModel):
    lead_data: dict
    template: str
    additional_context: Optional[str] = None


class AIPersonalizationResponse(BaseModel):
    subject: Optional[str] = None
    body: str
    variables_used: List[str] = []


class PaginationParams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class CampaignStatsResponse(BaseModel):
    total_leads: int
    pending: int
    completed: int
    bounced: int
    replied: int
    open_rate: float
    click_rate: float
    reply_rate: float


class LeadStatsResponse(BaseModel):
    total: int
    enriched: int
    by_industry: dict
    by_country: dict
    by_company_size: dict


from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Lead, Campaign, EmailAccount

    EmailAccountResponse.model_rebuild()
    CampaignDetailResponse.model_rebuild()