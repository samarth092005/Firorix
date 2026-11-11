import {
  AssessmentRecord,
  AssessmentSummary,
  AssessmentFilterParams,
  AssessmentCreationRequest,
  DetailedEvidenceRecord,
  CatalogueReference,
  AssessmentDetailResponse
} from './contracts/types';
import { demoDataProvider } from './mock/demoAssessmentProvider';
import { fioriCatalogueAdapter } from './catalogue/catalogueAdapter';
import { evidenceEngine } from '../features/assessment-results/services/evidenceEngine';
import { apiClient } from './api/apiClient';

export interface IAssessmentService {
  getAssessments(params?: AssessmentFilterParams): Promise<AssessmentRecord[]>;
  getAssessmentById(id: string): Promise<AssessmentRecord | null>;
  getAssessmentByTCode(tcode: string): Promise<AssessmentRecord | null>;
  getAssessmentSummary(): Promise<AssessmentSummary>;
  createAssessment(request: AssessmentCreationRequest): Promise<AssessmentRecord>;
  updateAssessment(id: string, updates: any): Promise<AssessmentRecord>;
  archiveAssessment(id: string, author?: string, comment?: string): Promise<any>;
  getAssessmentAudit(id: string): Promise<any[]>;
  getAssessmentEvidence(id: string): Promise<DetailedEvidenceRecord[]>;
  getAssessmentCandidates(id: string): Promise<CatalogueReference[]>;
  getAssessmentDetails(id: string): Promise<AssessmentDetailResponse | null>;
  recordModernizationAction(assessmentId: string, actionPayload: any): Promise<any>;
  getModernizationDecisions(assessmentId: string): Promise<any[]>;
  createGenerationHandoff(payload: any): Promise<any>;
  getGenerationHandoff(handoffId: string): Promise<any>;
}

class AssessmentService implements IAssessmentService {
  async getAssessments(params?: AssessmentFilterParams): Promise<AssessmentRecord[]> {
    if (import.meta.env?.MODE === 'test') {
      return demoDataProvider.getAssessments(params);
    }
    try {
      const res = await apiClient.getAssessments(params);
      if (res && Array.isArray(res.assessments) && res.assessments.length > 0) {
        return res.assessments;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        return demoDataProvider.getAssessments(params);
      }
      throw err;
    }
    return demoDataProvider.getAssessments(params);
  }

  async getAssessmentById(id: string): Promise<AssessmentRecord | null> {
    if (import.meta.env?.MODE === 'test') {
      return demoDataProvider.getAssessmentById(id);
    }
    try {
      const res = await apiClient.getAssessmentById(id);
      if (res && res.assessment) {
        return res.assessment;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0 || err?.statusCode === 404) {
        return demoDataProvider.getAssessmentById(id);
      }
      throw err;
    }
    return demoDataProvider.getAssessmentById(id);
  }

  async getAssessmentByTCode(tcode: string): Promise<AssessmentRecord | null> {
    if (import.meta.env?.MODE === 'test') {
      return demoDataProvider.getAssessmentByTCode(tcode);
    }
    try {
      const records = await this.getAssessments();
      const match = records.find((r) => r.tcode.toUpperCase() === tcode.trim().toUpperCase());
      if (match) return match;
    } catch {
      // Fallback to provider
    }
    return demoDataProvider.getAssessmentByTCode(tcode);
  }

  async getAssessmentSummary(): Promise<AssessmentSummary> {
    if (import.meta.env?.MODE === 'test') {
      return demoDataProvider.getAssessmentSummary();
    }
    try {
      const res = await apiClient.getAssessmentSummary();
      if (res && res.summary && res.summary.totalAssessed > 0) {
        return res.summary;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        return demoDataProvider.getAssessmentSummary();
      }
      throw err;
    }
    return demoDataProvider.getAssessmentSummary();
  }

  async createAssessment(request: AssessmentCreationRequest): Promise<AssessmentRecord> {
    if (import.meta.env?.MODE === 'test') {
      return demoDataProvider.createAssessment(request);
    }
    try {
      const res = await apiClient.createAssessment(request);
      if (res && res.assessment) {
        return res.assessment;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        return demoDataProvider.createAssessment(request);
      }
      throw err;
    }
    return demoDataProvider.createAssessment(request);
  }

