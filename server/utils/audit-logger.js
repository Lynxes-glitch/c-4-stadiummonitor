// audit-logger.js
// Centralized logging for all AI-powered decisions: enables explainability & debugging

import { randomUUID } from "node:crypto";
import { appConfig } from "../config.js";

// In-memory audit log (last N decisions)
const MAX_AUDIT_ENTRIES = appConfig.audit.maxEntries;
let auditLog = [];

/**
 * Log an AI decision with full context for explainability and debugging
 * @param {Object} entry - Audit entry
 * @param {string} entry.endpoint - The API endpoint (e.g., "/api/crowd/explain")
 * @param {any} entry.inputs - User/system inputs (sanitized before logging)
 * @param {any} entry.aiResponse - The AI model's response
 * @param {string} entry.confidence - Confidence level (low|medium|high) if provided
 * @param {string} entry.source - "model" or "fallback"
 */
export function logAIDecision({
  endpoint,
  inputs,
  aiResponse,
  confidence = "unknown",
  source = "model",
}) {
  const entry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    endpoint,
    inputs: typeof inputs === "string" ? inputs.slice(0, 200) : inputs,
    aiResponse: typeof aiResponse === "string" ? aiResponse.slice(0, 500) : aiResponse,
    confidence,
    source,
  };

  auditLog.unshift(entry); // Prepend newest entries

  // Trim to keep only latest entries
  if (auditLog.length > MAX_AUDIT_ENTRIES) {
    auditLog = auditLog.slice(0, MAX_AUDIT_ENTRIES);
  }

  return entry.id;
}

/**
 * Retrieve recent audit log entries
 * @param {number} limit - Number of entries to return (default: 50)
 * @returns {Array} Recent audit entries
 */
export function getAuditLog(limit = 50) {
  return auditLog.slice(0, Math.min(limit, auditLog.length));
}

/**
 * Filter audit log by endpoint
 * @param {string} endpoint - The endpoint to filter by
 * @param {number} limit - Number of entries to return
 * @returns {Array} Filtered audit entries
 */
export function getAuditLogByEndpoint(endpoint, limit = 50) {
  return auditLog
    .filter((entry) => entry.endpoint === endpoint)
    .slice(0, Math.min(limit, auditLog.length));
}

/**
 * Clear audit log (for testing/reset)
 */
export function clearAuditLog() {
  auditLog = [];
}

/**
 * Get statistics about AI decisions
 * @returns {Object} Audit statistics
 */
export function getAuditStats() {
  const total = auditLog.length;
  if (total === 0) return { total, byEndpoint: {}, byConfidence: {}, bySource: {} };

  const byEndpoint = {};
  const byConfidence = {};
  const bySource = {};

  auditLog.forEach((entry) => {
    byEndpoint[entry.endpoint] = (byEndpoint[entry.endpoint] || 0) + 1;
    byConfidence[entry.confidence] = (byConfidence[entry.confidence] || 0) + 1;
    bySource[entry.source] = (bySource[entry.source] || 0) + 1;
  });

  return { total, byEndpoint, byConfidence, bySource };
}
