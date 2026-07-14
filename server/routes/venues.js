import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/validate.js";
import { storeVenue, listVenues, loadVenue as loadVenueByID } from "../services/venueStore.js";

export const venueRouter = Router();

// GET /api/venues - List all available venues
venueRouter.get("/api/venues", (_req, res) => {
  try {
    const venues = listVenues();
    res.json({ venues });
  } catch (err) {
    res.status(500).json({ error: "Failed to list venues" });
  }
});

// GET /api/venues/:id - Get specific venue by ID
venueRouter.get("/api/venues/:id", (req, res) => {
  try {
    const venue = loadVenueByID(req.params.id);
    if (!venue) {
      return res.status(404).json({ error: "Venue not found" });
    }
    res.json({ venue });
  } catch (err) {
    res.status(500).json({ error: "Failed to load venue" });
  }
});

// POST /api/venues - Upload a new venue
const uploadSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/, "Venue ID must be alphanumeric with hyphens/underscores"),
  name: z.string().min(1).max(128),
  nodes: z.array(
    z.object({
      id: z.string().min(1).max(64),
      name: z.string().min(1).max(128),
      type: z.enum(["gate", "concourse", "section", "medical_post", "security_post", "lost_and_found", "accessible_entry"]),
      x: z.number().optional(),
      y: z.number().optional(),
    })
  ).min(1).max(100),
  edges: z.array(
    z.object({
      from: z.string().min(1).max(64),
      to: z.string().min(1).max(64),
      distance_m: z.number().positive(),
      step_free: z.boolean().optional(),
    })
  ).min(1).max(200),
});

venueRouter.post("/api/venues", validateBody(uploadSchema), async (req, res) => {
  try {
    const { id, name, nodes, edges } = req.validated;

    // Validate that all edges reference existing nodes
    const nodeIds = new Set(nodes.map((n) => n.id));
    for (const edge of edges) {
      if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
        return res.status(422).json({ error: "Edge references non-existent node" });
      }
    }

    // Store the venue
    storeVenue(id, { id, name, nodes, edges });

    res.status(201).json({ 
      venue: { id, name, nodes: nodes.length, edges: edges.length },
      message: "Venue uploaded successfully" 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload venue" });
  }
});
