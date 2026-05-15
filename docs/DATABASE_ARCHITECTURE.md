# Outflo - Complete PostgreSQL Database Architecture

## Overview

Production-grade multi-tenant database design for AI Outreach Automation SaaS platform.

---

## Multi-Tenant Strategy

### Isolation Approach
- **Organization-level isolation**: All user data is scoped to `organization_id`
- **Row-level security**: Every table has `organization_id` foreign key
- **Soft deletes**: `deleted_at` timestamp for data recovery
- **Audit trail**: All operations logged with user and timestamp

### Tenant Filtering Pattern

```sql
-- Every query MUST include organization_id filter
SELECT * FROM leads WHERE organization_id = ? AND deleted_at IS NULL;

-- Use base repository pattern
class BaseRepository:
    async def get_all(self, org_id: int):
        query = select(self.model).where(
            self.model.organization_id == org_id,
            self.model.deleted_at.is_(None)
        )
```

---

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Tables | snake_case (plural) | `user_accounts` |
| Columns | snake_case | `created_at` |
| Primary Keys | `id` | `id INTEGER PRIMARY KEY` |
| Foreign Keys | `{table}_id` | `organization_id` |
| Indexes | `ix_{table}_{columns}` | `ix_users_email_org` |
| Unique Constraints | `uq_{table}_{columns}` | `uq_users_email_org` |
| Timestamps | `{entity}_at` | `created_at`, `updated_at` |
| Soft Delete | `deleted_at` | `deleted_at TIMESTAMP` |

---

## Common Columns (All Tables)

```sql
-- Organization-scoped tables
organization_id  INTEGER NOT NULL REFERENCES organizations(id)
created_at      TIMESTAMP NOT NULL DEFAULT NOW()
updated_at      TIMESTAMP
deleted_at      TIMESTAMP  -- Soft delete

-- User-scoped tables
user_id          INTEGER NOT NULL REFERENCES users(id)
created_at       TIMESTAMP NOT NULL DEFAULT NOW()
```

---

# AUTH MODULE

## 1. organizations

Primary tenant entity.

```sql
CREATE TABLE organizations (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    domain          VARCHAR(255),
    logo_url        VARCHAR(500),
    timezone        VARCHAR(50) DEFAULT 'UTC',
    locale          VARCHAR(10) DEFAULT 'en-US',

    -- Billing
    billing_email   VARCHAR(255),
    billing_address JSONB,

    -- Settings
    settings        JSONB DEFAULT '{}',

    -- Status
    is_active       BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_org_name_length CHECK (LENGTH(name) >= 2)
);

CREATE INDEX ix_organizations_slug ON organizations(slug);
CREATE INDEX ix_organizations_domain ON organizations(domain);
CREATE INDEX ix_organizations_active ON organizations(is_active) WHERE deleted_at IS NULL;
```

## 2. users

```sql
CREATE TABLE users (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    -- Credentials
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255) NOT NULL,

    -- Profile
    full_name           VARCHAR(255) NOT NULL,
    avatar_url           VARCHAR(500),
    phone               VARCHAR(50),

    -- Role
    role                VARCHAR(50) NOT NULL DEFAULT 'team_member',
    is_super_admin      BOOLEAN DEFAULT FALSE,

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    is_email_verified   BOOLEAN DEFAULT FALSE,
    email_verified_at   TIMESTAMP,

    -- Auth
    failed_login_attempts   INTEGER DEFAULT 0,
    locked_until           TIMESTAMP,
    last_login_at          TIMESTAMP,
    last_login_ip          VARCHAR(45),

    -- Preferences
    preferences          JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_user_email_unique UNIQUE (organization_id, email),
    CONSTRAINT chk_user_role CHECK (role IN ('owner', 'admin', 'team_member'))
);

CREATE INDEX ix_users_org ON users(organization_id);
CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_org_email ON users(organization_id, email);
```

## 3. memberships

User-Organization relationship with roles.

```sql
CREATE TABLE memberships (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    -- Role in organization
    role                VARCHAR(50) NOT NULL DEFAULT 'team_member',
    title               VARCHAR(100),

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'active',
    invited_by          INTEGER REFERENCES users(id),
    invited_at          TIMESTAMP,
    accepted_at         TIMESTAMP,

    -- Permissions (JSON for flexibility)
    permissions         JSONB DEFAULT '[]',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_membership_unique UNIQUE (user_id, organization_id),
    CONSTRAINT chk_membership_status CHECK (status IN ('pending', 'active', 'suspended', 'invite_expired'))
);

CREATE INDEX ix_memberships_user ON memberships(user_id);
CREATE INDEX ix_memberships_org ON memberships(organization_id);
CREATE INDEX ix_memberships_status ON memberships(status) WHERE deleted_at IS NULL;
```

## 4. roles

Predefined roles with permissions.

```sql
CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,

    -- Hierarchy
    priority        INTEGER NOT NULL DEFAULT 0,
    is_system       BOOLEAN DEFAULT FALSE,

    -- Permissions
    permissions     JSONB NOT NULL DEFAULT '[]',

    -- Timestamps
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP
);

-- Default roles
INSERT INTO roles (name, description, priority, permissions, is_system) VALUES
('super_admin', 'Full system access', 100, '["*"]', TRUE),
('owner', 'Organization owner', 80, '["org:*", "users:manage", "billing:*"]', TRUE),
('admin', 'Organization admin', 60, '["campaigns:*", "leads:*", "emails:*", "ai:*"]', TRUE),
('team_member', 'Regular user', 20, '["campaigns:read", "leads:*", "emails:read"]', TRUE);
```

## 5. permissions

Granular permission definitions.

```sql
CREATE TABLE permissions (
    id              SERIAL PRIMARY KEY,
    resource        VARCHAR(100) NOT NULL,
    action          VARCHAR(50) NOT NULL,
    description     TEXT,

    -- Constraints
    CONSTRAINT chk_permission_unique UNIQUE (resource, action)
);

-- Default permissions
INSERT INTO permissions (resource, action, description) VALUES
('organizations', 'read', 'View organization'),
('organizations', 'update', 'Update organization'),
('organizations', 'delete', 'Delete organization'),
('users', 'read', 'View users'),
('users', 'create', 'Create users'),
('users', 'update', 'Update users'),
('users', 'delete', 'Delete users'),
('leads', 'read', 'View leads'),
('leads', 'create', 'Create leads'),
('leads', 'update', 'Update leads'),
('leads', 'delete', 'Delete leads'),
('leads', 'import', 'Import leads'),
('leads', 'export', 'Export leads'),
('campaigns', 'read', 'View campaigns'),
('campaigns', 'create', 'Create campaigns'),
('campaigns', 'update', 'Update campaigns'),
('campaigns', 'delete', 'Delete campaigns'),
('campaigns', 'start', 'Start campaigns'),
('campaigns', 'pause', 'Pause campaigns'),
('emails', 'read', 'View emails'),
('emails', 'send', 'Send emails'),
('emails', 'delete', 'Delete emails'),
('ai', 'use', 'Use AI features'),
('ai', 'manage_templates', 'Manage AI templates'),
('billing', 'read', 'View billing'),
('billing', 'manage', 'Manage billing');
```

## 6. sessions

Active user sessions for auth.

```sql
CREATE TABLE sessions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    organization_id INTEGER NOT NULL REFERENCES organizations(id),

    -- Token info
    access_token    VARCHAR(500) NOT NULL,
    refresh_token    VARCHAR(500),
    token_hash       VARCHAR(255) NOT NULL,

    -- Client info
    ip_address      VARCHAR(45),
    user_agent       VARCHAR(500),
    device_type      VARCHAR(50),
    browser          VARCHAR(100),
    os               VARCHAR(100),

    -- Status
    is_active        BOOLEAN DEFAULT TRUE,
    expires_at       TIMESTAMP NOT NULL,
    revoked_at       TIMESTAMP,
    revoked_by       INTEGER REFERENCES users(id),

    -- Timestamps
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_sessions_user ON sessions(user_id);
CREATE INDEX ix_sessions_token ON sessions(token_hash);
CREATE INDEX ix_sessions_expires ON sessions(expires_at) WHERE is_active = TRUE;
```

## 7. login_logs

Authentication audit trail.

