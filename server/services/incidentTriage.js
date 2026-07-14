// incidentTriage.js
// Distinct feature not present in either reference benchmark: an Incident
// Triage & Escalation Copilot for the Volunteer persona.
//
// A volunteer who encounters something (a medical issue, a lost child, a
// disturbance, an accessibility need) rarely has training in incident
// classification or knowledge of the venue's responsts. This service:
//   1. Deterministically finds the nearest relevant responder post via the
//      same Dijkstra pathfinding used for wayfinding (grounded, not guessed).
//   2. Asks the model to do the one thing rules genuinely can't: read the
//      free-text description and infer severity/urgency from context (a
//      calm "someone dropped their phone over the rail" vs. an urgent
//      "person collapsed and isn't responding" are very different even
//      though both could be reported using similar words), then draft a
//      short dispatch instruction AND a radio-ready phrase in the
//      volunteer's target language.
//
// The model is only ever handed already-computed facility names and
// distances — it cannot invent a responder post that doesn't exist in the
// venue graph.

import { nearestNodeOfType } from "./pathfinding.js";
import { callModel, safeParseJSON, AIProviderError } from "./aiProvider.js";
import { sanitizePromptInput } from "../utils/prompt-sanitizer.js";
import { logAIDecision } from "../utils/audit-logger.js";

export const INCIDENT_TYPES = {
  medical: "medical_post",
  lost_person: "lost_and_found",
  security: "security_post",
  accessibility: "accessible_entry",
  facility: "security_post",
};

export class TriageError extends Error {}

export function findResponderPost(venue, reporterNodeId, incidentType) {
  const targetType = INCIDENT_TYPES[incidentType];
  if (!targetType) throw new TriageError(`Unknown incident type: ${incidentType}`);
  if (!venue.nodesById.has(reporterNodeId)) {
    throw new TriageError(`Unknown reporter location: ${reporterNodeId}`);
  }
  const nearest = nearestNodeOfType(venue.adjacency, venue.nodesById, reporterNodeId, targetType);
  if (!nearest) {
    throw new TriageError(`No reachable ${targetType.replace("_", " ")} found from this location.`);
  }
  return nearest;
}

function buildTriagePrompt(incidentType, description, post, distanceMeters, language) {
  const sanitizedDescription = sanitizePromptInput(description);
  return [
    "You are an incident-triage assistant helping a stadium volunteer during a live event.",
    "You are given the incident type, the volunteer's free-text description, and an already-computed nearest responder post. Do not invent any facility, distance, or fact not given below.",
    `Incident type: ${incidentType}.`,
    `Volunteer's description: """${sanitizedDescription}"""`,
    `Nearest responder post: ${post.node.name} (${Math.round(distanceMeters)}m away).`,
    "Respond ONLY as compact JSON with keys: severity (low|medium|high), dispatch_instruction, volunteer_phrase, confidence (low|medium|high).",
    "- severity: infer urgency from the description's actual context, not just keywords — a calm report of a minor issue is 'low' even if it mentions a scary-sounding word, and a description implying loss of consciousness, danger, or a child alone is 'high'.",
    "- dispatch_instruction: one short sentence a control-room operator can act on immediately, naming the responder post given above.",
    `- volunteer_phrase: one short, calm sentence in ${language} the volunteer can say out loud to the person involved while help is on the way.`,
    "- confidence: low if context is ambiguous, medium if mostly clear, high if urgent/critical signals detected.",
  ].join("\n");
}

export async function triageIncident(venue, { incidentType, description, reporterNodeId, language = "English" }) {
  const post = findResponderPost(venue, reporterNodeId, incidentType);
  const prompt = buildTriagePrompt(incidentType, description, post, post.result.distanceMeters, language);

  const base = {
    responderPost: post.node.name,
    responderPostId: post.node.id,
    distanceMeters: post.result.distanceMeters,
    route: post.result.path,
  };

  try {
    const raw = await callModel(prompt);
    const parsed = safeParseJSON(raw);
    if (!parsed || !parsed.severity || !parsed.dispatch_instruction || !parsed.volunteer_phrase) {
      throw new AIProviderError("Model response missing required fields");
    }

    const result = {
      ...base,
      ...parsed,
      confidence: parsed.confidence || "medium",
      source: "model"
    };

    // Log AI decision
    logAIDecision({
      endpoint: "/api/incident/triage",
      inputs: { incidentType, description: description.slice(0, 100), reporterNodeId },
      aiResponse: result,
      confidence: result.confidence,
      source: "model",
    });

    return result;
  } catch (err) {
    const fallback = {
      ...base,
      severity: "unknown",
      dispatch_instruction: `Report to ${post.node.name} (${Math.round(post.result.distanceMeters)}m away) — AI triage unavailable, use manual judgment for severity.`,
      volunteer_phrase: "Help is being arranged — please stay where you are.",
      confidence: "low",
      source: "fallback",
    };

    // Log fallback decision
    logAIDecision({
      endpoint: "/api/incident/triage",
      inputs: { incidentType, description: description.slice(0, 100), reporterNodeId },
      aiResponse: fallback,
      confidence: "low",
      source: "fallback",
    });

    return fallback;
  }
}
