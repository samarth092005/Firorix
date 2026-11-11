import test from 'node:test';
import assert from 'node:assert/strict';
import { FioriMatchingEngine, MATCH_CLASSIFICATIONS } from '../src/engine/fioriMatchingEngine.js';
import { CANDIDATE_SOURCES } from '../src/mcp/discovery/mcpCandidateCollector.js';

test('MCP-03 Matching Engine Integration — Governance, Scored Evaluation & Provenance', async (t) => {
  const matchingEngine = new FioriMatchingEngine();

  await t.test('1. evaluates merged candidate pool deterministically preserving provenance', async () => {
    const candidatePool = [
      {
        appId: 'F0842A',
        appName: 'Manage Purchase Orders',
        description: 'Standard Fiori app for PO management',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        productVersion: 'SAP S/4HANA 2023 Private Edition',
        businessRole: 'Purchaser',
        businessProcess: 'Sourcing and Procurement',
        lineOfBusiness: 'Sourcing and Procurement',
        leadingTransactionCodes: ['ME21N'],
        odataServices: ['C_PURCHASEORDER_FS_SRV'],
        source: CANDIDATE_SOURCES.LOCAL_OFFICIAL_CATALOGUE,
        sources: [CANDIDATE_SOURCES.LOCAL_OFFICIAL_CATALOGUE, CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY],
        provenance: 'LOCAL_OFFICIAL_CATALOGUE',
        inLocalCatalogue: true
      },
      {
        appId: 'F9999',
        appName: 'Externally Discovered Cloud App',
        description: 'Mentioned only in documentation for purchasing',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        productVersion: 'Pending Target Verification',
        businessRole: 'Purchaser',
        businessProcess: 'Sourcing and Procurement',
        lineOfBusiness: 'Sourcing and Procurement',
        leadingTransactionCodes: [],
        odataServices: ['Z_UNKNOWN_SRV'],
        source: CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY,
        sources: [CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY],
        provenance: CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY,
        inLocalCatalogue: false,
        isExternalMcpDiscovered: true
      }
    ];

    const matchResult = await matchingEngine.match({
      transaction: {
        tcode: 'ME21N',
        description: 'Create Purchase Order'
      },
      candidatePool,
      liveGatewayServices: [{ technicalServiceName: 'C_PURCHASEORDER_FS_SRV' }],
      targetRelease: 'SAP S/4HANA 2023 Private Edition'
    });

    assert.strictEqual(matchResult.success, true);
    assert.strictEqual(matchResult.totalCandidatesEvaluated, 2);

    // F0842A has verified leading transaction code and active Gateway service
    const topCandidate = matchResult.rankedCandidates[0];
    assert.strictEqual(topCandidate.appId, 'F0842A');
    assert.strictEqual(topCandidate.matchClassification, MATCH_CLASSIFICATIONS.VERIFIED_MATCH);

    // F9999 (MCP documentation only) is ranked lower with WEAK_CANDIDATE or PARTIAL_FIT and NOT verified match
    const mcpCandidate = matchResult.rankedCandidates[1];
    assert.strictEqual(mcpCandidate.appId, 'F9999');
    assert.notStrictEqual(mcpCandidate.matchClassification, MATCH_CLASSIFICATIONS.VERIFIED_MATCH);
    assert.strictEqual(mcpCandidate.isExternalMcpDiscovered, true);
    assert.strictEqual(mcpCandidate.provenance, CANDIDATE_SOURCES.MCP_DOCUMENTATION_DISCOVERY);
  });

  await t.test('2. documentation-only candidate cannot become VERIFIED_MATCH without verified T-Code linkage and OData', async () => {
    const docCandidate = [
      {
        appId: 'F8888',
        appName: 'Doc Mentioned Tool',
        description: 'Documentation snippet for purchasing',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        productVersion: 'SAP S/4HANA 2023 Private Edition',
        businessRole: 'Purchaser',
        businessProcess: 'Sourcing and Procurement',
        leadingTransactionCodes: [], // No official leading T-Code
        odataServices: ['UNVERIFIED_ODATA_SRV'],
        provenance: 'MCP_DOCUMENTATION_DISCOVERY',
        source: 'MCP_DOCUMENTATION_DISCOVERY',
        inLocalCatalogue: false
      }
    ];

    const matchResult = await matchingEngine.match({
      transaction: { tcode: 'ME21N', description: 'Create Purchase Order' },
      candidatePool: docCandidate,
      liveGatewayServices: [], // No live Gateway service
      targetRelease: 'SAP S/4HANA 2023 Private Edition'
    });

    assert.notStrictEqual(matchResult.matchClassification, MATCH_CLASSIFICATIONS.VERIFIED_MATCH);
    assert.ok(matchResult.rankedCandidates[0].overallScore < 70);
  });

  await t.test('3. release mismatch is strictly classified as INCOMPATIBLE', async () => {
    const incompatibleApp = [
      {
        appId: 'F7777',
        appName: 'S4HANA Only App',
        description: 'App requiring SAP S/4HANA backend',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        productVersion: 'SAP S/4HANA 2023',
        businessRole: 'Purchaser',
        businessProcess: 'Procurement',
        leadingTransactionCodes: ['ME21N'],
        odataServices: [],
        provenance: 'MCP_DOCUMENTATION_DISCOVERY',
        source: 'MCP_DOCUMENTATION_DISCOVERY',
        inLocalCatalogue: false
      }
    ];

    const matchResult = await matchingEngine.match({
      transaction: { tcode: 'ME21N', description: 'Create Purchase Order' },
      candidatePool: incompatibleApp,
      targetRelease: 'SAP ECC 6.0 EHP8' // Target is legacy ECC
    });

    const evaluated = matchResult.rankedCandidates[0];
    assert.strictEqual(evaluated.releaseCompatibilityStatus, 'INCOMPATIBLE');
    assert.strictEqual(evaluated.matchClassification, MATCH_CLASSIFICATIONS.INCOMPATIBLE);
  });
});
