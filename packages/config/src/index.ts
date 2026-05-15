export const config = {
  api: {
    version: "v1",
    basePath: "/api/v1",
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },
  ai: {
    defaultModel: "llama3.2",
    temperature: 0.7,
    maxTokens: 500,
  },
  scraping: {
    defaultDelay: 2000,
    maxConcurrent: 5,
    retryAttempts: 3,
  },
  email: {
    dailyLimit: 500,
    rateLimitMs: 3000,
    bounceThreshold: 3,
  },
};

export type Config = typeof config;