```sql
CREATE TABLE login_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id),
    organization_id INTEGER REFERENCES organizations(id),

    -- Login attempt details
    email           VARCHAR(255) NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      VARCHAR(500),

    -- Result
    status          VARCHAR(50) NOT NULL,
    failure_reason   VARCHAR(100),
    error_message   TEXT,

    -- Context
    country         VARCHAR(100),
    city             VARCHAR(100),
    device_type     VARCHAR(50),

    -- Timestamp
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_login_status CHECK (status IN ('success', 'failed', 'locked', 'mfa_required'))
);

CREATE INDEX ix_login_logs_user ON login_logs(user_id);
CREATE INDEX ix_login_logs_created ON login_logs(created_at);
CREATE INDEX ix_login_logs_ip ON login_logs(ip_address);
```

---

# SUBSCRIPTIONS MODULE

## 8. plans

Subscription plans.

```sql
CREATE TABLE plans (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,

    -- Pricing
    price_monthly   DECIMAL(10, 2) NOT NULL,
    price_yearly    DECIMAL(10, 2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'USD',

    -- Limits
    max_users           INTEGER NOT NULL,
    max_leads           INTEGER NOT NULL,
    max_campaigns       INTEGER NOT NULL,
    max_emails_per_day  INTEGER NOT NULL,
    max_ai_generations  INTEGER NOT NULL,
    max_storage_gb      INTEGER NOT NULL,

    -- Features
    features            JSONB DEFAULT '[]',
    included_tools      JSONB DEFAULT '[]',

    -- Limits configuration
    limits              JSONB DEFAULT '{}',

    -- Status
    is_active       BOOLEAN DEFAULT TRUE,
    is_public       BOOLEAN DEFAULT TRUE,
    trial_days      INTEGER DEFAULT 0,

    -- Timestamps
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP
);
```

## 9. subscriptions

Organization subscriptions.

```sql
CREATE TABLE subscriptions (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    plan_id             INTEGER NOT NULL REFERENCES plans(id),

    -- Subscription details
    status              VARCHAR(50) NOT NULL DEFAULT 'trial',
    billing_cycle       VARCHAR(20) NOT NULL DEFAULT 'monthly',

    -- Pricing at time of subscription
    price_amount        DECIMAL(10, 2) NOT NULL,
    price_currency      VARCHAR(3) DEFAULT 'USD',

    -- Dates
    trial_starts_at     TIMESTAMP,
    trial_ends_at       TIMESTAMP,
    starts_at           TIMESTAMP,
    ends_at             TIMESTAMP,
    cancelled_at        TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    -- External references
    external_id         VARCHAR(255),
    external_data       JSONB,

    -- Payment
    payment_method      VARCHAR(50),
    card_last4          VARCHAR(4),

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_subscription_status CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'paused')),
    CONSTRAINT chk_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly'))
);

CREATE INDEX ix_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX ix_subscriptions_status ON subscriptions(status) WHERE deleted_at IS NULL;
```

## 10. invoices

Billing invoices.

```sql
CREATE TABLE invoices (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    subscription_id    INTEGER REFERENCES subscriptions(id),
    user_id             INTEGER REFERENCES users(id),

    -- Invoice details
    number              VARCHAR(50) NOT NULL UNIQUE,
    type                VARCHAR(50) NOT NULL,

    -- Amounts
    subtotal            DECIMAL(10, 2) NOT NULL,
    tax                 DECIMAL(10, 2) DEFAULT 0,
    discount            DECIMAL(10, 2) DEFAULT 0,
    total               DECIMAL(10, 2) NOT NULL,
    currency            VARCHAR(3) DEFAULT 'USD',
    paid_amount         DECIMAL(10, 2) DEFAULT 0,

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'draft',

    -- Dates
    period_start        TIMESTAMP NOT NULL,
    period_end          TIMESTAMP NOT NULL,
    due_date            TIMESTAMP,
    paid_at             TIMESTAMP,
    voided_at           TIMESTAMP,

    -- External
    external_id         VARCHAR(255),
    stripe_invoice_id   VARCHAR(255),

    -- Line items
    line_items          JSONB DEFAULT '[]',

    -- Billing address
    billing_address     JSONB,

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_invoice_status CHECK (status IN ('draft', 'pending', 'paid', 'void', 'uncollectible'))
);

CREATE INDEX ix_invoices_org ON invoices(organization_id);
CREATE INDEX ix_invoices_status ON invoices(status);
CREATE INDEX ix_invoices_number ON invoices(number);
```

## 11. usage_tracking

Resource usage tracking.

```sql
CREATE TABLE usage_tracking (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    subscription_id      INTEGER REFERENCES subscriptions(id),

    -- Resource tracking
    resource             VARCHAR(100) NOT NULL,
    action               VARCHAR(100) NOT NULL,

    -- Usage
    quantity             INTEGER NOT NULL DEFAULT 1,
    unit                 VARCHAR(50),

    -- Period
    period_start         DATE NOT NULL,
    period_end           DATE NOT NULL,

    -- Cost
    cost                 DECIMAL(10, 2) DEFAULT 0,

    -- Metadata
    metadata             JSONB DEFAULT '{}',

    -- Timestamp
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_usage_period CHECK (period_end > period_start)
);

CREATE INDEX ix_usage_org_period ON usage_tracking(organization_id, period_start);
CREATE INDEX ix_usage_resource ON usage_tracking(resource, period_start);
```

---

# LEADS MODULE

## 12. leads

Contact/prospect records.

```sql
CREATE TABLE leads (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    created_by          INTEGER REFERENCES users(id),

    -- Contact info
    email               VARCHAR(255) NOT NULL,
    first_name          VARCHAR(100),
    last_name           VARCHAR(100),
    phone               VARCHAR(50),
    mobile              VARCHAR(50),

    -- Company info
    company_name        VARCHAR(255),
    company_domain      VARCHAR(255),
    company_size        VARCHAR(50),
    company_industry    VARCHAR(100),
    company_revenue     VARCHAR(100),

    -- Professional
    job_title           VARCHAR(255),
    department          VARCHAR(100),
    seniority_level     VARCHAR(50),
    function            VARCHAR(100),

    -- Location
    city                VARCHAR(100),
    state               VARCHAR(100),
    country             VARCHAR(100),
    postal_code         VARCHAR(20),
    timezone            VARCHAR(50),
    address             TEXT,

    -- LinkedIn
    linkedin_url         VARCHAR(500),
    linkedin_id          VARCHAR(100),

    -- Source
    source              VARCHAR(100),
    source_details      JSONB,

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'new',
    temperature         VARCHAR(50),
    score               INTEGER DEFAULT 0,

    -- Data quality
    is_valid_email      BOOLEAN DEFAULT TRUE,
    is_verified         BOOLEAN DEFAULT FALSE,
    verification_data   JSONB,

    -- Enrichment
    enriched_data       JSONB,
    enrichment_status   VARCHAR(50),
    enriched_at         TIMESTAMP,
    enrichment_sources  JSONB DEFAULT '[]',

    -- Custom fields
    custom_fields       JSONB DEFAULT '{}',

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    -- Soft delete index
    CONSTRAINT chk_lead_email_unique UNIQUE (organization_id, email),
    CONSTRAINT chk_lead_status CHECK (status IN ('new', 'contacted', 'qualified', 'unqualified', 'customer', 'churned'))
);

CREATE INDEX ix_leads_org ON leads(organization_id);
CREATE INDEX ix_leads_email ON leads(email);
CREATE INDEX ix_leads_org_email ON leads(organization_id, email);
CREATE INDEX ix_leads_company ON leads(company_domain) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_created ON leads(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_score ON leads(score DESC) WHERE deleted_at IS NULL;
```

## 13. lead_sources

Lead source definitions.

```sql
CREATE TABLE lead_sources (
    id              SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),

    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    description     TEXT,
    color           VARCHAR(7),

    -- Tracking
    utm_source      VARCHAR(100),
    utm_medium      VARCHAR(100),
    utm_campaign    VARCHAR(100),

    -- Status
    is_active       BOOLEAN DEFAULT TRUE,

    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,

    CONSTRAINT chk_lead_source_unique UNIQUE (organization_id, slug)
);
```

## 14. lead_tags

Tags for lead categorization.

```sql
CREATE TABLE lead_tags (
    id              SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),

    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    color           VARCHAR(7),
    type            VARCHAR(50),

    is_active       BOOLEAN DEFAULT TRUE,

    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    deleted_at      TIMESTAMP,

    CONSTRAINT chk_lead_tag_unique UNIQUE (organization_id, slug)
);

CREATE TABLE lead_tag_assignments (
    id              SERIAL PRIMARY KEY,
    lead_id         INTEGER NOT NULL REFERENCES leads(id),
    tag_id          INTEGER NOT NULL REFERENCES lead_tags(id),

    assigned_by     INTEGER REFERENCES users(id),
    assigned_at     TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_lead_tag_assignment_unique UNIQUE (lead_id, tag_id)
);

CREATE INDEX ix_lead_tag_assignments_lead ON lead_tag_assignments(lead_id);
CREATE INDEX ix_lead_tag_assignments_tag ON lead_tag_assignments(tag_id);
```

