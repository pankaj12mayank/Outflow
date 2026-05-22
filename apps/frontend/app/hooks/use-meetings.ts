"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { meetingsAPI } from "@/app/lib/api";

export function useMeetings(params?: { status?: string }) {
  return useQuery({
    queryKey: ["meetings", params],
    queryFn: () => meetingsAPI.list(params).then((r) => r.data),
    staleTime: 15000,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => meetingsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => meetingsAPI.cancel(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
