"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsAPI, api } from "@/app/lib/api";

export function useAnalyticsOverview(params?: {
  preset?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["analytics", "overview", params],
    queryFn: () => analyticsAPI.getOverview(params).then((r) => r.data),
    staleTime: 30000,
  });
}

export function useLeadAnalytics(params?: {
  preset?: string;
  start_date?: string;
  end_date?: string;
  source?: string;
}) {
  return useQuery({
    queryKey: ["analytics", "leads", params],
    queryFn: () => analyticsAPI.getLeads(params).then((r) => r.data),
    staleTime: 30000,
  });
}

export function useCampaignAnalytics(params?: {
  preset?: string;
  start_date?: string;
  end_date?: string;
  campaign_id?: number;
}) {
  return useQuery({
    queryKey: ["analytics", "campaigns", params],
    queryFn: () => analyticsAPI.getCampaigns(params).then((r) => r.data),
    staleTime: 30000,
  });
}

export function useSalesAnalytics(params?: {
  preset?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["analytics", "sales", params],
    queryFn: () => analyticsAPI.getSales(params).then((r) => r.data),
    staleTime: 30000,
  });
}

export function useAIAnalytics(params?: {
  preset?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["analytics", "ai", params],
    queryFn: () => analyticsAPI.getAI(params).then((r) => r.data),
    staleTime: 30000,
  });
}

export function useSystemAnalytics(params?: {
  preset?: string;
  start_date?: string;
  end_date?: string;
}) {
  return useQuery({
    queryKey: ["analytics", "system", params],
    queryFn: () => analyticsAPI.getSystem(params).then((r) => r.data),
    staleTime: 30000,
  });
}

export function useExecutiveSummary(params?: { preset?: string }) {
  return useQuery({
    queryKey: ["analytics", "executive", params],
    queryFn: () => analyticsAPI.getExecutiveSummary(params).then((r) => r.data),
    staleTime: 60000,
  });
}

export function useActivityFeed(limit?: number) {
  return useQuery({
    queryKey: ["analytics", "activity", limit],
    queryFn: () => analyticsAPI.getActivityFeed({ limit }).then((r) => r.data),
    staleTime: 30000,
  });
}

export function useQuickStats() {
  return useQuery({
    queryKey: ["analytics", "quick-stats"],
    queryFn: () => analyticsAPI.getQuickStats(),
    staleTime: 30000,
  });
}

export function useDashboardConfig(dashboardType?: string) {
  return useQuery({
    queryKey: ["analytics", "dashboard", dashboardType],
    queryFn: () => analyticsAPI.getDashboard({ dashboard_type: dashboardType }).then((r) => r.data),
  });
}

export function useSaveDashboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { dashboard_type: string; widgets: any[]; layout: any[] }) =>
      api.post("/api/v1/analytics/dashboard", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics", "dashboard"] });
    },
  });
}

export function useExportReport() {
  return useMutation({
    mutationFn: (data: {
      report_type: string;
      format: string;
      filters: any;
      columns?: string[];
    }) => analyticsAPI.exportReport(data),
  });
}

export function useSavedReports() {
  return useQuery({
    queryKey: ["analytics", "saved-reports"],
    queryFn: () => analyticsAPI.listSavedReports().then((r) => r.data),
  });
}

export function useSaveReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; report_type: string; filters: any; date_range: any }) =>
      analyticsAPI.saveReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics", "saved-reports"] });
    },
  });
}