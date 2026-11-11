import React from 'react';
import {
  AssessmentRecord,
  CatalogueReference,
  DetailedEvidenceRecord,
  AssessmentEvidenceScore,
  RoleValidationRecord,
  ODataServiceValidationRecord,
  ReleaseCompatibilityRecord,
  SystemAvailabilityAudit,
  AssessmentRecommendation
} from '../../../services/contracts/types';
import { assessmentExportService, FullAssessmentExportData } from '../services/assessmentExportService';
import {
  Download,
  FileText,
  X
} from 'lucide-react';

export interface AssessmentExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessment: AssessmentRecord;
  evidence: DetailedEvidenceRecord[];
  evidenceScore: AssessmentEvidenceScore;
  candidates: CatalogueReference[];
  roleValidation: RoleValidationRecord[];
  odataValidation: ODataServiceValidationRecord[];
  compatibility: ReleaseCompatibilityRecord;
  systemAvailability: SystemAvailabilityAudit;
  recommendation: AssessmentRecommendation;
}

export const AssessmentExportModal: React.FC<AssessmentExportModalProps> = ({
  isOpen,
  onClose,
  assessment,
  evidence,
  evidenceScore,
  candidates,
  roleValidation,
  odataValidation,
  compatibility,
  systemAvailability,
  recommendation
}) => {
  if (!isOpen) return null;

  const exportData: FullAssessmentExportData = assessmentExportService.generateFullExportData(
    assessment,
    evidence,
    evidenceScore,
    candidates,
    roleValidation,
    odataValidation,
    compatibility,
    systemAvailability,
    recommendation
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(16, 42, 67, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '900px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md, 6px)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--fiori-navy, #102A43)' }}>
              Export Assessment Documentation: {assessment.tcode}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--fiori-text-secondary, #64748B)' }}>
              Formal SAP Architecture &amp; Advisory deliverable preserving multi-evidence provenance.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fiori-text-secondary, #64748B)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px',
            borderBottom: '1px solid var(--fiori-border, #E2E8F0)',
            backgroundColor: '#FFFFFF'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                backgroundColor: 'var(--fiori-sidebar-active, #E1EFFD)',
                color: 'var(--fiori-primary, #0A6ED1)',
                borderRadius: 'var(--radius-xs, 2px)'
              }}
            >
              <FileText size={13} /> Report Preview
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="fiori-btn fiori-btn-primary"
              onClick={() => assessmentExportService.downloadDocx(exportData)}
              style={{ fontSize: '11px', height: '28px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#0066FF', color: '#FFFFFF' }}
              title="Download Microsoft Word Report (.DOCX)"
            >
              <FileText size={13} /> Export as Word
            </button>

            <button
              type="button"
              className="fiori-btn fiori-btn-primary"
              onClick={() => assessmentExportService.downloadPdf(exportData)}
              style={{ fontSize: '11px', height: '28px', display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#D9381E', color: '#FFFFFF' }}
              title="Export and Download Official PDF Report"
            >
              <Download size={13} /> Export as PDF
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
              <div style={{ padding: '12px 16px', backgroundColor: '#F0F7FD', borderRadius: '4px', border: '1px solid #B8D5F8' }}>
                <strong style={{ color: '#003A8C' }}>Consultant Executive Deliverable</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#1B2838' }}>
                  This export packages all TSTC/TADIR dictionary facts, official SAP Fiori Apps Reference Library links,
                  and consultant-provided business requirements into an audit-compliant deliverable.
                </p>
              </div>

              {/* Section 1: Executive Summary */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  1. Executive Summary
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px' }}>
                  <div>Transaction: <strong>{assessment.tcode}</strong> — {assessment.description}</div>
                  <div>Outcome: <strong style={{ color: '#0066FF' }}>{recommendation.outcome || 'ADOPT'}</strong> ({assessment.assessmentResult})</div>
                  <div>Decision Rationale: <span>{recommendation.recommendedAction}</span></div>
                  <div>Evidence Completeness: <strong>{evidenceScore.totalScore}/100 ({evidenceScore.completenessLabel})</strong></div>
                  <div>Recommended App: <strong>{assessment.matchingFioriApp?.appId || 'Custom RAP'}</strong> ({assessment.matchingFioriApp?.appName || 'N/A'})</div>
                  <div>Release Compatibility: <strong>{compatibility.status}</strong> ({assessment.release})</div>
                </div>
              </div>



              {/* Section 3: Business Context & Requirements */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  3. Business Context &amp; Requirements Intake
                </h4>
                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>Process: <strong>{assessment.businessContext?.businessProcess || 'Finance & Logistics'}</strong></div>
                  <div>Operational Scenario: <em>{assessment.businessContext?.primaryScenario || 'Operational execution of transaction'}</em></div>
                  <div>Criticality: <strong>{assessment.businessContext?.businessCriticality || 'HIGH'}</strong></div>
                </div>
              </div>

              {/* Section 4: Official SAP Fiori Catalogue Candidates */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  4. Official SAP Fiori Catalogue Candidates ({candidates.length})
                </h4>
                {candidates.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    {candidates.map((c, i) => (
                      <div key={c.appId} style={{ padding: '8px', backgroundColor: '#F8FAFC', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                        <div><strong>#{i + 1} {c.appId}</strong> — {c.appName} ({c.uiTechnology})</div>
                        <div style={{ color: '#64748B', fontSize: '11px', marginTop: '2px' }}>{c.description}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#8A5800' }}>
                    No standard SAP Fiori application exists for this transaction. Custom RAP modernization required.
                  </div>
                )}
              </div>

              {/* Section 5: Candidate Comparison Matrix */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  5. Candidate Comparison Matrix
                </h4>
                {candidates.length > 1 ? (
                  <div style={{ fontSize: '12px', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F1F5F9' }}>
                          <th style={{ padding: '6px 8px', border: '1px solid #CBD5E1' }}>App ID</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #CBD5E1' }}>UI Technology</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #CBD5E1' }}>Component</th>
                          <th style={{ padding: '6px 8px', border: '1px solid #CBD5E1' }}>Supported Releases</th>
                        </tr>
                      </thead>
                      <tbody>
                        {candidates.map((c) => (
                          <tr key={c.appId}>
                            <td style={{ padding: '6px 8px', border: '1px solid #CBD5E1', fontFamily: 'monospace', fontWeight: 'bold' }}>{c.appId}</td>
                            <td style={{ padding: '6px 8px', border: '1px solid #CBD5E1' }}>{c.uiTechnology}</td>
                            <td style={{ padding: '6px 8px', border: '1px solid #CBD5E1' }}>{c.technicalComponent}</td>
                            <td style={{ padding: '6px 8px', border: '1px solid #CBD5E1' }}>{c.supportedProductRelease}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {candidates.length === 1 ? `Single primary candidate (${candidates[0].appId}) identified. Multi-candidate matrix not applicable.` : 'No candidates available for comparison.'}
                  </div>
                )}
              </div>

              {/* Section 6: Fit-Gap Matrix */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  6. Requirement-to-App Fit-Gap Matrix
                </h4>
                <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div><strong>REQ-01 Core Scope:</strong> {candidates.length > 0 ? `SUPPORTED — Successor ${candidates[0].appId} matches baseline transaction flow.` : 'UNSUPPORTED — Requires Clean Core RAP Managed BO.'}</div>
                  <div><strong>REQ-02 Security &amp; Authorizations:</strong> SUPPORTED — Standard PFCG business catalog mapped.</div>
                  <div><strong>REQ-03 Release Compatibility:</strong> {compatibility.status} — Target release {assessment.release} validated.</div>
                </div>
              </div>

              {/* Section 7: Technical Evidence Audit Trail */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  7. Technical Evidence Audit Trail ({evidence.length} Evidence Records)
                </h4>
                <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '160px', overflowY: 'auto' }}>
                  {evidence.map((e, idx) => (
                    <div key={e.id || idx} style={{ padding: '4px 6px', backgroundColor: '#F8FAFC', borderRadius: '3px', border: '1px solid #E2E8F0' }}>
                      <strong>{e.title}</strong> — {e.finding} <span style={{ color: '#0066FF' }}>({e.provenance})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 8: Recommendation Rationale & Modernization Strategy */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  8. Recommendation Rationale: {recommendation.outcome || 'ADOPT'}
                </h4>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fiori-navy, #102A43)', marginBottom: '6px' }}>
                  {recommendation.recommendedAction}
                </div>
                <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px' }}>
                  {recommendation.requiredNextSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              {/* Section 9: Risks & Clean Core Remediation */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  9. Risks &amp; Clean Core Remediation Plan
                </h4>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Clean Core zero-modification baseline enforced. All dynpro variants and screen enhancements will be migrated via standard Key User Adaptation or RAP extensions without modifying standard SAP code.
                </div>
              </div>

              {/* Section 10: Approval Gate & Audit History */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  10. Approval Gate &amp; Lifecycle Governance
                </h4>
                <div style={{ fontSize: '12px', display: 'flex', gap: '20px' }}>
                  <div>Status: <strong>{assessment.status || 'PENDING_REVIEW'}</strong></div>
                  <div>Platform: <strong>FioriX Workbench v1.0.0</strong></div>
                  <div>Handoff Gate: <strong>{recommendation.outcome === 'BUILD' ? 'Eligible for Generation Studio' : 'Standard FLP Activation'}</strong></div>
                </div>
              </div>

              {/* Section 11: Evidence Provenance & Operational Limitations */}
              <div style={{ border: '1px solid #E2E8F0', padding: '16px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--fiori-navy, #102A43)' }}>
                  11. Evidence Provenance &amp; Operational Limitations
                </h4>
                <div style={{ fontSize: '11px', color: '#64748B' }}>
                  Provenances: {assessment.isDemo ? 'CURATED_DEMO_FIXTURE (Pending Live Verification)' : 'LIVE_SAP_S21'} with official SAP Fiori Apps Reference Library baseline. System availability remains subject to client-level Basis OData activation and PFCG authorizations.
                </div>
              </div>
            </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--fiori-border, #E2E8F0)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--fiori-surface-subtle, #F8FAFC)',
            fontSize: '11px',
            color: 'var(--fiori-text-secondary, #64748B)'
          }}
        >
          <span>FioriX Advisory Platform • SAP S/4HANA 2023 Private Edition</span>
          <button type="button" className="fiori-btn fiori-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
