"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scrapingAPI } from "@/app/lib/api";

export function useScrapingJobs(params?: { status?: string; limit?: number }) {
  return useQuery({
    queryKey: ["scraping", "jobs", params],
    queryFn: () => scrapingAPI.listJobs(params).then((r) => r.data),
    staleTime: 10000,
    refetchInterval: 5000,
  });
}

export function useScrapingJob(jobId: string) {
  return useQuery({
    queryKey: ["scraping", "job", jobId],
    queryFn: () => scrapingAPI.getJob(jobId).then((r) => r.data),
    staleTime: 3000,
    refetchInterval: 3000,
  });
}

export function useScrapingJobResults(jobId: string, params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: ["scraping", "job", jobId, "results", params],
    queryFn: () => scrapingAPI.getJobResults(jobId, params).then((r) => r.data),
    staleTime: 5000,
  });
}

export function useGoogleMapsSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { keyword: string; location?: string; limit?: number }) =>
      scrapingAPI.googleMapsSearch(data).then((r) => r.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "jobs"] });
    },
  });
}

export function useGoogleMapsCrawl() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string }) =>
      scrapingAPI.googleMapsCrawl(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "jobs"] });
    },
  });
}

export function useCrawlWebsite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; crawl_contact_pages?: boolean }) =>
      scrapingAPI.crawlWebsite(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "jobs"] });
    },
  });
}

export function useCrawlWebsiteSync() {
  return useMutation({
    mutationFn: (data: { url: string }) =>
      scrapingAPI.crawlWebsiteSync(data).then((r) => r.data),
  });
}

export function useEnrichLinkedIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { linkedin_url: string }) =>
      scrapingAPI.enrichLinkedIn(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "jobs"] });
    },
  });
}

export function useEnrichLinkedInSync() {
  return useMutation({
    mutationFn: (data: { linkedin_url: string }) =>
      scrapingAPI.enrichLinkedInSync(data).then((r) => r.data),
  });
}

export function useParseCSV() {
  return useMutation({
    mutationFn: (file: File) => scrapingAPI.parseCSV(file).then((r) => r.data),
  });
}

export function useImportCSV() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { file: File; mappings: any[]; options: any }) => {
      const { file, mappings, options } = data;
      return scrapingAPI.importCSV(file, mappings, options).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "jobs"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useCancelScrapingJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => scrapingAPI.cancelJob(jobId).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "jobs"] });
    },
  });
}

export function useRetryScrapingJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => scrapingAPI.retryJob(jobId).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "jobs"] });
    },
  });
}

export function useBulkEnrich() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { lead_ids: number[]; enrich_websites?: boolean }) =>
      scrapingAPI.bulkEnrich(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraping", "jobs"] });
    },
  });
}

export function useScrapingStats() {
  return useQuery({
    queryKey: ["scraping", "stats"],
    queryFn: () => scrapingAPI.getStats().then((r) => r.data),
    staleTime: 30000,
  });
}