## 15. lead_activity

Activity tracking for leads.

```sql
CREATE TABLE lead_activity (
    id                  SERIAL PRIMARY KEY,
    lead_id             INTEGER NOT NULL REFERENCES leads(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Activity details
    activity_type       VARCHAR(100) NOT NULL,
    title               VARCHAR(255),
    description         TEXT,

    -- Related entities
    related_type        VARCHAR(100),
    related_id          INTEGER,

    -- Email tracking
    email_id            INTEGER REFERENCES email_messages(id),
    campaign_id         INTEGER REFERENCES campaigns(id),

    -- Data
    metadata            JSONB DEFAULT '{}',

    -- Timestamp
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_activity_type CHECK (activity_type IN (
        'created', 'updated', 'email_sent', 'email_opened', 'email_clicked',
        'email_replied', 'email_bounced', 'called', 'messaged', 'note_added',
        'stage_changed', 'assigned', 'enriched', 'imported', 'exported'
    ))
);

CREATE INDEX ix_lead_activity_lead ON lead_activity(lead_id);
CREATE INDEX ix_lead_activity_type ON lead_activity(activity_type);
CREATE INDEX ix_lead_activity_created ON lead_activity(created_at DESC);
```

## 16. lead_enrichment

Enrichment job tracking.

```sql
CREATE TABLE lead_enrichment (
    id                  SERIAL PRIMARY KEY,
    lead_id             INTEGER NOT NULL REFERENCES leads(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Enrichment details
    provider            VARCHAR(100) NOT NULL,
    fields_requested    JSONB NOT NULL,
    fields_returned     JSONB,

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
    credits_used        DECIMAL(10, 2) DEFAULT 0,

    -- Results
    data_found          BOOLEAN DEFAULT FALSE,
    enrichment_data     JSONB,

    -- Errors
    error_message       TEXT,
    retry_count         INTEGER DEFAULT 0,

    -- Timestamps
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_enrichment_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'partial'))
);

CREATE INDEX ix_lead_enrichment_lead ON lead_enrichment(lead_id);
CREATE INDEX ix_lead_enrichment_status ON lead_enrichment(status);
```

---

# SCRAPING MODULE

## 17. scrape_jobs

Scraping job definitions.

```sql
CREATE TABLE scrape_jobs (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    created_by          INTEGER REFERENCES users(id),

    -- Job details
    name                VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Source
    source_type         VARCHAR(100) NOT NULL,
    source_url          VARCHAR(1000),
    source_config       JSONB,

    -- Configuration
    config              JSONB DEFAULT '{}',
    selectors           JSONB,

    -- Rate limiting
    rate_limit          INTEGER DEFAULT 10,
    max_pages           INTEGER DEFAULT 100,

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
    progress            INTEGER DEFAULT 0,

    -- Results summary
    total_found         INTEGER DEFAULT 0,
    emails_found        INTEGER DEFAULT 0,
    leads_created       INTEGER DEFAULT 0,

    -- Scheduling
    schedule_type       VARCHAR(50),
    cron_expression     VARCHAR(100),
    next_run_at         TIMESTAMP,

    -- Errors
    error_count         INTEGER DEFAULT 0,
    last_error          TEXT,

    -- Timestamps
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_scrape_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'))
);

CREATE INDEX ix_scrape_jobs_org ON scrape_jobs(organization_id);
CREATE INDEX ix_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX ix_scrape_jobs_schedule ON scrape_jobs(next_run_at) WHERE schedule_type IS NOT NULL;
```

## 18. scrape_results

Scraped data results.

```sql
CREATE TABLE scrape_results (
    id                  SERIAL PRIMARY PRIMARY KEY,
    job_id              INTEGER NOT NULL REFERENCES scrape_jobs(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    -- Source data
    url                 VARCHAR(1000) NOT NULL,
    page_title          VARCHAR(500),
    page_html           TEXT,

    -- Extracted data
    emails              JSONB DEFAULT '[]',
    phones              JSONB DEFAULT '[]',
    social_links        JSONB,
    company_data        JSONB,

    -- Lead creation
    lead_id             INTEGER REFERENCES leads(id),
    was_converted       BOOLEAN DEFAULT FALSE,

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- Data quality
    confidence_score    DECIMAL(5, 2),
    data_quality        JSONB,

    -- Timestamps
    scraped_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at        TIMESTAMP,

    -- Constraints
    CONSTRAINT chk_scrape_result_status CHECK (status IN ('pending', 'processed', 'converted', 'failed', 'duplicate'))
);

CREATE INDEX ix_scrape_results_job ON scrape_results(job_id);
CREATE INDEX ix_scrape_results_org ON scrape_results(organization_id);
CREATE INDEX ix_scrape_results_url ON scrape_results(url);
```

## 19. crawl_logs

Crawling activity logs.

```sql
CREATE TABLE crawl_logs (
    id                  SERIAL PRIMARY KEY,
    job_id              INTEGER REFERENCES scrape_jobs(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    -- Crawl details
    url                 VARCHAR(1000) NOT NULL,
    depth               INTEGER DEFAULT 0,

    -- HTTP details
    http_status         INTEGER,
    response_time_ms    INTEGER,
    content_type        VARCHAR(100),

    -- Parsing
    parse_status        VARCHAR(50),
    items_extracted     INTEGER DEFAULT 0,

    -- Links found
    links_found         INTEGER DEFAULT 0,
    links_followed      INTEGER DEFAULT 0,

    -- Data
    metadata            JSONB DEFAULT '{}',

    -- Timestamp
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_crawl_status CHECK (parse_status IN ('success', 'failed', 'skipped', 'duplicate'))
);

CREATE INDEX ix_crawl_logs_job ON crawl_logs(job_id);
CREATE INDEX ix_crawl_logs_created ON crawl_logs(created_at);
```

## 20. crawl_failures

Failed crawl attempts.

```sql
CREATE TABLE crawl_failures (
    id                  SERIAL PRIMARY KEY,
    job_id              INTEGER NOT NULL REFERENCES scrape_jobs(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    -- Failed URL
    url                 VARCHAR(1000) NOT NULL,
    depth               INTEGER DEFAULT 0,

    -- Error details
    error_type          VARCHAR(100) NOT NULL,
    error_message       TEXT,
    http_status         INTEGER,

    -- Retry tracking
    retry_count         INTEGER DEFAULT 0,
    max_retries         INTEGER DEFAULT 3,
    next_retry_at       TIMESTAMP,

    -- Last attempt
    last_attempt_at     TIMESTAMP,
    resolved            BOOLEAN DEFAULT FALSE,
    resolved_at         TIMESTAMP,

    -- Timestamp
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_crawl_failures_job ON crawl_failures(job_id);
CREATE INDEX ix_crawl_failures_retry ON crawl_failures(next_retry_at) WHERE resolved = FALSE;
```

---

# EMAIL MODULE

## 21. inboxes

Email inbox configurations.

```sql
CREATE TABLE inboxes (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    created_by          INTEGER REFERENCES users(id),

    -- Email config
    email               VARCHAR(255) NOT NULL,
    display_name        VARCHAR(255),
    alias               VARCHAR(255),

    -- Provider
    provider            VARCHAR(100),
    provider_config     JSONB,

    -- SMTP
    smtp_host           VARCHAR(255),
    smtp_port           INTEGER,
    smtp_user           VARCHAR(255),
    smtp_password_enc   TEXT,
    smtp_use_tls        BOOLEAN DEFAULT TRUE,

    -- IMAP (for replies)
    imap_host           VARCHAR(255),
    imap_port           INTEGER,
    imap_user           VARCHAR(255),
    imap_password_enc   TEXT,
    imap_use_ssl        BOOLEAN DEFAULT TRUE,
    imap_folder         VARCHAR(100) DEFAULT 'INBOX',

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    is_verified         BOOLEAN DEFAULT FALSE,
    verified_at         TIMESTAMP,

    -- Daily limits
    daily_limit         INTEGER DEFAULT 500,
    daily_used          INTEGER DEFAULT 0,
    last_reset_at       TIMESTAMP,

    -- Signature
    signature           TEXT,

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_inbox_email_unique UNIQUE (organization_id, email)
);

CREATE INDEX ix_inboxes_org ON inboxes(organization_id);
CREATE INDEX ix_inboxes_email ON inboxes(email);
```

