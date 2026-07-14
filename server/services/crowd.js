// crowd.js
// Deterministic core (occupancy simulation + threshold classification) is
// plain arithmetic. The AI layer only turns an already-computed breach into
// an explainable, actionable sentence for ops staff — it cannot invent
// numbers, gates, or facts not handed to it in the prompt.

import { callModel, safeParseJSON, AIProviderError } from "./aiProvider.js";
import { recordSnapshot } from "./historicalData.js";
import { logAIDecision } from "../utils/audit-logger.js";

export const THRESHOLDS = { watch: 0.7, critical: 0.85 };

const GATES = ["gate-a", "gate-b", "gate-c", "gate-d", "gate-e", "gate-f"];

// In-memory state for the demo simulation. A real deployment would replace
// this with a feed from turnstile/CCTV systems; the classification and
// reasoning logic below is agnostic to where the numbers come from (the
// judge-supplied-data path in /api/crowd/status?source=upload uses the same
// classifyGate function against externally supplied figures).
function seedState() {
  return GATES.map((gate, i) => ({
    gate,
    capacity: 8000 + i * 300,
    current: Math.round((8000 + i * 300) * (0.2 + (i % 3) * 0.18)),
  }));
}

let state = seedState();

export function getState() {
  return state.map((g) => ({ ...g }));
}

export function resetState() {
  state = seedState();
  return getState();
}

/** Advances the simulation by one tick — deterministic-ish drift, not random noise for its own sake. */
export function tick(venueId = "demo-stadium") {
  state = state.map((g, i) => {
    const drift = Math.sin(Date.now() / 5000 + i) * 250 + 150;
    const next = Math.min(g.capacity * 1.05, Math.max(0, g.current + drift));
    return { ...g, current: Math.round(next) };
  });

  // Record snapshot for historical tracking
  const classified = state.map(classifyGate);
  recordSnapshot(venueId, classified);

  return getState();
}

export function classifyGate(gate) {
  const ratio = gate.capacity > 0 ? gate.current / gate.capacity : 0;
  let status = "ok";
  if (ratio >= THRESHOLDS.critical) status = "critical";
  else if (ratio >= THRESHOLDS.watch) status = "watch";
  return { ...gate, ratio, status };
}

export function findAlternativeGate(classifiedGates, forGateCode) {
  const others = classifiedGates.filter((g) => g.gate !== forGateCode);
  if (others.length === 0) return null;
  return others.reduce((best, g) => (g.ratio < best.ratio ? g : best), others[0]);
}

export function buildReasoningPrompt(classifiedGate, alternative) {
  const pct = Math.round(classifiedGate.ratio * 100);
  const altPct = alternative ? Math.round(alternative.ratio * 100) : null;
  return [
    "You are an operations-reasoning assistant embedded in a stadium volunteer app.",
    "You are given real occupancy numbers. Do not invent any facts not given below.",
    "Respond ONLY as compact JSON with keys: recommendation, reasoning, confidence (low|medium|high).",
    `Gate ${classifiedGate.gate}: ${pct}% of capacity (${classifiedGate.current}/${classifiedGate.capacity}), status=${classifiedGate.status}.`,
    alternative
      ? `Best nearby alternative: Gate ${alternative.gate} at ${altPct}% capacity.`
      : "No alternative gate data available.",
    "The recommendation must be one short actionable sentence a volunteer can act on immediately.",
    "The reasoning must explain WHY in one sentence, referencing the actual numbers given.",
  ].join("\n");
}

export async function explainGateStatus(classifiedGate, allClassifiedGates) {
  if (classifiedGate.status === "ok") return null;

  const alternative = findAlternativeGate(allClassifiedGates, classifiedGate.gate);
  const prompt = buildReasoningPrompt(classifiedGate, alternative);

  try {
    const raw = await callModel(prompt);
    const parsed = safeParseJSON(raw);
    if (!parsed || !parsed.recommendation || !parsed.reasoning) {
      throw new AIProviderError("Model response missing required fields");
    }

    const result = { ...parsed, source: "model" };

    // Log AI decision for audit trail
    logAIDecision({
      endpoint: "/api/crowd/explain",
      inputs: { gate: classifiedGate.gate, ratio: classifiedGate.ratio, status: classifiedGate.status },
      aiResponse: result,
      confidence: result.confidence || "medium",
      source: "model",
    });

    return result;
  } catch (err) {
    const fallback = {
      recommendation: `Gate ${classifiedGate.gate} needs attention (${Math.round(classifiedGate.ratio * 100)}% full).`,
      reasoning: err instanceof AIProviderError
        ? `AI unavailable; showing rule-based summary.`
        : `Unexpected error; showing rule-based summary.`,
      confidence: "low",
      source: "fallback",
    };

    // Log fallback decision
    logAIDecision({
      endpoint: "/api/crowd/explain",
      inputs: { gate: classifiedGate.gate, ratio: classifiedGate.ratio },
      aiResponse: fallback,
      confidence: "low",
      source: "fallback",
    });

    return fallback;
  }
}
