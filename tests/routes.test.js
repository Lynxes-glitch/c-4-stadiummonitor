import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("GET /api/health", () => {
  test("returns 200 and status ok", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "ok");
  });

  test("responses carry security headers", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.ok(res.headers.get("content-security-policy"));
    assert.equal(res.headers.get("x-frame-options"), "DENY");
  });
});

describe("GET /api/venue/nodes", () => {
  test("returns the venue node list", async () => {
    const res = await fetch(`${baseUrl}/api/venue/nodes`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.nodes));
    assert.ok(body.nodes.length > 0);
  });
});

describe("POST /api/wayfinding", () => {
  test("rejects a missing body field with 422, no internals leaked", async () => {
    const res = await fetch(`${baseUrl}/api/wayfinding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startNodeId: "gate-a" }), // missing targetNodeId
    });
    assert.equal(res.status, 422);
    const body = await res.json();
    assert.equal(body.error, "Invalid request");
    assert.ok(Array.isArray(body.fields));
  });

  test("computes a real route and degrades gracefully without an AI key", async () => {
    const res = await fetch(`${baseUrl}/api/wayfinding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startNodeId: "gate-a", targetNodeId: "medical-1" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.route.path.includes("gate-a"));
    assert.ok(body.route.path.includes("medical-1"));
    assert.ok(typeof body.directions === "string");
  });

  test("returns 404 for an unreachable/unknown node", async () => {
    const res = await fetch(`${baseUrl}/api/wayfinding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startNodeId: "gate-a", targetNodeId: "not-a-real-node" }),
    });
    assert.equal(res.status, 404);
  });
});

describe("GET/POST /api/crowd/*", () => {
  test("status returns classified gates", async () => {
    const res = await fetch(`${baseUrl}/api/crowd/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.gates.length > 0);
    body.gates.forEach((g) => assert.ok(["ok", "watch", "critical"].includes(g.status)));
  });

  test("tick advances state without error", async () => {
    const res = await fetch(`${baseUrl}/api/crowd/tick`, { method: "POST" });
    assert.equal(res.status, 200);
  });
});

describe("POST /api/incident/triage", () => {
  test("rejects an invalid incident type with 422", async () => {
    const res = await fetch(`${baseUrl}/api/incident/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incidentType: "not_real", description: "x", reporterNodeId: "gate-a" }),
    });
    assert.equal(res.status, 422);
  });

  test("finds a real responder post and degrades gracefully without an AI key", async () => {
    const res = await fetch(`${baseUrl}/api/incident/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentType: "medical",
        description: "A fan feels dizzy near section 101.",
        reporterNodeId: "gate-a",
      }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.responderPost);
    assert.ok(["low", "medium", "high", "unknown"].includes(body.severity));
  });
});

describe("POST /api/translate", () => {
  test("rejects an empty message with 422", async () => {
    const res = await fetch(`${baseUrl}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    assert.equal(res.status, 422);
  });

  test("degrades gracefully without an AI key configured", async () => {
    const res = await fetch(`${baseUrl}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Necesito ayuda" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.translation);
  });
});
