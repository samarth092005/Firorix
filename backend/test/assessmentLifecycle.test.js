import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore, LIFECYCLE_STATES } from '../src/services/assessmentStore.js';
import { RECOMMENDATION_OUTCOMES } from '../src/engine/recommendationEngine.js';

describe('Fiorify PERSIST-02 & REC-01 — Lifecycle, Audit History & Recommendations Integration', () => {
  let server;
  let baseUrl;
  let testStoragePath;
  let assessmentStore;

  const samplePayload = {
    tcode: 'ME51N',
    systemId: 'S21-200',
    client: '200',
    targetRelease: 'SAP S/4HANA 2023',
    businessArea: 'Sourcing and Procurement',
    classification: 'STANDARD',
    fitGapScore: 92,
    status: 'RECOMMENDATION_COMPLETED',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    matchingFioriApp: {
      appId: 'F1643',
      appName: 'Manage Purchase Requisitions',
      appType: 'SAP Fiori elements',
      uiTechnology: 'SAP Fiori elements',
      releaseCompatibility: 'COMPATIBLE',
      sourceLabel: 'Official SAP Fiori Apps Reference Library'
    },
    recommendation: {
      outcome: 'ADOPT',
      rationale: 'Standard application satisfies all procurement requirements.',
      actionableRemediationPlan: [
        {
          step: 1,
          title: 'Assign Purchaser Role',
          responsibleRole: 'Security / Authorizations Team',
          priority: 'HIGH'
        }
      ]
    }
  };

  before(async () => {
    testStoragePath = path.join(
      os.tmpdir(),
      `Fiorify-test-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
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

  let createdId = null;

  it('1. POST /api/v1/assessments creates record with initial audit trail event', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(samplePayload)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.assessment);
    createdId = body.assessment.id;

    assert.strictEqual(body.assessment.lifecycleStatus, LIFECYCLE_STATES.RECOMMENDATION_COMPLETED);
    assert.ok(Array.isArray(body.assessment.auditEvents));
    assert.strictEqual(body.assessment.auditEvents.length, 1);
    assert.strictEqual(body.assessment.auditEvents[0].action, 'CREATED');
  });

  it('2. PUT /api/v1/assessments/:id advances lifecycle state to PENDING_REVIEW with audit log', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: LIFECYCLE_STATES.PENDING_REVIEW,
        author: 'Lead Architect',
        comment: 'Submitting assessment for architectural board approval.'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.assessment.lifecycleStatus, LIFECYCLE_STATES.PENDING_REVIEW);

    assert.strictEqual(body.assessment.auditEvents.length, 2);
    const lastEvent = body.assessment.auditEvents[1];
    assert.strictEqual(lastEvent.previousState, LIFECYCLE_STATES.RECOMMENDATION_COMPLETED);
    assert.strictEqual(lastEvent.newState, LIFECYCLE_STATES.PENDING_REVIEW);
    assert.strictEqual(lastEvent.author, 'Lead Architect');
  });

  it('3. PUT /api/v1/assessments/:id rejects illegal state transitions with HTTP 400', async () => {
    // Current state is PENDING_REVIEW; illegal to jump back to DRAFT or directly to DISCOVERY_COMPLETED
    const res = await fetch(`${baseUrl}/api/v1/assessments/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: 'DISCOVERY_COMPLETED'
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'INVALID_STATE_TRANSITION');
  });

  it('4. PUT /api/v1/assessments/:id advances to APPROVED from PENDING_REVIEW', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: LIFECYCLE_STATES.APPROVED,
        author: 'Enterprise Architecture Board',
        comment: 'Formally approved for production migration.'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.assessment.lifecycleStatus, LIFECYCLE_STATES.APPROVED);
    assert.strictEqual(body.assessment.auditEvents.length, 3);
  });

  it('5. GET /api/v1/assessments/:id/audit returns full chronological audit events', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/${createdId}/audit`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.assessmentId, createdId);
    assert.strictEqual(body.count, 3);
    assert.strictEqual(body.auditEvents[0].action, 'CREATED');
    assert.strictEqual(body.auditEvents[2].newState, 'APPROVED');
  });

  it('6. POST /api/v1/assessments/:id/archive archives the assessment record', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/${createdId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author: 'Compliance Officer',
        comment: 'Archived following successful deployment.'
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.statusCode, 'ARCHIVED');
    assert.strictEqual(body.assessment.lifecycleStatus, 'ARCHIVED');

    // Verify it is excluded from standard list unless includeArchived=true
    const listRes1 = await fetch(`${baseUrl}/api/v1/assessments`);
    const listBody1 = await listRes1.json();
    assert.ok(!listBody1.assessments.some((a) => a.id === createdId));

    const listRes2 = await fetch(`${baseUrl}/api/v1/assessments?includeArchived=true`);
    const listBody2 = await listRes2.json();
    assert.ok(listBody2.assessments.some((a) => a.id === createdId));
  });

  it('7. POST /api/v1/recommendations/generate formulates governed recommendation via HTTP API', async () => {
    const res = await fetch(`${baseUrl}/api/v1/recommendations/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': 'corr-rec-api-test'
      },
      body: JSON.stringify({
        requirement: {
          id: 'REQ-FI-001',
          title: 'Post Outgoing Payments',
          tcode: 'F-53',
          requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
          requiredOperations: ['PostPayment']
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
              availableOperations: ['PostPayment'],
              isAliasVerified: true
            }
          ]
        },
        context: {
          targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
          activeServices: ['FAP_PAYMENT_POST_SRV'],
          userAuthorizations: ['ACCOUNTS PAYABLE ACCOUNTANT']
        }
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('X-Correlation-ID'), 'corr-rec-api-test');

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.outcome, RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE);
    assert.ok(body.recommendation);
    assert.ok(body.recommendation.actionableRemediationPlan.length > 0);
    assert.strictEqual(body.recommendation.riskAssessment.overallRisk, 'LOW');
  });

  it('8. POST /api/v1/recommendations/generate rejects invalid empty request with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/recommendations/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'BAD_REQUEST');
  });
});
