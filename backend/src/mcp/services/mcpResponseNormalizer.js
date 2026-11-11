/**
 * Normalizes MCP server responses into predictable FioriX API response structures
 * with complete provenance tracing and structural integrity.
 */

export const MCP_PROVENANCE = {
  MCP_SERVER_RESPONSE: 'MCP_SERVER_RESPONSE',
  SAP_SYSTEM_RESPONSE: 'SAP_SYSTEM_RESPONSE',
  SAP_DOCUMENTATION_RESPONSE: 'SAP_DOCUMENTATION_RESPONSE',
  UNVERIFIED_EXTERNAL_RESPONSE: 'UNVERIFIED_EXTERNAL_RESPONSE',
  UNAVAILABLE: 'UNAVAILABLE',
  BLOCKED_BY_POLICY: 'BLOCKED_BY_POLICY'
};

/**
 * Maps a tool execution to its appropriate provenance classification.
 *
 * @param {string} toolName
 * @param {boolean} success
 * @param {string} [category]
 * @returns {string} Provenance classification
 */
export function determineProvenance(toolName, success, category) {
  if (!success) {
    return MCP_PROVENANCE.UNAVAILABLE;
  }

  if (toolName === 'search_docs') {
    return MCP_PROVENANCE.SAP_DOCUMENTATION_RESPONSE;
  }

  if (toolName === 'download_odata_service_metadata') {
    return MCP_PROVENANCE.SAP_SYSTEM_RESPONSE;
  }

  if (toolName === 'list_sap_systems' || toolName === 'list_fiori_apps') {
    return MCP_PROVENANCE.MCP_SERVER_RESPONSE;
  }

  return MCP_PROVENANCE.UNVERIFIED_EXTERNAL_RESPONSE;
}

export class McpResponseNormalizer {
  /**
   * Normalizes a raw tool execution output or error into standard FioriX API shape.
   *
   * @param {object} params
   * @param {string} params.toolName
   * @param {boolean} params.success
   * @param {string} params.executionStatus 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'TIMEOUT'
   * @param {object|null} [params.rawResult] Raw result from MCP Client callTool
   * @param {object|null} [params.error] Error object if failed
   * @param {number} params.durationMs Execution duration in milliseconds
   * @param {string} [params.connectionState] Current connection state
   * @param {string} [params.serverPackage] Package info
   * @param {string} [params.category] Tool category
   * @returns {object} Normalized response
   */
  normalize({
    toolName,
    success,
    executionStatus,
    rawResult = null,
    error = null,
    durationMs = 0,
    connectionState = 'CONNECTED',
    serverPackage = '@sap-ux/fiori-mcp-server',
    category = 'UNKNOWN'
  }) {
    const executedAt = new Date().toISOString();
    const provenance = executionStatus === 'BLOCKED'
      ? MCP_PROVENANCE.BLOCKED_BY_POLICY
      : determineProvenance(toolName, success, category);

    // Extract structured data and text blocks from raw MCP content
    let parsedData = null;
    let contentBlocks = [];
    let isErrorFromTool = false;

    if (rawResult && Array.isArray(rawResult.content)) {
      contentBlocks = rawResult.content;
      isErrorFromTool = Boolean(rawResult.isError);

      if (rawResult.structuredContent) {
        parsedData = rawResult.structuredContent;
      } else {
        // Try parsing JSON from text blocks if present
        for (const block of rawResult.content) {
          if (block.type === 'text' && typeof block.text === 'string') {
            const trimmed = block.text.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
              try {
                parsedData = JSON.parse(trimmed);
                break;
              } catch {
                // leave as null, keep text
              }
            }
          }
        }
      }
    }

    const effectiveSuccess = success && !isErrorFromTool;
    const finalExecutionStatus = isErrorFromTool ? 'FAILED' : executionStatus;

    return {
      success: effectiveSuccess,
      toolName,
      category,
      executionStatus: finalExecutionStatus,
      provenance,
      durationMs,
      executedAt,
      connectionState,
      server: {
        package: serverPackage,
        transport: 'stdio'
      },
      result: {
        parsed: parsedData,
        content: contentBlocks,
        text: contentBlocks.filter(b => b.type === 'text').map(b => b.text).join('\n'),
        rawText: contentBlocks.filter(b => b.type === 'text').map(b => b.text).join('\n')
      },
      error: error ? {
        code: error.code || 'MCP_EXECUTION_ERROR',
        message: error.message || 'Tool execution encountered an error',
        details: error.details || null
      } : (isErrorFromTool ? {
        code: 'MCP_TOOL_ERROR',
        message: 'The tool returned an error condition.',
        details: contentBlocks
      } : null)
    };
  }
}

export const mcpResponseNormalizer = new McpResponseNormalizer();
