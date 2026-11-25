import test from 'node:test';
import assert from 'node:assert/strict';
import { GenerationReadinessEngine, SPEC_READINESS_STATUSES } from '../src/generation/projects/generationReadinessEngine.js';
import { DeploymentOrchestrationService } from '../src/generation/deployment/deploymentOrchestrationService.js';
import { DeploymentRepository } from '../src/infrastructure/db/repositories/deploymentRepository.js';
import { generateBehaviorImplementationClass } from '../src/generation/abap/behaviorClassGenerator.js';
import { createAbapArtifact, ABAP_ARTIFACT_TYPES } from '../src/generation/abap/abapArtifactContract.js';
import { RAP_PROFILES } from '../src/generation/architecture/architectureContract.js';

test('GEN-001 through GEN-010: Generation Studio Golden Paths, Readiness Gates & Blocked Deployment Suite', async (t) => {
  const readinessEngine = new GenerationReadinessEngine();
  const mockPreflight = {
    runPreflight: async () => ({
      targetSystem: 'S21',
      overallReadiness: 'READY',
      summary: { passed: 5, totalChecks: 5 }
    })
  };

  // =========================================================================
  // GEN-001: Critical Dependency & Target Release Resolution in Readiness Gate 12
  // =========================================================================
  await t.test('GEN-001: Gate 12 blocks when target release is unsupported or dependencies are unresolved', () => {
    const invalidReleaseProject = {
      projectId: 'PRJ-GEN-001-INV',
      modernizationOutcome: 'BUILD',
      targetRelease: 'SAP R/3 4.6C', // completely obsolete non-RAP platform
      dependencies: [{ name: 'Z_LEGACY_INCLUDE', status: 'UNRESOLVED' }],
      requirementsSpec: { items: [{ id: 'R1', title: 'Post Journal', criteria: ['Valid debit/credit'] }] },
      architectureSpec: { profile: 'MANAGED_RAP_WITH_DRAFT', rapScenario: 'MANAGED' },
      dataModelSpec: { entities: [{ name: 'JournalEntry', entityType: 'ROOT' }] }
    };

    const result = readinessEngine.evaluateReadiness(invalidReleaseProject);
    const gate12 = result.checks.find((c) => c.id === 'GATE_12_DEPENDENCIES_RESOLVED');
    assert.strictEqual(gate12.passed, false);
    assert.ok(gate12.details.includes('Unresolved dependencies'));
    assert.ok(result.blockingReasons.some((r) => r.includes('not supported for modern RAP') || r.includes('Unresolved project dependency')));
  });

  await t.test('GEN-001: Gate 12 passes for certified S/4HANA 2023 landscape with resolved dependencies', () => {
    const validProject = {
      projectId: 'PRJ-GEN-001-VAL',
      modernizationOutcome: 'BUILD',
      targetRelease: 'SAP S/4HANA 2023 On-Premise',
      dependencies: [{ name: 'I_JournalEntry', status: 'RESOLVED' }],
      requirementsSpec: { items: [{ id: 'R1', title: 'Post Journal', criteria: ['Valid debit/credit'] }] },
      architectureSpec: { profile: 'MANAGED_RAP_WITH_DRAFT', rapScenario: 'MANAGED' },
      dataModelSpec: { entities: [{ name: 'JournalEntry', entityType: 'ROOT' }] }
    };

    const result = readinessEngine.evaluateReadiness(validProject);
    const gate12 = result.checks.find((c) => c.id === 'GATE_12_DEPENDENCIES_RESOLVED');
    assert.strictEqual(gate12.passed, true);
  });

  // =========================================================================
  // GEN-002: Fail-Closed Deployment Readiness (Preflight + Governance + Artifacts)
  // =========================================================================
  await t.test('GEN-002: getDeploymentReadiness fails closed when project is unapproved or artifacts incomplete', async () => {
    const repo = new DeploymentRepository(null);
    const service = new DeploymentOrchestrationService({ repository: repo, preflightService: mockPreflight });

    const unapprovedProject = {
      projectId: 'PRJ-GEN-002-UNAPPROVED',
      name: 'Unapproved Project',
      modernizationOutcome: 'BUILD',
      lifecycleStatus: 'GENERATED',
      // Lacks approvedBy, leadArchitectApproval, approvalSignature
      artifactRegistry: {
        artifacts: {
          'art-1': {
            artifactId: 'art-1',
            artifactType: 'CDS_VIEW_ENTITY',
            objectName: 'ZI_Test',
            filePath: 'src/cds/zi_test.ddls.asddls',
            content: 'define root view entity ZI_Test as select from dummy { key dummy }'
          }
        }
      }
    };

    const readiness = await service.getDeploymentReadiness(unapprovedProject);
    assert.strictEqual(readiness.isDeploymentReady, false);
    assert.strictEqual(readiness.readyForDeploymentPlanning, false);
    assert.strictEqual(readiness.status, 'BLOCKED');
    assert.ok(readiness.blockers.some((b) => b.includes('Lead Architect approval')));
    assert.strictEqual(readiness.checks.governanceApproval, false);
  });

  await t.test('GEN-002: getDeploymentReadiness flags incomplete scaffolds with isDeployable: false', async () => {
    const repo = new DeploymentRepository(null);
    const service = new DeploymentOrchestrationService({ repository: repo, preflightService: mockPreflight });

    const scaffoldProject = {
      projectId: 'PRJ-GEN-002-SCAFFOLD',
      name: 'Scaffold Project',
      modernizationOutcome: 'BUILD',
      lifecycleStatus: 'GENERATED',
      approvedBy: 'USR-CHIEF-ARCHITECT',
      artifactRegistry: {
        artifacts: {
          'art-class': {
            artifactId: 'art-class',
            artifactType: 'RAP_BEHAVIOR_IMPLEMENTATION',
            objectName: 'BP_I_TEST',
            filePath: 'src/classes/bp_i_test.clas.abap',
            content: 'CLASS lhc_test IMPLEMENTATION. /* TODO: Implement EML */ ENDCLASS.',
            isDeployable: false
          }
        }
      }
    };

    const readiness = await service.getDeploymentReadiness(scaffoldProject);
    assert.strictEqual(readiness.isDeploymentReady, false);
    assert.ok(readiness.blockers.some((b) => b.includes('incomplete developer scaffolds (isDeployable: false)')));
    assert.strictEqual(readiness.checks.noIncompleteScaffolds, false);
  });

  // =========================================================================
  // GEN-003: Administrative Override Authorization & Audit Trail
  // =========================================================================
  await t.test('GEN-003: generateDeploymentPlan rejects unprivileged override attempt', async () => {
    const repo = new DeploymentRepository(null);
    const service = new DeploymentOrchestrationService({ repository: repo, preflightService: mockPreflight });

    const blockedProject = {
      projectId: 'PRJ-GEN-003-BLOCKED',
      name: 'Blocked Project',
      modernizationOutcome: 'BUILD',
      lifecycleStatus: 'DRAFT',
      artifactRegistry: { artifacts: {} }
    };

    await assert.rejects(
      async () => {
        await service.generateDeploymentPlan(
          blockedProject,
          { override: { justification: 'Emergency fix for production outage' } },
          { id: 'USR-DEV-01', role: 'DEVELOPER' }
        );
      },
      (err) => {
        assert.strictEqual(err.code, 'ADMIN_OVERRIDE_UNAUTHORIZED');
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  await t.test('GEN-003: generateDeploymentPlan rejects override with insufficient justification (<10 chars)', async () => {
    const repo = new DeploymentRepository(null);
    const service = new DeploymentOrchestrationService({ repository: repo, preflightService: mockPreflight });

    const blockedProject = {
      projectId: 'PRJ-GEN-003-BLOCKED',
      name: 'Blocked Project',
      modernizationOutcome: 'BUILD',
      lifecycleStatus: 'DRAFT',
      artifactRegistry: { artifacts: {} }
    };

    await assert.rejects(
      async () => {
        await service.generateDeploymentPlan(
          blockedProject,
          { override: { justification: 'Fix' } },
          { id: 'USR-ADMIN-01', role: 'ADMIN' }
        );
      },
      (err) => {
        assert.strictEqual(err.code, 'INVALID_JUSTIFICATION');
        assert.strictEqual(err.statusCode, 400);
        return true;
      }
    );
  });

  await t.test('GEN-003: generateDeploymentPlan authorizes admin override with valid justification and logs audit event', async () => {
    const repo = new DeploymentRepository(null);
    const auditLogs = [];
    const mockAuditLogger = {
      logEvent: async (event) => {
        auditLogs.push(event);
      }
    };
    const service = new DeploymentOrchestrationService({
      repository: repo,
      auditLogger: mockAuditLogger,
      preflightService: mockPreflight
    });

    const projectWithArtifacts = {
      projectId: 'PRJ-GEN-003-AUTH-OVERRIDE',
      name: 'Override Authorized Project',
      modernizationOutcome: 'BUILD',
      lifecycleStatus: 'EXPORTED',
      targetRelease: 'SAP S/4HANA 2023',
      artifactRegistry: {
        artifacts: {
          'art-ddls': {
            artifactId: 'art-ddls',
            artifactType: 'CDS_VIEW_ENTITY',
            objectName: 'ZI_Test',
            filePath: 'src/cds/zi_test.ddls.asddls',
            content: 'define root view entity ZI_Test as select from dummy { key dummy }'
          }
        }
      }
    };

    const plan = await service.generateDeploymentPlan(
      projectWithArtifacts,
      { override: { justification: 'Authorized architectural testing override approved by Chief Architect' } },
      { id: 'USR-CHIEF-01', name: 'Chief Architect', role: 'CHIEF_ARCHITECT' }
    );

    assert.ok(plan.id.startsWith('DEP-PLAN-'));
    assert.strictEqual(plan.isOverrideApplied, true);
    assert.ok(plan.overrideJustification.includes('Chief Architect'));
    assert.ok(auditLogs.some((l) => l.action === 'ADMIN_OVERRIDE' && l.outcome === 'GRANTED'));
  });

  // =========================================================================
  // GEN-004: Deny-by-Default RAP Authorization in Generated Behavior
  // =========================================================================
  await t.test('GEN-004: Generated Behavior class enforces deny-by-default in get_instance_authorizations', () => {
    const mockProject = {
      projectId: 'PRJ-GEN-004-RAP',
      name: 'Sales Order Processing',
      dataModelSpec: {
        entities: [{ name: 'SalesOrder', entityType: 'ROOT', isRoot: true, entityId: 'ENT-SO' }]
      },
      requirementsSpec: {
        items: [
          { requirementId: 'REQ-01', title: 'Validate Supplier', category: 'VALIDATION', status: 'CONFIRMED' }
        ]
      }
    };

    const artifacts = generateBehaviorImplementationClass(mockProject, {
      selectedProfile: RAP_PROFILES.MANAGED_RAP_WITH_DRAFT
    });

    assert.strictEqual(artifacts.length, 1);
    const behaviorArt = artifacts[0];
    const content = behaviorArt.content;

    // Verify deny-by-default variables
    assert.ok(content.includes('DATA(lv_update_allowed) = if_abap_behv=>auth-unauthorized.'));
    assert.ok(content.includes('DATA(lv_delete_allowed) = if_abap_behv=>auth-unauthorized.'));

    // Verify defensive AUTHORITY-CHECK on S_TABU_DIS
    assert.ok(content.includes("AUTHORITY-CHECK OBJECT 'S_TABU_DIS'"));
    assert.ok(content.includes("ID 'ACTVT' FIELD '02'"));
    assert.ok(content.includes("ID 'ACTVT' FIELD '06'"));

    // Verify result assignment with guarded variables
    assert.ok(content.includes('%update = lv_update_allowed'));
    assert.ok(content.includes('%delete = lv_delete_allowed'));
  });

  // =========================================================================
  // GEN-005: Incomplete Scaffolds Automatically Tagged with isDeployable: false
  // =========================================================================
  await t.test('GEN-005: createAbapArtifact marks scaffolds with TODO or completion requirements as isDeployable: false', () => {
    const todoArtifact = createAbapArtifact({
      projectId: 'PRJ-GEN-005',
      artifactType: ABAP_ARTIFACT_TYPES.RAP_BEHAVIOR_IMPLEMENTATION,
      objectName: 'BP_I_TEST',
      content: 'CLASS lhc_test IMPLEMENTATION. /* TODO: Read buffer */ ENDCLASS.',
      requiresDeveloperCompletion: true
    });

    assert.strictEqual(todoArtifact.isDeployable, false);

    const completeArtifact = createAbapArtifact({
      projectId: 'PRJ-GEN-005',
      artifactType: ABAP_ARTIFACT_TYPES.CDS_VIEW_ENTITY,
      objectName: 'ZC_TEST',
      content: 'define view entity ZC_TEST as select from ZI_TEST { key ID }',
      requiresDeveloperCompletion: false
    });

    assert.strictEqual(completeArtifact.isDeployable, true);
  });
});
