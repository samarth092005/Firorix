import test from 'node:test';
import assert from 'node:assert/strict';
import { McpToolPolicy, TOOL_CATEGORIES } from '../src/mcp/security/mcpToolPolicy.js';

test('MCP Tool Policy — Security Enforcement & Conservative Allowlist', async (t) => {
  const policy = new McpToolPolicy();

  await t.test('1. permits approved read-only tools', () => {
    const approved = [
      'search_docs',
      'list_fiori_apps',
      'list_sap_systems',
      'list_functionality',
      'get_functionality_details'
    ];

    for (const toolName of approved) {
      const evaluation = policy.evaluate(toolName);
      assert.strictEqual(evaluation.allowed, true, `Tool "${toolName}" should be allowed`);
    }
  });

  await t.test('2. blocks download_odata_service_metadata pending review due to file-writing side effects', () => {
    const evaluation = policy.evaluate('download_odata_service_metadata');
    assert.strictEqual(evaluation.allowed, false);
    assert.strictEqual(evaluation.operationalImpact, 'BLOCKED_PENDING_REVIEW');
    assert.ok(evaluation.reason.includes('writes metadata.xml'));
  });

  await t.test('3. blocks application generation tools strictly', () => {
    const blockedGen = ['generate_fiori_app_odata', 'generate_fiori_app_cap'];
    for (const toolName of blockedGen) {
      const evaluation = policy.evaluate(toolName);
      assert.strictEqual(evaluation.allowed, false, `Tool "${toolName}" must be blocked`);
      assert.strictEqual(evaluation.category, TOOL_CATEGORIES.APPLICATION_GENERATION);
      assert.ok(evaluation.reason.includes('disabled in MCP-01/MCP-02'));
    }
  });

  await t.test('4. blocks application modification tool execute_functionality', () => {
    const evaluation = policy.evaluate('execute_functionality');
    assert.strictEqual(evaluation.allowed, false);
    assert.strictEqual(evaluation.category, TOOL_CATEGORIES.APPLICATION_MODIFICATION);
    assert.ok(evaluation.reason.includes('disabled in MCP-01/MCP-02'));
  });

  await t.test('5. rejects unknown and fabricated tool names by default', () => {
    const evaluation = policy.evaluate('arbitrary_malicious_tool');
    assert.strictEqual(evaluation.allowed, false);
    assert.ok(evaluation.reason.includes('not permitted'));
  });

  await t.test('6. rejects invalid, empty, or non-string tool names', () => {
    assert.strictEqual(policy.evaluate(null).allowed, false);
    assert.strictEqual(policy.evaluate('').allowed, false);
    assert.strictEqual(policy.evaluate(123).allowed, false);
  });
});
