/**
 * FioriX — SAP Fiori MCP Subsystem Types (MCP-01 + MCP-02)
 */

export type McpConnectionState =
  | 'NOT_CONFIGURED'
  | 'STOPPED'
  | 'STARTING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'ERROR';

export type McpToolCategory =
  | 'DOCUMENTATION_SEARCH'
  | 'FIORI_APPLICATION_DISCOVERY'
  | 'SAP_SYSTEM_DISCOVERY'
  | 'ODATA_METADATA_RETRIEVAL'
  | 'APPLICATION_MODIFICATION_INSPECTION'
  | 'APPLICATION_GENERATION'
  | 'APPLICATION_MODIFICATION'
  | 'UNKNOWN';

export interface McpToolCharacteristics {
  requiresConfiguredSapSystem: boolean;
  accessesExternalDocs: boolean;
  readsSapMetadata: boolean;
  generatesOrModifiesFiles: boolean;
  modifiesSapSystem: boolean;
}

export interface McpTool {
  name: string;
  description: string;
  category: McpToolCategory | string;
  isAllowed: boolean;
  readOnly: boolean;
  policyReason: string | null;
  operationalImpact: 'READ_ONLY' | 'EXECUTION_DISABLED';
  inputSchema: {
    type?: string;
    properties?: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
    description?: string;
    [key: string]: any;
  };
  requiredProperties: string[];
  optionalProperties: string[];
  characteristics: McpToolCharacteristics;
  annotations?: {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
    [key: string]: any;
  };
  discoveredAt?: string;
}

export interface McpStatusInfo {
  enabled: boolean;
  connectionState: McpConnectionState;
  serverPackage: string;
  serverVersion: string;
  transport: string;
  lastConnectedAt: string | null;
  lastToolDiscoveryAt: string | null;
  toolCount: number;
  allowedToolCount: number;
  blockedToolCount: number;
  errorSummary: {
    message: string;
    code: string;
    timestamp: string;
  } | null;
  serverCapabilities: any;
  serverVersionReported: {
    name?: string;
    version?: string;
  } | null;
}

export interface McpStatusResponse {
  success: boolean;
  status: McpStatusInfo;
}

export interface McpToolsResponse {
  success: boolean;
  available: boolean;
  connectionState: McpConnectionState;
  message?: string;
  total: number;
  tools: McpTool[];
}

export interface McpHealthDiagnosticComponent {
  status: string;
  message?: string;
  package?: string;
  version?: string;
  connectionState?: string;
  serverReportedVersion?: any;
  count?: number;
  lastDiscoveryAt?: string | null;
  verified?: boolean;
  note?: string;
}

export interface McpHealthResponse {
  success: boolean;
  health: {
    status: 'HEALTHY' | 'DEGRADED' | 'DISABLED';
    timestamp: string;
    components: {
      backendAvailability: McpHealthDiagnosticComponent;
      mcpSubsystemConfigured: McpHealthDiagnosticComponent;
      mcpProcessAvailability: McpHealthDiagnosticComponent;
      mcpHandshakeStatus: McpHealthDiagnosticComponent;
      toolDiscoveryStatus: McpHealthDiagnosticComponent;
      sapSystemConnectivity: McpHealthDiagnosticComponent;
    };
  };
}

export interface McpExecutionContentBlock {
  type: string;
  text?: string;
  [key: string]: any;
}

export interface McpExecutionResponse {
  success: boolean;
  toolName: string;
  category: string;
  executionStatus: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'TIMEOUT';
  provenance:
    | 'MCP_SERVER_RESPONSE'
    | 'SAP_SYSTEM_RESPONSE'
    | 'SAP_DOCUMENTATION_RESPONSE'
    | 'UNVERIFIED_EXTERNAL_RESPONSE'
    | 'UNAVAILABLE'
    | 'BLOCKED_BY_POLICY';
  durationMs: number;
  executedAt: string;
  connectionState: string;
  server: {
    package: string;
    transport: string;
  };
  result: {
    parsed: any;
    content: McpExecutionContentBlock[];
    rawText: string;
  };
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
}
