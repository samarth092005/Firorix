import { mcpToolPolicy } from '../security/mcpToolPolicy.js';
import { mcpArgumentValidator } from '../security/mcpArgumentValidator.js';
import { mcpResponseNormalizer } from './mcpResponseNormalizer.js';
import { defaultMcpToolRegistry } from './mcpToolRegistry.js';
import { defaultMcpConnectionManager } from '../client/mcpConnectionManager.js';
import {
  McpToolPolicyError,
  McpValidationError,
  McpConnectionError,
  McpTimeoutError,
  formatSafeMcpError
} from '../utils/mcpErrors.js';
import { mcpLogger } from '../utils/mcpLogger.js';

export class McpToolExecutor {
  constructor(options = {}) {
    this.connectionManager = options.connectionManager || defaultMcpConnectionManager;
    this.toolRegistry = options.toolRegistry || defaultMcpToolRegistry;
    this.policy = options.policy || mcpToolPolicy;
    this.validator = options.validator || mcpArgumentValidator;
    this.normalizer = options.normalizer || mcpResponseNormalizer;
  }

  /**
   * Executes an approved MCP tool with security policy validation, argument validation,
   * timeouts, and normalized responses.
   *
   * @param {string} toolName Name of the tool
   * @param {object} args Arguments matching tool inputSchema
   * @param {object} [options] Optional runtime overrides (e.g. timeoutMs)
   * @returns {Promise<object>} Normalized FioriX API response
   */
  async execute(toolName, args = {}, options = {}) {
    const startTime = Date.now();
    const connState = this.connectionManager.getState();

    // 1. Check tool existence in registry
    const tool = this.toolRegistry.getTool(toolName);
    if (!tool) {
      const durationMs = Date.now() - startTime;
      return this.normalizer.normalize({
        toolName,
        success: false,
        executionStatus: 'FAILED',
        error: {
          code: 'MCP_TOOL_NOT_FOUND',
          message: `Tool "${toolName}" is not available in the active MCP tool registry.`
        },
        durationMs,
        connectionState: connState
      });
    }

    // 2. Security policy check (Conservative allowlist)
    const policyEvaluation = this.policy.evaluate(toolName, tool);
    if (!policyEvaluation.allowed) {
      const durationMs = Date.now() - startTime;
      mcpLogger.warn(`Blocked tool execution attempt: ${toolName}. Reason: ${policyEvaluation.reason}`);
      return this.normalizer.normalize({
        toolName,
        success: false,
        executionStatus: 'BLOCKED',
        category: tool.category,
        error: {
          code: 'MCP_TOOL_BLOCKED_BY_POLICY',
          message: policyEvaluation.reason || 'This tool is blocked by FioriX read-only security policy.'
        },
        durationMs,
        connectionState: connState
      });
    }

    // 3. Argument schema validation
    const validationResult = this.validator.validate(args, tool.inputSchema);
    if (!validationResult.isValid) {
      const durationMs = Date.now() - startTime;
      mcpLogger.warn(`Invalid arguments for tool ${toolName}: ${validationResult.errors.join(', ')}`);
      return this.normalizer.normalize({
        toolName,
        success: false,
        executionStatus: 'FAILED',
        category: tool.category,
        error: {
          code: 'MCP_INVALID_ARGUMENTS',
          message: 'Arguments failed schema validation.',
          details: validationResult.errors
        },
        durationMs,
        connectionState: connState
      });
    }

    // 4. Connection state check
    if (connState !== 'CONNECTED') {
      const durationMs = Date.now() - startTime;
      return this.normalizer.normalize({
        toolName,
        success: false,
        executionStatus: 'FAILED',
        category: tool.category,
        error: {
          code: 'MCP_SERVICE_UNAVAILABLE',
          message: `MCP server is not connected (current state: ${connState}).`
        },
        durationMs,
        connectionState: connState
      });
    }

    // 5. Execute tool with timeout
    const timeoutMs = options.timeoutMs || this.connectionManager.config.toolTimeoutMs || 60000;
    try {
      mcpLogger.info(`Executing permitted MCP tool: ${toolName}`);
      const rawResult = await this.connectionManager.callTool(toolName, args, timeoutMs);
      const durationMs = Date.now() - startTime;

      return this.normalizer.normalize({
        toolName,
        success: true,
        executionStatus: 'SUCCESS',
        category: tool.category,
        rawResult,
        durationMs,
        connectionState: connState,
        serverPackage: this.connectionManager.config.serverPackage
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const safeError = formatSafeMcpError(err);
      const isTimeout = err instanceof McpTimeoutError;

      mcpLogger.error(`Execution failed for tool ${toolName}: ${safeError.message}`);
      return this.normalizer.normalize({
        toolName,
        success: false,
        executionStatus: isTimeout ? 'TIMEOUT' : 'FAILED',
        category: tool.category,
        error: safeError,
        durationMs,
        connectionState: connState,
        serverPackage: this.connectionManager.config.serverPackage
      });
    }
  }
}

export const defaultMcpToolExecutor = new McpToolExecutor();
