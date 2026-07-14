// i18n.js
// Context-aware translation: the model is asked to infer register/urgency
// from the fan's message (casual vs. urgent vs. medical vs. accessibility),
// not just translate words, per the challenge brief's own framing of what
// makes multilingual support a "real prompt design problem."

import { callModel, safeParseJSON, AIProviderError } from "./aiProvider.js";
import { sanitizePromptInput } from "../utils/prompt-sanitizer.js";
import { logAIDecision } from "../utils/audit-logger.js";

export function buildTranslationPrompt(fanMessage, targetLanguage) {
  const sanitizedMessage = sanitizePromptInput(fanMessage);
  return [
    "You are a multilingual assistant for a stadium volunteer.",
    "A fan just said the following to a volunteer who may not share their language:",
    `"""${sanitizedMessage}"""`,
    "Respond ONLY as compact JSON with keys: detected_language, tone (casual|urgent|medical|accessibility), translation, volunteer_guidance, confidence (low|medium|high).",
    "- detected_language: the fan's language, in English (e.g. 'Spanish').",
    "- tone: classify urgency/register from context, not just keywords.",
    "- translation: a faithful translation of the fan's message for the volunteer to read.",
    "- volunteer_guidance: one short sentence telling the volunteer how to respond appropriately given the tone.",
    "- confidence: low if unclear language or context, medium if mostly confident, high if clear and straightforward.",
    `Translate the volunteer-facing summary into ${targetLanguage}.`,
  ].join("\n");
}

export async function translateFanMessage(fanMessage, targetLanguage = "English") {
  const prompt = buildTranslationPrompt(fanMessage, targetLanguage);
  try {
    const raw = await callModel(prompt);
    const parsed = safeParseJSON(raw);
    if (!parsed || !parsed.translation || !parsed.tone) {
      throw new AIProviderError("Model response missing required fields");
    }

    const result = {
      ...parsed,
      confidence: parsed.confidence || "medium",
      source: "model"
    };

    // Log AI decision
    logAIDecision({
      endpoint: "/api/translate",
      inputs: { message: fanMessage.slice(0, 100), targetLanguage },
      aiResponse: result,
      confidence: result.confidence,
      source: "model",
    });

    return result;
  } catch (err) {
    const fallback = {
      detected_language: "Unknown",
      tone: "casual",
      translation: fanMessage,
      volunteer_guidance: "AI unavailable — showing the raw message only.",
      confidence: "low",
      source: "fallback",
    };

    // Log fallback decision
    logAIDecision({
      endpoint: "/api/translate",
      inputs: { message: fanMessage.slice(0, 100), targetLanguage },
      aiResponse: fallback,
      confidence: "low",
      source: "fallback",
    });

    return fallback;
  }
}
