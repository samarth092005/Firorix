import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import DatabasePool from '../src/infrastructure/db/pool.js';
import {
  FitGapAssessmentEngine,
  DEFAULT_SCORING_WEIGHTS,
  fitGapAssessmentEngine
} from '../src/engine/fitGapAssessmentEngine.js';
import { FioriMatchingEngine, fioriMatchingEngine } from '../src/engine/fioriMatchingEngine.js';
import {
  RecommendationEngine,
  BUSINESS_OUTCOMES,
  GOVERNANCE_STATES,
  recommendationEngine
} from '../src/engine/recommendationEngine.js';
import { AssessmentRepository } from '../src/infrastructure/db/repositories/assessmentRepository.js';
import { createServer } from '../src/server.js';

test('Fiorify S5 — Fiori Matching and Fit-Gap Assessment Engine Test Suite', async (t) => {
  process.env.FIORIFY_ALLOW_EMBEDDED_PG = 'true';
  const pool = await DatabasePool.getPool();
  assert.ok(pool, 'PostgreSQL pool must be initialized');

  const testTenant = `TENANT-S5-${Date.now().toString().slice(-6)}`;
  const assessmentRepo = new AssessmentRepository(pool);
  const testAssessmentId = `ASM-S5-${Date.now().toString().slice(-6)}`;

  t.after(async () => {
    try {
      await pool.query('DELETE FROM fit_gap_dimensions WHERE assessment_id = $1;', [testAssessmentId]);
      await pool.query('DELETE FROM assessment_audit_events WHERE assessment_id = $1;', [testAssessmentId]);
      await pool.query('DELETE FROM assessments WHERE id = $1 OR tenant_id = $2;', [testAssessmentId, testTenant]);
      await pool.query('DELETE FROM tenants WHERE tenant_id = $1;', [testTenant]);
    } catch {}
    await DatabasePool.close();
  });

  await t.test('1. Exact 5 scoring dimensions and weights are verified', () => {
    assert.equal(DEFAULT_SCORING_WEIGHTS.functional, 0.35, 'Functional coverage must be 35%');
    assert.equal(DEFAULT_SCORING_WEIGHTS.technical, 0.25, 'Technical compatibility must be 25%');
    assert.equal(DEFAULT_SCORING_WEIGHTS.process, 0.15, 'Process alignment must be 15%');
    assert.equal(DEFAULT_SCORING_WEIGHTS.activationAndRoles, 0.15, 'Activation and roles must be 15%');
    assert.equal(DEFAULT_SCORING_WEIGHTS.compatibility, 0.10, 'Compatibility must be 10%');

    const totalWeight = Object.values(DEFAULT_SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.equal(Number(totalWeight.toFixed(2)), 1.00, 'Weights must sum to 100%');
  });

  await t.test('2. FitGapAssessmentEngine evaluates candidate and produces 5-dimension scoring breakdown', () => {
    const requirement = {
      id: 'REQ-FIN-001',
      title: 'Post Outgoing Payments for Suppliers',
      businessProcess: 'Finance',
      lineOfBusiness: 'Accounts Payable',
      capabilities: ['POST_PAYMENT', 'CLEAR_INVOICE'],
      targetRelease: 'SAP S/4HANA 2023 On-Premise'
    };

    const candidate = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori elements',
      businessProcess: 'Finance',
      lineOfBusiness: 'Finance',
      productVersion: 'SAP S/4HANA 2023',
      odataServices: ['FAP_PAYMENT_POST_SRV'],
      businessRole: 'AP_ACCOUNTANT'
    };

    const assessment = fitGapAssessmentEngine.evaluate({ requirement, candidate });
    assert.ok(assessment);
    assert.ok(assessment.scoringBreakdown);
    assert.equal(typeof assessment.scoringBreakdown.functionalScore, 'number');
    assert.equal(typeof assessment.scoringBreakdown.technicalScore, 'number');
    assert.equal(typeof assessment.scoringBreakdown.processScore, 'number');
    assert.equal(typeof assessment.scoringBreakdown.activationAndRolesScore, 'number');
    assert.equal(typeof assessment.scoringBreakdown.compatibilityScore, 'number');
    assert.equal(assessment.scoringBreakdown.weights.functional, 0.35);
  });

  await t.test('3. FioriMatchingEngine ranks candidates from canonical catalogue for transaction F-53', async () => {
    const transaction = {
      tcode: 'F-53',
      description: 'Post Outgoing Payments',
      packageName: 'FBAS',
      program: 'SAPMF05A'
    };

    const matchResult = await fioriMatchingEngine.match({ transaction });
    assert.ok(matchResult);
    assert.ok(Array.isArray(matchResult.rankedCandidates));
    assert.ok(matchResult.rankedCandidates.length > 0, 'Must match at least one candidate for F-53');

    // First candidate should have high match score
    const top = matchResult.rankedCandidates[0];
    assert.ok(top.overallScore > 50);
  });

  await t.test('4. Two-outcome decision engine strictly allows only ADD_AND_CONFIGURE or BUILD', () => {
    // Check canonical business outcomes
    assert.deepStrictEqual(Object.keys(BUSINESS_OUTCOMES).sort(), ['ADD_AND_CONFIGURE', 'BUILD'].sort());
    assert.equal('EXTEND' in BUSINESS_OUTCOMES, false, 'EXTEND must be eliminated');

    // Check governance readiness states
    assert.deepStrictEqual(Object.keys(GOVERNANCE_STATES).sort(), ['INSUFFICIENT_EVIDENCE', 'PENDING_VERIFICATION', 'REVIEW'].sort());

    // Generate recommendation for high-fit assessment
    const highFitRec = recommendationEngine.generate({
      assessment: {
        overallStatus: 'VERIFIED_FIT',
        overallScore: 92,
        scoreCoverage: 100,
        identifiedGaps: []
      },
      candidate: { appId: 'F1612', appName: 'Post Outgoing Payments' },
      requirement: {
        id: 'REQ-01',
        title: 'Post Outgoing Payments for Suppliers',
        statement: 'Allow posting vendor payments directly in S/4HANA.'
      },
      context: { systemRelease: 'SAP S/4HANA 2023 On-Premise' }
    });

    assert.equal(highFitRec.outcome, BUSINESS_OUTCOMES.ADD_AND_CONFIGURE);

    // Generate recommendation for severe gap assessment with architect approval for build
    const candidateWithNoFit = {
      appId: 'F0842A',
      appName: 'Manage Purchase Orders',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori elements',
      productVersion: 'SAP S/4HANA 2023',
      businessProcess: 'Sourcing and Procurement',
      supportedCapabilities: ['PURCHASE_ORDER_CREATION']
    };

    const requirement = {
      id: 'REQ-01',
      title: 'Post Outgoing Payments',
      tcode: 'F-53',
      requiredCapabilities: ['OUTGOING_PAYMENT_POSTING', 'OPEN_ITEM_CLEARING'],
      requiredOperations: ['PostPayment'],
      priority: 'MANDATORY'
    };

    const fullyVerifiedContext = {
      targetSystem: { systemId: 'S21', release: 'SAP S/4HANA 2023' },
      activeServices: ['FAP_PAYMENT_POST_SRV'],
      userAuthorizations: ['ACCOUNTS PAYABLE ACCOUNTANT']
    };

    const noFitRec = recommendationEngine.generate({
      requirement,
      candidate: candidateWithNoFit,
      context: fullyVerifiedContext
    });

    assert.equal(noFitRec.outcome, BUSINESS_OUTCOMES.BUILD);
  });

  await t.test('5. AssessmentRepository persists and retrieves assessment with scoringBreakdown and readinessState in PostgreSQL', async () => {
    const assessmentData = {
      id: testAssessmentId,
      transactionCode: 'F-53',
      description: 'Vendor payment assessment test',
      businessArea: 'Finance',
      systemId: 'S21',
      client: '200',
      targetRelease: 'SAP S/4HANA 2023 On-Premise',
      matchingFioriApp: { appId: 'F1612', appName: 'Post Outgoing Payments', matchScore: 94 },
      recommendation: {
        action: 'ADD_AND_CONFIGURE',
        confidence: 'HIGH',
        justification: 'F1612 matches supplier payment requirements.'
      },
      verificationStatus: 'VERIFIED_COMPLETE',
      lifecycleStatus: 'DRAFT',
      fitGapScore: 91,
      scoreCoverage: 100,
      gapsCount: 0,
      evidenceConfidence: 'HIGH',
      provenance: 'ASSESSMENT_ENGINE',
      readinessState: 'REVIEW',
      scoringBreakdown: {
        functionalScore: 95,
        technicalScore: 90,
        processScore: 100,
        activationAndRolesScore: 85,
        compatibilityScore: 90,
        weights: DEFAULT_SCORING_WEIGHTS
      },
      dimensionResults: {
        functionalCoverage: { score: 95, status: 'VERIFIED_FIT' },
        technicalIntegration: { score: 90, status: 'VERIFIED_FIT' }
      }
    };

    const inserted = await assessmentRepo.create(assessmentData, testTenant);
    assert.ok(inserted);
    assert.equal(inserted.id, testAssessmentId);
    assert.equal(inserted.readinessState, 'REVIEW');
    assert.equal(inserted.scoringBreakdown.functionalScore, 95);
    assert.equal(inserted.fitGapScore, 91);
    assert.equal(inserted.recommendation.action, 'ADD_AND_CONFIGURE');
  });

  await t.test('6. HTTP APIs for Fit-Gap assess and assessments endpoint work end-to-end', async () => {
    const server = createServer({ useDatabase: true, tenantId: testTenant });
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // 1. POST /api/v1/fitgap/assess
      const assessReqBody = JSON.stringify({
        requirement: {
          id: 'REQ-API-01',
          title: 'Post Outgoing Payments API Test',
          businessProcess: 'Finance',
          capabilities: ['POST_PAYMENT']
        },
        candidate: {
          appId: 'F1612',
          appName: 'Post Outgoing Payments',
          appType: 'Transactional',
          uiTechnology: 'SAP Fiori elements',
          odataServices: ['FAP_PAYMENT_POST_SRV']
        },
        context: {
          systemId: 'S21',
          client: '200',
          systemRelease: 'SAP S/4HANA 2023 On-Premise'
        }
      });

      const assessRes = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: '/api/v1/fitgap/assess',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(assessReqBody)
          }
        }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.write(assessReqBody);
        req.end();
      });

      assert.equal(assessRes.status, 200);
      assert.equal(assessRes.body.success, true);
      assert.ok(assessRes.body.assessment);
      assert.ok(assessRes.body.assessment.scoringBreakdown);
      assert.equal(assessRes.body.assessment.scoringBreakdown.weights.functional, 0.35);

      // 2. GET /api/v1/assessments/:id
      const getAsmRes = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: '127.0.0.1',
          port,
          path: `/api/v1/assessments/${testAssessmentId}`,
          method: 'GET',
          headers: {
            'x-tenant-id': testTenant,
            'x-fiorify-admin-secret': 'dev-admin-secret-change-in-production'
          }
        }, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        });
        req.on('error', reject);
        req.end();
      });

      assert.equal(getAsmRes.status, 200);
      assert.equal(getAsmRes.body.success, true);
      assert.equal(getAsmRes.body.assessment.id, testAssessmentId);
      assert.equal(getAsmRes.body.assessment.readinessState, 'REVIEW');
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
