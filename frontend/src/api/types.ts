/**
 * Re-exports canonical API & contract types so consumers of `src/api/types`
 * do not maintain duplicate interface definitions.
 */
export type {
  ApiClientConfig,
  ApiRequestOptions,
  BackendHealthResponse,
  GatewayServiceItem
} from '../services/api/apiClient';

export type {
  TCodeSearchRequest,
  TCodeSearchResponse,
  SapSystemRecord
} from '../services/contracts/types';

export type {
  McpStatusResponse,
  McpToolsResponse,
  McpHealthResponse,
  McpExecutionResponse
} from '../types/mcp';
