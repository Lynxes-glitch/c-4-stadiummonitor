import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildAdjacency, shortestPath, nearestNodeOfType, estimateWalkMinutes } from "../server/services/pathfinding.js";

describe("buildAdjacency", () => {
  test("creates bidirectional edges", () => {
    const adj = buildAdjacency([{ from: "a", to: "b", distance_m: 10, step_free: true }]);
    assert.equal(adj.get("a")[0].to, "b");
    assert.equal(adj.get("b")[0].to, "a");
  });
});

describe("shortestPath", () => {
  const edges = [
    { from: "a", to: "b", distance_m: 5, step_free: true },
    { from: "b", to: "c", distance_m: 5, step_free: true },
    { from: "a", to: "c", distance_m: 20, step_free: true },
    { from: "c", to: "d", distance_m: 5, step_free: false },
  ];
  const adj = buildAdjacency(edges);

  test("finds the shorter of two routes, not just any route", () => {
    const result = shortestPath(adj, "a", "c");
    assert.deepEqual(result.path, ["a", "b", "c"]);
    assert.equal(result.distanceMeters, 10);
  });

  test("returns zero-length path when start equals target", () => {
    const result = shortestPath(adj, "a", "a");
    assert.deepEqual(result.path, ["a"]);
    assert.equal(result.distanceMeters, 0);
  });

  test("returns null for unknown start node", () => {
    assert.equal(shortestPath(adj, "zzz", "a"), null);
  });

  test("returns null for unreachable target", () => {
    assert.equal(shortestPath(adj, "a", "nonexistent"), null);
  });

  test("respects requireStepFree and excludes non-step-free edges", () => {
    const result = shortestPath(adj, "a", "d", true);
    assert.equal(result, null, "d is only reachable via a non-step-free edge");
  });

  test("allows the route when step-free is not required", () => {
    const result = shortestPath(adj, "a", "d", false);
    assert.deepEqual(result.path, ["a", "b", "c", "d"]);
  });
});

describe("nearestNodeOfType", () => {
  const nodes = [
    { id: "gate-a", type: "gate" },
    { id: "medical-1", type: "medical_post" },
    { id: "medical-2", type: "medical_post" },
  ];
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const edges = [
    { from: "gate-a", to: "medical-1", distance_m: 100, step_free: true },
    { from: "gate-a", to: "medical-2", distance_m: 10, step_free: true },
  ];
  const adj = buildAdjacency(edges);

  test("picks the closer node of the requested type", () => {
    const best = nearestNodeOfType(adj, nodesById, "gate-a", "medical_post");
    assert.equal(best.node.id, "medical-2");
    assert.equal(best.result.distanceMeters, 10);
  });

  test("returns null when no node of that type exists", () => {
    const best = nearestNodeOfType(adj, nodesById, "gate-a", "security_post");
    assert.equal(best, null);
  });
});

describe("estimateWalkMinutes", () => {
  test("never returns less than 1 minute", () => {
    assert.equal(estimateWalkMinutes(1), 1);
  });
  test("scales roughly with distance", () => {
    assert.ok(estimateWalkMinutes(600) > estimateWalkMinutes(60));
  });
});
