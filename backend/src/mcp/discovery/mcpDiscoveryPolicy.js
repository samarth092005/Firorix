/**
 * FioriX MCP Subsystem — Discovery Execution Policy
 *
 * Evaluates whether MCP operations should be performed for a discovery request
 * and determines the list of approved, relevant tool calls with schema-compliant arguments.
 */

import { CONNECTION_STATES } from '../client/mcpConnectionManager.js';
import { mcpToolPolicy } from '../security/mcpToolPolicy.js';

export class McpDiscoveryPolicy {
  constructor(options = {}) {
    this.toolPolicy = options.toolPolicy || mcpToolPolicy;
  }

  /**
   * Evaluates the discovery context against the current MCP subsystem state.
   *
   * @param {import('./mcpTransactionContext.js').McpTransactionContext} context
   * @param {Object} mcpStatus - Current status from mcpService.getStatus()
   * @param {import('../services/mcpToolRegistry.js').McpToolRegistry} toolRegistry
   * @returns {Object} Discovery execution plan
   */
  evaluatePlan(context, mcpStatus = {}, toolRegistry) {
    // 1. Check if MCP is disabled in configuration or in caller options
    if (!mcpStatus.enabled || !context.mcpOptions.enabled) {
      return {
        shouldExecute: false,
        reason: !mcpStatus.enabled ? 'MCP_DISABLED_IN_CONFIG' : 'MCP_DISABLED_BY_REQUEST',
        plannedCalls: [],
        skippedTools: []
      };
    }

    // 2. Check connection status
    if (mcpStatus.connectionState !== CONNECTION_STATES.CONNECTED) {
      return {
        shouldExecute: false,
        reason: 'MCP_SERVER_DISCONNECTED',
        connectionState: mcpStatus.connectionState,
        plannedCalls: [],
        skippedTools: []
      };
    }

    // 3. Plan approved tool invocations based on discovered tools and request context
    const plannedCalls = [];
    const skippedTools = [];

    // Helper to verify tool approval and existence
    const isApprovedTool = (name) => {
      const tool = toolRegistry?.getTool(name);
      if (!tool) {
        skippedTools.push({ toolName: name, reason: 'TOOL_NOT_REGISTERED' });
        return false;
      }
      const evalResult = this.toolPolicy.evaluate(name, tool);
      if (!evalResult.allowed) {
        skippedTools.push({
          toolName: name,
          reason: evalResult.reason || 'BLOCKED_BY_POLICY',
          category: evalResult.category
        });
        return false;
      }
      return true;
    };

    // A. Documentation Search via search_docs
    if (isApprovedTool('search_docs')) {
      const query = context.searchQuery || context.tcode || '';
      if (query) {
        plannedCalls.push({
          toolName: 'search_docs',
          description: 'Search official SAP Fiori documentation and guidelines',
          arguments: {
            query,
            maxResults: context.mcpOptions.maxDocResults || 5
          },
          timeoutMs: Math.min(context.mcpOptions.timeoutMs, 10000)
        });
      } else {
        skippedTools.push({ toolName: 'search_docs', reason: 'EMPTY_SEARCH_QUERY' });
      }
    }

    // B. System Discovery via list_sap_systems
    // Only execute if explicitly requested or if landscape info is sparse
    const requestedTools = context.mcpOptions.toolsToInvoke;
    if (!requestedTools || requestedTools.includes('list_sap_systems')) {
      if (isApprovedTool('list_sap_systems')) {
        plannedCalls.push({
          toolName: 'list_sap_systems',
          description: 'Inspect configured SAP systems from environment',
          arguments: {},
          timeoutMs: Math.min(context.mcpOptions.timeoutMs, 5000)
        });
      }
    }

    // C. Evaluate any other explicitly requested tools
    if (Array.isArray(requestedTools)) {
      for (const reqTool of requestedTools) {
        if (!['search_docs', 'list_sap_systems'].includes(reqTool)) {
          isApprovedTool(reqTool);
        }
      }
    }

    // Filter by explicitly requested tools if specified
    const finalPlannedCalls = requestedTools
      ? plannedCalls.filter(call => requestedTools.includes(call.toolName))
      : plannedCalls;

    return {
      shouldExecute: finalPlannedCalls.length > 0,
      reason: finalPlannedCalls.length > 0 ? 'EXECUTION_PLANNED' : 'NO_APPLICABLE_TOOLS',
      plannedCalls: finalPlannedCalls,
      skippedTools
    };
  }
}

export const defaultMcpDiscoveryPolicy = new McpDiscoveryPolicy();
