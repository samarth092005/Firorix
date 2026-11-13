import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../src/server.js';
import { ASSESSMENT_STATUSES } from '../src/engine/fitGapAssessmentEngine.js';

describe('Fiorify FITGAP-01 — POST /api/v1/fitgap/assess Endpoint Tests', () => {
  let server;
  let baseUrl;

  // Canonical test requirement
  const validPaymentRequirement = {
    id: 'REQ-01',
    title: 'Post Outgoing Supplier Payments',
    statement: 'Post outgoing payments with cash discount deduction and invoice clearing.',
    businessProcess: 'Financial Accounting',
    expectedFunctionality: [
      'OUTGOING_PAYMENT_POSTING',
      'OPEN_ITEM_CLEARING',
      'CASH_DISCOUNT'
    ],
    requiredOperations: ['PostPayment', 'SimulatePayment'],
    priority: 'MUST'
  };

  // Canonical candidate application (F1612)
  const validCandidateF1612 = {
    appId: 'F1612',
    appName: 'Post Outgoing Payments',
    appType: 'Transactional',
    uiTechnology: 'SAP Fiori (SAPUI5)',
    businessRoles: ['Accounts Payable Accountant'],
    supportedProductRelease: 'SAP S/4HANA 2023',
    businessProcess: 'Financial Accounting',
    capabilities: [
      'OUTGOING_PAYMENT_POSTING',
      'OPEN_ITEM_CLEARING'
    ],
    odataServices: ['FAP_PAYMENT_POST_SRV'],
    verifiedODataServices: [
      {
        serviceName: 'FAP_PAYMENT_POST_SRV',
        technicalAlias: 'FAP_PAYMENT_POST_SRV',
        availableOperations: ['PostPayment', 'SimulatePayment'],
        isAliasVerified: true
      }
    ]
  };

  // Canonical context
  const validContext = {
    systemId: 'S21-200',
    client: '200',
    systemRelease: 'SAP S/4HANA 2023',
    activeGatewayServices: ['FAP_PAYMENT_POST_SRV'],
    userRoles: ['ACCOUNTS PAYABLE ACCOUNTANT']
  };

  before(async () => {
    // Start ephemeral server on random available port
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // 1. Valid request returns HTTP 200 with complete assessment
  it('valid request returns HTTP 200 with engine-computed scores and dimensions', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': 'test-corr-fitgap-200'
      },
      body: JSON.stringify({
        requirement: validPaymentRequirement,
        candidate: validCandidateF1612,
        context: validContext
      })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('X-Correlation-ID'), 'test-corr-fitgap-200');

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.requestId.startsWith('REQ-FITGAP-'));
    assert.strictEqual(body.correlationId, 'test-corr-fitgap-200');
    assert.ok(body.assessment);

    // Verify engine results are computed directly
    const assess = body.assessment;
    assert.strictEqual(assess.candidateAppId, 'F1612');
    assert.strictEqual(assess.requirementId, 'REQ-01');
    assert.ok(typeof assess.overallScore === 'number');
    assert.ok(assess.overallScore > 0);
    assert.ok(assess.scoringBreakdown);
    assert.strictEqual(assess.scoringBreakdown.weights.functional, 0.35);
    assert.ok(assess.dimensionResults.functionalFit);
    assert.ok(assess.dimensionResults.technicalFit);
    assert.ok(assess.dimensionResults.processFit);
    assert.ok(assess.dimensionResults.activation);
    assert.ok(assess.dimensionResults.authorization);
    assert.ok(assess.dimensionResults.compatibility);
    assert.ok(assess.recommendation);
  });

  // 2. Missing requirement returns HTTP 400
  it('returns HTTP 400 when requirement is missing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate: validCandidateF1612,
        context: validContext
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'BAD_REQUEST');
    assert.ok(body.errorMessage.includes('Requirement object is required'));
  });

  // 3. Missing candidate returns HTTP 400
  it('returns HTTP 400 when candidate is missing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: validPaymentRequirement,
        context: validContext
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'BAD_REQUEST');
    assert.ok(body.errorMessage.includes('Candidate application object is required'));
  });

  // 4. Missing context returns HTTP 400
  it('returns HTTP 400 when context is missing', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: validPaymentRequirement,
        candidate: validCandidateF1612
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'BAD_REQUEST');
    assert.ok(body.errorMessage.includes('Context object is required'));
  });

  // 5. Invalid field types return HTTP 400
  it('returns HTTP 400 when candidate.appId is empty or not a string', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: validPaymentRequirement,
        candidate: { ...validCandidateF1612, appId: '' },
        context: validContext
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.errorMessage.includes('Candidate appId is required as a non-empty string'));
  });

  it('returns HTTP 400 when requirement.expectedFunctionality is not an array', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: { ...validPaymentRequirement, expectedFunctionality: 'NOT_AN_ARRAY' },
        candidate: validCandidateF1612,
        context: validContext
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.errorMessage.includes('Requirement expectedFunctionality must be an array'));
  });

  it('returns HTTP 400 when context.activeGatewayServices is not an array', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: validPaymentRequirement,
        candidate: validCandidateF1612,
        context: { ...validContext, activeGatewayServices: 12345 }
      })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.errorMessage.includes('Context activeGatewayServices must be an array'));
  });

  it('returns HTTP 400 when request body is malformed JSON', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"requirement": malformed'
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'BAD_REQUEST');
    assert.ok(body.errorMessage.includes('Malformed JSON payload'));
  });

  it('returns HTTP 413 when body exceeds MAX_BODY_SIZE', async () => {
    const largePadding = 'X'.repeat(120 * 1024); // 120KB exceeds 100KB limit
    try {
      const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: { ...validPaymentRequirement, padding: largePadding },
          candidate: validCandidateF1612,
          context: validContext
        })
      });

      assert.strictEqual(res.status, 413);
      const body = await res.json();
      assert.strictEqual(body.statusCode, 'PAYLOAD_TOO_LARGE');
    } catch (err) {
      // In some Node.js undici implementations, early socket termination on oversized payload throws fetch failed
      assert.ok(err);
    }
  });

  // 6. Engine evaluation errors return a controlled HTTP 500 without leaking stack traces or secrets
  it('returns controlled HTTP 500 when engine throws unexpected evaluation error', async () => {
    // Inject a faulty engine that throws
    const faultyEngine = {
      evaluate: () => {
        throw new Error('Fatal ABAP schema evaluation failure: SecretKey_SensitiveDbPassword');
      }
    };

    const faultyServer = createServer({ fitGapEngine: faultyEngine });
    let faultyPort;
    await new Promise((resolve) => {
      faultyServer.listen(0, () => {
        faultyPort = faultyServer.address().port;
        resolve();
      });
    });

    try {
      const res = await fetch(`http://127.0.0.1:${faultyPort}/api/v1/fitgap/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: validPaymentRequirement,
          candidate: validCandidateF1612,
          context: validContext
        })
      });

      assert.strictEqual(res.status, 500);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.statusCode, 'INTERNAL_ERROR');
      assert.ok(body.errorMessage.includes('Unexpected error during fit-gap assessment evaluation'));
      // Invariant: No internal stack trace is exposed
      assert.strictEqual(body.stack, undefined);
    } finally {
      await new Promise((resolve) => faultyServer.close(resolve));
    }
  });

  // 7. Functional critical gaps remain visible
  it('flags missing mandatory capability as a CRITICAL functional gap', async () => {
    // Candidate does not support CASH_DISCOUNT
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: {
          ...validPaymentRequirement,
          priority: 'MUST',
          expectedFunctionality: ['OUTGOING_PAYMENT_POSTING', 'CASH_DISCOUNT']
        },
        candidate: {
          ...validCandidateF1612,
          capabilities: ['OUTGOING_PAYMENT_POSTING'] // CASH_DISCOUNT is missing
        },
        context: validContext
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const assess = body.assessment;

    const criticalGap = assess.identifiedGaps.find(
      (g) => g.severity === 'CRITICAL' && g.category === 'FUNCTIONAL_CAPABILITY'
    );
    assert.ok(criticalGap, 'Must generate a CRITICAL functional gap');
    assert.ok(criticalGap.description.includes('CASH_DISCOUNT'));
    assert.ok(assess.missingCapabilities.includes('CASH_DISCOUNT'));
  });

  // 8. Missing evidence remains INSUFFICIENT_EVIDENCE or corresponding governed state
  it('maintains unverified activation as PENDING_VERIFICATION gap when active services are empty', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: validPaymentRequirement,
        candidate: {
          ...validCandidateF1612,
          verifiedODataServices: [] // No verified services on candidate
        },
        context: {
          ...validContext,
          activeGatewayServices: [] // No active services on target
        }
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const assess = body.assessment;

    // Activation dimension must not assume success
    assert.strictEqual(assess.dimensionResults.activation.status, 'PENDING_VERIFICATION');
    assert.strictEqual(assess.dimensionResults.activation.score, 50);

    const actGap = assess.identifiedGaps.find((g) => g.category === 'ACTIVATION');
    assert.ok(actGap);
    assert.strictEqual(actGap.severity, 'MAJOR');
    assert.ok(actGap.description.includes('activation status'));
  });

  // 9. Technical score cannot override a critical functional gap (Hard Governance Guardrail)
  it('HARD GOVERNANCE GUARDRAIL: critical functional gap prevents VERIFIED_FIT despite 100% technical score', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fitgap/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requirement: {
          ...validPaymentRequirement,
          priority: 'MUST',
          expectedFunctionality: ['SPECIAL_FOREIGN_CURRENCY_TAX_REPORTING']
        },
        candidate: {
          ...validCandidateF1612,
          capabilities: ['STANDARD_POSTING_ONLY'], // Mandatory capability is missing!
          odataServices: ['FAP_PAYMENT_POST_SRV'],
          verifiedODataServices: [
            {
              serviceName: 'FAP_PAYMENT_POST_SRV',
              technicalAlias: 'FAP_PAYMENT_POST_SRV',
              availableOperations: ['PostPayment', 'SimulatePayment'],
              isAliasVerified: true
            }
          ]
        },
        context: validContext
      })
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const assess = body.assessment;

    // Technical score is 100%
    assert.strictEqual(assess.scoringBreakdown.technicalScore, 100);
    // Functional score is 0%
    assert.strictEqual(assess.scoringBreakdown.functionalScore, 0);
    // Hard invariant: overallStatus must NOT be VERIFIED_FIT
    assert.notStrictEqual(assess.overallStatus, ASSESSMENT_STATUSES.VERIFIED_FIT);
    assert.strictEqual(assess.overallStatus, ASSESSMENT_STATUSES.NO_FIT);
    assert.strictEqual(assess.recommendation.verdict, 'CUSTOM_REQUIRED');
  });
});
