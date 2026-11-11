/**
 * FioriX — Generation Studio Phase 1 Master Regression Test Suite (P1-A, P1-B, P1-C)
 *
 * Covers:
 * 1. Create standalone project with local workspace indicator
 * 2. Create project from valid approved BUILD assessment handoff
 * 3. Reject non-BUILD assessment (ADOPT / CONFIGURE / REVIEW)
 * 4. Reject unapproved assessment (lacking architect sign-off)
 * 5. Reject missing/non-existent assessment
 * 6. Reject invalid project contract (missing fields, illegal types)
 * 7. Update project metadata and specifications
 * 8. Reject updates to archived projects
 * 9. Duplicate project with new ID and fresh activity history
 * 10. Archive project and record transition history
 * 11. Restore archived project back to DRAFT
 * 12. Delete project safely (with artifact confirmation safeguards)
 * 13. Idempotent BUILD handoff (returns existing project on duplicate handoff)
 * 14. Backend restart persistence (data survives fresh server instantiation)
 * 15. Concurrent project updates without race conditions or file corruption
 * 16. Corrupt project file detection and backup recovery
 * 17. Invalid project ID rejection (regex enforcement)
 * 18. Path traversal attempt rejection
 * 19. Invalid lifecycle transitions rejected (cannot jump directly to GENERATED)
 * 20. Source assessment record remains completely immutable and unmutated
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
import { LIFECYCLE_STATUSES } from '../src/generation/contracts/generationProjectContract.js';

describe('Generation Studio Phase 1 — Workspace Foundation, Project Management & Build Handoff', () => {
  let server;
  let baseUrl;
  let testDir;
  let testAssessmentPath;
  let testProjectsDir;
  let assessmentStore;
  let projectStore;
  let projectService;
  let originalFetch;
  let prevAdminSecret;

  const TEST_ADMIN_SECRET = 'TEST_ADMIN_PHASE1_SECRET';

  const approvedBuildAssessment = {
    id: 'ASM-BUILD-TEST-001',
    tcode: 'ME21N',
    systemId: 'S21',
    client: '200',
    targetRelease: 'SAP S/4HANA 2023 On-Premise',
    businessArea: 'Sourcing and Procurement',
    classification: 'STANDARD',
    fitGapScore: 28,
    status: 'APPROVED',
    lifecycleStatus: 'APPROVED',
    assessmentResult: 'CUSTOM_RAP_REQUIRED',
    description: 'Create Purchase Order Modernization',
    programName: 'SAPMM06E',
    packageName: 'ME',
    softwareComponent: 'S4CORE 108',
    recommendation: {
      outcome: 'BUILD',
      rationale: 'High custom dynpro complexity and material functional gaps require custom RAP application.',
      outstandingChecks: ['Subcontracting BAdI migration', 'Clean Core Tier 2 compliance']
    },
    creatorName: 'Dr. Marcus Weber',
    author: 'Dr. Marcus Weber',
    leadArchitectApproval: {
      approved: true,
      approver: 'Dr. Marcus Weber',
      approverId: 'USR-ARCH-001',
      timestamp: '2026-11-10T12:00:00Z',
      justification: 'Approved custom RAP application due to proprietary purchasing extensions.'
    }
  };

  const adoptAssessment = {
    id: 'ASM-ADOPT-TEST-002',
    tcode: 'F-53',
    systemId: 'S21',
    client: '200',
    targetRelease: 'SAP S/4HANA 2023',
    businessArea: 'Financial Accounting',
    classification: 'STANDARD',
    fitGapScore: 88,
    status: 'APPROVED',
    lifecycleStatus: 'APPROVED',
    assessmentResult: 'EXPLICIT_SUCCESSOR',
    recommendation: {
      outcome: 'ADOPT',
      rationale: 'Standard Fiori app F0773 is a 100% match.'
    }
  };

  const unapprovedBuildAssessment = {
    id: 'ASM-BUILD-UNAPPROVED-003',
    tcode: 'VA01',
    systemId: 'S21',
    client: '200',
    targetRelease: 'SAP S/4HANA 2023',
    businessArea: 'Sales and Distribution',
    classification: 'STANDARD',
    fitGapScore: 30,
    status: 'PENDING_REVIEW',
    lifecycleStatus: 'PENDING_REVIEW',
    assessmentResult: 'CUSTOM_RAP_REQUIRED',
    recommendation: {
      outcome: 'BUILD',
      rationale: 'Custom pricing engine requires RAP.'
    },
    creatorName: 'Dr. Marcus Weber',
    author: 'Dr. Marcus Weber',
    leadArchitectApproval: {
      approved: false
    }
  };

  before(async () => {
    prevAdminSecret = process.env.FIORIX_ADMIN_SECRET;
    process.env.FIORIX_ADMIN_SECRET = TEST_ADMIN_SECRET;
    originalFetch = global.fetch;
    global.fetch = async (url, options = {}) => {
      const headers = {
        'x-fiorix-admin-secret': TEST_ADMIN_SECRET,
        ...(options.headers || {})
      };
      return originalFetch(url, { ...options, headers });
    };

    testDir = path.join(os.tmpdir(), `fiorix-gen-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });

    testAssessmentPath = path.join(testDir, 'assessments.json');
    testProjectsDir = path.join(testDir, 'generation-projects');

    assessmentStore = new AssessmentStore({ storagePath: testAssessmentPath });
    projectStore = new GenerationProjectStore(testProjectsDir);
    projectService = new GenerationProjectService({
      projectStore,
      assessmentStore
    });

    server = createServer({
      assessmentStore,
      generationProjectStore: projectStore,
      generationProjectService: projectService
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Seed test assessments
    await assessmentStore.create(approvedBuildAssessment);
    await assessmentStore.create(adoptAssessment);
    await assessmentStore.create(unapprovedBuildAssessment);
  });

  after(async () => {
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    if (prevAdminSecret !== undefined) {
      process.env.FIORIX_ADMIN_SECRET = prevAdminSecret;
    } else {
      delete process.env.FIORIX_ADMIN_SECRET;
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // ignore cleanup
    }
  });

  // 1. Create Standalone Project
  it('1. POST /api/v1/generation/projects creates a standalone project with local workspace indicator', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: 'Internal Billing Reconciliation Tool',
        description: 'Standalone billing tool for local testing',
        origin: 'STANDALONE',
        targetRelease: 'SAP S/4HANA 2023 On-Premise'
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.project.origin, 'STANDALONE');
    assert.strictEqual(data.project.sourceAssessmentId, null);
    assert.strictEqual(data.project.sourceTransactionCode, null);
    assert.strictEqual(data.project.lifecycleStatus, 'DRAFT');
    assert.strictEqual(data.project.currentPhase, 'PHASE_1_WORKSPACE');
    assert.strictEqual(data.project.schemaVersion, '1.0.0');
    assert.strictEqual(data.project.activityHistory.length, 1);
  });

  // 2. Create Project from Approved BUILD Assessment
  it('2. POST /api/v1/generation/projects creates project from valid approved BUILD assessment handoff', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAssessmentId: 'ASM-BUILD-TEST-001',
        origin: 'DISCOVERY_BUILD'
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.project.origin, 'DISCOVERY_BUILD');
    assert.strictEqual(data.project.sourceAssessmentId, 'ASM-BUILD-TEST-001');
    assert.strictEqual(data.project.sourceTransactionCode, 'ME21N');
    assert.strictEqual(data.project.assessmentContext.businessDomain, 'Sourcing and Procurement');
    assert.strictEqual(data.project.assessmentContext.programName, 'SAPMM06E');
    assert.strictEqual(data.project.assessmentContext.approvalProvenance.approver, 'Dr. Marcus Weber');
  });

  // 3. Reject Non-BUILD Assessment
  it('3. POST /api/v1/generation/projects rejects non-BUILD assessment (ADOPT outcome) with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAssessmentId: 'ASM-ADOPT-TEST-002',
        origin: 'DISCOVERY_BUILD'
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.match(data.errorMessage, /approved BUILD recommendation/);
  });

  // 4. Reject Unapproved Assessment
  it('4. POST /api/v1/generation/projects rejects unapproved BUILD assessment with HTTP 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAssessmentId: 'ASM-BUILD-UNAPPROVED-003',
        origin: 'DISCOVERY_BUILD'
      })
    });

    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.match(data.errorMessage, /Enterprise Architect approval/);
  });

  // 5. Reject Missing Assessment
  it('5. POST /api/v1/generation/projects rejects missing assessment ID with HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAssessmentId: 'ASM-NON-EXISTENT-404',
        origin: 'DISCOVERY_BUILD'
      })
    });

    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // 6. Reject Invalid Project Payload
  it('6. POST /api/v1/generation/projects rejects invalid payload (empty projectName for standalone) with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: 'STANDALONE',
        projectName: ''
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // 7. Update Project Metadata
  it('7. PATCH /api/v1/generation/projects/:id updates project description and target release', async () => {
    // List projects to grab existing
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects`);
    const listData = await listRes.json();
    const targetProject = listData.projects[0];

    const patchRes = await fetch(`${baseUrl}/api/v1/generation/projects/${targetProject.projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Updated project description from test suite',
        targetRelease: 'SAP S/4HANA 2023 Feature Pack 01'
      })
    });

    assert.strictEqual(patchRes.status, 200);
    const patched = await patchRes.json();
    assert.strictEqual(patched.project.description, 'Updated project description from test suite');
    assert.strictEqual(patched.project.targetRelease, 'SAP S/4HANA 2023 Feature Pack 01');
    assert.strictEqual(patched.project.specificationVersion, 2);
  });

  // 8. Duplicate Project
  it('8. POST /api/v1/generation/projects/:id/duplicate creates a distinct duplicate with fresh activity history', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects`);
    const listData = await listRes.json();
    const sourceProject = listData.projects[0];

    const dupRes = await fetch(`${baseUrl}/api/v1/generation/projects/${sourceProject.projectId}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        newProjectName: 'Cloned Purchasing Workflow'
      })
    });

    assert.strictEqual(dupRes.status, 201);
    const dupData = await dupRes.json();
    assert.strictEqual(dupData.project.projectName, 'Cloned Purchasing Workflow');
    assert.notStrictEqual(dupData.project.projectId, sourceProject.projectId);
    assert.strictEqual(dupData.project.lifecycleStatus, 'DRAFT');
  });

  // 9. Archive Project
  it('9. POST /api/v1/generation/projects/:id/archive transitions project to ARCHIVED state', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects`);
    const listData = await listRes.json();
    const targetProject = listData.projects[0];

    const archiveRes = await fetch(`${baseUrl}/api/v1/generation/projects/${targetProject.projectId}/archive`, {
      method: 'POST'
    });

    assert.strictEqual(archiveRes.status, 200);
    const archived = await archiveRes.json();
    assert.strictEqual(archived.project.lifecycleStatus, 'ARCHIVED');

    // Attempting to PATCH archived project should fail with HTTP 409
    const patchRes = await fetch(`${baseUrl}/api/v1/generation/projects/${targetProject.projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Should fail on archived project' })
    });
    assert.strictEqual(patchRes.status, 409);
  });

  // 10. Restore Project
  it('10. POST /api/v1/generation/projects/:id/restore restores archived project back to DRAFT', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects?lifecycleStatus=ARCHIVED`);
    const listData = await listRes.json();
    const archivedProject = listData.projects[0];

    const restoreRes = await fetch(`${baseUrl}/api/v1/generation/projects/${archivedProject.projectId}/restore`, {
      method: 'POST'
    });

    assert.strictEqual(restoreRes.status, 200);
    const restored = await restoreRes.json();
    assert.strictEqual(restored.project.lifecycleStatus, 'DRAFT');
  });

  // 11. Delete Project
  it('11. DELETE /api/v1/generation/projects/:id deletes project safely', async () => {
    // Create a temporary project to delete
    const createRes = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: 'Temporary Delete Candidate',
        origin: 'STANDALONE'
      })
    });
    const created = await createRes.json();
    const delId = created.project.projectId;

    const delRes = await fetch(`${baseUrl}/api/v1/generation/projects/${delId}?confirmed=true`, {
      method: 'DELETE'
    });

    assert.strictEqual(delRes.status, 200);

    // Verify it is gone
    const getRes = await fetch(`${baseUrl}/api/v1/generation/projects/${delId}`);
    assert.strictEqual(getRes.status, 404);
  });

  // 12. Idempotent BUILD Handoff
  it('12. Repeated handoff for same assessment returns existing project rather than duplicate', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceAssessmentId: 'ASM-BUILD-TEST-001',
        origin: 'DISCOVERY_BUILD'
      })
    });

    // Should return HTTP 200 with alreadyExists: true
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.alreadyExists, true);
    assert.strictEqual(data.project.sourceAssessmentId, 'ASM-BUILD-TEST-001');
  });

  // 13. Backend Restart Persistence
  it('13. Projects survive a complete backend restart from cold storage', async () => {
    // Instantiate completely new store from same storage directory
    const coldStore = new GenerationProjectStore(testProjectsDir);
    const coldService = new GenerationProjectService({ projectStore: coldStore, assessmentStore });

    const coldList = await coldService.listProjects();
    assert.ok(coldList.total >= 2);
    const me21nProject = coldList.projects.find((p) => p.sourceAssessmentId === 'ASM-BUILD-TEST-001');
    assert.ok(me21nProject);
    assert.strictEqual(me21nProject.sourceTransactionCode, 'ME21N');
  });

  // 14. Concurrent Project Updates
  it('14. Concurrent updates serialize safely without race condition data corruption', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects`);
    const listData = await listRes.json();
    const projId = listData.projects[0].projectId;

    const updates = Array.from({ length: 5 }, (_, i) =>
      fetch(`${baseUrl}/api/v1/generation/projects/${projId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: `Concurrent update ${i}` })
      })
    );

    const results = await Promise.all(updates);
    for (const res of results) {
      assert.strictEqual(res.status, 200);
    }

    const finalRes = await fetch(`${baseUrl}/api/v1/generation/projects/${projId}`);
    const finalData = await finalRes.json();
    assert.ok(finalData.project.specificationVersion >= 6);
  });

  // 15. Corrupt Project File Recovery
  it('15. Recovers corrupted project file gracefully from .bak backup', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects`);
    const listData = await listRes.json();
    const projId = listData.projects[0].projectId;

    const projectFile = path.join(testProjectsDir, projId, 'project.json');
    const backupFile = `${projectFile}.bak`;

    // Ensure backup exists
    assert.ok(fs.existsSync(backupFile));

    // Intentionally corrupt main file
    fs.writeFileSync(projectFile, '{ CORRUPTED_GARBAGE_DATA <<<', 'utf8');

    // Retrieve via service
    const recovered = await projectService.getProject(projId);
    assert.ok(recovered);
    assert.strictEqual(recovered.projectId, projId);
  });

  // 16. Invalid Project ID
  it('16. Rejects invalid project ID characters with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/INVALID*PROJECT*ID!`);
    assert.strictEqual(res.status, 400);
  });

  // 17. Path Traversal Attempts
  it('17. Rejects path traversal attempts with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/..%2F..%2Fetc%2Fpasswd`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
  });

  // 18. Invalid Lifecycle Transitions
  it('18. Rejects direct jump to GENERATED or EXPORTED in Phase 1 with HTTP 400', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects`);
    const listData = await listRes.json();
    const projId = listData.projects[0].projectId;

    const patchRes = await fetch(`${baseUrl}/api/v1/generation/projects/${projId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lifecycleStatus: 'GENERATED'
      })
    });

    assert.strictEqual(patchRes.status, 400);
    const patchData = await patchRes.json();
    assert.strictEqual(patchData.success, false);
    assert.match(patchData.errorMessage, /Cannot transition to "GENERATED"/);
  });

  // 19. Source Assessment Remains Unchanged
  it('19. Verifies source assessment remains completely immutable and unmutated after project creation', async () => {
    const original = await assessmentStore.getById('ASM-BUILD-TEST-001');
    assert.strictEqual(original.status, 'APPROVED');
    assert.strictEqual(original.tcode, 'ME21N');
    assert.strictEqual(original.recommendation.outcome, 'BUILD');
  });

  // 20. Project Activity History & Data-Driven Summary
  it('20. GET /activity and /summary return real data-driven telemetry', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects`);
    const listData = await listRes.json();
    const projId = listData.projects[0].projectId;

    const actRes = await fetch(`${baseUrl}/api/v1/generation/projects/${projId}/activity`);
    assert.strictEqual(actRes.status, 200);
    const actData = await actRes.json();
    assert.ok(actData.count >= 1);

    const sumRes = await fetch(`${baseUrl}/api/v1/generation/projects/${projId}/summary`);
    assert.strictEqual(sumRes.status, 200);
    const sumData = await sumRes.json();
    assert.strictEqual(sumData.summary.projectId, projId);
    assert.strictEqual(sumData.summary.completedPhaseCount, 1); // Phase 1 complete, remaining 7 pending
    assert.strictEqual(sumData.summary.progressPercentage, 13); // 1 / 8 = 12.5% -> 13%
  });
});
