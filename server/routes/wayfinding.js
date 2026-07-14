import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { aiRateLimiter } from "../middleware/rateLimit.js";
import { loadVenue } from "../services/venueStore.js";
import { computeRoute, phraseDirections, RouteError } from "../services/wayfinding.js";

export const wayfindingRouter = Router();

const schema = z.object({
  startNodeId: z.string().min(1).max(64),
  targetNodeId: z.string().min(1).max(64),
  language: z.string().min(2).max(32).default("English"),
  requireStepFree: z.boolean().default(false),
});

wayfindingRouter.post("/api/wayfinding", aiRateLimiter, validateBody(schema), async (req, res) => {
  const { startNodeId, targetNodeId, language, requireStepFree } = req.validated;
  const venue = loadVenue();

  let route;
  try {
    route = computeRoute(venue, startNodeId, targetNodeId, requireStepFree);
  } catch (err) {
    if (err instanceof RouteError) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal error computing route." });
  }

  const phrased = await phraseDirections(route, language);
  res.json({ route, directions: phrased.directions, directionsSource: phrased.source });
});

wayfindingRouter.get("/api/venue/nodes", (_req, res) => {
  const venue = loadVenue();
  res.json({ nodes: venue.nodes });
});

wayfindingRouter.get("/api/venue/edges", (_req, res) => {
  const venue = loadVenue();
  res.json({ edges: venue.edges });
});
