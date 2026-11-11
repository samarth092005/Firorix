import { describe, it, expect, vi } from 'vitest';
import { ApiClient } from '../apiClient';

describe('ApiClient Fit-Gap, Recommendation & Lifecycle Methods (FITGAP-02, REC-01, PERSIST-02)', () => {
  it('calls assessFitGap with POST /fitgap/assess and returns assessment result', async () => {
    const mockResponse = {
      success: true,
      requestId: 'REQ-FITGAP-000001',
      overallStatus: 'VERIFIED_FIT',
      overallScore: 92,
      assessment: {
        assessmentId: 'ASM-123',
        dimensions: [{ dimensionKey: 'functionalCoverage', status: 'VERIFIED_FIT', score: 100 }]
      }
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify(mockResponse))
    });

    const client = new ApiClient({ baseUrl: '/api/v1', timeoutMs: 5000, fetchFn: mockFetch as any });
    const result = await client.assessFitGap({
      requirement: { id: 'REQ-1', title: 'Post Outgoing Payments' },
      candidate: { appId: 'F1612' },
      context: {}
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/fitgap/assess');
    expect(init.method).toBe('POST');
    expect(result.overallStatus).toBe('VERIFIED_FIT');
    expect(result.overallScore).toBe(92);
  });

  it('calls generateRecommendation with POST /recommendations/generate and returns recommendation', async () => {
    const mockRec = {
      success: true,
      requestId: 'REQ-REC-000001',
      outcome: 'ADOPT',
      confidence: 'HIGH',
      recommendation: {
        outcome: 'ADOPT',
        rationale: 'Fully verified standard Fiori application.',
        actionableRemediationPlan: [{ step: 1, title: 'Assign Role', responsibleRole: 'Security' }]
      }
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify(mockRec))
    });

    const client = new ApiClient({ baseUrl: '/api/v1', timeoutMs: 5000, fetchFn: mockFetch as any });
    const result = await client.generateRecommendation({
      requirement: { id: 'REQ-1' },
      candidate: { appId: 'F1612' }
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/recommendations/generate');
    expect(init.method).toBe('POST');
    expect(result.outcome).toBe('ADOPT');
    expect(result.recommendation.actionableRemediationPlan.length).toBe(1);
  });

  it('calls updateAssessment with PUT /assessments/:id and advances lifecycle state', async () => {
    const mockUpdated = {
      success: true,
      statusCode: 'UPDATED',
      assessment: {
        id: 'ASM-123',
        lifecycleStatus: 'PENDING_REVIEW'
      }
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify(mockUpdated))
    });

    const client = new ApiClient({ baseUrl: '/api/v1', timeoutMs: 5000, fetchFn: mockFetch as any });
    const result = await client.updateAssessment('ASM-123', {
      lifecycleStatus: 'PENDING_REVIEW',
      author: 'Architect',
      comment: 'Submitted for review'
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/assessments/ASM-123');
    expect(init.method).toBe('PUT');
    expect(result.assessment.lifecycleStatus).toBe('PENDING_REVIEW');
  });

  it('calls archiveAssessment with POST /assessments/:id/archive and returns archived state', async () => {
    const mockArchived = {
      success: true,
      statusCode: 'ARCHIVED',
      assessment: {
        id: 'ASM-123',
        lifecycleStatus: 'ARCHIVED'
      }
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify(mockArchived))
    });

    const client = new ApiClient({ baseUrl: '/api/v1', timeoutMs: 5000, fetchFn: mockFetch as any });
    const result = await client.archiveAssessment('ASM-123', { comment: 'Project closed' });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/assessments/ASM-123/archive');
    expect(init.method).toBe('POST');
    expect(result.statusCode).toBe('ARCHIVED');
  });

  it('calls getAssessmentAudit with GET /assessments/:id/audit and returns audit events', async () => {
    const mockAudit = {
      success: true,
      assessmentId: 'ASM-123',
      count: 2,
      auditEvents: [
        { eventId: 'AUD-1', action: 'CREATED', newState: 'RECOMMENDATION_COMPLETED' },
        { eventId: 'AUD-2', action: 'STATE_TRANSITION', newState: 'APPROVED' }
      ]
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'Content-Type': 'application/json' }),
      text: () => Promise.resolve(JSON.stringify(mockAudit))
    });

    const client = new ApiClient({ baseUrl: '/api/v1', timeoutMs: 5000, fetchFn: mockFetch as any });
    const result = await client.getAssessmentAudit('ASM-123');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('/assessments/ASM-123/audit');
    expect(init.method).toBe('GET');
    expect(result.auditEvents.length).toBe(2);
    expect(result.auditEvents[1].newState).toBe('APPROVED');
  });
});
