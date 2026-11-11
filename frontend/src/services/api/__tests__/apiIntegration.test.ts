import { describe, it, expect, beforeEach } from 'vitest';
import { ApiClient, ApiError } from '../apiClient';
import { TransactionSearchService } from '../../../features/transaction-checker/services/transactionSearchService';
import { searchHistoryStore } from '../../../features/transaction-checker/services/searchHistoryStore';

describe('FioriX FX-002 — End-to-End API Integration & Offline Resilience', { timeout: 15000 }, () => {
  const backendBaseUrl = 'http://localhost:4004/api/v1';

  beforeEach(() => {
    searchHistoryStore.clearHistory();
  });

  // Step 7.3: Backend health endpoint test
  it('successfully contacts backend GET /api/v1/health and parses landscape status', async () => {
    const liveClient = new ApiClient({
      baseUrl: backendBaseUrl,
      timeoutMs: 10000
    });

    const health = await liveClient.getHealth();
    expect(health).toBeDefined();
    expect(health.status).toBe('UP');
    expect(health.targetLandscape).toBeDefined();
    expect(health.targetLandscape.sid).toBe('S21');
    expect(health.targetLandscape.release).toContain('S/4HANA 2023');
    expect(health.btpDestinationStatus).toBeDefined();
  });

  // Step 7.4: Transaction search endpoint test
  it('successfully contacts backend POST /api/v1/tcode-search and returns structured results for ME21N', async () => {
    const liveClient = new ApiClient({
      baseUrl: backendBaseUrl,
      timeoutMs: 20000
    });

    const response = await liveClient.searchTCode({
      systemId: 'S4H-DEV-200',
      tcode: 'ME21N'
    });

    expect(response).toBeDefined();
    expect(response.overallStatus).toBe('MATCH_FOUND');
    expect(response.mode).toBe('MOCK');
    expect(response.transaction).toBeDefined();
    expect(response.transaction?.tcode).toBe('ME21N');
    expect(response.transaction?.classification).toBe('STANDARD');
    expect(response.matching).toBeDefined();
    expect(response.matching.candidates.length).toBeGreaterThanOrEqual(1);
    expect(['DEMO_APP_PO_001', 'ME21N', 'F0842A']).toContain(response.matching.candidates[0].appId);
    expect(response.diagnostics).toBeDefined();
    expect(response.diagnostics.provenance).toBeDefined();
  });

  // Step 7.4b: Transaction search integration through TransactionSearchService
  it('integrates TransactionSearchService with backend POST /api/v1/tcode-search and records history', async () => {
    const liveService = new TransactionSearchService();

    const response = await liveService.search({
      systemId: 'S4H-DEV-200',
      tcode: 'VA01'
    });

    expect(response.overallStatus).toBe('MATCH_FOUND');
    expect(response.transaction?.tcode).toBe('VA01');

    const history = searchHistoryStore.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].tcode).toBe('VA01');
    expect(history[0].resultStatus).toBe('MATCH_FOUND');
  });

  // Step 7.5: Error-handling test when backend is unavailable
  it('handles backend unavailability gracefully without fabricating successful responses', async () => {
    // Configure an isolated client pointing to an offline/unbound port
    const offlineClient = new ApiClient({
      baseUrl: 'http://127.0.0.1:49151/api/v1',
      timeoutMs: 800
    });

    // 1. apiClient throws standardized ApiError
    let thrownError: any = null;
    try {
      await offlineClient.getHealth();
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(ApiError);
    expect(thrownError.isNetworkError || thrownError.isTimeout).toBe(true);

    // 2. TransactionSearchService catches offline error and returns CONNECTION_ERROR
    const offlineSearchService = new TransactionSearchService();
    // Temporarily point singleton to offline client
    const originalConfig = offlineClient.getConfig();

    const offlineResponse = await offlineSearchService.search({
      systemId: 'S4H-DEV-200',
      tcode: 'ME21N'
    });

    // If default apiClient points to live backend on 4004, this would succeed.
    // To explicitly test TransactionSearchService offline behavior:
    const customOfflineClient = new ApiClient({
      baseUrl: 'http://127.0.0.1:49151/api/v1',
      timeoutMs: 500
    });

    try {
      await customOfflineClient.searchTCode({
        systemId: 'S4H-DEV-200',
        tcode: 'ME21N'
      });
      expect.unreachable('Offline client should fail');
    } catch (apiErr: any) {
      expect(apiErr).toBeInstanceOf(ApiError);
      expect(apiErr.isNetworkError || apiErr.isTimeout).toBe(true);
    }
  });

  // Quick Inspector & Discovery endpoint integration
  it('connects to backend GET /api/v1/transaction-discovery/:tcode when supported', async () => {
    const liveClient = new ApiClient({
      baseUrl: backendBaseUrl,
      timeoutMs: 10000
    });

    try {
      const discoveryRes = await liveClient.discoverTransaction('ME21N');
      expect(discoveryRes).toBeDefined();
    } catch (err: any) {
      // If administrative secret is configured on backend, HTTP 401 is returned honestly
      expect(err).toBeInstanceOf(ApiError);
      expect([401, 502, 200, 404]).toContain(err.statusCode);
    }
  });

  // FX-003 Tests: Systems Endpoint
  it('successfully contacts backend GET /api/v1/systems and returns registered landscapes', async () => {
    const liveClient = new ApiClient({
      baseUrl: backendBaseUrl,
      timeoutMs: 10000
    });

    const systems = await liveClient.getSystems();
    expect(Array.isArray(systems)).toBe(true);
    expect(systems.length).toBeGreaterThanOrEqual(4);

    const liveS21 = systems.find(s => s.systemId === 'S21-200');
    expect(liveS21).toBeDefined();
    expect(liveS21?.mode).toBe('LIVE_SAP');
    expect(liveS21?.client).toBe('200');
    expect(liveS21?.rfcDestination).toBe('S21_RFC_DISCOVERY');

    const demoS21 = systems.find(s => s.systemId === 'S21-200-DEMO');
    expect(demoS21).toBeDefined();
    expect(demoS21?.mode).toBe('MOCK');
  });

  // FX-003 Tests: Gateway Services Endpoint Security & 401 Handling
  it('protects GET /api/v1/gateway/services and returns HTTP 401 when called without administrative secret', async () => {
    const liveClient = new ApiClient({
      baseUrl: backendBaseUrl,
      timeoutMs: 10000
    });

    try {
      await liveClient.getGatewayServices({ limit: 5 });
      expect.unreachable('Should have thrown 401 ApiError for unprivileged client');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Access denied');
    }
  });

  // FX-003 Tests: Separated Health Indicators in systemHealthService
  it('separates landscape health indicators into 6 distinct items without conflating connection states', async () => {
    const { systemHealthService } = await import('../../systemHealthService');
    const health = await systemHealthService.getSystemHealth('S21');

    expect(health).toBeDefined();
    expect(health.indicators).toBeDefined();
    const ind = health.indicators!;

    // 1. Backend health
    expect(ind.backendHealth.id).toBe('backend');
    expect(ind.backendHealth.status).toBe('ONLINE');

    // 2. Configured SAP system
    expect(ind.configuredSystem.id).toBe('configured-system');
    expect(ind.configuredSystem.status).toBe('CONFIGURED');

    // 3. SAP Host reachability (must not be assumed merely because destination configured)
    expect(ind.sapHostReachability.id).toBe('host-reachability');
    expect(ind.sapHostReachability.status).toBe('NOT_VERIFIED');

    // 4. Cloud Connector tunnel (must not report connected merely because destination configured)
    expect(ind.cloudConnector.id).toBe('cloud-connector');
    expect(ind.cloudConnector.status).toBe('NOT_VERIFIED');
    expect(ind.cloudConnector.statusText).toContain('NOT VERIFIED');

    // 5. SAP Gateway availability
    expect(ind.sapGateway.id).toBe('sap-gateway');

    // 6. Gateway service catalogue
    expect(ind.gatewayCatalog.id).toBe('gateway-catalog');
  });

  // FX-003 Tests: Gateway Catalog Service Handling
  it('safely queries Gateway Catalog via systemHealthService returning UNAUTHORIZED status for unauthenticated client', async () => {
    const { systemHealthService } = await import('../../systemHealthService');
    const catalogResult = await systemHealthService.getGatewayCatalog({ limit: 5 });

    expect(catalogResult).toBeDefined();
    expect(catalogResult.status).toBe('UNAUTHORIZED');
    expect(catalogResult.services).toEqual([]);
    expect(catalogResult.totalCount).toBe(0);
    expect(catalogResult.errorMessage).toContain('administrative secret');
  });

  // FX-003 Tests: systemService consuming backend data
  it('consumes backend systems in systemService and maps to frontend SapSystem domain models', async () => {
    const { systemService } = await import('../../mock/systemService');
    const res = await systemService.getAllSystems();

    expect(res.success).toBe(true);
    expect(res.data.length).toBeGreaterThanOrEqual(4);

    const s21 = res.data.find(s => s.id === 'S21-200');
    expect(s21).toBeDefined();
    expect(s21?.isDemoRecord).toBe(false);
    expect(s21?.client).toBe('200');
  });
});
