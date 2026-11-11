/**
 * FioriX — Generation Studio Combined Milestone Test Suite (GEN-02, GEN-03, GEN-04)
 *
 * Verifies:
 * - GEN-02: Server-authoritative BUILD context resolution & Project creation
 * - GEN-03: Requirements Designer (Assessment import, CRUD, confirmation gates, lifecycle advancement)
 * - GEN-04: Data Model Designer (Entities, Fields, Relationships, Cycle Detection, CDS Reuse, Validation Engine)
 * - End-to-End Persistence and Lifecycle Progression
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
import { defaultCdsReuseRegistry } from '../src/generation/datamodel/cdsReuseRegistry.js';
import { LIFECYCLE_STATUSES } from '../src/generation/contracts/generationProjectContract.js';

describe('Generation Studio Milestones 2–4: Foundation, Requirements & Data Model', () => {
  let server;
  let baseUrl;
  let testDir;
  let testAssessmentPath;
  let testProjectsDir;
  let assessmentStore;
  let projectStore;
  let projectService;
  let requirementsService;
  let dataModelService;

  const TEST_ADMIN_SECRET = 'TEST_ADMIN_SECRET_KEY';
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-fiorix-admin-secret': TEST_ADMIN_SECRET
  };

  const buildAssessment = {
    id: 'ASM-BUILD-PO-2023',
    tcode: 'ME21N',
    systemId: 'S21',
    client: '200',
    targetRelease: 'SAP S/4HANA 2023 On-Premise',
    businessArea: 'Sourcing and Procurement',
    classification: 'STANDARD',
    fitGapScore: 24,
    status: 'APPROVED',
    lifecycleStatus: 'APPROVED',
    leadArchitectApproval: {
      approved: true,
      approver: 'Dr. Marcus Weber',
      approverId: 'USR-ARCH-001',
      timestamp: '2026-11-10T12:00:00Z',
      justification: 'Approved custom RAP application due to proprietary procurement flow.'
    },
    recommendation: {
      outcome: 'BUILD',
      rationale: 'Functional gaps require custom RAP application.',
      outstandingChecks: ['Subcontracting approval matrix', 'Clean Core compliance']
    },
    assessmentResult: 'CUSTOM_RAP_REQUIRED',
    title: 'Purchase Order Modernization Assessment',
    description: 'Custom RAP application required to modernize ME21N procurement flow.',
    tenantId: 'DEFAULT-TENANT-S21',
    dimensionResults: [
      {
        dimensionId: 'WORKFLOW',
        dimensionName: 'Workflow & Approvals',
        status: 'GAP',
        finding: 'Multi-level release approval workflow required'
      },
      {
        dimensionId: 'BUSINESS_LOGIC',
        dimensionName: 'Business Logic & Validations',
        status: 'GAP',
        finding: 'Supplier quality certification check'
      }
    ],
    technicalEvidence: {
      package: 'Z_PURCHASING',
      softwareComponent: 'HOME',
      transportRequest: 'S21K900123'
    }
  };

  const nonBuildAssessment = {
    id: 'ASM-ADOPT-001',
    tcode: 'VA01',
    systemId: 'S21',
    client: '200',
    recommendation: {
      outcome: 'ADOPT',
      rationale: 'Standard Fiori app is a match.'
    },
    status: 'APPROVED',
    lifecycleStatus: 'APPROVED',
    title: 'Sales Order Creation Fiori Adoption',
    tenantId: 'DEFAULT-TENANT-S21'
  };

  before(async () => {
    process.env.FIORIX_ADMIN_SECRET = TEST_ADMIN_SECRET;

    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorix-gen24-test-'));
    testAssessmentPath = path.join(testDir, 'assessments.json');
    testProjectsDir = path.join(testDir, 'projects');
    fs.mkdirSync(testProjectsDir, { recursive: true });

    fs.writeFileSync(
      testAssessmentPath,
      JSON.stringify([buildAssessment, nonBuildAssessment], null, 2)
    );

    assessmentStore = new AssessmentStore({ storagePath: testAssessmentPath });
    projectStore = new GenerationProjectStore(testProjectsDir);
    projectService = new GenerationProjectService({
      projectStore,
      assessmentStore
    });
    requirementsService = new RequirementsService({
      projectStore,
      assessmentStore
    });
    dataModelService = new DataModelService({
      projectStore
    });

    server = createServer({
      assessmentStore,
      generationProjectStore: projectStore,
      generationProjectService: projectService,
      requirementsService,
      dataModelService,
      cdsReuseRegistry: defaultCdsReuseRegistry,
      enforceAuth: false
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  let createdProjectId = null;

  // ==========================================
  // SECTION 1: GEN-02 Project Foundation & Context
  // ==========================================
  describe('GEN-02: Server-Authoritative Project Foundation', () => {
    it('resolves authoritative assessment context for BUILD assessment', async () => {
      const res = await fetch(`${baseUrl}/api/v1/generation/context/${buildAssessment.id}`, {
        headers: adminHeaders
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.success, true);
      assert.equal(data.isEligibleForBuild, true);
      assert.equal(data.tcode, 'ME21N');
      assert.equal(data.assessment.id, buildAssessment.id);
      assert.equal(data.recommendedArtifacts.includes('RAP_MANAGED_SERVICE'), true);
    });

    it('identifies non-BUILD assessment as ineligible for Generation Studio project creation', async () => {
      const res = await fetch(`${baseUrl}/api/v1/generation/context/${nonBuildAssessment.id}`, {
        headers: adminHeaders
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.success, true);
      assert.equal(data.isEligibleForBuild, false);
      assert.match(data.ineligibilityReason, /ADOPT/);
    });

    it('creates a Generation Project linked to BUILD assessment', async () => {
      const payload = {
        projectName: 'Purchase Order RAP Modernization',
        description: 'Modernizing ME21N procurement with RAP Managed business objects.',
        sourceAssessmentId: buildAssessment.id,
        targetSystemId: 'S21',
        targetClient: '200',
        abapPackage: 'Z_PURCHASING',
        softwareComponent: 'HOME'
      };

      const res = await fetch(`${baseUrl}/api/v1/generation/projects`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.project.projectId || data.project.id);
      assert.equal(data.project.sourceAssessmentId, buildAssessment.id);
      assert.equal(data.project.lifecycleStatus, 'DRAFT');

      createdProjectId = data.project.projectId || data.project.id;
    });
  });

  // ==========================================
  // SECTION 2: GEN-03 Requirements Designer
  // ==========================================
  describe('GEN-03: Requirements Designer & Confirmation Gates', () => {
    it('imports requirements from the linked Discovery assessment with provenance', async () => {
      const res = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/requirements/import-assessment`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ replaceExisting: false })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.importedCount >= 2);
      assert.ok(data.requirements.length >= 2);

      // Verify requirement fields and provenance
      const importedReq = data.requirements[0];
      assert.ok(importedReq);
      assert.equal(['FIT_GAP_FINDING', 'DISCOVERY_ASSESSMENT'].includes(importedReq.sourceType), true);
      assert.equal(['DRAFT', 'NEEDS_CLARIFICATION'].includes(importedReq.status), true);
    });

    it('creates a manual requirement with custom category and acceptance criteria', async () => {
      const reqPayload = {
        title: 'Audit Trail & Change Logging',
        description: 'Record all quantity and price changes to PO items with timestamp and user ID.',
        category: 'VALIDATION',
        priority: 'MUST_HAVE',
        cleanCoreImpact: 'TIER_2_CLOUD_DEVELOPMENT',
        acceptanceCriteria: [
          'Change log table records old value and new value',
          'Only authorized buyers can view sensitive price changes'
        ]
      };

      const res = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/requirements`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(reqPayload)
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.requirement.title, 'Audit Trail & Change Logging');
      assert.equal(data.requirement.category, 'VALIDATION');
      assert.equal(data.requirement.sourceType, 'MANUAL_INPUT');
      assert.equal(data.requirement.acceptanceCriteria.length, 2);
    });

    it('confirms requirements and validates confirmation gate rules', async () => {
      // Fetch current list of requirements
      const listRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/requirements`, {
        headers: adminHeaders
      });
      assert.equal(listRes.status, 200);
      const listData = await listRes.json();
      assert.ok(listData.requirements.length >= 3);

      // Confirm all pending requirements
      for (const req of listData.requirements) {
        const reqId = req.requirementId || req.id;
        const confirmRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/requirements/${reqId}/confirm`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            action: 'CONFIRM',
            comment: 'Approved during sprint review'
          })
        });

        assert.equal(confirmRes.status, 200);
        const confirmData = await confirmRes.json();
        assert.equal(confirmData.success, true);
        assert.equal(confirmData.requirement.status, 'CONFIRMED');
      }

      // Check project summary and lifecycle advancement
      const updatedListRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/requirements`, {
        headers: adminHeaders
      });
      const updatedData = await updatedListRes.json();
      assert.equal(updatedData.summary.allConfirmedOrResolved, true);
      assert.equal(updatedData.summary.pendingCount, 0);

      // Verify project lifecycle state advanced to REQUIREMENTS_CONFIRMED
      const projRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}`, {
        headers: adminHeaders
      });
      const projData = await projRes.json();
      assert.equal(projData.project.lifecycleStatus, 'REQUIREMENTS_CONFIRMED');
    });

    it('supports deferring requirement with reason', async () => {
      // Add another requirement to defer
      const reqRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/requirements`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          title: 'Advanced AI Price Prediction',
          description: 'Predict bulk discount price based on historical vendors.',
          category: 'BUSINESS_RULE',
          priority: 'NICE_TO_HAVE',
          acceptanceCriteria: ['Predict price within 5% error margin']
        })
      });
      const reqData = await reqRes.json();
      const reqId = reqData.requirement.requirementId || reqData.requirement.id;

      // Defer it
      const deferRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/requirements/${reqId}/confirm`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          action: 'DEFER',
          deferralReason: 'Deferred to Phase 2 roadmap'
        })
      });

      assert.equal(deferRes.status, 200);
      const deferData = await deferRes.json();
      assert.equal(deferData.requirement.status, 'DEFERRED');
      assert.equal(deferData.requirement.deferralOrRejectionReason, 'Deferred to Phase 2 roadmap');
    });
  });

  // ==========================================
  // SECTION 3: GEN-04 Data Model Designer
  // ==========================================
  describe('GEN-04: Data Model Designer & Multi-Category Validation Engine', () => {
    it('searches and retrieves standard SAP CDS views from reuse registry', async () => {
      const res = await fetch(`${baseUrl}/api/v1/generation/data-model/cds-registry?query=Currency`, {
        headers: adminHeaders
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.views.length >= 1);
      assert.equal(data.views[0].cdsViewName, 'I_Currency');
    });

    it('creates Root Entity with fields and ABAP types', async () => {
      const entityPayload = {
        name: 'PurchaseOrder',
        description: 'Purchase Order Root Entity',
        entityType: 'ROOT',
        isRoot: true,
        tableName: 'ZPURCHASE_ORDER',
        cdsViewName: 'ZR_PurchaseOrder',
        fields: [
          {
            name: 'PurchaseOrder',
            description: 'Purchase Order ID',
            type: 'abap.char',
            length: 10,
            isKey: true,
            isMandatory: true,
            semanticRole: 'DOCUMENT_NUMBER'
          },
          {
            name: 'CompanyCode',
            description: 'Company Code',
            type: 'abap.char',
            length: 4,
            isMandatory: true,
            semanticRole: 'CODE'
          },
          {
            name: 'TotalNetAmount',
            description: 'Total Net Amount',
            type: 'abap.curr',
            length: 15,
            decimals: 2,
            currencyRef: 'Currency',
            semanticRole: 'AMOUNT'
          },
          {
            name: 'Currency',
            description: 'Document Currency',
            type: 'abap.cuky',
            length: 5,
            semanticRole: 'CURRENCY_CODE'
          }
        ]
      };

      const res = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/data-model/entities`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(entityPayload)
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.entity.name, 'PurchaseOrder');
      assert.equal(data.entity.fields.length, 4);
    });

    it('creates Child Entity and Composition relationship', async () => {
      // 1. Create Child entity
      const itemPayload = {
        name: 'PurchaseOrderItem',
        description: 'Purchase Order Item Detail',
        entityType: 'CHILD',
        isRoot: false,
        parentEntity: 'PurchaseOrder',
        tableName: 'ZPURCHASE_ITEM',
        cdsViewName: 'ZR_PurchaseOrderItem',
        fields: [
          {
            name: 'PurchaseOrder',
            description: 'Parent Order ID',
            type: 'abap.char',
            length: 10,
            isKey: true,
            isMandatory: true
          },
          {
            name: 'PurchaseOrderItem',
            description: 'Item Number',
            type: 'abap.numc',
            length: 5,
            isKey: true,
            isMandatory: true,
            semanticRole: 'ITEM_NUMBER'
          },
          {
            name: 'Material',
            description: 'Material Number',
            type: 'abap.char',
            length: 40,
            semanticRole: 'IDENTIFIER'
          },
          {
            name: 'OrderQuantity',
            description: 'Order Quantity',
            type: 'abap.quan',
            length: 13,
            decimals: 3,
            unitRef: 'OrderQuantityUnit',
            semanticRole: 'QUANTITY'
          },
          {
            name: 'OrderQuantityUnit',
            description: 'Unit of Measure',
            type: 'abap.unit',
            length: 3,
            semanticRole: 'UNIT_CODE'
          }
        ]
      };

      const itemRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/data-model/entities`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(itemPayload)
      });

      assert.equal(itemRes.status, 201);

      // 2. Add Composition relationship
      const relPayload = {
        sourceEntityId: 'PurchaseOrder',
        targetEntityId: 'PurchaseOrderItem',
        name: '_Item',
        relationshipType: 'COMPOSITION',
        cardinality: '1..*',
        mapping: [
          { sourceField: 'PurchaseOrder', targetField: 'PurchaseOrder' }
        ]
      };

      const relRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/data-model/relationships`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(relPayload)
      });

      assert.equal(relRes.status, 201);
      const relData = await relRes.json();
      assert.equal(relData.success, true);
      assert.equal(relData.relationship.relationshipType, 'COMPOSITION');
    });

    it('detects circular composition dependency graph and rejects invalid cycle', async () => {
      // Attempt to add composition pointing backwards from Item to Order
      const cyclePayload = {
        sourceEntityId: 'PurchaseOrderItem',
        targetEntityId: 'PurchaseOrder',
        name: '_OrderBackRef',
        relationshipType: 'COMPOSITION',
        cardinality: '1..1'
      };

      const res = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/data-model/relationships`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(cyclePayload)
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.errorMessage, /Circular composition/i);
    });

    it('runs comprehensive validation engine and advances project to DATA_MODEL_VALIDATED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}/data-model/validate`, {
        method: 'POST',
        headers: adminHeaders
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.validationReport);
      assert.equal(['VALID', 'VALID_WITH_WARNINGS', 'PENDING_SAP_VERIFICATION'].includes(data.validationReport.status), true);
      assert.equal(data.validationReport.errorCount, 0);

      // Verify project state in store
      const projRes = await fetch(`${baseUrl}/api/v1/generation/projects/${createdProjectId}`, {
        headers: adminHeaders
      });
      const projData = await projRes.json();
      assert.equal(
        ['DATA_MODEL_VALIDATED', 'READY_FOR_ARCHITECTURE'].includes(projData.project.lifecycleStatus),
        true
      );
    });

    it('persists data model across store reload without losing attributes', async () => {
      // Create new instance of store pointing to the same folder
      const reloadStore = new GenerationProjectStore(testProjectsDir);
      const reloadedProject = await reloadStore.getProject(createdProjectId);

      assert.ok(reloadedProject);
      assert.equal(reloadedProject.dataModelSpec.entities.length, 2);
      assert.equal(reloadedProject.dataModelSpec.relationships.length, 1);
      assert.ok(reloadedProject.requirementsSpec.items.length >= 3);
      assert.ok(reloadedProject.dataModelSpec.validationReport);
    });
  });
});
