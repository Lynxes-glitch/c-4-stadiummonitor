// wayfinding.js
// The route itself (which nodes, in what order, over what distance) is
// computed entirely by shortestPath() — deterministic Dijkstra over the
// venue graph. The AI is only ever asked to phrase that already-correct
// route naturally in the fan's language; it is explicitly forbidden from
// inventing directions, distances, or landmarks not in the computed path.

import { shortestPath, estimateWalkMinutes } from "./pathfinding.js";
import { callModel } from "./aiProvider.js";

export class RouteError extends Error {}

export function computeRoute(venue, startId, targetId, requireStepFree = false) {
  if (!venue.nodesById.has(startId)) throw new RouteError(`Unknown start node: ${startId}`);
  if (!venue.nodesById.has(targetId)) throw new RouteError(`Unknown target node: ${targetId}`);

  const result = shortestPath(venue.adjacency, startId, targetId, requireStepFree);
  if (!result) {
    throw new RouteError(
      requireStepFree
        ? "No step-free route exists between these points."
        : "No route exists between these points."
    );
  }

  const steps = result.path.map((id) => venue.nodesById.get(id));
  return {
    path: result.path,
    steps,
    distanceMeters: result.distanceMeters,
    walkMinutes: estimateWalkMinutes(result.distanceMeters),
  };
}

function buildDirectionsPrompt(route, language) {
  const stepNames = route.steps.map((s) => s.name);
  return [
    `You are a wayfinding assistant. Phrase the following already-computed route as short, natural walking directions in ${language}.`,
    "Do not add any landmark, distance, or instruction that is not implied by this exact sequence of waypoints — you may only rephrase, not invent.",
    `Waypoints in order: ${stepNames.join(" -> ")}.`,
    `Total distance: ${route.distanceMeters} meters. Estimated walk time: ${route.walkMinutes} minutes.`,
    "Respond ONLY as compact JSON with key: directions (a single string, 2-4 short sentences).",
  ].join("\n");
}

export async function phraseDirections(route, language = "English") {
  const prompt = buildDirectionsPrompt(route, language);
  try {
    const raw = await callModel(prompt);
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    if (!parsed.directions) throw new Error("missing directions field");
    return { directions: parsed.directions, source: "model" };
  } catch (err) {
    // Fail closed with a plain, still-correct fallback built from the route
    // itself — never a fabricated sentence pretending to be AI output.
    const fallback = route.steps.map((s) => s.name).join(" → ");
    return {
      directions: `Follow this route: ${fallback} (${route.distanceMeters}m, ~${route.walkMinutes} min). AI phrasing unavailable: ${err.message}`,
      source: "fallback",
    };
  }
}
