"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/app/lib/api";
import type { AxiosError } from "axios";


export function useAIStatus() {
  return useQuery({
    queryKey: ["ai", "status"],
    queryFn: () => api.get("/api/v1/ai/status").then((r) => r.data),
    staleTime: 30000,
  });
}

export function useAISettings() {
  return useQuery({
    queryKey: ["ai", "settings"],
    queryFn: () => api.get("/api/v1/ai/settings").then((r) => r.data),
  });
}

export function useUpdateAISettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch("/api/v1/ai/settings", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "settings"] });
    },
  });
}

export function usePersonalizeEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      lead_id: string;
      template?: string;
      goal?: string;
      sender_context?: string;
      generate_subject?: boolean;
      generate_cta?: boolean;
    }) => api.post("/api/v1/ai/personalize", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useAIGenerate() {
  return useMutation({
    mutationFn: (data: {
      type: string;
      context: Record<string, any>;
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }) => api.post("/api/v1/ai/generate", data).then((r) => r.data),
  });
}

export function useClassifyReply() {
  return useMutation({
    mutationFn: (data: {
      email_id?: string;
      sender: string;
      subject: string;
      body: string;
    }) => api.post("/api/v1/ai/analyze-reply", data).then((r) => r.data),
  });
}

export function useListPrompts(category?: string) {
  return useQuery({
    queryKey: ["ai", "prompts", category],
    queryFn: () => api.get("/api/v1/ai/prompts", { params: { category } }).then((r) => r.data),
  });
}

export function useCreatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/api/v1/ai/prompts", data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "prompts"] });
    },
  });
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & any) =>
      api.patch(`/api/v1/ai/prompts/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "prompts"] });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/api/v1/ai/prompts/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "prompts"] });
    },
  });
}

export function useAIUsage(params?: {
  start_date?: string;
  end_date?: string;
  model?: string;
  feature?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["ai", "usage", params],
    queryFn: () => api.get("/api/v1/ai/usage", { params }).then((r) => r.data),
    staleTime: 10000,
  });
}

export function useAnalyzeWebsite() {
  return useMutation({
    mutationFn: (data: { website_url: string; content?: string }) =>
      api.post("/api/v1/ai/website/analyze", data).then((r) => r.data),
  });
}