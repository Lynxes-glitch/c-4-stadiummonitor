import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { classifyGate, findAlternativeGate, buildReasoningPrompt, explainGateStatus, THRESHOLDS, resetState, getState, tick } from "../server/services/crowd.js";

describe("classifyGate", () => {
  test("classifies low occupancy as ok", () => {
    assert.equal(classifyGate({ gate: "A", capacity: 1000, current: 100 }).status, "ok");
  });
  test("classifies at/above watch threshold as watch", () => {
    assert.equal(classifyGate({ gate: "A", capacity: 100, current: 70 }).status, "watch");
  });
  test("classifies at/above critical threshold as critical", () => {
    assert.equal(classifyGate({ gate: "A", capacity: 100, current: 85 }).status, "critical");
  });
  test("handles zero capacity without dividing by zero", () => {
    const g = classifyGate({ gate: "A", capacity: 0, current: 0 });
    assert.equal(g.ratio, 0);
    assert.equal(g.status, "ok");
  });
  test("handles over-100% occupancy as critical, not a crash", () => {
    const g = classifyGate({ gate: "A", capacity: 100, current: 140 });
    assert.equal(g.status, "critical");
    assert.ok(g.ratio > 1);
  });
});

describe("findAlternativeGate", () => {
  test("picks the lowest-ratio other gate", () => {
    const gates = [
      classifyGate({ gate: "A", capacity: 100, current: 90 }),
      classifyGate({ gate: "B", capacity: 100, current: 20 }),
      classifyGate({ gate: "C", capacity: 100, current: 50 }),
    ];
    assert.equal(findAlternativeGate(gates, "A").gate, "B");
  });
  test("returns null with no other gates", () => {
    const gates = [classifyGate({ gate: "A", capacity: 100, current: 90 })];
    assert.equal(findAlternativeGate(gates, "A"), null);
  });
});

describe("buildReasoningPrompt", () => {
  test("embeds real numbers, not placeholders", () => {
    const g = classifyGate({ gate: "C", capacity: 1000, current: 900 });
    const prompt = buildReasoningPrompt(g, null);
    assert.ok(prompt.includes("Gate C"));
    assert.ok(prompt.includes("90%"));
  });
});

import { config } from "../server/config.js";

describe("explainGateStatus", () => {
  test("returns null for a gate that is not in watch/critical", async () => {
    const g = classifyGate({ gate: "A", capacity: 1000, current: 100 });
    const result = await explainGateStatus(g, [g]);
    assert.equal(result, null);
  });

  test("fails closed with a labeled fallback when no AI provider is configured", async () => {
    const originalKey = config.aiApiKey;
    config.aiApiKey = null;
    try {
      const g = classifyGate({ gate: "C", capacity: 1000, current: 900 });
      const result = await explainGateStatus(g, [g]);
      assert.equal(result.source, "fallback");
      assert.ok(result.recommendation.includes("Gate C"));
      assert.equal(result.confidence, "low");
    } finally {
      config.aiApiKey = originalKey;
    }
  });
});

describe("simulation state", () => {
  beforeEach(() => resetState());

  test("resetState returns one entry per gate with valid fields", () => {
    const state = getState();
    assert.ok(state.length >= 6);
    state.forEach((g) => {
      assert.ok(g.capacity > 0);
      assert.ok(g.current >= 0);
    });
  });

  test("tick mutates occupancy without breaking invariants", () => {
    const before = getState();
    tick();
    const after = getState();
    assert.equal(before.length, after.length);
    after.forEach((g) => assert.ok(g.current >= 0));
  });

  test("threshold constants are sane (watch < critical)", () => {
    assert.ok(THRESHOLDS.watch < THRESHOLDS.critical);
  });
});
