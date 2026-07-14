import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildTranslationPrompt, translateFanMessage } from "../server/services/i18n.js";

describe("buildTranslationPrompt", () => {
  test("embeds the fan's raw message for grounding", () => {
    const prompt = buildTranslationPrompt("Necesito ayuda", "English");
    assert.ok(prompt.includes("Necesito ayuda"));
  });
  test("asks for tone classification, not just translation", () => {
    const prompt = buildTranslationPrompt("hello", "French");
    assert.ok(prompt.toLowerCase().includes("tone"));
  });
  test("includes the requested target language", () => {
    const prompt = buildTranslationPrompt("hello", "Japanese");
    assert.ok(prompt.includes("Japanese"));
  });
});

import { config } from "../server/config.js";

describe("translateFanMessage fallback", () => {
  test("fails closed and echoes the raw message when no AI provider is configured", async () => {
    const originalKey = config.aiApiKey;
    config.aiApiKey = null;
    try {
      const result = await translateFanMessage("Necesito ayuda", "English");
      assert.equal(result.source, "fallback");
      assert.equal(result.translation, "Necesito ayuda");
    } finally {
      config.aiApiKey = originalKey;
    }
  });
});
