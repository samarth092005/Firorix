import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DeploymentOrchestrationService,
  DEPLOYMENT_LIFECYCLE_STATUSES
} from '../src/generation/deployment/deploymentOrchestrationService.js';
import { DeploymentRepository } from '../src/infrastructure/db/repositories/deploymentRepository.js';
import { SapPostDeploymentVerifier, VERIFICATION_STATUSES } from '../src/generation/deployment/sapPostDeploymentVerifier.js';

test('Sprint 11.4 & 11.5 — Deployment Orchestration Engine & Execution Boundary', async (t) => {
  const repo = new DeploymentRepository(null); // in-memory repo
  const verifier = new SapPostDeploymentVerifier();

  const mockProject = {
    projectId: 'PRJ-TEST-DEPLOY-01',
    name: 'Sales Order RAP Modernization',
    lifecycleStatus: 'EXPORTED',
    sourceTcode: 'VA01',
    specificationVersion: 1,
    generationVersion: 1,
    artifactRegistry: {
      artifacts: {
        'art-tabl': {
          artifactId: 'art-tabl',
          artifactType: 'DDIC_TABLE',
          objectName: 'ZSO_HEADER',
          filePath: 'ZSO_HEADER.tabl.sql',
          content: 'create table zso_header { key sales_order: abap.char(10); }'
        },
        'art-cds': {
          artifactId: 'art-cds',
          artifactType: 'CDS_VIEW_ENTITY',
          objectName: 'ZC_SalesOrder',
          filePath: 'ZC_SalesOrder.ddls.asddls',
          content: 'define root view entity ZC_SalesOrder as select from ZI_SalesOrder { key SalesOrder }'
        },
        'art-bdef': {
          artifactId: 'art-bdef',
          artifactType: 'RAP_BEHAVIOR_DEFINITION',
          objectName: 'ZR_SalesOrder',
          filePath: 'ZR_SalesOrder.bdef.asbdef',
          content: 'managed implementation in class ZBP_SalesOrder unique; etag master LastChangedAt;'
        },
        'art-srvd': {
          artifactId: 'art-srvd',
          artifactType: 'RAP_SERVICE_DEFINITION',
          objectName: 'ZUI_SALESORDER',
          filePath: 'ZUI_SALESORDER.srvd.srvdsrv',
          content: 'define service ZUI_SALESORDER { expose ZC_SalesOrder; }'
        },
        'art-srvb': {
          artifactId: 'art-srvb',
          artifactType: 'RAP_SERVICE_BINDING_PROPOSAL',
          objectName: 'ZUI_SALESORDER_O4',
          filePath: 'ZUI_SALESORDER_O4.srvb.json',
          content: JSON.stringify({ serviceDefinition: 'ZUI_SALESORDER', bindingType: 'ODATA_V4_UI' })
        },
        'art-fiori': {
          artifactId: 'art-fiori',
          artifactType: 'FIORI_MANIFEST',
          objectName: 'manifest.json',
          filePath: 'webapp/manifest.json',
          content: JSON.stringify({
            'sap.app': { dataSources: { mainService: { uri: '/sap/opu/odata4/sap/zui_salesorder/0001/' } } },
            'sap.ui5': { routing: { targets: { List: { options: { settings: { entitySet: 'ZC_SalesOrder' } } } } } }
          })
        }
      }
    }
  };

  const service = new DeploymentOrchestrationService({
    repository: repo,
    verifier
  });

  let createdPlan = null;

  await t.test('1. Generates ordered deployment plan with dependency DAG & SHA-256 hashes', async () => {
    createdPlan = await service.generateDeploymentPlan(mockProject, {
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: '$TMP',
      forcePlan: true
    }, { id: 'USR-ARCH-01', name: 'Lead Architect', role: 'LEAD_ARCHITECT' });

    assert.ok(createdPlan.id.startsWith('DEP-PLAN-'));
    assert.equal(createdPlan.targetSystem, 'S21');
    assert.equal(createdPlan.targetClient, '200');
    assert.equal(createdPlan.targetPackage, '$TMP');
    assert.equal(createdPlan.status, 'PLANNED');
    assert.ok(createdPlan.planHash);
    assert.ok(createdPlan.artifactManifestHash);

    // Verify operation ordering: DDIC table before CDS view before BDEF before Service Definition before Fiori
    const ops = createdPlan.planDetails.operations;
    assert.equal(ops[0].artifactType, 'DDIC_TABLE');
    assert.equal(ops[1].artifactType, 'CDS_VIEW_ENTITY');
    assert.equal(ops[2].artifactType, 'RAP_BEHAVIOR_DEFINITION');
    assert.equal(ops[3].artifactType, 'RAP_SERVICE_DEFINITION');
  });

  await t.test('2. Rejects execution when plan is not approved', async () => {
    await assert.rejects(
      async () => {
        await service.executeDeploymentPlan(createdPlan.id, {}, { id: 'USR-DEV-01', role: 'DEVELOPER' });
      },
      { code: 'DEPLOYMENT_NOT_APPROVED' }
    );
  });

  await t.test('3. Approves plan with Chief Architect signature and updates plan status to APPROVED', async () => {
    const approvalRes = await service.approveDeploymentPlan(createdPlan.id, {
      comments: 'Pre-flight passed. Approved for DEV execution verification.'
    }, { id: 'USR-CHIEF-01', name: 'Chief Architect', role: 'CHIEF_ARCHITECT' });

    assert.equal(approvalRes.status, 'APPROVED');
    assert.ok(approvalRes.approval.signatureHash);
    assert.equal(approvalRes.approval.approverRole, 'CHIEF_ARCHITECT');

    const updatedPlan = await repo.getDeploymentPlan(createdPlan.id);
    assert.equal(updatedPlan.status, 'APPROVED');
  });

  await t.test('4. Halts execution at the SAP S/4HANA Write Boundary (Zero SAP Writes)', async () => {
    const execution = await service.executeDeploymentPlan(createdPlan.id, {
      idempotencyKey: 'idem-test-va01'
    }, { id: 'USR-CHIEF-01', role: 'CHIEF_ARCHITECT' });

    assert.ok(execution.id.startsWith('DEP-EXEC-'));
    assert.equal(execution.lifecycleStatus, DEPLOYMENT_LIFECYCLE_STATUSES.STOPPED_AT_WRITE_BOUNDARY);
    assert.equal(execution.executionBoundaryStatus, 'STOPPED_AT_WRITE_BOUNDARY');
    assert.ok(execution.logs.some(l => l.level === 'GUARDRAIL'));

    // Check that post-deployment verification was generated
    assert.ok(execution.verificationResults);
    assert.equal(execution.verificationResults.summary.totalChecks, 10);
    assert.notEqual(execution.verificationResults.overallVerificationStatus, 'VERIFIED');
    assert.ok(['UNVERIFIED', 'PARTIALLY_VERIFIED'].includes(execution.verificationResults.overallVerificationStatus));
  });

  await t.test('5. Post-deployment verifier assigns evidence-based statuses', async () => {
    const report = await verifier.verifyDeployment(createdPlan);
    assert.equal(report.summary.totalChecks, 10);
    const bdefCheck = report.checks.find(c => c.id === 'VERIF_BDEF_AVAILABILITY');
    assert.equal(bdefCheck.status, VERIFICATION_STATUSES.NOT_FOUND);
    const fiorCheck = report.checks.find(c => c.id === 'VERIF_FIORI_SERVICE_CONFIG');
    assert.equal(fiorCheck.status, VERIFICATION_STATUSES.PASSED);
  });
});
