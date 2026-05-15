from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models.models import User, Campaign, CampaignSequence, CampaignStep
from app.models import CampaignLead, EmailTemplate, EmailAccount
from app.models.email_models import (
    BouncedEmail, UnsubscribedEmail, ABTestRecord,
    SequenceEnrollment, WarmupSchedule,
)
from app.schemas.campaign import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignStats,
    SequenceCreate, SequenceUpdate, SequenceResponse, SequenceStepCreate, SequenceStats,
    EmailTemplateCreate, EmailTemplateUpdate, EmailTemplateResponse,
    EmailAccountCreate, EmailAccountUpdate, EmailAccountResponse,
    SendEmailRequest, ABTestCreate, EnrollLeadsRequest,
)
from app.services.email import (
    get_email_sender, get_imap_checker, get_safety_manager,
    get_sequence_engine, get_email_tracker, get_email_analytics,
)
from app.middleware import get_current_user

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.get("/", response_model=list[CampaignResponse])
async def list_campaigns(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Campaign).where(
        and_(
            Campaign.organization_id == current_user.organization_id,
            Campaign.deleted_at.is_(None),
        )
    )
    if status:
        query = query.where(Campaign.status == status)
    if search:
        query = query.where(Campaign.name.ilike(f"%{search}%"))

    query = query.order_by(Campaign.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    campaigns = result.scalars().all()
    return [CampaignResponse.model_validate(c) for c in campaigns]


@router.post("/", response_model=CampaignResponse)
async def create_campaign(
    request: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.lib.utils import slugify

    campaign = Campaign(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        name=request.name,
        slug=slugify(request.name),
        description=request.description,
        status=request.status.value,
        campaign_type=request.campaign_type,
        start_date=request.start_date,
        end_date=request.end_date,
        target_leads=request.target_leads,
        target_criteria={
            "countries": request.target_countries,
            "industries": request.target_industries,
        },
        settings=request.settings,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).where(
            and_(
                Campaign.id == campaign_id,
                Campaign.organization_id == current_user.organization_id,
            )
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignResponse.model_validate(campaign)


@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    request: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).where(
            and_(
                Campaign.id == campaign_id,
                Campaign.organization_id == current_user.organization_id,
            )
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    for field, value in request.model_dump(exclude_unset=True).items():
        if hasattr(campaign, field):
            setattr(campaign, field, value)

    await db.commit()
    await db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).where(
            and_(
                Campaign.id == campaign_id,
                Campaign.organization_id == current_user.organization_id,
            )
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.deleted_at = datetime.utcnow()
    campaign.status = "archived"
    await db.commit()
    return {"success": True}


@router.post("/{campaign_id}/activate")
async def activate_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).where(
            and_(
                Campaign.id == campaign_id,
                Campaign.organization_id == current_user.organization_id,
            )
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "active"
    campaign.started_at = datetime.utcnow()
    await db.commit()
    return {"success": True}


@router.post("/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Campaign).where(
            and_(
                Campaign.id == campaign_id,
                Campaign.organization_id == current_user.organization_id,
            )
        )
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign.status = "paused"
    await db.commit()
    return {"success": True}


@router.get("/{campaign_id}/stats", response_model=CampaignStats)
async def get_campaign_stats(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analytics = get_email_analytics()
    stats = await analytics.get_campaign_stats(campaign_id)

    if not stats:
        raise HTTPException(status_code=404, detail="Campaign not found")

    return CampaignStats(**stats)


@router.post("/{campaign_id}/leads")
async def enroll_leads(
    campaign_id: int,
    request: EnrollLeadsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign_result = await db.execute(
        select(Campaign).where(Campaign.id == campaign_id)
    )
    campaign = campaign_result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    enrolled = 0
    for lead_id in request.lead_ids:
        existing = await db.execute(
            select(CampaignLead).where(
                and_(
                    CampaignLead.campaign_id == campaign_id,
                    CampaignLead.lead_id == lead_id,
                )
            )
        )
        if existing.scalar_one_or_none():
            continue

        enrollment = CampaignLead(
            campaign_id=campaign_id,
            lead_id=lead_id,
            status="pending",
        )
        db.add(enrollment)
        enrolled += 1

        if request.start_now and request.sequence_id:
            engine = get_sequence_engine()
            seq_result = await db.execute(
                select(Sequence).where(Sequence.id == request.sequence_id)
            )
            sequence = seq_result.scalar_one_or_none()
            if sequence:
                import json
                steps = json.loads(sequence.steps) if isinstance(sequence.steps, str) else (sequence.steps or [])
                from app.services.email.sequence_engine import SequenceStep
                await engine.enroll_lead(
                    lead_id=lead_id,
                    sequence_id=request.sequence_id,
                    steps=[SequenceStep(id=str(s.get("id", i)), type=s.get("type", "email"), order=s.get("order", i)) for i, s in enumerate(steps)],
                    start_at=datetime.utcnow() if request.start_now else None,
                )

    campaign.total_recipients += enrolled
    await db.commit()
    return {"enrolled": enrolled}


router_sequences = APIRouter(prefix="/sequences", tags=["Sequences"])


@router_sequences.get("/", response_model=list[SequenceResponse])
async def list_sequences(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Sequence).where(
        and_(
            Sequence.organization_id == current_user.organization_id,
            Sequence.deleted_at.is_(None),
        )
    )
    if status:
        query = query.where(Sequence.status == status)
    if search:
        query = query.where(Sequence.name.ilike(f"%{search}%"))

    query = query.order_by(Sequence.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    sequences = result.scalars().all()
    return [SequenceResponse.model_validate(s) for s in sequences]


@router_sequences.post("/", response_model=SequenceResponse)
async def create_sequence(
    request: SequenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.lib.utils import slugify

    sequence = Sequence(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        name=request.name,
        slug=slugify(request.name),
        description=request.description,
        steps=request.steps,
        settings=request.settings,
    )
    db.add(sequence)
    await db.commit()
    await db.refresh(sequence)
    return SequenceResponse.model_validate(sequence)


@router_sequences.get("/{sequence_id}", response_model=SequenceResponse)
async def get_sequence(
    sequence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Sequence).where(
            and_(
                Sequence.id == sequence_id,
                Sequence.organization_id == current_user.organization_id,
            )
        )
    )
    sequence = result.scalar_one_or_none()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return SequenceResponse.model_validate(sequence)


@router_sequences.patch("/{sequence_id}", response_model=SequenceResponse)
async def update_sequence(
    sequence_id: int,
    request: SequenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Sequence).where(
            and_(
                Sequence.id == sequence_id,
                Sequence.organization_id == current_user.organization_id,
            )
        )
    )
    sequence = result.scalar_one_or_none()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")

    for field, value in request.model_dump(exclude_unset=True).items():
        if hasattr(sequence, field):
            setattr(sequence, field, value)

    await db.commit()
    await db.refresh(sequence)
    return SequenceResponse.model_validate(sequence)


@router_sequences.delete("/{sequence_id}")
async def delete_sequence(
    sequence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Sequence).where(
            and_(
                Sequence.id == sequence_id,
                Sequence.organization_id == current_user.organization_id,
            )
        )
    )
    sequence = result.scalar_one_or_none()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")

    sequence.deleted_at = datetime.utcnow()
    sequence.status = "archived"
    await db.commit()
    return {"success": True}


@router_sequences.get("/{sequence_id}/stats", response_model=SequenceStats)
async def get_sequence_stats(
    sequence_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    analytics = get_email_analytics()
    stats = await analytics.get_sequence_stats(sequence_id)

    seq_result = await db.execute(
        select(Sequence).where(Sequence.id == sequence_id)
    )
    sequence = seq_result.scalar_one_or_none()

    return SequenceStats(
        sequence_id=sequence_id,
        total_enrollments=sequence.total_enrollments if sequence else 0,
        active=sequence.active_enrollments if sequence else 0,
        completed=sequence.completed_enrollments if sequence else 0,
        step_stats=stats.get("step_stats", {}),
    )


router_templates = APIRouter(prefix="/templates", tags=["Email Templates"])


@router_templates.get("/", response_model=list[EmailTemplateResponse])
async def list_templates(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(EmailTemplate).where(
        and_(
            EmailTemplate.organization_id == current_user.organization_id,
        )
    )
    if category:
        query = query.where(EmailTemplate.category == category)
    if search:
        query = query.where(EmailTemplate.name.ilike(f"%{search}%"))

    query = query.order_by(EmailTemplate.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()
    return [EmailTemplateResponse.model_validate(t) for t in templates]


@router_templates.post("/", response_model=EmailTemplateResponse)
async def create_template(
    request: EmailTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.lib.utils import slugify

    template = EmailTemplate(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        name=request.name,
        slug=slugify(request.name),
        description=request.description,
        subject=request.subject,
        body_html=request.body_html,
        body_text=request.body_text,
        preheader=request.preheader,
        category=request.category,
        tags=request.tags,
        is_public=request.is_public,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return EmailTemplateResponse.model_validate(template)


@router_templates.get("/{template_id}", response_model=EmailTemplateResponse)
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return EmailTemplateResponse.model_validate(template)


@router_templates.patch("/{template_id}", response_model=EmailTemplateResponse)
async def update_template(
    template_id: int,
    request: EmailTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    for field, value in request.model_dump(exclude_unset=True).items():
        if hasattr(template, field):
            setattr(template, field, value)

    await db.commit()
    await db.refresh(template)
    return EmailTemplateResponse.model_validate(template)


@router_templates.delete("/{template_id}")
async def delete_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailTemplate).where(EmailTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)
    await db.commit()
    return {"success": True}


router_accounts = APIRouter(prefix="/email-accounts", tags=["Email Accounts"])


@router_accounts.get("/", response_model=list[EmailAccountResponse])
async def list_email_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.organization_id == current_user.organization_id)
    )
    accounts = result.scalars().all()
    return [EmailAccountResponse.model_validate(a) for a in accounts]


@router_accounts.post("/", response_model=EmailAccountResponse)
async def create_email_account(
    request: EmailAccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    account = EmailAccount(
        organization_id=current_user.organization_id,
        user_id=current_user.id,
        email=request.email,
        provider=request.provider,
        smtp_host=request.smtp_host,
        smtp_port=request.smtp_port,
        smtp_username=request.smtp_username,
        smtp_encryption=request.smtp_encryption,
        imap_host=request.imap_host,
        imap_port=request.imap_port,
        daily_limit=request.daily_limit,
        enable_warmup=request.enable_warmup,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return EmailAccountResponse.model_validate(account)


@router_accounts.get("/{account_id}", response_model=EmailAccountResponse)
async def get_email_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailAccount).where(
            and_(
                EmailAccount.id == account_id,
                EmailAccount.organization_id == current_user.organization_id,
            )
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
    return EmailAccountResponse.model_validate(account)


@router_accounts.post("/{account_id}/verify")
async def verify_email_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")

    config = {
        "id": account.id,
        "email": account.email,
        "smtp_host": account.smtp_host,
        "smtp_port": account.smtp_port,
        "smtp_username": account.smtp_username,
        "smtp_password": account.smtp_username,
        "smtp_encryption": account.smtp_encryption,
        "daily_limit": account.daily_limit,
    }

    sender = get_email_sender()
    health = await sender.validate_smtp_connection(config)

    if health.can_connect and health.can_send:
        account.is_verified = True
        account.verified_at = datetime.utcnow()
        await db.commit()
        return {"success": True, "message": "Account verified successfully"}

    return {"success": False, "issues": health.issues}


@router_accounts.post("/{account_id}/test-send")
async def test_email_send(
    account_id: int,
    to_email: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(EmailAccount).where(EmailAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")

    config = {
        "id": account.id,
        "email": account.email,
        "from_email": account.email,
        "from_name": current_user.full_name,
        "smtp_host": account.smtp_host,
        "smtp_port": account.smtp_port,
        "smtp_username": account.smtp_username,
        "smtp_password": account.smtp_username,
        "smtp_encryption": account.smtp_encryption,
        "daily_limit": account.daily_limit,
    }

    from app.schemas.email import SendEmailRequest
    request = SendEmailRequest(
        to_email=to_email,
        subject="Outflo Test Email",
        body_text="This is a test email from Outflo. If you received this, your email account is working correctly.",
    )

    sender = get_email_sender()
    result = await sender.send_with_retry(request, config)

    return result.model_dump()


@router_accounts.post("/send")
async def send_email(
    request: SendEmailRequest,
    account_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if account_id:
        result = await db.execute(
            select(EmailAccount).where(EmailAccount.id == account_id)
        )
        account = result.scalar_one_or_none()
    else:
        result = await db.execute(
            select(EmailAccount).where(
                and_(
                    EmailAccount.organization_id == current_user.organization_id,
                    EmailAccount.is_active == True,
                )
            ).order_by(EmailAccount.total_sent)
        )
        account = result.scalars().first()

    if not account:
        raise HTTPException(status_code=400, detail="No email account available")

    config = {
        "id": account.id,
        "email": account.email,
        "from_email": request.from_email or account.email,
        "from_name": request.from_name or current_user.full_name,
        "smtp_host": account.smtp_host,
        "smtp_port": account.smtp_port,
        "smtp_username": account.smtp_username,
        "smtp_password": account.smtp_username,
        "smtp_encryption": account.smtp_encryption,
        "daily_limit": account.daily_limit,
    }

    if request.scheduled_at:
        return {
            "success": True,
            "queued": True,
            "scheduled_at": request.scheduled_at.isoformat(),
        }

    sender = get_email_sender()
    result = await sender.send_with_retry(request, config)

    if result.success:
        email_record = Email(
            organization_id=current_user.organization_id,
            campaign_id=request.campaign_id,
            sequence_id=request.sequence_id,
            lead_id=request.lead_id,
            email_account_id=account.id,
            created_by=current_user.id,
            from_email=config["from_email"],
            from_name=config["from_name"],
            to_email=request.to_email,
            to_name=request.to_name,
            subject=request.subject,
            body_text=request.body_text,
            body_html=request.body_html,
            status="sent",
            sent_at=datetime.utcnow(),
            message_id=result.message_id,
            sequence_step=request.sequence_step,
        )
        db.add(email_record)
        account.used_today += 1
        account.total_sent += 1
        account.last_used_at = datetime.utcnow()
        await db.commit()

    return result.model_dump()