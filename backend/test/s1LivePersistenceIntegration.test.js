import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../src/server.js';
import { DatabasePool } from '../src/infrastructure/db/pool.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';
import { GenerationProjectStore } from '../src/generation/projects/generationProjectStore.js';
import { AssessmentRepository } from '../src/infrastructure/db/repositories/assessmentRepository.js';
import { GenerationProjectRepository } from '../src/infrastructure/db/repositories/generationProjectRepository.js';

process.env.Fiorify_ADMIN_SECRET = 'test-s1-admin-secret-2026';

function makeRequest(server, options, payload = null) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const reqOptions = {
      hostname: '127.0.0.1',
      port: addr.port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Fiorify-Admin-Secret': 'test-s1-admin-secret-2026',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
    req.end();
  });
}

test('Fiorify S1.4 — Live Persistence HTTP API Integration Tests (PostgreSQL)', async (t) => {
  // Ensure DB pool is connected and schema is ready
  process.env.Fiorify_ALLOW_EMBEDDED_PG = 'true';
  const originalSecret = process.env.Fiorify_ADMIN_SECRET;
  process.env.Fiorify_ADMIN_SECRET = 'test-s1-admin-secret-2026';
  const pool = await DatabasePool.getPool();
  assert.ok(pool, 'PostgreSQL pool must be available');

  const testTenant = 'TENANT-S1-LIVE-TEST';
  const testAssessmentId = `ASM-LIVE-S1-${Date.now()}`;
  const testProjectId = `GEN-LIVE-S1-${Date.now()}`;

  let server;
  let serverPort;

  const startServer = () => {
    return new Promise((resolve) => {
      const assessmentStore = new AssessmentStore({ useDatabase: true, tenantId: testTenant });
      const generationProjectStore = new GenerationProjectStore(undefined, { useDatabase: true, tenantId: testTenant });
      const srv = createServer({
        assessmentStore,
        generationProjectStore,
        tenantId: testTenant
      });
      srv.listen(0, '127.0.0.1', () => {
        resolve(srv);
      });
    });
  };

  const stopServer = (srv) => {
    return new Promise((resolve) => {
      srv.close(() => resolve());
    });
  };

  server = await startServer();
  serverPort = server.address().port;

  // Cleanup helper on exit
  t.after(async () => {
    process.env.Fiorify_ADMIN_SECRET = originalSecret;
    if (server) await stopServer(server);
    // Remove test records from DB cleanly
    await pool.query('DELETE FROM generation_artifacts WHERE project_id = $1;', [testProjectId]);
    await pool.query('DELETE FROM generation_specifications WHERE project_id = $1;', [testProjectId]);
    await pool.query('DELETE FROM generation_activity_events WHERE project_id = $1;', [testProjectId]);
    await pool.query('DELETE FROM generation_projects WHERE project_id = $1;', [testProjectId]);
    await pool.query('DELETE FROM assessment_audit_events WHERE assessment_id = $1;', [testAssessmentId]);
    await pool.query('DELETE FROM fit_gap_dimensions WHERE assessment_id = $1;', [testAssessmentId]);
    await pool.query('DELETE FROM assessments WHERE id = $1;', [testAssessmentId]);
  });

  // Step 1: Create test assessment via POST /api/v1/assessments
  await t.test('1. Create a test assessment via POST /api/v1/assessments', async () => {
    const res = await makeRequest(server, { method: 'POST', path: '/api/v1/assessments' }, {
      id: testAssessmentId,
      tcode: 'VA01',
      systemId: 'S21',
      client: '200',
      description: 'Live S1 Persistence Test for Sales Order Creation',
      businessArea: 'Sales and Distribution',
      fitGapScore: 82.5,
      recommendation: {
        action: 'BUILD',
        confidence: 'HIGH',
        justification: 'High fit score with critical functional gaps'
      },
      candidate: {
        appId: 'F1873',
        appName: 'Manage Sales Orders',
        matchScore: 88.0
      }
    });

    assert.equal(res.status, 201, `Expected HTTP 201, got ${res.status}: ${res.raw}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.assessment.id, testAssessmentId);
  });

  // Step 2: Retrieve it via GET /api/v1/assessments/:id
  await t.test('2. Retrieve the assessment via GET /api/v1/assessments/:id', async () => {
    const res = await makeRequest(server, { method: 'GET', path: `/api/v1/assessments/${testAssessmentId}` });
    assert.equal(res.status, 200, `Expected HTTP 200, got ${res.status}`);
    assert.equal(res.body.assessment.id, testAssessmentId);
    assert.equal(res.body.assessment.transactionCode, 'VA01');
    assert.equal(res.body.assessment.fitGapScore, 82.5);
  });

  // Step 3: Update its lifecycle to PENDING_REVIEW and APPROVED
  await t.test('3. Update lifecycle state to PENDING_REVIEW and APPROVED', async () => {
    const subRes = await makeRequest(
      server,
      { method: 'POST', path: `/api/v1/assessments/${testAssessmentId}/submit-review` },
      { comment: 'Ready for architecture governance' }
    );
    assert.equal(subRes.status, 200, `Submit failed: ${subRes.raw}`);
    assert.equal(subRes.body.assessment.lifecycleStatus, 'PENDING_REVIEW');

    const appRes = await makeRequest(
      server,
      { method: 'POST', path: `/api/v1/assessments/${testAssessmentId}/approve` },
      { comment: 'Approved for modernization project', isOverride: true }
    );
    assert.equal(appRes.status, 200, `Approve failed: ${appRes.raw}`);
    assert.equal(appRes.body.assessment.lifecycleStatus, 'APPROVED');
  });

  // Step 4: Verify audit history via GET /api/v1/assessments/:id/audit
  await t.test('4. Verify audit history and SHA-256 chain via GET /api/v1/assessments/:id/audit', async () => {
    const res = await makeRequest(server, { method: 'GET', path: `/api/v1/assessments/${testAssessmentId}/audit` });
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.auditEvents), 'Expected auditEvents array');
    assert.ok(res.body.auditEvents.length >= 2, 'Expected at least 2 audit events');

    const verifyRes = await makeRequest(server, { method: 'GET', path: `/api/v1/assessments/${testAssessmentId}/verify-audit` });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.success, true, 'Audit chain integrity must be valid');
  });

  // Step 5 & 6: Restart backend server and retrieve it again
  await t.test('5 & 6. Restart backend server and retrieve assessment again (persistence proof)', async () => {
    await stopServer(server);
    server = await startServer();

    const res = await makeRequest(server, { method: 'GET', path: `/api/v1/assessments/${testAssessmentId}` });
    assert.equal(res.status, 200, 'Assessment must survive server restart');
    assert.equal(res.body.assessment.id, testAssessmentId);
    assert.equal(res.body.assessment.lifecycleStatus, 'APPROVED');
  });

  // Step 7: Create a test Generation project via POST /api/v1/generation/projects
  await t.test('7. Create a test Generation project via POST /api/v1/generation/projects', async () => {
    const res = await makeRequest(server, { method: 'POST', path: '/api/v1/generation/projects' }, {
      projectId: testProjectId,
      projectName: 'Live S1 Modernization Project',
      origin: 'STANDALONE',
      sourceAssessmentId: testAssessmentId,
      sourceTransactionCode: 'VA01',
      sourceSystemId: 'S21',
      sourceClient: '200',
      description: 'Testing live PostgreSQL project persistence'
    });

    assert.equal(res.status, 201, `Project creation failed: ${res.raw}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.project.projectId, testProjectId);

    // Save specification
    const specRepo = new GenerationProjectRepository(pool);
    await specRepo.saveSpecification(testProjectId, 'REQUIREMENTS', 1, {
      items: [{ id: 'REQ-01', title: 'Order Header Validation' }]
    });

    // Save artifact
    await specRepo.saveArtifactRecord(testProjectId, {
      artifactName: 'SalesOrderRoot.cds',
      artifactType: 'CDS_VIEW',
      storageDriver: 'LOCAL_FS',
      storagePath: '/artifacts/SalesOrderRoot.cds',
      contentHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
      fileSizeBytes: 2048,
      metadata: { targetEntity: 'Z_I_SalesOrder' }
    });
  });

  // Step 8 & 9: Restart backend server and verify project and specifications
  await t.test('8 & 9. Restart backend server and verify project and specifications', async () => {
    await stopServer(server);
    server = await startServer();

    const res = await makeRequest(server, { method: 'GET', path: `/api/v1/generation/projects/${testProjectId}` });
    assert.equal(res.status, 200, `Project lookup failed: ${res.raw}`);
    assert.equal(res.body.project.projectId, testProjectId);
    assert.equal(res.body.project.projectName, 'Live S1 Modernization Project');
    assert.equal(res.body.project.sourceAssessmentId, testAssessmentId);

    const specRepo = new GenerationProjectRepository(pool);
    const spec = await specRepo.getSpecification(testProjectId, 'REQUIREMENTS');
    assert.ok(spec, 'Specification must survive restart');
    assert.equal(spec.spec_type, 'REQUIREMENTS');
    assert.equal(spec.spec_content.items[0].title, 'Order Header Validation');
  });

  // Step 10: Verify artifact metadata
  await t.test('10. Verify artifact metadata in PostgreSQL', async () => {
    const specRepo = new GenerationProjectRepository(pool);
    const artifacts = await specRepo.listArtifacts(testProjectId);
    assert.ok(Array.isArray(artifacts), 'Artifacts must be returned as array');
    assert.equal(artifacts.length, 1);
    assert.equal(artifacts[0].artifact_name, 'SalesOrderRoot.cds');
    assert.equal(artifacts[0].content_hash, 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90');
    assert.equal(Number(artifacts[0].file_size_bytes), 2048);
  });
});
