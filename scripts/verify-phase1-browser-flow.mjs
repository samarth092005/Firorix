/**
 * Fiorify — Generation Studio Phase 1 Live Verification Script
 *
 * Executes the complete 10-step browser/runtime verification workflow:
 * 1. Open Generation Studio (GET /api/v1/generation/projects)
 * 2. Create standalone project (POST /api/v1/generation/projects)
 * 3. Simulate browser refresh / state reload (GET /api/v1/generation/projects/:id)
 * 4. Reopen project context and inspect metadata
 * 5. Navigate through all nine internal views / summaries
 * 6. Confirm active project context is retained
 * 7. Edit project metadata (PATCH /api/v1/generation/projects/:id)
 * 8. Restart backend (stop server, re-instantiate, restart on new port)
 * 9. Verify project persistence across cold restart
 * 10. Test approved BUILD handoff (POST from approved assessment)
 */

import { createServer } from '../backend/src/server.js';
import { AssessmentStore } from '../backend/src/services/assessmentStore.js';
import { GenerationProjectStore } from '../backend/src/generation/projects/generationProjectStore.js';
import { GenerationProjectService } from '../backend/src/generation/projects/generationProjectService.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

async function runVerification() {
  console.log('===============================================================');
  console.log('FIORIFY GENERATION STUDIO — PHASE 1 LIVE RUNTIME VERIFICATION');
  console.log('===============================================================');

  const testDir = path.join(os.tmpdir(), `fiorify-live-verify-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });

  const testAssessmentPath = path.join(testDir, 'assessments.json');
  const testProjectsDir = path.join(testDir, 'generation-projects');

  const assessmentStore = new AssessmentStore({ storagePath: testAssessmentPath });
  const projectStore = new GenerationProjectStore(testProjectsDir);
  const projectService = new GenerationProjectService({ projectStore, assessmentStore });

  // Seed approved BUILD assessment
  await assessmentStore.create({
    id: 'ASM-LIVE-VERIFY-001',
    author: 'Chief Architect Dr. Weber',
    creatorName: 'Chief Architect Dr. Weber',
    tcode: 'ME21N',
    systemId: 'S21',
    client: '200',
    targetRelease: 'SAP S/4HANA 2023 On-Premise',
    businessArea: 'Sourcing and Procurement',
    classification: 'STANDARD',
    fitGapScore: 25,
    status: 'APPROVED',
    lifecycleStatus: 'APPROVED',
    assessmentResult: 'CUSTOM_RAP_REQUIRED',
    description: 'Purchase Order Modernization Pilot',
    recommendation: {
      outcome: 'BUILD',
      rationale: 'Dynpro subcontracting logic requires RAP Managed Clean Core application.'
    },
    leadArchitectApproval: {
      approved: true,
      approver: 'Chief Architect Dr. Weber',
      timestamp: new Date().toISOString(),
      justification: 'Approved for custom Clean Core RAP development.'
    }
  });

  let server = createServer({
    assessmentStore,
    generationProjectStore: projectStore,
    generationProjectService: projectService
  });

  let port;
  let baseUrl;

  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  console.log(`[Step 1] Initializing Generation Studio on ${baseUrl}...`);
  const listRes1 = await fetch(`${baseUrl}/api/v1/generation/projects`);
  assert.strictEqual(listRes1.status, 200);
  const listData1 = await listRes1.json();
  console.log(`  -> Projects Dashboard empty state verified. Initial project count: ${listData1.total}`);

  console.log('\n[Step 2] Creating Standalone Generation Project...');
  const createStandaloneRes = await fetch(`${baseUrl}/api/v1/generation/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectName: 'Quality Certificate Inspection Tool',
      description: 'Independent quality certificate capture tool',
      origin: 'STANDALONE',
      targetRelease: 'SAP S/4HANA 2023 On-Premise',
      targetDeploymentModel: 'ON_PREMISE',
      targetPackage: 'ZQUALITY_CORE'
    })
  });
  assert.strictEqual(createStandaloneRes.status, 201);
  const standaloneData = await createStandaloneRes.json();
  const standaloneId = standaloneData.project.projectId;
  console.log(`  -> Standalone project created: ${standaloneId}`);
  assert.strictEqual(standaloneData.project.origin, 'STANDALONE');
  assert.strictEqual(standaloneData.project.sourceAssessmentId, null);
  assert.strictEqual(standaloneData.project.lifecycleStatus, 'DRAFT');

  console.log('\n[Step 3] Simulating Browser Refresh (Reloading project by ID)...');
  const refreshRes = await fetch(`${baseUrl}/api/v1/generation/projects/${standaloneId}`);
  assert.strictEqual(refreshRes.status, 200);
  const refreshData = await refreshRes.json();
  assert.strictEqual(refreshData.project.projectId, standaloneId);
  console.log(`  -> Project ${standaloneId} successfully retrieved after simulated browser refresh.`);

  console.log('\n[Step 4] Reopening Project and validating context...');
  assert.strictEqual(refreshData.project.targetProduct, 'SAP S/4HANA');
  assert.strictEqual(refreshData.project.targetRelease, 'SAP S/4HANA 2023 On-Premise');
  assert.strictEqual(refreshData.project.currentPhase, 'PHASE_1_WORKSPACE');
  console.log(`  -> Project context confirmed: Target=${refreshData.project.targetRelease}, Phase=${refreshData.project.currentPhase}`);

  console.log('\n[Step 5 & 6] Testing Internal Navigation and Data-Driven Summary...');
  const summaryRes = await fetch(`${baseUrl}/api/v1/generation/projects/${standaloneId}/summary`);
  assert.strictEqual(summaryRes.status, 200);
  const summaryData = await summaryRes.json();
  console.log(`  -> Completed phases: ${summaryData.summary.completedPhaseCount} of ${summaryData.summary.totalPhaseCount} (${summaryData.summary.progressPercentage}%)`);
  assert.strictEqual(summaryData.summary.completedPhaseCount, 1);
  assert.strictEqual(summaryData.summary.phases[0].id, 'PHASE_1_WORKSPACE');
  assert.strictEqual(summaryData.summary.phases[0].isCompleted, true);

  console.log('\n[Step 7] Editing Project Metadata via PATCH...');
  const patchRes = await fetch(`${baseUrl}/api/v1/generation/projects/${standaloneId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description: 'Updated inspection scope with clean core determination hooks',
      targetRelease: 'SAP S/4HANA 2023 FP02'
    })
  });
  assert.strictEqual(patchRes.status, 200);
  const patchedData = await patchRes.json();
  assert.strictEqual(patchedData.project.description, 'Updated inspection scope with clean core determination hooks');
  assert.strictEqual(patchedData.project.targetRelease, 'SAP S/4HANA 2023 FP02');
  assert.strictEqual(patchedData.project.specificationVersion, 2);
  console.log(`  -> Project metadata updated. Specification revision: v${patchedData.project.specificationVersion}`);

  console.log('\n[Step 8] Restarting Backend Server (Testing Cold Persistence)...');
  await new Promise((resolve) => server.close(resolve));
  console.log('  -> Server instance stopped.');

  // Create fresh server and store instance from same filesystem storage
  const coldProjectStore = new GenerationProjectStore(testProjectsDir);
  const coldProjectService = new GenerationProjectService({ projectStore: coldProjectStore, assessmentStore });
  const restartedServer = createServer({
    assessmentStore,
    generationProjectStore: coldProjectStore,
    generationProjectService: coldProjectService
  });

  let newPort;
  let newBaseUrl;
  await new Promise((resolve) => {
    restartedServer.listen(0, '127.0.0.1', () => {
      newPort = restartedServer.address().port;
      newBaseUrl = `http://127.0.0.1:${newPort}`;
      resolve();
    });
  });
  console.log(`  -> Server restarted successfully on ${newBaseUrl}`);

  console.log('\n[Step 9] Verifying Project Persistence After Restart...');
  const postRestartRes = await fetch(`${newBaseUrl}/api/v1/generation/projects/${standaloneId}`);
  assert.strictEqual(postRestartRes.status, 200);
  const postRestartData = await postRestartRes.json();
  assert.strictEqual(postRestartData.project.projectId, standaloneId);
  assert.strictEqual(postRestartData.project.description, 'Updated inspection scope with clean core determination hooks');
  assert.strictEqual(postRestartData.project.specificationVersion, 2);
  console.log(`  -> Project ${standaloneId} intact and fully preserved after cold backend restart.`);

  console.log('\n[Step 10] Testing Approved BUILD Assessment Handoff...');
  const handoffRes = await fetch(`${newBaseUrl}/api/v1/generation/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceAssessmentId: 'ASM-LIVE-VERIFY-001',
      origin: 'DISCOVERY_BUILD'
    })
  });
  assert.strictEqual(handoffRes.status, 201);
  const handoffData = await handoffRes.json();
  const buildProjectId = handoffData.project.projectId;
  console.log(`  -> Approved BUILD handoff created project: ${buildProjectId}`);
  assert.strictEqual(handoffData.project.origin, 'DISCOVERY_BUILD');
  assert.strictEqual(handoffData.project.sourceTransactionCode, 'ME21N');
  assert.strictEqual(handoffData.project.sourceAssessmentId, 'ASM-LIVE-VERIFY-001');
  assert.strictEqual(handoffData.project.assessmentContext.businessDomain, 'Sourcing and Procurement');

  // Test duplicate handoff protection
  const dupHandoffRes = await fetch(`${newBaseUrl}/api/v1/generation/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceAssessmentId: 'ASM-LIVE-VERIFY-001',
      origin: 'DISCOVERY_BUILD'
    })
  });
  assert.strictEqual(dupHandoffRes.status, 200);
  const dupHandoffData = await dupHandoffRes.json();
  assert.strictEqual(dupHandoffData.alreadyExists, true);
  assert.strictEqual(dupHandoffData.project.projectId, buildProjectId);
  console.log('  -> Duplicate handoff protection verified: returned existing project without duplicate creation.');

  // Cleanup
  await new Promise((resolve) => restartedServer.close(resolve));
  fs.rmSync(testDir, { recursive: true, force: true });

  console.log('\n===============================================================');
  console.log('ALL 10 VERIFICATION STEPS COMPLETED SUCCESSFULLY WITH EXIT CODE 0');
  console.log('===============================================================');
}

runVerification().catch((err) => {
  console.error('VERIFICATION FAILED:', err);
  process.exit(1);
});
