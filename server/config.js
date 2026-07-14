// config.js
// Single source of truth for environment-driven configuration. Nothing
// outside this file should call process.env directly, so secrets have
// exactly one entry point to audit.

import "dotenv/config";

function firstConfiguredProvider() {
  if (process.env.OPENROUTER_API_KEY) return { provider: "openrouter", key: process.env.OPENROUTER_API_KEY };
  if (process.env.OPENAI_API_KEY) return { provider: "openai", key: process.env.OPENAI_API_KEY };
  if (process.env.GEMINI_API_KEY) return { provider: "gemini", key: process.env.GEMINI_API_KEY };
  if (process.env.ANTHROPIC_API_KEY) return { provider: "anthropic", key: process.env.ANTHROPIC_API_KEY };
  return { provider: null, key: null };
}

const { provider, key } = firstConfiguredProvider();

export const config = {
  port: Number(process.env.PORT) || 3000,
  aiProvider: process.env.AI_PROVIDER || provider,
  aiApiKey: key,
  openrouterModel: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE) || 20,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",").map((s) => s.trim()),
  nodeEnv: process.env.NODE_ENV || "development",
};

// Application configuration constants
export const appConfig = {
  crowd: {
    watchThreshold: 0.7,
    criticalThreshold: 0.85,
  },
  history: {
    maxPoints: 288, // 24 hours at 5-minute intervals
    sampleIntervalMs: 5 * 60 * 1000, // 5 minutes
  },
  ai: {
    requestIntervalMs: 300,
    requestTimeoutMs: 3000,
    cacheTtlMs: 120000, // 2 minutes
    cacheMaxSize: 500,
  },
  audit: {
    maxEntries: 500,
  },
  pathfinding: {
    cacheMaxSize: 1000,
  },
};
