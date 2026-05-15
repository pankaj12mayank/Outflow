"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";

export function useAdminOrgs(params: { search?: string; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["admin", "orgs", params],
    queryFn: () => api.get("/admin/organizations", { params }).then((r) => r.data),
  });
}

export function useSuspendOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orgId, reason }: { orgId: number; reason?: string }) =>
      api.post(`/admin/organizations/${orgId}/suspend`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] }),
  });
}

export function useReactivateOrg() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: number) => api.post(`/admin/organizations/${orgId}/reactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] }),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["admin", "plans"],
    queryFn: () => api.get("/admin/plans").then((r) => r.data),
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/admin/plans", data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "plans"] }),
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: Record<string, unknown> }) =>
      api.put(`/admin/plans/${planId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "plans"] }),
  });
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get("/admin/stats").then((r) => r.data),
    refetchInterval: 30000,
  });
}

export function useMonitoringStats() {
  return useQuery({
    queryKey: ["admin", "monitoring"],
    queryFn: () => api.get("/admin/monitoring").then((r) => r.data),
    refetchInterval: 10000,
  });
}

export function useBillingStats() {
  return useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => api.get("/admin/billing").then((r) => r.data),
  });
}

export function useAbuseReports(params: { status?: string; severity?: string }) {
  return useQuery({
    queryKey: ["admin", "abuse", params],
    queryFn: () => api.get("/admin/abuse", { params }).then((r) => r.data),
  });
}

export function useResolveAbuseReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reportId, actionTaken }: { reportId: number; actionTaken: string }) =>
      api.post(`/admin/abuse/${reportId}/resolve`, { action_taken: actionTaken }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "abuse"] }),
  });
}

export function useUpdateOrgLimits(orgId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (limits: Record<string, unknown>) =>
      api.put(`/admin/organizations/${orgId}/limits`, limits),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] }),
  });
}