"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teamAPI } from "@/app/lib/api";

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team", "members"],
    queryFn: () => teamAPI.list().then((r) => r.data),
    staleTime: 15000,
  });
}

export function useTeamInvitations() {
  return useQuery({
    queryKey: ["team", "invitations"],
    queryFn: () => teamAPI.listInvitations().then((r) => r.data),
    staleTime: 15000,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      teamAPI.invite(email, role).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "invitations"] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      teamAPI.updateMember(id, { role: role === "team_member" ? "member" : role }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamAPI.removeMember(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "members"] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamAPI.cancelInvite(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "invitations"] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => teamAPI.resendInvite(id).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team", "invitations"] });
    },
  });
}
