/**
 * FioriX — Central Production API Client
 *
 * Implements centralized HTTP client for FioriX frontend communicating with
 * the FioriX SAP Finance Discovery API backend (Node.js HTTP & SAP CAP ready).
 *
 * Key Capabilities:
 * - GET and POST requests with full TypeScript typing.
 * - Automatic JSON serialization and parsing.
 * - Configurable base URL (via VITE_API_BASE_URL env or runtime config).
 * - Request timeout using native AbortController.
 * - Standardized ApiError representation with status code, correlation ID, and body.
 * - HTTP status code classification.
 * - Full Correlation ID support (auto-generation and response header extraction).
 * - Safe handling of empty bodies (204 No Content, Content-Length: 0) and non-JSON payloads.
 * - Strict adherence to Clean Core security: Privileged administrative credentials
 *   (e.g. FIORIX_ADMIN_SECRET) are never stored in client-side code, VITE_ environment
 *   variables, or dispatched from untrusted browser user-agents.
 * - Native fetch API with zero external dependencies.
 */

import type {
  TCodeSearchRequest,
  TCodeSearchResponse,
  SapSystemRecord
} from '../contracts/types';

import type {
  McpStatusResponse,
  McpToolsResponse,
  McpHealthResponse,
  McpExecutionResponse
} from '../../types/mcp';

export type {
  TCodeSearchRequest,
  TCodeSearchResponse,
  SapSystemRecord,
  McpStatusResponse,
  McpToolsResponse,
  McpHealthResponse,
  McpExecutionResponse
};

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs: number;
  defaultHeaders?: Record<string, string>;
  fetchFn?: typeof fetch;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  correlationId?: string;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export interface BackendHealthResponse {
  status: 'UP' | 'DOWN';
  timestamp: string;
  targetLandscape: {
    sid: string;
    client: string;
    release: string;
    components: string[];
    targetODataService: string;
    gatewayCatalogService: string;
  };
  btpDestinationStatus: {
    configured: boolean;
    destinationName: string;
    sapClient: string;
    destinationBindingPresent: boolean;
    connectivityBindingPresent: boolean;
  };
}

export interface GatewayServiceItem {
  id: string;
  technicalServiceName: string;
  title: string;
  description: string;
  version: number;
  serviceUrl: string;
  metadataUrl: string;
  author?: string;
  isSapService?: boolean;
  serviceType?: string;
  updatedDate?: string;
}

export interface GatewayCatalogApiResponse {
  success: boolean;
  statusCode: string;
  httpStatus: number;
  totalCount: number;
  returnedCount: number;
  fromCache?: boolean;
  services: GatewayServiceItem[];
  provenance: string;
  timestamp: string;
  errorMessage?: string;
}

export interface CatalogueAppRecord {
  appId: string;
  appName: string;
  description: string;
  appType: string;
  uiTechnology: string;
  businessProcess: string;
  lineOfBusiness: string;
  productVersion: string;
  productSuite?: string;
  release?: string;
  softwareComponent?: string;
  businessRole: string;
  businessCatalog?: string;
  technicalCatalog?: string;
  odataServices: string[];
  sapui5Component?: string;
  bspApplicationUrl?: string;
  semanticObject?: string;
  semanticAction?: string;
  leadingTransactionCodes?: string[];
  documentationUrl?: string;
  provenance: string;
  retrievalTimestamp?: string;
  importTimestamp?: string;
  sourceVersion?: string;
  importVersion?: string;
  rawMetadata?: Record<string, any>;
}

export interface CatalogueSearchParams {
  query?: string;
  appId?: string;
  appName?: string;
  tcode?: string;
  businessProcess?: string;
  lineOfBusiness?: string;
  appType?: string;
  productVersion?: string;
  limit?: number;
}

export interface CatalogueSearchApiResponse {
  success: boolean;
  statusCode: string;
  httpStatus?: number;
  totalCount: number;
  returnedCount: number;
  candidates: CatalogueAppRecord[];
  provenance: string;
  timestamp: string;
  errorMessage?: string;
}

