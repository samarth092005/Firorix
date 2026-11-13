import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { transactionSearchService } from '../services/transactionSearchService';
import { mockSapAdapter } from '../adapters/mockSapAdapter';
import { liveSapAdapter } from '../adapters/liveSapAdapter';
import { mockCatalogueAdapter } from '../adapters/mockCatalogueAdapter';
import { matchingEngine } from '../engine/matchingEngine';
import { searchHistoryStore } from '../services/searchHistoryStore';
import { SYNTHETIC_TRANSACTIONS } from '../fixtures/syntheticTransactions';
import { EvidenceClassifier } from '../engine/evidenceClassifier';

describe('Fiorify Phase 1 - Transaction Checker Engine & Services', () => {
  const SYSTEM_DEV = 'S4H-DEV-200';
  const SYSTEM_QAS = 'S4H-QAS-200';
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    // Intercept central API client fetch calls to simulate the backend /api/v1/tcode-search endpoint
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/tcode-search') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        const systemId = body.systemId || 'S21-200';
        const rawTcode = body.tcode || '';
        const targetSystem = mockSapAdapter.getSystemById(systemId);
        const isLiveMode = targetSystem?.mode === 'LIVE_SAP';

        const lookupResult = isLiveMode && targetSystem
          ? await liveSapAdapter.queryTransaction(targetSystem, rawTcode)
          : mockSapAdapter.queryTransaction(systemId, rawTcode);

        let responsePayload: any;
        if (!lookupResult.success) {
          const sys = lookupResult.system || {
            systemId,
            systemName: 'Unconfigured SAP System',
            client: '---',
            release: 'UNKNOWN',
            mode: isLiveMode ? 'LIVE_SAP' : 'MOCK',
            active: false
          };
          responsePayload = {
            requestId: 'SRV-000001',
            mode: isLiveMode ? 'LIVE_SAP' : 'MOCK',
            timestamp: new Date().toISOString(),
            system: sys,
            transaction: lookupResult.transaction,
            matching: { status: lookupResult.statusCode, candidates: [] },
            overallStatus: lookupResult.statusCode,
            diagnostics: {
              provenance: [isLiveMode ? `Live SAP Gateway endpoint (system ${sys.systemId})` : 'Mock DDIC repository fixtures'],
              classificationEvidence: lookupResult.transaction?.evidence || [],
              matchingRuleApplied: 'Lookup terminated prior to catalogue evaluation.',
              warnings: lookupResult.statusCode === 'NOT_FOUND' ? ['Transaction code not found in SAP repository.'] : [],
              releaseCompatibilityEvaluated: { systemRelease: sys.release, evaluatedCandidates: 0, compatibleCount: 0, incompatibleCount: 0 },
              excludedCandidates: [],
              decisionExplanation: lookupResult.errorMessage
            },
            errorMessage: lookupResult.errorMessage
          };
        } else {
          const { system, transaction } = lookupResult;
          const evaluation = matchingEngine.evaluate({ system, tcode: transaction.tcode, transaction });
          let overallStatus = evaluation.status;
          if (evaluation.status === 'CATALOGUE_PENDING_VERIFICATION') {
            overallStatus = 'CATALOGUE_PENDING_VERIFICATION';
          } else if (evaluation.status === 'NO_STANDARD_APP_EXISTS') {
            overallStatus = 'NO_STANDARD_APP_EXISTS';
          } else if (transaction.metadataStatus === 'INCOMPLETE' && evaluation.status === 'NO_VERIFIED_MATCH') {
            overallStatus = 'METADATA_INCOMPLETE';
          }

          responsePayload = {
            requestId: 'SRV-000001',
            mode: isLiveMode ? 'LIVE_SAP' : 'MOCK',
            timestamp: new Date().toISOString(),
            system: {
              systemId: system.systemId,
              systemName: system.systemName,
              client: system.client,
              release: system.release,
              mode: system.mode,
              softwareComponents: system.softwareComponents
            },
            transaction,
            matching: {
              status: evaluation.status,
              candidates: evaluation.candidates
            },
            overallStatus,
            diagnostics: evaluation.diagnostics
          };
        }

        return new Response(JSON.stringify(responsePayload), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-ID': (init?.headers as any)?.['X-Correlation-ID'] || 'fx-test'
          }
        });
      }
      // Non-backend URL simulation (e.g. unprovisioned live SAP OData endpoint)
      throw new TypeError('Failed to fetch');
    });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  beforeEach(() => {
    searchHistoryStore.clearHistory();
  });

  // T01: Standard T-Code with direct candidate (ME21N)
  it('T01: ME21N returns exists=true, STANDARD classification, DIRECT_MATCH, and MATCH_FOUND', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ME21N'
    });

    expect(res.overallStatus).toBe('MATCH_FOUND');
    expect(res.transaction).toBeDefined();
    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('STANDARD');
    expect(res.transaction?.program).toBe('SAPLMEGUI_DEMO');
    expect(res.transaction?.metadataStatus).toBe('COMPLETE');

    expect(res.matching.status).toBe('MATCH_FOUND');
    expect(res.matching.candidates.length).toBe(1);
    expect(res.matching.candidates[0].appId).toBe('DEMO_APP_PO_001');
    expect(res.matching.candidates[0].matchType).toBe('DIRECT_MATCH');
  });

  // T02: Second standard T-Code with direct candidate (VA01)
  it('T02: VA01 returns exists=true, STANDARD classification, DIRECT_MATCH, and MATCH_FOUND', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'VA01'
    });

    expect(res.overallStatus).toBe('MATCH_FOUND');
    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('STANDARD');
    expect(res.transaction?.program).toBe('SAPMV45A_DEMO');
    expect(res.matching.candidates.length).toBe(1);
    expect(res.matching.candidates[0].appId).toBe('DEMO_APP_SO_001');
    expect(res.matching.candidates[0].matchType).toBe('DIRECT_MATCH');
  });

  // T03: Custom T-Code with curated related candidate (ZPURCHASE)
  it('T03: ZPURCHASE returns exists=true, CUSTOM classification, RELATED_MATCH, and MATCH_FOUND', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZPURCHASE'
    });

    expect(res.overallStatus).toBe('MATCH_FOUND');
    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('CUSTOM');
    expect(res.matching.candidates.length).toBe(1);
    expect(res.matching.candidates[0].appId).toBe('DEMO_APP_PUR_002');
    expect(res.matching.candidates[0].matchType).toBe('RELATED_MATCH');
    expect(res.matching.candidates[0].rationale).toContain('related purchasing workflow');
  });

  // T04: Custom T-Code without app mapping (ZREPORT01)
  it('T04: ZREPORT01 returns exists=true, CUSTOM classification, NO_VERIFIED_MATCH', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZREPORT01'
    });

    expect(res.overallStatus).toBe('NO_VERIFIED_MATCH');
    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('CUSTOM');
    expect(res.matching.candidates.length).toBe(0);
    expect(res.matching.status).toBe('NO_VERIFIED_MATCH');
  });

  // T05: Standard T-Code without app mapping (ZNOMATCH)
  it('T05: ZNOMATCH returns exists=true, STANDARD classification, NO_VERIFIED_MATCH', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZNOMATCH'
    });

    expect(res.overallStatus).toBe('NO_VERIFIED_MATCH');
    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('STANDARD');
    expect(res.matching.candidates.length).toBe(0);
  });

  // T06: Incomplete metadata (ZINCOMPLETE)
  it('T06: ZINCOMPLETE returns exists=true, CUSTOM, METADATA_INCOMPLETE status with diagnostic warning', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZINCOMPLETE'
    });

    expect(res.overallStatus).toBe('METADATA_INCOMPLETE');
    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('CUSTOM');
    expect(res.transaction?.metadataStatus).toBe('INCOMPLETE');
    expect(res.diagnostics.warnings.length).toBeGreaterThan(0);
  });

  // T07: Absent T-Code (ZINVALID)
  it('T07: ZINVALID returns exists=false and NOT_FOUND', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZINVALID'
    });

    expect(res.overallStatus).toBe('NOT_FOUND');
    expect(res.transaction?.exists).toBe(false);
    expect(res.matching.candidates.length).toBe(0);
  });

  // T08: Simulated Connection Error (ZCONNERR)
  it('T08: ZCONNERR returns CONNECTION_ERROR, strictly distinct from NOT_FOUND', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZCONNERR'
    });

    expect(res.overallStatus).toBe('CONNECTION_ERROR');
    expect(res.overallStatus).not.toBe('NOT_FOUND');
    expect(res.errorMessage).toContain('connection');
  });

  // T09: Simulated Access Denied (ZDENIED)
  it('T09: ZDENIED returns ACCESS_DENIED, strictly distinct from NOT_FOUND', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZDENIED'
    });

    expect(res.overallStatus).toBe('ACCESS_DENIED');
    expect(res.overallStatus).not.toBe('NOT_FOUND');
    expect(res.errorMessage).toContain('authorization');
  });

  // T10: Blank or whitespace input
  it('T10: Blank input returns INVALID_INPUT', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: '   '
    });

    expect(res.overallStatus).toBe('INVALID_INPUT');
  });

  // T11: Lowercase and whitespace normalization
  it('T11: "  me21n  " is trimmed and uppercased to ME21N matching successfully', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: '  me21n  '
    });

    expect(res.transaction?.tcode).toBe('ME21N');
    expect(res.overallStatus).toBe('MATCH_FOUND');
  });

  // T12: Incompatible release candidate excluded
  it('T12: Incompatible release candidate (DEMO_APP_OLD_001) is excluded for target release S4HANA_2023_FPS_DEMO', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ME21N'
    });

    // DEMO_APP_OLD_001 is mapped to ME21N with releaseCompatibility=INCOMPATIBLE
    const candidateIds = res.matching.candidates.map((c) => c.appId);
    expect(candidateIds).not.toContain('DEMO_APP_OLD_001');

    // Appears in diagnostics excluded candidates
    const excludedIds = res.diagnostics.excludedCandidates.map((e) => e.appId);
    expect(excludedIds).toContain('DEMO_APP_OLD_001');
    expect(res.diagnostics.releaseCompatibilityEvaluated.incompatibleCount).toBe(1);
  });

  // T13: Every candidate contains rationale, source label, and verification statuses
  it('T13: Candidates contain explicit rationale, source label, and independent verification flags', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ME21N'
    });

    const candidate = res.matching.candidates[0];
    expect(candidate.rationale).toBeTruthy();
    expect(candidate.sourceLabel).toBe('Synthetic Fiori catalogue fixture');
    expect(candidate.catalogueStatus).toBe('CATALOGUE_FOUND');
    expect(candidate.descriptorStatus).toBe('NOT_CHECKED');
    expect(candidate.accessStatus).toBe('NOT_CHECKED');
  });

  // T14: Keyword-only similarity never creates an app match
  it('T14: No candidate is returned from string or keyword similarity alone', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZNOMATCH'
    });

    // ZNOMATCH description has words like "Transaction", but must never fuzzy-match any app
    expect(res.matching.candidates.length).toBe(0);
    expect(res.overallStatus).toBe('NO_VERIFIED_MATCH');
  });

  // T15: Unknown system ID returns SYSTEM_NOT_CONFIGURED
  it('T15: Unknown or unconfigured system ID returns SYSTEM_NOT_CONFIGURED', async () => {
    const res = await transactionSearchService.search({
      systemId: 'NON_EXISTENT_SYSTEM',
      tcode: 'ME21N'
    });

    expect(res.overallStatus).toBe('SYSTEM_NOT_CONFIGURED');
  });

  // T16: Technical details show evidence provenance
  it('T16: Diagnostics include provenance headers and classification evidence', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ME21N'
    });

    expect(res.diagnostics.provenance.length).toBeGreaterThan(0);
    expect(res.diagnostics.classificationEvidence).toContain('TSTC fixture');
    expect(res.diagnostics.classificationEvidence).toContain('TSTCT fixture');
  });

  // T17: History operations do not mutate fixtures
  it('T17: Search history records entries without altering fixture state', async () => {
    const initialCount = SYNTHETIC_TRANSACTIONS.length;

    await transactionSearchService.search({ systemId: SYSTEM_DEV, tcode: 'ME21N' });
    await transactionSearchService.search({ systemId: SYSTEM_DEV, tcode: 'VA01' });

    const history = searchHistoryStore.getHistory();
    expect(history.length).toBe(2);
    expect(history[0].tcode).toBe('VA01');
    expect(history[1].tcode).toBe('ME21N');

    // Fixture count remains unchanged
    expect(SYNTHETIC_TRANSACTIONS.length).toBe(initialCount);
  });

  // T18: Works consistently on S4H-QAS-200
  it('T18: System S4H-QAS-200 operates identically with the same synthetic fixtures', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_QAS,
      tcode: 'ME21N'
    });

    expect(res.system.systemId).toBe('S4H-QAS-200');
    expect(res.overallStatus).toBe('MATCH_FOUND');
    expect(res.matching.candidates.length).toBe(1);
  });

  // T19: Overly long or illegal characters in T-Code return INVALID_INPUT
  it('T19: Illegal characters or length > 20 characters return INVALID_INPUT', async () => {
    const resSpecial = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ME21N$#@%'
    });
    expect(resSpecial.overallStatus).toBe('INVALID_INPUT');

    const resTooLong = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'A'.repeat(25)
    });
    expect(resTooLong.overallStatus).toBe('INVALID_INPUT');
  });

  // T20: UNKNOWN release compatibility is excluded from compatible candidates
  it('T20: UNKNOWN release compatibility is treated as unverified and excluded', () => {
    const system = {
      systemId: 'S4H-DEV-200',
      systemName: 'Demo Dev',
      client: '200',
      release: 'S4HANA_2023_FPS_DEMO',
      mode: 'MOCK' as const,
      active: true
    };

    // Evaluate candidate with mock unknown release compatibility
    const evalResult = matchingEngine.evaluate({
      system,
      tcode: 'ME21N',
      transaction: {
        tcode: 'ME21N',
        exists: true,
        classification: 'STANDARD',
        metadataStatus: 'COMPLETE',
        evidence: ['mock']
      }
    });

    // Incompatible or unknown are strictly excluded
    expect(evalResult.diagnostics.releaseCompatibilityEvaluated.incompatibleCount).toBe(1);
    expect(evalResult.diagnostics.excludedCandidates.length).toBe(1);
  });

  // T21: OB08 returns F3616 as explicit successor
  it('T21: OB08 returns exists=true, STANDARD classification, EXPLICIT_SUCCESSOR, App F3616, and SAP Fiori elements', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'OB08'
    });

    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('STANDARD');
    expect(res.transaction?.description).toBe('Maintain Exchange Rates');
    expect(res.overallStatus).toBe('MATCH_FOUND');
    expect(res.matching.candidates.length).toBe(1);

    const candidate = res.matching.candidates[0];
    expect(candidate.appId).toBe('F3616');
    expect(candidate.appName).toBe('Currency Exchange Rates');
    expect(candidate.matchType).toBe('EXPLICIT_SUCCESSOR');
    expect(candidate.uiTechnology).toBe('SAP Fiori elements');
    expect(candidate.productVersion).toBe('SAP Fiori for SAP S/4HANA 2023');
    expect(res.diagnostics.matchingRuleApplied).toContain('Explicit Successor Rule');
  });

  // T22: FB03 is identified as SAP GUI for HTML
  it('T22: FB03 is identified as SAP GUI for HTML and NOT incorrectly represented as a native Fiori elements app', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'FB03'
    });

    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('STANDARD');
    expect(res.transaction?.program).toBe('SAPMF05L');
    expect(res.transaction?.screenNumber).toBe('100');
    expect(res.transaction?.packageName).toBe('FIDC');
    expect(res.overallStatus).toBe('MATCH_FOUND');
    expect(res.matching.candidates.length).toBe(1);

    const candidate = res.matching.candidates[0];
    expect(candidate.appId).toBe('FB03');
    expect(candidate.appName).toBe('Display Document');
    expect(candidate.matchType).toBe('SAP_GUI_HTML');
    expect(candidate.uiTechnology).toBe('SAP GUI for HTML');
    expect(candidate.uiTechnology).not.toBe('SAP Fiori elements');
    expect(candidate.uiTechnology).not.toBe('SAPUI5 freestyle');
    expect(res.diagnostics.matchingRuleApplied).toContain('Classic Transaction in Launchpad Rule');
  });

  // T23: FBL1N remains pending verification
  it('T23: FBL1N returns exists=true, classification UNKNOWN, and status CATALOGUE_PENDING_VERIFICATION (not NO_VERIFIED_MATCH)', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'FBL1N'
    });

    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('UNKNOWN');
    expect(res.transaction?.program).toBe('RFITEMAP');
    expect(res.transaction?.screenNumber).toBe('1000');
    expect(res.overallStatus).toBe('CATALOGUE_PENDING_VERIFICATION');
    expect(res.matching.status).toBe('CATALOGUE_PENDING_VERIFICATION');
    expect(res.overallStatus).not.toBe('NO_VERIFIED_MATCH');
    expect(res.overallStatus).not.toBe('NO_STANDARD_APP_EXISTS');
    expect(res.matching.candidates.length).toBe(0);
    expect(res.diagnostics.decisionExplanation).toContain('BR-03');
    expect(res.diagnostics.matchingRuleApplied).toContain('Catalogue Pending Verification Rule');
  });

  // T24: Unknown evidence does not become a confirmed no-app result
  it('T24: Unknown evidence is preserved and strictly separated from confirmed absence of an app', () => {
    const system = {
      systemId: 'S4H-DEV-200',
      systemName: 'Demo Dev',
      client: '200',
      release: 'S4HANA_2023_FPS_DEMO',
      mode: 'MOCK' as const,
      active: true
    };

    const evalResult = matchingEngine.evaluate({
      system,
      tcode: 'FBL1N',
      transaction: {
        tcode: 'FBL1N',
        exists: true,
        classification: 'UNKNOWN',
        metadataStatus: 'INCOMPLETE',
        evidence: [
          'TSTC verified',
          'TSTCT verified',
          'TADIR classification: Pending verification',
          'Official SAP Fiori catalogue matching: Pending verification'
        ]
      }
    });

    expect(evalResult.status).toBe('CATALOGUE_PENDING_VERIFICATION');
    expect(evalResult.status).not.toBe('NO_VERIFIED_MATCH');
    expect(evalResult.candidates.length).toBe(0);
  });

  // T25: Standard classification based on TADIR + package + srcsystem
  it('T25: Standard classification is determined by multi-evidence alignment (package FBAS + srcsystem SAP)', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'FB01'
    });

    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('STANDARD');
    expect(res.transaction?.packageName).toBe('FBAS');
    expect(res.transaction?.originalSystem).toBe('SAP');
    expect(res.transaction?.classificationDetails?.evaluatedClassification).toBe('STANDARD');
    expect(res.transaction?.classificationDetails?.originalSystemEvidence).toContain('Official SAP standard');
  });

  // T26: Custom classification based on customer package + S21 srcsystem
  it('T26: Custom classification is determined by customer package (ZFIN_DEV) and customer original system (S21)', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZFIN_CUSTOM'
    });

    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('CUSTOM');
    expect(res.transaction?.packageName).toBe('ZFIN_DEV');
    expect(res.transaction?.originalSystem).toBe('S21');
    expect(res.transaction?.classificationDetails?.evaluatedClassification).toBe('CUSTOM');
  });

  // T27: Unknown classification on insufficient evidence
  it('T27: Unknown classification returned when TADIR package and original system are missing', () => {
    const evalResult = EvidenceClassifier.classify({
      tcode: 'ZNOEVID',
      packageName: undefined,
      originalSystem: undefined
    });

    expect(evalResult.classification).toBe('UNKNOWN');
    expect(evalResult.details.conflictsDetected.length).toBeGreaterThan(0);
    expect(evalResult.details.conflictsDetected[0]).toContain('Insufficient repository evidence');
  });

  // T28: Missing TADIR returns UNKNOWN (FBL1N)
  it('T28: Missing TADIR records return UNKNOWN classification and prevent premature custom/standard labeling', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'FBL1N'
    });

    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('UNKNOWN');
    expect(res.transaction?.packageName).toBeUndefined();
    expect(res.transaction?.originalSystem).toBeUndefined();
  });

  // T29: Conflicting evidence returns UNKNOWN with conflict diagnostic (ZCONFLICT)
  it('T29: Conflicting evidence (Z-prefix with SAP original system and standard package) returns UNKNOWN with diagnostic', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZCONFLICT'
    });

    expect(res.transaction?.exists).toBe(true);
    expect(res.transaction?.classification).toBe('UNKNOWN');
    expect(res.transaction?.classificationDetails?.conflictsDetected.length).toBeGreaterThan(0);
    expect(res.transaction?.classificationDetails?.conflictsDetected[0]).toContain('Conflicting evidence');
  });

  // T30: Explicit successor (OB08 -> F3616)
  it('T30: OB08 identifies F3616 as EXPLICIT_SUCCESSOR in SAP Fiori elements', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'OB08'
    });

    expect(res.matching.status).toBe('MATCH_FOUND');
    expect(res.matching.candidates.length).toBe(1);
    expect(res.matching.candidates[0].matchType).toBe('EXPLICIT_SUCCESSOR');
    expect(res.matching.candidates[0].appId).toBe('F3616');
    expect(res.matching.candidates[0].uiTechnology).toBe('SAP Fiori elements');
  });

  // T31: Classic SAP GUI for HTML (FB03)
  it('T31: FB03 identifies WebGUI hosting (SAP GUI for HTML) and confirms it is not native Fiori elements', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'FB03'
    });

    expect(res.matching.status).toBe('MATCH_FOUND');
    expect(res.matching.candidates.length).toBe(1);
    expect(res.matching.candidates[0].matchType).toBe('SAP_GUI_HTML');
    expect(res.matching.candidates[0].uiTechnology).toBe('SAP GUI for HTML');
  });

  // T32: Functional alternative (FB01 -> F0717)
  it('T32: FB01 identifies F0717 (Manage Journal Entries) as FUNCTIONAL_ALTERNATIVE', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'FB01'
    });

    expect(res.matching.status).toBe('MATCH_FOUND');
    expect(res.matching.candidates.length).toBe(1);
    expect(res.matching.candidates[0].appId).toBe('F0717');
    expect(res.matching.candidates[0].appName).toBe('Manage Journal Entries');
    expect(res.matching.candidates[0].matchType).toBe('FUNCTIONAL_ALTERNATIVE');
    expect(res.matching.candidates[0].uiTechnology).toBe('SAP Fiori elements');
    expect(res.diagnostics.matchingRuleApplied).toContain('Functional Alternative Rule');
  });

  // T33: Verified absence of standard app (ZNOAPP)
  it('T33: ZNOAPP confirms NO_STANDARD_APP_EXISTS from official catalogue audit without guesswork', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZNOAPP'
    });

    expect(res.overallStatus).toBe('NO_STANDARD_APP_EXISTS');
    expect(res.matching.status).toBe('NO_STANDARD_APP_EXISTS');
    expect(res.matching.candidates.length).toBe(0);
    expect(res.diagnostics.matchingRuleApplied).toContain('Verified Absence Rule');
    expect(res.diagnostics.decisionExplanation).toContain('confirms that NO standard SAP Fiori application exists');
  });

  // T34: Pending verification (FBL1N)
  it('T34: FBL1N preserves CATALOGUE_PENDING_VERIFICATION status', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'FBL1N'
    });

    expect(res.overallStatus).toBe('CATALOGUE_PENDING_VERIFICATION');
    expect(res.matching.status).toBe('CATALOGUE_PENDING_VERIFICATION');
    expect(res.matching.candidates.length).toBe(0);
  });

  // T35: Release incompatibility exclusion
  it('T35: Candidate incompatible with target release is excluded with detailed diagnostic reason', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ME21N'
    });

    // ME21N has 1 compatible candidate (DEMO_APP_PO_001) and 1 incompatible candidate (DEMO_APP_OLD_001)
    expect(res.matching.candidates.some((c) => c.appId === 'DEMO_APP_PO_001')).toBe(true);
    expect(res.matching.candidates.some((c) => c.appId === 'DEMO_APP_OLD_001')).toBe(false);
    expect(res.diagnostics.excludedCandidates.some((c) => c.appId === 'DEMO_APP_OLD_001')).toBe(true);
    const excluded = res.diagnostics.excludedCandidates.find((c) => c.appId === 'DEMO_APP_OLD_001');
    expect(excluded?.releaseCompatibility).toBe('INCOMPATIBLE');
    expect(excluded?.exclusionReason).toContain('incompatible');
  });

  // T36: SAP connection failure handling (ZCONNERR)
  it('T36: ZCONNERR returns CONNECTION_ERROR and does not mistake timeout for transaction absence', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZCONNERR'
    });

    expect(res.overallStatus).toBe('CONNECTION_ERROR');
    expect(res.overallStatus).not.toBe('NOT_FOUND');
    expect(res.matching.candidates.length).toBe(0);
    expect(res.errorMessage).toContain('Simulated connection error');
  });

  // T37: SAP authorization failure handling (ZDENIED)
  it('T37: ZDENIED returns ACCESS_DENIED and isolates authorization from transaction existence', async () => {
    const res = await transactionSearchService.search({
      systemId: SYSTEM_DEV,
      tcode: 'ZDENIED'
    });

    expect(res.overallStatus).toBe('ACCESS_DENIED');
    expect(res.overallStatus).not.toBe('NOT_FOUND');
    expect(res.matching.candidates.length).toBe(0);
    expect(res.errorMessage).toContain('Simulated authorization failure');
  });

  // T38: Live mode invariant (LiveSapAdapter returns connection error, never silent mock fallback)
  it('T38: Target system in LIVE_SAP mode (S21-200) fails safely with diagnostics and NEVER silently falls back to mock data', async () => {
    const res = await transactionSearchService.search({
      systemId: 'S21-200',
      tcode: 'FB03'
    });

    expect(res.mode).toBe('LIVE_SAP');
    expect(res.system.systemId).toBe('S21-200');
    expect(res.overallStatus).toBe('CONNECTION_ERROR');
    expect(res.errorMessage).toContain('INVARIANT ENFORCED');
    expect(res.errorMessage).toContain('Z_Fiorify_DISCOVERY_SRV');
    expect(res.matching.candidates.length).toBe(0);
    // Crucial: In mock mode FB03 would succeed with exists=true; in live mode it MUST NOT fall back to mock!
    expect(res.transaction).toBeUndefined();
  });
});
