// pathfinding.js
// Real shortest-path computation over the stadium graph — not a lookup table,
// not an AI guess. This is the deterministic core of the Navigation and
// Incident Triage features: the AI is only ever asked to phrase an already-
// correct route, never to invent one.

/**
 * Builds a bidirectional adjacency list from the raw edge list.
 * Pure function — no I/O, trivially testable.
 */
export function buildAdjacency(edges) {
  const adj = new Map();
  const add = (a, b, weight, stepFree) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push({ to: b, weight, stepFree });
  };
  for (const e of edges) {
    add(e.from, e.to, e.distance_m, e.step_free !== false);
    add(e.to, e.from, e.distance_m, e.step_free !== false);
  }
  return adj;
}

/**
 * Dijkstra's algorithm with an O(n) priority step (fine for a venue graph of
 * this size; a binary heap would be the next optimization for a much larger
 * graph, noted in docs/decisions.md).
 *
 * @param {Map} adjacency  from buildAdjacency()
 * @param {string} startId
 * @param {string} targetId
 * @param {boolean} requireStepFree  if true, edges marked step_free:false are excluded
 * @returns {{ path: string[], distanceMeters: number } | null}
 */
export function shortestPath(adjacency, startId, targetId, requireStepFree = false) {
  if (!adjacency.has(startId)) return null;
  if (startId === targetId) return { path: [startId], distanceMeters: 0 };

  const dist = new Map([[startId, 0]]);
  const prev = new Map();
  const visited = new Set();
  const queue = new Set([startId]);

  while (queue.size > 0) {
    // Pick the unvisited node with the smallest known distance.
    let current = null;
    let best = Infinity;
    for (const node of queue) {
      const d = dist.get(node);
      if (d < best) { best = d; current = node; }
    }
    queue.delete(current);
    if (current === targetId) break;
    visited.add(current);

    const neighbors = adjacency.get(current) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;
      if (requireStepFree && !edge.stepFree) continue;
      const candidate = (dist.get(current) ?? Infinity) + edge.weight;
      if (candidate < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, candidate);
        prev.set(edge.to, current);
        queue.add(edge.to);
      }
    }
  }

  if (!dist.has(targetId)) return null; // unreachable (e.g. step-free constraint blocks all routes)

  const path = [targetId];
  let cur = targetId;
  while (prev.has(cur)) {
    cur = prev.get(cur);
    path.unshift(cur);
  }
  if (path[0] !== startId) return null;

  return { path, distanceMeters: dist.get(targetId) };
}

/**
 * Finds the nearest node of a given type (e.g. "medical_post") to a start
 * node, by running shortestPath against every candidate and keeping the
 * closest. Used by both Wayfinding ("nearest accessible entry") and
 * Incident Triage ("nearest medical post").
 */
export function nearestNodeOfType(adjacency, nodesById, startId, type, requireStepFree = false) {
  const candidates = [...nodesById.values()].filter((n) => n.type === type);
  let best = null;
  for (const node of candidates) {
    const result = shortestPath(adjacency, startId, node.id, requireStepFree);
    if (!result) continue;
    if (!best || result.distanceMeters < best.result.distanceMeters) {
      best = { node, result };
    }
  }
  return best;
}

/** Rough walking-time estimate at a conservative crowd-adjusted pace. */
export function estimateWalkMinutes(distanceMeters) {
  const metersPerMinute = 60; // ~3.6 km/h, conservative for a crowded concourse
  return Math.max(1, Math.round(distanceMeters / metersPerMinute));
}
