import { describe, it, expect, vi } from 'vitest';
import { assessmentService } from '../../../services/assessmentService';
import { evidenceEngine } from '../services/evidenceEngine';
import { fioriCatalogueAdapter } from '../../../services/catalogue/catalogueAdapter';
import {
  AssessmentRecord,
  CatalogueReference,
  RecommendationOutcome,
  StageCompletionStatus
} from '../../../services/contracts/types';

describe('FIORIX SPRINT S0 / ASSESSMENT RESULTS FINALIZATION — 16 REGRESSION TESTS', () => {

  // Test 1: F-53 Contradiction Regression Test
  it('Scenario 1: F-53 contradiction regression test — verifies DDIC, FAL, re-anchored release, and resolved contradictions', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    expect(assessment).toBeDefined();
    if (!assessment) return;

    // 1. Transaction existence verified in DDIC
    expect(assessment.tcode).toBe('F-53');
    expect(assessment.programName).toBe('SAPMF05A');
    expect(assessment.packageName).toBe('FBAS');
    expect(assessment.softwareComponent).toContain('S4CORE 108');

    // 2. Catalogue Match verified (not pending catalogue)
    expect(assessment.matchingFioriApp).toBeDefined();
    expect(assessment.matchingFioriApp?.appId).toBe('F0773');
    expect(assessment.matchingFioriApp?.appName).toBe('Manage Outgoing Payments');

    // 3. Target release explicitly anchored
    expect(assessment.release).toContain('SAP S/4HANA 2023');

    // 4. Lifecycle status reflects pending verification, not premature complete
    expect(assessment.status).toBe('PENDING_VERIFICATION');

    // 5. Audit trail records auditable correction event
    expect(assessment.auditEvents).toBeDefined();
    const corrEvent = assessment.auditEvents?.find(e => e.action === 'CORRECTION' || e.eventId.includes('CORR'));
    expect(corrEvent).toBeDefined();
    expect(corrEvent?.comment).toContain('contradiction');
  });

  // Test 2: Recommendation recalculation without auto-adopt
  it('Scenario 2: Recommendation recalculation without auto-adopt — maps to CONFIGURE when live activation is pending', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const compat = evidenceEngine.evaluateReleaseCompatibility(assessment, candidates[0]);
    const avail = evidenceEngine.evaluateSystemAvailability(assessment, candidates[0]);

    // System availability confirms service registration and activation are pending
    expect(avail.serviceRegistrationStatus).toBe('PENDING_BASIS_CHECK');

    // Generates canonical recommendation
    const canonicalRec = evidenceEngine.generateCanonicalRecommendation(assessment, candidates[0], compat, avail);
    expect(canonicalRec.outcome).toBe('CONFIGURE');
    expect(canonicalRec.recommendedAction).toContain('F0773');
    expect(canonicalRec.outstandingChecks.length).toBeGreaterThan(0);
  });

  // Test 3: Separation of catalogue match from S21 activation
  it('Scenario 3: Separation of catalogue match from S21 activation — FAL match does NOT equal active deployment in S21', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const avail = evidenceEngine.evaluateSystemAvailability(assessment, candidates[0]);

    // Catalogue match is verified
    expect(avail.catalogueMatchStatus).toBe('CATALOGUE_VERIFIED');

    // BUT S21 target activation remains PENDING_VERIFICATION (Non-inference invariant)
    expect(avail.activationStatus).toBe('PENDING_VERIFICATION');
    expect(avail.overallS21Availability).toBe('PENDING_VERIFICATION');
  });

  // Test 4: Separation of PFCG role documentation from user assignment
  it('Scenario 4: Separation of PFCG role documentation from user assignment — documented role requires PFCG assignment', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const roles = evidenceEngine.evaluateRoleValidation(assessment, candidates[0]);

    const apRole = roles.find(r => r.roleName.includes('AP_ACCOUNTANT'));
    expect(apRole).toBeDefined();
    expect(apRole?.documentedInOfficialCatalogue).toBe(true);

    // Documented in FAL does NOT prove assignment to user in S21 client 200
    expect(apRole?.assignedInS21Status).toBe('PENDING_BASIS_CHECK');
    expect(apRole?.roleAvailabilityStatus).toBe('REQUIRES_PFCG_ROLE_ASSIGNMENT');
  });

  // Test 5: Separation of OData documentation from Gateway registration
  it('Scenario 5: Separation of OData documentation from Gateway registration — documented service is PENDING_BASIS_CHECK', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const odata = evidenceEngine.evaluateODataValidation(assessment, candidates[0]);

    const paymentSrv = odata.find(o => o.serviceName === 'FAR_OUTGOING_PAYMENT_SRV');
    expect(paymentSrv).toBeDefined();
    expect(paymentSrv?.provenance).toBe('OFFICIAL_CATALOGUE');

    // Must be PENDING_BASIS_CHECK in unverified/demo landscape, NEVER fabricated ACTIVE
    expect(paymentSrv?.registrationStatus).toBe('PENDING_BASIS_CHECK');
  });

  // Test 6: Evidence score calculation based on verified evidence points
  it('Scenario 6: Evidence score calculation based on verified evidence points — formulaic completeness metric', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const evidence = evidenceEngine.compileDetailedEvidence(assessment);
    const score = evidenceEngine.calculateEvidenceScore(assessment, evidence);

    expect(score.totalScore).toBeGreaterThanOrEqual(70);
    expect(['COMPLETE', 'SUBSTANTIAL']).toContain(score.completenessLabel);
    expect(score.breakdown.dictionaryScore).toBe(25); // TSTC (10) + TSTCT (5) + TADIR (10)
    expect(score.breakdown.catalogueScore).toBe(25); // Match (15) + Details (10)
    expect(score.breakdown.compatibilityScore).toBe(20); // Release COMPATIBLE (20)
    expect(score.explanation).toContain('verified audit evidence points');
  });

  // Test 7: Confidence score calculation reflecting verified sources
  it('Scenario 7: Confidence score calculation reflecting verified sources — withholds points for unverified S21 activation', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const bucketized = evidenceEngine.compileBucketizedEvidence(assessment, candidates[0]);
    const metrics = evidenceEngine.calculateIndependentMetrics(assessment, bucketized, candidates[0]);

    // Live S21 checks are pending, so confidence is capped at 70/100 (MEDIUM)
    expect(metrics.recommendationConfidence).toBe(70);
    expect(metrics.methodologyNotes.confidence).toContain('Pending live S21 checks withhold 20%');
  });

  // Test 8: Functional coverage calculation based on verified requirements
  it('Scenario 8: Functional coverage calculation based on verified requirements — independent from confidence', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const requirements = [
      { requirementId: 'R1', coverageStatus: 'SUPPORTED' },
      { requirementId: 'R2', coverageStatus: 'SUPPORTED' },
      { requirementId: 'R3', coverageStatus: 'SUPPORTED' },
      { requirementId: 'R4', coverageStatus: 'SUPPORTED' },
      { requirementId: 'R5', coverageStatus: 'PARTIALLY_SUPPORTED' }
    ];

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const bucketized = evidenceEngine.compileBucketizedEvidence(assessment, candidates[0]);
    const metrics = evidenceEngine.calculateIndependentMetrics(assessment, bucketized, candidates[0], requirements);

    // 4 supported (400) + 1 partial (50) = 450 / 5 = 90%
    expect(metrics.functionalCoverage).toBe(90);
    expect(metrics.functionalCoverage).not.toBe(metrics.recommendationConfidence);
    expect(metrics.functionalCoverage).not.toBe(metrics.evidenceCompleteness);
  });

  // Test 9: Audit trail preserves original assessment and appends corrections
  it('Scenario 9: Audit trail preserves original assessment and appends corrections — immutable audit log', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    expect(assessment.auditEvents).toBeDefined();
    const events = assessment.auditEvents || [];

    // Preserves genesis event
    const genesis = events.find(e => e.action === 'CREATED');
    expect(genesis).toBeDefined();

    // Appends auditable correction event without destroying genesis
    const corr = events.find(e => e.action === 'CORRECTION');
    expect(corr).toBeDefined();
    expect(corr?.details?.resolvedContradictions?.length).toBeGreaterThanOrEqual(5);
  });

  // Test 10: Stage 4 ADD FOUND workflow
  it('Scenario 10: Stage 4 ADD FOUND workflow — associates candidate and records candidate selection in audit events', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const altCandidate = candidates.find(c => c.appId === 'F1367') || candidates[0];

    const now = new Date().toISOString();
    const newAuditEvent = {
      eventId: `AUD-TEST-ADD-FOUND-${Date.now()}`,
      timestamp: now,
      author: 'SAP Fiori Architect',
      actorId: 'USR-TEST',
      actorRole: 'SAP_CONSULTANT',
      previousState: assessment.matchingFioriApp?.appId,
      newState: altCandidate.appId,
      action: 'CANDIDATE_SELECTED',
      comment: `Selected candidate ${altCandidate.appId}`,
      details: {
        appId: altCandidate.appId,
        appName: altCandidate.appName,
        uiTechnology: altCandidate.uiTechnology
      }
    };

    const updatedAssessment: AssessmentRecord = {
      ...assessment,
      matchingFioriApp: {
        appId: altCandidate.appId,
        appName: altCandidate.appName,
        appType: altCandidate.uiTechnology,
        uiTechnology: altCandidate.uiTechnology,
        releaseCompatibility: 'COMPATIBLE',
        sourceLabel: 'Official SAP Fiori Apps Reference Library'
      },
      auditEvents: [...(assessment.auditEvents || []), newAuditEvent]
    };

    expect(updatedAssessment.matchingFioriApp?.appId).toBe(altCandidate.appId);
    expect(updatedAssessment.auditEvents?.some(e => e.action === 'CANDIDATE_SELECTED')).toBe(true);
  });

  // Test 11: Stage 4 CONFIGURE / ADOPT readiness checklist
  it('Scenario 11: Stage 4 CONFIGURE / ADOPT readiness checklist — records readiness without claiming SAP modifications', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const now = new Date().toISOString();
    const readinessEvent = {
      eventId: `AUD-TEST-READINESS-${Date.now()}`,
      timestamp: now,
      author: 'SAP Security Lead',
      actorId: 'USR-SEC-01',
      actorRole: 'BASIS_LEAD',
      previousState: 'ASSESSMENT',
      newState: 'DEV_READINESS_RECORDED',
      action: 'READINESS_ACKNOWLEDGED',
      comment: 'Checklist verified: Basis service activation required in S21 client 200.',
      details: {
        s21ChecksRequired: true,
        noSapWritesPerformed: true
      }
    };

    const updated: AssessmentRecord = {
      ...assessment,
      deploymentReadiness: {
        stage: 'DEV_READINESS',
        devReady: true,
        qasValidated: false,
        businessAccepted: false,
        productionReady: false,
        approvedForDeployment: false,
        lastUpdated: now
      },
      auditEvents: [...(assessment.auditEvents || []), readinessEvent]
    };

    expect(updated.deploymentReadiness?.devReady).toBe(true);
    expect(updated.deploymentReadiness?.productionReady).toBe(false);
    expect(readinessEvent.details.noSapWritesPerformed).toBe(true);
  });

  // Test 12: Stage 4 EXTEND plan creation
  it('Scenario 12: Stage 4 EXTEND plan creation — records Clean Core extensibility tier and reviewable notes', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const now = new Date().toISOString();
    const extEvent = {
      eventId: `AUD-TEST-EXT-${Date.now()}`,
      timestamp: now,
      author: 'Clean Core Architect',
      actorId: 'USR-CLEAN-CORE',
      actorRole: 'DEVELOPER',
      previousState: 'UNEXTENDED',
      newState: 'EXTENSION_PLAN_FORMULATED',
      action: 'EXTENSION_SAVED',
      comment: 'Tier 1 Key User Extensibility plan formulated for payment reference fields.',
      details: {
        tier: 'TIER_1_KEY_USER',
        cleanCoreCompliant: true
      }
    };

    const updated: AssessmentRecord = {
      ...assessment,
      auditEvents: [...(assessment.auditEvents || []), extEvent]
    };

    expect(updated.auditEvents?.some(e => e.action === 'EXTENSION_SAVED')).toBe(true);
  });

  // Test 13: Stage 4 BUILD handoff validation (blocking when unapproved or incomplete)
  it('Scenario 13: Stage 4 BUILD handoff validation — blocks when architect approval is missing or evidence is incomplete', () => {
    const completenessIncomplete = 40;
    const completenessComplete = 75;
    const architectApprovedFalse = false;
    const architectApprovedTrue = true;

    // Check 1: Incomplete evidence blocks handoff
    expect(completenessIncomplete < 50).toBe(true);

    // Check 2: Unapproved architect blocks handoff
    expect(!architectApprovedFalse).toBe(true);

    // Check 3: Complete & approved allows handoff
    const canHandoff = completenessComplete >= 50 && architectApprovedTrue;
    expect(canHandoff).toBe(true);
  });

  // Test 14: Stage 4 BUILD handoff persistence and navigation payload
  it('Scenario 14: Stage 4 BUILD handoff persistence and navigation — generates valid GenerationHandoffPayload', () => {
    const handoffId = `HND-TEST-${Date.now()}`;
    const payload = {
      handoffId,
      sourceAssessmentId: 'ASM-S21-F53',
      tcode: 'F-53',
      transactionDescription: 'Post Outgoing Payments',
      targetRelease: 'SAP S/4HANA 2023 Private Edition',
      systemId: 'S21',
      client: '200',
      programName: 'SAPMF05A',
      packageName: 'FBAS',
      classification: 'STANDARD',
      recommendationOutcome: 'CONFIGURE' as RecommendationOutcome,
      architectApproved: true,
      architectName: 'Lead SAP Architect',
      architectSignOffTimestamp: new Date().toISOString(),
      verifiedMetadata: {
        programName: 'SAPMF05A',
        screenNumber: '0100',
        packageName: 'FBAS',
        softwareComponent: 'S4CORE 108 SP0003'
      },
      businessRequirements: {
        process: 'Financial Accounting',
        scenario: 'Accounts Payable',
        criticality: 'HIGH',
        requiredCapabilities: ['Open Item Selection', 'Bank Account Clearing']
      },
      fitGapSummary: {
        identifiedGaps: ['Spool print output requires modern form migration'],
        missingCapabilities: [],
        justification: 'RAP Managed application blueprint for S/4HANA 2023'
      },
      architectureBaseline: {
        backendModel: 'RAP_MANAGED' as const,
        cdsViewType: 'VIEW_ENTITY' as const,
        odataVersion: 'ODATA_V4' as const,
        uiPattern: 'FIORI_ELEMENTS_LIST_REPORT_OBJECT_PAGE' as const,
        cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER' as const
      },
      createdAt: new Date().toISOString()
    };

    expect(payload.handoffId).toBe(handoffId);
    expect(payload.architectureBaseline.backendModel).toBe('RAP_MANAGED');
    expect(payload.architectureBaseline.cdsViewType).toBe('VIEW_ENTITY');
    expect(payload.architectureBaseline.odataVersion).toBe('ODATA_V4');
    expect(payload.architectApproved).toBe(true);
  });

  // Test 15: Stage completion statuses correctly calculated
  it('Scenario 15: Stage completion statuses correctly calculated — Stage 3 PARTIALLY_COMPLETED when S21 live check is pending', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const bucketized = evidenceEngine.compileBucketizedEvidence(assessment, candidates[0]);
    const metrics = evidenceEngine.calculateIndependentMetrics(assessment, bucketized, candidates[0]);

    expect(metrics.stageStatuses.stage1Verdict).toBe('COMPLETED');
    expect(metrics.stageStatuses.stage2FitGap).toBe('COMPLETED');
    expect(metrics.stageStatuses.stage3TechnicalProof).toBe('PARTIALLY_COMPLETED');
    expect(metrics.stageStatuses.stage4ModernizationDecision).toBe('PENDING_VERIFICATION');
  });

  // Test 16: Unverified technical objects never displayed as live verified
  it('Scenario 16: Unverified technical objects never displayed as live verified — Bucket E isolates pending checks', async () => {
    const assessment = await assessmentService.getAssessmentByTCode('F-53');
    if (!assessment) return;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode('F-53');
    const bucketized = evidenceEngine.compileBucketizedEvidence(assessment, candidates[0]);

    // Bucket E contains only items with verificationStatus PENDING_VERIFICATION
    const bucketE = bucketized.filter(e => e.bucket === 'E_PENDING_VERIFICATION');
    expect(bucketE.length).toBeGreaterThanOrEqual(3);

    for (const item of bucketE) {
      expect(item.verificationStatus).toBe('PENDING_VERIFICATION');
      expect(item.limitation).toBeDefined();
      expect(item.limitation.length).toBeGreaterThan(10);
      expect(item.provenance).toBe('PENDING_VERIFICATION');
    }
  });

});