export interface CatalogueAppDetailApiResponse {
  success: boolean;
  statusCode: string;
  httpStatus?: number;
  fromCache?: boolean;
  app: CatalogueAppRecord | null;
  provenance: string;
  timestamp: string;
  errorMessage?: string;
}

export interface CatalogueStatusInfo {
  totalRecords: number;
  uniqueApplicationIds?: number;
  duplicateRecordsCount?: number;
  sourceDistribution: Record<string, number>;
  recordsByProvenance?: Record<string, number>;
  recordsByAppType?: Record<string, number>;
  recordsByUiTechnology?: Record<string, number>;
  recordsByProductSuite?: Record<string, number>;
  recordsByRelease?: Record<string, number>;
  targetRelease?: string;
  liveSourceStatus?: string;
  recordsWithMissingCriticalMetadata?: {
    totalRecordsAnalyzed: number;
    missingOData: number;
    missingBusinessRole: number;
    missingDescription: number;
  };
  lastSuccessfulImport: string | null;
  lastAttemptedRefresh?: string | null;
  importFailures?: number;
  sourceVersion: string;
  sourceCoverage?: {
    isSubset: boolean;
    scopeDescription: string;
    localRecordCount: number;
    globalReferenceCount?: number;
    coveragePercent?: number;
  };
  catalogueFreshness?: string;
  importStatus: string;
  lastImportSummary?: any;
}

export interface CatalogueStatusApiResponse {
  success: boolean;
  status: CatalogueStatusInfo;
}

export interface TechnicalEvidenceRecord {
  evidenceId: string;
  category: 'TRANSACTION_REPOSITORY' | 'ABAP_DEV_METADATA' | 'GATEWAY_ODATA' | 'FAL_CATALOGUE' | 'AUTHORIZATION' | string;
  evidenceType?: string;
  source: string;
  retrievedValue: string | Record<string, any>;
  provenance: string;
  confidence: 'VERIFIED' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN' | string;
  reliabilityScore: number;
  verified: boolean;
  verificationStatus: string;
  limitations: string[];
  missingEvidence?: string[];
  verificationRequirements: string[];
}

export interface TransactionDiscoveryResult {
  success: boolean;
  statusCode: string;
  tcode: string;
  transactionCode: string;
  transactionIdentity?: {
    userSuppliedTCode: string;
    formatValidation: { passed: boolean; classification: string };
    sapExistenceVerification: { status: string; classification: string; details: string };
    programMetadata: { value: string | null; status: string; classification: string };
    packageMetadata: { value: string | null; status: string; classification: string };
    authorizationMetadata: { value: string | null; status: string; classification: string; details?: string };
  };
  description?: string;
  transactionDescription?: string;
  transactionType?: string;
  classification?: string;
  programName?: string | null;
  packageName?: string | null;
  softwareComponent?: string | null;
  authorizationObject?: string;
  applicationArea?: string;
  systemId: string;
  client: string;
  systemRelease: string;
  mode?: string;
  isCustomOrUnknown?: boolean;
  relatedServices?: string[];
  corroboratingServices?: string[];
  relatedObjects?: string[];
  evidence: TechnicalEvidenceRecord[];
  missingEvidence: string[];
  warnings: string[];
  evidenceConfidence: string;
  provenance: string;
  discoveryTimestamp: string;
}

export interface CandidateExplainability {
  matchingReasons: string[];
  positiveFactors: string[];
  negativeFactors: string[];
  functionalGaps: string[];
  technicalGaps: string[];
  missingEvidence: string[];
  conflicts: string[];
  assumptions: string[];
  verificationRequirements: string[];
}

