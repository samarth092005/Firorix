import test from 'node:test';
import assert from 'node:assert/strict';
import { McpService } from '../src/mcp/services/mcpService.js';
import { McpConnectionManager } from '../src/mcp/client/mcpConnectionManager.js';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';
import { McpToolExecutor } from '../src/mcp/services/mcpToolExecutor.js';
import { loadMcpConfig } from '../src/mcp/config/mcpConfig.js';

test('MCP Live Integration — Real @sap-ux/fiori-mcp-server Handshake & Discovery', async (t) => {
  const config = loadMcpConfig({
    MCP_ENABLED: 'true',
    MCP_TRANSPORT: 'stdio',
    MCP_STARTUP_TIMEOUT_MS: '30000',
    MCP_TOOL_TIMEOUT_MS: '30000'
  });

  const registry = new McpToolRegistry();
  const connManager = new McpConnectionManager({
    config,
    toolRegistry: registry
  });
  const executor = new McpToolExecutor({
    connectionManager: connManager,
    toolRegistry: registry
  });
  const mcpService = new McpService({
    config,
    connectionManager: connManager,
    toolRegistry: registry,
    toolExecutor: executor
  });

  t.after(async () => {
    await mcpService.shutdown();
  });

  await t.test('1. successfully establishes connection and MCP handshake with live SAP server', async () => {
    const connectRes = await mcpService.connect();
    assert.strictEqual(connectRes.success, true, `Connect failed: ${connectRes.error}`);
    assert.strictEqual(connManager.getState(), 'CONNECTED');

    const status = mcpService.getStatus();
    assert.strictEqual(status.connectionState, 'CONNECTED');
    assert.strictEqual(status.serverVersionReported?.name, 'fiori-mcp');
    assert.strictEqual(status.serverVersionReported?.version, '1.15.24');
    assert.ok(status.toolCount >= 9, `Expected at least 9 tools, got ${status.toolCount}`);
  });

  await t.test('2. retrieves complete authoritative tool inventory from live MCP server', () => {
    const toolsData = mcpService.getTools();
    assert.strictEqual(toolsData.available, true);
    assert.ok(toolsData.tools.length >= 9);

    const toolNames = toolsData.tools.map(t => t.name);
    assert.ok(toolNames.includes('search_docs'));
    assert.ok(toolNames.includes('list_fiori_apps'));
    assert.ok(toolNames.includes('list_sap_systems'));
    assert.ok(toolNames.includes('download_odata_service_metadata'));
    assert.ok(toolNames.includes('generate_fiori_app_odata'));
    assert.ok(toolNames.includes('generate_fiori_app_cap'));
    assert.ok(toolNames.includes('execute_functionality'));
  });

  await t.test('3. executes live read-only tool list_sap_systems through MCP protocol', async () => {
    const res = await mcpService.executeTool('list_sap_systems', {});
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.executionStatus, 'SUCCESS');
    assert.strictEqual(res.provenance, 'MCP_SERVER_RESPONSE');
    assert.ok(res.result.parsed !== undefined);
  });

  await t.test('4. strictly blocks generate_fiori_app_odata against live server', async () => {
    const res = await mcpService.executeTool('generate_fiori_app_odata', { appPath: '/tmp' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.executionStatus, 'BLOCKED');
    assert.strictEqual(res.error.code, 'MCP_TOOL_BLOCKED_BY_POLICY');
    assert.strictEqual(res.provenance, 'BLOCKED_BY_POLICY');
  });

  await t.test('4b. strictly blocks download_odata_service_metadata due to file-writing behavior', async () => {
    const res = await mcpService.executeTool('download_odata_service_metadata', {
      serviceUrl: 'http://example.com',
      appPath: '/tmp'
    });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.executionStatus, 'BLOCKED');
    assert.strictEqual(res.error.code, 'MCP_TOOL_BLOCKED_BY_POLICY');
    assert.strictEqual(res.provenance, 'BLOCKED_BY_POLICY');
  });

  await t.test('5. cleanly disconnects and clears tool inventory', async () => {
    const discRes = await mcpService.disconnect();
    assert.strictEqual(discRes.success, true);
    assert.strictEqual(connManager.getState(), 'STOPPED');
    assert.strictEqual(registry.getTools().length, 0);

    const afterTools = mcpService.getTools();
    assert.strictEqual(afterTools.available, false);
    assert.strictEqual(afterTools.tools.length, 0);
  });
});
