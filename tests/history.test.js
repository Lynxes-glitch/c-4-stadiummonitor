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

describe("GET /api/history/:venueId/gates", () => {
  it("returns empty history for venue with no recorded data", async () => {
    const res = await fetch(`${baseUrl}/api/history/demo-stadium/gates`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.venueId, "demo-stadium");
    assert.ok(typeof data.history === "object");
  });
});

describe("GET /api/history/:venueId/gates/:gateId", () => {
  it("returns empty array for gate with no recorded data", async () => {
    const res = await fetch(`${baseUrl}/api/history/demo-stadium/gates/gate-a`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.history));
  });
});

describe("GET /api/history/:venueId/gates/:gateId/trend", () => {
  it("returns trend analysis for gate", async () => {
    const res = await fetch(`${baseUrl}/api/history/demo-stadium/gates/gate-a/trend`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.trend !== undefined);
    assert.strictEqual(data.gateId, "gate-a");
  });
});
