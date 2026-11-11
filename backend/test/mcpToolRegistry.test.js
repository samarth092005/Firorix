import test from 'node:test';
import assert from 'node:assert/strict';
import { McpToolRegistry } from '../src/mcp/services/mcpToolRegistry.js';
import { TOOL_CATEGORIES } from '../src/mcp/security/mcpToolPolicy.js';

test('MCP Tool Registry — Discovery, Classification & Querying', async (t) => {
  await t.test('1. starts empty when initialized', () => {
    const registry = new McpToolRegistry();
    assert.strictEqual(registry.getTools().length, 0);
    assert.strictEqual(registry.hasTool('search_docs'), false);
    assert.strictEqual(registry.getTool('search_docs'), null);
    const summary = registry.getSummary();
    assert.strictEqual(summary.total, 0);
  });

  await t.test('2. registers and classifies discovered tools accurately', () => {
    const registry = new McpToolRegistry();
    const rawTools = [
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
        description: 'Generates new SAP Fiori UI application',
        inputSchema: {
          type: 'object',
          properties: {
            appPath: { type: 'string' }
          },
          required: ['appPath']
        }
      }
    ];

    registry.setTools(rawTools, {
      serverVersion: { name: 'fiori-mcp', version: '1.15.24' }
    });

    assert.strictEqual(registry.getTools().length, 2);
    assert.strictEqual(registry.hasTool('search_docs'), true);
    assert.strictEqual(registry.hasTool('generate_fiori_app_odata'), true);

    const docTool = registry.getTool('search_docs');
    assert.strictEqual(docTool.isAllowed, true);
    assert.strictEqual(docTool.category, TOOL_CATEGORIES.DOCUMENTATION_SEARCH);
    assert.deepStrictEqual(docTool.requiredProperties, ['query']);
    assert.deepStrictEqual(docTool.optionalProperties, ['maxResults']);

    const genTool = registry.getTool('generate_fiori_app_odata');
    assert.strictEqual(genTool.isAllowed, false);
    assert.strictEqual(genTool.category, TOOL_CATEGORIES.APPLICATION_GENERATION);
    assert.strictEqual(genTool.operationalImpact, 'EXECUTION_DISABLED');
    assert.ok(genTool.policyReason.includes('disabled in MCP-01/MCP-02'));

    const summary = registry.getSummary();
    assert.strictEqual(summary.total, 2);
    assert.strictEqual(summary.allowedCount, 1);
    assert.strictEqual(summary.blockedCount, 1);
  });

  await t.test('3. clears tool inventory completely on clear()', () => {
    const registry = new McpToolRegistry();
    registry.setTools([{ name: 'test_tool', description: 'a tool' }]);
    assert.strictEqual(registry.getTools().length, 1);
    registry.clear();
    assert.strictEqual(registry.getTools().length, 0);
    assert.strictEqual(registry.lastDiscoveredAt, null);
  });
});