## 22. smtp_configs

SMTP configuration templates.

```sql
CREATE TABLE smtp_configs (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    name                VARCHAR(100) NOT NULL,
    provider            VARCHAR(100),

    -- SMTP settings
    host                VARCHAR(255) NOT NULL,
    port                INTEGER NOT NULL DEFAULT 587,
    use_tls             BOOLEAN DEFAULT TRUE,
    use_ssl             BOOLEAN DEFAULT FALSE,
    username            VARCHAR(255),
    password_enc        TEXT,

    -- Limits
    daily_limit         INTEGER DEFAULT 1000,
    rate_per_minute     INTEGER DEFAULT 60,

    -- Warmup
    warmup_enabled      BOOLEAN DEFAULT FALSE,
    warmup_daily_limit  INTEGER DEFAULT 20,

    is_active           BOOLEAN DEFAULT TRUE,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);
```

## 23. campaigns

Outreach campaigns.

```sql
CREATE TABLE campaigns (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    created_by          INTEGER REFERENCES users(id),
    inbox_id            INTEGER REFERENCES inboxes(id),

    -- Campaign info
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    subject             VARCHAR(500),

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'draft',

    -- Configuration
    config              JSONB DEFAULT '{}',

    -- Targeting
    target_criteria     JSONB,
    exclude_criteria     JSONB,

    -- Limits
    daily_limit         INTEGER,
    max_emails          INTEGER,

    -- Scheduling
    schedule_type       VARCHAR(50) DEFAULT 'immediate',
    schedule_date       TIMESTAMP,
    timezone            VARCHAR(50) DEFAULT 'UTC',

    -- Performance
    total_recipients    INTEGER DEFAULT 0,
    emails_sent         INTEGER DEFAULT 0,
    emails_delivered    INTEGER DEFAULT 0,
    emails_opened       INTEGER DEFAULT 0,
    emails_clicked      INTEGER DEFAULT 0,
    emails_replied      INTEGER DEFAULT 0,
    emails_bounced      INTEGER DEFAULT 0,
    emails_failed       INTEGER DEFAULT 0,

    -- Calculated rates
    open_rate           DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN emails_delivered > 0
        THEN (emails_opened::DECIMAL / emails_delivered * 100)
        ELSE 0 END
    ) STORED,

    reply_rate          DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN emails_delivered > 0
        THEN (emails_replied::DECIMAL / emails_delivered * 100)
        ELSE 0 END
    ) STORED,

    -- Dates
    started_at          TIMESTAMP,
    completed_at        TIMESTAMP,
    next_run_at         TIMESTAMP,

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_campaign_status CHECK (status IN (
        'draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'
    ))
);

CREATE INDEX ix_campaigns_org ON campaigns(organization_id);
CREATE INDEX ix_campaigns_status ON campaigns(status) WHERE deleted_at IS NULL;
CREATE INDEX ix_campaigns_schedule ON campaigns(schedule_date) WHERE status = 'scheduled';
```

## 24. campaign_sequences

Email sequences within campaigns.

```sql
CREATE TABLE campaign_sequences (
    id                  SERIAL PRIMARY KEY,
    campaign_id         INTEGER NOT NULL REFERENCES campaigns(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    name                VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Enrollment
    enrollment_type     VARCHAR(50) DEFAULT 'all',
    trigger_action      VARCHAR(100),

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,

    -- Settings
    settings            JSONB DEFAULT '{}',

    -- Stats
    total_enrolled      INTEGER DEFAULT 0,
    active_enrolled     INTEGER DEFAULT 0,
    completed           INTEGER DEFAULT 0,
    stopped             INTEGER DEFAULT 0,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX ix_campaign_sequences_campaign ON campaign_sequences(campaign_id);
```

## 25. campaign_steps

Individual steps in a sequence.

```sql
CREATE TABLE campaign_steps (
    id                  SERIAL PRIMARY KEY,
    sequence_id         INTEGER NOT NULL REFERENCES campaign_sequences(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    step_number         INTEGER NOT NULL,

    -- Email content
    subject             VARCHAR(500) NOT NULL,
    body_template       TEXT NOT NULL,
    body_html           TEXT,

    -- Personalization
    is_ai_personalized  BOOLEAN DEFAULT FALSE,
    ai_prompt_id        INTEGER REFERENCES ai_prompts(id),

    -- Timing
    delay_days          INTEGER DEFAULT 0,
    delay_hours          INTEGER DEFAULT 0,
    send_time_type      VARCHAR(50) DEFAULT 'immediate',
    preferred_time      TIME,
    preferred_days      JSONB DEFAULT '[1,2,3,4,5]',

    -- Conditions
    conditions          JSONB,
    skip_conditions     JSONB,

    -- Tracking
    trigger_type        VARCHAR(50) DEFAULT 'delay',
    trigger_value       VARCHAR(255),

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    is_variant          BOOLEAN DEFAULT FALSE,
    variant_weight      INTEGER DEFAULT 100,

    -- Stats
    emails_sent         INTEGER DEFAULT 0,
    emails_opened       INTEGER DEFAULT 0,
    emails_clicked      INTEGER DEFAULT 0,
    emails_replied      INTEGER DEFAULT 0,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_step_number_unique UNIQUE (sequence_id, step_number)
);
```

## 26. email_messages

All email messages.

```sql
CREATE TABLE email_messages (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    inbox_id            INTEGER NOT NULL REFERENCES inboxes(id),
    campaign_id         INTEGER REFERENCES campaigns(id),
    sequence_id         INTEGER REFERENCES campaign_sequences(id),
    step_id             INTEGER REFERENCES campaign_steps(id),
    lead_id             INTEGER REFERENCES leads(id),
    user_id             INTEGER REFERENCES users(id),

    -- Recipients
    from_email          VARCHAR(255) NOT NULL,
    from_name           VARCHAR(255),
    to_email            VARCHAR(255) NOT NULL,
    to_name             VARCHAR(255),

    -- Content
    subject             VARCHAR(500) NOT NULL,
    body_text           TEXT,
    body_html           TEXT,
    body_preview        TEXT,

    -- Tracking
    message_id          VARCHAR(255) NOT NULL,
    thread_id           VARCHAR(255),
    in_reply_to         VARCHAR(255),
    references          JSONB,

    -- Status
    direction           VARCHAR(20) NOT NULL DEFAULT 'outbound',
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- Send attempt
    scheduled_at        TIMESTAMP,
    sent_at             TIMESTAMP,
    delivered_at        TIMESTAMP,

    -- Tracking events
    opened_at           TIMESTAMP,
    first_opened_at     TIMESTAMP,
    open_count          INTEGER DEFAULT 0,

    clicked_at          TIMESTAMP,
    first_clicked_at    TIMESTAMP,
    click_count         INTEGER DEFAULT 0,

    replied_at          TIMESTAMP,
    first_reply_at      TIMESTAMP,
    reply_count         INTEGER DEFAULT 0,

    bounced_at          TIMESTAMP,
    bounced_reason      VARCHAR(255),

    failed_at           TIMESTAMP,
    failure_reason      TEXT,

    -- AI
    is_ai_personalized  BOOLEAN DEFAULT FALSE,
    ai_prompt_id        INTEGER REFERENCES ai_prompts(id),
    ai_version          VARCHAR(50),

    -- Personalization data
    personalization_data JSONB,

    -- Headers
    headers             JSONB,

    -- Attachments
    attachments         JSONB DEFAULT '[]',

    -- Metrics
    metadata            JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_email_direction CHECK (direction IN ('outbound', 'inbound')),
    CONSTRAINT chk_email_status CHECK (status IN (
        'pending', 'scheduled', 'sending', 'sent', 'delivered',
        'opened', 'clicked', 'replied', 'bounced', 'failed', 'cancelled'
    ))
);

CREATE INDEX ix_email_messages_org ON email_messages(organization_id);
CREATE INDEX ix_email_messages_lead ON email_messages(lead_id);
CREATE INDEX ix_email_messages_campaign ON email_messages(campaign_id);
CREATE INDEX ix_email_messages_status ON email_messages(status) WHERE deleted_at IS NULL;
CREATE INDEX ix_email_messages_sent ON email_messages(sent_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ix_email_messages_to ON email_messages(to_email);
```

## 27. email_opens

Email open tracking.

