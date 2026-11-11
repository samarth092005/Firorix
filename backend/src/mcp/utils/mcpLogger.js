/**
 * Sanitized diagnostic logger for the FioriX MCP subsystem.
 * Strictly prevents leaking credentials, tokens, or private endpoints.
 */

const LOG_LEVELS = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

function redactSensitiveData(input) {
  if (typeof input !== 'string') {
    try {
      input = JSON.stringify(input);
    } catch {
      input = String(input);
    }
  }

  return input
    .replace(/(?:password|secret|token|bearer|authorization)[=:\s]+[^\s,;&"}]+/gi, '$1=***REDACTED***')
    .replace(/Basic\s+[A-Za-z0-9+/=]+/gi, 'Basic ***REDACTED***')
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, 'Bearer ***REDACTED***')
    .replace(/https?:\/\/[^:]+:[^@]+@/gi, 'http://***:***@');
}

export class McpLogger {
  constructor(level = 'info') {
    this.level = level.toLowerCase();
  }

  setLevel(level) {
    this.level = level.toLowerCase();
  }

  _shouldLog(targetLevel) {
    const currentWeight = LOG_LEVELS[this.level] ?? LOG_LEVELS.info;
    const targetWeight = LOG_LEVELS[targetLevel] ?? LOG_LEVELS.info;
    return targetWeight <= currentWeight;
  }

  debug(msg, meta) {
    if (this._shouldLog('debug')) {
      console.debug(`[FioriX MCP][DEBUG] ${redactSensitiveData(msg)}`, meta ? redactSensitiveData(meta) : '');
    }
  }

  info(msg, meta) {
    if (this._shouldLog('info')) {
      console.info(`[FioriX MCP][INFO] ${redactSensitiveData(msg)}`, meta ? redactSensitiveData(meta) : '');
    }
  }

  warn(msg, meta) {
    if (this._shouldLog('warn')) {
      console.warn(`[FioriX MCP][WARN] ${redactSensitiveData(msg)}`, meta ? redactSensitiveData(meta) : '');
    }
  }

  error(msg, meta) {
    if (this._shouldLog('error')) {
      console.error(`[FioriX MCP][ERROR] ${redactSensitiveData(msg)}`, meta ? redactSensitiveData(meta) : '');
    }
  }
}

export const mcpLogger = new McpLogger();
