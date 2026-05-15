import os
import sys
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.orm import declarative_base
from sqlalchemy.ext.asyncio import async_engine_from_config

alembic_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(alembic_dir)
sys.path.insert(0, project_root)
os.chdir(project_root)

from alembic import context

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

Base = declarative_base()

from app.models.models import (
    Organization, User, Membership, Role, Permission, Session, LoginLog,
    Plan, Subscription, Invoice, UsageTracking,
    Lead, LeadSource, LeadTag, LeadTagAssignment, LeadActivity, LeadEnrichment,
    Inbox, SmtpConfig,
    Campaign, CampaignSequence, CampaignStep,
    EmailMessage, EmailOpen, EmailReply, EmailBounce,
    AIPrompt, AITemplate, AIGeneration, AIUsageLog,
    Pipeline, Stage, Deal, Task, Note, Activity, Meeting,
    CalendarIntegration, BookingLink,
    CMSPage, CMSSection, CMSTheme, CMSAsset, CMSNavigation, CMSNavigationItem,
    AnalyticsEvent, CampaignMetric, DashboardMetric,
    Notification, AuditLog, FeatureFlag, SystemSetting,
)
from app.models.ai_models import AIProvider, AIModel, AISettings

db_url = os.environ.get("DATABASE_URL") or "postgresql+asyncpg://postgres:postgres@localhost:5432/outflo"
config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    import asyncio
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()