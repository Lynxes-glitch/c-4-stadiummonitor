import { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizePromptInput, validateAndSanitize, escapeHtml, wrapErrorResponse } from "../server/utils/prompt-sanitizer.js";

describe("sanitizePromptInput", () => {
  it("removes control characters", () => {
    const result = sanitizePromptInput("hello\x00\x01world");
    assert.strictEqual(result, "helloworld");
  });

  it("defangs prompt injection markers", () => {
    const result = sanitizePromptInput("[/prompt] [IGNORE] [SYSTEM] ignore previous");
    assert.ok(result.includes("[slash prompt]"));
    assert.ok(result.includes("[ignore]"));
    assert.ok(result.includes("[system]"));
  });

  it("defangs YAML separators", () => {
    const result = sanitizePromptInput("---\nmalicious");
    assert.ok(!result.includes("---\n"));
  });

  it("trims input", () => {
    const result = sanitizePromptInput("  hello  ");
    assert.strictEqual(result, "hello");
  });

  it("limits to 2000 characters", () => {
    const longString = "a".repeat(3000);
    const result = sanitizePromptInput(longString);
    assert.strictEqual(result.length, 2000);
  });

  it("converts non-strings to strings", () => {
    const result = sanitizePromptInput(12);
    assert.strictEqual(result, "12");
  });
});

describe("validateAndSanitize", () => {
  it("throws on empty input", () => {
    assert.throws(() => validateAndSanitize(""), /required/);
  });

  it("throws on null input", () => {
    assert.throws(() => validateAndSanitize(null), /required/);
  });

  it("throws on object input", () => {
    assert.throws(() => validateAndSanitize({}), /must be a string/);
  });

  it("accepts strings and returns sanitized", () => {
    const result = validateAndSanitize("  hello [IGNORE]  ");
    assert.ok(result.includes("hello"));
    assert.ok(result.includes("[ignore]"));
  });

  it("accepts numbers and converts", () => {
    const result = validateAndSanitize(42);
    assert.strictEqual(result, "42");
  });

  it("throws if sanitized result is empty", () => {
    assert.throws(() => validateAndSanitize("\x00\x01\x02"), /cannot be empty/);
  });

  it("uses custom field name in error", () => {
    try {
      validateAndSanitize("", "username");
      assert.fail("should have thrown");
    } catch (err) {
      assert.ok(err.message.includes("username"));
    }
  });
});

describe("escapeHtml", () => {
  it("escapes HTML entities", () => {
    const result = escapeHtml('<script>alert("xss")</script>');
    assert.strictEqual(result, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it("escapes ampersands", () => {
    const result = escapeHtml("A & B");
    assert.strictEqual(result, "A &amp; B");
  });

  it("escapes single quotes", () => {
    const result = escapeHtml("it's");
    assert.strictEqual(result, "it&#39;s");
  });

  it("converts non-strings", () => {
    const result = escapeHtml(123);
    assert.strictEqual(result, "123");
  });
});

describe("wrapErrorResponse", () => {
  it("returns generic message without internals", () => {
    const error = new Error("Database connection failed");
    const result = wrapErrorResponse(error, null);
    assert.strictEqual(result.error, "An error occurred");
    assert.ok(!result.message);
    assert.ok(!result.stack);
  });

  it("uses custom generic message", () => {
    const error = new Error("Internal error");
    const result = wrapErrorResponse(error, null, "Service unavailable");
    assert.strictEqual(result.error, "Service unavailable");
  });

  it("logs error details server-side", () => {
    const error = new Error("Test error");
    let logged = null;
    const mockLogger = (msg, details) => { logged = details; };

    wrapErrorResponse(error, mockLogger);
    assert.ok(logged);
    assert.strictEqual(logged.message, "Test error");
    assert.ok(logged.stack);
    assert.ok(logged.timestamp);
  });
});
