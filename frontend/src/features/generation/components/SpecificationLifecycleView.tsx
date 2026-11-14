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
}

export const SpecificationLifecycleView: React.FC<SpecificationLifecycleViewProps> = ({
  project,
  onProjectUpdated
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

      {/* Header telemetry card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>13-GATE READINESS</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: readiness?.readinessPercentage === 100 ? '#10B981' : '#F59E0B', margin: '8px 0' }}>
            {readiness?.readinessPercentage || 0}%
          </div>
          <div style={{ fontSize: '12px', color: '#475569' }}>
            Status: <strong>{readiness?.status || 'UNKNOWN'}</strong> ({readiness?.passedChecksCount || 0}/13 gates passed)
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>CURRENT SPECIFICATION VERSION</div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#1E293B', margin: '8px 0' }}>
            v{project.specificationVersion || 1}.0
          </div>
          <div style={{ fontSize: '12px', color: '#475569' }}>
            Modernization: <strong>{project.modernizationOutcome || 'BUILD'}</strong> | Target: {project.targetRelease || 'S/4HANA 2023'}
          </div>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <div style={{ fontSize: '13px', color: '#64748B', fontWeight: 600 }}>GOVERNED LIFECYCLE STATUS</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#0070F2', margin: '8px 0' }}>
            {project.lifecycleStatus}
          </div>
          <div style={{ fontSize: '12px', color: '#475569' }}>
            Approved by: {project.approvedBy ? <strong>{project.approvedBy}</strong> : 'Pending Lead Approval'}
          </div>
        </div>
      </div>

      {/* 13 Gates Checklist */}
      <div style={{ padding: '24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>
          Generation-Readiness Verification Gates
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
          {readiness?.checks?.map((gate: any) => (
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
              <span style={{ fontSize: '11px', fontWeight: 700, color: gate.passed ? '#16A34A' : '#DC2626' }}>
                {gate.passed ? 'PASSED' : 'GATE FAILED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions: Snapshot & Submit Review */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1E293B' }}>Create Version Snapshot</h4>
          <input
            type="text"
            placeholder="Changelog summary (e.g. Added CDS annotations and draft tables)"
            value={changelogInput}
            onChange={(e) => setChangelogInput(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', marginBottom: '12px' }}
          />
          <button
            onClick={handleSnapshot}
            style={{ padding: '8px 16px', backgroundColor: '#0070F2', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            Snapshot Current Specification
          </button>
        </div>

        <div style={{ padding: '20px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#1E293B' }}>Architectural Governance</h4>
          <textarea
            placeholder="Reviewer justification or change requests..."
            value={approvalComments}
            onChange={(e) => setApprovalComments(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '4px', marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => handleApproval('APPROVED')}
              style={{ padding: '8px 16px', backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              Approve for S8/S9
            </button>
            <button
              onClick={() => handleApproval('CHANGES_REQUESTED')}
              style={{ padding: '8px 16px', backgroundColor: '#F59E0B', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              Request Changes
            </button>
            <button
              onClick={handleSubmitReview}
              style={{ padding: '8px 16px', backgroundColor: '#64748B', color: '#FFFFFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              Submit for Review
            </button>
          </div>
        </div>
      </div>

      {/* Version History & Diff Viewer */}
      <div style={{ padding: '24px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: '#1E293B' }}>
          Immutable Version History & Semantic Diff
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
              <th style={{ padding: '8px' }}>Version</th>
              <th style={{ padding: '8px' }}>Status</th>
              <th style={{ padding: '8px' }}>Changelog</th>
              <th style={{ padding: '8px' }}>Created By</th>
              <th style={{ padding: '8px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.versionNumber} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '8px', fontWeight: 600 }}>v{v.versionNumber}.0</td>
                <td style={{ padding: '8px' }}>{v.status}</td>
                <td style={{ padding: '8px' }}>{v.changelog}</td>
                <td style={{ padding: '8px' }}>{v.createdBy}</td>
                <td style={{ padding: '8px', color: '#64748B' }}>{new Date(v.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Diff Controls */}
        {versions.length >= 2 && (
          <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '14px', color: '#1E293B' }}>Compare Versions</h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <label>Base v: </label>
              <input type="number" min="1" value={selectedV1} onChange={(e) => setSelectedV1(Number(e.target.value))} style={{ width: '60px', padding: '4px 8px' }} />
              <label>Target v: </label>
              <input type="number" min="1" value={selectedV2} onChange={(e) => setSelectedV2(Number(e.target.value))} style={{ width: '60px', padding: '4px 8px' }} />
              <button onClick={handleCompare} style={{ padding: '6px 14px', backgroundColor: '#0070F2', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Diff
              </button>
            </div>
            {diffResult && (
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#334155' }}>
                <strong>Diff Output:</strong> Requirements: {diffResult.requirements.v1Count} → {diffResult.requirements.v2Count} (Added: {diffResult.requirements.added.length}, Removed: {diffResult.requirements.removed.length}). Entities: {diffResult.entities.v1Count} → {diffResult.entities.v2Count}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
