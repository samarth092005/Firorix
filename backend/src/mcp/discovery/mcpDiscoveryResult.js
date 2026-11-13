/**
 * Fiorify MCP Subsystem — Discovery Result Envelope
 *
 * Normalizes the output of an MCP-assisted discovery run, encapsulating
 * tool telemetry, extracted evidence, candidate enrichment metrics, and limitations.
 */

export class McpDiscoveryResult {
  constructor(options = {}) {
    this.success = options.success !== false;
    this.status = options.status || (options.success ? 'COMPLETED' : 'FAILED');

    this.mcpStatus = {
      enabled: Boolean(options.mcpStatus?.enabled),
      connectionState: options.mcpStatus?.connectionState || 'UNKNOWN',
      connected: options.mcpStatus?.connectionState === 'CONNECTED'
    };

    this.toolsInvoked = Array.isArray(options.toolsInvoked) ? options.toolsInvoked : [];
    this.toolsSkipped = Array.isArray(options.toolsSkipped) ? options.toolsSkipped : [];
    this.toolsFailed = Array.isArray(options.toolsFailed) ? options.toolsFailed : [];

    this.candidatesEnrichedCount = options.candidatesEnrichedCount || 0;
    this.mcpDiscoveredCandidatesCount = options.mcpDiscoveredCandidatesCount || 0;
    this.mcpEvidence = Array.isArray(options.mcpEvidence) ? options.mcpEvidence : [];

    this.provenance = {
      serverPackage: '@sap-ux/fiori-mcp-server',
      serverVersion: '1.15.24',
      mcpSdk: '@modelcontextprotocol/sdk@1.32.2',
      transport: 'stdio',
      timestamp: options.timestamp || new Date().toISOString()
    };

    this.limitations = Array.isArray(options.limitations)
      ? options.limitations
      : [
          'MCP tools provide auxiliary documentation and discovery evidence.',
          'MCP output does not guarantee live SAP S21 deployment or authorization.',
          'Canonical 32-record FAL catalogue remains the authoritative local baseline.'
        ];

    this.executionDurationMs = typeof options.executionDurationMs === 'number'
      ? options.executionDurationMs
      : 0;

    Object.freeze(this);
    Object.freeze(this.mcpStatus);
    Object.freeze(this.provenance);
  }
}
