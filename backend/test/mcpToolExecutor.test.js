import test from 'node:test';
import assert from 'node:assert/strict';
import { McpToolExecutor } from '../src/mcp/services/mcpToolExecutor.js';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';
import { McpTimeoutError } from '../src/mcp/utils/mcpErrors.js';
import { MCP_PROVENANCE } from '../src/mcp/services/mcpResponseNormalizer.js';

test('MCP Tool Executor — Security, Validation, Timeouts & Normalization', async (t) => {
  const registry = new McpToolRegistry();
  registry.setTools([
    {
      name: 'search_docs',
      description: 'Searches SAP Fiori elements documentation',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          maxResults: { type: 'number' }
        },
        required: ['query']
      }
    },
    {
      name: 'generate_fiori_app_odata',
      description: 'Generate app',
      inputSchema: {
        type: 'object',
        properties: {
          appPath: { type: 'string' }
        },
        required: ['appPath']
      }
    }
  ]);

  await t.test('1. rejects execution when tool does not exist in registry', async () => {
    const executor = new McpToolExecutor({ toolRegistry: registry });
    const res = await executor.execute('non_existent_tool', {});
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error.code, 'MCP_TOOL_NOT_FOUND');
  });

  await t.test('2. blocks execution of non-permitted tool with MCP_TOOL_BLOCKED_BY_POLICY', async () => {
    const executor = new McpToolExecutor({ toolRegistry: registry });
    const res = await executor.execute('generate_fiori_app_odata', { appPath: '/some/path' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.executionStatus, 'BLOCKED');
    assert.strictEqual(res.error.code, 'MCP_TOOL_BLOCKED_BY_POLICY');
    assert.strictEqual(res.provenance, MCP_PROVENANCE.BLOCKED_BY_POLICY);
  });

  await t.test('3. rejects arguments missing required properties with schema validation error', async () => {
    const executor = new McpToolExecutor({ toolRegistry: registry });
    const res = await executor.execute('search_docs', {}); // missing 'query'
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error.code, 'MCP_INVALID_ARGUMENTS');
    assert.ok(res.error.details.some(d => d.includes('query')));
  });

  await t.test('4. rejects arguments with invalid types', async () => {
    const executor = new McpToolExecutor({ toolRegistry: registry });
    const res = await executor.execute('search_docs', { query: 12345 }); // query must be string
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error.code, 'MCP_INVALID_ARGUMENTS');
    assert.ok(res.error.details.some(d => d.includes('must be a string')));
  });

  await t.test('5. returns MCP_SERVICE_UNAVAILABLE when connection is not CONNECTED', async () => {
    const mockConnectionManager = {
      getState: () => 'STOPPED',
      config: { toolTimeoutMs: 1000 }
    };
    const executor = new McpToolExecutor({
      toolRegistry: registry,
      connectionManager: mockConnectionManager
    });

    const res = await executor.execute('search_docs', { query: 'List Report' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.error.code, 'MCP_SERVICE_UNAVAILABLE');
  });

  await t.test('6. successfully executes permitted tool and normalizes response with provenance', async () => {
    const mockConnectionManager = {
      getState: () => 'CONNECTED',
      config: { toolTimeoutMs: 1000, serverPackage: '@sap-ux/fiori-mcp-server' },
      callTool: async (toolName, args) => ({
        content: [{ type: 'text', text: 'Result for query: ' + args.query }]
      })
    };

    const executor = new McpToolExecutor({
      toolRegistry: registry,
      connectionManager: mockConnectionManager
    });

    const res = await executor.execute('search_docs', { query: 'List Report' });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.executionStatus, 'SUCCESS');
    assert.strictEqual(res.provenance, MCP_PROVENANCE.SAP_DOCUMENTATION_RESPONSE);
    assert.ok(res.result.rawText.includes('List Report'));
    assert.ok(typeof res.durationMs === 'number');
    assert.ok(res.executedAt);
  });

  await t.test('7. handles execution timeout appropriately', async () => {
    const mockConnectionManager = {
      getState: () => 'CONNECTED',
      config: { toolTimeoutMs: 100, serverPackage: '@sap-ux/fiori-mcp-server' },
      callTool: async () => {
        throw new McpTimeoutError('Tool call timed out');
      }
    };

    const executor = new McpToolExecutor({
      toolRegistry: registry,
      connectionManager: mockConnectionManager
    });

    const res = await executor.execute('search_docs', { query: 'Test' });
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.executionStatus, 'TIMEOUT');
    assert.strictEqual(res.error.code, 'MCP_TIMEOUT');
  });
});
