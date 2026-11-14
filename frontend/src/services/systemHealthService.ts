/**
 * Fiorify — Centralized Landscape Health and System Management Service
 *
 * Consumes real backend APIs via apiClient:
 * - GET /api/v1/health (backend status, target landscape, BTP destination bindings)
 * - GET /api/v1/systems (registered SAP landscapes and connection metadata)
 * - GET /api/v1/gateway/services (live Gateway catalog query with search & pagination)
 *
 * Upholds Clean Core Governance & FX-003 Health Separation:
 * 1. Fiorify backend health.
 * 2. Configured SAP system status.
 * 3. SAP host reachability (never assumed).
 * 4. Cloud Connector availability (never assumed from destination config alone).
 * 5. SAP Gateway availability.
 * 6. Gateway service catalogue retrieval status.
 */

import {
  SystemHealthResponse,
  SapComponentInfo,
  SystemConnectionState,
  LandscapeHealthIndicators,
  HealthIndicatorItem,
  IndicatorStatus
} from './contracts/types';
import {
  apiClient,
  ApiError,
  BackendHealthResponse,
  GatewayCatalogApiResponse,
  GatewayServiceItem
} from './api/apiClient';
import { demoDataProvider } from './mock/demoAssessmentProvider';

export interface GatewayCatalogResult {
  status: 'LOADED' | 'UNAUTHORIZED' | 'UNREACHABLE' | 'EMPTY' | 'BACKEND_OFFLINE' | 'LOADING';
  services: GatewayServiceItem[];
  totalCount: number;
  returnedCount: number;
  fromCache: boolean;
  errorMessage?: string;
  provenance: string;
}

export interface ISystemHealthService {
  getSystemHealth(systemId?: string): Promise<SystemHealthResponse>;
  getSystemComponents(systemId?: string): Promise<SapComponentInfo[]>;
  getGatewayCatalog(params?: {
    search?: string;
    limit?: number;
    refresh?: boolean;
  }): Promise<GatewayCatalogResult>;
  testConnection(systemId?: string): Promise<{
    success: boolean;
    connectionState: SystemConnectionState;
    message: string;
    testedAt: string;
    details: string;
  }>;
}

