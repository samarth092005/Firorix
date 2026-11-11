import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves the default absolute path to the pinned @sap-ux/fiori-mcp-server binary.
 */
export function getDefaultServerExecutablePath() {
  // Try resolving from backend node_modules
  return path.resolve(__dirname, '../../../node_modules/@sap-ux/fiori-mcp-server/dist/index.js');
}

/**
 * Reads and normalizes MCP environment configuration.
 *
 * @param {Record<string, string>} [env] Optional custom environment source (defaults to process.env)
 * @returns {McpConfiguration} Normalized MCP configuration
 */
export function loadMcpConfig(env = process.env) {
  const enabled = env.MCP_ENABLED === 'true';
  const serverPackage = env.MCP_SERVER_PACKAGE || '@sap-ux/fiori-mcp-server';
  const serverVersion = env.MCP_SERVER_VERSION || '1.15.24';
  const transport = (env.MCP_TRANSPORT || 'stdio').toLowerCase();
  const startupTimeoutMs = Math.max(1000, parseInt(env.MCP_STARTUP_TIMEOUT_MS, 10) || 30000);
  const toolTimeoutMs = Math.max(1000, parseInt(env.MCP_TOOL_TIMEOUT_MS, 10) || 60000);
  const reconnectMaxAttempts = Math.max(0, parseInt(env.MCP_RECONNECT_MAX_ATTEMPTS, 10) || 3);
  const autoConnect = env.MCP_AUTO_CONNECT === 'true';
  const logLevel = env.MCP_LOG_LEVEL || 'info';

  const executablePath = env.MCP_EXECUTABLE_PATH
    ? path.resolve(env.MCP_EXECUTABLE_PATH)
    : getDefaultServerExecutablePath();

  return {
    enabled,
    serverPackage,
    serverVersion,
    transport,
    startupTimeoutMs,
    toolTimeoutMs,
    reconnectMaxAttempts,
    autoConnect,
    logLevel,
    executablePath
  };
}

/**
 * Validates MCP configuration values.
 *
 * @param {McpConfiguration} config
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateMcpConfig(config) {
  const errors = [];

  if (!config) {
    return { isValid: false, errors: ['Configuration object is required.'] };
  }

  if (config.transport !== 'stdio') {
    errors.push(`Unsupported MCP transport "${config.transport}". Only "stdio" is supported.`);
  }

  if (typeof config.startupTimeoutMs !== 'number' || config.startupTimeoutMs <= 0) {
    errors.push('startupTimeoutMs must be a positive integer.');
  }

  if (typeof config.toolTimeoutMs !== 'number' || config.toolTimeoutMs <= 0) {
    errors.push('toolTimeoutMs must be a positive integer.');
  }

  if (typeof config.reconnectMaxAttempts !== 'number' || config.reconnectMaxAttempts < 0) {
    errors.push('reconnectMaxAttempts must be a non-negative integer.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export const defaultMcpConfig = loadMcpConfig();
