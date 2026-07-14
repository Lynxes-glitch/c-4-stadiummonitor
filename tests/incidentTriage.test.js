import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { findResponderPost, triageIncident, TriageError, INCIDENT_TYPES } from "../server/services/incidentTriage.js";
import { buildAdjacency } from "../server/services/pathfinding.js";

function makeVenue() {
  const nodes = [
    { id: "gate-a", name: "Gate A", type: "gate" },
    { id: "medical-1", name: "Medical Post 1", type: "medical_post" },
    { id: "medical-2", name: "Medical Post 2", type: "medical_post" },
    { id: "security-1", name: "Security Post 1", type: "security_post" },
  ];
  const edges = [
    { from: "gate-a", to: "medical-1", distance_m: 100, step_free: true },
    { from: "gate-a", to: "medical-2", distance_m: 20, step_free: true },
    { from: "gate-a", to: "security-1", distance_m: 40, step_free: true },
  ];
  return {
    nodes,
    nodesById: new Map(nodes.map((n) => [n.id, n])),
    adjacency: buildAdjacency(edges),
  };
}

describe("INCIDENT_TYPES", () => {
  test("every declared incident type maps to a valid node type string", () => {
    Object.values(INCIDENT_TYPES).forEach((t) => assert.equal(typeof t, "string"));
  });
});

describe("findResponderPost", () => {
  test("finds the nearest post of the correct type for a medical incident", () => {
    const venue = makeVenue();
    const result = findResponderPost(venue, "gate-a", "medical");
    assert.equal(result.node.id, "medical-2");
  });

  test("finds the correct post for a security incident", () => {
    const venue = makeVenue();
    const result = findResponderPost(venue, "gate-a", "security");
    assert.equal(result.node.id, "security-1");
  });

  test("throws TriageError for an unknown incident type", () => {
    const venue = makeVenue();
    assert.throws(() => findResponderPost(venue, "gate-a", "not_a_real_type"), TriageError);
  });

  test("throws TriageError for an unknown reporter location", () => {
    const venue = makeVenue();
    assert.throws(() => findResponderPost(venue, "nowhere", "medical"), TriageError);
  });

  test("throws TriageError when no post of the required type is reachable", () => {
    const venue = makeVenue();
    // lost_and_found doesn't exist in this small fixture venue
    assert.throws(() => findResponderPost(venue, "gate-a", "lost_person"), TriageError);
  });
});

import { config } from "../server/config.js";

describe("triageIncident (fallback path, no AI provider configured)", () => {
  test("still returns a grounded responder post and a labeled fallback severity", async () => {
    const originalKey = config.aiApiKey;
    config.aiApiKey = null;
    try {
      const venue = makeVenue();
      const result = await triageIncident(venue, {
        incidentType: "medical",
        description: "Someone feels unwell near the gate.",
        reporterNodeId: "gate-a",
        language: "English",
      });
      assert.equal(result.source, "fallback");
      assert.equal(result.responderPostId, "medical-2");
      assert.equal(result.severity, "unknown");
      assert.ok(result.dispatch_instruction.includes("Medical Post 2"));
    } finally {
      config.aiApiKey = originalKey;
    }
  });
});