```sql
CREATE TABLE email_opens (
    id                  SERIAL PRIMARY KEY,
    email_id            INTEGER NOT NULL REFERENCES email_messages(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    lead_id             INTEGER REFERENCES leads(id),

    -- Client info
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(500),
    device_type         VARCHAR(50),
    browser             VARCHAR(100),
    os                  VARCHAR(100),

    -- Location
    country             VARCHAR(100),
    city                VARCHAR(100),
    region              VARCHAR(100),
    latitude            DECIMAL(10, 6),
    longitude           DECIMAL(10, 6),

    -- Timing
    opened_at           TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Link tracking
    link_url            VARCHAR(1000),
    link_position       VARCHAR(50),

    UNIQUE (email_id, opened_at, ip_address)
);

CREATE INDEX ix_email_opens_email ON email_opens(email_id);
CREATE INDEX ix_email_opens_lead ON email_opens(lead_id);
```

## 28. email_replies

Email reply tracking.

```sql
CREATE TABLE email_replies (
    id                  SERIAL PRIMARY KEY,
    email_id            INTEGER NOT NULL REFERENCES email_messages(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    lead_id             INTEGER REFERENCES leads(id),
    inbox_id            INTEGER REFERENCES inboxes(id),

    -- Reply content
    subject             VARCHAR(500),
    body_text           TEXT,
    body_html           TEXT,

    -- Reply message ID
    message_id          VARCHAR(255) NOT NULL,
    in_reply_to         VARCHAR(255),

    -- Classification
    intent              VARCHAR(50),
    sentiment           VARCHAR(50),
    is_auto_reply       BOOLEAN DEFAULT FALSE,

    -- Status
    status              VARCHAR(50) DEFAULT 'new',

    -- Processing
    processed           BOOLEAN DEFAULT FALSE,
    processed_at        TIMESTAMP,
    action_taken        VARCHAR(100),

    -- Timestamps
    received_at         TIMESTAMP NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_email_replies_email ON email_replies(email_id);
CREATE INDEX ix_email_replies_status ON email_replies(status) WHERE deleted_at IS NULL;
```

## 29. email_bounces

Email bounce tracking.

```sql
CREATE TABLE email_bounces (
    id                  SERIAL PRIMARY KEY,
    email_id            INTEGER REFERENCES email_messages(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    lead_id             INTEGER REFERENCES leads(id),
    inbox_id            INTEGER REFERENCES inboxes(id),

    -- Bounce details
    bounce_type         VARCHAR(50) NOT NULL,
    bounce_subtype      VARCHAR(50),
    status_code         VARCHAR(20),

    -- Hard/soft
    is_hard             BOOLEAN DEFAULT FALSE,
    is_soft             BOOLEAN DEFAULT FALSE,

    -- Details
    diagnostic_code     VARCHAR(255),
    bounced_message     TEXT,

    -- Impact
    affected_recipient  VARCHAR(255),
    action              VARCHAR(50),

    -- Timestamp
    bounced_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_bounce_type CHECK (bounce_type IN ('hard', 'soft', 'challenge', 'compliance'))
);

CREATE INDEX ix_email_bounces_lead ON email_bounces(lead_id);
CREATE INDEX ix_email_bounces_type ON email_bounces(bounce_type);
```

---

# AI MODULE

## 30. ai_generations

AI generation records.

```sql
CREATE TABLE ai_generations (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Model info
    provider            VARCHAR(100) NOT NULL,
    model               VARCHAR(100) NOT NULL,

    -- Request
    prompt              TEXT NOT NULL,
    system_prompt       TEXT,
    temperature         DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens          INTEGER DEFAULT 500,

    -- Response
    response            TEXT,
    finish_reason       VARCHAR(50),

    -- Usage
    input_tokens        INTEGER DEFAULT 0,
    output_tokens        INTEGER DEFAULT 0,
    total_tokens        INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- Cost
    cost                DECIMAL(10, 4) DEFAULT 0,
    cost_currency       VARCHAR(3) DEFAULT 'USD',

    -- Context
    context_type        VARCHAR(100),
    context_id          INTEGER,
    template_id         INTEGER REFERENCES ai_templates(id),

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'success',

    -- Error
    error_message       TEXT,

    -- Latency
    latency_ms           INTEGER,

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ai_generations_org ON ai_generations(organization_id);
CREATE INDEX ix_ai_generations_model ON ai_generations(model);
CREATE INDEX ix_ai_generations_created ON ai_generations(created_at DESC);
```

## 31. ai_prompts

AI prompt templates.

```sql
CREATE TABLE ai_prompts (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    created_by          INTEGER REFERENCES users(id),

    name                VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Prompt type
    type                VARCHAR(100) NOT NULL,
    category            VARCHAR(100),

    -- Templates
    system_prompt       TEXT,
    user_prompt_template TEXT NOT NULL,
    output_format       VARCHAR(50) DEFAULT 'text',

    -- Parameters
    parameters          JSONB DEFAULT '[]',
    required_variables   JSONB DEFAULT '[]',

    -- AI settings
    model               VARCHAR(100),
    temperature         DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens          INTEGER DEFAULT 500,

    -- Versioning
    version             INTEGER DEFAULT 1,
    is_latest           BOOLEAN DEFAULT TRUE,
    previous_version_id INTEGER REFERENCES ai_prompts(id),

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    is_public           BOOLEAN DEFAULT FALSE,

    -- Usage stats
    times_used          INTEGER DEFAULT 0,
    avg_latency_ms      INTEGER,
    success_rate        DECIMAL(5, 2),

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX ix_ai_prompts_org ON ai_prompts(organization_id);
CREATE INDEX ix_ai_prompts_type ON ai_prompts(type);
CREATE INDEX ix_ai_prompts_active ON ai_prompts(is_active) WHERE deleted_at IS NULL;
```

## 32. ai_templates

AI template configurations.

```sql
CREATE TABLE ai_templates (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    created_by          INTEGER REFERENCES users(id),

    name                VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Template type
    type                VARCHAR(100) NOT NULL,
    use_case            VARCHAR(100),

    -- Configuration
    config              JSONB NOT NULL DEFAULT '{}',

    -- Model settings
    provider            VARCHAR(100) DEFAULT 'ollama',
    model               VARCHAR(100) DEFAULT 'llama3.2',
    temperature         DECIMAL(3, 2) DEFAULT 0.7,
    max_tokens          INTEGER DEFAULT 500,

    -- Prompt
    system_prompt       TEXT,
    user_prompt         TEXT,

    -- Output
    output_type         VARCHAR(50) DEFAULT 'text',
    output_schema       JSONB,

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    is_public           BOOLEAN DEFAULT FALSE,

    -- Usage
    times_used          INTEGER DEFAULT 0,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX ix_ai_templates_org ON ai_templates(organization_id);
CREATE INDEX ix_ai_templates_type ON ai_templates(type);
```

## 33. ai_usage_logs

AI usage and cost tracking.

```sql
CREATE TABLE ai_usage_logs (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),
    subscription_id     INTEGER REFERENCES subscriptions(id),

    -- Usage details
    provider            VARCHAR(100) NOT NULL,
    model               VARCHAR(100) NOT NULL,

    -- Tokens
    input_tokens        INTEGER DEFAULT 0,
    output_tokens        INTEGER DEFAULT 0,
    total_tokens        INTEGER DEFAULT 0,

    -- Cost
    cost                DECIMAL(10, 4) DEFAULT 0,
    cost_currency       VARCHAR(3) DEFAULT 'USD',

    -- Request type
    request_type        VARCHAR(100),

    -- Period (for billing)
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_ai_usage_org_period ON ai_usage_logs(organization_id, period_start);
CREATE INDEX ix_ai_usage_model ON ai_usage_logs(provider, model);
```

---

# CRM MODULE

## 34. pipelines

Sales pipelines.

```sql
CREATE TABLE pipelines (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    created_by          INTEGER REFERENCES users(id),

    name                VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Settings
    is_default          BOOLEAN DEFAULT FALSE,
    is_active           BOOLEAN DEFAULT TRUE,

    -- Appearance
    color               VARCHAR(7),
    icon                VARCHAR(50),

    -- Configuration
    config              JSONB DEFAULT '{}',

    -- Stats
    total_deals         INTEGER DEFAULT 0,
    total_value         DECIMAL(15, 2) DEFAULT 0,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX ix_pipelines_org ON pipelines(organization_id);
```

## 35. stages

Pipeline stages.

