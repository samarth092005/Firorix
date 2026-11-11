/**
 * Custom error hierarchy for FioriX MCP subsystem.
 */

export class McpError extends Error {
  constructor(message, code = 'MCP_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class McpConnectionError extends McpError {
  constructor(message, details = null) {
    super(message, 'MCP_CONNECTION_ERROR', details);
  }
}

export class McpTimeoutError extends McpError {
  constructor(message = 'MCP operation timed out', details = null) {
    super(message, 'MCP_TIMEOUT', details);
  }
}

export class McpToolPolicyError extends McpError {
  constructor(message, details = null) {
    super(message, 'MCP_TOOL_BLOCKED_BY_POLICY', details);
  }
}

export class McpValidationError extends McpError {
  constructor(message, details = null) {
    super(message, 'MCP_INVALID_ARGUMENTS', details);
  }
}

export class McpExecutionError extends McpError {
  constructor(message, details = null) {
    super(message, 'MCP_EXECUTION_ERROR', details);
  }
}

/**
 * Normalizes any error into a safe, client-facing JSON object.
 * Protects against credential leaks and internal stack traces.
 *
 * @param {Error|unknown} error
 * @returns {{ code: string, message: string, details?: any }}
 */
export function formatSafeMcpError(error) {
  if (error instanceof McpError) {
    return {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {})
    };
  }

  const rawMessage = error instanceof Error ? error.message : String(error);
  // Redact potential passwords or tokens
  const sanitized = rawMessage
    .replace(/(?:password|secret|bearer|token)[=:\s]+[^\s,;&]+/gi, '$1=***REDACTED***')
    .replace(/https?:\/\/[^@\s]+@/g, 'http://***@');

  return {
    code: 'MCP_INTERNAL_ERROR',
    message: sanitized
  };
}
