import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrontendGenerationProjectService } from '../services/generationProjectService';
import {
  GenerationRequirement,
  GenerationEntity,
  GenerationField,
  GenerationRelationship,
  DataModelValidationReport
} from '../types';

describe('Generation Studio Milestones 2–4: Frontend Service Integration', () => {
  let service: FrontendGenerationProjectService;

  beforeEach(() => {
    service = new FrontendGenerationProjectService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // SECTION 1: GEN-02 Assessment Context
  // ==========================================
  describe('GEN-02: Assessment Context Resolution', () => {
    it('fetches server-authoritative assessment context with BUILD eligibility', async () => {
      const mockContext = {
        success: true,
        assessmentId: 'ASM-BUILD-PO',
        tcode: 'ME21N',
        transactionCode: 'ME21N',
        description: 'Purchase Order Modernization',
        businessDomain: 'Sourcing and Procurement',
        systemId: 'S21',
        client: '200',
        targetRelease: 'SAP S/4HANA 2023 On-Premise',
        recommendation: { outcome: 'BUILD' },
        lifecycleStatus: 'APPROVED',
        identifiedGaps: ['Multi-level release matrix approval'],
        evaluatedCandidates: [],
        technicalEvidenceSummary: { programName: 'SAPMM06E' },
        approvalProvenance: { approver: 'Dr. Marcus Weber' },
        isEligibleForBuild: true
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockContext
      } as Response);

      const result = await service.getAssessmentContext('ASM-BUILD-PO');
      expect(result.isEligibleForBuild).toBe(true);
      expect(result.tcode).toBe('ME21N');
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/context/ASM-BUILD-PO');
    });
  });

  // ==========================================
  // SECTION 2: GEN-03 Requirements Service
  // ==========================================
  describe('GEN-03: Requirements Management & Confirmation Gates', () => {
    it('lists requirements and parses summary statistics', async () => {
      const mockRequirementsResponse = {
        success: true,
        projectId: 'GEN-ME21N-001',
        totalCount: 2,
        summary: {
          totalCount: 2,
          confirmedCount: 1,
          needsClarificationCount: 0,
          deferredCount: 0,
          rejectedCount: 0,
          draftCount: 1,
          pendingCount: 1,
          mustHaveOutstandingCount: 1,
          isGateSatisfied: false,
          allConfirmedOrResolved: false
        },
        requirements: [
          {
            requirementId: 'REQ-01',
            projectId: 'GEN-ME21N-001',
            title: 'Multi-level release approval',
            category: 'WORKFLOW',
            priority: 'MUST_HAVE',
            status: 'CONFIRMED'
          },
          {
            requirementId: 'REQ-02',
            projectId: 'GEN-ME21N-001',
            title: 'Supplier ISO-9001 check',
            category: 'VALIDATION',
            priority: 'MUST_HAVE',
            status: 'DRAFT'
          }
        ]
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockRequirementsResponse
      } as Response);

      const result = await service.listRequirements('GEN-ME21N-001');
      expect(result.requirements).toHaveLength(2);
      expect(result.summary.isGateSatisfied).toBe(false);
      expect(result.summary.pendingCount).toBe(1);
    });

    it('imports requirements from Discovery assessment with provenance', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          importedCount: 3,
          requirements: [
            { requirementId: 'REQ-IMP-01', title: 'Gap 1', sourceType: 'FIT_GAP_FINDING' }
          ]
        })
      } as Response);

      const result = await service.importRequirementsFromAssessment('GEN-ME21N-001', 'ASM-BUILD-PO');
      expect(result.importedCount).toBe(3);
      expect(result.requirements[0].sourceType).toBe('FIT_GAP_FINDING');
    });

    it('executes confirmation action on a requirement', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          requirement: {
            requirementId: 'REQ-01',
            status: 'CONFIRMED',
            confirmedBy: 'Lead SAP Architect'
          },
          summary: {
            totalCount: 1,
            confirmedCount: 1,
            pendingCount: 0,
            isGateSatisfied: true
          }
        })
      } as Response);

      const result = await service.confirmRequirement('GEN-ME21N-001', 'REQ-01', 'CONFIRM', 'Approved in design review');
      expect(result.requirement.status).toBe('CONFIRMED');
      expect(result.summary.isGateSatisfied).toBe(true);
    });
  });

  // ==========================================
  // SECTION 3: GEN-04 Data Model Service
  // ==========================================
  describe('GEN-04: Data Model Designer & Validation', () => {
    it('fetches CDS data model specification and parses entities', async () => {
      const mockSpec = {
        specVersion: 1,
        entities: [
          {
            entityId: 'ENT-01',
            name: 'PurchaseOrder',
            entityType: 'ROOT',
            fields: [{ fieldId: 'F-01', name: 'PurchaseOrder', type: 'abap.char', isKey: true }]
          }
        ],
        relationships: [],
        status: 'DRAFT_IN_PROGRESS'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, dataModel: mockSpec })
      } as Response);

      const result = await service.getDataModel('GEN-ME21N-001');
      expect(result.dataModel.entities).toHaveLength(1);
      expect(result.dataModel.entities[0].name).toBe('PurchaseOrder');
    });

    it('adds an entity to the data model', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          entity: {
            entityId: 'ENT-ITEM',
            name: 'PurchaseOrderItem',
            entityType: 'CHILD',
            fields: []
          }
        })
      } as Response);

      const result = await service.addEntity('GEN-ME21N-001', {
        name: 'PurchaseOrderItem',
        entityType: 'CHILD'
      });
      expect(result.entity.name).toBe('PurchaseOrderItem');
    });

    it('adds a relationship between entities', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          relationship: {
            relationshipId: 'REL-01',
            name: '_Item',
            relationshipType: 'COMPOSITION',
            cardinality: '[0..*]'
          }
        })
      } as Response);

      const result = await service.addRelationship('GEN-ME21N-001', {
        name: '_Item',
        relationshipType: 'COMPOSITION',
        sourceEntityId: 'ENT-01',
        targetEntityId: 'ENT-ITEM'
      });
      expect(result.relationship.name).toBe('_Item');
      expect(result.relationship.relationshipType).toBe('COMPOSITION');
    });

    it('validates data model and parses multi-category report findings', async () => {
      const mockReport: DataModelValidationReport = {
        status: 'VALID_WITH_WARNINGS',
        errorCount: 0,
        warningCount: 1,
        infoCount: 1,
        blockingCount: 0,
        summary: {
          totalFindings: 2,
          errorsCount: 0,
          warningsCount: 1,
          infoCount: 1,
          blockingCount: 0
        },
        findings: [
          {
            findingId: 'FND-01',
            ruleId: 'RULE_REQ_ROOT_COVERAGE',
            category: 'BUSINESS_INTEGRITY',
            severity: 'INFO',
            message: 'Root entity not mapped',
            explanation: 'Traceability check',
            remediation: 'Link root entity to requirement',
            provenance: 'DATA_MODEL_VALIDATOR',
            blocksProgression: false
          }
        ],
        validatedAt: '2026-11-10T12:00:00Z'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, validationReport: mockReport })
      } as Response);

      const result = await service.validateDataModel('GEN-ME21N-001');
      expect(result.validationReport.status).toBe('VALID_WITH_WARNINGS');
      expect(result.validationReport.errorCount).toBe(0);
      expect(result.validationReport.findings).toHaveLength(1);
    });

    it('searches standard SAP CDS reuse registry', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          count: 1,
          views: [
            {
              technicalName: 'I_Currency',
              businessDescription: 'Currency Master Data',
              category: 'MASTER_DATA',
              releaseContract: 'C1'
            }
          ]
        })
      } as Response);

      const result = await service.searchCdsRegistry('Currency');
      expect(result.views).toHaveLength(1);
      expect(result.views[0].technicalName).toBe('I_Currency');
      expect(result.views[0].releaseContract).toBe('C1');
    });
  });
});
