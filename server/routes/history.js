import { Router } from "express";
import { getGateHistory, getAllGatesHistory, analyzeGateTrend } from "../services/historicalData.js";

export const historyRouter = Router();

// GET /api/history/:venueId/gates - Get history for all gates in a venue
historyRouter.get("/api/history/:venueId/gates", (req, res) => {
  try {
    const { venueId } = req.params;
    const sinceMs = req.query.since ? parseInt(req.query.since, 10) : 0;

    const history = getAllGatesHistory(venueId, sinceMs);

    res.json({
      venueId,
      history,
      dataPoints: Object.values(history).reduce((sum, h) => sum + h.length, 0)
    });
  } catch (err) {
    console.error("Failed to fetch gate history:", err);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

// GET /api/history/:venueId/gates/:gateId - Get history for specific gate
historyRouter.get("/api/history/:venueId/gates/:gateId", (req, res) => {
  try {
    const { venueId, gateId } = req.params;
    const sinceMs = req.query.since ? parseInt(req.query.since, 10) : 0;

    const history = getGateHistory(venueId, gateId, sinceMs);

    res.json({
      venueId,
      gateId,
      history,
      dataPoints: history.length
    });
  } catch (err) {
    console.error("Failed to fetch gate history:", err);
    res.status(500).json({ error: "Failed to fetch historical data" });
  }
});

// GET /api/history/:venueId/gates/:gateId/trend - Get trend analysis for a gate
historyRouter.get("/api/history/:venueId/gates/:gateId/trend", (req, res) => {
  try {
    const { venueId, gateId } = req.params;
    const windowMinutes = req.query.window ? parseInt(req.query.window, 10) : 60;

    const trend = analyzeGateTrend(venueId, gateId, windowMinutes);

    res.json({
      venueId,
      gateId,
      windowMinutes,
      trend
    });
  } catch (err) {
    console.error("Failed to analyze trend:", err);
    res.status(500).json({ error: "Failed to analyze trend" });
  }
});