export interface CandidateComparisonRow {
  rank: number;
  appId: string;
  appName: string;
  appType: string;
  tcodeRelationship: string;
  functionalFitPercent: number;
  technicalFitPercent: number;
  releaseCompatibility: string;
  missingEvidenceCount: number;
  overallScore: number;
  matchClassification: string;
  provenance: string;
  source?: string;
  sources?: string[];
  inLocalCatalogue?: boolean;
  isExternalMcpDiscovered?: boolean;
  conflictingFields?: Array<{ field: string; catalogueValue: any; mcpValue: any }>;
}

export interface FioriCandidate {
  rank: number;
  appId: string;
  appName: string;
  description: string;
  appType: string;
  uiTechnology: string;
  productVersion: string;
  productSuite?: string;
  release?: string;
  softwareComponent?: string;
  businessRole: string;
  businessProcess: string;
  lineOfBusiness: string;
  odataServices: string[];
  sapui5Component?: string;
  documentationUrl?: string;
  provenance: string;
  source?: string;
  sources?: string[];
  inLocalCatalogue?: boolean;
  isExternalMcpDiscovered?: boolean;
  conflictingFields?: Array<{ field: string; catalogueValue: any; mcpValue: any }>;
  mcpEnrichment?: {
    discoveredViaTool: string;
    mcpSnippet?: string;
    discoveryTimestamp: string;
  } | null;
  overallScore: number;
  dimensionScores: {
    tcodeRelationship: number;
    functionalFit: number;
    technicalFit: number;
    businessContext: number;
    releaseCompatibility: number;
  };
  scoreBreakdown?: {
    tcodeRelationship: number;
    functionalFit: number;
    technicalFit: number;
    businessContext: number;
    releaseCompatibility: number;
  };
  tcodeRelationshipType: string;
  releaseCompatibilityStatus: string;
  matchClassification: string;
  confidence: string;
  explainability: CandidateExplainability;
  matchingReasons?: string[];
  positiveFactors?: string[];
  negativeFactors?: string[];
  functionalGaps?: string[];
  technicalGaps?: string[];
  missingEvidence?: string[];
  conflicts?: string[];
  assumptions?: string[];
  verificationRequirements?: string[];
}

export interface FioriMatchResult {
  success: boolean;
  statusCode: string;
  transactionCode: string;
  transactionDescription: string;
  matchClassification: string;
  recommendationReadiness: 'SUFFICIENT_EVIDENCE_FOR_ASSESSMENT' | 'PARTIAL_EVIDENCE_REQUIRES_REVIEW' | 'INSUFFICIENT_EVIDENCE' | 'NO_SUITABLE_STANDARD_CANDIDATE';
  readinessReason?: string;
  totalCandidatesEvaluated: number;
  bestCandidate: FioriCandidate | null;
  rankedCandidates: FioriCandidate[];
  candidateComparison: CandidateComparisonRow[];
  assessmentHandoff: {
    requirement: Record<string, any>;
    candidate: Record<string, any>;
    context: Record<string, any>;
  } | null;
}

export interface UnifiedDiscoveryMatchResult {
  success: boolean;
  requestId: string;
  tcode: string;
  discovery: TransactionDiscoveryResult;
  matching: FioriMatchResult;
  mcpAssisted?: boolean;
  mcpDiscovery?: {
    success: boolean;
    status: string;
    mcpStatus: {
      enabled: boolean;
      connectionState: string;
      connected: boolean;
    };
    toolsInvoked: Array<{ toolName: string; executionStatus: string; durationMs: number }>;
    toolsSkipped: Array<{ toolName: string; reason: string }>;
    toolsFailed: Array<{ toolName: string; error: string; durationMs: number }>;
    candidatesEnrichedCount?: number;
    mcpDiscoveredCandidatesCount?: number;
    mcpEvidence?: any[];
    provenance?: Record<string, any>;
    limitations?: string[];
    executionDurationMs?: number;
  } | null;
  recommendationReadiness: string;
  readinessReason?: string;
  assessmentHandoff: {
    requirement: Record<string, any>;
    candidate: Record<string, any>;
    context: Record<string, any>;
  } | null;
  candidateComparison: CandidateComparisonRow[];
  candidates: FioriCandidate[];
  bestMatch: FioriCandidate | null;
}

