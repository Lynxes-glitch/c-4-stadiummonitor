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
    if (parsed && parsed.reply && parsed.confidence && parsed.reply.trim()) {
      return { ...parsed, source: "model" };
    }

    // If raw response has content, use it
    if (raw && raw.trim()) {
      return {
        reply: (parsed && parsed.reply) || raw.trim(),
        confidence: "medium",
        source: "model"
      };
    }

    // Model returned empty - try smart fallback
    console.log("AI returned empty response, using smart fallback");
    const smartReply = generateSmartFallback(question, venue, gateStatuses);
    if (smartReply) {
      return { ...smartReply, source: "fallback" };
    }

    // Generic fallback
    return {
      reply: "Unable to process your question. Try using the Wayfinding panel or check live status above.",
      confidence: "low",
      source: "fallback"
    };
  } catch (err) {
    // Log error for debugging
    console.error("AI Copilot error:", err.message);

    // Smart fallback: try to answer from venue data
    const smartReply = generateSmartFallback(question, venue, gateStatuses);
    if (smartReply) {
      return { ...smartReply, source: "fallback" };
    }

    // Generic fallback if we can't answer
    return {
      reply: "AI Copilot is currently offline. Try using the Wayfinding panel for directions or check the live gate status above.",
      confidence: "low",
      source: "fallback"
    };
  }
}

function generateSmartFallback(question, venue, gateStatuses) {
  const q = question.toLowerCase();

  // Medical post questions
  if (q.includes("medical") && q.includes("gate")) {
    const gateMatch = q.match(/gate\s*([a-f])/i);
    if (gateMatch) {
      const gate = gateMatch[1].toUpperCase();
      return {
        reply: `Medical Post 1 is near North Concourse (from Gate ${gate}, head to the concourse then follow signs). Use the Wayfinding panel for exact directions.`,
        confidence: "medium"
      };
    }
  }

  // Congestion questions
  if (q.includes("congest") || q.includes("busy") || q.includes("crowded")) {
    const critical = gateStatuses.filter(g => g.status === "critical");
    const watch = gateStatuses.filter(g => g.status === "watch");

    if (critical.length > 0) {
      const gates = critical.map(g => g.gate.replace("gate-", "").toUpperCase()).join(", ");
      return {
        reply: `Critical: Gate${critical.length > 1 ? "s" : ""} ${gates} (${Math.round(critical[0].ratio * 100)}%+ capacity). Consider alternate gates.`,
        confidence: "high"
      };
    } else if (watch.length > 0) {
      const gates = watch.map(g => g.gate.replace("gate-", "").toUpperCase()).join(", ");
      return {
        reply: `Watch status: Gate${watch.length > 1 ? "s" : ""} ${gates} (70%+ capacity). Other gates running smoothly.`,
        confidence: "high"
      };
    } else {
      return {
        reply: `All gates (A-F) currently report OK status with occupancy under 70%. No congestion at this time.`,
        confidence: "high"
      };
    }
  }

  // Step-free / accessibility questions
  if (q.includes("step-free") || q.includes("wheelchair") || q.includes("accessible")) {
    return {
      reply: `Accessible entries at North (near Gate A) and South (near Gate D). Most main concourse paths are step-free. Use the Wayfinding panel for step-free routes.`,
      confidence: "medium"
    };
  }

  return null;
}
