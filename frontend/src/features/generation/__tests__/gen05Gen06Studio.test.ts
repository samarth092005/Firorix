import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrontendGenerationProjectService } from '../services/generationProjectService';
import {
  ArchitectureSpec,
  GeneratedArtifact,
  StaticValidationReport,
  TraceabilityItem
} from '../types';

describe('GEN-05 & GEN-06: Frontend Generation Studio Service Integration', () => {
  let service: FrontendGenerationProjectService;

  beforeEach(() => {
    service = new FrontendGenerationProjectService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // SECTION 1: GEN-05 RAP Architecture
  // ==========================================
  describe('GEN-05: RAP Architecture Designer Service', () => {
    it('evaluates and proposes RAP architecture profile based on project requirements', async () => {
      const mockArchitecture: ArchitectureSpec = {
        specVersion: 1,
        selectedProfile: 'MANAGED_RAP_DRAFT',
        rationale: 'Transactional editing requires draft preservation',
        persistenceApproach: 'NEW_TABLES_WITH_DRAFT',
        draftDecision: {
          enabled: true,
          draftTableName: 'ZPAY_HEADER_D',
          reason: 'Draft state preservation for multi-step approval'
        },
        lockStrategy: 'OPTIMISTIC_LOCK_VIA_ETAG',
        etagStrategy: 'LOCAL_INSTANCE_LAST_CHANGED_AT',
        authorizationStrategy: 'INSTANCE_AUTHORIZATION_VIA_DCL',
        serviceProtocol: 'ODATA_V4',
        cleanCoreImplications: {
          tier: 'TIER_2',
          guideline: 'Clean Core Compliant ABAP Cloud Language Version 5',
          notes: ['Standard released CDS views used for associations']
        },
        unresolvedDesignDecisions: [],
        supportingEvidenceReferences: [],
        evaluatedAt: new Date().toISOString(),
        status: 'PROPOSED'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ architecture: mockArchitecture, lifecycleStatus: 'ARCH_DESIGN' })
      } as Response);

      const result = await service.evaluateArchitecture('PRJ-001');
      expect(result.architecture.selectedProfile).toBe('MANAGED_RAP_DRAFT');
      expect(result.architecture.draftDecision.enabled).toBe(true);
      expect(result.architecture.cleanCoreImplications.tier).toBe('TIER_2');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-001/architecture/evaluate', expect.objectContaining({
        method: 'POST'
      }));
    });

    it('retrieves existing architecture specification', async () => {
      const mockArchitecture: ArchitectureSpec = {
        specVersion: 1,
        selectedProfile: 'MANAGED_RAP_NON_DRAFT',
        rationale: 'Single-stage save without draft staging',
        persistenceApproach: 'NEW_PERSISTENCE_TABLE',
        draftDecision: {
          enabled: false,
          draftTableName: null,
          reason: 'Direct update without staging'
        },
        lockStrategy: 'EXCLUSIVE_LOCK',
        etagStrategy: 'LAST_CHANGED_AT',
        authorizationStrategy: 'DCL_AUTHORIZATION',
        serviceProtocol: 'ODATA_V4',
        cleanCoreImplications: {
          tier: 'TIER_2',
          guideline: 'Clean Core Compliant',
          notes: []
        },
        unresolvedDesignDecisions: [],
        supportingEvidenceReferences: [],
        evaluatedAt: new Date().toISOString(),
        status: 'CONFIRMED'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ architecture: mockArchitecture, lifecycleStatus: 'ARCH_DESIGN' })
      } as Response);

      const result = await service.getArchitecture('PRJ-002');
      expect(result.architecture.selectedProfile).toBe('MANAGED_RAP_NON_DRAFT');
      expect(result.architecture.draftDecision.enabled).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-002/architecture');
    });

    it('updates architecture specification', async () => {
      const patchSpec: Partial<ArchitectureSpec> = {
        lockStrategy: 'OPTIMISTIC_LOCK_VIA_ETAG',
        status: 'CONFIRMED'
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          architecture: {
            specVersion: 1,
            selectedProfile: 'MANAGED_RAP_DRAFT',
            rationale: 'Manual update',
            persistenceApproach: 'NEW_TABLES_WITH_DRAFT',
            draftDecision: { enabled: true, reason: 'draft' },
            lockStrategy: 'OPTIMISTIC_LOCK_VIA_ETAG',
            etagStrategy: 'LOCAL_INSTANCE_LAST_CHANGED_AT',
            authorizationStrategy: 'DCL',
            serviceProtocol: 'ODATA_V4',
            cleanCoreImplications: { tier: 'TIER_2', guideline: 'Clean Core', notes: [] },
            unresolvedDesignDecisions: [],
            supportingEvidenceReferences: [],
            status: 'CONFIRMED',
            ...patchSpec
          },
          lifecycleStatus: 'ARCH_DESIGN'
        })
      } as Response);

      const result = await service.updateArchitecture('PRJ-001', patchSpec);
      expect(result.architecture.lockStrategy).toBe('OPTIMISTIC_LOCK_VIA_ETAG');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-001/architecture', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(patchSpec)
      }));
    });
  });

  // ==========================================
  // SECTION 2: GEN-05 ABAP Code Generation
  // ==========================================
  describe('GEN-05: ABAP Code Generator Service', () => {
    it('triggers full ABAP generation pipeline and returns generated artifacts', async () => {
      const mockAbapResult = {
        totalGenerated: 2,
        artifacts: [
          {
            artifactId: 'art-tabl-01',
            projectId: 'PRJ-001',
            artifactType: 'TABLE_DEFINITION',
            objectName: 'zpay_header',
            filePath: 'abap/tables/zpay_header.tabl.xml',
            content: 'define table zpay_header { ... }',
            language: 'ABAP',
            generationTemplateVersion: '1.0.0',
            generatedAt: new Date().toISOString(),
            version: 1,
            checksum: 'hash123',
            validationStatus: 'VALID',
            manualEditStatus: 'ORIGINAL' as const,
            dependencies: []
          },
          {
            artifactId: 'art-cds-01',
            projectId: 'PRJ-001',
            artifactType: 'CDS_INTERFACE_VIEW',
            objectName: 'ZI_PaymentHeader',
            filePath: 'abap/cds/zi_paymentheader.ddls.asddls',
            content: 'define view entity ZI_PaymentHeader ...',
            language: 'CDS',
            generationTemplateVersion: '1.0.0',
            generatedAt: new Date().toISOString(),
            version: 1,
            checksum: 'hash456',
            validationStatus: 'VALID',
            manualEditStatus: 'ORIGINAL' as const,
            dependencies: ['art-tabl-01']
          }
        ],
        runRecord: {
          runId: 'RUN-001',
          projectId: 'PRJ-001',
          phase: 'ABAP_GENERATION',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          result: 'SUCCESS',
          inputSnapshotHash: 'hash000',
          generatedArtifactIds: ['art-tabl-01', 'art-cds-01'],
          preservedManualEditsCount: 0,
          overwrittenCount: 0,
          errors: [],
          warnings: [],
          templateVersion: '1.0.0'
        }
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockAbapResult
      } as Response);

      const result = await service.generateAbap('PRJ-001');
      expect(result.artifacts).toHaveLength(2);
      expect(result.totalGenerated).toBe(2);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-001/abap/generate', expect.objectContaining({
        method: 'POST'
      }));
    });

    it('retrieves traceability matrix mapping requirements to ABAP artifacts', async () => {
      const mockTraceability: TraceabilityItem[] = [
        {
          requirementId: 'REQ-001',
          title: 'Calculate Discount Due Date',
          category: 'BUSINESS_LOGIC',
          priority: 'MUST_HAVE',
          status: 'IMPLEMENTED',
          mappedArtifactsCount: 1,
          mappedArtifacts: [
            {
              artifactId: 'art-clas-01',
              objectName: 'bp_i_paymentheader',
              artifactType: 'BEHAVIOR_IMPLEMENTATION',
              filePath: 'abap/classes/bp_i_paymentheader.clas.abap'
            }
          ]
        }
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ traceabilityMatrix: mockTraceability })
      } as Response);

      const result = await service.getTraceability('PRJ-001');
      expect(result.traceabilityMatrix).toHaveLength(1);
      expect(result.traceabilityMatrix[0].requirementId).toBe('REQ-001');
      expect(result.traceabilityMatrix[0].mappedArtifacts[0].objectName).toBe('bp_i_paymentheader');
    });
  });

  // ==========================================
  // SECTION 3: GEN-06 Fiori Elements Generator
  // ==========================================
  describe('GEN-06: SAP Fiori Elements Generator Service', () => {
    it('triggers Fiori Elements scaffolding generation with target UI5 1.120.0', async () => {
      const mockFioriConfig = {
        floorplan: 'ListReportObjectPage' as const,
        namespace: 'fiorix.payment',
        appTitle: 'Manage Payments S21',
        description: 'Modernized Fiori Elements Application'
      };

      const mockFioriResult = {
        totalGenerated: 2,
        artifacts: [
          {
            artifactId: 'art-fiori-manifest',
            projectId: 'PRJ-001',
            artifactType: 'FIORI_MANIFEST',
            objectName: 'manifest.json',
            filePath: 'fiori/webapp/manifest.json',
            content: '{ "sap.app": { "id": "fiorix.payment" } }',
            language: 'JSON',
            generationTemplateVersion: '1.0.0',
            generatedAt: new Date().toISOString(),
            version: 1,
            checksum: 'fiorihash1',
            validationStatus: 'VALID',
            manualEditStatus: 'ORIGINAL' as const,
            dependencies: []
          },
          {
            artifactId: 'art-fiori-annotations',
            projectId: 'PRJ-001',
            artifactType: 'FIORI_ANNOTATIONS',
            objectName: 'annotations.xml',
            filePath: 'fiori/webapp/annotations/annotations.xml',
            content: '<edmx:Edmx ...></edmx:Edmx>',
            language: 'XML',
            generationTemplateVersion: '1.0.0',
            generatedAt: new Date().toISOString(),
            version: 1,
            checksum: 'fiorihash2',
            validationStatus: 'VALID',
            manualEditStatus: 'ORIGINAL' as const,
            dependencies: []
          }
        ],
        runRecord: {
          runId: 'RUN-002',
          projectId: 'PRJ-001',
          phase: 'FIORI_GENERATION',
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          result: 'SUCCESS',
          inputSnapshotHash: 'fiorihash0',
          generatedArtifactIds: ['art-fiori-manifest', 'art-fiori-annotations'],
          preservedManualEditsCount: 0,
          overwrittenCount: 0,
          errors: [],
          warnings: [],
          templateVersion: '1.0.0'
        }
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockFioriResult
      } as Response);

      const result = await service.generateFiori('PRJ-001', mockFioriConfig);
      expect(result.artifacts).toHaveLength(2);
      expect(result.totalGenerated).toBe(2);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-001/fiori/generate', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockFioriConfig)
      }));
    });
  });

  // ==========================================
  // SECTION 4: Artifact Registry & Manual Edits
  // ==========================================
  describe('Artifact Registry, Manual Edits & Validation', () => {
    it('fetches artifact registry items', async () => {
      const mockArtifacts: GeneratedArtifact[] = [
        {
          artifactId: 'art-cds-01',
          projectId: 'PRJ-001',
          artifactType: 'CDS_INTERFACE_VIEW',
          objectName: 'ZI_PaymentHeader',
          filePath: 'abap/cds/zi_paymentheader.ddls.asddls',
          content: 'define view entity ...',
          language: 'CDS',
          generationTemplateVersion: '1.0.0',
          generatedAt: new Date().toISOString(),
          version: 1,
          checksum: 'hash1',
          validationStatus: 'VALID',
          manualEditStatus: 'ORIGINAL' as const,
          dependencies: []
        }
      ];

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 1, artifacts: mockArtifacts, version: 1 })
      } as Response);

      const result = await service.getArtifacts('PRJ-001');
      expect(result.artifacts).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-001/artifacts');
    });

    it('updates an artifact and marks it as manually edited', async () => {
      const updatedArtifact: GeneratedArtifact = {
        artifactId: 'art-cds-01',
        projectId: 'PRJ-001',
        artifactType: 'CDS_INTERFACE_VIEW',
        objectName: 'ZI_PaymentHeader',
        filePath: 'abap/cds/zi_paymentheader.ddls.asddls',
        content: 'define view entity ZI_PaymentHeader { // custom field added }',
        language: 'CDS',
        generationTemplateVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        version: 2,
        checksum: 'newhash999',
        validationStatus: 'VALID',
        manualEditStatus: 'MODIFIED' as const,
        dependencies: []
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ artifact: updatedArtifact, manualEditStatus: 'MODIFIED' })
      } as Response);

      const result = await service.updateArtifact('PRJ-001', 'art-cds-01', updatedArtifact.content);
      expect(result.artifact.manualEditStatus).toBe('MODIFIED');
      expect(result.manualEditStatus).toBe('MODIFIED');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-001/artifacts/art-cds-01', expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ content: updatedArtifact.content })
      }));
    });

    it('restores an artifact to its generated baseline template', async () => {
      const restoredArtifact: GeneratedArtifact = {
        artifactId: 'art-cds-01',
        projectId: 'PRJ-001',
        artifactType: 'CDS_INTERFACE_VIEW',
        objectName: 'ZI_PaymentHeader',
        filePath: 'abap/cds/zi_paymentheader.ddls.asddls',
        content: 'define view entity ZI_PaymentHeader { original }',
        language: 'CDS',
        generationTemplateVersion: '1.0.0',
        generatedAt: new Date().toISOString(),
        version: 3,
        checksum: 'originalhash',
        validationStatus: 'VALID',
        manualEditStatus: 'ORIGINAL' as const,
        dependencies: []
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ artifact: restoredArtifact })
      } as Response);

      const result = await service.restoreArtifact('PRJ-001', 'art-cds-01');
      expect(result.artifact.manualEditStatus).toBe('ORIGINAL');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-001/artifacts/art-cds-01/restore', expect.objectContaining({
        method: 'POST'
      }));
    });

    it('runs multi-stage static validation and returns validation report', async () => {
      const mockValidationReport: StaticValidationReport = {
        status: 'VALID_WITH_WARNINGS',
        isValid: true,
        totalFindings: 1,
        errorsCount: 0,
        warningsCount: 1,
        findings: [
          {
            ruleId: 'ABAP_MDE_NO_QUALIFIER',
            severity: 'WARNING',
            category: 'METADATA_EXTENSION',
            artifactId: 'art-mde-01',
            location: 'LineItem',
            message: 'LineItem position should be ordered',
            explanation: 'Ordering positions avoids rendering ambiguity',
            suggestedCorrection: 'Add position: 10',
            evidenceBasis: 'SAP Fiori Elements V4 Guidelines'
          }
        ],
        evaluatedAt: new Date().toISOString()
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ validationReport: mockValidationReport })
      } as Response);

      const report = await service.validateGeneration('PRJ-001');
      expect(report.validationReport.isValid).toBe(true);
      expect(report.validationReport.warningsCount).toBe(1);
      expect(report.validationReport.findings).toHaveLength(1);
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-001/validate-generation', expect.objectContaining({
        method: 'POST'
      }));
    });
  });
});
