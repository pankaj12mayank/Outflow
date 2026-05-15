"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/app/lib/api";

export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await api.get("/api/v1/campaigns/");
      return response.data;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const response = await api.get(`/api/v1/campaigns/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
}