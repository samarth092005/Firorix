import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import DatabasePool from '../src/infrastructure/db/pool.js';
import { createServer } from '../src/server.js';
import { fioriMatchingEngine } from '../src/engine/fioriMatchingEngine.js';
import { DEFAULT_SCORING_WEIGHTS } from '../src/engine/fitGapAssessmentEngine.js';
import { BUSINESS_OUTCOMES, GOVERNANCE_STATES } from '../src/engine/recommendationEngine.js';

test('Fiorify S6 — Unified Modernization Workspace End-to-End Lifecycle Suite', async (t) => {
  process.env.FIORIFY_ALLOW_EMBEDDED_PG = 'true';
  const pool = await DatabasePool.getPool();
  assert.ok(pool, 'PostgreSQL pool must be active');

  const testTenant = `TENANT-S6-${Date.now().toString().slice(-6)}`;
  const server = createServer({ useDatabase: true, tenantId: testTenant });
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  let executionId = null;
  let testAssessmentId = `ASM-S6-${Date.now().toString().slice(-6)}`;

  // Helper HTTP request function
  const makeRequest = ({ path, method = 'GET', body = null, headers = {} }) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const defaultHeaders = {
        'x-tenant-id': testTenant,
        'x-fiorify-admin-secret': 'dev-admin-secret-change-in-production',
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers
      };

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: defaultHeaders
      }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : null;
            resolve({ status: res.statusCode, body: parsed });
          } catch {
            resolve({ status: res.statusCode, body: rawData });
          }
        });
      });

      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  t.after(async () => {
    try {
      await pool.query('DELETE FROM fit_gap_dimensions WHERE assessment_id = $1;', [testAssessmentId]);
      await pool.query('DELETE FROM assessment_audit_events WHERE assessment_id = $1;', [testAssessmentId]);
      await pool.query('DELETE FROM assessments WHERE id = $1 OR tenant_id = $2;', [testAssessmentId, testTenant]);
      await pool.query('DELETE FROM transaction_technical_objects WHERE tenant_id = $1;', [testTenant]);
      if (executionId) {
        await pool.query('DELETE FROM transaction_discovery_executions WHERE id = $1;', [executionId]);
      }
      await pool.query('DELETE FROM transaction_discovery_executions WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM transaction_master_records WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM sap_system_profiles WHERE tenant_id = $1;', [testTenant]);
      await pool.query('DELETE FROM tenants WHERE tenant_id = $1;', [testTenant]);
    } catch {}
    await new Promise((resolve) => server.close(resolve));
    await DatabasePool.close();
  });

  // 1. System Selection
  await t.test('1. System Selection: Lists registered SAP systems for modernization workspace', async () => {
    const res = await makeRequest({ path: '/api/v1/systems' });
    assert.equal(res.status, 200);
    const systemsList = Array.isArray(res.body) ? res.body : (res.body?.systems || []);
    assert.ok(Array.isArray(systemsList));
    assert.ok(systemsList.length > 0, 'Registered SAP systems must include baseline profiles');

    const s21 = systemsList.find((s) => s.systemId === 'S21' || s.systemId === 'S21-200');
    assert.ok(s21, 'System S21 or S21-200 must be present in system registry');
    assert.equal(s21.client, '200');
  });

  // 2. Discovery: Trigger batch discovery execution and retrieve discovered transactions
  await t.test('2. Discovery: Trigger batch discovery execution and retrieve discovered transactions', async () => {
    // 2a. Trigger batch discovery execution
    const triggerRes = await makeRequest({
      path: '/api/v1/discovery/executions',
      method: 'POST',
      body: {
        systemProfileId: 'S21-200-SYS',
        scope: 'STANDARD',
        initiatedBy: 'Lead Architect'
      }
    });

    assert.equal(triggerRes.status, 201);
    assert.equal(triggerRes.body.success, true);
    assert.ok(triggerRes.body.execution);
    assert.equal(triggerRes.body.execution.status, 'COMPLETED');
    executionId = triggerRes.body.execution.id;

    // 2b. Query discovered transactions list
    const txListRes = await makeRequest({ path: '/api/v1/discovery/transactions?limit=10' });
    assert.equal(txListRes.status, 200);
    assert.equal(txListRes.body.success, true);
    assert.ok(Array.isArray(txListRes.body.transactions));
    assert.ok(txListRes.body.transactions.length > 0);

    // 2c. Query single transaction details
    const txDetailRes = await makeRequest({ path: '/api/v1/discovery/transactions/F-53' });
    assert.equal(txDetailRes.status, 200);
    assert.equal(txDetailRes.body.success, true);
    assert.equal(txDetailRes.body.transaction.tcode, 'F-53');
    assert.ok(Array.isArray(txDetailRes.body.transaction.technicalObjects));
  });

  // 3. Fiori Matching & Candidate Search
  await t.test('3. Candidate Search & Matching: Matches standard Fiori apps for discovered transaction', async () => {
    const matchResult = await fioriMatchingEngine.match({
      transaction: {
        tcode: 'F-53',
        description: 'Post Outgoing Payments',
        packageName: 'FBAS',
        program: 'SAPMF05A'
      }
    });

    assert.ok(matchResult);
    assert.ok(Array.isArray(matchResult.rankedCandidates));
    assert.ok(matchResult.rankedCandidates.length > 0);

    const topCandidate = matchResult.rankedCandidates[0];
    assert.ok(topCandidate.appId);
    assert.ok(topCandidate.appName);
    assert.ok(topCandidate.overallScore > 50);
  });

  // 4. Fit-Gap Assessment with 5 Dimensions
  await t.test('4. Fit-Gap Assessment: Evaluates candidate against 5 dimensions and persists breakdown', async () => {
    const assessRes = await makeRequest({
      path: '/api/v1/fitgap/assess',
      method: 'POST',
      body: {
        requirement: {
          id: 'REQ-S6-01',
          title: 'Post Outgoing Payments',
          businessProcess: 'Finance',
          capabilities: ['POST_PAYMENT', 'CLEAR_INVOICE']
        },
        candidate: {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori elements',
          odataServices: ['FAP_PAYMENT_POST_SRV'],
          businessRole: 'AP_ACCOUNTANT'
        },
        context: {
          systemId: 'S21',
          client: '200',
          systemRelease: 'SAP S/4HANA 2023 On-Premise'
        }
      }
    });

    assert.equal(assessRes.status, 200);
    assert.equal(assessRes.body.success, true);
    assert.ok(assessRes.body.assessment);
    assert.ok(assessRes.body.assessment.scoringBreakdown);

    const breakdown = assessRes.body.assessment.scoringBreakdown;
    assert.equal(breakdown.weights.functional, 0.35);
    assert.equal(breakdown.weights.technical, 0.25);
    assert.equal(breakdown.weights.process, 0.15);
    assert.equal(breakdown.weights.activationAndRoles, 0.15);
    assert.equal(breakdown.weights.compatibility, 0.10);
  });

  // 5. Governed Modernization Recommendation
  await t.test('5. Governed Recommendation: Formulates ADD_AND_CONFIGURE outcome and eliminates EXTEND', async () => {
    const recRes = await makeRequest({
      path: '/api/v1/fitgap/recommend',
      method: 'POST',
      body: {
        requirement: {
          id: 'REQ-S6-REC-01',
          title: 'Post Outgoing Payments for Suppliers',
          statement: 'Post vendor payments and clear open supplier invoices directly.',
          tcode: 'F-53',
          requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING']
        },
        candidate: {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori elements',
          productVersion: 'SAP S/4HANA 2023',
          supportedCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
          odataDependencies: ['FAP_PAYMENT_POST_SRV']
        },
        context: {
          targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
          activeServices: ['FAP_PAYMENT_POST_SRV'],
          userAuthorizations: ['ACCOUNTS PAYABLE ACCOUNTANT']
        }
      }
    });

    assert.equal(recRes.status, 200);
    assert.equal(recRes.body.success, true);
    assert.ok(recRes.body.recommendation);
    assert.equal(recRes.body.recommendation.outcome, BUSINESS_OUTCOMES.ADD_AND_CONFIGURE);
    assert.notEqual(recRes.body.recommendation.outcome, 'EXTEND', 'EXTEND outcome must be completely eliminated');
  });

  // 6. Modernization Governance & Persistence in PostgreSQL
  await t.test('6. Governance & Persistence: Stores assessment in PostgreSQL with audit events', async () => {
    const createRes = await makeRequest({
      path: '/api/v1/assessments',
      method: 'POST',
      body: {
        id: testAssessmentId,
        tcode: 'F-53',
        description: 'Modernization workspace integration assessment',
        businessArea: 'Finance',
        systemId: 'S21',
        client: '200',
        targetRelease: 'SAP S/4HANA 2023 On-Premise',
        matchingFioriApp: { appId: 'F1612', appName: 'Post Outgoing Payments', matchScore: 92 },
        recommendation: {
          action: 'ADD_AND_CONFIGURE',
          confidence: 'HIGH',
          justification: 'F1612 perfectly covers supplier payment postings.'
        },
        verificationStatus: 'VERIFIED_COMPLETE',
        lifecycleStatus: 'COMPLETED',
        fitGapScore: 94,
        scoreCoverage: 100,
        gapsCount: 0,
        readinessState: 'REVIEW',
        scoringBreakdown: {
          functionalScore: 95,
          technicalScore: 92,
          processScore: 100,
          activationAndRolesScore: 90,
          compatibilityScore: 95,
          weights: DEFAULT_SCORING_WEIGHTS
        }
      }
    });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    assert.equal(createRes.body.assessment.id, testAssessmentId);

    // Retrieve single assessment
    const getRes = await makeRequest({ path: `/api/v1/assessments/${testAssessmentId}` });
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.success, true);
    assert.equal(getRes.body.assessment.id, testAssessmentId);
    assert.equal(getRes.body.assessment.readinessState, 'REVIEW');
    assert.equal(getRes.body.assessment.scoringBreakdown.functionalScore, 95);

    // Retrieve audit events
    const auditRes = await makeRequest({ path: `/api/v1/assessments/${testAssessmentId}/audit` });
    assert.equal(auditRes.status, 200);
    assert.equal(auditRes.body.success, true);
    assert.ok(Array.isArray(auditRes.body.auditEvents));
    assert.ok(auditRes.body.auditEvents.length > 0, 'Audit event must be logged on creation');
  });

  // 7. Live Overview Metrics Summary from PostgreSQL
  await t.test('7. Overview Metrics: Retrieves aggregated modernization metrics from PostgreSQL', async () => {
    const sumRes = await makeRequest({ path: '/api/v1/assessments/summary' });
    assert.equal(sumRes.status, 200);
    assert.equal(sumRes.body.success, true);
    assert.ok(sumRes.body.summary);

    const summary = sumRes.body.summary;
    assert.ok(typeof summary.totalAssessments === 'number');
    assert.ok(summary.totalAssessments >= 1, 'Summary must reflect persisted assessments in PostgreSQL');
    assert.ok(typeof summary.averageFitGapScore === 'number');
    assert.ok(summary.averageFitGapScore > 0);
  });
});
