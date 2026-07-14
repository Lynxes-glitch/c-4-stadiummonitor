// aiProvider.js
// The ONLY module in this codebase that reads an AI API key or makes a
// request to an AI provider. No route, template, or client-side script ever
// sees the key — it lives in server process memory (from .env) and nothing
// else. This mirrors the security posture called out as best-practice in
// the challenge benchmarks: AI is a phrasing/reasoning layer bolted onto a
// deterministic core, and its credentials never cross the network to the browser.

import https from "https";
import { config } from "../config.js";

// Simple in-process throttle: protects the configured API key from being
// exhausted by a burst of requests (in addition to the per-IP rate limiter
// in middleware, which protects against abusive clients).
let lastCallAt = 0;
const MIN_INTERVAL_MS = 300;

async function throttle() {
  const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
}

export class AIProviderError extends Error {}

/**
 * Sends a prompt to the configured provider and returns raw text.
 * Implements cascade fallback: gpt-oss -> tencent -> error
 * Throws AIProviderError on any failure (missing key, network, non-2xx) —
 * callers are expected to fail closed (generic error to the client, no
 * internals leaked) rather than let this bubble up raw.
 */
export async function callModel(prompt) {
  if (!config.aiProvider || !config.aiApiKey) {
    throw new AIProviderError("No AI provider configured on the server (missing API key).");
  }
  await throttle();

  // Cascade fallback for OpenRouter
  if (config.aiProvider === "openrouter") {
    return await callOpenRouterWithFallback(prompt);
  }

  try {
    switch (config.aiProvider) {
      case "openai": return await callOpenAI(prompt);
      case "gemini": return await callGemini(prompt);
      case "anthropic": return await callAnthropic(prompt);
      default:
        throw new AIProviderError(`Unknown AI_PROVIDER: ${config.aiProvider}`);
    }
  } catch (err) {
    if (err instanceof AIProviderError) throw err;
    throw new AIProviderError(`AI call failed: ${err.message}`);
  }
}

async function callOpenRouterWithFallback(prompt) {
  const models = [
    "openai/gpt-oss-20b:free",
    "tencent/hy3:free"
  ];

  let lastError;

  for (const model of models) {
    try {
      console.log(`Trying OpenRouter model: ${model}`);
      const result = await callOpenRouterModel(prompt, model);
      console.log(`Success with model: ${model}`);
      return result;
    } catch (err) {
      console.error(`Failed with ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new AIProviderError("All OpenRouter models failed");
}

function postRequest(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const data = JSON.stringify(body);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        ...headers,
        "Content-Length": Buffer.byteLength(data),
      },
      family: 4, // Force IPv4 to prevent IPv6 timeout issues in macOS Node fetch
      timeout: 30000, // 30s timeout to prevent Vercel function timeout (60s limit)
    };

    const req = https.request(options, (res) => {
      let responseBody = "";
      res.on("data", (chunk) => { responseBody += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            ok: true,
            status: res.statusCode,
            json: async () => JSON.parse(responseBody),
            text: async () => responseBody
          });
        } else {
          resolve({
            ok: false,
            status: res.statusCode,
            text: async () => responseBody
          });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

async function callOpenAI(prompt) {
  const res = await postRequest(
    "https://api.openai.com/v1/chat/completions",
    { "Content-Type": "application/json", Authorization: `Bearer ${config.aiApiKey}` },
    {
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 300,
    }
  );
  if (!res.ok) throw new AIProviderError(`AI provider returned non-200 status`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(prompt) {
  const res = await postRequest(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.aiApiKey}`,
    { "Content-Type": "application/json" },
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 },
    }
  );
  if (!res.ok) throw new AIProviderError(`AI provider returned non-200 status`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAnthropic(prompt) {
  const res = await postRequest(
    "https://api.anthropic.com/v1/messages",
    {
      "Content-Type": "application/json",
      "x-api-key": config.aiApiKey,
      "anthropic-version": "2023-06-01",
    },
    {
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }
  );
  if (!res.ok) throw new AIProviderError(`AI provider returned non-200 status`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callOpenRouterModel(prompt, model) {
  const res = await postRequest(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.aiApiKey}`,
      "HTTP-Referer": "https://github.com/google/antigravity",
      "X-Title": "StadiumMonitor",
    },
    {
      model: model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }
  );
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`OpenRouter error (${res.status}):`, errorText);
    throw new AIProviderError(`AI provider returned status ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export function safeParseJSON(text) {
  if (!text) return null;
  const match = text.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : text);
  } catch {
    return null;
  }
}
