import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrontendGenerationProjectService } from '../services/generationProjectService';
import { GenerationProject, CreateProjectPayload } from '../types';

describe('Generation Studio Phase 1 — Frontend Service & Contract Integration', () => {
  let service: FrontendGenerationProjectService;

  const mockProject: GenerationProject = {
    projectId: 'GEN-ME21N-001',
    schemaVersion: '1.0.0',
    projectName: 'Purchase Order Modernization',
    description: 'Custom Clean Core RAP application replacing ME21N dynpro screen variants',
    origin: 'DISCOVERY_BUILD',
    sourceAssessmentId: 'ASM-2026-ME21N',
    sourceTransactionCode: 'ME21N',
    sourceSystemId: 'S21',
    sourceClient: '200',
    targetProduct: 'SAP S/4HANA',
    targetRelease: 'SAP S/4HANA 2023 On-Premise',
    targetDeploymentModel: 'ON_PREMISE',
    lifecycleStatus: 'DRAFT',
    currentPhase: 'PHASE_1_WORKSPACE',
    specificationVersion: 1,
    createdAt: '2026-11-10T10:00:00.000Z',
    updatedAt: '2026-11-10T10:00:00.000Z',
    createdBy: 'Lead SAP Architect',
    assessmentContext: {
      businessDomain: 'Sourcing and Procurement',
      programName: 'SAPMM06E',
      packageName: 'ME',
      softwareComponent: 'S4CORE 108',
      identifiedGaps: ['Subcontracting dynpro screen variant', 'Clean Core Tier 2 compliance'],
      approvalProvenance: {
        approvedAt: '2026-11-10T10:00:00.000Z',
        approver: 'Dr. Marcus Weber',
        justification: 'Approved custom RAP application due to proprietary purchasing extensions.'
      }
    },
    activityHistory: [
      {
        eventId: 'EVT-001',
        timestamp: '2026-11-10T10:00:00.000Z',
        author: 'Lead SAP Architect',
        action: 'PROJECT_CREATED',
        details: { status: 'DRAFT' },
        previousStatus: null,
        newStatus: 'DRAFT'
      }
    ]
  };

  beforeEach(() => {
    service = new FrontendGenerationProjectService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. listProjects constructs correct query parameters and parses paginated results', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        total: 1,
        count: 1,
        page: 1,
        pageSize: 10,
        projects: [mockProject]
      })
    } as any);

    const res = await service.listProjects({
      search: 'ME21N',
      lifecycleStatus: 'DRAFT',
      origin: 'DISCOVERY_BUILD',
      page: 1,
      pageSize: 10
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/generation/projects?search=ME21N&lifecycleStatus=DRAFT&origin=DISCOVERY_BUILD&page=1&pageSize=10'
    );
    expect(res.total).toBe(1);
    expect(res.projects[0].projectId).toBe('GEN-ME21N-001');
    expect(res.projects[0].origin).toBe('DISCOVERY_BUILD');
  });

  it('2. getProject retrieves single project record by ID', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, project: mockProject })
    } as any);

    const project = await service.getProject('GEN-ME21N-001');
    expect(project).toBeDefined();
    expect(project.projectId).toBe('GEN-ME21N-001');
    expect(project.sourceTransactionCode).toBe('ME21N');
  });

  it('3. createProject sends valid payload for standalone projects', async () => {
    const standalonePayload: CreateProjectPayload = {
      projectName: 'Internal Quality Audit Tool',
      description: 'Independent test workspace',
      origin: 'STANDALONE',
      targetRelease: 'SAP S/4HANA 2023 On-Premise',
      targetDeploymentModel: 'ON_PREMISE'
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        statusCode: 'CREATED',
        project: {
          ...mockProject,
          projectId: 'GEN-STANDALONE-ABC123',
          projectName: 'Internal Quality Audit Tool',
          origin: 'STANDALONE',
          sourceAssessmentId: null,
          sourceTransactionCode: null
        }
      })
    } as any);

    const res = await service.createProject(standalonePayload);
    expect(res.project.origin).toBe('STANDALONE');
    expect(res.project.sourceAssessmentId).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/generation/projects',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('4. duplicateProject creates a copy with a distinct ID', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        project: {
          ...mockProject,
          projectId: 'GEN-ME21N-001-COPY',
          projectName: 'Purchase Order Modernization (Copy)'
        }
      })
    } as any);

    const duplicated = await service.duplicateProject('GEN-ME21N-001', {
      newProjectName: 'Purchase Order Modernization (Copy)'
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/v1/generation/projects/GEN-ME21N-001/duplicate',
      expect.objectContaining({ method: 'POST' })
    );
    expect(duplicated.projectId).toBe('GEN-ME21N-001-COPY');
  });

  it('5. archiveProject and restoreProject toggle project lifecycle states safely', async () => {
    const archiveSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        project: { ...mockProject, lifecycleStatus: 'ARCHIVED' }
      })
    } as any);

    const archived = await service.archiveProject('GEN-ME21N-001');
    expect(archived.lifecycleStatus).toBe('ARCHIVED');
    expect(archiveSpy).toHaveBeenCalledWith(
      '/api/v1/generation/projects/GEN-ME21N-001/archive',
      expect.objectContaining({ method: 'POST' })
    );

    const restoreSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        project: { ...mockProject, lifecycleStatus: 'DRAFT' }
      })
    } as any);

    const restored = await service.restoreProject('GEN-ME21N-001');
    expect(restored.lifecycleStatus).toBe('DRAFT');
    expect(restoreSpy).toHaveBeenCalledWith(
      '/api/v1/generation/projects/GEN-ME21N-001/restore',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('6. deleteProject dispatches DELETE with confirmation parameter', async () => {
    const deleteSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, deletedProjectId: 'GEN-ME21N-001' })
    } as any);

    const success = await service.deleteProject('GEN-ME21N-001', true);
    expect(success).toBe(true);
    expect(deleteSpy).toHaveBeenCalledWith(
      '/api/v1/generation/projects/GEN-ME21N-001?confirmed=true',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('7. getProjectSummary returns data-driven real phase progress without hallucination', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        summary: {
          projectId: 'GEN-ME21N-001',
          projectName: 'Purchase Order Modernization',
          origin: 'DISCOVERY_BUILD',
          lifecycleStatus: 'DRAFT',
          targetRelease: 'SAP S/4HANA 2023 On-Premise',
          targetDeploymentModel: 'ON_PREMISE',
          phases: [
            { id: 'PHASE_1_WORKSPACE', name: 'Workspace Foundation', isCompleted: true, notes: 'Operational' },
            { id: 'PHASE_2_REQUIREMENTS', name: 'Requirements Scope', isCompleted: false, notes: 'Pending' }
          ],
          completedPhaseCount: 1,
          totalPhaseCount: 8,
          progressPercentage: 13,
          createdAt: '2026-11-10T10:00:00.000Z',
          updatedAt: '2026-11-10T10:00:00.000Z'
        }
      })
    } as any);

    const summary = await service.getProjectSummary('GEN-ME21N-001');
    expect(summary.completedPhaseCount).toBe(1);
    expect(summary.totalPhaseCount).toBe(8);
    expect(summary.progressPercentage).toBe(13);
  });

  it('8. getProjectActivity returns chronological audit trail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        count: 1,
        activityHistory: mockProject.activityHistory
      })
    } as any);

    const res = await service.getProjectActivity('GEN-ME21N-001');
    expect(res.count).toBe(1);
    expect(res.activityHistory[0].action).toBe('PROJECT_CREATED');
    expect(res.activityHistory[0].author).toBe('Lead SAP Architect');
  });

  it('9. handles API errors honestly with descriptive messages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        statusCode: 'UNAUTHORIZED_BUILD',
        errorMessage: 'Clean Core Guardrail: Lead Enterprise Architect approval is mandatory.'
      })
    } as any);

    await expect(service.createProject({
      sourceAssessmentId: 'ASM-UNAPPROVED',
      origin: 'DISCOVERY_BUILD',
      projectName: 'Blocked App'
    })).rejects.toThrow('Clean Core Guardrail: Lead Enterprise Architect approval is mandatory.');
  });
});
