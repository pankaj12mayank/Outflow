"use client";

import { useQuery } from "@tanstack/react-query";
import { emailsAPI } from "@/app/lib/api";

export function useInbox(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["inbox", params],
    queryFn: () => emailsAPI.inbox(params).then((r) => r.data),
    staleTime: 10000,
  });
}

export function useEmailThread(leadId: string) {
  return useQuery({
    queryKey: ["inbox", "thread", leadId],
    queryFn: () => emailsAPI.getThread(leadId).then((r) => r.data),
    enabled: Boolean(leadId),
    staleTime: 10000,
  });
}
