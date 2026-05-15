const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const config = {
  api: {
    baseUrl: API_URL,
    endpoints: {
      auth: {
        login: `${API_URL}/api/v1/auth/login`,
        register: `${API_URL}/api/v1/auth/register`,
        refresh: `${API_URL}/api/v1/auth/refresh`,
        me: `${API_URL}/api/v1/auth/me`,
      },
      campaigns: `${API_URL}/api/v1/campaigns`,
      leads: `${API_URL}/api/v1/leads`,
      users: `${API_URL}/api/v1/users`,
      tasks: `${API_URL}/api/v1/tasks`,
    },
  },
  app: {
    url: APP_URL,
  },
  polling: {
    campaigns: parseInt(process.env.NEXT_PUBLIC_POLLING_CAMPAIGNS || "30000"),
    leads: parseInt(process.env.NEXT_PUBLIC_POLLING_LEADS || "15000"),
    emails: parseInt(process.env.NEXT_PUBLIC_POLLING_EMAILS || "10000"),
    tasks: parseInt(process.env.NEXT_PUBLIC_POLLING_TASKS || "5000"),
  },
};

export const API_ENDPOINTS = config.api.endpoints;