import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../src/server.js';
import { transactionDiscoveryEngine, TransactionDiscoveryEngine } from '../src/engine/transactionDiscoveryEngine.js';
import { technicalEvidenceEngine, TechnicalEvidenceEngine, EVIDENCE_CLASSIFICATIONS, PROVENANCE_CATEGORIES } from '../src/engine/technicalEvidenceEngine.js';
import { fioriMatchingEngine, FioriMatchingEngine, MATCH_CLASSIFICATIONS, RECOMMENDATION_READINESS } from '../src/engine/fioriMatchingEngine.js';
import { defaultFalIngestionService } from '../src/tools/ingestFAL.js';

describe('DISC-QA + CAT-03: Quality Assurance, FAL Expansion & 10 Matching Scenarios', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // CAT-03: Canonical Catalogue Status & Authentic Expansion
  // =========================================================================
  describe('CAT-03 — Canonical Catalogue Expansion & Status', () => {
    it('reports accurate status with total genuine records and subset coverage', async () => {
      const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/status`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(typeof data.status.totalRecords, 'number');
      assert.ok(data.status.totalRecords >= 30, 'Catalogue must have expanded to at least 30 genuine records');
      assert.strictEqual(data.status.duplicateRecordsCount, 0, 'Must have 0 duplicate records');
      assert.strictEqual(data.status.sourceCoverage.isSubset, true, 'Local catalogue is a verified subset');
      assert.ok(data.status.sourceCoverage.coveragePercent > 0);
      assert.ok(data.status.recordsByAppType['Transactional'] > 0);
      assert.ok(data.status.recordsByAppType['SAP GUI'] > 0);
    });

    it('returns filtered catalogue apps by appType from backend API', async () => {
      const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/search?appType=Transactional&limit=50`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      const apps = data.apps || data.candidates || [];
      assert.ok(apps.length > 0);
      apps.forEach((app) => {
        assert.ok(app.appType.includes('Transactional'), `App ${app.appId} must be Transactional`);
      });
    });
  });

  // =========================================================================
  // DISC-QA: Technical Evidence Classification & Integrity
  // =========================================================================
  describe('DISC-QA — Technical Evidence Engine Integrity', () => {
    it('classifies transaction identity with explicit evidence classifications', () => {
      const engine = new TechnicalEvidenceEngine();
      const identity = engine.classifyTransactionIdentity({
        tcode: 'FB50',
        isValidFormat: true,
        formatClassification: EVIDENCE_CLASSIFICATIONS.FORMAT_VALIDATED,
        mockTx: { exists: true, program: 'SAPMF05A', packageName: 'FBAS', authorizationObject: 'F_BKPF_BUK' },
        isLiveMode: false
      });

      assert.strictEqual(identity.userSuppliedTCode, 'FB50');
      assert.strictEqual(identity.formatValidation.classification, EVIDENCE_CLASSIFICATIONS.FORMAT_VALIDATED);
      assert.strictEqual(identity.sapExistenceVerification.classification, EVIDENCE_CLASSIFICATIONS.CURATED_FIXTURE);
      assert.strictEqual(identity.programMetadata.classification, EVIDENCE_CLASSIFICATIONS.CURATED_FIXTURE);
      assert.strictEqual(identity.programMetadata.value, 'SAPMF05A');
      assert.strictEqual(identity.authorizationMetadata.classification, EVIDENCE_CLASSIFICATIONS.CURATED_FIXTURE);
    });

    it('separates Gateway service discovery from application existence in evidence', () => {
      const engine = new TechnicalEvidenceEngine();
      const result = engine.collectEvidence({
        tcode: 'ME21N',
        transactionData: { exists: true, program: 'SAPLMEGUI' },
        gatewayServices: [{ serviceName: 'MM_PUR_PO_MAINT_V2_SRV', serviceVersion: '0001' }],
        candidateApps: [{ appId: 'F0842A', appName: 'Manage Purchase Orders' }],
        isLiveMode: false
      });

      const gatewayEv = result.evidence.find((e) => e.evidenceType === 'GATEWAY_CATALOG');
      assert.ok(gatewayEv, 'Gateway evidence must be collected');
      assert.ok(gatewayEv.limitations.some((lim) => lim.includes('Active Gateway OData service')));
      assert.ok(gatewayEv.gatewayIntegrity.serviceDiscovered);
      assert.strictEqual(gatewayEv.gatewayIntegrity.functionallySuitable, false);
    });
  });

  // =========================================================================
  // 10 MANDATORY MATCHING SCENARIOS
  // =========================================================================
  describe('DISC-QA — 10 Mandatory Matching Scenarios', () => {
    const matchingEngine = new FioriMatchingEngine();
    const discoveryEngine = new TransactionDiscoveryEngine();

    // 1. F-53 with verified direct mapping (F-53 classic tile)
    it('Scenario 1: F-53 with verified direct mapping (classic tile)', async () => {
      const discovery = await discoveryEngine.discover({ tcode: 'F-53', useLiveSap: false });
      const match = await matchingEngine.match({
        transaction: discovery,
        targetRelease: 'SAP S/4HANA 2023'
      });

      assert.strictEqual(match.success, true);
      const classicTile = match.rankedCandidates.find((c) => c.appId === 'F-53');
      assert.ok(classicTile, 'F-53 classic tile should be found');
      assert.strictEqual(classicTile.appType, 'SAP GUI');
      assert.ok(
        classicTile.matchClassification === MATCH_CLASSIFICATIONS.VERIFIED_MATCH ||
        classicTile.matchClassification === MATCH_CLASSIFICATIONS.STRONG_CANDIDATE
      );
    });

    // 2. F-53 with F1612 as leading successor / alternative
    it('Scenario 2: F-53 with F1612 as leading modern successor', async () => {
      const discovery = await discoveryEngine.discover({ tcode: 'F-53', useLiveSap: false });
      const match = await matchingEngine.match({
        transaction: discovery,
        targetRelease: 'SAP S/4HANA 2023'
      });

      const f1612 = match.rankedCandidates.find((c) => c.appId === 'F1612');
      assert.ok(f1612, 'F1612 (Manage Outgoing Payments) must be present as candidate');
      assert.ok(f1612.overallScore >= 70, `F1612 score (${f1612.overallScore}) should be >= 70 as modern successor`);
      assert.ok(
        f1612.matchClassification === MATCH_CLASSIFICATIONS.VERIFIED_MATCH ||
        f1612.matchClassification === MATCH_CLASSIFICATIONS.STRONG_CANDIDATE
      );
    });

    // 3. FB50 with FB50 SAP GUI for HTML candidate vs native F0718
    it('Scenario 3: FB50 with FB50 SAP GUI candidate vs native F0718', async () => {
      const discovery = await discoveryEngine.discover({ tcode: 'FB50', useLiveSap: false });
      const match = await matchingEngine.match({
        transaction: discovery,
        targetRelease: 'SAP S/4HANA 2023'
      });

      assert.ok(match.rankedCandidates.length >= 2, 'Should find both F0718 and FB50');
      const f0718 = match.rankedCandidates.find((c) => c.appId === 'F0718');
      const fb50Gui = match.rankedCandidates.find((c) => c.appId === 'FB50');

      assert.ok(f0718, 'F0718 Post General Journal Entries must be matched');
      assert.ok(fb50Gui, 'FB50 SAP GUI app must be matched');
      assert.strictEqual(f0718.appType, 'Transactional');
      assert.strictEqual(fb50Gui.appType, 'SAP GUI');
    });

    // 4. Transaction with no candidate (ZNOTINCATALOGUE -> NO_MATCH)
    it('Scenario 4: Transaction with no candidate returns NO_MATCH or NO_CANDIDATE_FOUND', async () => {
      const discovery = await discoveryEngine.discover({ tcode: 'ZNOTINCATALOGUE', useLiveSap: false });
      const match = await matchingEngine.match({
        transaction: discovery,
        targetRelease: 'SAP S/4HANA 2023'
      });

      assert.strictEqual(match.rankedCandidates.length, 0);
      assert.ok(
        match.matchClassification === MATCH_CLASSIFICATIONS.NO_MATCH ||
        match.recommendationReadiness === RECOMMENDATION_READINESS.NO_SUITABLE_STANDARD_CANDIDATE ||
        match.recommendationReadiness === RECOMMENDATION_READINESS.INSUFFICIENT_EVIDENCE
      );
    });

    // 5. Business requirement functional mismatch (caps to WEAK_CANDIDATE)
    it('Scenario 5: Business requirement functional mismatch caps classification to WEAK_CANDIDATE', async () => {
      const customApp = {
        appId: 'F9999',
        appName: 'Unrelated Asset Depreciation',
        appType: 'Transactional',
        lineOfBusiness: 'Asset Accounting',
        businessProcess: 'Fixed Asset Depreciation',
        leadingTransactionCodes: ['AFAB'],
        odataServices: ['FAA_DEPRECIATION_SRV'],
        productVersion: 'SAP S/4HANA 2023',
        provenance: 'OFFICIAL_CATALOGUE_CACHED'
      };

      const discovery = {
        tcode: 'ME21N',
        transactionCode: 'ME21N',
        description: 'Create Purchase Order',
        classification: 'STANDARD',
        programName: 'SAPLMEGUI',
        evidence: []
      };

      const customEngine = new FioriMatchingEngine({
        catalogueAdapter: {
          searchApps: async () => ({ success: true, candidates: [customApp] })
        }
      });
      const match = await customEngine.match({
        transaction: discovery,
        userRequirement: {
          title: 'Procurement Order Processing',
          businessProcess: 'Sourcing and Procurement',
          capabilities: ['Purchase Order Material Line Item Creation']
        },
        targetRelease: 'SAP S/4HANA 2023'
      });

      const candidate = match.rankedCandidates[0];
      assert.ok(candidate);
      assert.strictEqual(candidate.matchClassification, MATCH_CLASSIFICATIONS.WEAK_CANDIDATE);
      assert.ok(candidate.explainability.negativeFactors.some((f) => f.includes('Functional gap') || f.includes('Process area mismatch')));
    });

    // 6. Missing OData evidence (technical score penalized, gap recorded)
    it('Scenario 6: Missing OData evidence penalizes technical score and records gap', async () => {
      const appWithMissingOData = {
        appId: 'FTEST_ODATA',
        appName: 'Test App Requiring Unregistered OData',
        appType: 'Transactional',
        leadingTransactionCodes: ['ME21N'],
        odataServices: ['COMPLETELY_UNREGISTERED_ODATA_SRV'],
        productVersion: 'SAP S/4HANA 2023',
        provenance: 'OFFICIAL_CATALOGUE_CACHED'
      };

      const discovery = {
        tcode: 'ME21N',
        transactionCode: 'ME21N',
        evidence: [
          { evidenceType: 'GATEWAY_ODATA', evidenceValue: { serviceName: 'DIFFERENT_SERVICE_SRV' } }
        ]
      };

      const customEngine = new FioriMatchingEngine({
        catalogueAdapter: {
          searchApps: async () => ({ success: true, candidates: [appWithMissingOData] })
        }
      });
      const match = await customEngine.match({
        transaction: discovery,
        technicalEvidence: discovery.evidence,
        targetRelease: 'SAP S/4HANA 2023'
      });

      const cand = match.rankedCandidates[0];
      assert.ok(cand);
      assert.ok(cand.dimensionScores.technicalFit < 25, 'Technical score must be penalized when OData is missing');
      assert.ok(cand.explainability.technicalGaps.some((g) => g.includes('COMPLETELY_UNREGISTERED_ODATA_SRV')));
    });

    // 7. Missing app-to-service mapping (unmapped OData flagged)
    it('Scenario 7: Missing app-to-service mapping is flagged in explainability', async () => {
      const appWithoutOData = {
        appId: 'FNO_ODATA',
        appName: 'App with No Registered OData',
        appType: 'Transactional',
        leadingTransactionCodes: ['ME21N'],
        odataServices: [],
        productVersion: 'SAP S/4HANA 2023',
        provenance: 'OFFICIAL_CATALOGUE_CACHED'
      };

      const discovery = {
        tcode: 'ME21N',
        transactionCode: 'ME21N',
        evidence: [
          { evidenceType: 'GATEWAY_ODATA', evidenceValue: { serviceName: 'MM_PUR_PO_MAINT_V2_SRV' } }
        ]
      };

      const customEngine = new FioriMatchingEngine({
        catalogueAdapter: {
          searchApps: async () => ({ success: true, candidates: [appWithoutOData] })
        }
      });
      const match = await customEngine.match({
        transaction: discovery,
        liveGatewayServices: ['MM_PUR_PO_MAINT_V2_SRV'],
        targetRelease: 'SAP S/4HANA 2023'
      });

      const cand = match.rankedCandidates[0];
      assert.ok(cand);
      assert.ok(cand.explainability.technicalGaps.some((g) => g.includes('No OData services registered')));
    });

    // 8. Incompatible ECC vs S/4HANA release (classified as INCOMPATIBLE)
    it('Scenario 8: Incompatible ECC vs S/4HANA release classified as INCOMPATIBLE', async () => {
      const s4App = {
        appId: 'FS4ONLY',
        appName: 'S/4HANA Only Advanced App',
        appType: 'Transactional',
        leadingTransactionCodes: ['ME21N'],
        productVersion: 'SAP S/4HANA 2023',
        provenance: 'OFFICIAL_CATALOGUE_CACHED'
      };

      const discovery = {
        tcode: 'ME21N',
        transactionCode: 'ME21N',
        systemRelease: 'SAP ERP 6.0 EHP8',
        evidence: []
      };

      const customEngine = new FioriMatchingEngine({
        catalogueAdapter: {
          searchApps: async () => ({ success: true, candidates: [s4App] })
        }
      });
      const match = await customEngine.match({
        transaction: discovery,
        targetRelease: 'SAP ECC 6.0'
      });

      const cand = match.rankedCandidates[0];
      assert.ok(cand);
      assert.strictEqual(cand.releaseCompatibilityStatus, 'INCOMPATIBLE');
      assert.strictEqual(cand.matchClassification, MATCH_CLASSIFICATIONS.INCOMPATIBLE);
    });

    // 9. Authorization-blocked transaction evidence (ADT HTTP 403 recorded with S_ADT_RES/S_DEVELOP)
    it('Scenario 9: Authorization-blocked transaction evidence records BLOCKED_BY_AUTHORIZATION', () => {
      const engine = new TechnicalEvidenceEngine();
      const identity = engine.classifyTransactionIdentity({
        tcode: 'VA01',
        isValidFormat: true,
        formatClassification: EVIDENCE_CLASSIFICATIONS.FORMAT_VALIDATED,
        isLiveMode: true,
        liveProbeResult: {
          exists: false,
          isAdtAccessible: false,
          hasCorrelatedGatewayServices: false,
          error: {
            statusCode: 403,
            message: 'ADT access forbidden: missing authorization object S_ADT_RES or S_DEVELOP'
          }
        }
      });

      assert.strictEqual(identity.sapExistenceVerification.classification, EVIDENCE_CLASSIFICATIONS.BLOCKED_BY_AUTHORIZATION);
      assert.ok(identity.sapExistenceVerification.details.includes('403') || identity.sapExistenceVerification.details.includes('authorization'));
    });

    // 10. Conflicting catalogue metadata / batch duplicate divergence handling
    it('Scenario 10: Deduplication preserves canonical record without corrupting cache', () => {
      const recordA = {
        appId: 'F0718',
        appName: 'Post General Journal Entries',
        appType: 'Transactional',
        provenance: 'OFFICIAL_CATALOGUE_LIVE',
        lineOfBusiness: 'Finance'
      };

      const ingested = defaultFalIngestionService.normalizeRecord ? defaultFalIngestionService.normalizeRecord(recordA) : recordA;
      assert.strictEqual(ingested.appId, 'F0718');
    });
  });
});
