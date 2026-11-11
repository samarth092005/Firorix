import test from 'node:test';
import assert from 'node:assert/strict';
import { McpDiscoveryOrchestrator } from '../src/mcp/discovery/mcpDiscoveryOrchestrator.js';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';

test('MCP-03 Discovery Orchestrator — Coordination & Execution Planning', async (t) => {
  const toolRegistry = new McpToolRegistry();
  toolRegistry.setTools([
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
      name: 'list_sap_systems',
      description: 'List systems',
      inputSchema: { type: 'object', properties: {} }
    }
  ]);

  await t.test('1. returns skipped status when MCP is disabled by request', async () => {
    const mockMcpService = {
      getStatus: () => ({ enabled: true, connectionState: 'CONNECTED' }),
      toolRegistry
    };

    const orchestrator = new McpDiscoveryOrchestrator({ mcpService: mockMcpService });
    const { discoveryResult, mergedCandidates } = await orchestrator.executeAssistedDiscovery(
      {
        tcode: 'ME21N',
        mcpOptions: { enabled: false }
      },
      [{ appId: 'F0842A', appName: 'Manage Purchase Orders' }]
    );

    assert.strictEqual(discoveryResult.status, 'MCP_DISABLED_BY_REQUEST');
    assert.strictEqual(discoveryResult.toolsInvoked.length, 0);
    assert.strictEqual(mergedCandidates.length, 1);
  });

  await t.test('2. returns disconnected status when MCP server is not in CONNECTED state', async () => {
    const mockMcpService = {
      getStatus: () => ({ enabled: true, connectionState: 'STOPPED' }),
      toolRegistry
    };

    const orchestrator = new McpDiscoveryOrchestrator({ mcpService: mockMcpService });
    const { discoveryResult, mergedCandidates } = await orchestrator.executeAssistedDiscovery(
      {
        tcode: 'F-53',
        mcpOptions: { enabled: true }
      },
      [{ appId: 'F1612', appName: 'Post Outgoing Payments' }]
    );

    assert.strictEqual(discoveryResult.status, 'MCP_SERVER_DISCONNECTED');
    assert.strictEqual(discoveryResult.mcpStatus.connected, false);
    assert.strictEqual(discoveryResult.toolsInvoked.length, 0);
    assert.strictEqual(mergedCandidates.length, 1);
  });

  await t.test('3. executes planned tools, maps evidence, and returns structured discovery telemetry', async () => {
    const invoked = [];
    const mockMcpService = {
      getStatus: () => ({ enabled: true, connectionState: 'CONNECTED' }),
      toolRegistry,
      executeTool: async (toolName, args) => {
        invoked.push({ toolName, args });
        if (toolName === 'search_docs') {
          return {
            toolName,
            success: true,
            executionStatus: 'SUCCESS',
            arguments: args,
            result: { text: 'Refer to standard app F0842A for PO creation.' },
            timestamp: new Date().toISOString()
          };
        }
        return {
          toolName,
          success: true,
          executionStatus: 'SUCCESS',
          arguments: args,
          result: { parsed: [{ systemId: 'S21', client: '200' }] },
          timestamp: new Date().toISOString()
        };
      }
    };

    const orchestrator = new McpDiscoveryOrchestrator({ mcpService: mockMcpService });
    const initialCandidates = [
      { appId: 'F0842A', appName: 'Manage Purchase Orders', inLocalCatalogue: true }
    ];

    const { discoveryResult, mergedCandidates, mcpEvidence } = await orchestrator.executeAssistedDiscovery(
      {
        tcode: 'ME21N',
        transactionDescription: 'Create Purchase Order',
        mcpOptions: { enabled: true }
      },
      initialCandidates
    );

    assert.strictEqual(discoveryResult.success, true);
    assert.strictEqual(discoveryResult.status, 'COMPLETED');
    assert.ok(discoveryResult.toolsInvoked.length >= 1);
    assert.ok(mcpEvidence.length >= 1);
    assert.ok(mergedCandidates.length >= 1);
  });
});