class SystemHealthService implements ISystemHealthService {
  /**
   * Retrieves comprehensive landscape health and separated indicators from backend APIs.
   */
  async getSystemHealth(_systemId: string = 'S21'): Promise<SystemHealthResponse> {
    const timestamp = new Date().toISOString();

    let backendHealth: BackendHealthResponse | null = null;
    let backendError: ApiError | Error | null = null;

    try {
      backendHealth = await apiClient.getHealth();
    } catch (err: any) {
      backendError = err;
    }

    // Attempt to probe Gateway Catalog status (unprivileged client will receive 401 or 200 or 502)
    let gatewayCatalogResult: GatewayCatalogApiResponse | null = null;
    let gatewayError: ApiError | Error | null = null;

    if (backendHealth) {
      try {
        gatewayCatalogResult = await apiClient.getGatewayServices({ limit: 1 });
      } catch (gwErr: any) {
        gatewayError = gwErr;
      }
    }

    // If backend is completely offline, return honest offline state
    if (!backendHealth) {
      const offlineMsg =
        backendError instanceof ApiError
          ? backendError.message
          : 'Fiorify backend is offline or unreachable on http://localhost:4004.';

      const indicators: LandscapeHealthIndicators = {
        backendHealth: {
          id: 'backend',
          label: 'Fiorify Backend Service',
          status: 'OFFLINE',
          statusText: 'OFFLINE',
          badgeVariant: 'error',
          details: `Backend HTTP service unreachable: ${offlineMsg}`,
          lastChecked: timestamp
        },
        configuredSystem: {
          id: 'configured-system',
          label: 'Configured SAP Landscape',
          status: 'UNKNOWN',
          statusText: 'UNKNOWN',
          badgeVariant: 'neutral',
          details: 'Cannot inspect configured landscapes while backend is offline.',
          lastChecked: timestamp
        },
        sapHostReachability: {
          id: 'host-reachability',
          label: 'SAP Host Reachability',
          status: 'UNKNOWN',
          statusText: 'UNKNOWN',
          badgeVariant: 'neutral',
          details: 'Host reachability cannot be measured while backend is offline.',
          lastChecked: timestamp
        },
        cloudConnector: {
          id: 'cloud-connector',
          label: 'Cloud Connector Tunnel',
          status: 'UNKNOWN',
          statusText: 'UNKNOWN',
          badgeVariant: 'neutral',
          details: 'Tunnel availability cannot be checked without backend connectivity.',
          lastChecked: timestamp
        },
        sapGateway: {
          id: 'sap-gateway',
          label: 'SAP Gateway Service',
          status: 'UNKNOWN',
          statusText: 'UNKNOWN',
          badgeVariant: 'neutral',
          details: 'Gateway status unverified while backend is offline.',
          lastChecked: timestamp
        },
        gatewayCatalog: {
          id: 'gateway-catalog',
          label: 'Gateway Service Catalogue',
          status: 'OFFLINE',
          statusText: 'BACKEND OFFLINE',
          badgeVariant: 'error',
          details: 'Catalogue retrieval requires an active Fiorify backend service.',
          lastChecked: timestamp
        }
      };

      // Fallback baseline for components while preserving demo fallback compatibility
      const demoFallback = demoDataProvider.getSystemHealth();

      return {
        ...demoFallback,
        systemId: 'S21',
        client: '200',
        platform: 'SAP S/4HANA 2023 Private Edition',
        connectionState: demoFallback.connectionState || 'DEMO_MODE',
        isLiveConnection: false,
        lastSyncTimestamp: timestamp,
        connectivityStatus: {
          status: 'OFFLINE',
          destinationName: 'S21',
          cloudConnectorSubaccount: 'subacc-eur-s21-private',
          message: `Backend service is offline: ${offlineMsg}`
        },
        indicators
      };
    }

    // Backend is UP! Derive separated indicators honestly per Step 4
    const { targetLandscape, btpDestinationStatus } = backendHealth;

    // 1. Fiorify Backend Health
    const backendIndicator: HealthIndicatorItem = {
      id: 'backend',
      label: 'Fiorify Backend Service',
      status: 'ONLINE',
      statusText: 'UP (OPERATIONAL)',
      badgeVariant: 'success',
      details: 'Node 20 LTS native HTTP discovery service is active on port 4004.',
      lastChecked: backendHealth.timestamp
    };

    // 2. Configured SAP System Status
    const configuredIndicator: HealthIndicatorItem = {
      id: 'configured-system',
      label: 'Configured SAP Landscape',
      status: 'CONFIGURED',
      statusText: `${targetLandscape.sid} (CLIENT ${targetLandscape.client})`,
      badgeVariant: 'success',
      details: `Landscape ${targetLandscape.sid} (${targetLandscape.release}) configured with destination ${btpDestinationStatus.destinationName}.`,
      lastChecked: backendHealth.timestamp
    };

    // 3. SAP Host Reachability (Rule: Never assume reachability merely because destination is configured)
    const hostReachabilityIndicator: HealthIndicatorItem = {
      id: 'host-reachability',
      label: 'SAP Host Reachability',
      status: 'NOT_VERIFIED',
      statusText: 'NOT VERIFIED',
      badgeVariant: 'warning',
      details: 'SAP host reachability is not continuously pinged. Run a connection test to probe live host responsiveness.',
      lastChecked: backendHealth.timestamp
    };

    // 4. Cloud Connector Availability (Rule: Never report connected merely because destination is configured)
    const hasConnectivityBinding = Boolean(btpDestinationStatus.connectivityBindingPresent);
    const cloudConnectorIndicator: HealthIndicatorItem = {
      id: 'cloud-connector',
      label: 'Cloud Connector Tunnel',
      status: 'NOT_VERIFIED',
      statusText: hasConnectivityBinding ? 'NOT VERIFIED (BINDING PRESENT)' : 'NOT VERIFIED (BINDING ABSENT)',
      badgeVariant: 'warning',
      details: hasConnectivityBinding
        ? 'BTP connectivity binding is present in configuration, but live on-premise tunnel to S21 is not verified.'
        : 'Cloud Connector connectivity service binding is absent from environment configuration.',
      lastChecked: backendHealth.timestamp
    };

    // 5. SAP Gateway Availability
    let gatewayStatus: IndicatorStatus = 'NOT_VERIFIED';
    let gatewayStatusText = 'NOT VERIFIED';
    let gatewayVariant: HealthIndicatorItem['badgeVariant'] = 'warning';
    let gatewayDetails = `Gateway endpoint: ${targetLandscape.gatewayCatalogService}. Live status pending verification.`;

    // 6. Gateway Service Catalogue Retrieval Status
    let catalogStatus: IndicatorStatus = 'NOT_VERIFIED';
    let catalogStatusText = 'NOT VERIFIED';
    let catalogVariant: HealthIndicatorItem['badgeVariant'] = 'warning';
    let catalogDetails = 'Service catalogue has not been queried.';
    let totalApps = 14850;

    if (gatewayCatalogResult && gatewayCatalogResult.success) {
      gatewayStatus = 'ONLINE';
      gatewayStatusText = 'AVAILABLE (LIVE)';
      gatewayVariant = 'success';
      gatewayDetails = `SAP Gateway Catalog active with ${gatewayCatalogResult.totalCount.toLocaleString()} services registered.`;

      catalogStatus = gatewayCatalogResult.totalCount > 0 ? 'ONLINE' : 'NOT_VERIFIED';
      catalogStatusText = `LOADED (${gatewayCatalogResult.totalCount.toLocaleString()} SERVICES)`;
      catalogVariant = 'success';
      catalogDetails = `Successfully queried live S21 Gateway Catalog via BTP Destination ${btpDestinationStatus.destinationName}.`;
      totalApps = gatewayCatalogResult.totalCount;
    } else if (gatewayError instanceof ApiError) {
      if (gatewayError.statusCode === 401) {
        catalogStatus = 'UNAUTHORIZED';
        catalogStatusText = 'UNAUTHORIZED';
        catalogVariant = 'neutral';
        catalogDetails = 'Protected operation: Server-side administrative authorization required. Client-side browser does not transmit privileged secrets.';
      } else if (gatewayError.statusCode === 502 || gatewayError.isNetworkError) {
        gatewayStatus = 'UNREACHABLE';
        gatewayStatusText = 'UNREACHABLE';
        gatewayVariant = 'error';
        gatewayDetails = `Gateway host unreachable or connection timed out: ${gatewayError.message}`;

        catalogStatus = 'UNREACHABLE';
        catalogStatusText = 'GATEWAY UNREACHABLE';
        catalogVariant = 'error';
        catalogDetails = `Failed to query catalog over BTP destination: ${gatewayError.message}`;
      } else {
        catalogStatus = 'UNKNOWN';
        catalogStatusText = `HTTP ${gatewayError.statusCode}`;
        catalogVariant = 'warning';
        catalogDetails = gatewayError.message;
      }
    }

    const sapGatewayIndicator: HealthIndicatorItem = {
      id: 'sap-gateway',
      label: 'SAP Gateway Service',
      status: gatewayStatus,
      statusText: gatewayStatusText,
      badgeVariant: gatewayVariant,
      details: gatewayDetails,
      lastChecked: backendHealth.timestamp
    };

    const gatewayCatalogIndicator: HealthIndicatorItem = {
      id: 'gateway-catalog',
      label: 'Gateway Service Catalogue',
      status: catalogStatus,
      statusText: catalogStatusText,
      badgeVariant: catalogVariant,
      details: catalogDetails,
      lastChecked: backendHealth.timestamp
    };

    const indicators: LandscapeHealthIndicators = {
      backendHealth: backendIndicator,
      configuredSystem: configuredIndicator,
      sapHostReachability: hostReachabilityIndicator,
      cloudConnector: cloudConnectorIndicator,
      sapGateway: sapGatewayIndicator,
      gatewayCatalog: gatewayCatalogIndicator
    };

    // Parse components from backend targetLandscape
    const components: SapComponentInfo[] = (targetLandscape.components || []).map((compStr) => {
      const parts = compStr.split(' ');
      const name = parts[0] || compStr;
      const release = parts[1] || 'Recorded';
      return {
        name,
        release,
        spLevel: 'Recorded',
        description:
          name === 'S4CORE'
            ? 'S/4HANA Core Application Component'
            : name === 'SAP_BASIS'
            ? 'SAP Basis Component'
            : name === 'SAP_UI'
            ? 'SAP User Interface Technology'
            : name === 'SAP_GWFND'
            ? 'SAP Gateway Foundation'
            : 'SAP Software Component',
        status: 'RECORDED_AWAITING_REFRESH'
      };
    });

    return {
      systemId: targetLandscape.sid,
      client: targetLandscape.client,
      platform: targetLandscape.release,
      systemName: `${targetLandscape.sid} ${targetLandscape.release}`,
      connectionState: 'DEMO_MODE', // Default honest display mode in frontend
      isLiveConnection: false,
      lastSyncTimestamp: `${backendHealth.timestamp.replace('T', ' ').substring(0, 19)} (Live Backend Telemetry)`,
      connectivityStatus: {
        status: 'ONLINE',
        destinationName: btpDestinationStatus.destinationName,
        cloudConnectorSubaccount: 'subacc-eur-s21-private',
        message: 'Backend service active. S21 host reachability pending live verification.'
      },
      metadataService: {
        status: 'MOCK_STANDBY',
        endpoint: targetLandscape.targetODataService,
        version: 'V2 / ADT 7.58'
      },
      catalogueStatus: {
        status: catalogStatus === 'ONLINE' ? 'LOADED' : 'NOT_INITIALIZED',
        version: 'SAP Fiori Apps Reference Library 2023 FPS02',
        totalAppsCatalogued: totalApps
      },
      components,
      indicators
    };
  }

