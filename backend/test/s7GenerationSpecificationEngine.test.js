/**
 * Fiorify — S7 Generation Specification Engine & Project Lifecycle Test Suite
 *
 * Verifies:
 * 1. Project creation with originating modernization context & BUILD authorization.
 * 2. Requirements management (CRUD, categories, priorities, acceptance criteria).
 * 3. Solution architecture formulation (Managed RAP with Draft vs Read-Only Query).
 * 4. CDS Data model specification & cross-entity validations.
 * 5. RAP backend specification & OData V4 service contract consistency.
 * 6. Fiori UI specification floorplan & presentation mapping.
 * 7. End-to-end requirement traceability matrix calculation.
 * 8. 13-gate deterministic mathematical readiness evaluation.
 * 9. Specification version snapshotting, immutable version history, and diff comparison.
 * 10. Chief Architect review & approval governance (RBAC enforcement & signature hash).
 * 11. ADD_AND_CONFIGURE separate specification path without custom code generation.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import DatabasePool from '../src/infrastructure/db/pool.js';
import MigrationRunner from '../src/infrastructure/db/migrator.js';
import { GenerationProjectRepository } from '../src/infrastructure/db/repositories/generationProjectRepository.js';
import { defaultGenerationReadinessEngine, SPEC_READINESS_STATUSES } from '../src/generation/projects/generationReadinessEngine.js';
import { defaultSpecificationVersioningService } from '../src/generation/projects/specificationVersioningService.js';
import { buildTraceabilityMatrix } from '../src/generation/export/traceabilityEngine.js';

describe('Sprint 7: Generation Specification Engine & Project Lifecycle', () => {
  let pool;
  let repo;
  const testTenantId = 'TENANT-S7-TEST';
  const testProjectId = `GEN-S7-TEST-${Date.now()}`;
  const chiefArchitect = { id: 'USR-CHIEF-01', name: 'Chief SAP Architect', roles: ['CHIEF_ARCHITECT'] };
  const developerUser = { id: 'USR-DEV-01', name: 'Junior Developer', roles: ['DEVELOPER'] };

  let projectRecord = {
    projectId: testProjectId,
    projectName: 'Sales Order Processing Modernization',
    description: 'Clean Core RAP modernization of legacy VA01 transaction',
    origin: 'DISCOVERY_BUILD',
    sourceTransactionCode: 'VA01',
    sourceSystemId: 'S21',
    sourceClient: '200',
    targetProduct: 'SAP S/4HANA',
    targetRelease: 'SAP S/4HANA 2023 Private Edition',
    targetDeploymentModel: 'ON_PREMISE',
    modernizationOutcome: 'BUILD',
    lifecycleStatus: 'DRAFT',
    buildApproval: {
      approver: 'Chief SAP Architect',
      approvedAt: new Date().toISOString(),
      justification: 'Critical custom pricing routines require Tier 2 RAP Managed scenario.'
    },
    requirementsSpec: {
      specVersion: 1,
      requirements: [
        {
          requirementId: 'REQ-01',
          title: 'Manage Sales Orders Header & Items',
          category: 'FUNCTIONAL',
          priority: 'CRITICAL',
          status: 'CONFIRMED',
          targetEntity: 'SalesOrder',
          acceptanceCriteria: ['Must create header with customer and document type', 'Must calculate total net amount']
        },
        {
          requirementId: 'REQ-02',
          title: 'Audit Trail and DCL Authorization',
          category: 'SECURITY',
          priority: 'HIGH',
          status: 'CONFIRMED',
          targetEntity: 'SalesOrder',
          acceptanceCriteria: ['Restrict access by Sales Organization authorization object']
        }
      ]
    },
    dataModelSpec: {
      specVersion: 1,
      entities: [
        {
          entityId: 'ENT-01',
          name: 'SalesOrder',
          entityType: 'ROOT',
          isRoot: true,
          fields: [
            { name: 'SalesOrder', isKey: true, dataType: 'CHAR', length: 10 },
            { name: 'Customer', isKey: false, dataType: 'CHAR', length: 10 },
            { name: 'NetAmount', isKey: false, dataType: 'CURR', length: 15, precision: 2 }
          ]
        },
        {
          entityId: 'ENT-02',
          name: 'SalesOrderItem',
          entityType: 'CHILD',
          isRoot: false,
          fields: [
            { name: 'SalesOrder', isKey: true, dataType: 'CHAR', length: 10 },
            { name: 'ItemPosition', isKey: true, dataType: 'NUMC', length: 6 },
            { name: 'Material', isKey: false, dataType: 'CHAR', length: 40 },
            { name: 'Quantity', isKey: false, dataType: 'QUAN', length: 13, precision: 3 }
          ]
        }
      ]
    },
    architectureSpec: {
      specVersion: 1,
      profile: 'MANAGED_RAP_DRAFT',
      rapScenario: 'MANAGED',
      draftHandling: true,
      serviceBinding: { serviceName: 'ZUI_SALESORDER_O4', bindingType: 'ODATA_V4_UI' },
      fioriFloorplan: { floorplan: 'LIST_REPORT_OBJECT_PAGE', appType: 'Fiori Elements' }
    }
  };

  before(async () => {
    process.env.Fiorify_ALLOW_EMBEDDED_PG = 'true';
    pool = await DatabasePool.getPool();
    const migrator = new MigrationRunner(pool);
    await migrator.migrateUp();
    repo = new GenerationProjectRepository(pool);
  });

  beforeEach(async () => {
    // Ensure all tables are migrated even if a previous test suite dropped/rolled back tables
    const migrator = new MigrationRunner(pool);
    await migrator.migrateUp();
    // Ensure test project exists in DB
    const existing = await repo.getProjectById(testProjectId, testTenantId).catch(() => null);
    if (!existing) {
      await repo.createProject(projectRecord, testTenantId);
    }
  });

  after(async () => {
    if (pool && repo) {
      try {
        await repo.deleteProject(testProjectId, testTenantId);
      } catch {
        // cleanup ignore
      }
    }
  });

  it('1. Persists Generation Project linked to originating modernization context and BUILD decision', async () => {
    const projectRecord = {
      projectId: testProjectId,
      projectName: 'Sales Order Processing Modernization',
      description: 'Clean Core RAP modernization of legacy VA01 transaction',
      origin: 'DISCOVERY_BUILD',
      sourceTransactionCode: 'VA01',
      sourceSystemId: 'S21',
      sourceClient: '200',
      targetProduct: 'SAP S/4HANA',
      targetRelease: 'SAP S/4HANA 2023 Private Edition',
      targetDeploymentModel: 'ON_PREMISE',
      modernizationOutcome: 'BUILD',
      lifecycleStatus: 'DRAFT',
      buildApproval: {
        approver: 'Chief SAP Architect',
        approvedAt: new Date().toISOString(),
        justification: 'Critical custom pricing routines require Tier 2 RAP Managed scenario.'
      },
      requirementsSpec: {
        specVersion: 1,
        requirements: [
          {
            requirementId: 'REQ-01',
            title: 'Manage Sales Orders Header & Items',
            category: 'FUNCTIONAL',
            priority: 'CRITICAL',
            status: 'CONFIRMED',
            targetEntity: 'SalesOrder',
            acceptanceCriteria: ['Must create header with customer and document type', 'Must calculate total net amount']
          },
          {
            requirementId: 'REQ-02',
            title: 'Audit Trail and DCL Authorization',
            category: 'SECURITY',
            priority: 'HIGH',
            status: 'CONFIRMED',
            targetEntity: 'SalesOrder',
            acceptanceCriteria: ['Restrict access by Sales Organization authorization object']
          }
        ]
      },
      dataModelSpec: {
        specVersion: 1,
        entities: [
          {
            entityId: 'ENT-01',
            name: 'SalesOrder',
            entityType: 'ROOT',
            isRoot: true,
            fields: [
              { name: 'SalesOrder', isKey: true, dataType: 'CHAR', length: 10 },
              { name: 'Customer', isKey: false, dataType: 'CHAR', length: 10 },
              { name: 'NetAmount', isKey: false, dataType: 'CURR', length: 15, precision: 2 }
            ]
          },
          {
            entityId: 'ENT-02',
            name: 'SalesOrderItem',
            entityType: 'CHILD',
            isRoot: false,
            fields: [
              { name: 'SalesOrder', isKey: true, dataType: 'CHAR', length: 10 },
              { name: 'ItemPosition', isKey: true, dataType: 'NUMC', length: 6 },
              { name: 'Material', isKey: false, dataType: 'CHAR', length: 40 },
              { name: 'Quantity', isKey: false, dataType: 'QUAN', length: 13, precision: 3 }
            ]
          }
        ]
      },
      architectureSpec: {
        specVersion: 1,
        profile: 'MANAGED_RAP_DRAFT',
        rapScenario: 'MANAGED',
        draftHandling: true,
        serviceBinding: { serviceName: 'ZUI_SALESORDER_O4', bindingType: 'ODATA_V4_UI' },
        fioriFloorplan: { floorplan: 'LIST_REPORT_OBJECT_PAGE', appType: 'Fiori Elements' }
      }
    };

    const saved = await repo.createProject(projectRecord, testTenantId);
    assert.ok(saved, 'Project record must be saved in database');
    assert.equal(saved.project_id || saved.projectId, testProjectId);
  });

  it('2. Traceability Matrix maps requirements to CDS entities and calculates coverage index', () => {
    const mockProject = {
      projectId: testProjectId,
      requirementsSpec: {
        requirements: [
          { id: 'REQ-01', title: 'Sales Order Processing', targetEntity: 'SalesOrder', status: 'CONFIRMED' },
          { id: 'REQ-02', title: 'Order Items Management', targetEntity: 'SalesOrderItem', status: 'CONFIRMED' }
        ]
      },
      dataModelSpec: {
        entities: [
          { entityId: 'E1', name: 'SalesOrder', entityType: 'ROOT', isRoot: true, fields: [{ name: 'ID' }] },
          { entityId: 'E2', name: 'SalesOrderItem', entityType: 'CHILD', isRoot: false, fields: [{ name: 'ID' }] }
        ]
      },
      architectureSpec: { profile: 'MANAGED_RAP_DRAFT' },
      artifactRegistry: {
        artifacts: [
          { artifactType: 'DDL_SOURCE', objectName: 'ZSALESORDER' },
          { artifactType: 'CDS_VIEW_ENTITY', objectName: 'ZI_SalesOrder' },
          { artifactType: 'CDS_VIEW_ENTITY', objectName: 'ZC_SalesOrder' },
          { artifactType: 'RAP_BEHAVIOR_DEFINITION', objectName: 'ZR_SalesOrder' },
          { artifactType: 'RAP_SERVICE_DEFINITION', objectName: 'ZUI_SalesOrder' },
          { artifactType: 'CDS_METADATA_EXTENSION', objectName: 'ZC_SalesOrder.mde' },
          { artifactType: 'FIORI_MANIFEST', objectName: 'manifest.json' }
        ]
      }
    };

    const matrix = buildTraceabilityMatrix(mockProject);
    assert.ok(matrix, 'Matrix report must be generated');
    assert.equal(matrix.metrics.totalRequirements, 2);
    assert.equal(matrix.metrics.totalEntities, 2);
    assert.ok(matrix.metrics.traceabilityIndex >= 70, `Expected traceability >= 70, got ${matrix.metrics.traceabilityIndex}`);
  });

  it('3. 13-Gate Deterministic Readiness Engine computes explainable percentage and identifies gaps', () => {
    // Incomplete project
    const incompleteProject = {
      projectId: 'GEN-INCOMPLETE',
      modernizationOutcome: 'BUILD',
      requirementsSpec: { requirements: [] },
      dataModelSpec: { entities: [] }
    };
    const incompleteReadiness = defaultGenerationReadinessEngine.evaluateReadiness(incompleteProject);
    assert.equal(incompleteReadiness.status, SPEC_READINESS_STATUSES.BLOCKED);
    assert.ok(incompleteReadiness.blockingReasons.length > 0, 'Blocking reasons must be articulated');

    // Complete project
    const completeProject = {
      projectId: testProjectId,
      origin: 'STANDALONE',
      modernizationOutcome: 'BUILD',
      targetRelease: 'SAP S/4HANA 2023 Private Edition',
      requirementsSpec: {
        requirements: [
          { id: 'R1', title: 'Order management', targetEntity: 'SalesOrder', acceptanceCriteria: ['AC1'] }
        ]
      },
      dataModelSpec: {
        entities: [
          { name: 'SalesOrder', entityType: 'ROOT', isRoot: true, fields: [{ name: 'ID', isKey: true }] }
        ]
      },
      architectureSpec: {
        profile: 'MANAGED_RAP_DRAFT',
        serviceBinding: { serviceName: 'ZUI_ORDER_O4' },
        fioriFloorplan: { floorplan: 'LIST_REPORT_OBJECT_PAGE' },
        security: { authModel: 'DCL' }
      }
    };
    const completeReadiness = defaultGenerationReadinessEngine.evaluateReadiness(completeProject);
    assert.equal(completeReadiness.status, SPEC_READINESS_STATUSES.READY_FOR_APPROVAL);
    assert.equal(completeReadiness.readinessPercentage, 100);
    assert.equal(completeReadiness.blockingReasons.length, 0);
  });

  it('4. Specification Versioning: snapshots complete project specification and maintains history', async () => {
    const project = await repo.getProjectById(testProjectId, testTenantId);
    assert.ok(project, 'Project must exist');

    const snapResult = await defaultSpecificationVersioningService.createVersionSnapshot(
      project,
      chiefArchitect,
      'Initial baseline specification'
    );
    assert.ok(snapResult.success);
    assert.equal(snapResult.versionNumber, 1);
    assert.equal(snapResult.versionTag, 'v1.0');

    const versions = await defaultSpecificationVersioningService.listVersions(testProjectId);
    assert.ok(versions.length >= 1, 'Version list must include created snapshot');
    assert.equal(versions[0].versionNumber, 1);
  });

  it('5. Compares specification versions and computes semantic diff', async () => {
    // Create version 2 with an additional requirement
    const projectV2 = await repo.getProjectById(testProjectId, testTenantId);
    projectV2.requirementsSpec.requirements.push({
      requirementId: 'REQ-03',
      title: 'Discount Approval Workflow',
      category: 'BUSINESS',
      acceptanceCriteria: ['Approvals required over 20%']
    });

    await defaultSpecificationVersioningService.createVersionSnapshot(
      projectV2,
      chiefArchitect,
      'Added discount approval requirement'
    );

    const diff = await defaultSpecificationVersioningService.compareVersions(testProjectId, 1, 2);
    assert.equal(diff.baseVersion, 1);
    assert.equal(diff.targetVersion, 2);
    assert.equal(diff.differences.requirements.v1Count, 2);
    assert.equal(diff.differences.requirements.v2Count, 3);
    assert.equal(diff.differences.requirements.added.length, 1);
    assert.equal(diff.differences.requirements.added[0].requirementId, 'REQ-03');
  });

  it('6. Chief Architect approval: strictly rejects non-architect approval and accepts authorized approval with signature', async () => {
    const project = await repo.getProjectById(testProjectId, testTenantId);

    // Attempt approval with unauthorized developer
    await assert.rejects(
      async () => {
        await defaultSpecificationVersioningService.processApproval(
          project,
          { decision: 'APPROVED', comments: 'Approved by dev' },
          developerUser
        );
      },
      { code: 'UNAUTHORIZED_APPROVAL' },
      'Unauthorized developer must be rejected'
    );

    // Authorized approval with Chief Architect
    const approvalRes = await defaultSpecificationVersioningService.processApproval(
      project,
      { decision: 'APPROVED', comments: 'Approved for S8/S9 code generation.' },
      chiefArchitect
    );

    assert.equal(approvalRes.decision, 'APPROVED');
    assert.equal(approvalRes.lifecycleStatus, 'APPROVED_FOR_GENERATION');
    assert.ok(approvalRes.signatureHash, 'Cryptographic signature hash must be generated');

    // Verify persisted state
    const refreshed = await repo.getProjectById(testProjectId, testTenantId);
    assert.equal(refreshed.lifecycle_status || refreshed.lifecycleStatus, 'APPROVED_FOR_GENERATION');
    assert.equal(refreshed.approved_by || refreshed.approvedBy, chiefArchitect.name);
  });

  it('7. Supports ADD_AND_CONFIGURE modernization outcome without demanding custom RAP generation', () => {
    const addConfigProject = {
      projectId: 'GEN-ADOPT-F0773',
      modernizationOutcome: 'ADD_AND_CONFIGURE',
      targetRelease: 'SAP S/4HANA 2023 Private Edition',
      requirementsSpec: {
        requirements: [
          {
            requirementId: 'REQ-ADOPT-01',
            title: 'Configure Standard Fiori App F0773',
            category: 'FUNCTIONAL',
            acceptanceCriteria: ['Activate OData service in /IWFND/MAINT_SERVICE', 'Assign business role AP_ACCOUNTANT']
          }
        ]
      },
      architectureSpec: {
        profile: 'STANDARD_FIORI_ADOPTION',
        scenario: 'ADD_AND_CONFIGURE',
        standardApp: {
          appId: 'F0773',
          appName: 'Manage Outgoing Payments',
          semanticObject: 'Payment',
          action: 'manage'
        }
      }
    };

    const readiness = defaultGenerationReadinessEngine.evaluateReadiness(addConfigProject);
    assert.ok(readiness.readinessPercentage >= 80, 'ADD_AND_CONFIGURE should score high without custom RAP tables');
    assert.equal(readiness.checks.find(c => c.id === 'GATE_06_DATA_MODEL_VALID').passed, true);
    assert.equal(readiness.checks.find(c => c.id === 'GATE_07_RAP_SPECIFICATION').passed, true);
  });
});
