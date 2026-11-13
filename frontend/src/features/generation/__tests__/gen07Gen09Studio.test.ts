import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FrontendGenerationProjectService } from '../services/generationProjectService';
import {
  PreviewSessionInfo,
  PreviewRequestLog,
  ExportReadinessResult,
  FullTraceabilityReport,
  ExportPackageResult,
  ToolchainReport,
  DeveloperHandoverGuide
} from '../types';

describe('GEN-07, GEN-08, GEN-09: Frontend Generation Studio Service Integration', () => {
  let service: FrontendGenerationProjectService;

  beforeEach(() => {
    service = new FrontendGenerationProjectService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // SECTION 1: GEN-07 Mock Preview & OData V4
  // ==========================================
  describe('GEN-07: Preview Manager Frontend Client', () => {
    it('starts preview server and returns session metadata with port in 4050-4099', async () => {
      const mockSession: PreviewSessionInfo = {
        sessionId: 'SES-01',
        projectId: 'PRJ-TEST',
        port: 4052,
        host: '127.0.0.1',
        previewUrl: 'http://127.0.0.1:4052/webapp/index.html',
        serviceBasePath: '/sap/opu/odata4/sap/zui_custom/srvd/sap/zui_custom/0001',
        metadataUrl: 'http://127.0.0.1:4052/$metadata',
        status: 'RUNNING',
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalRequests: 0,
        syntheticRecordCounts: { RootEntity: 5 }
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, session: mockSession })
      });

      const res = await service.startPreview('PRJ-TEST');
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/preview/start', {
        method: 'POST'
      });
      expect(res.session.status).toBe('RUNNING');
      expect(res.session.port).toBe(4052);
      expect(res.session.host).toBe('127.0.0.1');
    });

    it('fetches live preview status and request telemetry logs', async () => {
      const mockLogs: PreviewRequestLog[] = [
        { id: '1', timestamp: new Date().toISOString(), method: 'GET', url: '/$metadata', status: 200, durationMs: 15 },
        { id: '2', timestamp: new Date().toISOString(), method: 'GET', url: '/PurchaseOrder', status: 200, durationMs: 8 }
      ];

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, requests: mockLogs })
      });

      const res = await service.getPreviewRequests('PRJ-TEST');
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/preview/requests');
      expect(res.requests).toHaveLength(2);
      expect(res.requests[0].method).toBe('GET');
      expect(res.requests[0].status).toBe(200);
    });

    it('stops and restarts preview server gracefully', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: { stopped: true } })
      });

      const stopRes = await service.stopPreview('PRJ-TEST');
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/preview/stop', {
        method: 'POST'
      });
      expect(stopRes.result.stopped).toBe(true);

      const mockSession: PreviewSessionInfo = {
        sessionId: 'SES-02',
        projectId: 'PRJ-TEST',
        port: 4053,
        host: '127.0.0.1',
        previewUrl: 'http://127.0.0.1:4053/webapp/index.html',
        serviceBasePath: '/sap/opu/odata4/sap/zui_custom/srvd/sap/zui_custom/0001',
        metadataUrl: 'http://127.0.0.1:4053/$metadata',
        status: 'RUNNING',
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        totalRequests: 0
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, session: mockSession })
      });

      const restartRes = await service.restartPreview('PRJ-TEST');
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/preview/restart', {
        method: 'POST'
      });
      expect(restartRes.session.status).toBe('RUNNING');
    });

    it('resets synthetic in-memory store', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: { success: true, recordCounts: { PO: 5 } } })
      });

      const res = await service.resetSyntheticData('PRJ-TEST');
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/preview/synthetic-data/reset', {
        method: 'POST'
      });
      expect(res.result.success).toBe(true);
    });
  });

  // ==========================================
  // SECTION 2: GEN-08 Review, Traceability & Export
  // ==========================================
  describe('GEN-08: Review & Export Service', () => {
    it('checks export readiness gates and handles unacknowledged warnings', async () => {
      const mockReadiness: ExportReadinessResult = {
        canExport: false,
        requiresWarningAcknowledgment: true,
        reason: 'UNACKNOWLEDGED_WARNINGS',
        message: 'Project contains 1 warning(s).',
        errors: [],
        warnings: [{ ruleId: 'RULE_GEN05_CUSTOMER_NAMESPACE', message: 'Entity PurchaseOrder lacks Z prefix' }]
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, readiness: mockReadiness })
      });

      const res = await service.getExportReadiness('PRJ-TEST', false);
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/review/readiness');
      expect(res.readiness.canExport).toBe(false);
      expect(res.readiness.requiresWarningAcknowledgment).toBe(true);

      // Now query with acknowledgedWarnings = true
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, readiness: { ...mockReadiness, canExport: true } })
      });

      const resAck = await service.getExportReadiness('PRJ-TEST', true);
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/review/readiness?acknowledgedWarnings=true');
      expect(resAck.readiness.canExport).toBe(true);
    });

    it('fetches comprehensive Traceability Matrix with mathematical coverage percentages', async () => {
      const mockReport: FullTraceabilityReport = {
        projectId: 'PRJ-TEST',
        generatedAt: new Date().toISOString(),
        metrics: {
          totalRequirements: 5,
          fullyMappedRequirements: 4,
          partiallyMappedRequirements: 1,
          unmappedRequirements: 0,
          requirementCoveragePct: 90,
          totalEntities: 2,
          fullyMappedEntities: 2,
          entityCoveragePct: 100,
          totalCdsViews: 4,
          annotatedCdsViews: 2,
          uiCoveragePct: 100,
          traceabilityIndex: 96
        },
        requirementMappings: [],
        entityMappings: []
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, report: mockReport })
      });

      const res = await service.getTraceabilityReport('PRJ-TEST');
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/traceability-matrix');
      expect(res.report.metrics.traceabilityIndex).toBe(96);
      expect(res.report.metrics.requirementCoveragePct).toBe(90);
    });

    it('packages project export archive with SHA-256 integrity and confidentiality verification', async () => {
      const mockExport: ExportPackageResult = {
        success: true,
        exportId: 'EXP-12345',
        filename: 'Fiorify_PRJ-TEST_12345.zip',
        sizeBytes: 15420,
        zipSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        downloadUrl: '/api/v1/generation/projects/PRJ-TEST/exports/Fiorify_PRJ-TEST_12345.zip/download',
        manifest: {
          confidentialityNotice: { containsSecrets: false }
        }
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockExport
      });

      const res = await service.packageExport('PRJ-TEST', { acknowledgedWarnings: true });
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedWarnings: true })
      });
      expect(res.exportId).toBe('EXP-12345');
      expect(res.manifest.confidentialityNotice.containsSecrets).toBe(false);
      expect(service.getDownloadExportUrl('PRJ-TEST', 'file.zip')).toBe(
        '/api/v1/generation/projects/PRJ-TEST/exports/file.zip/download'
      );
    });
  });

  // ==========================================
  // SECTION 3: GEN-09 Toolchain & Handover Guide
  // ==========================================
  describe('GEN-09: Toolchain & Handover Guide Service', () => {
    it('fetches read-only workstation toolchain report for S21', async () => {
      const mockReport: ToolchainReport = {
        timestamp: new Date().toISOString(),
        overallStatus: 'READY',
        targetSystem: {
          systemId: 'S21',
          client: '200',
          release: 'SAP S/4HANA 2023 FPS01',
          sapBasis: '7.58',
          sapUi: '7.58'
        },
        tools: {
          node: { name: 'Node.js Runtime', detected: true, version: 'v20.18.0', status: 'READY', details: 'v20' },
          adt: { name: 'ABAP Development Tools (ADT)', detected: true, version: '3.38.0', status: 'READY', details: 'ADT' }
        },
        ports: [{ port: 4004, service: 'Fiorify Backend', free: false }],
        recommendations: []
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, toolchain: mockReport })
      });

      const res = await service.getToolchainStatus();
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/toolchain/status');
      expect(res.toolchain.targetSystem.systemId).toBe('S21');
      expect(res.toolchain.tools.node.detected).toBe(true);
    });

    it('fetches ABAP and Fiori developer handover instructions', async () => {
      const mockGuide: DeveloperHandoverGuide = {
        projectId: 'PRJ-TEST',
        projectName: 'Purchase Order Approval App',
        targetSystem: 'S21',
        targetClient: '200',
        profile: 'MANAGED_RAP_WITH_DRAFT',
        abapSteps: [
          { stepNumber: 1, title: 'Open Eclipse ADT', description: 'Connect to S21 Client 200' },
          { stepNumber: 2, title: 'Assign Target ABAP Package', description: 'Select Z package' }
        ],
        fioriSteps: [
          { stepNumber: 1, title: 'Extract & Open', description: 'Open in VS Code' }
        ],
        markdown: '# Handover Guide'
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, handoverGuide: mockGuide })
      });

      const res = await service.getHandoverGuide('PRJ-TEST');
      expect(fetch).toHaveBeenCalledWith('/api/v1/generation/projects/PRJ-TEST/handover-guide');
      expect(res.handoverGuide.abapSteps).toHaveLength(2);
      expect(res.handoverGuide.targetSystem).toBe('S21');
    });
  });
});
