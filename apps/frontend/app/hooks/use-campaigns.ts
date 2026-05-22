"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { campaignsAPI } from "@/app/lib/api";
import { emailsAPI } from "@/app/lib/api";

export function useCampaigns(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ["campaigns", "list", params],
    queryFn: () => campaignsAPI.list(params).then((r) => r.data),
    staleTime: 15000,
  });
}

export function useCampaign(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId],
    queryFn: () => campaignsAPI.get(campaignId).then((r) => r.data),
    enabled: Boolean(campaignId),
    staleTime: 10000,
  });
}

export function useCampaignStats(campaignId: string) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "stats"],
    queryFn: () => campaignsAPI.stats(campaignId).then((r) => r.data),
    enabled: Boolean(campaignId),
    staleTime: 10000,
  });
}

export function useCampaignEmails(campaignId: string, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["campaigns", campaignId, "emails", params],
    queryFn: () => emailsAPI.list({ campaign_id: campaignId, ...params }).then((r) => r.data),
    enabled: Boolean(campaignId),
    staleTime: 10000,
  });
}

export function useLaunchCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignsAPI.launch(id).then((r) => r.data),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
    },
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => campaignsAPI.pause(id).then((r) => r.data),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
      queryClient.invalidateQueries({ queryKey: ["campaigns", "list"] });
    },
  });
}