  async getSystemComponents(_systemId: string = 'S21'): Promise<SapComponentInfo[]> {
    const health = await this.getSystemHealth(_systemId);
    return health.components;
  }

  /**
   * Queries the live SAP Gateway Service Catalog via backend GET /api/v1/gateway/services.
   * Handles loading, authorized, unauthorized, empty, and offline error states cleanly.
   */
  async getGatewayCatalog(params?: {
    search?: string;
    limit?: number;
    refresh?: boolean;
  }): Promise<GatewayCatalogResult> {
    try {
      const response = await apiClient.getGatewayServices(params);
      const services = response.services || [];
      const totalCount = response.totalCount || services.length;

      return {
        status: totalCount === 0 ? 'EMPTY' : 'LOADED',
        services,
        totalCount,
        returnedCount: response.returnedCount || services.length,
        fromCache: Boolean(response.fromCache),
        provenance: response.provenance || 'LIVE_SAP_S21',
        errorMessage: response.errorMessage
      };
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          return {
            status: 'UNAUTHORIZED',
            services: [],
            totalCount: 0,
            returnedCount: 0,
            fromCache: false,
            provenance: 'LIVE_SAP_S21',
            errorMessage:
              'Access denied: Server-side administrative secret required for live Gateway catalog inspection. Client-side browser credentials are not exposed per Clean Core security guidelines.'
          };
        }

        if (err.statusCode === 502 || err.isNetworkError) {
          return {
            status: 'UNREACHABLE',
            services: [],
            totalCount: 0,
            returnedCount: 0,
            fromCache: false,
            provenance: 'LIVE_SAP_S21',
            errorMessage: `Failed to connect to SAP S21 Gateway Catalog: ${err.message}`
          };
        }
      }

