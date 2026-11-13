import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';

describe('Fiorify PERSIST-01 — Backend Assessment Persistence Store', () => {
  let server;
  let baseUrl;
  let testStoragePath;
  let assessmentStore;

  const sampleFitGapEvaluation = {
    functionalFit: {
      status: 'PARTIAL_FIT',
      score: 67,
      verifiedCapabilities: ['Post Payment', 'Clear Invoices'],
      unverifiedCapabilities: [],
      missingCapabilities: ['Cash Discount'],
      rationale: 'Verified 2 of 3 required capabilities. 1 missing, 0 unverified.'
    },
    technicalFit: {
      status: 'VERIFIED_FIT',
      score: 100,
      declaredServices: ['FAP_PAYMENT_POST_SRV'],
      verifiedServices: ['FAP_PAYMENT_POST_SRV'],
      missingServices: [],
      verifiedOperations: ['PostPayment', 'SimulatePayment'],
      missingOperations: [],
      rationale: 'Verified 1 of 1 declared OData services and 2 of 2 required operations.'
    },
    processFit: {
      status: 'VERIFIED_FIT',
      score: 100,
      rationale: 'Process alignment confirmed for "Financial Accounting".'
    },
    activation: {
      status: 'VERIFIED_FIT',
      score: 100,
      rationale: 'Application backend service is active and registered in target Gateway catalog.'
    },
    authorization: {
      status: 'VERIFIED_FIT',
      score: 100,
      declaredRoles: ['Accounts Payable Accountant'],
      rationale: 'User has verified authorization for required business role.'
    },
    compatibility: {
      status: 'VERIFIED_FIT',
      score: 100,
      rationale: 'Application compatible with target release (S4CORE 108).'
    },
    customization: {
      status: 'VERIFIED_FIT',
      score: 100,
      rationale: 'No conflicting legacy screen customizations detected.'
    },
    evidenceCompleteness: {
      status: 'VERIFIED_FIT',
      score: 80,
      confidence: 'HIGH',
      verifiedEvidenceCount: 4,
      totalEvidenceCount: 5,
      completenessRatio: 0.8,
      rationale: 'Evidence completeness: 80%.'
    }
  };

  const sampleRecommendation = {
    verdict: 'RECOMMENDED_WITH_GAPS',
    rationale: 'Candidate "Post Outgoing Payments" (F1612) covers primary requirements, but Cash Discount requires attention.',
    nextActions: [
      'Conduct detailed business process walkthrough of identified gaps with stakeholders.',
      'Evaluate companion applications (e.g. F1367).'
    ]
  };

  const sampleEvidence = [
    {
      evidenceId: 'EVD-FUNC-F1612',
      evidenceType: 'FUNCTIONAL_METADATA',
      source: 'https://fal.cloud.sap/apps/F1612',
      retrievedValue: 'Verified: [Post Payment, Clear Invoices]',
      verificationStatus: 'VERIFIED_CATALOGUE',
      confidence: 'HIGH',
      explanation: 'Evaluated 3 required business capabilities.'
    },
    {
      evidenceId: 'EVD-TECH-F1612',
      evidenceType: 'ODATA_METADATA',
      source: 'Target SAP S21 Gateway Catalog & $metadata',
      retrievedValue: 'Active Services: [FAP_PAYMENT_POST_SRV]',
      verificationStatus: 'VERIFIED_LIVE',
      confidence: 'HIGH',
      explanation: 'Evaluated 1 OData services and 2 required backend operations.'
    }
  ];

  before(async () => {
    // Create an isolated temporary test storage file
    testStoragePath = path.join(
      os.tmpdir(),
      `Fiorify-test-assessments-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
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
    // Clean up temporary test files
    try {
      if (fs.existsSync(testStoragePath)) {
        fs.unlinkSync(testStoragePath);
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // 1. Creating an assessment
  it('1. creates and persists an assessment record with HTTP 201', async () => {
    const payload = {
      tcode: 'F-53',
      systemId: 'S21-200',
      client: '200',
      targetRelease: 'SAP S/4HANA 2023',
      businessArea: 'Financial Accounting',
      classification: 'STANDARD',
      fitGapScore: 85,
      assessmentResult: 'EXPLICIT_SUCCESSOR',
      matchingFioriApp: {
        appId: 'F0773',
        appName: 'Manage Outgoing Payments',
        appType: 'SAP Fiori elements',
        uiTechnology: 'SAP Fiori elements',
        releaseCompatibility: 'COMPATIBLE',
        sourceLabel: 'Official SAP Fiori Apps Reference Library'
      },
      assessment: {
        assessmentId: 'ASM-TEST-F53-INITIAL',
        overallStatus: 'VERIFIED_FIT',
        overallScore: 85,
        dimensionResults: sampleFitGapEvaluation,
        recommendation: sampleRecommendation,
        evidenceReferences: sampleEvidence,
        identifiedGaps: [
          {
            gapId: 'GAP-TEST-1',
            description: 'Secondary gap in special payment forms',
            category: 'FUNCTIONAL_CAPABILITY',
            severity: 'MINOR'
          }
        ]
      }
    };

    const res = await fetch(`${baseUrl}/api/v1/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.statusCode, 'CREATED');
    assert.ok(body.assessment);
    assert.strictEqual(body.assessment.id, 'ASM-TEST-F53-INITIAL');
    assert.strictEqual(body.assessment.tcode, 'F-53');
    assert.strictEqual(body.assessment.systemId, 'S21-200');
    assert.strictEqual(body.assessment.client, '200');
    assert.strictEqual(body.assessment.targetRelease, 'SAP S/4HANA 2023');
    assert.strictEqual(body.assessment.businessArea, 'Financial Accounting');
    assert.strictEqual(body.assessment.classification, 'STANDARD');
    assert.strictEqual(body.assessment.fitGapScore, 85);
    assert.strictEqual(body.assessment.matchingFioriApp.appId, 'F0773');
    assert.strictEqual(body.assessment.gapsCount, 1);
    assert.ok(body.assessment.createdAt);
    assert.ok(body.assessment.updatedAt);
  });

  // 2. Retrieving the saved assessment
  it('2. retrieves the saved assessment by ID with complete structure', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-TEST-F53-INITIAL`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.assessment);
    assert.strictEqual(body.assessment.id, 'ASM-TEST-F53-INITIAL');
    assert.strictEqual(body.assessment.tcode, 'F-53');
    assert.strictEqual(body.assessment.matchingFioriApp.appId, 'F0773');
    assert.strictEqual(body.assessment.fitGapScore, 85);
  });

  // 3. Listing multiple assessments
  it('3. lists multiple assessment records with count', async () => {
    // Add two more assessments
    await fetch(`${baseUrl}/api/v1/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'ASM-TEST-F28',
        tcode: 'F-28',
        systemId: 'S21-200',
        businessArea: 'Financial Accounting',
        status: 'COMPLETED',
        assessmentResult: 'EXPLICIT_SUCCESSOR',
        fitGapScore: 92,
        matchingFioriApp: { appId: 'F1345', appName: 'Post Incoming Payments' }
      })
    });

    await fetch(`${baseUrl}/api/v1/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'ASM-TEST-VA01',
        tcode: 'VA01',
        systemId: 'S21-200',
        businessArea: 'Sales and Distribution',
        status: 'IN_PROGRESS',
        assessmentResult: 'PARTIAL_FIT',
        fitGapScore: 65,
        matchingFioriApp: { appId: 'F1814', appName: 'Create Sales Orders' }
      })
    });

    const res = await fetch(`${baseUrl}/api/v1/assessments`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.count, 3);
    assert.strictEqual(body.assessments.length, 3);
  });

  // 4. Filtering by status
  it('4. filters assessments by status correctly', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments?status=IN_PROGRESS`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.count, 1);
    assert.strictEqual(body.assessments[0].tcode, 'VA01');
    assert.strictEqual(body.assessments[0].status, 'IN_PROGRESS');
  });

  // 5. Filtering by business area
  it('5. filters assessments by business area', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments?businessArea=Sales%20and%20Distribution`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.count, 1);
    assert.strictEqual(body.assessments[0].tcode, 'VA01');
    assert.strictEqual(body.assessments[0].businessArea, 'Sales and Distribution');
  });

  // 6. Searching assessment records
  it('6. searches assessment records across tcode, description, and candidate app', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments?search=incoming`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.count, 1);
    assert.strictEqual(body.assessments[0].tcode, 'F-28');
  });

  // 7. Returning 404 for unknown IDs
  it('7. returns HTTP 404 for unknown assessment IDs', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/NON-EXISTENT-ASM-999`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'NOT_FOUND');
    assert.ok(body.errorMessage.includes('NON-EXISTENT-ASM-999'));
  });

  // 8. Persisting across server restarts
  it('8. assessment records survive a complete backend server restart', async () => {
    // 1. Close current server
    await new Promise((resolve) => server.close(resolve));

    // 2. Start a completely new server instance pointing to the same storage file
    const restartedStore = new AssessmentStore({ storagePath: testStoragePath });
    const restartedServer = createServer({ assessmentStore: restartedStore });

    let restartedPort;
    await new Promise((resolve) => {
      restartedServer.listen(0, () => {
        restartedPort = restartedServer.address().port;
        resolve();
      });
    });

    try {
      // 3. Verify all records survived the restart
      const res = await fetch(`http://127.0.0.1:${restartedPort}/api/v1/assessments`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.count, 3);

      const f53 = await fetch(`http://127.0.0.1:${restartedPort}/api/v1/assessments/ASM-TEST-F53-INITIAL`);
      assert.strictEqual(f53.status, 200);
      const f53Body = await f53.json();
      assert.strictEqual(f53Body.assessment.tcode, 'F-53');
      assert.strictEqual(f53Body.assessment.fitGapScore, 85);
    } finally {
      // 4. Close restarted server and restore original server for subsequent tests
      await new Promise((resolve) => restartedServer.close(resolve));
      server = createServer({ assessmentStore });
      await new Promise((resolve) => {
        server.listen(0, () => {
          const port = server.address().port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });
    }
  });

  // 9. Preserving all eight Fit-Gap dimensions
  it('9. preserves all eight Fit-Gap dimensions without data loss', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-TEST-F53-INITIAL`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const dims = body.assessment.dimensionResults;

    assert.ok(dims, 'dimensionResults must be present');
    assert.ok(dims.functionalFit, 'Dimension 1: functionalFit must exist');
    assert.strictEqual(dims.functionalFit.score, 67);
    assert.strictEqual(dims.functionalFit.status, 'PARTIAL_FIT');

    assert.ok(dims.technicalFit, 'Dimension 2: technicalFit must exist');
    assert.strictEqual(dims.technicalFit.score, 100);

    assert.ok(dims.processFit, 'Dimension 3: processFit must exist');
    assert.strictEqual(dims.processFit.score, 100);

    assert.ok(dims.activation, 'Dimension 4: activation must exist');
    assert.strictEqual(dims.activation.score, 100);

    assert.ok(dims.authorization, 'Dimension 5: authorization must exist');
    assert.strictEqual(dims.authorization.score, 100);

    assert.ok(dims.compatibility, 'Dimension 6: compatibility must exist');
    assert.strictEqual(dims.compatibility.score, 100);

    assert.ok(dims.customization, 'Dimension 7: customization must exist');
    assert.strictEqual(dims.customization.score, 100);

    assert.ok(dims.evidenceCompleteness, 'Dimension 8: evidenceCompleteness must exist');
    assert.strictEqual(dims.evidenceCompleteness.score, 80);
    assert.strictEqual(dims.evidenceCompleteness.confidence, 'HIGH');
  });

  // 10. Preserving evidence and recommendation
  it('10. preserves evidence references, identified gaps, and recommendation', async () => {
    const res = await fetch(`${baseUrl}/api/v1/assessments/ASM-TEST-F53-INITIAL`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    const assess = body.assessment;

    // Recommendation
    assert.ok(assess.recommendation);
    assert.strictEqual(assess.recommendation.verdict, 'RECOMMENDED_WITH_GAPS');
    assert.ok(assess.recommendation.rationale.includes('F1612'));
    assert.strictEqual(assess.recommendation.nextActions.length, 2);

    // Evidence References
    assert.ok(Array.isArray(assess.evidenceReferences));
    assert.strictEqual(assess.evidenceReferences.length, 2);
    assert.strictEqual(assess.evidenceReferences[0].evidenceId, 'EVD-FUNC-F1612');

    // Identified Gaps
    assert.ok(Array.isArray(assess.identifiedGaps));
    assert.strictEqual(assess.identifiedGaps.length, 1);
    assert.strictEqual(assess.identifiedGaps[0].gapId, 'GAP-TEST-1');
  });

  // 11. Handling invalid payloads
  it('11. returns HTTP 400 Bad Request on invalid payloads', async () => {
    // Missing all identifiers
    const resEmpty = await fetch(`${baseUrl}/api/v1/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.strictEqual(resEmpty.status, 400);
    const bodyEmpty = await resEmpty.json();
    assert.strictEqual(bodyEmpty.statusCode, 'BAD_REQUEST');
    assert.ok(bodyEmpty.errorMessage.includes('requires at least one identifier'));

    // Invalid score
    const resScore = await fetch(`${baseUrl}/api/v1/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tcode: 'ME21N', fitGapScore: -15 })
    });
    assert.strictEqual(resScore.status, 400);

    // Accidental overwrite protection (HTTP 409 Conflict)
    const resConflict = await fetch(`${baseUrl}/api/v1/assessments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ASM-TEST-F53-INITIAL', tcode: 'F-53' })
    });
    assert.strictEqual(resConflict.status, 409);
    const bodyConflict = await resConflict.json();
    assert.strictEqual(bodyConflict.statusCode, 'CONFLICT');
    assert.ok(bodyConflict.errorMessage.includes('already exists'));
  });

  // 12. Handling storage failures (corrupted JSON)
  it('12. does not silently wipe corrupted data and returns controlled error', async () => {
    const corruptPath = path.join(
      os.tmpdir(),
      `Fiorify-corrupt-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    // Write corrupted JSON to disk
    fs.writeFileSync(corruptPath, '{"brokenJson": true, unexpected_eof:');

    const corruptStore = new AssessmentStore({ storagePath: corruptPath });
    const corruptServer = createServer({ assessmentStore: corruptStore });

    let corruptPort;
    await new Promise((resolve) => {
      corruptServer.listen(0, () => {
        corruptPort = corruptServer.address().port;
        resolve();
      });
    });

    try {
      const res = await fetch(`http://127.0.0.1:${corruptPort}/api/v1/assessments`);
      assert.strictEqual(res.status, 500);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.statusCode, 'INTERNAL_ERROR');

      // Invariant: The corrupt file was NOT wiped or replaced with []
      const fileAfter = fs.readFileSync(corruptPath, 'utf8');
      assert.ok(fileAfter.includes('unexpected_eof:'), 'Corrupted file must NOT be silently wiped');
    } finally {
      await new Promise((resolve) => corruptServer.close(resolve));
      try {
        fs.unlinkSync(corruptPath);
      } catch {
        // Ignore
      }
    }
  });

  // 13. Handling concurrent writes without data loss
  it('13. safely handles rapid concurrent writes without data loss', async () => {
    const concurrentPath = path.join(
      os.tmpdir(),
      `Fiorify-concurrent-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );

    const concurrentStore = new AssessmentStore({ storagePath: concurrentPath });
    const concurrentServer = createServer({ assessmentStore: concurrentStore });

    let concurrentPort;
    await new Promise((resolve) => {
      concurrentServer.listen(0, () => {
        concurrentPort = concurrentServer.address().port;
        resolve();
      });
    });

    try {
      const writePromises = [];
      const totalWrites = 12;

      for (let i = 1; i <= totalWrites; i++) {
        const payload = {
          id: `ASM-CONCURRENT-${i}`,
          tcode: `TCODE_${i}`,
          businessArea: 'Concurrent Operations',
          fitGapScore: 70 + i,
          assessmentResult: i % 2 === 0 ? 'VERIFIED_FIT' : 'PARTIAL_FIT'
        };

        writePromises.push(
          fetch(`http://127.0.0.1:${concurrentPort}/api/v1/assessments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          })
        );
      }

      const results = await Promise.all(writePromises);
      for (const res of results) {
        assert.strictEqual(res.status, 201);
      }

      // Verify all 12 records are present and none were overwritten
      const listRes = await fetch(`http://127.0.0.1:${concurrentPort}/api/v1/assessments`);
      assert.strictEqual(listRes.status, 200);
      const listBody = await listRes.json();
      assert.strictEqual(listBody.count, totalWrites);

      // Verify operational summary calculation
      const summaryRes = await fetch(`http://127.0.0.1:${concurrentPort}/api/v1/assessments/summary`);
      assert.strictEqual(summaryRes.status, 200);
      const summaryBody = await summaryRes.json();
      assert.strictEqual(summaryBody.success, true);
      assert.strictEqual(summaryBody.summary.totalAssessed, totalWrites);
      assert.ok(summaryBody.summary.averageFitGapScore > 0);
      assert.strictEqual(summaryBody.summary.verifiedMatchesCount, totalWrites);
    } finally {
      await new Promise((resolve) => concurrentServer.close(resolve));
      try {
        fs.unlinkSync(concurrentPath);
      } catch {
        // Ignore
      }
    }
  });
});
