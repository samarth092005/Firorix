import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore, LIFECYCLE_STATES } from '../src/services/assessmentStore.js';
import { RECOMMENDATION_OUTCOMES, GOVERNANCE_OVERRIDES, EXTENSIBILITY_TIERS } from '../src/engine/recommendationEngine.js';
import { DIMENSION_STATUSES, ASSESSMENT_STATUSES, GAP_SEVERITIES } from '../src/engine/fitGapAssessmentEngine.js';

describe('Fiorify TEST-01 — Master End-to-End Acceptance Test Suite (Scenarios A through G)', () => {
  let server;
  let baseUrl;
  let testStoragePath;
  let assessmentStore;

  before(async () => {
    testStoragePath = path.join(
      os.tmpdir(),
      `Fiorify-master-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    assessmentStore = new AssessmentStore({ storagePath: testStoragePath });
    server = createServer({ assessmentStore });

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
    try {
      if (fs.existsSync(testStoragePath)) {
        fs.unlinkSync(testStoragePath);
      }
    } catch {
      // Ignore
    }
  });

  // =========================================================================
  // SCENARIO A: Standard Fiori App with High Fit (F-53 -> F1612)
  // =========================================================================
  it('Scenario A: Standard Fiori App with High Fit (F-53 -> F1612 Post Outgoing Payments)', async () => {
    // 1. Fit-Gap Assessment Request
    const fitGapRes = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': 'corr-scen-a' },
      body: JSON.stringify({
        requirement: {
          id: 'REQ-FI-F53',
          title: 'Post Outgoing Supplier Payments',
          tcode: 'F-53',
          businessProcess: 'Finance, Accounts Payable',
          requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
          requiredOperations: ['PostPayment', 'SimulatePayment'],
          priority: 'MANDATORY'
        },
        candidate: {
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
              availableOperations: ['PostPayment', 'SimulatePayment'],
              isAliasVerified: true
            }
          ]
        },
        context: {
          systemId: 'S21-200',
          client: '200',
          systemRelease: 'SAP S/4HANA 2023',
          activeServices: ['FAP_PAYMENT_POST_SRV'],
          userAuthorizations: ['ACCOUNTS PAYABLE ACCOUNTANT']
        }
      })
    });

    assert.strictEqual(fitGapRes.status, 200);
    const fitGapBody = await fitGapRes.json();
    assert.strictEqual(fitGapBody.overallStatus, ASSESSMENT_STATUSES.VERIFIED_FIT);
    assert.ok(fitGapBody.overallScore >= 85);
    assert.strictEqual(fitGapBody.assessment.dimensions.length, 10);
    assert.strictEqual(fitGapBody.assessment.dimensions.find((d) => d.dimensionKey === 'functionalCoverage').status, DIMENSION_STATUSES.VERIFIED_FIT);
    assert.strictEqual(fitGapBody.assessment.dimensions.find((d) => d.dimensionKey === 'cleanCoreAlignment').cleanCoreRating, 'GREEN');

    // 2. Governed Recommendation Request
    const recRes = await fetch(`${baseUrl}/api/v1/recommendations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment: fitGapBody.assessment
      })
    });

    assert.strictEqual(recRes.status, 200);
    const recBody = await recRes.json();
    assert.strictEqual(recBody.outcome, RECOMMENDATION_OUTCOMES.ADOPT);
    assert.strictEqual(recBody.confidence, 'HIGH');
    assert.strictEqual(recBody.recommendation.riskAssessment.overallRisk, 'LOW');
    assert.ok(recBody.recommendation.actionableRemediationPlan.some((step) => step.responsibleRole === 'Security / Authorizations Team'));
  });

  // =========================================================================
  // SCENARIO B: Classic GUI Fallback (F-53 WebGUI Tile)
  // =========================================================================
  it('Scenario B: Classic GUI Fallback (F-53 WebGUI Tile as transitional bridge)', async () => {
    const fitGapRes = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: {
          id: 'REQ-FI-F53-LEGACY',
          title: 'Post Outgoing Payments - Legacy Workflow',
          tcode: 'F-53',
          businessProcess: 'Finance, Accounts Payable',
          requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING']
        },
        candidate: {
          appId: 'F-53',
          appName: 'Post Outgoing Payments - Classic GUI',
          appType: 'SAP GUI',
          uiTechnology: 'SAP GUI for HTML',
          productVersion: 'SAP S/4HANA 2023',
          businessProcess: 'Finance, Accounts Payable',
          supportedCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING']
        },
        context: {
          systemId: 'S21-200',
          systemRelease: 'SAP S/4HANA 2023'
        }
      })
    });

    assert.strictEqual(fitGapRes.status, 200);
    const fitGapBody = await fitGapRes.json();
    const cleanCoreDim = fitGapBody.assessment.dimensions.find((d) => d.dimensionKey === 'cleanCoreAlignment');
    assert.strictEqual(cleanCoreDim.cleanCoreRating, 'AMBER');
    assert.strictEqual(cleanCoreDim.score, 55);

    const recRes = await fetch(`${baseUrl}/api/v1/recommendations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment: fitGapBody.assessment
      })
    });

    assert.strictEqual(recRes.status, 200);
    const recBody = await recRes.json();
    assert.strictEqual(recBody.outcome, RECOMMENDATION_OUTCOMES.CONFIGURE);
    assert.ok(recBody.recommendation.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.LEGACY_GUI_FALLBACK_RECOMMENDED));
    assert.strictEqual(recBody.recommendation.extensibilityStrategy.cleanCoreCompliant, false);
    assert.ok(recBody.recommendation.rationale.includes('Classic SAP GUI for HTML WebGUI tile provides 100% functional fallback'));
  });

  // =========================================================================
  // SCENARIO C: Custom Transaction / No Standard App (Z_PAY_EXEC -> BUILD)
  // =========================================================================
  it('Scenario C: Custom Transaction / Confirmed Material Gap (Z_PAY_EXEC -> Custom RAP BUILD)', async () => {
    const fitGapRes = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: {
          id: 'REQ-CUST-ZPAY',
          title: 'Custom High-Volume Batch Payment Execution',
          tcode: 'Z_PAY_EXEC',
          businessProcess: 'Finance, Treasury',
          requiredCapabilities: ['BATCH_SWIFT_MT101_EXECUTION', 'MULTI_BANK_ROUTING'],
          priority: 'MANDATORY'
        },
        candidate: {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori (SAPUI5)',
          productVersion: 'SAP S/4HANA 2023',
          businessProcess: 'Finance, Accounts Payable',
          supportedCapabilities: ['OUTGOING_PAYMENT_POSTING'] // Lacks SWIFT and Multi-bank routing!
        },
        context: {
          systemId: 'S21-200',
          systemRelease: 'SAP S/4HANA 2023'
        }
      })
    });

    assert.strictEqual(fitGapRes.status, 200);
    const fitGapBody = await fitGapRes.json();
    assert.strictEqual(fitGapBody.overallStatus, ASSESSMENT_STATUSES.NO_FIT);
    assert.ok(fitGapBody.assessment.missingCapabilities.includes('BATCH_SWIFT_MT101_EXECUTION'));

    const recRes = await fetch(`${baseUrl}/api/v1/recommendations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment: fitGapBody.assessment
      })
    });

    assert.strictEqual(recRes.status, 200);
    const recBody = await recRes.json();
    assert.strictEqual(recBody.outcome, RECOMMENDATION_OUTCOMES.BUILD);
    assert.strictEqual(recBody.recommendation.extensibilityStrategy.tier, EXTENSIBILITY_TIERS.TIER_2_CLOUD_DEVELOPER);
    assert.ok(recBody.recommendation.actionableRemediationPlan.some((step) => step.title.includes('Architect Custom RAP')));
  });

  // =========================================================================
  // SCENARIO D: Release Incompatibility Blocker
  // =========================================================================
  it('Scenario D: Release Incompatibility Blocker (S/4HANA app on ECC 6.0 target -> REVIEW)', async () => {
    const fitGapRes = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: {
          id: 'REQ-RELEASE-TEST',
          title: 'Post Outgoing Payments',
          tcode: 'F-53',
          requiredCapabilities: ['OUTGOING_PAYMENT_POSTING']
        },
        candidate: {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          appType: 'Transactional',
          productVersion: 'SAP S/4HANA 2023',
          supportedCapabilities: ['OUTGOING_PAYMENT_POSTING']
        },
        context: {
          targetSystem: { systemId: 'DEV', release: 'SAP ECC 6.0 EHP8' }
        }
      })
    });

    assert.strictEqual(fitGapRes.status, 200);
    const fitGapBody = await fitGapRes.json();
    assert.strictEqual(fitGapBody.overallStatus, ASSESSMENT_STATUSES.NO_FIT);
    const compatDim = fitGapBody.assessment.dimensions.find((d) => d.dimensionKey === 'releaseCompatibility');
    assert.strictEqual(compatDim.status, DIMENSION_STATUSES.NO_FIT);

    const recRes = await fetch(`${baseUrl}/api/v1/recommendations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment: fitGapBody.assessment
      })
    });

    assert.strictEqual(recRes.status, 200);
    const recBody = await recRes.json();
    assert.strictEqual(recBody.outcome, RECOMMENDATION_OUTCOMES.REVIEW);
    assert.ok(recBody.recommendation.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.RELEASE_BLOCKER_PREVENTS_ADOPT));
    assert.strictEqual(recBody.recommendation.riskAssessment.overallRisk, 'CRITICAL');
  });

  // =========================================================================
  // SCENARIO E: Missing Evidence / System Disconnected (Never BUILD on uncertainty)
  // =========================================================================
  it('Scenario E: Missing Evidence / System Disconnected (Never default to BUILD on uncertainty)', async () => {
    const fitGapRes = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: {
          id: 'REQ-DISCONNECTED',
          title: 'Post Outgoing Payments',
          tcode: 'F-53',
          requiredCapabilities: ['OUTGOING_PAYMENT_POSTING']
        },
        candidate: {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          appType: 'Transactional',
          supportedCapabilities: ['OUTGOING_PAYMENT_POSTING']
        },
        context: {
          // Empty context: target system unreachable, active services unknown
          systemId: 'S21'
        }
      })
    });

    assert.strictEqual(fitGapRes.status, 200);
    const fitGapBody = await fitGapRes.json();

    const recRes = await fetch(`${baseUrl}/api/v1/recommendations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment: fitGapBody.assessment
      })
    });

    assert.strictEqual(recRes.status, 200);
    const recBody = await recRes.json();
    // Governance Guardrail: Missing evidence MUST NEVER result in BUILD
    assert.notStrictEqual(recBody.outcome, RECOMMENDATION_OUTCOMES.BUILD);
    assert.ok([RECOMMENDATION_OUTCOMES.PENDING_VERIFICATION, RECOMMENDATION_OUTCOMES.CONFIGURE, RECOMMENDATION_OUTCOMES.REVIEW].includes(recBody.outcome));
  });

  // =========================================================================
  // SCENARIO F: Customization Conflict (Clean Core Extensibility Enforced)
  // =========================================================================
  it('Scenario F: Customization Conflict (Standard Fiori + Legacy User Exits -> EXTEND)', async () => {
    const fitGapRes = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: {
          id: 'REQ-CUSTOM-EXIT',
          title: 'Post Outgoing Payments with Custom Screen Variant',
          tcode: 'F-53',
          businessProcess: 'Finance, Accounts Payable',
          requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
          customizationRequirements: ['Legacy user exit in SAPMF05A for custom withholding tax calculation']
        },
        candidate: {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori (SAPUI5)',
          productVersion: 'SAP S/4HANA 2023',
          businessProcess: 'Finance, Accounts Payable',
          supportedCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING']
        },
        context: {
          systemId: 'S21-200',
          systemRelease: 'SAP S/4HANA 2023',
          customVariantActive: true
        }
      })
    });

    assert.strictEqual(fitGapRes.status, 200);
    const fitGapBody = await fitGapRes.json();
    assert.ok(fitGapBody.assessment.identifiedGaps.some((g) => g.category === 'CUSTOM_VARIANT'));

    const recRes = await fetch(`${baseUrl}/api/v1/recommendations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assessment: fitGapBody.assessment
      })
    });

    assert.strictEqual(recRes.status, 200);
    const recBody = await recRes.json();
    assert.strictEqual(recBody.outcome, RECOMMENDATION_OUTCOMES.EXTEND);
    assert.ok(recBody.recommendation.governanceOverridesApplied.includes(GOVERNANCE_OVERRIDES.CLEAN_CORE_EXTENSIBILITY_ENFORCED));
    assert.strictEqual(recBody.recommendation.extensibilityStrategy.tier, EXTENSIBILITY_TIERS.TIER_1_KEY_USER);
    assert.ok(recBody.recommendation.actionableRemediationPlan.some((step) => step.title.includes('Clean Core Extension Logic')));
  });

  // =========================================================================
  // SCENARIO G: End-to-End Lifecycle & Audit Trail (DRAFT -> ARCHIVED)
  // =========================================================================
  it('Scenario G: End-to-End Lifecycle & Audit Trail (DRAFT -> ARCHIVED)', async () => {
    // 1. Initialize in DRAFT
    const createRes = await fetch(`${baseUrl}/api/v1/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tcode: 'F-53',
        description: 'End-to-End Lifecycle Validation Assessment',
        businessArea: 'Financial Accounting',
        status: LIFECYCLE_STATES.DRAFT,
        author: 'Lead Architect'
      })
    });

    assert.strictEqual(createRes.status, 201);
    const createBody = await createRes.json();
    const asmId = createBody.assessment.id;
    assert.strictEqual(createBody.assessment.lifecycleStatus, LIFECYCLE_STATES.DRAFT);

    // 2. Advance to DISCOVERY_COMPLETED
    const step1 = await fetch(`${baseUrl}/api/v1/assessments/${asmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: LIFECYCLE_STATES.DISCOVERY_COMPLETED,
        author: 'Discovery Engine',
        comment: 'SAP transaction metadata discovered.'
      })
    });
    assert.strictEqual(step1.status, 200);

    // 3. Advance to MATCHING_COMPLETED
    const step2 = await fetch(`${baseUrl}/api/v1/assessments/${asmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: LIFECYCLE_STATES.MATCHING_COMPLETED,
        matchingFioriApp: { appId: 'F1612', appName: 'Post Outgoing Payments' },
        author: 'Matching Engine',
        comment: 'FAL catalogue candidate F1612 matched.'
      })
    });
    assert.strictEqual(step2.status, 200);

    // 4. Advance to FITGAP_COMPLETED
    const step3 = await fetch(`${baseUrl}/api/v1/assessments/${asmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: LIFECYCLE_STATES.FITGAP_COMPLETED,
        fitGapScore: 92,
        author: 'Fit-Gap Engine',
        comment: '10-dimension assessment completed.'
      })
    });
    assert.strictEqual(step3.status, 200);

    // 5. Advance to RECOMMENDATION_COMPLETED
    const step4 = await fetch(`${baseUrl}/api/v1/assessments/${asmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: LIFECYCLE_STATES.RECOMMENDATION_COMPLETED,
        author: 'Recommendation Engine',
        comment: 'ADOPT outcome formulated.'
      })
    });
    assert.strictEqual(step4.status, 200);

    // 6. Advance to PENDING_REVIEW
    const step5 = await fetch(`${baseUrl}/api/v1/assessments/${asmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: LIFECYCLE_STATES.PENDING_REVIEW,
        author: 'Consultant',
        comment: 'Submitted for peer review.'
      })
    });
    assert.strictEqual(step5.status, 200);

    // 7. Advance to APPROVED
    const step6 = await fetch(`${baseUrl}/api/v1/assessments/${asmId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: LIFECYCLE_STATES.APPROVED,
        author: 'Architecture Board',
        comment: 'Formally approved.'
      })
    });
    assert.strictEqual(step6.status, 200);

    // 8. Retrieve Audit History
    const auditRes = await fetch(`${baseUrl}/api/v1/assessments/${asmId}/audit`);
    assert.strictEqual(auditRes.status, 200);
    const auditBody = await auditRes.json();
    assert.strictEqual(auditBody.count, 7); // Initial + 6 transitions
    assert.strictEqual(auditBody.auditEvents[0].action, 'CREATED');
    assert.strictEqual(auditBody.auditEvents[6].newState, LIFECYCLE_STATES.APPROVED);

    // 9. Archive Record
    const archiveRes = await fetch(`${baseUrl}/api/v1/assessments/${asmId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'System',
        comment: 'End of lifecycle archiving.'
      })
    });
    assert.strictEqual(archiveRes.status, 200);
    const archiveBody = await archiveRes.json();
    assert.strictEqual(archiveBody.assessment.lifecycleStatus, 'ARCHIVED');

    // 10. Audit count now 8
    const finalAuditRes = await fetch(`${baseUrl}/api/v1/assessments/${asmId}/audit`);
    const finalAuditBody = await finalAuditRes.json();
    assert.strictEqual(finalAuditBody.count, 8);
    assert.strictEqual(finalAuditBody.auditEvents[7].action, 'ARCHIVED');
  });
});
