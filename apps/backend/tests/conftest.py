import os
import pytest
import asyncio
from typing import Generator, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from httpx import AsyncClient, ASGITransport

os.environ.update({
    "SECRET_KEY": "test-secret-key-for-testing-only",
    "DATABASE_URL": "postgresql+asyncpg://postgres:password@localhost:5432/outflo_test",
    "DEBUG": "true",
    "OLLAMA_BASE_URL": "http://localhost:11434",
})


@pytest.fixture(scope="session")
def event_loop():
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def async_engine():
    from app.db import Base
    from app.core.config import settings

    engine = create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    async_session = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    from app.main import app
    from app.db import get_db
    from app.core.security import create_access_token

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
async def authenticated_client(
    client: AsyncClient, db_session: AsyncSession
) -> AsyncGenerator[AsyncClient, None]:
    from app.models.models import Organization, User
    from app.core.security import get_password_hash

    org = Organization(name="Test Org", slug="test-org", is_active=True)
    db_session.add(org)
    await db_session.flush()

    user = User(
        email="test@example.com",
        full_name="Test User",
        password_hash=get_password_hash("TestPassword123!"),
        organization_id=org.id,
        role="admin",
        is_email_verified=True,
    )
    db_session.add(user)
    await db_session.flush()

    token = create_access_token({"sub": str(user.id), "email": user.email, "org_id": org.id})
    client.headers["Authorization"] = f"Bearer {token}"

    yield client

    await db_session.delete(user)
    await db_session.delete(org)


@pytest.fixture
async def org_admin(db_session: AsyncSession):
    from app.models.models import Organization, User
    from app.core.security import get_password_hash

    org = Organization(name="Admin Org", slug="admin-org", is_active=True)
    db_session.add(org)
    await db_session.flush()

    user = User(
        email="admin@example.com",
        full_name="Admin User",
        password_hash=get_password_hash("AdminPass123!"),
        organization_id=org.id,
        role="admin",
        is_super_admin=True,
        is_email_verified=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
async def regular_user(db_session: AsyncSession):
    from app.models.models import Organization, User
    from app.core.security import get_password_hash

    org = Organization(name="Regular Org", slug="regular-org", is_active=True)
    db_session.add(org)
    await db_session.flush()

    user = User(
        email="user@example.com",
        full_name="Regular User",
        password_hash=get_password_hash("UserPass123!"),
        organization_id=org.id,
        role="user",
        is_email_verified=True,
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest.fixture
def sample_lead_data():
    return {
        "email": "lead@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "company": "Acme Corp",
        "phone": "+1234567890",
        "website": "https://acme.com",
        "linkedin_url": "https://linkedin.com/in/johndoe",
        "title": "CEO",
        "industry": "Technology",
    }


@pytest.fixture
def sample_campaign_data():
    return {
        "name": "Test Campaign",
        "description": "A test campaign for unit testing",
        "status": "draft",
        "campaign_type": "cold_outreach",
        "start_date": "2026-06-01",
    }


@pytest.fixture
def sample_email_config():
    return {
        "email": "test@example.com",
        "provider": "gmail",
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_username": "test@gmail.com",
        "smtp_encryption": "starttls",
    }


@pytest.fixture
def sample_ai_request():
    return {
        "type": "subject_line",
        "context": {
            "recipient_name": "John",
            "company_name": "Acme Corp",
            "industry": "Technology",
            "topic": "Demo Request",
            "count": 3,
        },
    }


@pytest.fixture
def sample_csv_content():
    return b"email,first_name,last_name,company\nuser@example.com,Test,User,TestCo\n"


@pytest.fixture
def mock_ollama(monkeypatch):
    async def mock_generate(self, request):
        class MockResponse:
            content = "Mock AI response"
            prompt_tokens = 10
            completion_tokens = 20
            usage_tokens = 30
            latency_ms = 500
            cost = 0.0
            success = True
        return MockResponse()

    async def mock_chat(self, messages, model, system, temperature, max_tokens):
        class MockChatResponse:
            content = "Mock chat response"
            prompt_tokens = 5
            completion_tokens = 10
            usage_tokens = 15
            latency_ms = 300
            cost = 0.0
        return MockChatResponse()

    from app.services.ai.providers import OllamaProvider
    monkeypatch.setattr(OllamaProvider, "generate", mock_generate)
    monkeypatch.setattr(OllamaProvider, "chat", mock_chat)


@pytest.fixture(autouse=True)
async def cleanup_db(db_session: AsyncSession):
    yield
    from app.models import Notification, AuditLog
    from sqlalchemy import delete
    await db_session.execute(delete(Notification).where(Notification.user_id == None))
    await db_session.execute(delete(AuditLog).where(AuditLog.organization_id == None))