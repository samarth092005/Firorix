/**
 * FioriX MCP Subsystem — Discovery Transaction Context
 *
 * Normalizes input transaction parameters, business requirements,
 * target system landscape, and MCP execution options into an immutable context object.
 */

export class McpTransactionContext {
  /**
   * Creates a normalized discovery context.
   *
   * @param {Object} params Raw request parameters
   */
  constructor(params = {}) {
    const rawTcode = params.tcode || params.transactionCode || '';
    this.tcode = typeof rawTcode === 'string' && rawTcode.trim()
      ? rawTcode.trim().toUpperCase()
      : null;

    this.transactionDescription = params.transactionDescription || params.description || null;

    // Normalize user requirement if present
    const req = params.userRequirement || params.requirement || null;
    if (req && typeof req === 'object') {
      this.userRequirement = {
        title: req.title || req.statement || null,
        statement: req.statement || req.description || null,
        businessProcess: req.businessProcess || null,
        capabilities: Array.isArray(req.capabilities)
          ? req.capabilities
          : (Array.isArray(req.expectedFunctionality) ? req.expectedFunctionality : [])
      };
    } else if (typeof req === 'string' && req.trim()) {
      this.userRequirement = {
        title: req.trim(),
        statement: req.trim(),
        businessProcess: null,
        capabilities: []
      };
    } else {
      this.userRequirement = null;
    }

    // Target system landscape
    const targetSys = params.targetSystem || {};
    this.targetSystem = {
      systemId: params.systemId || targetSys.systemId || 'S21-200',
      client: params.client || params.sapClient || targetSys.client || '200',
      release: params.targetRelease || params.systemRelease || targetSys.release || 'SAP S/4HANA 2023 Private Edition'
    };

    this.mode = (params.mode || (params.useLiveSap ? 'LIVE' : 'MOCK')).toUpperCase();

    // MCP execution options
    const rawMcpOptions = params.mcpOptions || {};
    this.mcpOptions = {
      enabled: rawMcpOptions.enabled !== false,
      timeoutMs: typeof rawMcpOptions.timeoutMs === 'number' && rawMcpOptions.timeoutMs > 0
        ? rawMcpOptions.timeoutMs
        : 15000,
      toolsToInvoke: Array.isArray(rawMcpOptions.toolsToInvoke) ? rawMcpOptions.toolsToInvoke : null,
      maxDocResults: typeof rawMcpOptions.maxDocResults === 'number' ? rawMcpOptions.maxDocResults : 5
    };

    // Existing evidence collected by local engines
    this.existingTechnicalEvidence = Array.isArray(params.existingTechnicalEvidence)
      ? params.existingTechnicalEvidence
      : (Array.isArray(params.evidence) ? params.evidence : []);

    // Derived search query for documentation and catalogue queries
    this.searchQuery = this._buildSearchQuery();

    Object.freeze(this);
    Object.freeze(this.targetSystem);
    Object.freeze(this.mcpOptions);
  }

  /**
   * Constructs an effective keyword query for documentation and discovery searches.
   *
   * @private
   * @returns {string}
   */
  _buildSearchQuery() {
    const parts = [];
    if (this.tcode) {
      parts.push(this.tcode);
    }
    if (this.transactionDescription && typeof this.transactionDescription === 'string') {
      parts.push(this.transactionDescription.trim());
    } else if (this.userRequirement?.title) {
      parts.push(this.userRequirement.title.trim());
    }
    return parts.join(' ').trim();
  }
}
