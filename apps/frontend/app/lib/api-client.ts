"use client"

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface APIError {
  code: string
  message: string
  details?: Record<string, unknown>
  field_errors?: Array<{ field: string; message: string; code: string }>
}

export interface APIResponse<T> {
  success: boolean
  status: string
  message?: string
  data?: T
  error?: APIError
  meta?: {
    pagination?: {
      page: number
      per_page: number
      total: number
      total_pages: number
      has_next: boolean
      has_prev: boolean
    }
  }
  timestamp: string
  request_id?: string
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (client-side only)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    console.error("Request error:", error)
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse<APIResponse<unknown>>) => {
    return response
  },
  async (error: AxiosError<APIResponse<unknown>>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      // Try to refresh token
      if (!originalRequest._retry && typeof window !== "undefined") {
        originalRequest._retry = true

        try {
          const refreshToken = localStorage.getItem("refresh_token")
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
              refresh_token: refreshToken,
            })

            if (response.data?.data?.access_token) {
              localStorage.setItem("access_token", response.data.data.access_token)
              localStorage.setItem("refresh_token", response.data.data.refresh_token)

              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${response.data.data.access_token}`
              }
              return apiClient(originalRequest)
            }
          }
        } catch (refreshError) {
          // Refresh failed, clear tokens
          if (typeof window !== "undefined") {
            localStorage.removeItem("access_token")
            localStorage.removeItem("refresh_token")
            window.location.href = "/login"
          }
        }
      }

      // Redirect to login if not already there
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login"
      }
    }

    // Handle 429 - Rate Limited
    if (error.response?.status === 429) {
      console.warn("Rate limited! Try again later.")
    }

    // Handle 500+ errors
    if (error.response?.status && error.response.status >= 500) {
      console.error("Server error:", error.response.status)
    }

    return Promise.reject(error)
  }
)

// API Methods
export const api = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<APIResponse<T>>(url, config).then((res) => res.data),

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<APIResponse<T>>(url, data, config).then((res) => res.data),

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.put<APIResponse<T>>(url, data, config).then((res) => res.data),

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    apiClient.patch<APIResponse<T>>(url, data, config).then((res) => res.data),

  delete: <T>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<APIResponse<T>>(url, config).then((res) => res.data),
}

// Helper to extract data from API response
export function getData<T>(response: APIResponse<T>): T | null {
  if (response.success && response.data) {
    return response.data
  }
  return null
}

// Helper to get error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data?.error
    if (apiError?.message) {
      return apiError.message
    }
    if (error.response?.status === 401) {
      return "Please log in to continue"
    }
    if (error.response?.status === 403) {
      return "You don't have permission to perform this action"
    }
    if (error.response?.status === 404) {
      return "The requested resource was not found"
    }
    if (error.response?.status === 422) {
      return apiError?.message || "Validation error"
    }
    if (error.response?.status && error.response.status >= 500) {
      return "Server error. Please try again later."
    }
    if (error.code === "ECONNABORTED") {
      return "Request timed out. Please try again."
    }
    if (error.message.includes("Network Error")) {
      return "Unable to connect to server. Please check your connection."
    }
  }
  return "An unexpected error occurred"
}

// Type-safe API call hook
export async function safeApiCall<T>(
  fn: () => Promise<APIResponse<T>>
): Promise<{ data: T | null; error: string | null; loading: boolean }> {
  try {
    const response = await fn()
    if (response.success) {
      return { data: response.data ?? null, error: null, loading: false }
    }
    return { data: null, error: response.error?.message ?? "Unknown error", loading: false }
  } catch (err) {
    return { data: null, error: getErrorMessage(err), loading: false }
  }
}

export default apiClient