```sql
CREATE TABLE stages (
    id                  SERIAL PRIMARY KEY,
    pipeline_id         INTEGER NOT NULL REFERENCES pipelines(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    name                VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Position
    position            INTEGER NOT NULL,
    color               VARCHAR(7),

    -- Probabilities
    probability         INTEGER DEFAULT 0,

    -- Criteria
    entry_criteria      JSONB,
    exit_criteria       JSONB,

    -- Automation
    automation_rules    JSONB DEFAULT '[]',

    -- Stats
    deals_count         INTEGER DEFAULT 0,
    deals_value         DECIMAL(15, 2) DEFAULT 0,
    avg_time_in_stage   INTEGER,

    -- Flags
    is_final            BOOLEAN DEFAULT FALSE,
    is_lost             BOOLEAN DEFAULT FALSE,
    is_won              BOOLEAN DEFAULT FALSE,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_stage_position_unique UNIQUE (pipeline_id, position)
);
```

## 36. deals

Deal/opportunity records.

```sql
CREATE TABLE deals (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    pipeline_id         INTEGER NOT NULL REFERENCES pipelines(id),
    stage_id            INTEGER NOT NULL REFERENCES stages(id),
    lead_id             INTEGER REFERENCES leads(id),
    assigned_to         INTEGER REFERENCES users(id),
    created_by          INTEGER REFERENCES users(id),

    name                VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Value
    value               DECIMAL(15, 2) DEFAULT 0,
    currency            VARCHAR(3) DEFAULT 'USD',

    -- Probability
    probability          INTEGER,
    expected_close_date  DATE,

    -- Dates
    last_stage_change_at TIMESTAMP,
    closed_at           TIMESTAMP,
    closed_reason       VARCHAR(100),

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'open',
    lost_reason         TEXT,

    -- Custom fields
    custom_fields       JSONB DEFAULT '{}',

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_deal_status CHECK (status IN ('open', 'won', 'lost', 'cancelled'))
);

CREATE INDEX ix_deals_org ON deals(organization_id);
CREATE INDEX ix_deals_pipeline ON deals(pipeline_id);
CREATE INDEX ix_deals_stage ON deals(stage_id);
CREATE INDEX ix_deals_status ON deals(status) WHERE deleted_at IS NULL;
CREATE INDEX ix_deals_value ON deals(value DESC) WHERE deleted_at IS NULL;
```

## 37. tasks

Deal and CRM tasks.

```sql
CREATE TABLE tasks (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    deal_id             INTEGER REFERENCES deals(id),
    lead_id             INTEGER REFERENCES leads(id),
    assigned_to         INTEGER REFERENCES users(id),
    created_by          INTEGER REFERENCES users(id),

    title               VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Task type
    type                VARCHAR(100),
    category            VARCHAR(100),

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
    priority            VARCHAR(50) DEFAULT 'medium',

    -- Due date
    due_date            TIMESTAMP,
    due_time            TIME,
    reminder_at         TIMESTAMP,
    reminder_sent       BOOLEAN DEFAULT FALSE,

    -- Time tracking
    estimated_hours     DECIMAL(5, 2),
    actual_hours        DECIMAL(5, 2),

    -- Completion
    completed_at        TIMESTAMP,
    completion_notes    TEXT,

    -- Recurrence
    is_recurring        BOOLEAN DEFAULT FALSE,
    recurrence_rule     VARCHAR(255),
    next_recurrence_at  TIMESTAMP,

    -- Custom fields
    custom_fields       JSONB DEFAULT '{}',

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX ix_tasks_org ON tasks(organization_id);
CREATE INDEX ix_tasks_deal ON tasks(deal_id);
CREATE INDEX ix_tasks_assigned ON tasks(assigned_to);
CREATE INDEX ix_tasks_due ON tasks(due_date) WHERE status != 'completed';
```

## 38. notes

Notes on deals and leads.

```sql
CREATE TABLE notes (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER NOT NULL REFERENCES users(id),
    lead_id             INTEGER REFERENCES leads(id),
    deal_id             INTEGER REFERENCES deals(id),

    content             TEXT NOT NULL,

    -- Type
    type                VARCHAR(100) DEFAULT 'note',
    is_private          BOOLEAN DEFAULT FALSE,

    -- Attachments
    attachments         JSONB DEFAULT '[]',

    -- Mentions
    mentions            JSONB DEFAULT '[]',

    -- Reactions
    reactions           JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX ix_notes_org ON notes(organization_id);
CREATE INDEX ix_notes_lead ON notes(lead_id);
CREATE INDEX ix_notes_deal ON notes(deal_id);
CREATE INDEX ix_notes_created ON notes(created_at DESC);
```

## 39. activities

CRM activity log.

```sql
CREATE TABLE activities (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Activity type
    type                VARCHAR(100) NOT NULL,
    action              VARCHAR(100),

    -- Related entities
    entity_type         VARCHAR(100),
    entity_id           INTEGER,

    -- Details
    title               VARCHAR(255),
    description         TEXT,

    -- Before/after for tracking changes
    before_state        JSONB,
    after_state         JSONB,

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- IP
    ip_address          VARCHAR(45),

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_activity_type CHECK (type IN (
        'deal_created', 'deal_updated', 'deal_stage_changed', 'deal_won', 'deal_lost',
        'note_added', 'task_created', 'task_completed', 'email_sent', 'email_received',
        'call_made', 'call_received', 'meeting_scheduled', 'meeting_completed'
    ))
);

CREATE INDEX ix_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX ix_activities_created ON activities(created_at DESC);
```

---

# BOOKING MODULE

## 40. meetings

Meeting/scheduling records.

```sql
CREATE TABLE meetings (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    lead_id             INTEGER REFERENCES leads(id),
    deal_id             INTEGER REFERENCES deals(id),
    created_by          INTEGER REFERENCES users(id),

    -- Meeting details
    title               VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Attendees
    attendees           JSONB DEFAULT '[]',
    attendee_emails     JSONB DEFAULT '[]',

    -- Host
    host_email          VARCHAR(255),
    host_name           VARCHAR(255),

    -- Scheduling
    start_time          TIMESTAMP NOT NULL,
    end_time            TIMESTAMP NOT NULL,
    timezone            VARCHAR(50) DEFAULT 'UTC',
    duration_minutes    INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,

    -- Location
    location_type       VARCHAR(50) DEFAULT 'video',
    location            VARCHAR(500),
    meeting_url         VARCHAR(500),

    -- Video conferencing
    video_provider      VARCHAR(100),
    video_meeting_id    VARCHAR(255),

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    cancelled_at        TIMESTAMP,
    cancellation_reason TEXT,

    -- Reminders
    reminders_sent      INTEGER DEFAULT 0,
    reminder_settings   JSONB DEFAULT '[]',

    -- Booking link
    booking_link_id     INTEGER REFERENCES booking_links(id),

    -- Notes
    notes               TEXT,
    internal_notes      TEXT,

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_meeting_status CHECK (status IN (
        'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
    ))
);

CREATE INDEX ix_meetings_org ON meetings(organization_id);
CREATE INDEX ix_meetings_lead ON meetings(lead_id);
CREATE INDEX ix_meetings_time ON meetings(start_time);
CREATE INDEX ix_meetings_status ON meetings(status) WHERE deleted_at IS NULL;
```

## 41. calendar_integrations

Calendar provider integrations.

```sql
CREATE TABLE calendar_integrations (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Provider
    provider            VARCHAR(100) NOT NULL,
    provider_account_id VARCHAR(255),

    -- OAuth
    access_token_enc    TEXT,
    refresh_token_enc   TEXT,
    token_expires_at    TIMESTAMP,

    -- Sync settings
    sync_direction      VARCHAR(20) DEFAULT 'bidirectional',
    sync_events         BOOLEAN DEFAULT TRUE,
    last_sync_at        TIMESTAMP,

    -- Calendar info
    calendar_id         VARCHAR(255),
    calendar_name       VARCHAR(255),
    calendar_color      VARCHAR(7),

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    is_primary          BOOLEAN DEFAULT FALSE,

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_calendar_provider CHECK (provider IN ('google', 'outlook', 'apple'))
);

CREATE INDEX ix_calendar_integrations_user ON calendar_integrations(user_id);
CREATE INDEX ix_calendar_integrations_active ON calendar_integrations(is_active) WHERE deleted_at IS NULL;
```

## 42. booking_links

Public booking links.

