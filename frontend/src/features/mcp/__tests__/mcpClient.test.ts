import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiClient } from '../../../services/api/apiClient';

describe('FioriX MCP-01 + MCP-02 — Frontend API Client Tests', () => {
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

  it('fetches MCP status with GET /api/v1/mcp/status', async () => {
    const mockStatus = {
      success: true,
      status: {
        enabled: true,
        connectionState: 'CONNECTED',
        serverPackage: '@sap-ux/fiori-mcp-server',
        serverVersion: '1.15.24',
        transport: 'stdio',
        lastConnectedAt: '2026-11-07T12:00:00Z',
        lastToolDiscoveryAt: '2026-11-07T12:00:00Z',
        toolCount: 9,
        allowedToolCount: 6,
        blockedToolCount: 3,
        errorSummary: null,
        serverCapabilities: { tools: {} },
        serverVersionReported: { name: 'fiori-mcp', version: '1.15.24' }
      }
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockStatus), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.getMcpStatus();
    expect(res.success).toBe(true);
    expect(res.status.connectionState).toBe('CONNECTED');
    expect(res.status.toolCount).toBe(9);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:4004/api/v1/mcp/status',
      expect.anything()
    );
  });

  it('fetches discovered tools with GET /api/v1/mcp/tools', async () => {
    const mockTools = {
      success: true,
      available: true,
      connectionState: 'CONNECTED',
      total: 2,
      tools: [
        {
          name: 'search_docs',
          description: 'Search documentation',
          category: 'DOCUMENTATION_SEARCH',
          isAllowed: true,
          readOnly: true,
          policyReason: null,
          operationalImpact: 'READ_ONLY',
          inputSchema: { type: 'object' },
          requiredProperties: ['query'],
          optionalProperties: ['maxResults']
        },
        {
          name: 'generate_fiori_app_odata',
          description: 'Generate app',
          category: 'APPLICATION_GENERATION',
          isAllowed: false,
          readOnly: false,
          policyReason: 'Application generation is disabled in MCP-01/MCP-02 milestone by policy.',
          operationalImpact: 'EXECUTION_DISABLED',
          inputSchema: { type: 'object' },
          requiredProperties: ['appPath'],
          optionalProperties: []
        }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockTools), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.getMcpTools();
    expect(res.success).toBe(true);
    expect(res.available).toBe(true);
    expect(res.tools.length).toBe(2);
    expect(res.tools[0].isAllowed).toBe(true);
    expect(res.tools[1].isAllowed).toBe(false);
  });

  it('executes approved read-only tool with POST /api/v1/mcp/tools/:toolName/execute', async () => {
    const mockExecution = {
      success: true,
      toolName: 'search_docs',
      category: 'DOCUMENTATION_SEARCH',
      executionStatus: 'SUCCESS',
      provenance: 'SAP_DOCUMENTATION_RESPONSE',
      durationMs: 42,
      executedAt: '2026-11-07T12:00:00Z',
      connectionState: 'CONNECTED',
      server: { package: '@sap-ux/fiori-mcp-server', transport: 'stdio' },
      result: {
        parsed: null,
        content: [{ type: 'text', text: 'Documentation match' }],
        rawText: 'Documentation match'
      },
      error: null
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(mockExecution), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await client.executeMcpTool('search_docs', { query: 'List Report' });
    expect(res.success).toBe(true);
    expect(res.executionStatus).toBe('SUCCESS');
    expect(res.provenance).toBe('SAP_DOCUMENTATION_RESPONSE');
    expect(res.result.rawText).toBe('Documentation match');

    const [calledUrl, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/mcp/tools/search_docs/execute');
    expect(calledInit.method).toBe('POST');
    const parsedBody = JSON.parse(calledInit.body);
    expect(parsedBody.arguments).toEqual({ query: 'List Report' });
  });

  it('dispatches connect request with admin secret header when provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, state: 'CONNECTED' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    await client.connectMcp('my-admin-secret');
    const [, calledInit] = (globalThis.fetch as any).mock.calls[0];
    expect(calledInit.headers['X-FioriX-Admin-Secret']).toBe('my-admin-secret');
  });
});
