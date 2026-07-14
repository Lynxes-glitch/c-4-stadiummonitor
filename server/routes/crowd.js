import { Router } from "express";
import { aiRateLimiter } from "../middleware/rateLimit.js";
import * as crowd from "../services/crowd.js";
import { logAIDecision, getAuditLog, getAuditStats } from "../utils/audit-logger.js";

export const crowdRouter = Router();

crowdRouter.get("/api/crowd/status", async (_req, res) => {
  const classified = crowd.getState().map(crowd.classifyGate);
  res.json({ gates: classified });
});

crowdRouter.post("/api/crowd/tick", (_req, res) => {
  const classified = crowd.tick().map(crowd.classifyGate);
  res.json({ gates: classified });
});

crowdRouter.post("/api/crowd/reset", (_req, res) => {
  const classified = crowd.resetState().map(crowd.classifyGate);
  res.json({ gates: classified });
});

// Explainable reasoning pass: for every gate currently in watch/critical,
// ask the AI layer for a grounded recommendation. Rate-limited because this
// is the AI-calling endpoint.
crowdRouter.post("/api/crowd/explain", aiRateLimiter, async (_req, res) => {
  const classified = crowd.getState().map(crowd.classifyGate);
  const attention = classified.filter((g) => g.status !== "ok");

  const results = await Promise.all(
    attention.map(async (g) => {
      const explanation = await crowd.explainGateStatus(g, classified);
      // Log each AI decision for explainability
      if (explanation && explanation.source === "model") {
        logAIDecision({
          endpoint: "/api/crowd/explain",
          inputs: `Gate ${g.gate} at ${Math.round(g.ratio * 100)}% capacity`,
          aiResponse: explanation.recommendation,
          confidence: explanation.confidence || "medium",
          source: explanation.source,
        });
      }
      return {
        gate: g.gate,
        status: g.status,
        ratio: g.ratio,
        ...explanation,
      };
    })
  );

  res.json({ recommendations: results });
});

crowdRouter.get("/api/audit/decisions", (_req, res) => {
  const limit = Math.min(parseInt(_req.query.limit) || 50, 500);
  res.json({ decisions: getAuditLog(limit) });
});

crowdRouter.get("/api/audit/stats", (_req, res) => {
  res.json(getAuditStats());
});