```sql
CREATE TABLE booking_links (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER NOT NULL REFERENCES users(id),
    inbox_id            INTEGER REFERENCES inboxes(id),

    -- Link info
    slug                VARCHAR(100) NOT NULL UNIQUE,
    title               VARCHAR(255),

    -- Availability
    availability_rules  JSONB NOT NULL DEFAULT '{}',
    buffer_before       INTEGER DEFAULT 0,
    buffer_after        INTEGER DEFAULT 0,

    -- Duration options
    duration_options    JSONB DEFAULT '[30, 60]',
    default_duration    INTEGER DEFAULT 30,

    -- Meeting types
    meeting_types       JSONB DEFAULT '[]',

    -- Customization
    branding            JSONB DEFAULT '{}',
    questions           JSONB DEFAULT '[]',

    -- Restrictions
    max_advance_days    INTEGER DEFAULT 60,
    min_advance_hours   INTEGER DEFAULT 2,

    -- Limits
    daily_limit         INTEGER,
    total_limit         INTEGER,
    bookings_used       INTEGER DEFAULT 0,

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,
    is_public           BOOLEAN DEFAULT TRUE,

    -- Tracking
    utm_source          VARCHAR(100),
    utm_medium          VARCHAR(100),
    utm_campaign        VARCHAR(100),

    -- Stats
    total_views         INTEGER DEFAULT 0,
    total_bookings      INTEGER DEFAULT 0,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX ix_booking_links_org ON booking_links(organization_id);
CREATE INDEX ix_booking_links_slug ON booking_links(slug);
```

---

# CMS MODULE

## 43. cms_pages

CMS pages.

```sql
CREATE TABLE cms_pages (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    created_by          INTEGER REFERENCES users(id),

    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) NOT NULL,
    description         TEXT,

    -- Content
    content             JSONB DEFAULT '{}',

    -- SEO
    meta_title          VARCHAR(255),
    meta_description    TEXT,
    meta_keywords       JSONB DEFAULT '[]',

    -- Media
    featured_image      VARCHAR(500),
    og_image            VARCHAR(500),

    -- Status
    status              VARCHAR(50) NOT NULL DEFAULT 'draft',
    published_at        TIMESTAMP,

    -- Template
    template_id         INTEGER,
    template_config     JSONB,

    -- Visibility
    visibility          VARCHAR(50) DEFAULT 'public',
    allowed_roles       JSONB DEFAULT '[]',

    -- Redirect
    redirect_url        VARCHAR(500),
    is_redirect         BOOLEAN DEFAULT FALSE,

    -- Stats
    views               INTEGER DEFAULT 0,

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    published_at        TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_cms_slug_unique UNIQUE (organization_id, slug),
    CONSTRAINT chk_cms_status CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX ix_cms_pages_org ON cms_pages(organization_id);
CREATE INDEX ix_cms_pages_slug ON cms_pages(slug);
CREATE INDEX ix_cms_pages_status ON cms_pages(status) WHERE deleted_at IS NULL;
```

## 44. cms_sections

Page sections/blocks.

```sql
CREATE TABLE cms_sections (
    id                  SERIAL PRIMARY KEY,
    page_id             INTEGER NOT NULL REFERENCES cms_pages(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    name                VARCHAR(255) NOT NULL,
    section_type        VARCHAR(100) NOT NULL,

    -- Position
    position            INTEGER NOT NULL,

    -- Content
    content             JSONB DEFAULT '{}',
    styles              JSONB DEFAULT '{}',

    -- Visibility
    is_visible          BOOLEAN DEFAULT TRUE,
    display_rules       JSONB,

    -- Animations
    animations          JSONB,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP,

    CONSTRAINT chk_section_position_unique UNIQUE (page_id, position)
);
```

## 45. cms_themes

CMS themes.

```sql
CREATE TABLE cms_themes (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(100) NOT NULL UNIQUE,

    -- Theme data
    config              JSONB NOT NULL DEFAULT '{}',
    styles              JSONB DEFAULT '{}',
    fonts               JSONB DEFAULT '{}',
    colors              JSONB DEFAULT '{}',

    -- Files
    css_custom          TEXT,
    js_custom           TEXT,

    -- Status
    is_active           BOOLEAN DEFAULT FALSE,
    is_system           BOOLEAN DEFAULT FALSE,

    -- Versioning
    version             VARCHAR(20) DEFAULT '1.0.0',

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);
```

## 46. cms_assets

Media assets.

```sql
CREATE TABLE cms_assets (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    uploaded_by         INTEGER REFERENCES users(id),

    -- File info
    filename            VARCHAR(255) NOT NULL,
    original_filename   VARCHAR(255),
    mime_type           VARCHAR(100),
    file_size           INTEGER,

    -- Storage
    storage_path        VARCHAR(500),
    storage_provider    VARCHAR(50) DEFAULT 'local',
    cdn_url             VARCHAR(500),

    -- Image info
    width               INTEGER,
    height              INTEGER,
    alt_text            VARCHAR(255),

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- Usage
    used_in             JSONB DEFAULT '[]',
    use_count           INTEGER DEFAULT 0,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMP
);

CREATE INDEX ix_cms_assets_org ON cms_assets(organization_id);
CREATE INDEX ix_cms_assets_mime ON cms_assets(mime_type);
```

## 47. cms_navigation

Navigation menus.

```sql
CREATE TABLE cms_navigation (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    name                VARCHAR(255) NOT NULL,
    location            VARCHAR(100) NOT NULL,
    description         TEXT,

    -- Status
    is_active           BOOLEAN DEFAULT TRUE,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE TABLE cms_navigation_items (
    id                  SERIAL PRIMARY KEY,
    navigation_id       INTEGER NOT NULL REFERENCES cms_navigation(id),
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    label               VARCHAR(255) NOT NULL,
    url                 VARCHAR(500),
    page_id             INTEGER REFERENCES cms_pages(id),

    -- Hierarchy
    parent_id           INTEGER REFERENCES cms_navigation_items(id),
    position            INTEGER NOT NULL,

    -- Appearance
    icon                VARCHAR(50),
    badge               VARCHAR(100),

    -- Behavior
    target              VARCHAR(20) DEFAULT '_self',
    is_visible          BOOLEAN DEFAULT TRUE,

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX ix_cms_nav_items_nav ON cms_navigation_items(navigation_id);
CREATE INDEX ix_cms_nav_items_parent ON cms_navigation_items(parent_id);
```

---

# ANALYTICS MODULE

## 48. analytics_events

Analytics event tracking.

```sql
CREATE TABLE analytics_events (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Event info
    event_type          VARCHAR(100) NOT NULL,
    event_category      VARCHAR(100),

    -- Actor
    actor_type          VARCHAR(50),
    actor_id            INTEGER,

    -- Entity
    entity_type         VARCHAR(100),
    entity_id           INTEGER,

    -- Properties
    properties          JSONB DEFAULT '{}',

    -- Context
    session_id          VARCHAR(255),
    page_url            VARCHAR(500),
    referrer            VARCHAR(500),

    -- Environment
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(500),
    device_type         VARCHAR(50),

    -- Location
    country             VARCHAR(100),
    region              VARCHAR(100),
    city                VARCHAR(100),

    -- Timestamp
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_event_category CHECK (event_category IN (
        'auth', 'campaign', 'lead', 'email', 'ai', 'crm', 'booking', 'billing'
    ))
);

CREATE INDEX ix_analytics_events_type ON analytics_events(event_type);
CREATE INDEX ix_analytics_events_entity ON analytics_events(entity_type, entity_id);
CREATE INDEX ix_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX ix_analytics_events_org_date ON analytics_events(organization_id, created_at DESC);
```

## 49. campaign_metrics

Campaign performance metrics.

```sql
CREATE TABLE campaign_metrics (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),
    campaign_id         INTEGER NOT NULL REFERENCES campaigns(id),

    -- Time period
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    period_type         VARCHAR(20) NOT NULL,

    -- Volume metrics
    emails_sent         INTEGER DEFAULT 0,
    emails_delivered    INTEGER DEFAULT 0,
    emails_opened       INTEGER DEFAULT 0,
    emails_clicked      INTEGER DEFAULT 0,
    emails_replied      INTEGER DEFAULT 0,
    emails_bounced      INTEGER DEFAULT 0,
    emails_unsubscribed INTEGER DEFAULT 0,

    -- Calculated rates
    open_rate           DECIMAL(5, 2),
    click_rate          DECIMAL(5, 2),
    reply_rate          DECIMAL(5, 2),
    bounce_rate         DECIMAL(5, 2),

    -- Engagement
    total_engagements   INTEGER DEFAULT 0,
    unique_engagements   INTEGER DEFAULT 0,

    -- AI metrics
    ai_personalizations INTEGER DEFAULT 0,
    ai_cost             DECIMAL(10, 4) DEFAULT 0,

    -- Timestamp
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,

    CONSTRAINT chk_metrics_period CHECK (period_end > period_start),
    CONSTRAINT chk_metrics_period_type CHECK (period_type IN ('hourly', 'daily', 'weekly', 'monthly'))
);

CREATE INDEX ix_campaign_metrics_campaign ON campaign_metrics(campaign_id);
CREATE INDEX ix_campaign_metrics_period ON campaign_metrics(period_start, period_end);
CREATE UNIQUE INDEX ix_campaign_metrics_unique ON campaign_metrics(campaign_id, period_type, period_start);
```

