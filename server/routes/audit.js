import { Router } from "express";
import { getAuditLog, getAuditLogByEndpoint, getAuditStats } from "../utils/audit-logger.js";

export const auditRouter = Router();

// GET /api/audit/log - Get recent AI decisions
auditRouter.get("/api/audit/log", (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const log = getAuditLog(limit);

    res.json({
      entries: log,
      count: log.length,
    });
  } catch (err) {
    console.error("Failed to fetch audit log:", err);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// GET /api/audit/log/:endpoint - Get audit log filtered by endpoint
auditRouter.get("/api/audit/log/:endpoint(*)", (req, res) => {
  try {
    const endpoint = `/${req.params.endpoint}`;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const log = getAuditLogByEndpoint(endpoint, limit);

    res.json({
      endpoint,
      entries: log,
      count: log.length,
    });
  } catch (err) {
    console.error("Failed to fetch audit log by endpoint:", err);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
});

// GET /api/audit/stats - Get audit statistics
auditRouter.get("/api/audit/stats", (_req, res) => {
  try {
    const stats = getAuditStats();
    res.json(stats);
  } catch (err) {
    console.error("Failed to fetch audit stats:", err);
    res.status(500).json({ error: "Failed to fetch audit statistics" });
  }
});
