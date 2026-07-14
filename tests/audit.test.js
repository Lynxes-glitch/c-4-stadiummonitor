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

describe("GET /api/audit/log", () => {
  it("returns empty audit log initially", async () => {
    const res = await fetch(`${baseUrl}/api/audit/log`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.entries));
    assert.strictEqual(data.count, data.entries.length);
  });

  it("respects limit query parameter", async () => {
    const res = await fetch(`${baseUrl}/api/audit/log?limit=10`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.entries.length <= 10);
  });
});

describe("GET /api/audit/log/:endpoint", () => {
  it("returns filtered audit log by endpoint", async () => {
    const res = await fetch(`${baseUrl}/api/audit/log/api/wayfinding`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.entries));
    assert.strictEqual(data.endpoint, "/api/wayfinding");
  });
});

describe("GET /api/audit/stats", () => {
  it("returns audit statistics", async () => {
    const res = await fetch(`${baseUrl}/api/audit/stats`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data === "object");
  });
});
