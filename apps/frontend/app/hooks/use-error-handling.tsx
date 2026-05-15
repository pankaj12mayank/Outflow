"use client";

import { useState, useCallback } from "react";

interface AxiosError {
  isAxiosError?: boolean;
  message?: string;
  response?: {
    status: number;
    data: {
      error?: { message?: string; detail?: string | Array<{ msg?: string }> };
      detail?: string | Array<{ msg?: string }>;
    };
  };
}

export function handleAPIError(error: unknown): string {
  if (!error) return "An unexpected error occurred";

  const axiosError = error as AxiosError;

  if (axiosError.isAxiosError && axiosError.response) {
    const { status, data } = axiosError.response;

    if (status === 401) return "Session expired. Please sign in again.";
    if (status === 403) return "You don't have permission for this action.";
    if (status === 404) return "The requested resource was not found.";
    if (status === 429) return "Too many requests. Please slow down.";
    if (status === 500) return "Server error. Please try again later.";
    if (status === 503) return "Service temporarily unavailable.";

    if (status === 422) {
      if (data.error?.detail) {
        if (typeof data.error.detail === "string") return data.error.detail;
        if (Array.isArray(data.error.detail) && data.error.detail[0]?.msg) {
          return data.error.detail[0].msg;
        }
      }
      if (data.detail) {
        if (typeof data.detail === "string") return data.detail;
        if (Array.isArray(data.detail) && data.detail[0]?.msg) {
          return data.detail[0].msg;
        }
      }
      return "Validation failed. Please check your input.";
    }

    if (data.error?.message) return data.error.message;
  }

  if (axiosError.message) return axiosError.message;

  if (error instanceof Error) return error.message;

  return "An unexpected error occurred";
}

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number) => void;
  onSuccess?: () => void;
  onFinalFailure?: (error: Error) => void;
}

export function useRetry<T extends () => Promise<unknown>>(
  callback: T,
  options: RetryOptions = {}
) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry,
    onSuccess,
    onFinalFailure,
  } = options;

  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setIsRetrying(true);
    setError(null);

    let lastError: Error | null = null;

    for (let i = 1; i <= maxAttempts; i++) {
      setAttempt(i);
      
      try {
        await callback();
        setIsRetrying(false);
        onSuccess?.();
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        if (i < maxAttempts) {
          onRetry?.(i);
          const waitTime = backoff ? delay * Math.pow(2, i - 1) : delay;
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    setError(lastError);
    setIsRetrying(false);
    if (lastError && onFinalFailure) {
      onFinalFailure(lastError);
    }
  }, [callback, maxAttempts, delay, backoff, onRetry, onSuccess, onFinalFailure]);

  const reset = useCallback(() => {
    setAttempt(0);
    setError(null);
    setIsRetrying(false);
  }, []);

  return {
    execute,
    reset,
    isRetrying,
    attempt,
    error,
  };
}

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: unknown) => {
    const message = handleAPIError(err);
    setError(message);
    return message;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { error, handleError, clearError };
}

export function useAsyncError() {
  const [, setError] = useState<Error | null>(null);

  const dispatchError = useCallback((err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    setError(() => {
      throw error;
    });
  }, []);

  return dispatchError;
}