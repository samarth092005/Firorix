import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrontendGenerationProjectService } from '../services/generationProjectService';

describe('Sprint 11: Deployment Workspace & SAP Integration Client Tests', () => {
  let service: FrontendGenerationProjectService;

  beforeEach(() => {
    service = new FrontendGenerationProjectService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Fetches 15-point SAP Preflight diagnostics', async () => {
    const mockPreflight = {
      success: true,
      overallReadiness: 'READY',
      targetSystem: { systemId: 'S21', client: '200', release: 'SAP S/4HANA 2023 Private Edition' },
      summary: { totalChecks: 15, passed: 15, warnings: 0, failed: 0 },
      checks: [
        { id: 'BASE_URL', name: 'Base URL', status: 'PASSED' },
        { id: 'ADT_DISCOVERY', name: 'ADT Discovery', status: 'PASSED' }
      ]
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPreflight
    });

    const res = await service.getPreflightDiagnostics();
    expect(res.success).toBe(true);
    expect(res.overallReadiness).toBe('READY');
    expect(res.checks.length).toBe(2);
    expect(fetch).toHaveBeenCalledWith('/api/v1/generation/preflight');
  });

  it('2. Retrieves deployment readiness combining preflight and artifact compatibility', async () => {
    const mockReadiness = {
      success: true,
      readiness: {
        projectId: 'PRJ-SO-01',
        readyForDeploymentPlanning: true,
        status: 'READY',
        compatibilitySummary: { rating: 'COMPATIBLE_WITH_LIMITATIONS', score: 95 }
      }
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockReadiness
    });

    const res = await service.getDeploymentReadiness('PRJ-SO-01');
    expect(res.readiness.readyForDeploymentPlanning).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-SO-01/deployments/readiness');
  });

  it('3. Generates deployment plan with dependency DAG and plan hash', async () => {
    const mockPlan = {
      id: 'DEP-PLAN-01',
      projectId: 'PRJ-SO-01',
      targetSystem: 'S21',
      targetClient: '200',
      targetPackage: '$TMP',
      planHash: 'abc123hash',
      status: 'PLANNED',
      planDetails: {
        operations: [{ sequence: 1, artifactType: 'DDIC_TABLE', objectName: 'ZSO_HEADER' }]
      }
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, plan: mockPlan })
    });

    const res = await service.generateDeploymentPlan('PRJ-SO-01', { targetPackage: '$TMP' });
    expect(res.plan.id).toBe('DEP-PLAN-01');
    expect(res.plan.planDetails.operations.length).toBe(1);
  });

  it('4. Executes deployment plan and enforces STOPPED_AT_WRITE_BOUNDARY guard', async () => {
    const mockExecution = {
      id: 'DEP-EXEC-01',
      planId: 'DEP-PLAN-01',
      lifecycleStatus: 'STOPPED_AT_WRITE_BOUNDARY',
      executionBoundaryStatus: 'STOPPED_AT_WRITE_BOUNDARY',
      logs: [
        { timestamp: new Date().toISOString(), level: 'GUARDRAIL', message: 'CRITICAL GUARDRAIL: Halting execution at the SAP S/4HANA Write Boundary.' }
      ],
      verificationResults: {
        overallVerificationStatus: 'UNVERIFIED',
        checks: [{ id: 'VERIF_ABAP_OBJECT_EXISTENCE', status: 'NOT_FOUND' }]
      }
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, execution: mockExecution })
    });

    const res = await service.executeDeploymentPlan('DEP-PLAN-01');
    expect(res.execution.executionBoundaryStatus).toBe('STOPPED_AT_WRITE_BOUNDARY');
    expect(res.execution.logs[0].level).toBe('GUARDRAIL');
  });
});
