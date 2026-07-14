import { describe, it, before, after } from "node:test";
import assert from "node:assert";
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

describe("GET /api/venues", () => {
  it("returns list of available venues", async () => {
    const res = await fetch(`${baseUrl}/api/venues`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.venues));
    assert.ok(data.venues.length >= 1);
    assert.ok(data.venues[0].id);
    assert.ok(data.venues[0].name);
  });
});

describe("GET /api/venues/:id", () => {
  it("returns venue details for valid ID", async () => {
    const res = await fetch(`${baseUrl}/api/venues/demo-stadium`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.venue.id, "demo-stadium");
    assert.ok(Array.isArray(data.venue.nodes));
    assert.ok(Array.isArray(data.venue.edges));
  });

  it("returns 404 for unknown venue ID", async () => {
    const res = await fetch(`${baseUrl}/api/venues/unknown-venue-xyz`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.ok(data.error.includes("not found"));
  });
});

describe("POST /api/venues", () => {
  it("rejects venue with invalid edge reference", async () => {
    const res = await fetch(`${baseUrl}/api/venues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "test-venue",
        name: "Test Venue",
        nodes: [
          { id: "node-a", name: "Node A", type: "gate" }
        ],
        edges: [
          { from: "node-a", to: "node-b", distance_m: 100, step_free: true }
        ]
      })
    });
    assert.strictEqual(res.status, 422);
  });
});
