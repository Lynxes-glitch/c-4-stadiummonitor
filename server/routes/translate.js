import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { aiRateLimiter } from "../middleware/rateLimit.js";
import { translateFanMessage } from "../services/i18n.js";
import { askCopilot } from "../services/copilotChat.js";
import { loadVenue } from "../services/venueStore.js";
import * as crowd from "../services/crowd.js";
import { logAIDecision } from "../utils/audit-logger.js";

export const translateRouter = Router();

const schema = z.object({
  message: z.string().min(1).max(500),
  targetLanguage: z.string().min(2).max(32).default("English"),
});

translateRouter.post("/api/translate", aiRateLimiter, validateBody(schema), async (req, res) => {
  const { message, targetLanguage } = req.validated;
  const result = await translateFanMessage(message, targetLanguage);
  
  if (result.source === "model") {
    logAIDecision({
      endpoint: "/api/translate",
      inputs: `Translate to ${targetLanguage}`,
      aiResponse: result.translation,
      confidence: result.confidence || "medium",
      source: result.source,
    });
  }
  
  res.json(result);
});

const chatSchema = z.object({
  message: z.string().min(1).max(500),
  activeIncidents: z.array(z.any()).optional().default([]),
});

translateRouter.post("/api/chat", aiRateLimiter, validateBody(chatSchema), async (req, res) => {
  const { message, activeIncidents } = req.validated;
  const venue = loadVenue();
  const gateStatuses = crowd.getState().map(crowd.classifyGate);
  
  const response = await askCopilot(message, venue, gateStatuses, activeIncidents);
  
  if (response.source === "model") {
    logAIDecision({
      endpoint: "/api/chat",
      inputs: message.slice(0, 100),
      aiResponse: response.reply,
      confidence: response.confidence || "medium",
      source: response.source,
    });
  }
  
  res.json(response);
});