## 50. dashboard_metrics

Dashboard aggregated metrics.

```sql
CREATE TABLE dashboard_metrics (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER NOT NULL REFERENCES organizations(id),

    -- Metric type
    metric_type         VARCHAR(100) NOT NULL,
    metric_category     VARCHAR(100),

    -- Time period
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,

    -- Values
    value               DECIMAL(15, 2),
    count               INTEGER DEFAULT 0,
    breakdown           JSONB,

    -- Comparison
    previous_value      DECIMAL(15, 2),
    change_percent      DECIMAL(5, 2),

    -- Dimensions
    dimensions          JSONB DEFAULT '{}',

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_dashboard_metric_unique UNIQUE (organization_id, metric_type, period_start)
);

CREATE INDEX ix_dashboard_metrics_type ON dashboard_metrics(metric_type);
CREATE INDEX ix_dashboard_metrics_period ON dashboard_metrics(period_start, period_end);
```

---

# SYSTEM MODULE

## 51. notifications

System notifications.

```sql
CREATE TABLE notifications (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Notification
    type                VARCHAR(100) NOT NULL,
    title               VARCHAR(255) NOT NULL,
    message             TEXT,

    -- Data
    data                JSONB DEFAULT '{}',

    -- Actions
    action_url          VARCHAR(500),
    action_text         VARCHAR(100),

    -- Status
    is_read             BOOLEAN DEFAULT FALSE,
    read_at             TIMESTAMP,

    -- Delivery
    channel             VARCHAR(50) DEFAULT 'in_app',
    email_sent          BOOLEAN DEFAULT FALSE,
    email_sent_at       TIMESTAMP,

    -- Scheduling
    scheduled_at        TIMESTAMP,
    sent_at             TIMESTAMP,

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_notification_type CHECK (type IN (
        'info', 'success', 'warning', 'error', 'campaign', 'lead', 'email', 'billing', 'system'
    ))
);

CREATE INDEX ix_notifications_user ON notifications(user_id);
CREATE INDEX ix_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX ix_notifications_created ON notifications(created_at DESC);
```

## 52. audit_logs

Comprehensive audit trail.

```sql
CREATE TABLE audit_logs (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Action
    action              VARCHAR(100) NOT NULL,
    entity_type         VARCHAR(100),
    entity_id           INTEGER,

    -- Changes
    changes             JSONB,
    before_state        JSONB,
    after_state         JSONB,

    -- Context
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(500),
    session_id          VARCHAR(255),

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_audit_action CHECK (action IN (
        'create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'import'
    ))
);

CREATE INDEX ix_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX ix_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX ix_audit_logs_user ON audit_logs(user_id);
CREATE INDEX ix_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX ix_audit_logs_action ON audit_logs(action);
```

## 53. feature_flags

Feature toggle system.

```sql
CREATE TABLE feature_flags (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER REFERENCES organizations(id),
    user_id             INTEGER REFERENCES users(id),

    -- Flag
    key                 VARCHAR(100) NOT NULL,
    name                VARCHAR(255),
    description         TEXT,

    -- Value
    value               BOOLEAN DEFAULT FALSE,
    value_type          VARCHAR(50) DEFAULT 'boolean',

    -- Targeting
    enabled_for         JSONB DEFAULT '[]',
    disabled_for        JSONB DEFAULT '[]',
    targeting_rules     JSONB DEFAULT '[]',

    -- Rollout
    rollout_percentage  INTEGER DEFAULT 0,
    is_rollout_active   BOOLEAN DEFAULT FALSE,

    -- Metadata
    metadata            JSONB DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,

    CONSTRAINT chk_flag_key_unique UNIQUE (organization_id, key)
);

CREATE INDEX ix_feature_flags_org ON feature_flags(organization_id);
CREATE INDEX ix_feature_flags_key ON feature_flags(key);
```

## 54. system_settings

System configuration.

```sql
CREATE TABLE system_settings (
    id                  SERIAL PRIMARY KEY,
    organization_id     INTEGER REFERENCES organizations(id),

    -- Setting
    key                 VARCHAR(100) NOT NULL,
    value               JSONB,

    -- Type
    value_type          VARCHAR(50) DEFAULT 'string',
    description         TEXT,

    -- Category
    category            VARCHAR(100),

    -- Validation
    validation_rules    JSONB,

    -- Access
    is_public           BOOLEAN DEFAULT FALSE,
    is_encrypted        BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,

    CONSTRAINT chk_settings_key_unique UNIQUE (organization_id, key)
);

CREATE INDEX ix_system_settings_org ON system_settings(organization_id);
CREATE INDEX ix_system_settings_category ON system_settings(category);
```

---

# INDEX STRATEGY

## Composite Indexes for Common Queries

```sql
-- Lead queries
CREATE INDEX ix_leads_org_status ON leads(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_org_source ON leads(organization_id, source) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_email_domain ON leads(email) WHERE deleted_at IS NULL;
CREATE INDEX ix_leads_score_org ON leads(organization_id, score DESC) WHERE deleted_at IS NULL;

-- Campaign queries
CREATE INDEX ix_campaigns_org_status ON campaigns(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_campaigns_scheduled ON campaigns(schedule_date) WHERE status = 'scheduled';

-- Email queries
CREATE INDEX ix_emails_org_status ON email_messages(organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX ix_emails_lead_date ON email_messages(lead_id, sent_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ix_emails_campaign_status ON email_messages(campaign_id, status) WHERE deleted_at IS NULL;

-- Activity queries
CREATE INDEX ix_activities_org_date ON activities(organization_id, created_at DESC);
CREATE INDEX ix_activities_entity_date ON activities(entity_type, entity_id, created_at DESC);

-- Audit queries
CREATE INDEX ix_audit_org_date ON audit_logs(organization_id, created_at DESC);
CREATE INDEX ix_audit_entity_date ON audit_logs(entity_type, entity_id, created_at DESC);
```

---

# CONSTRAINTS SUMMARY

## Unique Constraints

| Table | Constraint | Columns |
|-------|------------|---------|
| organizations | slug | slug |
| users | email | organization_id, email |
| leads | email | organization_id, email |
| inboxes | email | organization_id, email |
| campaigns | name | organization_id, name |
| ai_prompts | slug | organization_id, slug |
| feature_flags | key | organization_id, key |

## Check Constraints

| Table | Constraint | Expression |
|-------|------------|------------|
| users | role | IN ('owner', 'admin', 'team_member') |
| campaigns | status | IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled') |
| leads | status | IN ('new', 'contacted', 'qualified', 'unqualified', 'customer', 'churned') |
| email_messages | direction | IN ('outbound', 'inbound') |
| email_messages | status | IN ('pending', 'scheduled', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed') |

---

# MIGRATION STRATEGY

## Migration Order

1. **Core**: organizations, users, memberships, roles, permissions
2. **Auth**: sessions, login_logs
3. **Billing**: plans, subscriptions, invoices, usage_tracking
4. **Leads**: leads, lead_sources, lead_tags, lead_activity, lead_enrichment
5. **Scraping**: scrape_jobs, scrape_results, crawl_logs, crawl_failures
6. **Email**: inboxes, smtp_configs, campaigns, campaign_sequences, campaign_steps, email_messages, email_opens, email_replies, email_bounces
7. **AI**: ai_prompts, ai_templates, ai_generations, ai_usage_logs
8. **CRM**: pipelines, stages, deals, tasks, notes, activities
9. **Booking**: meetings, calendar_integrations, booking_links
10. **CMS**: cms_pages, cms_sections, cms_themes, cms_assets, cms_navigation, cms_navigation_items
11. **Analytics**: analytics_events, campaign_metrics, dashboard_metrics
12. **System**: notifications, audit_logs, feature_flags, system_settings

## Versioning

- Each module has its own migration file
- Use meaningful migration names
- Include rollback scripts
- Test migrations on staging

---

# PERFORMANCE OPTIMIZATION

## Connection Pooling
- Pool size: 20 connections
- Max overflow: 10 connections
- Pool pre-ping enabled

## Query Optimization
- Use covering indexes for frequent queries
- Partition large tables by date (analytics_events, audit_logs)
- Use materialized views for aggregated metrics
- Implement query result caching

## Bulk Operations
- Use bulk_insert_mappings for batch inserts
- Implement pagination for large exports
- Use async operations for non-blocking I/O