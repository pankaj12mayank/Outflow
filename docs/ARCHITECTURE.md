# Outflo Architecture Documentation

## Overview

Outflo is a production-grade AI Outreach Automation SaaS platform built with a scalable monorepo architecture. This document describes the complete system architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENTS                                   │
│              (Web Browser / Mobile App)                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
│                    Next.js 14 (Port 3000)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │
│  │ Dashboard│ │ Campaigns│ │  Leads  │ │  Email  │ │  Auth   │    │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │
│           │           │           │           │                  │
│           └───────────┴───────────┴───────────┘                  │
│                      React Query (Polling)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                   │
│                    FastAPI (Port 8000)                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  REST API   │ │  Auth JWT    │ │ Scheduler   │               │
│  │  /api/v1/*  │ │  30min token │ │ APScheduler │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│           │           │           │                              │
│           ▼           ▼           ▼                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │  Services   │ │ Middleware  │ │ Task Queue  │               │
│  │  Business   │ │ Auth/Role   │ │ Background  │               │
│  └─────────────┘ └─────────────┘ └─────────────┘               │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    DATABASE                               │   │
│  │              PostgreSQL 15                               │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │   │
│  │  │Orgs    │ │Users   │ │Leads   │ │Campaigns│ │Emails  │  │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│   AI Provider     │ │   Web Scraper     │ │   Email Service   │
│   Ollama (Local)  │ │   httpx/BS4       │ │   SMTP            │
│   llama3.2        │ │   Rotating UA     │ │   Gmail/SMTP      │
└───────────────────┘ └───────────────────┘ └───────────────────┘
```

## Tech Stack Summary

### Frontend Stack
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: TailwindCSS + ShadCN UI
- **State Management**:
  - Global: Zustand
  - Server: TanStack React Query
- **Animation**: Framer Motion
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios

### Backend Stack
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Database**: PostgreSQL 15
- **ORM**: SQLAlchemy 2.0 (async)
- **Migrations**: Alembic
- **Auth**: JWT (python-jose) + bcrypt
- **Scheduler**: APScheduler
- **HTTP Client**: httpx (async)

### AI Stack
- **Provider**: Ollama (local)
- **Model**: llama3.2 (default)
- **Abstraction**: Future-ready for GPT/Claude

### Scraping Stack
- **HTTP**: httpx (async)
- **Parsing**: BeautifulSoup + lxml
- **Browser**: Playwright (optional)
- **User Agents**: Rotating pool

## Directory Structure

```
outflo/
├── apps/
│   ├── backend/                    # FastAPI Application
│   │   ├── app/
│   │   │   ├── __init__.py
│   │   │   ├── main.py            # FastAPI app entry
│   │   │   ├── api/               # API Routes
│   │   │   │   ├── __init__.py
│   │   │   │   └── v1/
│   │   │   │       ├── __init__.py
│   │   │   │       ├── router.py  # API Router
│   │   │   │       └── endpoints/  # Endpoint modules
│   │   │   │           ├── auth.py
│   │   │   │           ├── campaigns.py
│   │   │   │           ├── leads.py
│   │   │   │           ├── users.py
│   │   │   │           ├── tasks.py
│   │   │   │           └── health.py
│   │   │   ├── core/              # Core functionality
│   │   │   │   ├── __init__.py
│   │   │   │   ├── config.py      # Settings management
│   │   │   │   └── security.py   # JWT/bcrypt utilities
│   │   │   ├── db/               # Database
│   │   │   │   ├── __init__.py
│   │   │   │   └── database.py    # Async SQLAlchemy setup
│   │   │   ├── models/            # SQLAlchemy Models
│   │   │   │   ├── __init__.py
│   │   │   │   └── models.py      # All database models
│   │   │   ├── schemas/           # Pydantic Schemas
│   │   │   │   ├── __init__.py
│   │   │   │   └── schemas.py     # All request/response schemas
│   │   │   ├── services/          # Business Logic
│   │   │   │   ├── __init__.py
│   │   │   │   ├── auth_service.py
│   │   │   │   ├── campaign_service.py
│   │   │   │   ├── lead_service.py
│   │   │   │   └── task_service.py
│   │   │   ├── repositories/      # Data Access Layer
│   │   │   │   ├── __init__.py
│   │   │   │   └── base.py        # Base repository + implementations
│   │   │   ├── tasks/             # Background Jobs
│   │   │   │   ├── __init__.py
│   │   │   │   └── scheduler.py   # APScheduler polling service
│   │   │   ├── middleware/        # Custom Middleware
│   │   │   │   ├── __init__.py
│   │   │   │   └── auth.py        # JWT validation, role checking
│   │   │   └── utils/             # Utilities
│   │   │       ├── __init__.py
│   │   │       ├── audit.py       # Audit logging
│   │   │       └── validators.py  # Input validation
│   │   └── tests/                 # Tests
│   │       ├── __init__.py
│   │       ├── test_api.py
│   │       ├── unit/
│   │       └── integration/
│   ├── frontend/                   # Next.js Application
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── page.tsx           # Home page
│   │   │   ├── globals.css        # Global styles
│   │   │   ├── login/page.tsx     # Login page
│   │   │   ├── register/page.tsx  # Register page
│   │   │   └── dashboard/page.tsx # Dashboard page
│   │   ├── components/            # React Components
│   │   │   └── ui/               # ShadCN UI components
│   │   │       ├── button.tsx
│   │   │       ├── input.tsx
│   │   │       ├── card.tsx
│   │   │       ├── table.tsx
│   │   │       └── ...
│   │   ├── hooks/                 # Custom React Hooks
│   │   │   ├── index.ts
│   │   │   ├── useQueries.ts      # React Query hooks
│   │   │   └── useUtils.ts        # Utility hooks
│   │   ├── lib/                   # Utilities
│   │   │   ├── api.ts             # Axios client
│   │   │   ├── config.ts          # App config
│   │   │   └── utils.ts           # Helper functions
│   │   ├── stores/                # Zustand stores
│   │   │   └── index.ts
│   │   ├── types/                 # TypeScript types
│   │   │   └── index.ts
│   │   ├── providers/             # React providers
│   │   │   └── query-provider.tsx
│   │   └── public/                # Static assets
│   └── package.json
├── packages/                      # Shared Packages
│   ├── ai-providers/              # AI Provider Abstraction
│   │   └── src/
│   │       ├── base.py            # Abstract provider
│   │       ├── ollama_provider.py # Ollama implementation
│   │       └── manager.py         # Provider manager
│   ├── scraping/                   # Web Scraping Utilities
│   │   └── src/
│   │       ├── scraper.py         # Main scraper
│   │       └── user_agent.py      # UA rotation
│   ├── email/                     # Email Utilities
│   │   └── src/
│   │       └── email_service.py   # SMTP service
│   ├── shared/                    # Shared Constants
│   │   └── src/
│   │       └── constants.ts       # Status constants, etc.
│   └── config/                    # Shared Config
│       └── src/
│           └── index.ts           # Config values
├── scripts/                       # Deployment Scripts
│   ├── setup.sh                  # Linux/Mac setup
│   ├── setup.bat                 # Windows setup
│   ├── start-dev.sh              # Start dev servers
│   ├── start-dev.bat             # Start dev servers (Windows)
│   └── deploy-production.sh      # Production deployment
├── infrastructure/                # (Docker removed - non-Docker deployment)
├── docs/                         # Documentation
│   └── ARCHITECTURE.md           # This document
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore
├── package.json                  # Monorepo config
└── README.md                     # Project readme
```

## Database Models

### Core Models

| Model | Table | Description |
|-------|-------|-------------|
| Organization | organizations | Multi-tenant root entity |
| User | users | Authentication & authorization |
| Campaign | campaigns | Outreach campaigns |
| Lead | leads | Contact/prospect data |
| CampaignLead | campaign_leads | Campaign-Lead association |
| EmailAccount | email_accounts | SMTP account configurations |
| Sequence | sequences | Email sequence steps |
| Email | emails | Sent/received emails |
| EmailLog | email_logs | Email tracking events |

### Supporting Models

| Model | Table | Description |
|-------|-------|-------------|
| Invitation | invitations | Team invitations |
| Integration | integrations | CRM connections |
| AuditLog | audit_logs | Activity tracking |
| ScrapingJob | scraping_jobs | Scraping task records |
| BackgroundTask | background_tasks | Task queue items |

## User Roles & Permissions

| Role | Code | Description | Access |
|------|------|-------------|--------|
| Super Admin | super_admin | System-wide access | All organizations, all features |
| Owner | owner | Organization owner | Own organization, all features |
| Team Member | team_member | Limited access | Own organization, limited features |

## Multi-Tenant Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPER ADMIN                               │
│                  (Manages all organizations)                    │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  Organization │       │  Organization │       │  Organization │
│      A        │       │      B        │       │      C        │
│  ┌─────────┐  │       │  ┌─────────┐  │       │  ┌─────────┐  │
│  │Users    │  │       │  │Users    │  │       │  │Users    │  │
│  │Campaigns│  │       │  │Campaigns│  │       │  │Campaigns│  │
│  │Leads    │  │       │  │Leads    │  │       │  │Leads    │  │
│  └─────────┘  │       │  └─────────┘  │       │  └─────────┘  │
└───────────────┘       └───────────────┘       └───────────────┘
```

### Data Isolation
- All models include `organization_id` foreign key
- API endpoints filter by organization from JWT token
- No cross-organization data access possible

## API Standards

### RESTful Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/campaigns | List campaigns |
| POST | /api/v1/campaigns | Create campaign |
| GET | /api/v1/campaigns/{id} | Get campaign |
| PUT | /api/v1/campaigns/{id} | Update campaign |
| DELETE | /api/v1/campaigns/{id} | Delete campaign |
| POST | /api/v1/campaigns/{id}/start | Start campaign |
| POST | /api/v1/campaigns/{id}/pause | Pause campaign |
| GET | /api/v1/campaigns/{id}/stats | Get campaign stats |

### Authentication
- Bearer token in Authorization header
- Access token expires in 30 minutes
- Refresh token expires in 7 days

### Pagination
```bash
GET /api/v1/leads?page=1&limit=20
```

### Response Format
```json
{
  "id": 1,
  "name": "Campaign Name",
  "status": "draft",
  ...
}
```

## Polling Architecture

### Frontend Polling (React Query)

```typescript
// Polling intervals in milliseconds
const config = {
  polling: {
    campaigns: 30000,  // 30 seconds
    leads: 15000,      // 15 seconds
    emails: 10000,      // 10 seconds
    tasks: 5000,        // 5 seconds
  }
};
```

### Backend Background Tasks (APScheduler)

```python
# Polling jobs
- check_pending_tasks (every 5 seconds)
- check_campaign_schedules (every 1 minute)
- check_email_statuses (every 2 minutes)
```

### Task Types

| Task Type | Description |
|-----------|-------------|
| send_email | Queue email for sending |
| personalize_content | AI personalization |
| enrich_lead | Data enrichment |
| scrape_data | Web scraping |

## AI Provider Abstraction

### Provider Interface

```python
class AIProvider(ABC):
    @abstractmethod
    async def complete(self, request: AICompletionRequest) -> AICompletionResponse

    @abstractmethod
    async def list_models(self) -> List[str]

    @abstractmethod
    async def health_check(self) -> bool
```

### Ollama Implementation

```python
class OllamaProvider(AIProvider):
    def __init__(self, config: AIProviderConfig):
        self.client = ollama.Client(host=config.base_url)

    async def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        response = self.client.generate(
            model=request.model or self.default_model,
            prompt=request.prompt,
            system=request.system,
            options={"temperature": request.temperature}
        )
        return AICompletionResponse(text=response["response"])
```

### Future Providers

To add OpenAI or Anthropic:
1. Implement `AIProvider` interface
2. Register in `AIManager`
3. Configure via environment variables

## Naming Conventions

### Backend (Python)

| Type | Convention | Example |
|------|------------|---------|
| Files | snake_case | `campaign_service.py` |
| Classes | PascalCase | `CampaignService` |
| Functions | snake_case | `get_campaigns()` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Private | _prefix | `_internal_method()` |

### Frontend (TypeScript)

| Type | Convention | Example |
|------|------------|---------|
| Files | camelCase | `useQueries.ts` |
| Components | PascalCase | `CampaignCard.tsx` |
| Hooks | camelCase (use prefix) | `useCampaigns()` |
| Constants | UPPER_SNAKE_CASE | `API_ENDPOINTS` |
| Types/Interfaces | PascalCase | `CampaignResponse` |

## Environment Variables

### Backend (.env)

```bash
# Application
APP_ENV=development
DEBUG=true
LOG_LEVEL=INFO

# Server
HOST=0.0.0.0
PORT=8000

# Security
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/outflo

# AI
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2

# Scraping
SCRAPE_DELAY_MS=2000
SCRAPE_MAX_CONCURRENT=5

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_POLLING_CAMPAIGNS=30000
NEXT_PUBLIC_POLLING_LEADS=15000
```

## Deployment Options

### Development (Local)

```bash
# Terminal 1: Backend
cd apps/backend
source venv/bin/activate
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd apps/frontend
npm run dev

# Terminal 3: Ollama
ollama serve
```

### Production (VPS)

1. Install dependencies (Python, Node, PostgreSQL, Nginx)
2. Setup database
3. Clone and configure application
4. Run migrations
5. Start with PM2
6. Configure Nginx reverse proxy
7. Optional: SSL with Let's Encrypt

See `scripts/deploy-production.sh` for complete guide.

## Performance Considerations

### Database
- Async SQLAlchemy with connection pooling (20 connections)
- Proper indexing on foreign keys and frequently queried columns
- Pagination for large result sets

### API
- Response compression (gzip)
- Caching headers where appropriate
- Rate limiting on sensitive endpoints

### Background Jobs
- APScheduler for task processing
- Priority-based task queue
- Retry mechanism for failed tasks

### Frontend
- React Query for efficient data fetching
- Polling intervals based on data freshness requirements
- Optimistic updates for better UX

## Security

### Authentication
- JWT tokens with 30-minute expiry
- Refresh tokens with 7-day expiry
- Password hashing with bcrypt

### Authorization
- Role-based access control (RBAC)
- Organization-level data isolation
- API middleware for permission checking

### Audit Logging
- All significant actions logged
- User, IP, timestamp recorded
- Searchable for compliance

## Future Roadmap

- [ ] WebSocket support for real-time updates
- [ ] Redis for caching and pub/sub
- [ ] Celery for heavy background jobs
- [ ] GPT-4 / Claude integration
- [ ] CRM integrations (HubSpot, Salesforce)
- [ ] Email deliverability optimization
- [ ] Advanced analytics and reporting