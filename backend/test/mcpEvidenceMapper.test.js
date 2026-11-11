import test from 'node:test';
import assert from 'node:assert/strict';
import { McpEvidenceMapper } from '../src/mcp/discovery/mcpEvidenceMapper.js';
import { McpTransactionContext } from '../src/mcp/discovery/mcpTransactionContext.js';
import { EVIDENCE_CLASSIFICATIONS, CONFIDENCE_LEVELS } from '../src/engine/technicalEvidenceEngine.js';

test('MCP-03 Evidence Mapper — Evidence Classification & Source Provenance', async (t) => {
  const mapper = new McpEvidenceMapper();
  const context = new McpTransactionContext({
    tcode: 'ME21N',
    transactionDescription: 'Create Purchase Order',
    systemId: 'S21-200'
  });

  await t.test('1. maps search_docs to DOCUMENTATION evidence with PENDING_VERIFICATION', () => {
    const execResult = {
      toolName: 'search_docs',
      success: true,
      executionStatus: 'SUCCESS',
      arguments: { query: 'ME21N Purchase Order' },
      result: {
        text: 'Manage Purchase Orders (F0842A) is the primary Fiori app for ME21N.'
      },
      timestamp: '2026-11-07T12:00:00Z'
    };

    const evidenceList = mapper.mapToolExecutionToEvidence(execResult, context);
    assert.strictEqual(evidenceList.length, 1);

    const ev = evidenceList[0];
    assert.strictEqual(ev.category, 'DOCUMENTATION');
    assert.strictEqual(ev.classification, EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION);
    assert.notStrictEqual(ev.classification, EVIDENCE_CLASSIFICATIONS.LIVE_SAP_VERIFIED);
    assert.strictEqual(ev.confidence, CONFIDENCE_LEVELS.MEDIUM);
    assert.strictEqual(ev.provenance.sourceType, 'MCP_DOCUMENTATION_RESPONSE');
    assert.strictEqual(ev.provenance.sourceTool, 'search_docs');
    assert.strictEqual(ev.provenance.serverPackage, '@sap-ux/fiori-mcp-server');
    assert.ok(ev.limitations.some(l => l.includes('Documentation evidence does NOT establish live system availability')));
  });

  await t.test('2. maps list_sap_systems to configuration evidence without claiming reachability proof', () => {
    const execResult = {
      toolName: 'list_sap_systems',
      success: true,
      executionStatus: 'SUCCESS',
      arguments: {},
      result: {
        parsed: [
          { systemId: 'S21', client: '200', name: 'S21 Private Cloud' },
          { systemId: 'ER9', client: '100', name: 'ERP Core' }
        ]
      },
      timestamp: '2026-11-07T12:05:00Z'
    };

    const evidenceList = mapper.mapToolExecutionToEvidence(execResult, context);
    assert.strictEqual(evidenceList.length, 1);

    const ev = evidenceList[0];
    assert.strictEqual(ev.category, 'ENVIRONMENT_CONFIGURATION');
    assert.strictEqual(ev.classification, EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION);
    assert.notStrictEqual(ev.classification, EVIDENCE_CLASSIFICATIONS.LIVE_SAP_VERIFIED);
    assert.ok(ev.limitations.some(l => l.includes('Presence in configuration does NOT guarantee live network reachability')));
  });

  await t.test('3. maps failed tool executions to UNAVAILABLE or BLOCKED_BY_AUTHORIZATION', () => {
    // Normal failure
    const failedResult = {
      toolName: 'search_docs',
      success: false,
      executionStatus: 'TIMEOUT',
      error: { message: 'Tool execution timed out', code: 'MCP_TIMEOUT' },
      timestamp: '2026-11-07T12:10:00Z'
    };

    const evList1 = mapper.mapToolExecutionToEvidence(failedResult, context);
    assert.strictEqual(evList1.length, 1);
    assert.strictEqual(evList1[0].classification, EVIDENCE_CLASSIFICATIONS.UNAVAILABLE);
    assert.strictEqual(evList1[0].confidence, CONFIDENCE_LEVELS.UNKNOWN);

    // Auth failure
    const authFailedResult = {
      toolName: 'list_sap_systems',
      success: false,
      executionStatus: 'FAILED',
      error: { message: 'Unauthorized system access', code: 'MCP_AUTHORIZATION_FAILED' },
      timestamp: '2026-11-07T12:15:00Z'
    };

    const evList2 = mapper.mapToolExecutionToEvidence(authFailedResult, context);
    assert.strictEqual(evList2.length, 1);
    assert.strictEqual(evList2[0].classification, EVIDENCE_CLASSIFICATIONS.BLOCKED_BY_AUTHORIZATION);
  });
});
