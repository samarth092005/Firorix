import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../src/server.js';
import { McpService } from '../src/mcp/services/mcpService.js';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';

test('MCP REST API Routes — Status, Inventory, Auth & Execution', async (t) => {
  const mockRegistry = new McpToolRegistry();
  mockRegistry.setTools([
    {
      name: 'search_docs',
      description: 'Search documentation',
      inputSchema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query']
      }
    },
    {
      name: 'generate_fiori_app_odata',
      description: 'Generate app',
      inputSchema: {
        type: 'object',
        properties: { appPath: { type: 'string' } },
        required: ['appPath']
      }
    }
  ]);

  let mockConnected = true;
  const mockConnectionManager = {
    getState: () => mockConnected ? 'CONNECTED' : 'STOPPED',
    getStatus: () => ({
      enabled: true,
      state: mockConnected ? 'CONNECTED' : 'STOPPED',
      serverPackage: '@sap-ux/fiori-mcp-server',
      serverVersion: '1.15.24',
      transport: 'stdio',
      lastConnectedAt: '2026-11-07T12:00:00Z',
      lastToolDiscoveryAt: '2026-11-07T12:00:00Z',
      lastError: null,
      serverVersionReported: { name: 'fiori-mcp', version: '1.15.24' },
      serverCapabilities: { tools: {} }
    }),
    config: { enabled: true, serverPackage: '@sap-ux/fiori-mcp-server', serverVersion: '1.15.24', transport: 'stdio' },
    connect: async () => {
      mockConnected = true;
      return { success: true, state: 'CONNECTED', toolsCount: 2 };
    },
    disconnect: async () => {
      mockConnected = false;
      return { success: true, state: 'STOPPED' };
    },
    callTool: async (toolName, args) => ({
      content: [{ type: 'text', text: 'Result for ' + toolName }]
    }),
    destroy: async () => {}
  };

  const testMcpService = new McpService({
    config: { enabled: true, serverPackage: '@sap-ux/fiori-mcp-server', serverVersion: '1.15.24', transport: 'stdio' },
    connectionManager: mockConnectionManager,
    toolRegistry: mockRegistry
  });

  const mockBtpAdapter = {
    verifyAdminSecret: (secret) => secret === 'test-secret-123'
  };

  const server = createServer({
    mcpService: testMcpService,
    btpAdapter: mockBtpAdapter
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  // Helper for requests
  const makeRequest = (path, options = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, {
        method: options.method || 'GET',
        headers: options.headers || {}
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      });
      req.on('error', reject);
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  };

  await t.test('1. GET /api/v1/mcp/status returns status structure', async () => {
    const res = await makeRequest('/api/v1/mcp/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.status.serverPackage, '@sap-ux/fiori-mcp-server');
    assert.strictEqual(res.body.status.connectionState, 'CONNECTED');
    assert.strictEqual(res.body.status.toolCount, 2);
  });

  await t.test('2. GET /api/v1/mcp/tools returns discovered tools when connected', async () => {
    const res = await makeRequest('/api/v1/mcp/tools');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.available, true);
    assert.strictEqual(res.body.tools.length, 2);
    const searchTool = res.body.tools.find(t => t.name === 'search_docs');
    assert.ok(searchTool);
    assert.strictEqual(searchTool.isAllowed, true);
  });

  await t.test('3. GET /api/v1/mcp/health returns partitioned diagnostic indicators', async () => {
    const res = await makeRequest('/api/v1/mcp/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const health = res.body.health;
    assert.strictEqual(health.components.backendAvailability.status, 'UP');
    assert.strictEqual(health.components.mcpProcessAvailability.status, 'RUNNING');
    assert.strictEqual(health.components.sapSystemConnectivity.status, 'NOT_TESTED_VIA_MCP');
    assert.strictEqual(health.components.sapSystemConnectivity.verified, false);
  });

  await t.test('4. POST /api/v1/mcp/connect requires admin authentication', async () => {
    process.env.FIORIX_ADMIN_SECRET = 'test-secret-123';
    // Unauthorized attempt
    const unauth = await makeRequest('/api/v1/mcp/connect', { method: 'POST' });
    assert.strictEqual(unauth.status, 401);
    assert.strictEqual(unauth.body.statusCode, 'UNAUTHORIZED');

    // Authorized attempt
    const auth = await makeRequest('/api/v1/mcp/connect', {
      method: 'POST',
      headers: { 'X-FioriX-Admin-Secret': 'test-secret-123' }
    });
    assert.strictEqual(auth.status, 200);
    assert.strictEqual(auth.body.success, true);
  });

  await t.test('5. POST /api/v1/mcp/disconnect requires admin authentication', async () => {
    process.env.FIORIX_ADMIN_SECRET = 'test-secret-123';
    const unauth = await makeRequest('/api/v1/mcp/disconnect', { method: 'POST' });
    assert.strictEqual(unauth.status, 401);

    const auth = await makeRequest('/api/v1/mcp/disconnect', {
      method: 'POST',
      headers: { 'X-FioriX-Admin-Secret': 'test-secret-123' }
    });
    assert.strictEqual(auth.status, 200);
    assert.strictEqual(auth.body.success, true);
    assert.strictEqual(auth.body.status.connectionState, 'STOPPED');

    // Restore connected state for subsequent tests
    mockConnected = true;
  });

  await t.test('6. POST /api/v1/mcp/tools/:toolName/execute requires admin authentication', async () => {
    process.env.FIORIX_ADMIN_SECRET = 'test-secret-123';
    const unauth = await makeRequest('/api/v1/mcp/tools/search_docs/execute', {
      method: 'POST',
      body: { arguments: { query: 'List Report' } }
    });
    assert.strictEqual(unauth.status, 401);
    assert.strictEqual(unauth.body.statusCode, 'UNAUTHORIZED');
  });

  await t.test('7. POST /api/v1/mcp/tools/:toolName/execute executes permitted tool with HTTP 200 when authenticated', async () => {
    const res = await makeRequest('/api/v1/mcp/tools/search_docs/execute', {
      method: 'POST',
      headers: { 'X-FioriX-Admin-Secret': 'test-secret-123' },
      body: { arguments: { query: 'List Report' } }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.executionStatus, 'SUCCESS');
    assert.strictEqual(res.body.toolName, 'search_docs');
  });

  await t.test('8. POST /api/v1/mcp/tools/:toolName/execute rejects blocked tool with HTTP 403', async () => {
    const res = await makeRequest('/api/v1/mcp/tools/generate_fiori_app_odata/execute', {
      method: 'POST',
      headers: { 'X-FioriX-Admin-Secret': 'test-secret-123' },
      body: { arguments: { appPath: '/some/dir' } }
    });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.executionStatus, 'BLOCKED');
    assert.strictEqual(res.body.error.code, 'MCP_TOOL_BLOCKED_BY_POLICY');
  });

  await t.test('9. POST /api/v1/mcp/tools/:toolName/execute rejects missing required arguments with HTTP 400', async () => {
    const res = await makeRequest('/api/v1/mcp/tools/search_docs/execute', {
      method: 'POST',
      headers: { 'X-FioriX-Admin-Secret': 'test-secret-123' },
      body: { arguments: {} } // missing query
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'MCP_INVALID_ARGUMENTS');
  });

  await t.test('10. POST /api/v1/mcp/tools/:toolName/execute returns HTTP 404 for non-existent tools', async () => {
    const res = await makeRequest('/api/v1/mcp/tools/fake_tool/execute', {
      method: 'POST',
      headers: { 'X-FioriX-Admin-Secret': 'test-secret-123' },
      body: { arguments: {} }
    });
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'MCP_TOOL_NOT_FOUND');
  });
});
