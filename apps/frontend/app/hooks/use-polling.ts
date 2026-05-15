"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/app/lib/api";

const POLLING_INTERVALS = {
  notifications: 5000,
  campaigns: 10000,
  jobs: 3000,
  replies: 8000,
  ai: 15000,
};

export function useNotificationPolling(enabled: boolean = true) {
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString());
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const response = await api.get("/api/v1/notifications/polling/notifications", {
          params: { since },
        });

        const data = response.data;
        if (data.unread_count > 0 || (data.notifications?.length ?? 0) > 0) {
          queryClient.setQueryData(["notifications"], (old: any) => ({
            ...old,
            notifications: [
              ...(data.notifications || []),
              ...(old?.notifications || []),
            ].slice(0, 50),
            unread_count: data.unread_count,
          }));
        }
      } catch (error) {
        console.error("Notification polling error:", error);
      }
    }, POLLING_INTERVALS.notifications);

    return () => clearInterval(interval);
  }, [enabled, queryClient]);

  return { lastCheck, setLastCheck };
}

export function useCampaignPolling(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const response = await api.get("/api/v1/notifications/polling/campaigns", {
          params: { since },
        });

        queryClient.setQueryData(["campaigns"], (old: any) => ({
          ...old,
          campaigns: response.data.campaigns,
          _lastUpdate: Date.now(),
        }));
      } catch (error) {
        console.error("Campaign polling error:", error);
      }
    }, POLLING_INTERVALS.campaigns);

    return () => clearInterval(interval);
  }, [enabled, queryClient]);
}

export function useScrapingJobPolling(enabled: boolean = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const response = await api.get("/api/v1/notifications/polling/jobs", {
          params: { since },
        });

        queryClient.setQueryData(["scraping", "jobs"], (old: any) => ({
          ...old,
          jobs: response.data.jobs,
          _lastUpdate: Date.now(),
        }));
      } catch (error) {
        console.error("Scraping job polling error:", error);
      }
    }, POLLING_INTERVALS.jobs);

    return () => clearInterval(interval);
  }, [enabled, queryClient]);
}

export function useBatchPolling(
  resources: string[],
  interval: number = 5000,
  enabled: boolean = true
) {
  const queryClient = useQueryClient();
  const lastSinceRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const response = await api.post(
          "/api/v1/notifications/polling/",
          {
            resources: resources.map((r) => ({ resource_type: r })),
          },
          { params: { since: lastSinceRef.current } }
        );

        const data = response.data;
        lastSinceRef.current = data.timestamp || new Date().toISOString();

        if (data.updates) {
          data.updates.forEach((update: any) => {
            queryClient.setQueryData(
              ["polling", update.resource_type],
              (old: any) => ({
                ...old,
                ...update.data,
                _version: update.version,
                _lastUpdate: Date.now(),
              })
            );
          });
        }
      } catch (error) {
        console.error("Batch polling error:", error);
      }
    };

    poll();
    const intervalId = setInterval(poll, interval);
    return () => clearInterval(intervalId);
  }, [enabled, interval, resources, queryClient]);
}

export function useNotificationToast() {
  const [toasts, setToasts] = useState<any[]>([]);

  const addToast = useCallback(
    (toast: {
      type: "success" | "error" | "warning" | "info";
      title: string;
      message?: string;
      duration?: number;
    }) => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);

      if (toast.duration !== 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, toast.duration || 5000);
      }

      return id;
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message?: string) => addToast({ type: "success", title, message }),
    [addToast]
  );

  const error = useCallback(
    (title: string, message?: string) => addToast({ type: "error", title, message }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => addToast({ type: "warning", title, message }),
    [addToast]
  );

  const info = useCallback(
    (title: string, message?: string) => addToast({ type: "info", title, message }),
    [addToast]
  );

  return { toasts, addToast, dismissToast, success, error, warning, info };
}

export function usePollingCounts() {
  return useQuery({
    queryKey: ["polling", "counts"],
    queryFn: async () => {
      const [notifResponse, jobResponse] = await Promise.all([
        api.get("/api/v1/notifications/counts"),
        api.get("/api/v1/notifications/polling/jobs"),
      ]);

      return {
        unreadNotifications: notifResponse.data.unread,
        totalNotifications: notifResponse.data.total,
        activeJobs: (jobResponse.data.jobs || []).filter(
          (j: any) => j.status === "running" || j.status === "pending"
        ).length,
        totalJobs: (jobResponse.data.jobs || []).length,
      };
    },
    refetchInterval: 10000,
    staleTime: 5000,
  });
}