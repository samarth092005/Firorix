import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FioriMatchingEngine, MATCH_CLASSIFICATIONS } from '../src/engine/fioriMatchingEngine.js';
import { RecommendationEngine, RECOMMENDATION_OUTCOMES, GOVERNANCE_OVERRIDES } from '../src/engine/recommendationEngine.js';
import { fitGapAssessmentEngine, ASSESSMENT_STATUSES, DIMENSION_STATUSES } from '../src/engine/fitGapAssessmentEngine.js';

describe('Workstream D3 — Matching Engine and Fit-Gap Finalization Tests', () => {
  const matchingEngine = new FioriMatchingEngine();
  const recEngine = new RecommendationEngine();

  describe('D3.1: Candidate Matching and Ranking Sequence', () => {
    it('ranks native Fiori Elements app higher than WebGUI bridge for F-53', async () => {
      const candidates = [
        {
          appId: 'F-53',
          appName: 'Post Outgoing Payments (WebGUI)',
          appType: 'SAP GUI',
          uiTechnology: 'SAP GUI for HTML',
          productVersion: 'SAP S/4HANA 2023',
          odataServices: []
        },
        {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori elements',
          productVersion: 'SAP S/4HANA 2023',
          odataServices: ['FAP_PAYMENT_POST_SRV']
        }
      ];

      const matchRes = await matchingEngine.match({
        transaction: { tcode: 'F-53', description: 'Post Outgoing Payments' },
        candidatePool: candidates,
        liveGatewayServices: [{ technicalServiceName: 'FAP_PAYMENT_POST_SRV' }]
      });

      assert.strictEqual(matchRes.success, true);
      assert.ok(matchRes.rankedCandidates.length >= 2);
      // F1612 should be bestCandidate because it is the native Fiori Elements successor
      assert.strictEqual(matchRes.bestCandidate.appId, 'F1612');
      assert.strictEqual(matchRes.bestCandidate.isWebGui, false);

      const webguiCand = matchRes.rankedCandidates.find((c) => c.appId === 'F-53');
      assert.strictEqual(webguiCand.isWebGui, true);
      assert.strictEqual(webguiCand.mappingClassification, 'WEBGUI_BRIDGE');
    });

    it('matches ME21N to F0842A (Manage Purchase Orders) with high confidence', async () => {
      const candidates = [
        {
          appId: 'F0842A',
          appName: 'Manage Purchase Orders',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori elements',
          productVersion: 'SAP S/4HANA 2023',
          odataServices: ['MM_PUR_PO_MAINT_V2_SRV']
        }
      ];

      const matchRes = await matchingEngine.match({
        transaction: { tcode: 'ME21N', description: 'Create Purchase Order' },
        candidatePool: candidates,
        liveGatewayServices: [{ technicalServiceName: 'MM_PUR_PO_MAINT_V2_SRV' }]
      });

      assert.strictEqual(matchRes.success, true);
      assert.strictEqual(matchRes.bestCandidate.appId, 'F0842A');
      assert.ok(matchRes.bestCandidate.overallScore >= 80);
      assert.strictEqual(matchRes.bestCandidate.tcodeRelationshipType, 'OFFICIAL_SUCCESSOR');
    });
  });

  describe('D3.2: Fit-Gap Gating & Preconditions for BUILD', () => {
    it('recommends ADOPT when verified standard app matches with >= 80% score and no critical gaps', () => {
      const assessment = {
        overallStatus: ASSESSMENT_STATUSES.VERIFIED_FIT,
        overallScore: 92,
        requirementTitle: 'Create and Manage Purchase Orders',
        candidateAppId: 'F0842A',
        candidateAppName: 'Manage Purchase Orders',
        identifiedGaps: [],
        missingEvidence: [],
        conflictingEvidence: [],
        dimensionResults: {
          functionalFit: { status: DIMENSION_STATUSES.FIT },
          technicalFit: { status: DIMENSION_STATUSES.FIT }
        }
      };

      const rec = recEngine.generate({
        assessment,
        candidate: { appId: 'F0842A', appType: 'Transactional', uiTechnology: 'SAP Fiori elements' }
      });

      assert.strictEqual(rec.outcome, RECOMMENDATION_OUTCOMES.ADOPT);
    });

    it('recommends CONFIGURE when standard app requires role/catalog enablement only', () => {
      const assessment = {
        overallStatus: ASSESSMENT_STATUSES.PARTIAL_FIT,
        overallScore: 78,
        requirementTitle: 'Post Outgoing Payments',
        candidateAppId: 'F1612',
        candidateAppName: 'Post Outgoing Payments',
        identifiedGaps: [
          { category: 'AUTHORIZATION', severity: 'MEDIUM', description: 'Business role not currently assigned' }
        ],
        missingEvidence: [],
        dimensionResults: {
          functionalFit: { status: DIMENSION_STATUSES.FIT },
          technicalFit: { status: DIMENSION_STATUSES.CONFIG_REQUIRED }
        }
      };

      const rec = recEngine.generate({
        assessment,
        candidate: { appId: 'F1612', appType: 'Transactional', uiTechnology: 'SAP Fiori elements' }
      });

      assert.strictEqual(rec.outcome, RECOMMENDATION_OUTCOMES.CONFIGURE);
    });

    it('recommends EXTEND when standard app covers core flow but requires key-user/developer extensibility', () => {
      const assessment = {
        overallStatus: ASSESSMENT_STATUSES.PARTIAL_FIT,
        overallScore: 62,
        requirementTitle: 'Custom Sales Order Workflow',
        candidateAppId: 'F1873',
        candidateAppName: 'Manage Sales Orders',
        identifiedGaps: [
          { category: 'CUSTOM_VARIANT', severity: 'MEDIUM', description: 'Requires custom BAdI business logic added' }
        ],
        missingEvidence: [],
        dimensionResults: {
          functionalFit: { status: DIMENSION_STATUSES.EXTENSION_REQUIRED },
          technicalFit: { status: DIMENSION_STATUSES.FIT }
        }
      };

      const rec = recEngine.generate({
        assessment,
        candidate: { appId: 'F1873', appType: 'Transactional', uiTechnology: 'SAP Fiori elements' }
      });

      assert.strictEqual(rec.outcome, RECOMMENDATION_OUTCOMES.EXTEND);
    });

    it('strictly prevents premature BUILD when evidence is missing or preconditions fail', () => {
      // Simulating a scenario where someone attempts BUILD on incomplete evidence
      const incompleteAssessment = {
        overallStatus: ASSESSMENT_STATUSES.NO_FIT,
        overallScore: 20,
        requirementTitle: 'Specialized Custom Order Processing',
        candidateAppId: 'UNKNOWN_APP',
        missingEvidence: ['OData service schema not retrieved', 'Live Gateway service unverified'],
        identifiedGaps: [],
        dimensionResults: {}
      };

      const rec = recEngine.generate({
        assessment: incompleteAssessment,
        candidate: { appId: 'UNKNOWN_APP' }
      });

      // Must NOT be BUILD! Must apply MISSING_EVIDENCE_PREVENTS_BUILD override
      assert.notStrictEqual(rec.outcome, RECOMMENDATION_OUTCOMES.BUILD);
      assert.ok(rec.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.MISSING_EVIDENCE_PREVENTS_BUILD));
    });

    it('recommends BUILD only when all 9 preconditions and confirmed material functional gaps are fulfilled', () => {
      const verifiedBuildAssessment = {
        overallStatus: ASSESSMENT_STATUSES.NO_FIT,
        overallScore: 35,
        requirementTitle: 'Highly specialized shop-floor tablet MES integration',
        requirementStatement: 'Must interface direct PLC hardware via custom WebSocket RAP service',
        candidateAppId: 'F0842A',
        candidateAppName: 'Manage Purchase Orders',
        confidence: 'HIGH',
        identifiedGaps: [
          { category: 'FUNCTIONAL_GAP', severity: 'CRITICAL', description: 'Requires custom PLC hardware direct interface' }
        ],
        missingEvidence: [],
        conflictingEvidence: [],
        dimensionResults: {
          functionalFit: {
            status: DIMENSION_STATUSES.NO_FIT,
            missingCapabilities: ['Direct PLC socket communication', 'Sub-second real-time telemetry display']
          },
          technicalFit: {
            status: DIMENSION_STATUSES.NO_FIT
          }
        }
      };

      const rec = recEngine.generate({
        assessment: verifiedBuildAssessment,
        requirement: {
          title: 'MES Shop Floor Terminal',
          statement: 'Direct PLC hardware interface for automated production line',
          tcode: 'ZMES_PLC'
        },
        candidate: {
          appId: 'F0842A',
          appName: 'Manage Purchase Orders',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori elements',
          productVersion: 'SAP S/4HANA 2023',
          supportedCapabilities: ['Standard Purchase Order Management']
        }
      });

      assert.strictEqual(rec.outcome, RECOMMENDATION_OUTCOMES.BUILD);
      assert.ok(rec.remediationPlan.some((step) => (step.title || '').includes('RAP') || (step.title || '').includes('Custom Build')));
    });
  });
});
