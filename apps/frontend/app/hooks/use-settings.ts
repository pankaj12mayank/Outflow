"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsAPI } from "@/app/lib/api";

export function useSettings() {
  return useQuery({
    queryKey: ["settings", "me"],
    queryFn: () => settingsAPI.get().then((r) => r.data),
    staleTime: 30000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => settingsAPI.updateProfile(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "me"] });
    },
  });
}

export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      settingsAPI.updateOrganization(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "me"] });
    },
  });
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, boolean>) =>
      settingsAPI.updateNotifications(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "me"] });
    },
  });
}
