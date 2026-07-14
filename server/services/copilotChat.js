import { callModel } from "./aiProvider.js";
import { sanitizePromptInput } from "../utils/prompt-sanitizer.js";
import { safeParseJSON } from "./aiProvider.js";

function buildCopilotPrompt(question, venue, gateStatuses, activeIncidents = []) {
  // Format nodes and edges in a compact way for the context
  const nodesContext = venue.nodes.map(n => `- ${n.name} (id: "${n.id}", type: "${n.type}")`).join("\n");
  const edgesContext = venue.edges.map(e => `- ${e.from} to ${e.to}: ${e.distance_m}m${e.step_free === false ? " (no step-free access)" : ""}`).join("\n");
  
  const gatesContext = gateStatuses.map(g => {
    return `- ${g.gate.replace("gate-", "").toUpperCase()} Capacity: ${g.current} / ${g.capacity} (${Math.round(g.ratio * 100)}%), Status: ${g.status}`;
  }).join("\n");

  const incidentsContext = activeIncidents.length > 0 
    ? activeIncidents.map(i => `- Incident: ${i.type} at ${i.location} (${i.severity} severity). Responder post: ${i.responderPost || "none"}`).join("\n")
    : "No active incidents currently reported.";

  return [
    "You are the StadiumMonitor Operations Chat Copilot, an AI assistant built for FIFA World Cup 2026 Smart Stadiums volunteers and operations staff.",
    "Your job is to answer questions about the stadium venue layout, gate status, wayfinding, and incident reports based ONLY on the current live data provided below.",
    "",
    "--- LIVE VENUE DATA ---",
    "STADIUM NODES:",
    nodesContext,
    "",
    "PATHS / CONNECTIONS:",
    edgesContext,
    "",
    "LIVE GATE CAPACITIES:",
    gatesContext,
    "",
    "ACTIVE INCIDENTS:",
    incidentsContext,
    "------------------------",
    "",
    "RULES:",
    "1. Be extremely concise. Keep your answer to 1-3 sentences maximum.",
    "2. Base your answer strictly on the provided data. Do not make up any nodes, distances, or status levels that are not in the list.",
    "3. If the user asks for a route, you can briefly outline the connections (e.g. Node A -> Node B) or point them to use the Wayfinding panel.",
    "4. Reply politely and helpful as a command center assistant.",
    "",
    `USER QUESTION: "${sanitizePromptInput(question)}"`,
    "Your response should be grounded in the provided data with confidence: high (very sure), medium (likely accurate), low (uncertain).",
    "COPILOT REPLY (RESPOND ONLY AS COMPACT JSON WITH: reply, confidence):"
  ].join("\n");
}

export async function askCopilot(question, venue, gateStatuses, activeIncidents = []) {
  if (!question || question.trim() === "") {
    return { reply: "Please enter a valid question.", confidence: "high", source: "fallback" };
  }

  const prompt = buildCopilotPrompt(question, venue, gateStatuses, activeIncidents);
  try {
    const raw = await callModel(prompt);
    const parsed = safeParseJSON(raw);
    
    // If model returned JSON with reply and confidence, use it
    if (parsed && parsed.reply && parsed.confidence) {
      return { ...parsed, source: "model" };
    }
    
    // Fallback: treat raw response as the reply
    return { 
      reply: (parsed && parsed.reply) || raw.trim(), 
      confidence: "medium",
      source: "model" 
    };
  } catch (err) {
    // Fallback response if AI provider fails (don't leak error details)
    return { 
      reply: "AI Copilot is currently offline. Manual operations guidelines are available in the venue docs.",
      confidence: "low",
      source: "fallback"
    };
  }
}
