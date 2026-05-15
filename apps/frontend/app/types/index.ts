export interface User {
  id: number;
  email: string;
  full_name: string;
  role: "super_admin" | "owner" | "team_member";
  organization_id: number | null;
  is_active: boolean;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Campaign {
  id: number;
  name: string;
  description: string | null;
  organization_id: number;
  status: "draft" | "active" | "paused" | "completed";
  email_account_id: number | null;
  settings: Record<string, unknown>;
  last_run_at: string | null;
  next_run_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Lead {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  company_domain: string | null;
  company_size: string | null;
  job_title: string | null;
  linkedin_url: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  source: string | null;
  enriched_data: Record<string, unknown>;
  organization_id: number;
  created_at: string;
  updated_at: string | null;
}

export interface CampaignLead {
  id: number;
  campaign_id: number;
  lead_id: number;
  status: "pending" | "active" | "completed" | "bounced" | "replied";
  personalization_data: Record<string, unknown>;
  ai_personalized_content: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

export interface EmailAccount {
  id: number;
  email: string;
  display_name: string | null;
  organization_id: number;
  smtp_host: string | null;
  smtp_port: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Sequence {
  id: number;
  name: string;
  campaign_id: number;
  step_number: number;
  subject_template: string;
  body_template: string;
  delay_days: number;
  delay_hours: number;
  is_ai_personalized: boolean;
  ai_prompt_template: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface Email {
  id: number;
  email_account_id: number;
  lead_id: number;
  campaign_lead_id: number | null;
  sequence_id: number | null;
  subject: string;
  body: string;
  direction: "outbound" | "inbound";
  status: "pending" | "sent" | "opened" | "clicked" | "replied" | "bounced" | "failed";
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  replied_at: string | null;
  bounced_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface BackgroundTask {
  id: number;
  task_name: string;
  task_type: string;
  entity_type: string | null;
  entity_id: number | null;
  organization_id: number;
  status: "pending" | "running" | "completed" | "failed";
  priority: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message: string | null;
  max_retries: number;
  retry_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CampaignStats {
  total_leads: number;
  pending: number;
  completed: number;
  bounced: number;
  replied: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
}

export type UserRole = "super_admin" | "owner" | "team_member";
export type CampaignStatus = "draft" | "active" | "paused" | "completed";
export type LeadStatus = "pending" | "active" | "completed" | "bounced" | "replied";
export type EmailStatus = "pending" | "sent" | "opened" | "clicked" | "replied" | "bounced" | "failed";
export type TaskStatus = "pending" | "running" | "completed" | "failed";