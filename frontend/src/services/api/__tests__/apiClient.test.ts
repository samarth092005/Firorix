import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient, ApiError, generateCorrelationId } from '../apiClient';

describe('FioriX FX-002 — Central API Client Unit Tests', () => {
  let client: ApiClient;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    client = new ApiClient({
      baseUrl: 'http://localhost:4004/api/v1',
      timeoutMs: 5000
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // 1. GET request and JSON parsing
  it('executes GET request and parses JSON response successfully', async () => {
    const mockData = { status: 'UP', service: 'FioriX Discovery API' };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': 'test-corr-123'
        }
      })
    );

    const result = await client.get<typeof mockData>('/health');
    expect(result).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/health');
    expect(calledInit.method).toBe('GET');
    expect(calledInit.headers['Accept']).toContain('application/json');
    expect(calledInit.headers['X-Correlation-ID']).toBeDefined();
  });

  // 2. Query parameter serialization
  it('appends query parameters properly to URL on GET requests', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await client.get('/gateway/services', {
      params: { search: 'FIORI', limit: 10, refresh: true }
    });

    const [calledUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toContain('search=FIORI');
    expect(calledUrl).toContain('limit=10');
    expect(calledUrl).toContain('refresh=true');
  });

  // 3. POST request with JSON serialization
  it('executes POST request with JSON payload serialization and header', async () => {
    const mockRequest = { systemId: 'S4H-DEV-200', tcode: 'ME21N' };
    const mockResponse = { overallStatus: 'MATCH_FOUND', transaction: { tcode: 'ME21N' } };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const result = await client.post('/tcode-search', mockRequest);
    expect(result).toEqual(mockResponse);

    const [, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledInit.method).toBe('POST');
    expect(calledInit.headers['Content-Type']).toBe('application/json');
    expect(calledInit.body).toBe(JSON.stringify(mockRequest));
  });

  // 4. Request timeout using AbortController
  it('triggers AbortController timeout and throws ApiError with isTimeout=true', async () => {
    client.setConfig({ timeoutMs: 50 });

    globalThis.fetch = vi.fn().mockImplementation((_url, init) => {
      return new Promise((_, reject) => {
        init.signal.addEventListener('abort', () => {
          const abortError = new Error('The operation was aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      });
    });

    await expect(client.get('/slow-endpoint')).rejects.toThrow(ApiError);

    try {
      await client.get('/slow-endpoint');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.isTimeout).toBe(true);
      expect(err.statusCode).toBe(408);
      expect(err.message).toContain('Request timed out');
    }
  });

  // 5. Standardized ApiError on HTTP 400 Bad Request
  it('throws standardized ApiError on HTTP 400 with parsed error message', async () => {
    const errorBody = { error: 'Bad Request', message: 'Malformed JSON payload.' };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errorBody), {
        status: 400,
        statusText: 'Bad Request',
        headers: { 'Content-Type': 'application/json' }
      })
    );

    try {
      await client.post('/tcode-search', { bad: 'data' });
      expect.unreachable('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(400);
      expect(err.statusText).toBe('Bad Request');
      expect(err.message).toBe('Malformed JSON payload.');
      expect(err.responseBody).toEqual(errorBody);
    }
  });

  // 6. Standardized ApiError on HTTP 401 Unauthorized with admin secret notice
  it('throws standardized ApiError on HTTP 401 Unauthorized', async () => {
    const errorBody = {
      success: false,
      statusCode: 'UNAUTHORIZED',
      errorMessage: 'Access denied: Valid administrative secret required.'
    };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(errorBody), {
        status: 401,
        statusText: 'Unauthorized',
        headers: { 'Content-Type': 'application/json' }
      })
    );

    try {
      await client.get('/transaction-discovery/F-53');
      expect.unreachable('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toBe('Access denied: Valid administrative secret required.');
    }
  });

  // 7. Correlation ID pass-through and generation
  it('passes caller-provided correlation ID and extracts it from response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': 'custom-cid-999'
        }
      })
    );

    await client.get('/test', { correlationId: 'custom-cid-999' });

    const [, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledInit.headers['X-Correlation-ID']).toBe('custom-cid-999');
  });

  it('generates distinct correlation IDs when none provided', () => {
    const id1 = generateCorrelationId();
    const id2 = generateCorrelationId();
    expect(id1).toMatch(/^fx-[a-z0-9]+-[a-z0-9]+$/);
    expect(id2).toMatch(/^fx-[a-z0-9]+-[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  // 8. Safe handling of 204 No Content and empty body
  it('returns null on HTTP 204 No Content without attempting JSON parse', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 204,
        statusText: 'No Content'
      })
    );

    const result = await client.post('/actions/clear');
    expect(result).toBeNull();
  });

  it('returns null on Content-Length: 0 responses', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('', {
        status: 200,
        headers: { 'Content-Length': '0' }
      })
    );

    const result = await client.get('/empty-stream');
    expect(result).toBeNull();
  });

  // 9. Safe handling of non-JSON responses
  it('handles non-JSON text response on error gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response('<html><body>502 Bad Gateway</body></html>', {
        status: 502,
        statusText: 'Bad Gateway',
        headers: { 'Content-Type': 'text/html' }
      })
    );

    try {
      await client.get('/upstream-down');
      expect.unreachable('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(502);
      expect(err.message).toContain('502 Bad Gateway');
      expect(err.responseBody).toContain('<html>');
    }
  });

  // 10. Network failure / connection refused handling
  it('handles network failure (fetch throws) as ApiError with isNetworkError=true', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    try {
      await client.get('/health');
      expect.unreachable('Should have thrown ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.isNetworkError).toBe(true);
      expect(err.statusCode).toBe(0);
      expect(err.message).toBe('Failed to fetch');
    }
  });

  // 11. Specific convenience methods
  it('calls POST /api/v1/tcode-search via searchTCode', async () => {
    const mockResult = { overallStatus: 'MATCH_FOUND' };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.searchTCode({ systemId: 'S4H-DEV-200', tcode: 'ME21N' });
    expect(res).toEqual(mockResult);

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/tcode-search');
    expect(calledInit.method).toBe('POST');
  });

  it('calls GET /api/v1/transaction-discovery/:tcode via discoverTransaction', async () => {
    const mockResult = { success: true, verificationStatus: 'FOUND' };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.discoverTransaction('ME21N');
    expect(res).toEqual(mockResult);

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/transaction-discovery/ME21N');
    expect(calledInit.method).toBe('GET');
  });

  // 12. FX-003 Health and Landscape endpoints
  it('calls GET /api/v1/health via getHealth', async () => {
    const mockHealth = {
      status: 'UP',
      targetLandscape: { sid: 'S21', client: '200' }
    };
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockHealth), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.getHealth();
    expect(res).toEqual(mockHealth);

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/health');
    expect(calledInit.method).toBe('GET');
  });

  it('calls GET /api/v1/systems via getSystems', async () => {
    const mockSystems = [
      { systemId: 'S21-200', systemName: 'Live S21', mode: 'LIVE_SAP' }
    ];
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockSystems), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.getSystems();
    expect(res).toEqual(mockSystems);

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/systems');
    expect(calledInit.method).toBe('GET');
  });

  // 13. FX-003 Security Boundary: Gateway 401 handling without browser credentials
  it('handles HTTP 401 from /api/v1/gateway/services as ApiError without exposing credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          statusCode: 'UNAUTHORIZED',
          errorMessage: 'Access denied: Valid administrative secret required.'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    );

    try {
      await client.getGatewayServices({ limit: 10 });
      expect.unreachable('Should have thrown 401 ApiError');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(401);
      expect(err.message).toContain('Access denied');
    }

    const [, calledInit] = (globalThis.fetch as any).mock.calls[0];
    // Verify no secret header was sent from frontend
    expect(calledInit.headers['X-FioriX-Admin-Secret']).toBeUndefined();
  });

  // 14. CAT-02: searchCatalogue calls GET /api/v1/fiori-catalogue/search without admin secret
  it('calls GET /api/v1/fiori-catalogue/search via searchCatalogue without sending administrative secrets', async () => {
    const mockSearchResponse = {
      success: true,
      statusCode: 'SUCCESS',
      totalCount: 1,
      returnedCount: 1,
      candidates: [
        { appId: 'F1612', appName: 'Post Outgoing Payments', appType: 'Transactional', provenance: 'OFFICIAL_CATALOGUE_LIVE' }
      ],
      provenance: 'OFFICIAL_CATALOGUE',
      timestamp: new Date().toISOString()
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockSearchResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.searchCatalogue({ query: 'Outgoing', limit: 10 });
    expect(res.candidates).toHaveLength(1);
    expect(res.candidates[0].appId).toBe('F1612');

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toContain('/api/v1/fiori-catalogue/search');
    expect(calledUrl).toContain('query=Outgoing');
    expect(calledUrl).toContain('limit=10');
    expect(calledInit.headers['X-FioriX-Admin-Secret']).toBeUndefined();
    expect(calledInit.headers['Authorization']).toBeUndefined();
  });

  // 15. CAT-02: getCatalogueAppById calls GET /api/v1/fiori-catalogue/apps/:appId
  it('calls GET /api/v1/fiori-catalogue/apps/:appId via getCatalogueAppById', async () => {
    const mockAppResponse = {
      success: true,
      statusCode: 'SUCCESS',
      fromCache: true,
      app: {
        appId: 'F1612',
        appName: 'Post Outgoing Payments',
        appType: 'Transactional',
        provenance: 'OFFICIAL_CATALOGUE_LIVE'
      },
      provenance: 'OFFICIAL_CATALOGUE_CACHED',
      timestamp: new Date().toISOString()
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockAppResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.getCatalogueAppById('F1612');
    expect(res.success).toBe(true);
    expect(res.app?.appId).toBe('F1612');

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/fiori-catalogue/apps/F1612');
    expect(calledInit.headers['X-FioriX-Admin-Secret']).toBeUndefined();
  });

  // 16. CAT-02: getCatalogueStatus calls GET /api/v1/fiori-catalogue/status
  it('calls GET /api/v1/fiori-catalogue/status via getCatalogueStatus', async () => {
    const mockStatusResponse = {
      success: true,
      status: {
        totalRecords: 3,
        sourceDistribution: { OFFICIAL_CATALOGUE_LIVE: 3 },
        lastSuccessfulImport: '2026-11-05T05:59:56.401Z',
        sourceVersion: 'SAP S/4HANA Reference Library',
        importStatus: 'IDLE',
        lastImportSummary: null
      }
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockStatusResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.getCatalogueStatus();
    expect(res.success).toBe(true);
    expect(res.status.totalRecords).toBe(3);
    expect(res.status.sourceVersion).toBe('SAP S/4HANA Reference Library');

    const [calledUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/fiori-catalogue/status');
  });
});
