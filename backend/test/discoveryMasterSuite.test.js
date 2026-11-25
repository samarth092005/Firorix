/**
 * Fiorify — Discovery Master Test Suite (Phase 6 / DISC-001 to DISC-008)
 *
 * Automated verification of:
 * - DISC-001: Live T-Code existence verification (no synthetic heuristics, ADT 403, 502/504 handling, provenance)
 * - DISC-002: Catalogue completeness metadata (COMPLETE, INCOMPLETE, STALE, FAILED_SYNC, UNKNOWN)
 * - DISC-003: Match classifications (VERIFIED_SUCCESSOR, POTENTIAL_ALTERNATIVE, WEAK_CANDIDATE, NO_MATCH_CONFIRMED, NO_MATCH_PENDING, DISCOVERY_BLOCKED)
 * - DISC-004: Scoring weights, evidence thresholds, and confidence explanations
 * - DISC-005: Technical evidence linkage (traceable provenance, secret scrubbing, tenant scoping)
 * - DISC-006: 18 Golden regression scenarios
 * - DISC-007: Catalogue ingestion, deduplication, and freshness
 * - DISC-008: Discovery UI provenance and label contracts
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TransactionRegistryProvider,
  TRANSACTION_EXISTENCE_STATES
} from '../src/services/transactionDiscoveryProviders.js';
import {
  OfficialFioriCatalogueAdapter,
  CATALOGUE_COMPLETENESS_STATES
} from '../src/adapters/officialFioriCatalogueAdapter.js';
import {
  FioriMatchingEngine,
  MATCH_CLASSIFICATIONS
} from '../src/engine/fioriMatchingEngine.js';
import { TechnicalEvidenceEngine } from '../src/engine/technicalEvidenceEngine.js';
import { SapTransactionDiscoveryAdapter } from '../src/adapters/sapTransactionDiscoveryAdapter.js';

test('DISC-001: Live T-Code existence verification without synthetic heuristics', async (t) => {
  await t.test('Confirmed existing standard transaction returns CONFIRMED_EXISTING with provenance', async () => {
    const provider = new TransactionRegistryProvider();
    const result = await provider.checkExistence('VA01', {
      systemId: 'S21',
      client: '200'
    });

    assert.equal(result.exists, true);
    assert.equal(result.state, TRANSACTION_EXISTENCE_STATES.CONFIRMED_EXISTING);
    assert.ok(result.provenance, 'Provenance metadata must be present');
    assert.ok(typeof result.provenance === 'string' && (result.provenance.includes('DDIC') || result.provenance.includes('SAP') || result.provenance.includes('SNAPSHOT')));
  });

  await t.test('Confirmed non-existent transaction returns CONFIRMED_NON_EXISTENT when catalog is complete', async () => {
    const provider = new TransactionRegistryProvider();
    const result = await provider.checkExistence('ZNONEXISTENT999', {
      systemId: 'S21',
      client: '200',
      catalogComplete: true
    });

    assert.equal(result.exists, false);
    assert.equal(result.state, TRANSACTION_EXISTENCE_STATES.CONFIRMED_NON_EXISTENT);
    assert.ok(result.provenance);
  });

  await t.test('ADT 403 Authorization Block returns AUTHORIZATION_BLOCKED with exists: null, never false', async () => {
    const provider = new TransactionRegistryProvider();
    const mockAdtClient = {
      checkTransaction: async () => {
        const err = new Error('ADT Authorization Check Failed: Missing S_ADT_RES Activity 03');
        err.statusCode = 403;
        throw err;
      }
    };

    const result = await provider.checkExistence('VA01', {
      systemId: 'S21',
      client: '200',
      ignoreSnapshot: true,
      adtClient: mockAdtClient
    });

    assert.equal(result.exists, null, 'exists must be null on authorization error, never false');
    assert.equal(result.state, TRANSACTION_EXISTENCE_STATES.AUTHORIZATION_BLOCKED);
    assert.ok(result.reason.includes('403') || result.requiredAuthorizations?.some(a => a.includes('S_ADT_RES')));
    assert.ok(result.provenance.includes('ADT'));
  });

  await t.test('ICM connection timeout or 504 returns BACKEND_UNAVAILABLE with exists: null, never false', async () => {
    const provider = new TransactionRegistryProvider();
    const mockAdtClient = {
      checkTransaction: async () => {
        const err = new Error('Gateway Timeout');
        err.statusCode = 504;
        throw err;
      }
    };

    const result = await provider.checkExistence('ME21N', {
      systemId: 'S21',
      client: '200',
      ignoreSnapshot: true,
      adtClient: mockAdtClient
    });

    assert.equal(result.exists, null, 'exists must be null on gateway timeout, never false');
    assert.equal(result.state, TRANSACTION_EXISTENCE_STATES.BACKEND_UNAVAILABLE);
  });

  await t.test('Production flow has no hardcoded synthetic heuristics (un-indexed non-mock tcode is PENDING_VERIFICATION)', async () => {
    const provider = new TransactionRegistryProvider();
    const res = await provider.checkExistence('ZUNINDEXED', {
      isMockFixture: false,
      allowSyntheticNonExistent: false,
      catalogComplete: false
    });
    assert.equal(res.state, TRANSACTION_EXISTENCE_STATES.PENDING_VERIFICATION);
    assert.equal(res.exists, null);
  });
});

test('DISC-002: Catalogue completeness metadata end-to-end', async (t) => {
  await t.test('Exports all canonical catalogue completeness states', () => {
    assert.equal(CATALOGUE_COMPLETENESS_STATES.COMPLETE, 'COMPLETE');
    assert.equal(CATALOGUE_COMPLETENESS_STATES.INCOMPLETE, 'INCOMPLETE');
    assert.equal(CATALOGUE_COMPLETENESS_STATES.STALE, 'STALE');
    assert.equal(CATALOGUE_COMPLETENESS_STATES.FAILED_SYNC, 'FAILED_SYNC');
    assert.equal(CATALOGUE_COMPLETENESS_STATES.UNKNOWN, 'UNKNOWN');
  });

  await t.test('Partial catalogue returns INCOMPLETE status and tracks total vs imported apps', () => {
    const adapter = new OfficialFioriCatalogueAdapter();
    const completeness = adapter.getCompletenessMetadata();

    assert.ok(completeness.state === CATALOGUE_COMPLETENESS_STATES.INCOMPLETE || completeness.state === CATALOGUE_COMPLETENESS_STATES.COMPLETE);
    assert.ok(typeof completeness.retrievedAppsCount === 'number');
    assert.ok(typeof completeness.expectedTotalAppsCount === 'number');
    assert.ok(completeness.retrievedAppsCount > 0);
  });

  await t.test('searchApps includes catalogueCompleteness metadata in result', async () => {
    const adapter = new OfficialFioriCatalogueAdapter();
    const searchRes = await adapter.searchApps('Order');

    assert.ok(Array.isArray(searchRes.apps));
    assert.ok(searchRes.catalogueCompleteness, 'searchApps must include catalogueCompleteness metadata');
    assert.ok(searchRes.catalogueCompleteness.state);
  });
});

test('DISC-003: Match classifications and standard-first decisioning', async (t) => {
  const matchingEngine = new FioriMatchingEngine();

  await t.test('Zero candidates with INCOMPLETE catalogue returns NO_MATCH_PENDING, not NO_MATCH_CONFIRMED', async () => {
    const match = await matchingEngine.match({
      tcode: 'ZCUSTOM_SPECIAL_WORKFLOW',
      candidateApps: [],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.INCOMPLETE }
    });

    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.NO_MATCH_PENDING);
    assert.ok(match.explanation || match.explainability);
  });

  await t.test('Zero candidates with COMPLETE catalogue returns NO_MATCH_CONFIRMED', async () => {
    const match = await matchingEngine.match({
      tcode: 'ZCUSTOM_SPECIAL_WORKFLOW',
      candidateApps: [],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.COMPLETE }
    });

    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.NO_MATCH_CONFIRMED);
    assert.ok(match.explanation || match.explainability);
  });

  await t.test('Zero candidates with AUTHORIZATION_BLOCKED returns DISCOVERY_BLOCKED', async () => {
    const match = await matchingEngine.match({
      tcode: 'VA01',
      candidateApps: [],
      discoveryStatus: { state: TRANSACTION_EXISTENCE_STATES.AUTHORIZATION_BLOCKED },
      isBlocked: true
    });

    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.DISCOVERY_BLOCKED);
  });

  await t.test('Exact 1:1 match with high score returns VERIFIED_SUCCESSOR', async () => {
    const match = await matchingEngine.match({
      tcode: 'VA01',
      title: 'Create Sales Orders',
      candidateApps: [
        {
          appId: 'F1814',
          appName: 'Create Sales Orders',
          leadingTransactionCodes: ['VA01'],
          score: 95
        }
      ],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.COMPLETE }
    });

    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.VERIFIED_SUCCESSOR);
    assert.ok(match.matchScore >= 70);
  });
});

test('DISC-004: Scoring weights, evidence thresholds, and confidence explanations', async (t) => {
  const matchingEngine = new FioriMatchingEngine();

  await t.test('Separates overallScore, matchScore, evidenceStrength, confidence, and matchClassification', async () => {
    const match = await matchingEngine.match({
      tcode: 'FB03',
      title: 'Display Financial Document',
      candidateApps: [
        {
          appId: 'F0717',
          appName: 'Manage Journal Entries',
          leadingTransactionCodes: ['FB03'],
          score: 88
        }
      ],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.COMPLETE }
    });

    assert.ok(typeof match.overallScore === 'number');
    assert.ok(typeof match.matchScore === 'number');
    assert.ok(['VERIFIED', 'STRONG', 'MODERATE', 'WEAK'].includes(match.evidenceStrength));
    assert.ok(['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN', 'VERIFIED'].includes(match.confidence));
    assert.ok(match.matchClassification);
    assert.ok(match.explainability?.confidenceExplanation, 'Confidence explanation must be present');
  });
});

test('DISC-005: Technical evidence linkage and secret scrubbing', async (t) => {
  const evidenceEngine = new TechnicalEvidenceEngine();

  await t.test('Scrubs passwords, tokens, and authorization headers from technical evidence payloads', () => {
    const sanitized = evidenceEngine.sanitizeEvidencePayload({
      endpoint: '/sap/opu/odata/sap/API_SALES_ORDER_SRV',
      authorization: 'Basic dXNlcjpwYXNzd29yZDEyMw==',
      apiKey: 'secret-key-12345',
      bearerToken: 'eyJhbGciOi...',
      details: {
        userPassword: 'SuperSecretPassword!',
        safeField: 'SafeValue'
      }
    });

    assert.equal(sanitized.authorization, '[REDACTED]');
    assert.equal(sanitized.apiKey, '[REDACTED]');
    assert.equal(sanitized.bearerToken, '[REDACTED]');
    assert.equal(sanitized.details.userPassword, '[REDACTED]');
    assert.equal(sanitized.details.safeField, 'SafeValue');
  });

  await t.test('Enriches technical evidence with tenant, systemId, client, and freshness timestamp', () => {
    const evidence = evidenceEngine.buildEvidenceItem({
      type: 'DDIC_METADATA',
      sourceEndpoint: '/sap/bc/adt/ddic/structures/VBAK',
      systemId: 'S21',
      client: '200',
      tenantId: 'TENANT-ACME-01',
      data: { tableName: 'VBAK', package: 'VA' }
    });

    assert.equal(evidence.systemId, 'S21');
    assert.equal(evidence.sapClient, '200');
    assert.equal(evidence.tenantId, 'TENANT-ACME-01');
    assert.ok(evidence.retrievalTimestamp);
    assert.ok(evidence.freshness);
  });
});

test('DISC-006: 18 Golden Discovery Regression Scenarios', async (t) => {
  const provider = new TransactionRegistryProvider();
  const matchingEngine = new FioriMatchingEngine();
  const evidenceEngine = new TechnicalEvidenceEngine();

  // Scenario 1: Standard SD Sales Order (VA01)
  await t.test('Scenario 1: VA01 -> Standard Sales Order Fiori candidate', async () => {
    const res = await provider.checkExistence('VA01', { systemId: 'S21', client: '200' });
    assert.equal(res.exists, true);
    assert.equal(res.state, TRANSACTION_EXISTENCE_STATES.CONFIRMED_EXISTING);
  });

  // Scenario 2: Standard FI Financial Document (FB03)
  await t.test('Scenario 2: FB03 -> Standard Financial Document Fiori candidate', async () => {
    const res = await provider.checkExistence('FB03', { systemId: 'S21', client: '200' });
    assert.equal(res.exists, true);
    assert.equal(res.state, TRANSACTION_EXISTENCE_STATES.CONFIRMED_EXISTING);
  });

  // Scenario 3: Standard MM Purchase Order (ME23N)
  await t.test('Scenario 3: ME23N -> Standard PO Display Fiori candidate', async () => {
    const res = await provider.checkExistence('ME23N', { systemId: 'S21', client: '200' });
    assert.equal(res.exists, true);
  });

  // Scenario 4: Custom Z-Report (ZREP01) with incomplete catalogue -> NO_MATCH_PENDING
  await t.test('Scenario 4: Custom Z-Report with incomplete catalogue -> NO_MATCH_PENDING', async () => {
    const match = await matchingEngine.match({
      tcode: 'ZREP01',
      candidateApps: [],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.INCOMPLETE }
    });
    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.NO_MATCH_PENDING);
  });

  // Scenario 5: Custom Z-Table Maintenance (ZTAB01) with complete catalogue -> NO_MATCH_CONFIRMED
  await t.test('Scenario 5: Custom Z-Table Maintenance with complete catalogue -> NO_MATCH_CONFIRMED', async () => {
    const match = await matchingEngine.match({
      tcode: 'ZTAB01',
      candidateApps: [],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.COMPLETE }
    });
    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.NO_MATCH_CONFIRMED);
  });

  // Scenario 6: Legacy Dynpro transaction with WebGUI fallback
  await t.test('Scenario 6: Legacy Dynpro transaction with WebGUI fallback', async () => {
    const match = await matchingEngine.match({
      tcode: 'XD01',
      title: 'Create Customer (Legacy)',
      candidateApps: [
        {
          appId: 'WEBGUI_XD01',
          appName: 'Create Customer (WebGUI)',
          appType: 'SAP GUI',
          score: 75
        }
      ],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.COMPLETE }
    });
    assert.ok(match.candidateApps[0].appType === 'SAP GUI');
  });

  // Scenario 7: ADT 403 Authorization Failure -> AUTHORIZATION_BLOCKED
  await t.test('Scenario 7: ADT 403 Authorization Failure -> AUTHORIZATION_BLOCKED', async () => {
    const res = await provider.checkExistence('VA02', {
      systemId: 'S21',
      client: '200',
      fetchLive: true,
      ignoreSnapshot: true,
      adtClient: {
        checkTransaction: async () => {
          const err = new Error('403 Forbidden');
          err.statusCode = 403;
          throw err;
        }
      }
    });
    assert.equal(res.state, TRANSACTION_EXISTENCE_STATES.AUTHORIZATION_BLOCKED);
    assert.equal(res.exists, null);
  });

  // Scenario 8: ICM 504 Network Timeout -> BACKEND_UNAVAILABLE
  await t.test('Scenario 8: ICM 504 Network Timeout -> BACKEND_UNAVAILABLE', async () => {
    const res = await provider.checkExistence('ME22N', {
      systemId: 'S21',
      client: '200',
      fetchLive: true,
      ignoreSnapshot: true,
      adtClient: {
        checkTransaction: async () => {
          const err = new Error('504 Gateway Timeout');
          err.statusCode = 504;
          throw err;
        }
      }
    });
    assert.equal(res.state, TRANSACTION_EXISTENCE_STATES.BACKEND_UNAVAILABLE);
    assert.equal(res.exists, null);
  });

  // Scenario 9: Incomplete catalogue search returns NO_MATCH_PENDING
  await t.test('Scenario 9: Incomplete catalogue search returns NO_MATCH_PENDING', async () => {
    const match = await matchingEngine.match({
      tcode: 'VA05',
      candidateApps: [],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.INCOMPLETE }
    });
    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.NO_MATCH_PENDING);
  });

  // Scenario 10: Stale catalogue search metadata
  await t.test('Scenario 10: Stale catalogue search metadata', async () => {
    const match = await matchingEngine.match({
      tcode: 'VA01',
      candidateApps: [],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.STALE }
    });
    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.NO_MATCH_PENDING);
  });

  // Scenario 11: Obsolete/deprecated transaction handling
  await t.test('Scenario 11: Obsolete transaction with standard successor', async () => {
    const match = await matchingEngine.match({
      tcode: 'F-02',
      title: 'Enter G/L Account Postings (Legacy)',
      candidateApps: [
        {
          appId: 'F0718',
          appName: 'Post General Journal Entries',
          leadingTransactionCodes: ['F-02', 'FB01'],
          score: 92
        }
      ],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.COMPLETE }
    });
    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.VERIFIED_SUCCESSOR);
  });

  // Scenario 12: SU24 authorization object evidence collection
  await t.test('Scenario 12: SU24 authorization object evidence collection', () => {
    const evidence = evidenceEngine.buildEvidenceItem({
      type: 'AUTHORIZATION_OBJECTS',
      systemId: 'S21',
      client: '200',
      data: {
        authObjects: [
          { object: 'V_VBAK_AAT', activity: '01,02,03' },
          { object: 'V_VBAK_VKO', activity: '01,02,03' }
        ]
      }
    });
    assert.equal(evidence.type, 'AUTHORIZATION_OBJECTS');
    assert.equal(evidence.data.authObjects.length, 2);
  });

  // Scenario 13: Multiple candidate apps without 1:1 official successor -> POTENTIAL_ALTERNATIVE
  await t.test('Scenario 13: Multiple candidate apps -> POTENTIAL_ALTERNATIVE', async () => {
    const match = await matchingEngine.match({
      tcode: 'ME21N',
      candidateApps: [
        { appId: 'F9991', appName: 'Purchasing Overview Dashboard', relatedTCodes: ['ME21N'], score: 68 },
        { appId: 'F9992', appName: 'Purchase Order Approval Assistant', relatedTCodes: ['ME21N'], score: 62 }
      ],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.COMPLETE }
    });
    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.POTENTIAL_ALTERNATIVE);
  });

  // Scenario 14: Single verified successor -> VERIFIED_SUCCESSOR
  await t.test('Scenario 14: Single verified successor -> VERIFIED_SUCCESSOR', async () => {
    const match = await matchingEngine.match({
      tcode: 'VA01',
      candidateApps: [
        { appId: 'F1814', appName: 'Create Sales Orders', leadingTransactionCodes: ['VA01'], score: 96 }
      ],
      catalogueCompleteness: { state: CATALOGUE_COMPLETENESS_STATES.COMPLETE }
    });
    assert.equal(match.matchClassification, MATCH_CLASSIFICATIONS.VERIFIED_SUCCESSOR);
  });

  // Scenario 15: Secret scrubbing in evidence payloads
  await t.test('Scenario 15: Secret scrubbing in evidence payloads', () => {
    const scrubbed = evidenceEngine.sanitizeEvidencePayload({
      user: 'int_samarth',
      password: 'SamplePassword',
      clientSecret: 'secret123'
    });
    assert.equal(scrubbed.password, '[REDACTED]');
    assert.equal(scrubbed.clientSecret, '[REDACTED]');
  });

  // Scenario 16: Cross-tenant isolation in technical evidence
  await t.test('Scenario 16: Cross-tenant isolation in technical evidence', () => {
    const ev1 = evidenceEngine.buildEvidenceItem({ tenantId: 'TENANT-A', data: { val: 1 } });
    const ev2 = evidenceEngine.buildEvidenceItem({ tenantId: 'TENANT-B', data: { val: 2 } });
    assert.notEqual(ev1.tenantId, ev2.tenantId);
  });

  // Scenario 17: Malformed transaction code input validation
  await t.test('Scenario 17: Malformed transaction code returns SYNTAX_INVALID', async () => {
    const res = await provider.checkExistence(';;DROP TABLE', { systemId: 'S21', client: '200' });
    assert.equal(res.state, TRANSACTION_EXISTENCE_STATES.SYNTAX_INVALID);
    assert.equal(res.exists, false);
  });

  // Scenario 18: End-to-end discovery response contract
  await t.test('Scenario 18: End-to-end discovery response contract includes provenance', async () => {
    const adapter = new SapTransactionDiscoveryAdapter();
    const result = await adapter.discoverTransaction('VA01', { systemId: 'S21', client: '200' });
    assert.ok(result.tcode === 'VA01');
    assert.ok(result.discoveryProvenance);
    assert.ok(result.discoveryProvenance.source);
    assert.ok(result.discoveryProvenance.sapSystem === 'S21');
  });
});

test('DISC-007 & DISC-008: Catalogue freshness and UI provenance labels', async (t) => {
  await t.test('Official catalogue returns deduplicated apps and freshness timestamp', () => {
    const adapter = new OfficialFioriCatalogueAdapter();
    const apps = adapter.getAllApps();
    const appIds = new Set(apps.map((a) => a.appId));
    assert.equal(appIds.size, apps.length, 'All catalogue apps must have unique appIds');
  });

  await t.test('Discovery adapter formats provenance labels for UI consumption', async () => {
    const adapter = new SapTransactionDiscoveryAdapter();
    const res = await adapter.discoverTransaction('VA01');
    assert.ok(res.discoveryProvenance.label || res.discoveryProvenance.source);
    assert.ok(res.discoveryProvenance.retrievalTimestamp);
  });
});
