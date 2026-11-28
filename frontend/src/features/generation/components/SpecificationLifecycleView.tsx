import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  History,
  GitCompare,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { GenerationProject } from '../types';
import { authFetch } from '../services/generationProjectService';

interface SpecificationLifecycleViewProps {
  project: GenerationProject;
  onProjectUpdated: (updated: GenerationProject) => void;
  onNavigateView?: (view: any) => void;
}

export const SpecificationLifecycleView: React.FC<SpecificationLifecycleViewProps> = ({
  project,
  onProjectUpdated,
  onNavigateView
}) => {
  const [readiness, setReadiness] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [changelogInput, setChangelogInput] = useState<string>('');
  const [approvalComments, setApprovalComments] = useState<string>('');
  const [selectedV1, setSelectedV1] = useState<number>(1);
  const [selectedV2, setSelectedV2] = useState<number>(2);
  const [diffResult, setDiffResult] = useState<any>(null);
  const [showPassingGates, setShowPassingGates] = useState<boolean>(false);

  const fetchReadinessAndVersions = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [readRes, verRes] = await Promise.all([
        authFetch(`/api/v1/generation/projects/${encodeURIComponent(project.projectId)}/readiness`).then(r => r.json()),
        authFetch(`/api/v1/generation/projects/${encodeURIComponent(project.projectId)}/versions`).then(r => r.json())
      ]);
      if (readRes.success) setReadiness(readRes.readiness);
      if (verRes.success) setVersions(verRes.versions || []);
    } catch (err: any) {
      setActionError(err.message || 'Failed to fetch specification telemetry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReadinessAndVersions();
  }, [project.projectId]);

  const handleSnapshot = async () => {
    try {
      setActionError(null);
      const res = await authFetch(`/api/v1/generation/projects/${encodeURIComponent(project.projectId)}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changelog: changelogInput || 'Manual architectural specification snapshot' })
      }).then(r => r.json());

      if (!res.success) throw new Error(res.errorMessage || 'Snapshot failed');
      setActionSuccess(`Snapshot v${res.versionNumber}.0 captured successfully.`);
      setChangelogInput('');
      await fetchReadinessAndVersions();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setActionError(null);
      const res = await authFetch(`/api/v1/generation/projects/${encodeURIComponent(project.projectId)}/submit-review`, {
        method: 'POST'
      }).then(r => r.json());

      if (!res.success) throw new Error(res.errorMessage || 'Submission failed');
      setActionSuccess('Submitted for Lead/Chief Architect review.');
      await fetchReadinessAndVersions();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleApproval = async (decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED') => {
    try {
      setActionError(null);
      const res = await authFetch(`/api/v1/generation/projects/${encodeURIComponent(project.projectId)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, comments: approvalComments })
      }).then(r => r.json());

      if (!res.success) throw new Error(res.errorMessage || 'Approval action failed');
      setActionSuccess(`Decision "${decision}" recorded with signature hash ${res.signatureHash?.substring(0, 12)}...`);
      setApprovalComments('');
      await fetchReadinessAndVersions();
      if (res.lifecycleStatus) {
        onProjectUpdated({ ...project, lifecycleStatus: res.lifecycleStatus });
      }
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleCompare = async () => {
    try {
      const res = await authFetch(`/api/v1/generation/projects/${encodeURIComponent(project.projectId)}/versions/compare?v1=${selectedV1}&v2=${selectedV2}`).then(r => r.json());
      if (res.success) setDiffResult(res.differences);
    } catch (err: any) {
      setActionError(`Comparison failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '32px', textAlign: 'center' }}>Evaluating Specification Readiness & Version History...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '16px 0' }}>
      {/* Messages */}
      {actionError && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '6px', color: '#991B1B' }}>
          <strong>Error:</strong> {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ECFDF5', border: '1px solid #10B981', borderRadius: '6px', color: '#065F46' }}>
          {actionSuccess}
        </div>
      )}

      {/* Compact 1-Line Readiness Summary Strip */}
      <div
        style={{
          padding: '14px 20px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: readiness?.readinessPercentage === 100 ? '#10B981' : '#F59E0B'
            }}
          >
            {readiness?.readinessPercentage || 0}%
          </span>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
              13-Gate Build Readiness ({readiness?.passedChecksCount || 0}/13 passed)
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Target: {project.targetRelease || 'S/4HANA 2023'} · Status: {project.lifecycleStatus}
              {project.approvedBy ? ` · Approved by ${project.approvedBy}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 13 Gates Checklist (Failing Gates Prioritized, Passing Gates Collapsible) */}
      <div style={{ padding: '20px 24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
        {(() => {
          const allChecks: any[] = readiness?.checks || [];
          const failingGates = allChecks.filter((g) => !g.passed);
          const passingGates = allChecks.filter((g) => g.passed);
          const visibleGates = showPassingGates || failingGates.length === 0 ? [...failingGates, ...passingGates] : failingGates;

          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 700, color: '#1E293B' }}>
                  {failingGates.length > 0
                    ? `${failingGates.length} Gate(s) Need Attention`
                    : 'All 13 Verification Gates Passed'}
                </h3>
                {passingGates.length > 0 && failingGates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPassingGates((v) => !v)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      border: '1px solid #BBF7D0',
                      backgroundColor: '#F0FDF4',
                      color: '#166534',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {showPassingGates ? 'Hide' : 'Show'} {passingGates.length} Passing Gate(s)
                  </button>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {visibleGates.map((gate: any) => (
            <div
              key={gate.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: gate.passed ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${gate.passed ? '#BBF7D0' : '#FECACA'}`,
                borderRadius: '6px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {gate.passed ? (
                  <CheckCircle size={18} color="#16A34A" />
                ) : (
                  <XCircle size={18} color="#DC2626" />
                )}
                <div>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B' }}>{gate.name}</span>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>{gate.details}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: gate.passed ? '#16A34A' : '#DC2626' }}>
                  {gate.passed ? 'PASSED' : 'GATE FAILED'}
                </span>
                {!gate.passed && onNavigateView && (
                  <button
                    type="button"
                    onClick={() => {
                      const text = `${gate.id || ''} ${gate.name || ''} ${gate.details || ''}`.toLowerCase();
                      if (text.includes('requirement') || text.includes('scope')) {
                        onNavigateView('requirements');
                      } else if (text.includes('architecture') || text.includes('rap') || text.includes('draft') || text.includes('table')) {
                        onNavigateView('architecture');
                      } else {
                        onNavigateView('data-model');
                      }
                    }}
                    style={{
                      padding: '4px 10px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #FCA5A5',
                      borderRadius: '4px',
                      color: '#B91C1C',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {(() => {
                      const text = `${gate.id || ''} ${gate.name || ''} ${gate.details || ''}`.toLowerCase();
                      if (text.includes('requirement') || text.includes('scope')) return 'Fix in Requirements →';
                      if (text.includes('architecture') || text.includes('rap') || text.includes('draft') || text.includes('table')) return 'Fix in Architecture →';
                      return 'Fix in Data Model →';
                    })()}
                  </button>
                )}
              </div>
            </div>
          ))}
              </div>
            </>
          );
        })()}
      </div>

      {/* Clean Readiness Approval Bar (Hard-blocked until all 13 gates pass) */}
      {(() => {
        const allPassed = (readiness?.passedChecksCount || 0) >= 13 || readiness?.readinessPercentage === 100;
        const isAlreadyApproved =
          Boolean(project.approvedBy) ||
          project.lifecycleStatus === 'READY_FOR_GENERATION' ||
          project.lifecycleStatus === 'GENERATED' ||
          project.lifecycleStatus === 'EXPORTED';
        const rawRegistry = project.artifactRegistry?.artifacts;
        const hasArtifacts = Array.isArray(rawRegistry)
          ? rawRegistry.length > 0
          : Boolean(rawRegistry && Object.keys(rawRegistry).length > 0);
        const nextTarget = hasArtifacts ? 'preview-validation' : 'abap-generator';

        return (
          <div
            style={{
              padding: '18px 24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px'
            }}
          >
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                {isAlreadyApproved
                  ? 'Specification Approved for Code Generation'
                  : allPassed
                    ? 'All 13 Readiness Gates Passed'
                    : 'Approval Blocked — Resolve Failing Gates Above'}
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                {allPassed
                  ? 'Proceed to generate ABAP Cloud RAP and Fiori UI5 artifacts.'
                  : 'Use the "Fix in ..." buttons on any red gate above before approving.'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleApproval('CHANGES_REQUESTED')}
                style={{
                  padding: '8px 14px',
                  backgroundColor: '#FFFBEB',
                  color: '#92400E',
                  border: '1px solid #FDE68A',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600
                }}
              >
                Request Changes
              </button>

              {isAlreadyApproved && onNavigateView ? (
                <button
                  type="button"
                  onClick={() => onNavigateView(nextTarget)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    background: 'linear-gradient(180deg, #1A75FF 0%, #005CE6 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <span>{hasArtifacts ? 'Open Live Fiori Sandbox' : 'Proceed to ABAP & Fiori Build'}</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!allPassed}
                  onClick={async () => {
                    await handleApproval('APPROVED');
                    if (onNavigateView) onNavigateView(nextTarget);
                  }}
                  title={allPassed ? 'Approve specification and proceed to build' : 'Pass all 13 readiness gates to unlock approval'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    background: allPassed ? 'linear-gradient(180deg, #1A75FF 0%, #005CE6 100%)' : '#94A3B8',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: allPassed ? 'pointer' : 'not-allowed',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  <span>Approve &amp; Proceed to Build</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
