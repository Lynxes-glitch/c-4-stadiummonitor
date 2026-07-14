// venueStore.js
import { logger } from "../utils/logger.js";
// Loads and indexes venue graphs. Supports both static venue files
// and dynamically uploaded venues. All venues are indexed for fast lookup.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { buildAdjacency } from "./pathfinding.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");

// In-memory venue store
const venues = new Map();
let defaultVenueId = "demo-stadium";
let initialized = false;

/**
 * Load all venue JSON files from data directory
 */
function initializeVenues() {
  if (initialized) return;

  try {
    const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));

    for (const file of files) {
      try {
        const filePath = path.join(DATA_DIR, file);
        const raw = readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw);

        // Build indexes
        const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
        const adjacency = buildAdjacency(data.edges);
        const venue = { ...data, nodesById, adjacency };

        venues.set(data.id, venue);
        logger.info(`Loaded venue: ${data.name} (${data.id})`);
      } catch (err) {
        logger.error(`Failed to load venue from ${file}:`, err.message);
      }
    }

    // Set default to first venue if demo-stadium doesn't exist
    if (!venues.has(defaultVenueId) && venues.size > 0) {
      defaultVenueId = Array.from(venues.keys())[0];
    }

    initialized = true;
    logger.info(`Initialized ${venues.size} venues, default: ${defaultVenueId}`);
  } catch (err) {
    logger.error("Failed to initialize venues:", err);
  }
}

/**
 * Load a venue by ID (returns default if not found)
 * @param {string} venueId - The venue ID to load (defaults to default venue)
 * @returns {Object} Venue object with nodes, edges, nodesById, adjacency
 */
export function loadVenue(venueId = defaultVenueId) {
  if (!initialized) {
    initializeVenues();
  }

  const venue = venues.get(venueId);
  if (!venue && venues.size > 0) {
    // Return default if not found
    return venues.get(defaultVenueId);
  }

  return venue;
}

/**
 * Store a new venue
 * @param {string} id - Unique venue ID
 * @param {Object} data - Venue data {id, name, nodes, edges}
 */
export function storeVenue(id, data) {
  if (!initialized) {
    initializeVenues();
  }

  const nodesById = new Map(data.nodes.map((n) => [n.id, n]));
  const adjacency = buildAdjacency(data.edges);
  const venue = { ...data, nodesById, adjacency };
  venues.set(id, venue);

  return venue;
}

/**
 * List all available venues (metadata only)
 * @returns {Array} Array of venue metadata {id, name, n, edgeCount}
 */
export function listVenues() {
  if (!initialized) {
    initializeVenues();
  }

  return Array.from(venues.values()).map((v) => ({
    id: v.id,
    name: v.name || "Unnamed Venue",
    nodeCount: v.nodes ? v.nodes.length : 0,
    edgeCount: v.edges ? v.edges.length : 0,
  }));
}

/**
 * Set the default venue ID
 * @param {string} id - The venue ID to use as default
 * @returns {boolean} True if successful, false if venue not found
 */
export function setDefaultVenue(id) {
  if (!initialized) {
    initializeVenues();
  }

  if (!venues.has(id)) {
    return false;
  }
  defaultVenueId = id;
  return true;
}

/**
 * Get the current default venue ID
 * @returns {string} Current default venue ID
 */
export function getDefaultVenueId() {
  if (!initialized) {
    initializeVenues();
  }
  return defaultVenueId;
}
