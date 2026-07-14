import { describe, it } from "node:test";
import assert from "node:assert";
import { safeParseJSON } from "../server/services/aiProvider.js";

describe("safeParseJSON", () => {
  it("parses valid JSON", () => {
    const result = safeParseJSON('{"key": "value"}');
    assert.deepStrictEqual(result, { key: "value" });
  });

  it("extracts JSON from text with surrounding content", () => {
    const result = safeParseJSON('Here is some text {"key": "value"} and more text');
    assert.deepStrictEqual(result, { key: "value" });
  });

  it("returns null for invalid JSON", () => {
    const result = safeParseJSON('not json at all');
    assert.strictEqual(result, null);
  });

  it("returns null for empty string", () => {
    const result = safeParseJSON('');
    assert.strictEqual(result, null);
  });

  it("returns null for null input", () => {
    const result = safeParseJSON(null);
    assert.strictEqual(result, null);
  });

  it("handles nested JSON objects", () => {
    const result = safeParseJSON('{"outer": {"inner": "value"}}');
    assert.deepStrictEqual(result, { outer: { inner: "value" } });
  });

  it("handles JSON arrays", () => {
    const result = safeParseJSON('{"items": [1, 2, 3]}');
    assert.deepStrictEqual(result, { items: [1, 2, 3] });
  });
});
