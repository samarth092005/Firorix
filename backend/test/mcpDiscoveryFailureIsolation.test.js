import test from 'node:test';
import assert from 'node:assert/strict';
import { McpDiscoveryOrchestrator } from '../src/mcp/discovery/mcpDiscoveryOrchestrator.js';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';
import { McpService } from '../src/mcp/services/mcpService.js';

test('MCP-04 Failure Isolation & Reliability — Timeouts, Malformed Data & Security Blocks', async (t) => {
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
    },
    {
      name: 'generate_fiori_app_odata',
      description: 'Generate app',
      inputSchema: { type: 'object', properties: { appPath: { type: 'string' } } }
    },
    {
      name: 'download_odata_service_metadata',
      description: 'Download metadata',
      inputSchema: { type: 'object', properties: { serviceUrl: { type: 'string' } } }
    }
  ]);

  await t.test('1. handles tool timeout gracefully without crashing, preserving local discovery', async () => {
    const mockMcpService = {
      getStatus: () => ({ enabled: true, connectionState: 'CONNECTED' }),
      toolRegistry,
      executeTool: async (toolName) => {
        if (toolName === 'search_docs') {
          return {
            toolName,
            success: false,
            executionStatus: 'TIMEOUT',
            error: { message: 'Tool execution timed out', code: 'MCP_TIMEOUT' },
            timestamp: new Date().toISOString()
          };
        }
        return { toolName, success: true, result: { parsed: [] } };
      }
    };

    const orchestrator = new McpDiscoveryOrchestrator({ mcpService: mockMcpService });
    const localCandidates = [{ appId: 'F0842A', appName: 'Manage Purchase Orders' }];

    const { discoveryResult, mergedCandidates, mcpEvidence } = await orchestrator.executeAssistedDiscovery(
      { tcode: 'ME21N' },
      localCandidates
    );

    assert.ok(discoveryResult.toolsFailed.some(f => f.toolName === 'search_docs' && f.executionStatus === 'TIMEOUT'));
    assert.strictEqual(mergedCandidates.length, 1);
    assert.strictEqual(mergedCandidates[0].appId, 'F0842A');
    assert.ok(mcpEvidence.some(e => e.classification === 'UNAVAILABLE'));
  });

  await t.test('2. quarantines malformed MCP response without throwing', async () => {
    const mockMcpService = {
      getStatus: () => ({ enabled: true, connectionState: 'CONNECTED' }),
      toolRegistry,
      executeTool: async (toolName) => ({
        toolName,
        success: true,
        executionStatus: 'SUCCESS',
        result: {
          text: null, // malformed/null text
          parsed: 'non-object-string-where-object-expected'
        },
        timestamp: new Date().toISOString()
      })
    };

    const orchestrator = new McpDiscoveryOrchestrator({ mcpService: mockMcpService });
    const localCandidates = [{ appId: 'F0842A', appName: 'Manage Purchase Orders' }];

    const { discoveryResult, mergedCandidates } = await orchestrator.executeAssistedDiscovery(
      { tcode: 'ME21N' },
      localCandidates
    );

    assert.strictEqual(discoveryResult.success, true);
    assert.strictEqual(mergedCandidates.length, 1);
  });

  await t.test('3. strictly avoids planning or executing blocked generation and file-writing tools', async () => {
    const executedTools = [];
    const mockMcpService = {
      getStatus: () => ({ enabled: true, connectionState: 'CONNECTED' }),
      toolRegistry,
      executeTool: async (toolName) => {
        executedTools.push(toolName);
        return { toolName, success: true, result: { text: 'ok' } };
      }
    };

    const orchestrator = new McpDiscoveryOrchestrator({ mcpService: mockMcpService });
    const { discoveryResult } = await orchestrator.executeAssistedDiscovery(
      {
        tcode: 'ME21N',
        mcpOptions: {
          enabled: true,
          toolsToInvoke: ['generate_fiori_app_odata', 'download_odata_service_metadata', 'search_docs']
        }
      },
      []
    );

    // Blocked tools were filtered out by policy
    assert.ok(!executedTools.includes('generate_fiori_app_odata'));
    assert.ok(!executedTools.includes('download_odata_service_metadata'));
    assert.ok(discoveryResult.toolsSkipped.some(s => s.toolName === 'generate_fiori_app_odata'));
    assert.ok(discoveryResult.toolsSkipped.some(s => s.toolName === 'download_odata_service_metadata'));
  });
});
