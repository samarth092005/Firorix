import { mcpToolPolicy } from '../security/mcpToolPolicy.js';

/**
 * Dynamic Tool Registry for Fiorify MCP Subsystem.
 * Maintains runtime tool inventory discovered directly from the live MCP server.
 * Never fabricates tools when disconnected.
 */
export class McpToolRegistry {
  constructor(policy = mcpToolPolicy) {
    this.policy = policy;
    this.tools = new Map();
    this.lastDiscoveredAt = null;
    this.serverVersion = null;
    this.serverCapabilities = null;
  }

  /**
   * Updates the tool registry with raw tools returned from MCP server handshake/discovery.
   *
   * @param {Array<object>} rawTools Array of raw tool objects from MCP listTools
   * @param {object} [metadata]
   */
  setTools(rawTools = [], metadata = {}) {
    this.tools.clear();
    this.lastDiscoveredAt = new Date().toISOString();
    this.serverVersion = metadata.serverVersion || null;
    this.serverCapabilities = metadata.serverCapabilities || null;

    if (!Array.isArray(rawTools)) return;

    for (const tool of rawTools) {
      if (!tool || !tool.name) continue;

      const policyClassification = this.policy.classifyTool(tool);
      const schema = tool.inputSchema || {};
      const properties = schema.properties || {};
      const requiredProps = Array.isArray(schema.required) ? schema.required : [];
      const optionalProps = Object.keys(properties).filter(p => !requiredProps.includes(p));

      const entry = {
        name: tool.name,
        description: tool.description || '',
        category: policyClassification.category,
        isAllowed: policyClassification.allowed,
        readOnly: policyClassification.readOnly,
        policyReason: policyClassification.blockedReason || null,
        operationalImpact: policyClassification.operationalImpact || (policyClassification.allowed ? 'READ_ONLY' : 'EXECUTION_DISABLED'),
        inputSchema: schema,
        requiredProperties: requiredProps,
        optionalProperties: optionalProps,
        characteristics: {
          requiresConfiguredSapSystem: policyClassification.requiresConfiguredSapSystem,
          accessesExternalDocs: policyClassification.accessesExternalDocs,
          readsSapMetadata: policyClassification.readsSapMetadata,
          generatesOrModifiesFiles: policyClassification.generatesOrModifiesFiles,
          modifiesSapSystem: policyClassification.modifiesSapSystem
        },
        annotations: tool.annotations || {},
        discoveredAt: this.lastDiscoveredAt
      };

      this.tools.set(tool.name, entry);
    }
  }

  /**
   * Retrieves all registered tools as an array.
   * Returns empty array if disconnected or none discovered.
   *
   * @returns {Array<object>}
   */
  getTools() {
    return Array.from(this.tools.values());
  }

  /**
   * Retrieves a single tool by name.
   *
   * @param {string} toolName
   * @returns {object|null}
   */
  getTool(toolName) {
    if (!toolName) return null;
    return this.tools.get(toolName) || null;
  }

  /**
   * Checks whether a tool exists in the current registry.
   *
   * @param {string} toolName
   * @returns {boolean}
   */
  hasTool(toolName) {
    return this.tools.has(toolName);
  }

  /**
   * Clears the tool inventory (e.g. on server disconnection).
   */
  clear() {
    this.tools.clear();
    this.lastDiscoveredAt = null;
    this.serverVersion = null;
    this.serverCapabilities = null;
  }

  /**
   * Returns summary metrics of the current tool inventory.
   */
  getSummary() {
    const list = this.getTools();
    const allowed = list.filter(t => t.isAllowed);
    const blocked = list.filter(t => !t.isAllowed);

    const categories = {};
    for (const tool of list) {
      categories[tool.category] = (categories[tool.category] || 0) + 1;
    }

    return {
      total: list.length,
      allowedCount: allowed.length,
      blockedCount: blocked.length,
      categories,
      lastDiscoveredAt: this.lastDiscoveredAt
    };
  }
}

export const defaultMcpToolRegistry = new McpToolRegistry();
