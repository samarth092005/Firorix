import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RecommendationEngine,
  recommendationEngine,
  RECOMMENDATION_OUTCOMES,
  EXTENSIBILITY_TIERS,
  GOVERNANCE_OVERRIDES
} from '../src/engine/recommendationEngine.js';

describe('REC-QA-01 — Recommendation Quality & Decision Validation Suite', () => {
  const baseReq = {
    id: 'REQ-FI-001',
    title: 'Post Outgoing Payments for Suppliers',
    tcode: 'F-53',
    requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
    requiredOperations: ['PostPayment'],
    priority: 'MANDATORY'
  };

  const fullyVerifiedCandidate = {
    appId: 'F1612',
    appName: 'Post Outgoing Payments',
    appType: 'Transactional',
    uiTechnology: 'SAP Fiori (SAPUI5)',
    productVersion: 'SAP S/4HANA 2023',
    businessProcess: 'Finance, Accounts Payable',
    businessRoles: ['Accounts Payable Accountant'],
    supportedCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
    odataDependencies: ['FAP_PAYMENT_POST_SRV'],
    verifiedODataServices: [
      {
        serviceName: 'FAP_PAYMENT_POST_SRV',
        technicalAlias: 'FAP_PAYMENT_POST_SRV',
        availableOperations: ['PostPayment'],
        isAliasVerified: true
      }
    ]
  };

  const fullyVerifiedContext = {
    targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
    activeServices: ['FAP_PAYMENT_POST_SRV'],
    userAuthorizations: ['ACCOUNTS PAYABLE ACCOUNTANT']
  };

  // Outcome 1: ADOPT
  it('1. ADOPT: validates preconditions and generates structured explanations', () => {
    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: fullyVerifiedCandidate,
      context: fullyVerifiedContext
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.ADOPT);
    assert.strictEqual(result.riskAssessment.overallRisk, 'LOW');
    assert.ok(result.decisionExplanations);
    assert.strictEqual(result.decisionExplanations.outcome, RECOMMENDATION_OUTCOMES.ADOPT);
    assert.ok(result.decisionExplanations.selectionReason.includes('Immediate adoption is recommended'));
    assert.ok(result.decisionExplanations.rejectedAlternatives.length > 0);
    assert.ok(result.decisionExplanations.supportingEvidence.length > 0);
  });

  // Outcome 2: CONFIGURE
  it('2. CONFIGURE: requires role/activation enablement and provides configuration steps', () => {
    const candPendingConfig = {
      ...fullyVerifiedCandidate,
      verifiedODataServices: [] // Missing Gateway activation
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: candPendingConfig,
      context: {
        targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
        activeServices: [],
        userAuthorizations: []
      }
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.CONFIGURE);
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.UNREGISTERED_GATEWAY_SERVICE_REQUIRES_CONFIG));
    assert.ok(result.actionableRemediationPlan.some((s) => s.responsibleRole === 'Basis Administrator'));
    assert.ok(result.actionableRemediationPlan.some((s) => s.responsibleRole === 'Security / Authorizations Team'));
  });

  // Outcome 3: EXTEND
  it('3. EXTEND: identifies custom variant and classifies Clean Core Tier 1 Key User extensibility', () => {
    const reqWithCustomization = {
      ...baseReq,
      customizationRequirements: ['Custom withholding tax calculation for local statutory requirement']
    };

    const result = recommendationEngine.generate({
      requirement: reqWithCustomization,
      candidate: fullyVerifiedCandidate,
      context: fullyVerifiedContext
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.EXTEND);
    assert.strictEqual(result.extensibilityStrategy.tier, EXTENSIBILITY_TIERS.TIER_1_KEY_USER);
    assert.strictEqual(result.extensibilityStrategy.cleanCoreCompliant, true);
    assert.ok(result.decisionExplanations.selectionReason.includes('Clean Core extensibility'));
  });

  // Outcome 4: BUILD (Strict 9-point preconditions)
  it('4. BUILD: succeeds ONLY when all 9 preconditions are satisfied', () => {
    const incompatibleStandardApp = {
      appId: 'F0842A',
      appName: 'Manage Purchase Orders',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori elements',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Sourcing and Procurement',
      supportedCapabilities: ['PURCHASE_ORDER_CREATION'] // Core payment capabilities completely missing
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: incompatibleStandardApp,
      context: fullyVerifiedContext
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.BUILD);
    assert.strictEqual(result.extensibilityStrategy.tier, EXTENSIBILITY_TIERS.TIER_2_CLOUD_DEVELOPER);
    assert.ok(result.actionableRemediationPlan.some((s) => s.title.includes('Architect Custom RAP')));
    assert.ok(result.decisionExplanations.humanVerificationRequired.some((h) => h.includes('Enterprise Architecture Board')));
  });

  // Outcome 5: REVIEW
  it('5. REVIEW: detects release incompatibility and blocks premature adoption', () => {
    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: fullyVerifiedCandidate,
      context: {
        targetSystem: { systemId: 'ECC_LEGACY', release: 'SAP ECC 6.0' }
      }
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.REVIEW);
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.RELEASE_BLOCKER_PREVENTS_ADOPT));
    assert.strictEqual(result.riskAssessment.overallRisk, 'CRITICAL');
  });

  // Outcome 6: PENDING_VERIFICATION
  it('6. PENDING_VERIFICATION: formulates PENDING_VERIFICATION when landscape metadata is pending', () => {
    const unverifiedCandidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      verificationStatus: 'PENDING_VERIFICATION',
      releaseCompatibility: 'PENDING_VERIFICATION',
      supportedCapabilities: ['OUTGOING_PAYMENT_POSTING']
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: unverifiedCandidate,
      context: {}
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.PENDING_VERIFICATION);
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.SYSTEM_VERIFICATION_PENDING));
  });

  // Outcome 7: INSUFFICIENT_EVIDENCE
  it('7. INSUFFICIENT_EVIDENCE: formulates INSUFFICIENT_EVIDENCE on incomplete requirements', () => {
    const result = recommendationEngine.generate({
      requirement: null,
      candidate: null
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.INSUFFICIENT_EVIDENCE);
    assert.strictEqual(result.confidence, 'VERY_LOW');
    assert.strictEqual(result.overallScore, 0);
  });

  // BUILD Safeguard 1: Missing metadata does NOT trigger BUILD
  it('8. BUILD Safeguard: missing metadata defaults to REVIEW, never BUILD', () => {
    const mysteryCandidate = {
      appId: 'F9999',
      appName: 'Mystery Candidate'
      // No capabilities or product version
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: mysteryCandidate,
      context: {}
    });

    assert.notStrictEqual(result.outcome, RECOMMENDATION_OUTCOMES.BUILD);
    assert.ok([RECOMMENDATION_OUTCOMES.REVIEW, RECOMMENDATION_OUTCOMES.PENDING_VERIFICATION, RECOMMENDATION_OUTCOMES.INSUFFICIENT_EVIDENCE].includes(result.outcome));
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.MISSING_EVIDENCE_PREVENTS_BUILD));
  });

  // BUILD Safeguard 2: Blocked ADT or MCP failure does NOT trigger BUILD
  it('9. BUILD Safeguard: blocked ADT and missing candidate search does NOT trigger BUILD', () => {
    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: { appId: 'Z_UNKNOWN', appName: 'Z_UNKNOWN' },
      context: {
        adtBlocked: true,
        mcpStatus: 'DISCONNECTED'
      }
    });

    assert.notStrictEqual(result.outcome, RECOMMENDATION_OUTCOMES.BUILD);
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.MISSING_EVIDENCE_PREVENTS_BUILD));
  });
});
