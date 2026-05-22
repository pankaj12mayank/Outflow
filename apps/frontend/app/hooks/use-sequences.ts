"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sequencesAPI } from "@/app/lib/api";

export function useSequences(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["sequences", "list", params],
    queryFn: () => sequencesAPI.list(params).then((r) => r.data),
    staleTime: 15000,
  });
}

export function useSequence(sequenceId: string) {
  return useQuery({
    queryKey: ["sequences", sequenceId],
    queryFn: () => sequencesAPI.get(sequenceId).then((r) => r.data),
    enabled: Boolean(sequenceId),
    staleTime: 10000,
  });
}

export function useCreateSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => sequencesAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences", "list"] });
    },
  });
}

export function useUpdateSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      sequencesAPI.update(id, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sequences", "list"] });
      queryClient.invalidateQueries({ queryKey: ["sequences", variables.id] });
    },
  });
}

export function useDeleteSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sequencesAPI.delete(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences", "list"] });
    },
  });
}

export function useDuplicateSequence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sequencesAPI.duplicate(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequences", "list"] });
    },
  });
}
