import test from 'node:test';
import assert from 'node:assert/strict';
import { McpCandidateCollector, CANDIDATE_SOURCES } from '../src/mcp/discovery/mcpCandidateCollector.js';

test('MCP-03 Candidate Collector — Extraction, Merging & Duplicate Governance', async (t) => {
  const mockCatalogueAdapter = {
    getAppById: async (id) => {
      if (id.toUpperCase() === 'F1612') {
        return {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          description: 'Official catalogue description for F1612',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori elements',
          productVersion: 'SAP S/4HANA 2023',
          odataServices: ['FAP_PAYMENT_POST_SRV'],
          provenance: 'LOCAL_OFFICIAL_CATALOGUE'
        };
      }
      return null;
    }
  };

  const collector = new McpCandidateCollector({
    catalogueAdapter: mockCatalogueAdapter
  });

  await t.test('1. extracts App IDs from textual documentation responses', async () => {
    const execResults = [
      {
        toolName: 'search_docs',
        success: true,
        result: {
          text: 'To manage purchase orders, refer to standard Fiori app F0842A and related app F1612 for invoice clearing.'
        },
        timestamp: '2026-11-07T12:00:00Z'
      }
    ];

    const { mergedCandidates, mcpDiscoveredCount } = await collector.collectAndMergeCandidates(
      execResults,
      [],
      { userRequirement: { businessProcess: 'Sourcing and Procurement' } }
    );

    assert.strictEqual(mergedCandidates.length, 2);
    const f0842a = mergedCandidates.find(c => c.appId === 'F0842A');
    const f1612 = mergedCandidates.find(c => c.appId === 'F1612');

    assert.ok(f0842a);
    assert.strictEqual(f0842a.isExternalMcpDiscovered, true);
    assert.strictEqual(f0842a.inLocalCatalogue, false);
    assert.strictEqual(f0842a.source, CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY);

    assert.ok(f1612);
    assert.strictEqual(f1612.inLocalCatalogue, true);
    assert.strictEqual(f1612.appName, 'Post Outgoing Payments');
    assert.ok(f1612.sources.includes(CANDIDATE_SOURCES.LOCAL_OFFICIAL_CATALOGUE));
    assert.ok(f1612.sources.includes(CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY));
  });

  await t.test('2. merges duplicate candidate without overwriting authoritative catalogue fields', async () => {
    const existingCatalogueApp = {
      appId: 'F0842A',
      appName: 'Manage Purchase Orders',
      description: 'Canonical FAL description',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori elements',
      productVersion: 'SAP S/4HANA 2023',
      odataServices: ['C_PURCHASEORDER_FS_SRV'],
      provenance: 'LOCAL_OFFICIAL_CATALOGUE'
    };

    const execResults = [
      {
        toolName: 'search_docs',
        success: true,
        result: {
          text: 'Documentation mentions F0842A with modified unofficial name Conflicting App Title.'
        },
        timestamp: '2026-11-07T12:05:00Z'
      }
    ];

    const { mergedCandidates, duplicatesCount } = await collector.collectAndMergeCandidates(
      execResults,
      [existingCatalogueApp],
      {}
    );

    assert.strictEqual(mergedCandidates.length, 1);
    assert.strictEqual(duplicatesCount, 1);

    const merged = mergedCandidates[0];
    // Authoritative title preserved
    assert.strictEqual(merged.appName, 'Manage Purchase Orders');
    assert.strictEqual(merged.inLocalCatalogue, true);
    assert.ok(merged.sources.includes(CANDIDATE_SOURCES.LOCAL_OFFICIAL_CATALOGUE));
    assert.ok(merged.sources.includes(CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY));
    assert.ok(merged.mcpEnrichment !== null);
    assert.strictEqual(merged.mcpEnrichment.discoveredViaTool, 'search_docs');
  });

  await t.test('3. correctly flags external candidate outside canonical catalogue as unverified on target', async () => {
    const execResults = [
      {
        toolName: 'list_fiori_apps',
        success: true,
        result: {
          parsed: [
            {
              appId: 'F9999',
              appName: 'External Cloud App',
              description: 'Custom app in remote workspace',
              appType: 'Transactional'
            }
          ]
        },
        timestamp: '2026-11-07T12:10:00Z'
      }
    ];

    const { mergedCandidates, mcpDiscoveredCount } = await collector.collectAndMergeCandidates(
      execResults,
      [],
      {}
    );

    assert.strictEqual(mergedCandidates.length, 1);
    assert.strictEqual(mcpDiscoveredCount, 1);

    const cand = mergedCandidates[0];
    assert.strictEqual(cand.appId, 'F9999');
    assert.strictEqual(cand.isExternalMcpDiscovered, true);
    assert.strictEqual(cand.inLocalCatalogue, false);
    assert.strictEqual(cand.verificationStatus, 'PENDING_TARGET_VERIFICATION');
    assert.ok(cand.limitations.some(l => l.includes('Not verified in local canonical FAL catalogue cache')));
  });
});
