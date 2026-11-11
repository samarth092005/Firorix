import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../../../services/api/apiClient';

describe('FioriX DISC-01 + DISC-02 + MATCH-01 + MATCH-02 Frontend API Integration', () => {
  const originalFetch = globalThis.fetch;

  beforeAll(() => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const urlStr = String(url);

      if (urlStr.includes('/discovery/transaction') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        if (body.tcode === 'INVALID!') {
          return new Response(
            JSON.stringify({
              success: false,
              statusCode: 'INVALID_TCODE_FORMAT',
              errorMessage: 'Invalid T-Code naming'
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({
            success: true,
            tcode: 'FB50',
            transactionCode: 'FB50',
            description: 'Enter G/L Account Document',
            programName: 'SAPMF05A',
            packageName: 'FBAS',
            softwareComponent: 'S4CORE 108',
            authorizationObject: 'F_BKPF_BUK',
            provenance: 'CURATED_FIXTURE',
            evidenceConfidence: 'HIGH',
            evidence: [
              {
                evidenceId: 'EVD-001',
                category: 'TRANSACTION_REPOSITORY',
                source: 'TSTC',
                retrievedValue: 'FB50',
                provenance: 'CURATED_FIXTURE',
                confidence: 'VERIFIED',
                verified: true,
                verificationStatus: 'VERIFIED',
                limitations: [],
                verificationRequirements: []
              }
            ],
            missingEvidence: [],
            warnings: []
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/matching/fiori-apps') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            transactionCode: 'FB50',
            matchClassification: 'VERIFIED_MATCH',
            recommendationReadiness: 'SUFFICIENT_EVIDENCE_FOR_ASSESSMENT',
            rankedCandidates: [
              {
                rank: 1,
                appId: 'FB50',
                appName: 'Post General Journal Entries - FB50',
                appType: 'SAP GUI',
                overallScore: 75.5,
                matchClassification: 'VERIFIED_MATCH',
                provenance: 'OFFICIAL_CATALOGUE',
                explainability: {
                  matchingReasons: ['T-Code FB50 matches standard WebGUI tile.'],
                  functionalGaps: [],
                  technicalGaps: [],
                  missingEvidence: [],
                  conflicts: [],
                  assumptions: [],
                  verificationRequirements: []
                }
              }
            ],
            candidateComparison: [
              {
                rank: 1,
                appId: 'FB50',
                appName: 'Post General Journal Entries - FB50',
                appType: 'SAP GUI',
                tcodeRelationship: 'SAME_TRANSACTION_CLASSIC',
                functionalFitPercent: 88,
                technicalFitPercent: 90,
                releaseCompatibility: 'COMPATIBLE',
                missingEvidenceCount: 0,
                overallScore: 75.5,
                matchClassification: 'VERIFIED_MATCH',
                provenance: 'OFFICIAL_CATALOGUE'
              }
            ],
            assessmentHandoff: {
              requirement: { tcode: 'FB50', title: 'Evaluate FB50' },
              candidate: { appId: 'FB50', appName: 'Post General Journal Entries' },
              context: { systemId: 'S21-200' }
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (urlStr.includes('/discovery/match') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            success: true,
            requestId: 'REQ-DISC-MATCH-001',
            tcode: 'FB50',
            discovery: {
              success: true,
              tcode: 'FB50',
              description: 'Enter G/L Account Document',
              evidence: [
                {
                  evidenceId: 'EVD-001',
                  category: 'TRANSACTION_REPOSITORY',
                  source: 'TSTC',
                  retrievedValue: 'FB50',
                  provenance: 'CURATED_FIXTURE',
                  confidence: 'VERIFIED',
                  verified: true,
                  verificationStatus: 'VERIFIED',
                  limitations: [],
                  verificationRequirements: []
                }
              ],
              missingEvidence: [],
              warnings: []
            },
            matching: {
              success: true,
              transactionCode: 'FB50',
              matchClassification: 'VERIFIED_MATCH',
              recommendationReadiness: 'SUFFICIENT_EVIDENCE_FOR_ASSESSMENT',
              rankedCandidates: [],
              candidateComparison: []
            },
            recommendationReadiness: 'SUFFICIENT_EVIDENCE_FOR_ASSESSMENT',
            assessmentHandoff: {
              requirement: { tcode: 'FB50', title: 'Evaluate FB50' },
              candidate: { appId: 'FB50', appName: 'Post General Journal Entries' },
              context: { systemId: 'S21-200' }
            },
            candidateComparison: [
              {
                rank: 1,
                appId: 'FB50',
                appName: 'Post General Journal Entries - FB50',
                appType: 'SAP GUI',
                tcodeRelationship: 'SAME_TRANSACTION_CLASSIC',
                functionalFitPercent: 88,
                technicalFitPercent: 90,
                releaseCompatibility: 'COMPATIBLE',
                missingEvidenceCount: 0,
                overallScore: 75.5,
                matchClassification: 'VERIFIED_MATCH',
                provenance: 'OFFICIAL_CATALOGUE'
              }
            ],
            candidates: [
              {
                rank: 1,
                appId: 'FB50',
                appName: 'Post General Journal Entries - FB50',
                appType: 'SAP GUI',
                overallScore: 75.5,
                matchClassification: 'VERIFIED_MATCH',
                explainability: {
                  matchingReasons: ['T-Code match'],
                  functionalGaps: [],
                  technicalGaps: [],
                  missingEvidence: [],
                  conflicts: [],
                  assumptions: [],
                  verificationRequirements: []
                }
              }
            ],
            bestMatch: {
              appId: 'FB50',
              appName: 'Post General Journal Entries - FB50'
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return originalFetch(url, init);
    });
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('apiClient.discoverTransaction executes POST /api/v1/discovery/transaction with typed result', async () => {
    const result = await apiClient.discoverTransaction({ tcode: 'FB50', systemId: 'S21-200' });
    expect(result.success).toBe(true);
    expect(result.tcode).toBe('FB50');
    expect(result.programName).toBe('SAPMF05A');
    expect(Array.isArray(result.evidence)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].category).toBe('TRANSACTION_REPOSITORY');
  });

  it('apiClient.matchFioriApps executes POST /api/v1/matching/fiori-apps with explainability and comparison matrix', async () => {
    const result = await apiClient.matchFioriApps({ tcode: 'FB50' });
    expect(result.success).toBe(true);
    expect(result.matchClassification).toBe('VERIFIED_MATCH');
    expect(result.recommendationReadiness).toBe('SUFFICIENT_EVIDENCE_FOR_ASSESSMENT');
    expect(result.candidateComparison.length).toBe(1);
    expect(result.candidateComparison[0].appId).toBe('FB50');
    expect(result.assessmentHandoff).not.toBeNull();
    expect(result.assessmentHandoff?.candidate.appId).toBe('FB50');
  });

  it('apiClient.discoverAndMatch executes unified end-to-end pipeline', async () => {
    const result = await apiClient.discoverAndMatch({ tcode: 'FB50', systemId: 'S21-200' });
    expect(result.success).toBe(true);
    expect(result.tcode).toBe('FB50');
    expect(result.recommendationReadiness).toBe('SUFFICIENT_EVIDENCE_FOR_ASSESSMENT');
    expect(result.discovery).toBeDefined();
    expect(result.matching).toBeDefined();
    expect(result.candidateComparison.length).toBe(1);
    expect(result.assessmentHandoff).toBeDefined();
    expect(result.assessmentHandoff?.requirement.tcode).toBe('FB50');
  });
});
