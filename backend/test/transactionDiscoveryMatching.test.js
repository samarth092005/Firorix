import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../src/server.js';
import { transactionDiscoveryEngine, TransactionDiscoveryEngine } from '../src/engine/transactionDiscoveryEngine.js';
import { technicalEvidenceEngine, TechnicalEvidenceEngine, PROVENANCE_CATEGORIES, CONFIDENCE_LEVELS } from '../src/engine/technicalEvidenceEngine.js';
import { fioriMatchingEngine, FioriMatchingEngine, MATCH_CLASSIFICATIONS, RECOMMENDATION_READINESS } from '../src/engine/fioriMatchingEngine.js';

describe('Fiorify DISC-01 + DISC-02 + MATCH-01 + MATCH-02 Master Suite', () => {
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
  // SECTION 1: DISC-01 SAP Transaction Discovery Engine
  // =========================================================================
  describe('DISC-01 — SAP Transaction Discovery Engine', () => {
    it('normalizes valid T-Codes to uppercase and strips whitespace', () => {
      const engine = new TransactionDiscoveryEngine();
      const norm1 = engine.normalizeInput('  fb50  ');
      assert.strictEqual(norm1.isValid, true);
      assert.strictEqual(norm1.normalizedTcode, 'FB50');

      const norm2 = engine.normalizeInput('/n/ui2/flp');
      assert.strictEqual(norm2.isValid, true);
      assert.strictEqual(norm2.normalizedTcode, '/N/UI2/FLP');
    });

    it('rejects invalid T-Code formats with descriptive validation errors', () => {
      const engine = new TransactionDiscoveryEngine();
      const res1 = engine.normalizeInput('FB 50');
      assert.strictEqual(res1.isValid, false);
      assert.ok(res1.errors.length > 0);

      const res2 = engine.normalizeInput('FB50!@#$');
      assert.strictEqual(res2.isValid, false);

      const res3 = engine.normalizeInput('A'.repeat(25));
      assert.strictEqual(res3.isValid, false);
    });

    it('discovers standard SAP transaction via mock adapter (e.g. FB50)', async () => {
      const engine = new TransactionDiscoveryEngine();
      const result = await engine.discover({ tcode: 'FB50', useLiveSap: false });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.tcode, 'FB50');
      assert.strictEqual(result.transactionDescription, 'Enter G/L Account Document');
      assert.strictEqual(result.programName, 'SAPMF05A');
      assert.strictEqual(result.softwareComponent, 'S4CORE 108');
      assert.strictEqual(result.package, 'FBAS');
      assert.strictEqual(result.authorizationObject, 'F_BKPF_BUK');
      assert.strictEqual(result.provenance, PROVENANCE_CATEGORIES.CURATED_FIXTURE);
      assert.ok(Array.isArray(result.evidence));
      assert.ok(result.evidence.length >= 2);
    });

    it('handles unknown or custom transaction gracefully without inventing fake metadata', async () => {
      const engine = new TransactionDiscoveryEngine();
      const result = await engine.discover({ tcode: 'ZCUSTOM_TEST_99', useLiveSap: false });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.tcode, 'ZCUSTOM_TEST_99');
      assert.strictEqual(result.isCustomOrUnknown, true);
      assert.strictEqual(result.transactionDescription, 'Custom or Unindexed Transaction');
      assert.strictEqual(result.provenance, PROVENANCE_CATEGORIES.UNAVAILABLE);
      assert.ok(result.warnings.some((w) => w.includes('No curated or live dictionary metadata')));
    });

    it('enforces live SAP vs mock SAP mode separation without silent mock fallback', async () => {
      const engine = new TransactionDiscoveryEngine();
      // Probe live SAP on an unconfigured or disconnected host to verify strict live handling
      const result = await engine.discover({
        tcode: 'FB50',
        useLiveSap: true,
        targetSystem: { systemId: 'S21-UNREACHABLE', host: 'http://nonexistent.local', port: 8000 }
      });

      assert.strictEqual(result.mode, 'LIVE_SAP');
      // Must not silently substitute mock data when live SAP fails
      assert.notStrictEqual(result.provenance, PROVENANCE_CATEGORIES.CURATED_FIXTURE);
    });
  });

  // =========================================================================
  // SECTION 2: DISC-02 Technical Evidence Collection Engine
  // =========================================================================
  describe('DISC-02 — Technical Evidence Collection Engine', () => {
    it('normalizes multi-source evidence across all 5 canonical categories', () => {
      const engine = new TechnicalEvidenceEngine();
      const rawEvidence = [
        { category: 'TRANSACTION_REPOSITORY', source: 'TSTC/TSTCT', retrievedValue: 'FB50 - Enter G/L Account Document', verified: true },
        { category: 'ABAP_DEV_METADATA', source: 'SAP ADT /sap/bc/adt/discovery', retrievedValue: 'HTTP 403 Forbidden', status: 'BLOCKED_BY_AUTHORIZATION', verified: false },
        { category: 'GATEWAY_ODATA', source: 'Gateway Catalog', retrievedValue: 'Active Services: [C_JOURNALENTRY_FS_SRV]', verified: true },
        { category: 'FAL_CATALOGUE', source: 'fiori_app_catalog_cache.json', retrievedValue: 'F0705 - Manage Journal Entries', verified: true },
        { category: 'AUTHORIZATION', source: 'SU24 / PFCG', retrievedValue: 'F_BKPF_BUK (Activity 01, 02, 03)', verified: true }
      ];

      const normalized = engine.normalizeEvidence(rawEvidence);
      assert.strictEqual(normalized.length, 5);

      const adtEv = normalized.find((e) => e.category === 'ABAP_DEV_METADATA');
      assert.ok(adtEv);
      assert.strictEqual(adtEv.verificationStatus, 'BLOCKED_BY_AUTHORIZATION');
      assert.strictEqual(adtEv.confidence, CONFIDENCE_LEVELS.UNKNOWN);
      assert.ok(adtEv.limitations.length > 0);
      assert.ok(adtEv.verificationRequirements.some((r) => r.includes('S_ADT_RES') || r.includes('S_DEVELOP')));
    });

    it('identifies missing evidence and computes overall confidence appropriately', () => {
      const engine = new TechnicalEvidenceEngine();
      const partialEvidence = [
        { category: 'TRANSACTION_REPOSITORY', source: 'TSTC', retrievedValue: 'FB50', verified: true, confidence: 'HIGH' }
      ];

      const assessment = engine.assessEvidenceCompleteness(partialEvidence);
      assert.strictEqual(assessment.totalCategories, 5);
      assert.strictEqual(assessment.presentCategories, 1);
      assert.strictEqual(assessment.missingCategories.length, 4);
      assert.strictEqual(assessment.overallConfidence, CONFIDENCE_LEVELS.LOW);
    });

    it('correctly calculates high confidence when multi-source evidence is comprehensive', () => {
      const engine = new TechnicalEvidenceEngine();
      const fullEvidence = [
        { category: 'TRANSACTION_REPOSITORY', source: 'TSTC', retrievedValue: 'FB50', verified: true, confidence: 'HIGH' },
        { category: 'ABAP_DEV_METADATA', source: 'ADT', retrievedValue: 'Package FBAS', verified: true, confidence: 'HIGH' },
        { category: 'GATEWAY_ODATA', source: 'Gateway', retrievedValue: 'C_JOURNALENTRY_FS_SRV', verified: true, confidence: 'HIGH' },
        { category: 'FAL_CATALOGUE', source: 'FAL', retrievedValue: 'F0705', verified: true, confidence: 'HIGH' },
        { category: 'AUTHORIZATION', source: 'SU24', retrievedValue: 'F_BKPF_BUK', verified: true, confidence: 'HIGH' }
      ];

      const assessment = engine.assessEvidenceCompleteness(fullEvidence);
      assert.strictEqual(assessment.presentCategories, 5);
      assert.strictEqual(assessment.missingCategories.length, 0);
      assert.strictEqual(assessment.overallConfidence, CONFIDENCE_LEVELS.HIGH);
    });
  });

  // =========================================================================
  // SECTION 3: MATCH-01 Standard SAP Fiori Application Matching
  // =========================================================================
  describe('MATCH-01 — Standard SAP Fiori Application Matching', () => {
    it('matches standard Fiori application by exact T-Code in canonical catalogue', async () => {
      const engine = new FioriMatchingEngine();
      const matchResult = await engine.match({
        transaction: {
          transactionCode: 'FB50',
          transactionDescription: 'Enter G/L Account Document',
          programName: 'SAPMF05A',
          package: 'FBAS',
          softwareComponent: 'S4CORE 108'
        },
        liveGatewayServices: ['C_JOURNALENTRY_FS_SRV', 'FAR_CUSTOMER_LINE_ITEMS']
      });

      assert.strictEqual(matchResult.success, true);
      assert.ok(matchResult.rankedCandidates.length > 0);

      const top = matchResult.rankedCandidates[0];
      assert.ok(top.appId.includes('FB50') || top.appId === 'F0705' || top.appId === 'F0705A' || top.appId === 'F0718');
      assert.ok(top.scoreBreakdown.tcodeRelationship >= 25);
      assert.ok(
        top.provenance === PROVENANCE_CATEGORIES.OFFICIAL_CATALOGUE_CACHED ||
        top.provenance === PROVENANCE_CATEGORIES.OFFICIAL_CATALOGUE_LIVE
      );
    });

    it('returns empty candidates and NO_MATCH for transactions with no standard Fiori app', async () => {
      const engine = new FioriMatchingEngine();
      const matchResult = await engine.match({
        transaction: {
          transactionCode: 'Z_TOTALLY_CUSTOM_9999',
          transactionDescription: 'Custom Dynpro Transaction',
          isCustomOrUnknown: true
        }
      });

      assert.strictEqual(matchResult.success, true);
      assert.strictEqual(matchResult.rankedCandidates.length, 0);
      assert.strictEqual(matchResult.bestCandidate, null);
      assert.strictEqual(matchResult.matchClassification, MATCH_CLASSIFICATIONS.NO_MATCH);
      assert.strictEqual(matchResult.recommendationReadiness, RECOMMENDATION_READINESS.NO_SUITABLE_STANDARD_CANDIDATE);
    });

    it('never hallucinates non-existent Fiori App IDs', async () => {
      const engine = new FioriMatchingEngine();
      const matchResult = await engine.match({
        transaction: {
          transactionCode: 'ZZ_NONEXISTENT',
          transactionDescription: 'Non-existent transaction'
        }
      });

      for (const candidate of matchResult.rankedCandidates) {
        assert.match(candidate.appId, /^F\d{4}[A-Z]?$/);
      }
    });
  });

  // =========================================================================
  // SECTION 4: MATCH-02 Match Validation, Ranking & Explainability
  // =========================================================================
  describe('MATCH-02 — Match Validation, Ranking & Explainability', () => {
    it('applies governance guardrail: functional mismatch prevents VERIFIED_MATCH despite high technical score', async () => {
      const engine = new FioriMatchingEngine();
      // Simulate candidate where functional fit is artificially zero or incompatible
      const matchResult = await engine.match({
        transaction: {
          transactionCode: 'FB50',
          transactionDescription: 'Enter G/L Account Document'
        },
        userRequirement: {
          title: 'Warehouse Bin Transfer Scanning',
          businessProcess: 'Extended Warehouse Management',
          capabilities: ['RF Gun Barcode Scan', 'Bin Transfer Execution']
        }
      });

      assert.strictEqual(matchResult.success, true);
      // Even if F0705 matches T-Code, user requirement functional mismatch must cap classification
      for (const candidate of matchResult.rankedCandidates) {
        assert.notStrictEqual(candidate.matchClassification, MATCH_CLASSIFICATIONS.VERIFIED_MATCH);
      }
    });

    it('generates structured explainability with reasons, gaps, conflicts, and verification requirements', async () => {
      const engine = new FioriMatchingEngine();
      const matchResult = await engine.match({
        transaction: {
          transactionCode: 'FB50',
          transactionDescription: 'Enter G/L Account Document'
        },
        liveGatewayServices: ['C_JOURNALENTRY_FS_SRV']
      });

      assert.strictEqual(matchResult.success, true);
      const top = matchResult.bestCandidate;
      assert.ok(top);
      assert.ok(top.explainability);
      assert.ok(Array.isArray(top.explainability.matchingReasons));
      assert.ok(Array.isArray(top.explainability.functionalGaps));
      assert.ok(Array.isArray(top.explainability.technicalGaps));
      assert.ok(Array.isArray(top.explainability.verificationRequirements));
      assert.ok(Array.isArray(top.explainability.assumptions));
    });

    it('generates a normalized candidate comparison matrix for side-by-side evaluation', async () => {
      const engine = new FioriMatchingEngine();
      const matchResult = await engine.match({
        transaction: {
          transactionCode: 'FB50',
          transactionDescription: 'Enter G/L Account Document'
        }
      });

      assert.strictEqual(matchResult.success, true);
      assert.ok(Array.isArray(matchResult.candidateComparison));
      assert.ok(matchResult.candidateComparison.length >= 1);

      const firstRow = matchResult.candidateComparison[0];
      assert.ok(firstRow.appId);
      assert.ok(firstRow.appName);
      assert.ok(typeof firstRow.overallScore === 'number');
      assert.ok(firstRow.matchClassification);
      assert.ok(firstRow.tcodeRelationship);
      assert.ok(typeof firstRow.functionalFitPercent === 'number');
      assert.ok(typeof firstRow.technicalFitPercent === 'number');
    });

    it('formats a valid handoff payload ready for downstream Fit-Gap assessment (FITGAP-01)', async () => {
      const engine = new FioriMatchingEngine();
      const matchResult = await engine.match({
        transaction: {
          transactionCode: 'FB50',
          transactionDescription: 'Enter G/L Account Document'
        },
        targetRelease: 'SAP S/4HANA 2023 Private Edition'
      });

      assert.strictEqual(matchResult.success, true);
      assert.ok(matchResult.assessmentHandoff);

      const { requirement, candidate, context } = matchResult.assessmentHandoff;
      assert.ok(requirement && typeof requirement === 'object');
      assert.strictEqual(requirement.tcode, 'FB50');
      assert.ok(candidate && typeof candidate === 'object');
      assert.ok(candidate.appId);
      assert.ok(context && typeof context === 'object');
      assert.strictEqual(context.systemRelease, 'SAP S/4HANA 2023 Private Edition');
    });
  });

  // =========================================================================
  // SECTION 5: Backend REST API Endpoints
  // =========================================================================
  describe('Backend REST APIs (DISC-01 + DISC-02 + MATCH-01 + MATCH-02)', () => {
    it('POST /api/v1/discovery/transaction returns canonical discovery record with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/discovery/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tcode: 'fb50', useLiveSap: false })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.tcode, 'FB50');
      assert.strictEqual(data.programName, 'SAPMF05A');
      assert.ok(Array.isArray(data.evidence));
    });

    it('POST /api/v1/discovery/transaction rejects invalid T-Code format with HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/discovery/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tcode: 'INVALID!@#$' })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.strictEqual(data.statusCode, 'INVALID_TCODE_FORMAT');
    });

    it('POST /api/v1/matching/fiori-apps returns ranked candidates and explainability with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/matching/fiori-apps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tcode: 'FB50',
          technicalEvidence: [
            { category: 'TRANSACTION_REPOSITORY', source: 'TSTC', retrievedValue: 'FB50' }
          ]
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.rankedCandidates));
      assert.ok(data.candidateComparison);
      assert.ok(data.recommendationReadiness);
    });

    it('POST /api/v1/discovery/match executes unified end-to-end pipeline with HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/api/v1/discovery/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tcode: 'FB50' })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.tcode, 'FB50');
      assert.ok(data.discovery);
      assert.ok(data.matching);
      assert.ok(data.recommendationReadiness);
      assert.ok(data.assessmentHandoff);
      assert.ok(Array.isArray(data.candidateComparison));
      assert.ok(Array.isArray(data.candidates));
    });
  });
});