  async updateAssessment(id: string, updates: any): Promise<AssessmentRecord> {
    try {
      const res = await apiClient.updateAssessment(id, updates);
      if (res && res.assessment) {
        return res.assessment;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        const existing = await demoDataProvider.getAssessmentById(id);
        const updated = {
          ...(existing || {}),
          ...updates,
          id,
          updatedAt: new Date().toISOString()
        } as AssessmentRecord;
        return updated;
      }
      throw err;
    }
    return updates;
  }

  async archiveAssessment(id: string, author = 'System Administrator', comment = 'Archived'): Promise<any> {
    try {
      return await apiClient.archiveAssessment(id, { author, comment });
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        const existing = await demoDataProvider.getAssessmentById(id);
        if (existing) {
          existing.status = 'ARCHIVED';
          existing.lifecycleStatus = 'ARCHIVED';
        }
        return { success: true, id, status: 'ARCHIVED' };
      }
      throw err;
    }
  }

  async getAssessmentAudit(id: string): Promise<any[]> {
    try {
      const res = await apiClient.getAssessmentAudit(id);
      if (res && Array.isArray(res.auditEvents)) {
        return res.auditEvents;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        const record = await demoDataProvider.getAssessmentById(id);
        return record?.auditEvents || [];
      }
      throw err;
    }
    const record = await demoDataProvider.getAssessmentById(id);
    return record?.auditEvents || [];
  }

  async getAssessmentEvidence(id: string): Promise<DetailedEvidenceRecord[]> {
    const record = await this.getAssessmentById(id);
    if (!record) return [];
    return evidenceEngine.compileDetailedEvidence(record);
  }

  async getAssessmentCandidates(id: string): Promise<CatalogueReference[]> {
    const record = await this.getAssessmentById(id);
    if (!record) return [];
    return fioriCatalogueAdapter.getAppsByTCode(record.tcode);
  }

  async getAssessmentDetails(id: string): Promise<AssessmentDetailResponse | null> {
    const record = await this.getAssessmentById(id);
    if (!record) return null;

    const candidates = await fioriCatalogueAdapter.getAppsByTCode(record.tcode);
    const primaryCandidate = candidates[0] || null;
    const evidence = evidenceEngine.compileDetailedEvidence(record);
    const evidenceScore = evidenceEngine.calculateEvidenceScore(record, evidence);
    const roleValidation = evidenceEngine.evaluateRoleValidation(record, primaryCandidate);
    const odataValidation = evidenceEngine.evaluateODataValidation(record, primaryCandidate);
    const compatibility = evidenceEngine.evaluateReleaseCompatibility(record, primaryCandidate);
    const systemAvailability = evidenceEngine.evaluateSystemAvailability(record, primaryCandidate);
    const recommendation = evidenceEngine.generateRecommendation(record, primaryCandidate, compatibility, systemAvailability);

    return {
      assessment: record,
      evidence,
      evidenceScore,
      candidates,
      roleValidation,
      odataValidation,
      compatibility,
      systemAvailability,
      recommendation
    };
  }

  async recordModernizationAction(assessmentId: string, actionPayload: any): Promise<any> {
    try {
      const res = await apiClient.recordModernizationAction(assessmentId, actionPayload);
      if (res && res.success) {
        return res;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        return { success: true, isDemo: true, action: actionPayload };
      }
      throw err;
    }
    return { success: true, action: actionPayload };
  }

  async getModernizationDecisions(assessmentId: string): Promise<any[]> {
    try {
      const res = await apiClient.getModernizationDecisions(assessmentId);
      if (res && Array.isArray(res.decisions)) {
        return res.decisions;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        return [];
      }
      throw err;
    }
    return [];
  }

  async createGenerationHandoff(payload: any): Promise<any> {
    try {
      const res = await apiClient.createGenerationHandoff(payload);
      if (res && res.handoff) {
        return res.handoff;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        return {
          handoffId: payload.handoffId || `HND-DEMO-${Date.now()}`,
          ...payload,
          currentStage: 'DRAFT',
          createdAt: new Date().toISOString()
        };
      }
      throw err;
    }
    return payload;
  }

  async getGenerationHandoff(handoffId: string): Promise<any> {
    try {
      const res = await apiClient.getGenerationHandoff(handoffId);
      if (res && res.handoff) {
        return res.handoff;
      }
    } catch (err: any) {
      if (err?.isNetworkError || err?.statusCode === 0) {
        return null;
      }
      throw err;
    }
    return null;
  }
}

export const assessmentService = new AssessmentService();
