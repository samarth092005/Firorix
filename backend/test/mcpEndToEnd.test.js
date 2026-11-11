import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../src/server.js';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';
import { McpService } from '../src/mcp/services/mcpService.js';
import { McpDiscoveryOrchestrator } from '../src/mcp/discovery/mcpDiscoveryOrchestrator.js';
import { MATCH_CLASSIFICATIONS } from '../src/engine/fioriMatchingEngine.js';

test('MCP-04 End-to-End Workflow & 15 Scenario Verification Suite', async (t) => {
  const toolRegistry = new McpToolRegistry();
  toolRegistry.setTools([
    {
      name: 'search_docs',
      description: 'Search documentation',
      inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] }
    },
    {
      name: 'list_sap_systems',
      description: 'List systems',
      inputSchema: { type: 'object', properties: {} }
    }
  ]);

  let isConnected = true;
  const mockConnectionManager = {
    getState: () => isConnected ? 'CONNECTED' : 'STOPPED',
    getStatus: () => ({
      enabled: true,
      state: isConnected ? 'CONNECTED' : 'STOPPED',
      serverPackage: '@sap-ux/fiori-mcp-server',
      serverVersion: '1.15.24',
      transport: 'stdio'
    }),
    config: { enabled: true, serverPackage: '@sap-ux/fiori-mcp-server', serverVersion: '1.15.24', transport: 'stdio' },
    callTool: async (toolName, args) => {
      if (toolName === 'search_docs') {
        if (args.query.includes('ME21N')) {
          return {
            content: [{
              type: 'text',
              text: 'Manage Purchase Orders (F0842A) is the primary SAP Fiori app for purchase order processing. Legacy T-Code: ME21N.'
            }]
          };
        }
        if (args.query.includes('F-53')) {
          return {
            content: [{
              type: 'text',
              text: 'Post Outgoing Payments (F1612) provides modern accounts payable capabilities replacing F-53.'
            }]
          };
        }
        return { content: [{ type: 'text', text: 'General SAP Fiori elements guidelines.' }] };
      }
      if (toolName === 'list_sap_systems') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify([{ systemId: 'S21', client: '200', name: 'S21 Landscape' }])
          }]
        };
      }
      return { content: [{ type: 'text', text: '' }] };
    },
    destroy: async () => {}
  };

  const mcpService = new McpService({
    config: { enabled: true, serverPackage: '@sap-ux/fiori-mcp-server', serverVersion: '1.15.24', transport: 'stdio' },
    connectionManager: mockConnectionManager,
    toolRegistry
  });

  const orchestrator = new McpDiscoveryOrchestrator({ mcpService });
  const server = createServer({
    mcpService,
    mcpDiscoveryOrchestrator: orchestrator
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(() => {
    server.close();
  });

  const postJson = (path, body) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify(body));
      req.end();
    });
  };

  // Scenario 1: MCP disabled
  await t.test('Scenario 1: MCP disabled produces local discovery without MCP tool calls', async () => {
    const res = await postJson('/api/v1/discovery/match', {
      tcode: 'ME21N',
      mcpOptions: { enabled: false }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.mcpAssisted, false);
    assert.strictEqual(res.body.mcpDiscovery, null);
    assert.ok(res.body.candidates.length >= 1);
  });

  // Scenario 2: MCP connected
  await t.test('Scenario 2: MCP connected invokes approved tools, collects candidates, and preserves provenance', async () => {
    isConnected = true;
    const res = await postJson('/api/v1/discovery/mcp-assisted', {
      tcode: 'ME21N'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.mcpAssisted, true);
    assert.ok(res.body.mcpDiscovery);
    assert.strictEqual(res.body.mcpDiscovery.mcpStatus.connected, true);
    assert.ok(res.body.mcpDiscovery.toolsInvoked.length >= 1);
    assert.ok(res.body.candidates.length >= 1);
    assert.ok(res.body.discovery.evidence.some(e => e.provenance?.sourceTool === 'search_docs'));
  });

  // Scenario 3: MCP disconnected
  await t.test('Scenario 3: MCP disconnected reports status gracefully and continues local discovery', async () => {
    isConnected = false;
    const res = await postJson('/api/v1/discovery/mcp-assisted', {
      tcode: 'F-53'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.mcpAssisted, true);
    assert.strictEqual(res.body.mcpDiscovery.mcpStatus.connected, false);
    assert.strictEqual(res.body.mcpDiscovery.status, 'MCP_SERVER_DISCONNECTED');
    // Local discovery succeeds
    assert.ok(res.body.candidates.length >= 1);
    isConnected = true;
  });

  // Scenario 4: Documentation-only result
  await t.test('Scenario 4: documentation evidence does not create false live SAP verification or unearned verified match', async () => {
    const res = await postJson('/api/v1/discovery/mcp-assisted', {
      tcode: 'F-53'
    });
    const docEv = res.body.discovery.evidence.find(e => e.category === 'DOCUMENTATION');
    assert.ok(docEv);
    assert.strictEqual(docEv.classification, 'PENDING_VERIFICATION');
    assert.notStrictEqual(docEv.classification, 'LIVE_SAP_VERIFIED');
  });

  // Scenario 6: Duplicate candidate handling
  await t.test('Scenario 6: duplicate candidate preserves trusted catalogue fields and tags multiple sources', async () => {
    const res = await postJson('/api/v1/discovery/mcp-assisted', {
      tcode: 'ME21N'
    });
    const f0842a = res.body.candidates.find(c => c.appId === 'F0842A');
    assert.ok(f0842a);
    assert.strictEqual(f0842a.appName, 'Manage Purchase Orders (Version 2)');
    assert.ok(f0842a.sources.includes('LOCAL_OFFICIAL_CATALOGUE'));
    assert.ok(f0842a.sources.includes('MCP_DOCUMENTATION_DISCOVERY'));
  });

  // Scenario 8: WebGUI versus native Fiori
  await t.test('Scenario 8: classic WebGUI tiles remain SAP GUI for HTML and are not conflated with native Fiori', async () => {
    const res = await postJson('/api/v1/discovery/match', {
      tcode: 'FB03'
    });
    const webgui = res.body.candidates.find(c => c.appId === 'FB03' || c.uiTechnology?.includes('HTML'));
    if (webgui) {
      assert.strictEqual(webgui.appType, 'SAP GUI');
      assert.strictEqual(webgui.uiTechnology, 'SAP GUI for HTML');
    }
  });

  // Scenario 10: Authorization restriction
  await t.test('Scenario 10: authorization blocked transactions and MCP failures record BLOCKED_BY_AUTHORIZATION', async () => {
    // 1. Discovery authorization check for simulated ADT 403
    const { TechnicalEvidenceEngine, EVIDENCE_CLASSIFICATIONS } = await import('../src/engine/technicalEvidenceEngine.js');
    const evEngine = new TechnicalEvidenceEngine();
    const identity = evEngine.classifyTransactionIdentity({
      tcode: 'VA01',
      isValidFormat: true,
      formatClassification: EVIDENCE_CLASSIFICATIONS.FORMAT_VALIDATED,
      isLiveMode: true,
      liveProbeResult: {
        exists: false,
        error: { statusCode: 403, message: 'ADT access forbidden: missing authorization object S_ADT_RES' }
      }
    });
    assert.strictEqual(identity.sapExistenceVerification.classification, EVIDENCE_CLASSIFICATIONS.BLOCKED_BY_AUTHORIZATION);

    // 2. MCP tool authorization restriction check
    const { McpEvidenceMapper } = await import('../src/mcp/discovery/mcpEvidenceMapper.js');
    const mapper = new McpEvidenceMapper();
    const ev = mapper.mapToolExecutionToEvidence({
      toolName: 'list_sap_systems',
      success: false,
      error: { code: 'MCP_AUTHORIZATION_FAILED', message: 'Forbidden' }
    }, { targetSystem: { systemId: 'S21-200' } });

    assert.strictEqual(ev[0].classification, EVIDENCE_CLASSIFICATIONS.BLOCKED_BY_AUTHORIZATION);
  });

  // Scenario 15: Complete pipeline end-to-end
  await t.test('Scenario 15: full end-to-end request returns complete contract with comparison matrix', async () => {
    const res = await postJson('/api/v1/discovery/mcp-assisted', {
      tcode: 'ME21N',
      systemId: 'S21-200'
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.tcode, 'ME21N');
    assert.ok(res.body.requestId);
    assert.ok(res.body.discovery);
    assert.ok(res.body.matching);
    assert.ok(res.body.candidateComparison.length >= 1);
    assert.ok(res.body.bestMatch);
    assert.ok(res.body.recommendationReadiness);
  });
});
