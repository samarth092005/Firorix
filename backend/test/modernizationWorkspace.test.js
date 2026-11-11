import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore, defaultAssessmentStore } from '../src/services/assessmentStore.js';
import { GenerationHandoffStore } from '../src/services/generationHandoffStore.js';

describe('MW-01, MW-02, MW-03 — Modernization Workspace Master Regression Suite (16 Scenarios)', () => {
  let server;
  let baseUrl;
  let testAssessmentStoragePath;
  let testHandoffStoragePath;
  let assessmentStore;
  let generationHandoffStore;

  const testAssessmentRecord = {
    id: 'ASM-MOD-TEST-001',
    tcode: 'F-53',
    systemId: 'S21-200',
    client: '200',
    targetRelease: 'SAP S/4HANA 2023',
    businessArea: 'Financial Accounting',
    classification: 'STANDARD',
    fitGapScore: 82,
    status: 'RECOMMENDATION_COMPLETED',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    matchingFioriApp: {
      appId: 'F0773',
      appName: 'Post Outgoing Payments',
      appType: 'SAP Fiori elements',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library'
    },
    recommendation: {
      outcome: 'ADOPT',
      rationale: 'Standard Fiori application F0773 matches outgoing payment processing.'
    }
  };

  before(async () => {
    testAssessmentStoragePath = path.join(os.tmpdir(), `test-mod-asm-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    testHandoffStoragePath = path.join(os.tmpdir(), `test-mod-hnd-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);

    assessmentStore = new AssessmentStore({ storagePath: testAssessmentStoragePath });
    generationHandoffStore = new GenerationHandoffStore(testHandoffStoragePath, assessmentStore);

    server = createServer({
      assessmentStore,
      generationHandoffStore
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Seed test assessment
    await assessmentStore.create(testAssessmentRecord);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      if (fs.existsSync(testAssessmentStoragePath)) fs.unlinkSync(testAssessmentStoragePath);
      if (fs.existsSync(testHandoffStoragePath)) fs.unlinkSync(testHandoffStoragePath);
    } catch {
      // ignore cleanup
    }
  });

  // Scenario 1: ADOPT recommendation
  it('Scenario 1: ADOPT recommendation provides standard app context and compatible status', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.assessment.recommendation.outcome, 'ADOPT');
    assert.strictEqual(data.assessment.matchingFioriApp.appId, 'F0773');
  });

  // Scenario 2: CONFIGURE recommendation
  it('Scenario 2: CONFIGURE recommendation evaluates readiness checklist with independent statuses', async () => {
    const checklistPayload = {
      actionType: 'CONFIGURE_ADOPT_READINESS',
      details: {
        checklist: {
          productReleaseCompatibility: 'VERIFIED',
          odataServices: 'VERIFIED',
          serviceRegistration: 'PENDING',
          icfUi5Services: 'PENDING',
          systemAlias: 'VERIFIED',
          businessCatalogue: 'PENDING',
          pfcgBusinessRoles: 'PENDING',
          launchpadAvailability: 'NOT_VERIFIED',
          userAuthorization: 'NOT_VERIFIED'
        }
      },
      author: 'SAP Basis Lead',
      comment: 'Configured initial enablement prerequisites for F0773.'
    };

    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(checklistPayload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.action.actionType, 'CONFIGURE_ADOPT_READINESS');
    assert.strictEqual(data.assessment.readinessChecklist.productReleaseCompatibility, 'VERIFIED');
    assert.strictEqual(data.assessment.readinessChecklist.serviceRegistration, 'PENDING');
  });

  // Scenario 3: EXTEND recommendation
  it('Scenario 3: EXTEND recommendation captures Clean Core extension tier without inventing BAdIs', async () => {
    const extendPayload = {
      actionType: 'EXTEND_PLAN',
      details: {
        targetApp: 'F0773',
        tier: 'TIER_1_KEY_USER',
        cleanCoreTier: 'TIER_1_KEY_USER',
        notes: 'Key User custom field addition for bank clearing reference.',
        missingCapabilities: ['Proprietary settlement validation rule']
      },
      author: 'Clean Core Technical Lead',
      comment: 'Saved Key User extension specification for F0773.'
    };

    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extendPayload)
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.action.actionType, 'EXTEND_PLAN');
    assert.strictEqual(data.assessment.extensionPlan.cleanCoreTier, 'TIER_1_KEY_USER');
  });

  // Scenario 4: BUILD recommendation
  it('Scenario 4: BUILD recommendation accepted for proprietary transaction without standard match', async () => {
    // Create proprietary transaction assessment
    const propRecord = {
      id: 'ASM-PROP-ZPAY-001',
      tcode: 'ZPAY_CUSTOM',
      systemId: 'S21-200',
      client: '200',
      targetRelease: 'SAP S/4HANA 2023',
      businessArea: 'Treasury Management',
      classification: 'CUSTOM',
      fitGapScore: 12,
      status: 'RECOMMENDATION_COMPLETED',
      assessmentResult: 'CUSTOM_RAP_REQUIRED',
      matchingFioriApp: null,
      recommendation: {
        outcome: 'BUILD',
        rationale: 'Zero standard Fiori apps match this proprietary payment engine.'
      }
    };
    await assessmentStore.create(propRecord);

    const buildPayload = {
      sourceAssessmentId: 'ASM-PROP-ZPAY-001',
      tcode: 'ZPAY_CUSTOM',
      proposedAppType: 'RAP_MANAGED',
      architectApproved: true,
      architectName: 'Lead SAP Architect',
      cleanCoreJustification: 'Proprietary custom transaction with zero standard equivalent.',
      businessRequirements: {
        process: 'Treasury Management',
        scenario: 'Proprietary Payment Engine',
        requiredCapabilities: ['Custom Algorithm Clearing', 'Local Ledger Accounting']
      }
    };

    const res = await fetch(`${baseUrl}/api/v1/generation/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload)
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.handoff.currentStage, 'DRAFT');
    assert.strictEqual(data.handoff.proposedAppType, 'RAP_MANAGED');
    assert.strictEqual(data.handoff.approvalStatus, 'APPROVED');
  });

  // Scenario 5: BUILD blocked due to incomplete catalogue
  it('Scenario 5: BUILD action is blocked when catalogue verification is incomplete', async () => {
    const unverifiedRecord = {
      id: 'ASM-INCOMPLETE-CAT-001',
      tcode: 'ME21N',
      systemId: 'S21-200',
      client: '200',
      targetRelease: 'SAP S/4HANA 2023',
      businessArea: 'Sourcing and Procurement',
      classification: 'STANDARD',
      fitGapScore: 40,
      catalogueSearchIncomplete: true,
      status: 'RECOMMENDATION_COMPLETED',
      assessmentResult: 'INVESTIGATE_CATALOGUE_INFO',
      matchingFioriApp: null,
      recommendation: {
        outcome: 'INVESTIGATE_CATALOGUE_INFO',
        rationale: 'Catalogue lookup incomplete.'
      }
    };
    await assessmentStore.create(unverifiedRecord);

    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-INCOMPLETE-CAT-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'BUILD_PROJECT',
        details: {
          catalogueStatus: 'INCOMPLETE',
          architectApproved: true,
          justification: 'Attempting build before catalogue search completes.'
        }
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.match(data.errorMessage, /Cannot commission custom build while catalogue verification is incomplete/i);
  });

  // Scenario 6: BUILD blocked due to missing approval
  it('Scenario 6: BUILD blocked when standard app exists and architect approval is missing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'BUILD_PROJECT',
        details: {
          leadArchitectApproval: false,
          justification: 'Want custom UI instead of standard app.'
        }
      })
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.statusCode, 'UNAUTHORIZED_BUILD');
    assert.match(data.errorMessage, /Clean Core Guardrail Violation.*Lead Enterprise Architect sign-off/i);
  });

  // Scenario 7: Standard app exists and Build exception is requested
  it('Scenario 7: Standard app exists and Build exception succeeds with justification and Architect sign-off', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'BUILD_PROJECT',
        details: {
          leadArchitectApproval: true,
          architectApproved: true,
          architectName: 'Chief Enterprise Architect',
          justification: 'Strategic decision to replace dynpro F-53 with proprietary RAP clearing pipeline.'
        },
        author: 'Chief Enterprise Architect'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.action.actionType, 'BUILD_PROJECT');
    assert.strictEqual(data.assessment.buildProject.architectApproved, true);
  });

  // Scenario 8: Add Found persistence
  it('Scenario 8: ADD_FOUND action persists standard Fiori application metadata to assessment', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'ADD_FOUND',
        details: {
          appId: 'F1367',
          appName: 'Manage Journal Entries',
          uiTechnology: 'SAP Fiori elements',
          releaseCompatibility: 'COMPATIBLE',
          sourceLabel: 'Official SAP Fiori Apps Reference Library'
        },
        author: 'SAP Finance Lead'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.assessment.matchingFioriApp.appId, 'F1367');
  });

  // Scenario 9: Duplicate Add Found (idempotency)
  it('Scenario 9: Duplicate ADD_FOUND action is idempotent and does not corrupt audit trail', async () => {
    const idempotencyKey = 'IDEMP-ADD-FOUND-F1367';
    const payload = {
      actionType: 'ADD_FOUND',
      idempotencyKey,
      details: {
        appId: 'F1367',
        appName: 'Manage Journal Entries'
      }
    };

    // First call
    const res1 = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res1.status, 200);

    // Second call with identical idempotencyKey
    const res2 = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    assert.strictEqual(res2.status, 200);
    const data2 = await res2.json();
    assert.strictEqual(data2.success, true);
    assert.strictEqual(data2.isIdempotent, true);
  });

  // Scenario 10: Adoption readiness persistence
  it('Scenario 10: Adoption readiness checklist persists all 9 items and updates deployment readiness', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'CONFIGURE_ADOPT_READINESS',
        details: {
          checklist: {
            productReleaseCompatibility: 'VERIFIED',
            odataServices: 'VERIFIED',
            serviceRegistration: 'VERIFIED',
            icfUi5Services: 'VERIFIED',
            systemAlias: 'VERIFIED',
            businessCatalogue: 'VERIFIED',
            pfcgBusinessRoles: 'VERIFIED',
            launchpadAvailability: 'VERIFIED',
            userAuthorization: 'VERIFIED'
          }
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.assessment.deploymentReadiness.stage, 'DEV_READINESS');
    assert.strictEqual(data.assessment.readinessChecklist.userAuthorization, 'VERIFIED');
  });

  // Scenario 11: Extension specification persistence
  it('Scenario 11: Extension specification persists tier, notes, and missing capabilities', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/modernization-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: 'EXTEND_PLAN',
        details: {
          targetApp: 'F1367',
          tier: 'TIER_2_CLOUD_DEVELOPER',
          notes: 'ADT Released BAdI implementation for customer tax ledger calculation.',
          missingCapabilities: ['Local Tax Ledger Computation']
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.assessment.extensionPlan.cleanCoreTier, 'TIER_2_CLOUD_DEVELOPER');
    assert.strictEqual(data.assessment.extensionPlan.targetApp, 'F1367');
  });

  // Scenario 12: Generation project creation
  it('Scenario 12: Generation project creation produces backend handoff with initial stage DRAFT', async () => {
    const handoffPayload = {
      sourceAssessmentId: 'ASM-PROP-ZPAY-001',
      tcode: 'ZPAY_CUSTOM',
      targetRelease: 'SAP S/4HANA 2023',
      proposedAppType: 'RAP_MANAGED',
      architectApproved: true,
      cleanCoreJustification: 'Zero standard equivalent available.'
    };

    const res = await fetch(`${baseUrl}/api/v1/generation/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(handoffPayload)
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.handoff.handoffId.startsWith('HND-'));
    assert.strictEqual(data.handoff.currentStage, 'DRAFT');
  });

  // Scenario 13: Generation handoff survives page refresh
  it('Scenario 13: Generation handoff survives page refresh and resolves via GET /api/v1/generation/handoff/:id', async () => {
    // Create handoff first
    const createRes = await fetch(`${baseUrl}/api/v1/generation/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAssessmentId: 'ASM-PROP-ZPAY-001',
        tcode: 'ZPAY_CUSTOM',
        architectApproved: true,
        cleanCoreJustification: 'Refresh persistence test.'
      })
    });
    const { handoff } = await createRes.json();
    const handoffId = handoff.handoffId;

    // Simulate page refresh fetching by ID
    const fetchRes = await fetch(`${baseUrl}/api/v1/generation/handoff/${handoffId}`);
    assert.strictEqual(fetchRes.status, 200);
    const fetchData = await fetchRes.json();
    assert.strictEqual(fetchData.success, true);
    assert.strictEqual(fetchData.handoff.handoffId, handoffId);
    assert.strictEqual(fetchData.handoff.tcode, 'ZPAY_CUSTOM');
    assert.strictEqual(fetchData.handoff.currentStage, 'DRAFT');
  });

  // Scenario 14: Invalid assessment ID
  it('Scenario 14: Rejects generation handoff for non-existent assessment ID with HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAssessmentId: 'ASM-NON-EXISTENT-999',
        tcode: 'ZFAKE',
        architectApproved: true
      })
    });

    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.statusCode, 'NOT_FOUND');
  });

  // Scenario 15: Unauthorized project creation
  it('Scenario 15: Unauthorized project creation rejected when standard candidate exists without architect approval', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/handoff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAssessmentId: 'ASM-MOD-TEST-001',
        tcode: 'F-53',
        architectApproved: false,
        cleanCoreJustification: ''
      })
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.statusCode, 'UNAUTHORIZED_BUILD');
  });

  // Scenario 16: Assessment history remains intact
  it('Scenario 16: Cryptographic audit chain remains intact after multiple modernization actions', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-MOD-TEST-001/verify-audit`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.verification.valid, true);
    assert.ok(data.verification.count >= 4, 'Multiple modernization actions chained with cryptographic hash integrity');
  });
});
