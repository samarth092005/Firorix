import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../src/server.js';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';
import { McpService } from '../src/mcp/services/mcpService.js';
import { McpDiscoveryOrchestrator } from '../src/mcp/discovery/mcpDiscoveryOrchestrator.js';

test('MCP-03 Discovery REST APIs — /api/v1/discovery/mcp-assisted & Extended /match', async (t) => {
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
      transport: 'stdio'
    }),
    config: { enabled: true, serverPackage: '@sap-ux/fiori-mcp-server', serverVersion: '1.15.24', transport: 'stdio' },
    callTool: async (toolName, args) => ({
      content: [{ type: 'text', text: 'Documentation references standard Fiori app F0842A for ME21N.' }]
    }),
    destroy: async () => {}
  };

  const testMcpService = new McpService({
    config: { enabled: true, serverPackage: '@sap-ux/fiori-mcp-server', serverVersion: '1.15.24', transport: 'stdio' },
    connectionManager: mockConnectionManager,
    toolRegistry: mockRegistry
  });

  const orchestrator = new McpDiscoveryOrchestrator({
    mcpService: testMcpService
  });

  const server = createServer({
    mcpService: testMcpService,
    mcpDiscoveryOrchestrator: orchestrator
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  const makeRequest = (path, options = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, {
        method: options.method || 'GET',
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
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

  await t.test('1. POST /api/v1/discovery/mcp-assisted executes assisted workflow and returns MCP telemetry', async () => {
    const res = await makeRequest('/api/v1/discovery/mcp-assisted', {
      method: 'POST',
      body: { tcode: 'ME21N' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.tcode, 'ME21N');
    assert.strictEqual(res.body.mcpAssisted, true);
    assert.ok(res.body.mcpDiscovery);
    assert.strictEqual(res.body.mcpDiscovery.mcpStatus.connected, true);
    assert.ok(res.body.mcpDiscovery.toolsInvoked.some(t => t.toolName === 'search_docs'));
  });

  await t.test('2. POST /api/v1/discovery/match with mcpOptions.enabled=true enriches evidence and candidates', async () => {
    const res = await makeRequest('/api/v1/discovery/match', {
      method: 'POST',
      body: {
        tcode: 'ME21N',
        mcpOptions: { enabled: true }
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.mcpAssisted, true);
    assert.ok(res.body.mcpDiscovery);
    assert.ok(res.body.candidates.length >= 1);
  });

  await t.test('3. POST /api/v1/discovery/match without mcpOptions runs purely local discovery without calling MCP', async () => {
    const res = await makeRequest('/api/v1/discovery/match', {
      method: 'POST',
      body: { tcode: 'ME21N' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.mcpAssisted, false);
    assert.strictEqual(res.body.mcpDiscovery, null);
  });

  await t.test('4. POST /api/v1/discovery/mcp-assisted rejects invalid T-Code format with HTTP 400', async () => {
    const res = await makeRequest('/api/v1/discovery/mcp-assisted', {
      method: 'POST',
      body: { tcode: 'INVALID TCODE WITH SPACES' }
    });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.statusCode, 'INVALID_TCODE_FORMAT');
  });

  await t.test('5. POST /api/v1/discovery/mcp-assisted continues local discovery gracefully when MCP is disconnected', async () => {
    mockConnected = false;

    const res = await makeRequest('/api/v1/discovery/mcp-assisted', {
      method: 'POST',
      body: { tcode: 'ME21N' }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.mcpAssisted, true);
    assert.ok(res.body.mcpDiscovery);
    assert.strictEqual(res.body.mcpDiscovery.mcpStatus.connected, false);
    assert.strictEqual(res.body.mcpDiscovery.status, 'MCP_SERVER_DISCONNECTED');
    // Local discovery and matching still succeeded
    assert.ok(res.body.candidates.length >= 1);
  });
});
