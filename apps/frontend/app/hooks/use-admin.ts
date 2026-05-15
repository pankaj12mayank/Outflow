"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/app/lib/api";

export interface OrgSummary {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  is_active: boolean;
  plan_name: string | null;
  subscription_status: string | null;
  user_count: number;
  created_at: string;
}

export interface PlatformStats {
  total_organizations: number;
  active_organizations: number;
  total_users: number;
  active_users: number;
  total_subscriptions: number;
  active_subscriptions: number;
  mrr: number;
  arr: number;
  churn_rate: number;
  new_orgs_this_month: number;
  new_orgs_last_month: number;
}

export interface BillingStats {
  mrr: number;
  arr: number;
  total_invoices: number;
  paid_invoices: number;
  pending_invoices: number;
  failed_invoices: number;
  average_invoice_value: number;
  by_plan: Record<string, number>;
  by_status: Record<string, number>;
}

export interface AbuseReport {
  id: number;
  organization_id: number;
  organization_name?: string;
  user_id: number | null;
  report_type: string;
  severity: string;
  description: string;
  evidence: Record<string, unknown>;
  status: string;
  action_taken: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface MonitoringStats {
  server_status: string;
  uptime_seconds: number;
  active_connections: number;
  queue_size: number;
  avg_response_time_ms: number;
  error_rate: number;
  scraping_jobs_running: number;
  scraping_jobs_pending: number;
  active_polling_users: number;
}

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  monthly_price: number;
  yearly_price: number;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  ai_limits: Record<string, unknown>;
  email_limits: Record<string, unknown>;
  scraping_limits: Record<string, unknown>;
  is_active: boolean;
  is_featured: boolean;
}

export function useAdminOrgs(params?: { search?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["admin", "orgs", params],
    queryFn: () =>
      api.get("/api/v1/admin/organizations", { params }).then((r) => r.data),
    enabled: false,
  });
}

export function useAdminOrg(orgId: number) {
  return useQuery({
    queryKey: ["admin", "org", orgId],
    queryFn: () =>
      api.get(`/api/v1/admin/organizations/${orgId}`).then((r) => r.data),
    enabled: false,
  });
}

export function useSuspendOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, reason }: { orgId: number; reason?: string }) =>
      api.post(`/api/v1/admin/organizations/${orgId}/suspend`, null, { params: { reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function useReactivateOrg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orgId: number) =>
      api.post(`/api/v1/admin/organizations/${orgId}/reactivate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin"] }),
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["admin", "stats", "platform"],
    queryFn: () => api.get("/api/v1/admin/stats/platform").then((r) => r.data),
    refetchInterval: 30000,
  });
}

export function useBillingStats() {
  return useQuery({
    queryKey: ["admin", "stats", "billing"],
    queryFn: () => api.get("/api/v1/admin/stats/billing").then((r) => r.data),
    refetchInterval: 60000,
  });
}

export function useMonitoringStats() {
  return useQuery({
    queryKey: ["admin", "stats", "monitoring"],
    queryFn: () => api.get("/api/v1/admin/stats/monitoring").then((r) => r.data),
    refetchInterval: 10000,
  });
}

export function useAbuseReports(params?: { status?: string; severity?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["admin", "abuse", params],
    queryFn: () =>
      api.get("/api/v1/admin/abuse-reports", { params }).then((r) => r.data),
    refetchInterval: 15000,
  });
}

export function useResolveAbuseReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, actionTaken }: { reportId: number; actionTaken: string }) =>
      api.post(`/api/v1/admin/abuse-reports/${reportId}/resolve`, null, { params: { action_taken: actionTaken } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "abuse"] }),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => api.get("/api/v1/admin/plans").then((r) => r.data),
  });
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/api/v1/admin/plans", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "plans"] }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: Record<string, unknown> }) =>
      api.patch(`/api/v1/admin/plans/${planId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "plans"] }),
  });
}

export function useAdminLimits(orgId: number) {
  return useQuery({
    queryKey: ["admin", "limits", orgId],
    queryFn: () => api.get(`/api/v1/admin/limits/${orgId}`).then((r) => r.data),
    enabled: false,
  });
}

export function useUpdateLimits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/api/v1/admin/limits", data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["admin", "limits", vars.organization_id] }),
  });
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: ["admin", "feature-flags"],
    queryFn: () => api.get("/api/v1/admin/feature-flags").then((r) => r.data),
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post("/api/v1/admin/feature-flags", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "feature-flags"] }),
  });
}

export function useGlobalSettings() {
  return useQuery({
    queryKey: ["admin", "global-settings"],
    queryFn: () => api.get("/api/v1/admin/global-settings").then((r) => r.data),
  });
}

export function useUpdateGlobalSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put("/api/v1/admin/global-settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "global-settings"] }),
  });
}

export function useSystemAlerts() {
  return useQuery({
    queryKey: ["admin", "alerts"],
    queryFn: () => api.get("/api/v1/admin/alerts").then((r) => r.data),
    refetchInterval: 30000,
  });
}

export function useAdminLogs(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["admin", "logs", params],
    queryFn: () => api.get("/api/v1/admin/logs", { params }).then((r) => r.data),
    refetchInterval: 30000,
  });
}