import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { aiRateLimiter } from "../middleware/rateLimit.js";
import { loadVenue } from "../services/venueStore.js";
import { triageIncident, TriageError, INCIDENT_TYPES } from "../services/incidentTriage.js";
import { logAIDecision } from "../utils/audit-logger.js";

export const incidentRouter = Router();

const schema = z.object({
  incidentType: z.enum(Object.keys(INCIDENT_TYPES)),
  description: z.string().min(1).max(500),
  reporterNodeId: z.string().min(1).max(64),
  language: z.string().min(2).max(32).default("English"),
});

incidentRouter.post("/api/incident/triage", aiRateLimiter, validateBody(schema), async (req, res) => {
  const venue = loadVenue();
  try {
    const result = await triageIncident(venue, req.validated);
    
    if (result.source === "model") {
      logAIDecision({
        endpoint: "/api/incident/triage",
        inputs: `${req.validated.incidentType} incident`,
        aiResponse: result.dispatch_instruction,
        confidence: result.confidence || "medium",
        source: result.source,
      });
    }
    
    res.json(result);
  } catch (err) {
    if (err instanceof TriageError) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal error during triage." });
  }
});