      return {
        status: 'BACKEND_OFFLINE',
        services: [],
        totalCount: 0,
        returnedCount: 0,
        fromCache: false,
        provenance: 'LIVE_SAP_S21',
        errorMessage: `Backend service is offline: ${err.message}`
      };
    }
  }

  /**
   * Diagnostic connection test directly probing backend health and live target reachability.
   */
  async testConnection(systemId: string = 'S21'): Promise<{
    success: boolean;
    connectionState: SystemConnectionState;
    message: string;
    testedAt: string;
    details: string;
  }> {
    const testedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

    try {
      // 0. Attempt backend system diagnostics API first
      try {
        const diagRes = await apiClient.runSystemDiagnostics(systemId);
        if (diagRes && diagRes.connectivityStatus) {
          const isSuccess = diagRes.connectivityStatus === 'CONNECTED' || diagRes.connectivityStatus === 'PARTIAL_CONNECTIVITY';
          if (isSuccess) {
            return {
              success: true,
              connectionState: 'CONNECTED',
              message: `[${diagRes.connectionMode || 'DIRECT_HTTP'}] ${diagRes.remediationGuidance || 'Diagnostics completed.'}`,
              testedAt,
              details: `Gateway: ${diagRes.checks?.gatewayCatalog?.status || 'UNKNOWN'} | ADT: ${diagRes.checks?.adtDiscovery?.status || 'UNKNOWN'} | Roundtrip: ${diagRes.responseTimeMs || 0}ms`
            };
          }
        }
      } catch {
        // Fall back to standard health check below
      }

      // 1. Verify backend health first
      const health = await apiClient.getHealth();
      if (!health || health.status !== 'UP') {
        return {
          success: false,
          connectionState: 'DEMO_MODE',
          message: 'Cloud Connector tunnel not active; Fiorify operating in demo mode.',
          testedAt,
          details: 'Backend service returned non-UP status.'
        };
      }

      // 2. Probe target system via T-Code search
      const probeTarget = systemId === 'S21' ? 'S21-200' : systemId;
      const searchRes = await apiClient.searchTCode({
        systemId: probeTarget,
        tcode: 'ME21N'
      });

      if (searchRes.overallStatus === 'CONNECTION_ERROR') {
        return {
          success: false,
          connectionState: 'DEMO_MODE',
          message: `Target ${systemId} S/4HANA Private Edition endpoint requires active Cloud Connector tunnel and BTP Destination.`,
          testedAt,
          details:
            searchRes.errorMessage ||
            `Cannot establish live connection to SAP system ${probeTarget}. Gateway service or host is unreachable.`
        };
      }

      if (searchRes.overallStatus === 'ACCESS_DENIED') {
        return {
          success: false,
          connectionState: 'DEMO_MODE',
          message: `Target ${systemId} S/4HANA query requires administrative authorization profile on server.`,
          testedAt,
          details: searchRes.errorMessage || 'Live S21 query rejected by administrative security check.'
        };
      }

      if (searchRes.mode === 'LIVE_SAP' && searchRes.overallStatus === 'MATCH_FOUND' && (searchRes.transaction as any)?.isLiveVerified === true) {
        return {
          success: true,
          connectionState: 'CONNECTED',
          message: `Successfully connected to live SAP system ${probeTarget} over BTP Destination!`,
          testedAt,
          details: `Live Gateway corroboration successful. Discovered description: ${searchRes.transaction?.description || 'SAP Transaction'}`
        };
      }

      // Mock demo systems
      return {
        success: false,
        connectionState: 'DEMO_MODE',
        message: `Target ${systemId} S/4HANA Private Edition endpoint requires active Cloud Connector tunnel and BTP Destination.`,
        testedAt,
        details: 'Simulated connection in local demo mode. Live RFC/Gateway connectivity remains unverified.'
      };
    } catch (err: any) {
      return {
        success: false,
        connectionState: 'DEMO_MODE',
        message: `Cloud Connector and target S/4HANA communication test failed: ${err.message || 'Endpoint unreachable'}`,
        testedAt,
        details: `Connection test error: ${err.message || 'Host unreachable'}`
      };
    }
  }
}

export const systemHealthService = new SystemHealthService();
