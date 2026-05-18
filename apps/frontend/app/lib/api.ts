import axios from "axios";
import { toast } from "@/app/components/toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window === "undefined") {
      return config;
    }
    const requestUrl = `${config.url || ""}`;
    const isSystemOwnerRoute =
      requestUrl.includes("/system-owner-auth") ||
      requestUrl.includes("/system-owner/") ||
      requestUrl.includes("/system-owner-dashboard") ||
      requestUrl.includes("/system-owner/platform");
    const token = isSystemOwnerRoute
      ? localStorage.getItem("system_owner_token")
      : localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const requestUrl = `${originalRequest.url || ""}`;
      const isSystemOwnerRoute =
        requestUrl.includes("/system-owner-auth") ||
        requestUrl.includes("/system-owner/") ||
        requestUrl.includes("/system-owner-dashboard") ||
        requestUrl.includes("/system-owner/platform");

      try {
        if (isSystemOwnerRoute) {
          const refreshToken = localStorage.getItem("system_owner_refresh_token");
          if (refreshToken) {
            const response = await axios.post(
              `${API_BASE_URL}/api/v1/system-owner-auth/refresh`,
              { refresh_token: refreshToken }
            );
            const { access_token, refresh_token } = response.data;
            localStorage.setItem("system_owner_token", access_token);
            localStorage.setItem("system_owner_refresh_token", refresh_token);
            originalRequest.headers["Authorization"] = `Bearer ${access_token}`;
            return api(originalRequest);
          }
        } else {
          const refreshToken = localStorage.getItem("refresh_token");
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token } = response.data;
            localStorage.setItem("access_token", access_token);
            localStorage.setItem("refresh_token", refresh_token);

            api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
            originalRequest.headers["Authorization"] = `Bearer ${access_token}`;

            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        if (isSystemOwnerRoute) {
          localStorage.removeItem("system_owner_token");
          localStorage.removeItem("system_owner_refresh_token");
          if (!window.location.pathname.startsWith("/system-owner/login")) {
            window.location.href = "/system-owner/login";
          }
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          toast.error("Session expired", "Please log in again");
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 500) {
      toast.error("Server error", "Something went wrong. Please try again.");
    }

    if (error.response?.status === 403) {
      toast.error("Access denied", "You don't have permission for this action.");
    }

    if (error.response?.status === 404) {
      toast.error("Not found", "The requested resource doesn't exist.");
    }

    if (error.response?.data?.detail) {
      const msg = error.response.data.detail;
      if (typeof msg === "string") {
        toast.error(msg);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/api/v1/auth/login", { email, password }),
  register: (data: { email: string; password: string; full_name: string; organization_name: string }) =>
    api.post("/api/v1/auth/register", data),
  logout: () => api.post("/api/v1/auth/logout"),
  refresh: (refreshToken: string) =>
    api.post("/api/v1/auth/refresh", { refresh_token: refreshToken }),
  me: () => api.get("/api/v1/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/v1/auth/change-password", { current_password: currentPassword, new_password: newPassword }),
  forgotPassword: (email: string) =>
    api.post("/api/v1/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/api/v1/auth/reset-password", { token, new_password: newPassword }),
  requestMagicLink: (email: string) =>
    api.post("/api/v1/auth/magic-link", { email }),
  verifyMagicLink: (token: string) =>
    api.post("/api/v1/auth/magic-link/verify", { token }),
  verifyEmail: (token: string) =>
    api.post("/api/v1/auth/verify-email", { token }),
};

export const leadsAPI = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    api.get("/api/v1/leads/", { params }),
  get: (id: string) => api.get(`/api/v1/leads/${id}`),
  create: (data: any) => api.post("/api/v1/leads/", data),
  update: (id: string, data: any) => api.patch(`/api/v1/leads/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/leads/${id}`),
  enrich: (id: string) => api.post(`/api/v1/leads/${id}/enrich`),
  bulkEnrich: (ids: string[]) => api.post("/api/v1/leads/bulk-enrich", { ids }),
  export: (params?: { format?: string }) =>
    api.get("/api/v1/leads/export", { params, responseType: "blob" }),
  import: (formData: FormData) =>
    api.post("/api/v1/leads/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

export const campaignsAPI = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get("/api/v1/campaigns/", { params }),
  get: (id: string) => api.get(`/api/v1/campaigns/${id}`),
  create: (data: any) => api.post("/api/v1/campaigns/", data),
  update: (id: string, data: any) => api.patch(`/api/v1/campaigns/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/campaigns/${id}`),
  launch: (id: string) => api.post(`/api/v1/campaigns/${id}/launch`),
  pause: (id: string) => api.post(`/api/v1/campaigns/${id}/pause`),
  stats: (id: string) => api.get(`/api/v1/campaigns/${id}/stats`),
};

export const sequencesAPI = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get("/api/v1/sequences/", { params }),
  get: (id: string) => api.get(`/api/v1/sequences/${id}`),
  create: (data: any) => api.post("/api/v1/sequences/", data),
  update: (id: string, data: any) => api.patch(`/api/v1/sequences/${id}`, data),
  delete: (id: string) => api.delete(`/api/v1/sequences/${id}`),
  duplicate: (id: string) => api.post(`/api/v1/sequences/${id}/duplicate`),
};

export const emailsAPI = {
  list: (params?: { campaign_id?: string; lead_id?: string; page?: number; limit?: number }) =>
    api.get("/api/v1/emails/", { params }),
  get: (id: string) => api.get(`/api/v1/emails/${id}`),
  getThread: (leadId: string) => api.get(`/api/v1/emails/thread/${leadId}`),
  track: (id: string) => api.post(`/api/v1/emails/${id}/track`),
};

export const teamAPI = {
  list: () => api.get("/api/v1/team/"),
  invite: (email: string, role: string) =>
    api.post("/api/v1/team/invite", { email, role }),
  updateMember: (id: string, data: { role?: string; status?: string }) =>
    api.patch(`/api/v1/team/${id}`, data),
  removeMember: (id: string) => api.delete(`/api/v1/team/${id}`),
  resendInvite: (inviteId: string) =>
    api.post(`/api/v1/team/invite/${inviteId}/resend`),
  cancelInvite: (inviteId: string) =>
    api.delete(`/api/v1/team/invite/${inviteId}`),
};

export const analyticsAPI = {
  getOverview: (params?: { preset?: string; start_date?: string; end_date?: string }) =>
    api.get("/api/v1/analytics/overview", { params }),
  getLeads: (params?: { preset?: string; start_date?: string; end_date?: string; source?: string }) =>
    api.get("/api/v1/analytics/leads", { params }),
  getCampaigns: (params?: { preset?: string; start_date?: string; end_date?: string; campaign_id?: number }) =>
    api.get("/api/v1/analytics/campaigns", { params }),
  getSales: (params?: { preset?: string; start_date?: string; end_date?: string }) =>
    api.get("/api/v1/analytics/sales", { params }),
  getAI: (params?: { preset?: string; start_date?: string; end_date?: string }) =>
    api.get("/api/v1/analytics/ai", { params }),
  getSystem: (params?: { preset?: string; start_date?: string; end_date?: string }) =>
    api.get("/api/v1/analytics/system", { params }),
  getExecutiveSummary: (params?: { preset?: string }) =>
    api.get("/api/v1/analytics/executive-summary", { params }),
  getActivityFeed: (params?: { limit?: number }) =>
    api.get("/api/v1/analytics/activity-feed", { params }),
  getQuickStats: () =>
    api.get("/api/v1/analytics/quick-stats").then((r: any) => r.data),
  getDashboard: (params?: { dashboard_type?: string }) =>
    api.get("/api/v1/analytics/dashboard", { params }),
  exportReport: (data: { report_type: string; format: string; filters: any; columns?: string[] }) =>
    api.post("/api/v1/analytics/export", data),
  listSavedReports: () =>
    api.get("/api/v1/analytics/saved-reports").then((r: any) => r.data),
  saveReport: (data: { name: string; report_type: string; filters: any; date_range: any }) =>
    api.post("/api/v1/analytics/saved-reports", data),
};

export const notificationsAPI = {
  list: (params?: { is_read?: boolean; type?: string; page?: number; limit?: number }) =>
    api.get("/api/v1/notifications/", { params }),
  getCounts: () =>
    api.get("/api/v1/notifications/counts").then((r) => r.data),
  create: (data: any) =>
    api.post("/api/v1/notifications/", data).then((r) => r.data),
  update: (id: number, data: any) =>
    api.patch(`/api/v1/notifications/${id}`, data).then((r) => r.data),
  markAllRead: () =>
    api.post("/api/v1/notifications/mark-all-read").then((r) => r.data),
  delete: (id: number) =>
    api.delete(`/api/v1/notifications/${id}`).then((r) => r.data),
  getPreferences: () =>
    api.get("/api/v1/notifications/preferences").then((r) => r.data),
  updatePreferences: (data: any) =>
    api.post("/api/v1/notifications/preferences", data).then((r) => r.data),
  poll: (data: { resources: any[] }, params?: { since?: string }) =>
    api.post("/api/v1/notifications/polling/", data, { params }).then((r) => r.data),
  pollNotifications: (params?: { since?: string }) =>
    api.get("/api/v1/notifications/polling/notifications", { params }).then((r) => r.data),
  pollCampaigns: (params?: { since?: string }) =>
    api.get("/api/v1/notifications/polling/campaigns", { params }).then((r) => r.data),
  pollJobs: (params?: { since?: string }) =>
    api.get("/api/v1/notifications/polling/jobs", { params }).then((r) => r.data),
};

export const emailTemplatesAPI = {
  list: (params?: { template_type?: string; page?: number; limit?: number }) =>
    api.get("/api/v1/email-templates/", { params }).then((r) => r.data),
  create: (data: any) =>
    api.post("/api/v1/email-templates/", data).then((r) => r.data),
  get: (id: number) =>
    api.get(`/api/v1/email-templates/${id}`).then((r) => r.data),
  update: (id: number, data: any) =>
    api.patch(`/api/v1/email-templates/${id}`, data).then((r) => r.data),
  delete: (id: number) =>
    api.delete(`/api/v1/email-templates/${id}`).then((r) => r.data),
};

export const aiAPI = {
  personalize: (data: { lead_id: string; template?: string; goal?: string; sender_context?: string; generate_subject?: boolean; generate_cta?: boolean }) =>
    api.post("/api/v1/ai/personalize", data),
  generate: (data: { type: string; context: any; model?: string; temperature?: number; max_tokens?: number }) =>
    api.post("/api/v1/ai/generate", data),
  enrich: (data: { email: string; company?: string }) =>
    api.post("/api/v1/ai/enrich", data),
  analyzeReply: (data: { email_id?: string; sender: string; subject: string; body: string }) =>
    api.post("/api/v1/ai/analyze-reply", data),
  getStatus: () => api.get("/api/v1/ai/status"),
  listPrompts: (params?: { category?: string }) =>
    api.get("/api/v1/ai/prompts", { params }),
  createPrompt: (data: any) =>
    api.post("/api/v1/ai/prompts", data),
  updatePrompt: (id: number, data: any) =>
    api.patch(`/api/v1/ai/prompts/${id}`, data),
  deletePrompt: (id: number) =>
    api.delete(`/api/v1/ai/prompts/${id}`),
  getSettings: () =>
    api.get("/api/v1/ai/settings"),
  updateSettings: (data: any) =>
    api.patch("/api/v1/ai/settings", data),
  getUsage: (params?: { start_date?: string; end_date?: string; model?: string; feature?: string; limit?: number; offset?: number }) =>
    api.get("/api/v1/ai/usage", { params }),
  analyzeWebsite: (data: { website_url: string; content?: string }) =>
    api.post("/api/v1/ai/website/analyze", data),
};

export const scrapingAPI = {
  googleMapsSearch: (data: { keyword: string; location?: string; limit?: number }) =>
    api.post("/api/v1/scraping/google-maps/search", data),
  googleMapsCrawl: (data: { url: string }) =>
    api.post("/api/v1/scraping/google-maps/crawl", data),
  crawlWebsite: (data: { url: string; crawl_contact_pages?: boolean }) =>
    api.post("/api/v1/scraping/website/crawl", data),
  crawlWebsiteSync: (data: { url: string }) =>
    api.post("/api/v1/scraping/website/crawl/sync", data),
  enrichLinkedIn: (data: { linkedin_url: string }) =>
    api.post("/api/v1/scraping/linkedin/enrich", data),
  enrichLinkedInSync: (data: { linkedin_url: string }) =>
    api.post("/api/v1/scraping/linkedin/enrich/sync", data),
  parseCSV: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post("/api/v1/scraping/csv/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  importCSV: (file: File, mappings: any[], options: any) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mappings", JSON.stringify(mappings));
    formData.append("options", JSON.stringify(options));
    return api.post("/api/v1/scraping/csv/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  listJobs: (params?: { status?: string; limit?: number }) =>
    api.get("/api/v1/scraping/jobs", { params }),
  getJob: (jobId: string) =>
    api.get(`/api/v1/scraping/jobs/${jobId}`),
  cancelJob: (jobId: string) =>
    api.post(`/api/v1/scraping/jobs/${jobId}/cancel`),
  retryJob: (jobId: string) =>
    api.post(`/api/v1/scraping/jobs/${jobId}/retry`),
  getJobResults: (jobId: string, params?: { skip?: number; limit?: number }) =>
    api.get(`/api/v1/scraping/jobs/${jobId}/results`, { params }),
  bulkEnrich: (data: { lead_ids: number[]; enrich_websites?: boolean }) =>
    api.post("/api/v1/scraping/bulk/enrich", data),
  getStats: () =>
    api.get("/api/v1/scraping/stats"),
};

export { api };