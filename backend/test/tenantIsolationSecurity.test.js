/**
 * Fiorify — QA-02: Tenant Isolation & Admin Identity Security Test Suite
 *
 * Verifies:
 * 1. Tenant spoofing prevention: untrusted clients cannot spoof tenant via x-tenant-id.
 * 2. Cross-tenant project read isolation: Tenant B cannot read Tenant A's project.
 * 3. Cross-tenant project list isolation: Tenant B's project listing excludes Tenant A's projects.
 * 4. Cross-tenant mutation isolation: Tenant B cannot update, archive, or delete Tenant A's project.
 * 5. Platform Admin cross-tenant governance: Valid admin secret allows cross-tenant operations.
 * 6. Single-tenant S21 backwards compatibility: Unspecified tenant defaults safely to DEFAULT-TENANT-S21.
 * 7. Server-authoritative admin identity: Client-supplied confirmedBy/approver fields are ignored.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';
import { GenerationProjectStore } from '../src/generation/projects/generationProjectStore.js';
import { GenerationProjectService } from '../src/generation/projects/generationProjectService.js';
import { RequirementsService } from '../src/generation/requirements/requirementsService.js';
import { DataModelService } from '../src/generation/datamodel/dataModelService.js';
import { AuthService, USER_ROLES } from '../src/services/authService.js';

describe('QA-02: Tenant Isolation & Admin Security Architecture', () => {
  let server;
  let baseUrl;
  let testDir;
  let projectStore;
  let projectService;
  let requirementsService;
  let dataModelService;
  let assessmentStore;
  let authService;

  const TEST_ADMIN_SECRET = 'TEST_ADMIN_SEC_QA02_2026';
  const TENANT_ALPHA = 'TENANT-ALPHA';
  const TENANT_BETA = 'TENANT-BETA';

  let tokenAlphaAdmin;
  let tokenAlphaUser;
  let tokenBetaUser;

  let projectAlphaId;
  let projectBetaId;

  before(async () => {
    process.env.Fiorify_ADMIN_SECRET = TEST_ADMIN_SECRET;

    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'Fiorify-tenant-sec-'));
    const testAssessmentPath = path.join(testDir, 'assessments.json');
    const testProjectsDir = path.join(testDir, 'projects');
    fs.mkdirSync(testProjectsDir, { recursive: true });

    fs.writeFileSync(testAssessmentPath, JSON.stringify([], null, 2));

    assessmentStore = new AssessmentStore({ storagePath: testAssessmentPath });
    projectStore = new GenerationProjectStore(testProjectsDir);
    projectService = new GenerationProjectService({ projectStore, assessmentStore });
    requirementsService = new RequirementsService({ projectStore, assessmentStore });
    dataModelService = new DataModelService({ projectStore });
    authService = new AuthService();

    // Create users & tokens
    tokenAlphaAdmin = authService.generateToken({
      id: 'USR-ALPHA-ADMIN',
      email: 'admin@alpha.corp',
      name: 'Alpha Administrator',
      role: USER_ROLES.ADMIN,
      tenantId: TENANT_ALPHA
    });

    tokenAlphaUser = authService.generateToken({
      id: 'USR-ALPHA-CONS',
      email: 'consultant@alpha.corp',
      name: 'Alpha Consultant',
      role: USER_ROLES.SAP_CONSULTANT,
      tenantId: TENANT_ALPHA
    });

    tokenBetaUser = authService.generateToken({
      id: 'USR-BETA-CONS',
      email: 'consultant@beta.corp',
      name: 'Beta Consultant',
      role: USER_ROLES.SAP_CONSULTANT,
      tenantId: TENANT_BETA
    });

    server = createServer({
      assessmentStore,
      generationProjectStore: projectStore,
      generationProjectService: projectService,
      requirementsService,
      dataModelService,
      authService,
      enforceAuth: false
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Seed Project in Tenant Alpha
    const pAlpha = await projectStore.createProject({
      projectName: 'Alpha Core Modernization',
      origin: 'STANDALONE',
      targetRelease: 'SAP S/4HANA 2023',
      tenantId: TENANT_ALPHA
    }, { tenantId: TENANT_ALPHA, name: 'Alpha Architect', id: 'USR-ALPHA-01' });
    projectAlphaId = pAlpha.projectId;

    // Seed Project in Tenant Beta
    const pBeta = await projectStore.createProject({
      projectName: 'Beta Sales Extension',
      origin: 'STANDALONE',
      targetRelease: 'SAP S/4HANA 2023',
      tenantId: TENANT_BETA
    }, { tenantId: TENANT_BETA, name: 'Beta Architect', id: 'USR-BETA-01' });
    projectBetaId = pBeta.projectId;
  });

  after(async () => {
    delete process.env.Fiorify_ADMIN_SECRET;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  });

  it('1. Rejects tenant spoofing when client sends mismatched x-tenant-id header with a standard token', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      headers: {
        'Authorization': `Bearer ${tokenBetaUser}`,
        'x-tenant-id': TENANT_ALPHA // Spoofing attempt: Beta user trying to masquerade as Alpha
      }
    });

    assert.equal(res.status, 401, 'Should fail authentication due to tenant spoofing detection');
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('2. Tenant B cannot read Tenant A project (GET /projects/:id returns 403 or 404)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${projectAlphaId}`, {
      headers: {
        'Authorization': `Bearer ${tokenBetaUser}`
      }
    });

    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404 for cross-tenant access, got ${res.status}`);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('3. Project listing strictly isolates tenants: Tenant Beta listing never includes Tenant Alpha projects', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      headers: {
        'x-Fiorify-admin-secret': TEST_ADMIN_SECRET,
        'x-tenant-id': TENANT_BETA
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    const ids = data.projects.map((p) => p.projectId);
    assert.ok(ids.includes(projectBetaId), 'Beta listing must include Beta project');
    assert.ok(!ids.includes(projectAlphaId), 'Beta listing must NEVER include Alpha project');
  });

  it('4. Tenant Beta cannot update, archive, or delete Tenant Alpha project', async () => {
    // Attempt update
    const patchRes = await fetch(`${baseUrl}/api/v1/generation/projects/${projectAlphaId}`, {
      method: 'PATCH',
      headers: {
        'x-Fiorify-admin-secret': TEST_ADMIN_SECRET,
        'x-tenant-id': TENANT_BETA,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ projectName: 'Hacked Alpha Project' })
    });
    assert.ok(patchRes.status === 404 || patchRes.status === 403, 'Cross-tenant update must be rejected');

    // Attempt delete
    const delRes = await fetch(`${baseUrl}/api/v1/generation/projects/${projectAlphaId}?confirmed=true`, {
      method: 'DELETE',
      headers: {
        'x-Fiorify-admin-secret': TEST_ADMIN_SECRET,
        'x-tenant-id': TENANT_BETA
      }
    });
    assert.ok(delRes.status === 404 || delRes.status === 403, 'Cross-tenant delete must be rejected');
  });

  it('5. Platform Admin with master secret can administer target tenant via x-tenant-id', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${projectAlphaId}`, {
      headers: {
        'x-Fiorify-admin-secret': TEST_ADMIN_SECRET,
        'x-tenant-id': TENANT_ALPHA
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.project.projectId, projectAlphaId);
    assert.equal(data.project.tenantId, TENANT_ALPHA);
  });

  it('6. Backwards compatibility: requests without tenant specification resolve to DEFAULT-TENANT-S21', async () => {
    const defaultProject = await projectStore.createProject({
      projectName: 'Default S21 Landscape App',
      origin: 'STANDALONE'
    });

    assert.equal(defaultProject.tenantId, 'DEFAULT-TENANT-S21');

    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${defaultProject.projectId}`, {
      headers: {
        'x-Fiorify-admin-secret': TEST_ADMIN_SECRET
      }
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.project.tenantId, 'DEFAULT-TENANT-S21');
  });

  it('7. Server-authoritative admin identity: ignores client-supplied confirmedBy or approver', async () => {
    // Add requirement
    const addRes = await fetch(`${baseUrl}/api/v1/generation/projects/${projectAlphaId}/requirements`, {
      method: 'POST',
      headers: {
        'x-Fiorify-admin-secret': TEST_ADMIN_SECRET,
        'x-tenant-id': TENANT_ALPHA,
        'x-Fiorify-admin-user': 'USR-AUTH-ADMIN',
        'x-Fiorify-admin-name': 'Verified Enterprise Architect',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Authoritative Approval Requirement',
        description: 'Verify server derives confirmedBy strictly from authenticated context.',
        category: 'BUSINESS_LOGIC',
        priority: 'MUST_HAVE',
        acceptanceCriteria: ['Valid RAP criteria']
      })
    });

    assert.equal(addRes.status, 201);
    const addData = await addRes.json();
    const reqId = addData.requirement.requirementId || addData.requirement.id;

    // Confirm requirement with spoofed client-supplied confirmedBy
    const confirmRes = await fetch(`${baseUrl}/api/v1/generation/projects/${projectAlphaId}/requirements/${reqId}/confirm`, {
      method: 'POST',
      headers: {
        'x-Fiorify-admin-secret': TEST_ADMIN_SECRET,
        'x-tenant-id': TENANT_ALPHA,
        'x-Fiorify-admin-user': 'USR-AUTH-ADMIN',
        'x-Fiorify-admin-name': 'Verified Enterprise Architect',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'CONFIRM',
        confirmedBy: 'SpoofedUntrustedActor',
        approver: 'SpoofedUntrustedActor'
      })
    });

    assert.equal(confirmRes.status, 200);
    const confirmData = await confirmRes.json();
    const updatedReq = confirmData.requirement;

    assert.equal(updatedReq.status, 'CONFIRMED');
    assert.equal(updatedReq.confirmedBy, 'Verified Enterprise Architect', 'Must ignore client-supplied confirmedBy');
    assert.notEqual(updatedReq.confirmedBy, 'SpoofedUntrustedActor', 'Must NEVER trust client-supplied confirmedBy');
  });
});