export function sanitizeClientErrorMessage(msg: string): string {
  if (!msg || typeof msg !== 'string') return 'An unexpected error occurred.';
  return msg
    .replace(/[a-zA-Z]:\\[^\s:;,]+/g, '[internal path]')
    .replace(/\/(?:[a-zA-Z0-9_\-.]+\/)+[a-zA-Z0-9_\-.]+/g, '[internal path]');
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly statusText: string;
  public readonly correlationId?: string;
  public readonly responseBody?: unknown;
  public readonly isTimeout: boolean;
  public readonly isNetworkError: boolean;

  constructor(options: {
    message: string;
    statusCode: number;
    statusText?: string;
    correlationId?: string;
    responseBody?: unknown;
    isTimeout?: boolean;
    isNetworkError?: boolean;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.statusCode = options.statusCode;
    this.statusText = options.statusText || '';
    this.correlationId = options.correlationId;
    this.responseBody = options.responseBody;
    this.isTimeout = Boolean(options.isTimeout);
    this.isNetworkError = Boolean(options.isNetworkError);

    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, ApiError);
    }
  }
}

export function generateCorrelationId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `fx-${ts}-${rand}`;
}

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config?: Partial<ApiClientConfig>) {
    const envBaseUrl =
      typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
        ? import.meta.env.VITE_API_BASE_URL
        : '/api/v1';

    const isTestEnv = typeof window === 'undefined' || (typeof (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process !== 'undefined' && (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test');
    this.config = {
      baseUrl: envBaseUrl,
      timeoutMs: isTestEnv ? 3000 : 15000,
      ...config
    };
  }

  public getConfig(): Readonly<ApiClientConfig> {
    return { ...this.config };
  }

  public setConfig(update: Partial<ApiClientConfig>): void {
    this.config = {
      ...this.config,
      ...update
    };
  }

  private resolveUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined | null>
  ): string {
    let resolved: string;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      resolved = path;
    } else {
      let base = this.config.baseUrl;
      if (typeof window === 'undefined' && !base.startsWith('http://') && !base.startsWith('https://')) {
        const nodeProcess = (globalThis as any).process;
        const fallbackHost = (nodeProcess && nodeProcess.env?.TEST_SERVER_URL) || 'http://localhost:4004';
        base = `${fallbackHost.replace(/\/+$/, '')}/${base.replace(/^\/+/, '')}`;
      }
      const cleanBase = base.replace(/\/+$/, '');
      const cleanPath = path.replace(/^\/+/, '');
      resolved = cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase;
    }

    if (params && Object.keys(params).length > 0) {
      const isAbsolute = resolved.startsWith('http://') || resolved.startsWith('https://');
      const dummyOrigin = 'http://localhost';
      const urlObj = new URL(
        resolved,
        isAbsolute ? undefined : typeof window !== 'undefined' ? window.location.origin : dummyOrigin
      );

      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null) {
          urlObj.searchParams.append(key, String(val));
        }
      }

      if (isAbsolute || typeof window === 'undefined') {
        return urlObj.toString();
      }
      return urlObj.pathname + urlObj.search;
    }

    return resolved;
  }

  public async request<T = unknown>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    body?: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    const fetchImpl = this.config.fetchFn || globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      throw new ApiError({
        message: 'No fetch implementation available in current runtime environment.',
        statusCode: 0,
        isNetworkError: true
      });
    }

    const correlationId = options?.correlationId || generateCorrelationId();
    const timeoutMs =
      typeof options?.timeoutMs === 'number' ? options.timeoutMs : this.config.timeoutMs;
    const url = this.resolveUrl(path, options?.params);

    const controller = new AbortController();
    let timeoutId: any = null;
    let didTimeout = false;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, timeoutMs);
    }

    const onExternalAbort = () => {
      controller.abort();
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        options.signal.addEventListener('abort', onExternalAbort, { once: true });
      }
    }

    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      'X-Correlation-ID': correlationId,
      ...this.config.defaultHeaders,
      ...options?.headers
    };

    let requestBody: string | undefined = undefined;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        requestBody = body;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'text/plain';
        }
      } else {
        requestBody = JSON.stringify(body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }
    }

    try {
      const response = await fetchImpl(url, {
        method,
        headers,
        body: requestBody,
        signal: controller.signal
      });

      const responseCorrelationId =
        response.headers?.get('x-correlation-id') ||
        response.headers?.get('x-request-id') ||
        correlationId;

      // Safe handling of empty response bodies (204 No Content, 205 Reset Content, Content-Length: 0)
      if (response.status === 204 || response.status === 205) {
        return null as T;
      }
      const contentLength = response.headers?.get('content-length');
      if (contentLength === '0') {
        return null as T;
      }

      const contentType = response.headers?.get('content-type') || '';
      const rawText = await response.text();

      if (!rawText || rawText.trim().length === 0) {
        return null as T;
      }

      let parsedData: any;
      if (contentType.includes('application/json')) {
        try {
          parsedData = JSON.parse(rawText);
        } catch (jsonErr: any) {
          throw new ApiError({
            message: `Failed to parse JSON response: ${jsonErr.message}`,
            statusCode: response.status,
            statusText: response.statusText,
            correlationId: responseCorrelationId,
            responseBody: rawText
          });
        }
      } else {
        parsedData = rawText;
      }

      if (!response.ok) {
        let errorMessage: string;
        if (typeof parsedData === 'object' && parsedData !== null) {
          errorMessage =
            parsedData.errorMessage ||
            parsedData.message ||
            parsedData.error ||
            `HTTP ${response.status} ${response.statusText}`;
        } else {
          errorMessage =
            typeof parsedData === 'string' && parsedData.length > 0
              ? parsedData
              : `HTTP ${response.status} ${response.statusText}`;
        }

        throw new ApiError({
          message: sanitizeClientErrorMessage(errorMessage),
          statusCode: response.status,
          statusText: response.statusText,
          correlationId: responseCorrelationId,
          responseBody: parsedData
        });
      }

      return parsedData as T;
    } catch (err: any) {
      if (err instanceof ApiError) {
        throw err;
      }

      if (didTimeout || err.name === 'AbortError') {
        if (didTimeout) {
          throw new ApiError({
            message: `Request timed out after ${timeoutMs}ms.`,
            statusCode: 408,
            statusText: 'Request Timeout',
            correlationId,
            isTimeout: true
          });
        }
        throw new ApiError({
          message: 'Request was cancelled.',
          statusCode: 0,
          statusText: 'Aborted',
          correlationId,
          isTimeout: false
        });
      }

      // Network error / connection refused
      throw new ApiError({
        message: err.message || 'Network request failed.',
        statusCode: 0,
        statusText: 'Network Error',
        correlationId,
        isNetworkError: true,
        responseBody: err
      });
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (options?.signal) {
        options.signal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  public get<T = unknown>(path: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, 'GET', undefined, options);
  }

  public post<T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, 'POST', body, options);
  }

  public put<T = unknown>(path: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(path, 'PUT', body, options);
  }

  /**
   * Evidence-based T-Code search and Fiori discovery
   * POST /api/v1/tcode-search
   */
  public async searchTCode(
    request: TCodeSearchRequest,
    options?: ApiRequestOptions
  ): Promise<TCodeSearchResponse> {
    return this.post<TCodeSearchResponse>('/tcode-search', request, options);
  }

  /**
   * Live SAP S21 transaction discovery & ADT probing (Sprint 6.2 GET) or
   * Normalized SAP transaction discovery and evidence collection (DISC-01/02 POST).
   */
  public async discoverTransaction(
    param: string | { tcode: string; systemId?: string; client?: string; useLiveSap?: boolean },
    options?: ApiRequestOptions
  ): Promise<any> {
    if (typeof param === 'string') {
      return this.get<any>(`/transaction-discovery/${encodeURIComponent(param)}`, options);
    }
    return this.post<TransactionDiscoveryResult>('/discovery/transaction', param, options);
  }

  /**
   * Systems registry
   * GET /api/v1/systems
   */
  public async getSystems(options?: ApiRequestOptions): Promise<SapSystemRecord[]> {
    return this.get<SapSystemRecord[]>('/systems', options);
  }

  /**
   * Health status
   * GET /api/v1/health
   */
  public async getHealth(options?: ApiRequestOptions): Promise<BackendHealthResponse> {
    return this.get<BackendHealthResponse>('/health', options);
  }

  /**
   * Live SAP Gateway OData Catalog query
   * GET /api/v1/gateway/services
   */
  public async getGatewayServices(
    params?: { search?: string; limit?: number; refresh?: boolean },
    options?: ApiRequestOptions
  ): Promise<GatewayCatalogApiResponse> {
    return this.get<GatewayCatalogApiResponse>('/gateway/services', {
      ...options,
      params: {
        search: params?.search,
        limit: params?.limit,
        refresh: params?.refresh ? 'true' : undefined,
        ...options?.params
      }
    });
  }

  /**
   * Official Fiori Catalogue Search
   * GET /api/v1/fiori-catalogue/search
   */
  public async searchCatalogue(
    params?: CatalogueSearchParams,
    options?: ApiRequestOptions
  ): Promise<CatalogueSearchApiResponse> {
    return this.get<CatalogueSearchApiResponse>('/fiori-catalogue/search', {
      ...options,
      params: {
        query: params?.query,
        appId: params?.appId,
        appName: params?.appName,
        tcode: params?.tcode,
        businessProcess: params?.businessProcess,
        lineOfBusiness: params?.lineOfBusiness,
        appType: params?.appType,
        productVersion: params?.productVersion,
        limit: params?.limit,
        ...options?.params
      }
    });
  }

  /**
   * Official Fiori Application Detail by ID
   * GET /api/v1/fiori-catalogue/apps/:appId
   */
  public async getCatalogueAppById(
    appId: string,
    options?: ApiRequestOptions
  ): Promise<CatalogueAppDetailApiResponse> {
    return this.get<CatalogueAppDetailApiResponse>(
      `/fiori-catalogue/apps/${encodeURIComponent(appId)}`,
      options
    );
  }

  /**
   * Official Fiori Catalogue Ingestion Status & Metrics
   * GET /api/v1/fiori-catalogue/status
   */
  public async getCatalogueStatus(
    options?: ApiRequestOptions
  ): Promise<CatalogueStatusApiResponse> {
    return this.get<CatalogueStatusApiResponse>('/fiori-catalogue/status', options);
  }

  /**
   * Matches discovered transaction against canonical Fiori catalogue (MATCH-01/02).
   * POST /api/v1/matching/fiori-apps
   */
  public async matchFioriApps(
    params: {
      tcode?: string;
      transaction?: any;
      technicalEvidence?: any[];
      liveGatewayServices?: string[];
      userRequirement?: any;
      targetRelease?: string;
    },
    options?: ApiRequestOptions
  ): Promise<FioriMatchResult> {
    return this.post<FioriMatchResult>('/matching/fiori-apps', params, options);
  }

  /**
   * Unified end-to-end transaction discovery and Fiori matching pipeline.
   * POST /api/v1/discovery/match
   */
  public async discoverAndMatch(
    params: {
      tcode: string;
      systemId?: string;
      client?: string;
      language?: string;
      useLiveSap?: boolean;
      userRequirement?: any;
      targetRelease?: string;
      mcpOptions?: {
        enabled?: boolean;
        timeoutMs?: number;
        toolsToInvoke?: string[];
      };
      useMcp?: boolean;
    },
    options?: ApiRequestOptions
  ): Promise<UnifiedDiscoveryMatchResult> {
    return this.post<UnifiedDiscoveryMatchResult>('/discovery/match', params, options);
  }

  /**
   * Dedicated MCP-assisted transaction discovery and evidence enrichment pipeline.
   * POST /api/v1/discovery/mcp-assisted
   */
  public async discoverAndMatchMcpAssisted(
    params: {
      tcode: string;
      systemId?: string;
      client?: string;
      language?: string;
      useLiveSap?: boolean;
      userRequirement?: any;
      targetRelease?: string;
      mcpOptions?: {
        enabled?: boolean;
        timeoutMs?: number;
        toolsToInvoke?: string[];
      };
    },
    options?: ApiRequestOptions
  ): Promise<UnifiedDiscoveryMatchResult> {
    return this.post<UnifiedDiscoveryMatchResult>('/discovery/mcp-assisted', params, options);
  }

  // ==========================================
  // MCP Subsystem Methods (MCP-01 + MCP-02)
  // ==========================================

  /**
   * Retrieves current MCP connection and tool discovery status.
   * GET /api/v1/mcp/status
   */
  public async getMcpStatus(options?: ApiRequestOptions): Promise<McpStatusResponse> {
    return this.get<McpStatusResponse>('/mcp/status', options);
  }

  /**
   * Retrieves all discovered tools from the MCP server.
   * GET /api/v1/mcp/tools
   */
  public async getMcpTools(options?: ApiRequestOptions): Promise<McpToolsResponse> {
    return this.get<McpToolsResponse>('/mcp/tools', options);
  }

  /**
   * Retrieves MCP health diagnostics.
   * GET /api/v1/mcp/health
   */
  public async getMcpHealth(options?: ApiRequestOptions): Promise<McpHealthResponse> {
    return this.get<McpHealthResponse>('/mcp/health', options);
  }

  /**
   * Connects or reconnects the MCP server process (Protected).
   * POST /api/v1/mcp/connect
   */
  public async connectMcp(
    adminSecret?: string,
    options?: ApiRequestOptions
  ): Promise<any> {
    const headers = { ...options?.headers };
    if (adminSecret) {
      headers['X-FioriX-Admin-Secret'] = adminSecret;
    }
    return this.post<any>('/mcp/connect', {}, { ...options, headers });
  }

  /**
   * Disconnects the MCP server process cleanly (Protected).
   * POST /api/v1/mcp/disconnect
   */
  public async disconnectMcp(
    adminSecret?: string,
    options?: ApiRequestOptions
  ): Promise<any> {
    const headers = { ...options?.headers };
    if (adminSecret) {
      headers['X-FioriX-Admin-Secret'] = adminSecret;
    }
    return this.post<any>('/mcp/disconnect', {}, { ...options, headers });
  }

  /**
   * Executes an approved read-only tool on the MCP server (Protected).
   * POST /api/v1/mcp/tools/:toolName/execute
   */
  public async executeMcpTool(
    toolName: string,
    args: Record<string, any> = {},
    options?: ApiRequestOptions & { timeoutMs?: number; adminSecret?: string }
  ): Promise<McpExecutionResponse> {
    const headers = { ...options?.headers };
    if (options?.adminSecret) {
      headers['X-FioriX-Admin-Secret'] = options.adminSecret;
    }
    return this.post<McpExecutionResponse>(
      `/mcp/tools/${encodeURIComponent(toolName)}/execute`,
      { arguments: args, timeoutMs: options?.timeoutMs },
      { ...options, headers }
    );
  }

  // ==========================================
  // Fit-Gap, Recommendation & Lifecycle APIs
  // ==========================================

  /**
   * Executes 10-dimension fit-gap assessment (FITGAP-02).
   * POST /api/v1/fitgap/assess
   */
  public async assessFitGap(
    params: {
      requirement: any;
      candidate: any;
      context?: any;
    },
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.post<any>('/fitgap/assess', params, options);
  }

  /**
   * Generates governed recommendation and actionable remediation plan (REC-01).
   * POST /api/v1/recommendations/generate
   */
  public async generateRecommendation(
    params: {
      assessment?: any;
      requirement?: any;
      candidate?: any;
      context?: any;
      discoveryResult?: any;
      matchingResult?: any;
    },
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.post<any>('/recommendations/generate', params, options);
  }

  /**
   * Persists a new assessment record (PERSIST-01/02).
   * POST /api/v1/assessments
   */
  public async saveAssessment(
    payload: any,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.post<any>('/assessments', payload, options);
  }

  public async createAssessment(
    payload: any,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.saveAssessment(payload, options);
  }

  /**
   * Updates an existing assessment record and advances lifecycle state (PERSIST-02).
   * PUT /api/v1/assessments/:id
   */
  public async updateAssessment(
    id: string,
    updates: any,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.put<any>(`/assessments/${encodeURIComponent(id)}`, updates, options);
  }

  /**
   * Archives an assessment record (PERSIST-02).
   * POST /api/v1/assessments/:id/archive
   */
  public async archiveAssessment(
    id: string,
    payload?: { author?: string; comment?: string },
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.post<any>(`/assessments/${encodeURIComponent(id)}/archive`, payload || {}, options);
  }

  /**
   * Retrieves full chronological audit history for an assessment (PERSIST-02).
   * GET /api/v1/assessments/:id/audit
   */
  public async getAssessmentAudit(
    id: string,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.get<any>(`/assessments/${encodeURIComponent(id)}/audit`, options);
  }

  /**
   * Lists persisted assessment records with optional filtering.
   * GET /api/v1/assessments
   */
  public async getAssessments(
    params?: {
      businessArea?: string;
      status?: string;
      lifecycleStatus?: string;
      includeArchived?: boolean;
      search?: string;
      searchTerm?: string;
      systemId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.get<any>('/assessments', { ...options, params: params as any });
  }

  /**
   * Retrieves single persisted assessment by ID.
   * GET /api/v1/assessments/:id
   */
  public async getAssessmentById(
    id: string,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.get<any>(`/assessments/${encodeURIComponent(id)}`, options);
  }

  /**
   * Retrieves operational dashboard summary metrics.
   * GET /api/v1/assessments/summary
   */
  public async getAssessmentSummary(
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.get<any>('/assessments/summary', options);
  }

  /**
   * Records a modernization decision action (MW-02).
   * POST /api/v1/assessments/:id/modernization-action
   */
  public async recordModernizationAction(
    assessmentId: string,
    actionPayload: any,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.post<any>(
      `/assessments/${encodeURIComponent(assessmentId)}/modernization-action`,
      actionPayload,
      options
    );
  }

  /**
   * Retrieves modernization decision history for an assessment (MW-02).
   * GET /api/v1/assessments/:id/modernization-decisions
   */
  public async getModernizationDecisions(
    assessmentId: string,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.get<any>(
      `/assessments/${encodeURIComponent(assessmentId)}/modernization-decisions`,
      options
    );
  }

  /**
   * Persists a Generation Studio project handoff (MW-03).
   * POST /api/v1/generation/handoff
   */
  public async createGenerationHandoff(
    payload: any,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.post<any>('/generation/handoff', payload, options);
  }

  /**
   * Retrieves a Generation Studio project handoff by ID (MW-03).
   * GET /api/v1/generation/handoff/:id
   */
  public async getGenerationHandoff(
    handoffId: string,
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.get<any>(
      `/generation/handoff/${encodeURIComponent(handoffId)}`,
      options
    );
  }

  /**
   * Lists Generation Studio project handoffs (MW-03).
   * GET /api/v1/generation/handoff
   */
  public async listGenerationHandoffs(
    params?: { assessmentId?: string; tcode?: string },
    options?: ApiRequestOptions
  ): Promise<any> {
    return this.get<any>('/generation/handoff', { ...options, params: params as any });
  }
}

export const apiClientConfig: ApiClientConfig = {
  baseUrl:
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL
      : '/api/v1',
  timeoutMs: 15000
};

export const apiClient = new ApiClient(apiClientConfig);
