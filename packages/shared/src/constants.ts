export const USER_ROLES = {
  SUPER_ADMIN: "super_admin",
  OWNER: "owner",
  TEAM_MEMBER: "team_member",
} as const;

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
} as const;

export const LEAD_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
  BOUNCED: "bounced",
  REPLIED: "replied",
} as const;

export const EMAIL_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  OPENED: "opened",
  CLICKED: "clicked",
  REPLIED: "replied",
  BOUNCED: "bounced",
  FAILED: "failed",
} as const;

export const TASK_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const TASK_TYPES = {
  SEND_EMAIL: "send_email",
  PERSONALIZE_CONTENT: "personalize_content",
  ENRICH_LEAD: "enrich_lead",
  SCRAPE_DATA: "scrape_data",
} as const;

export const SCRAPING_SOURCES = {
  LINKEDIN: "linkedin",
  COMPANY_WEBSITE: "company_website",
  HUNTER_IO: "hunter_io",
  CLEARBIT: "clearbit",
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const AI_MODELS = {
  OLLAMA: {
    LLAMA_32: "llama3.2",
    LLAMA_70B: "llama3.2:70b",
    MISTRAL: "mistral",
    CODELLAMA: "codellama",
  },
  OPENAI: {
    GPT_4: "gpt-4",
    GPT_4_TURBO: "gpt-4-turbo",
    GPT_35_TURBO: "gpt-3.5-turbo",
  },
  ANTHROPIC: {
    CLAUDE_3_OPUS: "claude-3-opus",
    CLAUDE_3_SONNET: "claude-3-sonnet",
    CLAUDE_3_HAKU: "claude-3-haiku",
  },
} as const;

export const POLLING_INTERVALS = {
  CAMPAIGNS: 30000,
  LEADS: 15000,
  EMAILS: 10000,
  TASKS: 5000,
} as const;