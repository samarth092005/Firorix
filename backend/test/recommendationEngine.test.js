import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RecommendationEngine,
  recommendationEngine,
  RECOMMENDATION_OUTCOMES,
  EXTENSIBILITY_TIERS,
  GOVERNANCE_OVERRIDES
} from '../src/engine/recommendationEngine.js';

describe('FioriX REC-01 — Governed Recommendation Engine Unit Tests', () => {
  const baseReq = {
    id: 'REQ-01',
    title: 'Post Outgoing Payments',
    tcode: 'F-53',
    requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
    requiredOperations: ['PostPayment'],
    priority: 'MANDATORY'
  };

  const idealCandidate = {
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

  it('formulates ADOPT outcome for fully verified standard Fiori application with 0 critical gaps', () => {
    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: idealCandidate,
      context: fullyVerifiedContext
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.ADOPT);
    assert.strictEqual(result.confidence, 'HIGH');
    assert.ok(result.overallScore >= 80);
    assert.strictEqual(result.riskAssessment.overallRisk, 'LOW');
    assert.ok(result.actionableRemediationPlan.length >= 2);
  });

  it('formulates CONFIGURE outcome when app fits but user lacks role or service activation is pending', () => {
    const contextNeedingConfig = {
      targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
      activeServices: [], // Missing activation in Gateway
      userAuthorizations: [] // Missing role assignment
    };

    const candNeedingConfig = {
      ...idealCandidate,
      verifiedODataServices: []
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: candNeedingConfig,
      context: contextNeedingConfig
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.CONFIGURE);
    assert.ok(result.actionableRemediationPlan.some((step) => step.responsibleRole === 'Security / Authorizations Team'));
  });

  it('formulates EXTEND outcome and enforces Clean Core Tier 1/2 when customization is required', () => {
    const reqWithCustomization = {
      ...baseReq,
      customizationRequirements: ['Add custom vendor withholding tax rule']
    };

    const result = recommendationEngine.generate({
      requirement: reqWithCustomization,
      candidate: idealCandidate,
      context: fullyVerifiedContext
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.EXTEND);
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.CLEAN_CORE_EXTENSIBILITY_ENFORCED));
    assert.strictEqual(result.extensibilityStrategy.tier, EXTENSIBILITY_TIERS.TIER_1_KEY_USER);
    assert.ok(result.extensibilityStrategy.cleanCoreCompliant);
    assert.ok(result.actionableRemediationPlan.some((step) => step.title.includes('Clean Core Extension Logic')));
  });

  it('formulates BUILD outcome ONLY when material functional gaps are confirmed, NOT on missing evidence', () => {
    const candidateWithNoFit = {
      appId: 'F0842A',
      appName: 'Manage Purchase Orders',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori elements',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Sourcing and Procurement',
      supportedCapabilities: ['PURCHASE_ORDER_CREATION'] // Does not support payment posting!
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: candidateWithNoFit,
      context: fullyVerifiedContext
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.BUILD);
    assert.strictEqual(result.extensibilityStrategy.tier, EXTENSIBILITY_TIERS.TIER_2_CLOUD_DEVELOPER);
    assert.ok(result.actionableRemediationPlan.some((step) => step.title.includes('Architect Custom RAP')));
  });

  it('HARD GOVERNANCE: prevents BUILD when evidence is merely missing and formulates REVIEW instead', () => {
    const incompleteCandidate = {
      appId: 'F9999',
      appName: 'Unverified Mystery App'
      // No capabilities or metadata provided
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: incompleteCandidate,
      context: {}
    });

    // Must NOT default to BUILD!
    assert.notStrictEqual(result.outcome, RECOMMENDATION_OUTCOMES.BUILD);
    assert.ok([RECOMMENDATION_OUTCOMES.REVIEW, RECOMMENDATION_OUTCOMES.PENDING_VERIFICATION, RECOMMENDATION_OUTCOMES.INSUFFICIENT_EVIDENCE].includes(result.outcome));
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.MISSING_EVIDENCE_PREVENTS_BUILD));
  });

  it('blocks ADOPT and formulates REVIEW when release incompatibility is detected', () => {
    const incompatibleContext = {
      targetSystem: { systemId: 'S21', release: 'SAP ECC 6.0 EHP8' }, // Legacy ECC release
      activeServices: ['FAP_PAYMENT_POST_SRV']
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: idealCandidate, // S/4HANA 2023 app
      context: incompatibleContext
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.REVIEW);
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.RELEASE_BLOCKER_PREVENTS_ADOPT));
    assert.strictEqual(result.riskAssessment.overallRisk, 'CRITICAL');
  });

  it('handles Classic GUI tile with LEGACY_GUI_FALLBACK override and CONFIGURE outcome', () => {
    const classicGuiCandidate = {
      appId: 'F-53',
      appName: 'Post Outgoing Payments - For Suppliers',
      appType: 'SAP GUI',
      uiTechnology: 'SAP GUI for HTML',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Finance, Accounts Payable',
      supportedCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING']
    };

    const result = recommendationEngine.generate({
      requirement: baseReq,
      candidate: classicGuiCandidate,
      context: fullyVerifiedContext
    });

    assert.strictEqual(result.outcome, RECOMMENDATION_OUTCOMES.CONFIGURE);
    assert.ok(result.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.LEGACY_GUI_FALLBACK_RECOMMENDED));
    assert.strictEqual(result.extensibilityStrategy.cleanCoreCompliant, false);
  });
});
