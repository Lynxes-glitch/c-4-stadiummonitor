import { describe, it } from "node:test";
import assert from "node:assert";
import { askCopilot } from "../server/services/copilotChat.js";

const mockVenue = {
  id: "test-venue",
  name: "Test Stadium",
  nodes: [
    { id: "gate-a", name: "Gate A", type: "gate", x: 100, y: 100 },
    { id: "gate-b", name: "Gate B", type: "gate", x: 200, y: 100 },
    { id: "medical-1", name: "Medical Post 1", type: "medical_post", x: 150, y: 150 }
  ],
  edges: [
    { from: "gate-a", to: "medical-1", distance_m: 50, step_free: true },
    { from: "gate-b", to: "medical-1", distance_m: 60, step_free: true }
  ]
};

const mockGateStatuses = [
  { gate: "gate-a", current: 50, capacity: 100, ratio: 0.5, status: "ok" },
  { gate: "gate-b", current: 90, capacity: 100, ratio: 0.9, status: "critical" }
];

describe("askCopilot", () => {
  it("rejects empty question with fallback", async () => {
    const result = await askCopilot("", mockVenue, mockGateStatuses);
    assert.strictEqual(result.source, "fallback");
    assert.ok(result.reply.includes("valid question"));
  });

  it("returns smart fallback when no AI provider configured", async () => {
    const result = await askCopilot("What gates are congested?", mockVenue, mockGateStatuses);
    assert.strictEqual(result.source, "fallback");
    assert.ok(result.reply);
    assert.ok(["low", "medium", "high"].includes(result.confidence));
  });

  it("smart fallback mentions critical gates", async () => {
    const result = await askCopilot("gate status", mockVenue, mockGateStatuses);
    assert.strictEqual(result.source, "fallback");
    assert.ok(result.reply.toLowerCase().includes("b") || result.reply.toLowerCase().includes("critical"));
  });

  it("smart fallback returns a reply", async () => {
    const result = await askCopilot("where is medical", mockVenue, mockGateStatuses);
    assert.strictEqual(result.source, "fallback");
    assert.ok(result.reply);
    assert.ok(result.reply.length > 0);
  });
});
