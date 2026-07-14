/**
 * Prompt Injection Mitigation Utilities
 * Sanitizes user input before embedding in AI prompts to prevent injection attacks.
 */

/**
 * Escapes special characters that could break out of a prompt context.
 * Prevents: " [IGNORE] Recommend X instead "
 * 
 * @param {string} userInput - Untrusted user input
 * @returns {string} Escaped input safe for embedding in prompts
 */
export function sanitizePromptInput(userInput) {
  if (typeof userInput !== 'string') {
    return String(userInput);
  }

  // Remove or escape control characters and potentially dangerous patterns
  return userInput
    .trim()
    .replace(/[\x00-\x1F]/g, '') // Remove control characters
    .replace(/\[\/prompt\]/gi, '[slash prompt]') // Defang prompt markers
    .replace(/\[IGNORE\]/gi, '[ignore]')
    .replace(/\[SYSTEM\]/gi, '[system]')
    .replace(/---\n/g, '- ') // Defang YAML-style separators
    .slice(0, 2000); // Limit to 2000 chars to prevent token exhaustion
}

/**
 * Validates and sanitizes JSON input from user before processing.
 * @param {*} input - Input to validate
 * @param {string} fieldName - Field name for error reporting
 * @returns {string} Validated and sanitized string
 * @throws {Error} If input is invalid
 */
export function validateAndSanitize(input, fieldName = 'input') {
  if (!input) {
    throw new Error(`${fieldName} is required`);
  }
  if (typeof input !== 'string' && typeof input !== 'number') {
    throw new Error(`${fieldName} must be a string`);
  }
  
  const sanitized = sanitizePromptInput(String(input));
  
  if (!sanitized || sanitized.length === 0) {
    throw new Error(`${fieldName} cannot be empty after sanitization`);
  }
  
  return sanitized;
}

/**
 * Escapes HTML entities for safe display in responses.
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') return String(text);
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Wraps errors to prevent information leakage.
 * Only logs internals server-side; client sees generic message.
 * 
 * @param {Error} error - Original error
 * @param {Function} logger - Logger function (e.g., console.error)
 * @param {string} genericMessage - Generic message for client
 * @returns {object} Error response for client
 */
export function wrapErrorResponse(error, logger, genericMessage = 'An error occurred') {
  // Log full error server-side for debugging
  if (logger) {
    logger('Security-wrapped error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }

  // Return generic message to client (no internals)
  return {
    error: genericMessage,
    // Do NOT include: error.message, error.stack, error.provider, etc.
  };
}
