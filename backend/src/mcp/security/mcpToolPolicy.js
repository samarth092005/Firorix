/**
 * Secure Tool Execution Policy for Fiorify MCP Subsystem.
 * Enforces a conservative allowlist restricting execution to read-only tools.
 * All generation and modification tools are blocked by policy.
 */

export const TOOL_CATEGORIES = {
  DOCUMENTATION_SEARCH: 'DOCUMENTATION_SEARCH',
  FIORI_APPLICATION_DISCOVERY: 'FIORI_APPLICATION_DISCOVERY',
  SAP_SYSTEM_DISCOVERY: 'SAP_SYSTEM_DISCOVERY',
  ODATA_METADATA_RETRIEVAL: 'ODATA_METADATA_RETRIEVAL',
  APPLICATION_MODIFICATION_INSPECTION: 'APPLICATION_MODIFICATION_INSPECTION',
  APPLICATION_GENERATION: 'APPLICATION_GENERATION',
  APPLICATION_MODIFICATION: 'APPLICATION_MODIFICATION',
  UNKNOWN: 'UNKNOWN'
};

/**
 * Static policy definitions for known tools.
 */
const KNOWN_TOOL_POLICIES = {
  search_docs: {
    category: TOOL_CATEGORIES.DOCUMENTATION_SEARCH,
    allowed: true,
    readOnly: true,
    requiresConfiguredSapSystem: false,
    accessesExternalDocs: true,
    readsSapMetadata: false,
    generatesOrModifiesFiles: false,
    modifiesSapSystem: false,
    description: 'Searches SAP Fiori elements, Annotations, UI5, OPA5 Guides, SAP Fiori tools documentation'
  },
  list_fiori_apps: {
    category: TOOL_CATEGORIES.FIORI_APPLICATION_DISCOVERY,
    allowed: true,
    readOnly: true,
    requiresConfiguredSapSystem: false,
    accessesExternalDocs: false,
    readsSapMetadata: false,
    generatesOrModifiesFiles: false,
    modifiesSapSystem: false,
    description: 'Scans a specified directory to find existing SAP Fiori applications'
  },
  list_sap_systems: {
    category: TOOL_CATEGORIES.SAP_SYSTEM_DISCOVERY,
    allowed: true,
    readOnly: true,
    requiresConfiguredSapSystem: false,
    accessesExternalDocs: false,
    readsSapMetadata: false,
    generatesOrModifiesFiles: false,
    modifiesSapSystem: false,
    description: 'Lists all SAP systems from the user environment store'
  },
  download_odata_service_metadata: {
    category: TOOL_CATEGORIES.ODATA_METADATA_RETRIEVAL,
    allowed: false,
    readOnly: false,
    requiresConfiguredSapSystem: true,
    accessesExternalDocs: false,
    readsSapMetadata: true,
    generatesOrModifiesFiles: true,
    modifiesSapSystem: false,
    operationalImpact: 'BLOCKED_PENDING_REVIEW',
    blockedReason: 'File-writing operation: downloads and writes metadata.xml to the local filesystem; blocked by policy pending review.',
    description: 'Downloads the metadata (EDMX) of a specific OData service from a SAP system and writes metadata.xml to disk'
  },
  list_functionality: {
    category: TOOL_CATEGORIES.APPLICATION_MODIFICATION_INSPECTION,
    allowed: true,
    readOnly: true,
    requiresConfiguredSapSystem: false,
    accessesExternalDocs: false,
    readsSapMetadata: false,
    generatesOrModifiesFiles: false,
    modifiesSapSystem: false,
    description: 'Gets the list of supported modification functionalities for an existing SAP Fiori application'
  },
  get_functionality_details: {
    category: TOOL_CATEGORIES.APPLICATION_MODIFICATION_INSPECTION,
    allowed: true,
    readOnly: true,
    requiresConfiguredSapSystem: false,
    accessesExternalDocs: false,
    readsSapMetadata: false,
    generatesOrModifiesFiles: false,
    modifiesSapSystem: false,
    description: 'Gets required parameters and details for a specific modification functionality'
  },
  generate_fiori_app_odata: {
    category: TOOL_CATEGORIES.APPLICATION_GENERATION,
    allowed: false,
    readOnly: false,
    requiresConfiguredSapSystem: true,
    accessesExternalDocs: false,
    readsSapMetadata: true,
    generatesOrModifiesFiles: true,
    modifiesSapSystem: false,
    blockedReason: 'Application generation is disabled in MCP-01/MCP-02 milestone by policy.'
  },
  generate_fiori_app_cap: {
    category: TOOL_CATEGORIES.APPLICATION_GENERATION,
    allowed: false,
    readOnly: false,
    requiresConfiguredSapSystem: false,
    accessesExternalDocs: false,
    readsSapMetadata: false,
    generatesOrModifiesFiles: true,
    modifiesSapSystem: false,
    blockedReason: 'CAP application generation is disabled in MCP-01/MCP-02 milestone by policy.'
  },
  execute_functionality: {
    category: TOOL_CATEGORIES.APPLICATION_MODIFICATION,
    allowed: false,
    readOnly: false,
    requiresConfiguredSapSystem: false,
    accessesExternalDocs: false,
    readsSapMetadata: false,
    generatesOrModifiesFiles: true,
    modifiesSapSystem: false,
    blockedReason: 'Application code modification execution is disabled in MCP-01/MCP-02 milestone by policy.'
  }
};

