import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeRoute, RouteError } from "../server/services/wayfinding.js";
import { buildAdjacency } from "../server/services/pathfinding.js";

function makeVenue() {
  const nodes = [
    { id: "a", name: "A", type: "gate" },
    { id: "b", name: "B", type: "concourse" },
    { id: "c", name: "C", type: "section" },
  ];
  const edges = [
    { from: "a", to: "b", distance_m: 10, step_free: true },
    { from: "b", to: "c", distance_m: 15, step_free: true },
  ];
  return { nodes, nodesById: new Map(nodes.map((n) => [n.id, n])), adjacency: buildAdjacency(edges) };
}

describe("computeRoute", () => {
  test("returns the full route with distance and walk time", () => {
    const venue = makeVenue();
    const route = computeRoute(venue, "a", "c");
    assert.deepEqual(route.path, ["a", "b", "c"]);
    assert.equal(route.distanceMeters, 25);
    assert.ok(route.walkMinutes >= 1);
  });

  test("throws RouteError for an unknown start node", () => {
    const venue = makeVenue();
    assert.throws(() => computeRoute(venue, "zzz", "c"), RouteError);
  });

  test("throws RouteError for an unknown target node", () => {
    const venue = makeVenue();
    assert.throws(() => computeRoute(venue, "a", "zzz"), RouteError);
  });
});
