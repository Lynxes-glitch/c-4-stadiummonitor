// rateLimit.js
// Per-IP rate limiting applied only to AI-calling routes, so the configured
// API key can't be exhausted by a single abusive client. Non-AI routes
// (static assets, health check) are unaffected.

import rateLimit from "express-rate-limit";
import { config } from "../config.js";

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimitPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

export const auditRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