export class McpToolPolicy {
  constructor(customPolicies = {}) {
    this.customPolicies = customPolicies;
  }

  /**
   * Classifies a discovered tool based on its name, description, schema, and annotations.
   *
   * @param {object} tool Raw tool definition from MCP server
   * @returns {object} Categorized and policy-annotated tool metadata
   */
  classifyTool(tool) {
    if (!tool || !tool.name) {
      return {
        category: TOOL_CATEGORIES.UNKNOWN,
        allowed: false,
        readOnly: false,
        requiresConfiguredSapSystem: false,
        accessesExternalDocs: false,
        readsSapMetadata: false,
        generatesOrModifiesFiles: false,
        modifiesSapSystem: false,
        blockedReason: 'Tool metadata is invalid or missing.'
      };
    }

    const toolName = tool.name;

    // Check custom policy overrides first
    if (this.customPolicies[toolName]) {
      return { ...this.customPolicies[toolName] };
    }

    // Check known tools
    if (KNOWN_TOOL_POLICIES[toolName]) {
      return { ...KNOWN_TOOL_POLICIES[toolName] };
    }

    // Infer from tool metadata for unknown tools
    const desc = (tool.description || '').toLowerCase();
    const annotations = tool.annotations || {};
    const readOnlyHint = Boolean(annotations.readOnlyHint);
    const destructiveHint = Boolean(annotations.destructiveHint);

    let category = TOOL_CATEGORIES.UNKNOWN;
    if (desc.includes('search') && desc.includes('doc')) {
      category = TOOL_CATEGORIES.DOCUMENTATION_SEARCH;
    } else if (desc.includes('list') && desc.includes('fiori')) {
      category = TOOL_CATEGORIES.FIORI_APPLICATION_DISCOVERY;
    } else if (desc.includes('system')) {
      category = TOOL_CATEGORIES.SAP_SYSTEM_DISCOVERY;
    } else if (desc.includes('metadata') || desc.includes('edmx')) {
      category = TOOL_CATEGORIES.ODATA_METADATA_RETRIEVAL;
    } else if (desc.includes('generate') || desc.includes('create')) {
      category = TOOL_CATEGORIES.APPLICATION_GENERATION;
    } else if (desc.includes('modify') || desc.includes('execute')) {
      category = TOOL_CATEGORIES.APPLICATION_MODIFICATION;
    }

    // Strict default: only allow if explicitly read-only and not destructive and category is read-only
    const allowed = readOnlyHint && !destructiveHint && [
      TOOL_CATEGORIES.DOCUMENTATION_SEARCH,
      TOOL_CATEGORIES.FIORI_APPLICATION_DISCOVERY,
      TOOL_CATEGORIES.SAP_SYSTEM_DISCOVERY,
      TOOL_CATEGORIES.ODATA_METADATA_RETRIEVAL,
      TOOL_CATEGORIES.APPLICATION_MODIFICATION_INSPECTION
    ].includes(category);

    return {
      category,
      allowed,
      readOnly: readOnlyHint,
      requiresConfiguredSapSystem: desc.includes('sap system'),
      accessesExternalDocs: desc.includes('doc'),
      readsSapMetadata: desc.includes('metadata'),
      generatesOrModifiesFiles: destructiveHint || !readOnlyHint,
      modifiesSapSystem: false,
      blockedReason: allowed ? null : 'Tool not permitted by conservative read-only policy.'
    };
  }

  /**
   * Evaluates if a given tool is permitted to execute.
   *
   * @param {string} toolName
   * @param {object} [toolDefinition] Optional discovered tool definition
   * @returns {{ allowed: boolean, category: string, reason?: string }}
   */
  evaluate(toolName, toolDefinition = null) {
    if (!toolName || typeof toolName !== 'string') {
      return {
        allowed: false,
        category: TOOL_CATEGORIES.UNKNOWN,
        reason: 'Tool name is required as a string.'
      };
    }

    const classification = this.classifyTool(toolDefinition || { name: toolName });
    if (!classification.allowed) {
      return {
        allowed: false,
        category: classification.category,
        operationalImpact: classification.operationalImpact || 'EXECUTION_DISABLED',
        reason: classification.blockedReason || 'MCP_TOOL_BLOCKED_BY_POLICY'
      };
    }

    return {
      allowed: true,
      category: classification.category,
      operationalImpact: 'READ_ONLY'
    };
  }
}

export const mcpToolPolicy = new McpToolPolicy();
