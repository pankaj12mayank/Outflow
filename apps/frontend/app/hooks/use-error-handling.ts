"use client";

import { useState, useCallback } from "react";
import api from "@/app/lib/api";
import axios from "axios";
import {
  LoadingState,
  ErrorState,
  RetryState,
  NoResultsState,
  EmptyState,
  OfflineState,
  SkeletonTable,
  DataTableEmpty,
} from "../components/status-states";

export type DataState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string; retry?: () => void }
  | { status: "empty"; message?: string }
  | { status: "offline" }
  | { status: "retry"; message: string; retry: () => void };

interface UseRetryOptions {
  maxRetries?: number;
  delayMs?: number;
  onError?: (error: unknown) => void;
  onSuccess?: (data: unknown) => void;
}

export function useRetry<T>(
  fn: () => Promise<T>,
  options: UseRetryOptions = {}
) {
  const { maxRetries = 3, delayMs = 1000, onError, onSuccess } = options;
  const [state, setState] = useState<DataState<T>>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  const execute = useCallback(async () => {
    setState({ status: "loading" });
    let lastError: unknown;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const data = await fn();
        setState({ status: "success", data });
        onSuccess?.(data);
        setAttempt(0);
        return data;
      } catch (err) {
        lastError = err;
        if (i < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
        }
      }
    }

    const message = lastError instanceof Error ? lastError.message : "Operation failed";
    setState({ status: "error", error: message, retry: execute });
    onError?.(lastError);
    return null;
  }, [fn, maxRetries, delayMs, onError, onSuccess]);

  const retry = useCallback(() => {
    setAttempt((a) => a + 1);
    return execute();
  }, [execute]);

  return { state, execute, retry, attempt };
}

export function usePollingRetry<T>(
  fetchFn: () => Promise<T>,
  interval: number = 10000,
  options: { maxRetries?: number; onError?: (err: unknown) => void } = {}
) {
  const { maxRetries = 3, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        const result = await fetchFn();
        setData(result);
        setError(null);
        setRetryCount(0);
        setLoading(false);
        return result;
      } catch (err) {
        attempts++;
        if (attempts >= maxRetries) {
          const msg = err instanceof Error ? err.message : "Polling failed";
          setError(msg);
          setRetryCount((c) => c + 1);
          onError?.(err);
        }
      }
    }
    setLoading(false);
    return null;
  }, [fetchFn, maxRetries, onError]);

  const retry = useCallback(() => {
    setError(null);
    return fetch_();
  }, [fetch_]);

  return { data, error, loading, retryCount, retry, fetch: fetch_ };
}

export function useOfflineDetection() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  if (typeof window !== "undefined") {
    if (!window.navigator.onLine) {
      setIsOffline(true);
    }
  }

  return { isOffline, wasOffline, setWasOffline };
}

export { LoadingState, ErrorState, RetryState, NoResultsState, EmptyState, OfflineState, SkeletonTable, DataTableEmpty };

export function useAPIWithRetry<T>(
  apiCall: () => Promise<T>,
  options: {
    retryCount?: number;
    retryDelay?: number;
    showLoading?: boolean;
    showError?: boolean;
    errorMessage?: string;
  } = {}
) {
  const {
    retryCount = 3,
    retryDelay = 1000,
    showLoading = true,
    showError = true,
    errorMessage,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (overrideRetry?: number) => {
    setLoading(true);
    setError(null);
    const maxRetries = overrideRetry ?? retryCount;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await apiCall();
        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, retryDelay * (attempt + 1)));
        } else {
          const msg = err instanceof Error ? err.message : errorMessage || "Operation failed";
          setError(msg);
        }
      }
    }
    setLoading(false);
    return null;
  }, [apiCall, retryCount, retryDelay, errorMessage]);

  const retry = useCallback(() => execute(1), [execute]);

  return { data, loading, error, execute, retry };
}

export function handleAPIError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) return "Session expired. Please sign in again.";
    if (status === 403) return "You don't have permission for this action.";
    if (status === 404) return "The requested resource was not found.";
    if (status === 422) {
      const detail = data?.error?.detail || data?.detail;
      if (detail) return Array.isArray(detail) ? detail[0]?.msg || "Validation error" : detail;
      return "Please check your input and try again.";
    }
    if (status === 429) return "Too many requests. Please slow down.";
    if (status === 500) return "Server error. Please try again later.";
    if (status === 503) return "Service temporarily unavailable.";

    return data?.error?.message || data?.message || error.message || "An error occurred";
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}