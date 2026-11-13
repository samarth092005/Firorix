import React, { useState, useEffect } from 'react';
import {
  Download,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  Layers,
  Hash,
  ExternalLink,
  Info,
  Clock,
  Archive,
  ArrowRight
} from 'lucide-react';
import {
  GenerationProject,
  ExportReadinessResult,
  FullTraceabilityReport,
  ExportPackageResult
} from '../types';
import { defaultFrontendGenerationProjectService } from '../services/generationProjectService';

interface ReviewExportViewProps {
  project: GenerationProject;
  onProjectUpdated?: (updatedProject: GenerationProject) => void;
}

export const ReviewExportView: React.FC<ReviewExportViewProps> = ({
  project,
  onProjectUpdated
}) => {
  const [readiness, setReadiness] = useState<ExportReadinessResult | null>(null);
  const [traceability, setTraceability] = useState<FullTraceabilityReport | null>(null);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportPackageResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load readiness and traceability on mount
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const [readinessRes, traceRes] = await Promise.all([
          defaultFrontendGenerationProjectService.getExportReadiness(project.projectId, acknowledgedWarnings),
          defaultFrontendGenerationProjectService.getTraceabilityReport(project.projectId)
        ]);
        if (isMounted) {
          setReadiness(readinessRes.readiness);
          setTraceability(traceRes.report);
        }
      } catch (err: any) {
        if (isMounted) setErrorMsg(err.message || 'Failed to load review data.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [project.projectId, acknowledgedWarnings]);

  const handleExport = async () => {
    setExporting(true);
    setErrorMsg(null);
    try {
      const res = await defaultFrontendGenerationProjectService.packageExport(project.projectId, {
        acknowledgedWarnings
      });
      setExportResult(res);

      // Trigger automatic file download
      const link = document.createElement('a');
      link.href = res.downloadUrl;
      link.setAttribute('download', res.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Refresh project to load updated exportHistory
      const updated = await defaultFrontendGenerationProjectService.getProject(project.projectId);
      if (onProjectUpdated) onProjectUpdated(updated);
    } catch (err: any) {
      setErrorMsg(err.message || 'Export packaging failed.');
    } finally {
      setExporting(false);
    }
  };

  const hasBlockingErrors = (readiness?.errors || []).length > 0;
  const hasWarnings = (readiness?.warnings || []).length > 0;
  const canProceed = readiness?.canExport || (hasWarnings && acknowledgedWarnings && !hasBlockingErrors);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }}>
      {/* Header & Export Action */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '18px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
              Project Review & Packaging Export
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: canProceed ? '#DEF7EC' : '#FEF2F2',
                color: canProceed ? '#03543F' : '#991B1B',
                textTransform: 'uppercase'
              }}
            >
              {canProceed ? 'Ready for Export' : 'Governance Blocked'}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
            Multi-tier validation gate, complete Traceability Matrix, and zero-dependency PKZIP bundling with SHA-256 integrity verification.
          </p>
        </div>

        <button
          className="fiori-btn-primary"
          onClick={handleExport}
          disabled={!canProceed || exporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 600,
            padding: '10px 20px',
            backgroundColor: canProceed ? '#0066FF' : '#94A3B8',
            cursor: canProceed ? 'pointer' : 'not-allowed'
          }}
        >
          <Download size={16} />
          {exporting ? 'Packaging Archive...' : 'Package & Download Project ZIP'}
        </button>
      </div>

      {/* Top Prominent Warning Acknowledgment Banner */}
      {hasWarnings && !hasBlockingErrors && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: acknowledgedWarnings ? '#ECFDF5' : '#FFFBEB',
            border: `1px solid ${acknowledgedWarnings ? '#A7F3D0' : '#FDE68A'}`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={18} color={acknowledgedWarnings ? '#059669' : '#D97706'} />
            <div style={{ fontSize: '13px', color: acknowledgedWarnings ? '#065F46' : '#92400E' }}>
              <strong>Pre-Export Governance Notice:</strong> Project has {(readiness?.warnings || []).length} non-blocking warning(s).
              {acknowledgedWarnings ? ' Warnings acknowledged. You may now package and download the ZIP.' : ' Acknowledgment is required to authorize ZIP package download.'}
            </div>
          </div>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              backgroundColor: acknowledgedWarnings ? '#D1FAE5' : '#FEF3C7',
              borderRadius: '6px',
              border: `1px solid ${acknowledgedWarnings ? '#6EE7B7' : '#FCD34D'}`,
              fontSize: '12px',
              fontWeight: 600,
              color: acknowledgedWarnings ? '#065F46' : '#B45309',
              cursor: 'pointer',
              userSelect: 'none',
              flexShrink: 0
            }}
          >
            <input
              type="checkbox"
              checked={acknowledgedWarnings}
              onChange={(e) => setAcknowledgedWarnings(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            {acknowledgedWarnings ? 'Warnings Acknowledged ✓' : 'Acknowledge Warnings & Authorize Export'}
          </label>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: '6px',
            color: '#B91C1C',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={16} />
          {errorMsg}
        </div>
      )}

      {/* Export Success Result Card */}
      {exportResult && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 700, fontSize: '14px' }}>
              <CheckCircle2 size={18} color="#16A34A" />
              Export Generated Successfully ({Math.round(exportResult.sizeBytes / 1024)} KB)
            </div>
            <a
              href={exportResult.downloadUrl}
              download={exportResult.filename}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#15803D',
                textDecoration: 'none',
                backgroundColor: '#DCFCE7',
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              <Download size={13} /> Re-download {exportResult.filename}
            </a>
          </div>
          <div style={{ fontSize: '12px', color: '#14532D', fontFamily: 'var(--font-mono)' }}>
            <strong>SHA-256 Archive Digest:</strong> {exportResult.zipSha256}
          </div>
          <div style={{ fontSize: '11px', color: '#166534' }}>
            ✓ Contains <code>/abap/</code>, <code>/fiori/</code>, <code>/docs/</code>, and <code>Fiorify-export-manifest.json</code>. Strictly zero credentials or connection tokens.
          </div>
        </div>
      )}

      {/* Validation Gates Summary */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
            <ShieldCheck size={18} color="#0066FF" />
            Pre-Export Governance & Static Validation Gates
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: hasBlockingErrors ? '#FEE2E2' : '#DCFCE7',
                color: hasBlockingErrors ? '#991B1B' : '#166534'
              }}
            >
              {(readiness?.errors || []).length} Blocking Errors
            </span>
            <span
              style={{
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: hasWarnings ? '#FEF3C7' : '#F1F5F9',
                color: hasWarnings ? '#92400E' : '#475569'
              }}
            >
              {(readiness?.warnings || []).length} Warnings
            </span>
          </div>
        </div>

        {/* Warning Acknowledgment Gate */}
        {hasWarnings && !hasBlockingErrors && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#92400E' }}>
              <AlertTriangle size={18} color="#D97706" />
              <span>
                Project contains non-blocking warnings. Review the findings and acknowledge them to proceed with export packaging.
              </span>
            </div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#78350F',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={acknowledgedWarnings}
                onChange={(e) => setAcknowledgedWarnings(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Acknowledge warnings & allow export
            </label>
          </div>
        )}

        {/* Errors / Warnings List if any */}
        {(readiness?.errors || []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {readiness?.errors?.map((err, idx) => (
              <div
                key={idx}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#991B1B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <XCircle size={14} color="#DC2626" />
                <span>
                  <strong>[{err.ruleId || 'ERROR'}]</strong> {err.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Traceability Metrics Cards */}
      {traceability && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Requirement Coverage
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              {traceability.metrics.requirementCoveragePct}%
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {traceability.metrics.fullyMappedRequirements} of {traceability.metrics.totalRequirements} fully mapped
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Data Model Coverage
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              {traceability.metrics.entityCoveragePct}%
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {traceability.metrics.fullyMappedEntities} of {traceability.metrics.totalEntities} entities in CDS/DDIC
            </div>
          </div>

          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              UI Annotation Coverage
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
              {traceability.metrics.uiCoveragePct}%
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              {traceability.metrics.annotatedCdsViews} UI annotation definitions
            </div>
          </div>

          <div style={{ backgroundColor: '#F0F7FF', border: '1px solid #0066FF', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0066FF', textTransform: 'uppercase' }}>
              Composite Traceability Index
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0066FF', marginTop: '4px' }}>
              {traceability.metrics.traceabilityIndex}%
            </div>
            <div style={{ fontSize: '12px', color: '#0066FF', marginTop: '4px' }}>
              Mathematical Clean Core Score
            </div>
          </div>
        </div>
      )}

      {/* Interactive Traceability Matrix Table */}
      {traceability && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              <FileText size={18} color="#0066FF" />
              End-to-End Requirement-to-Artifact Traceability Matrix
            </div>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              {traceability.requirementMappings.length} Requirements Mapped
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Req ID</th>
                  <th style={{ padding: '8px 10px' }}>Title</th>
                  <th style={{ padding: '8px 10px' }}>Target Entity</th>
                  <th style={{ padding: '8px 10px' }}>CDS View Entities</th>
                  <th style={{ padding: '8px 10px' }}>RAP Behavior</th>
                  <th style={{ padding: '8px 10px' }}>Service Def</th>
                  <th style={{ padding: '8px 10px' }}>UI Annotations</th>
                  <th style={{ padding: '8px 10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {traceability.requirementMappings.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0066FF' }}>
                      {m.requirementId}
                    </td>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1E293B' }}>{m.title}</td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{m.mappedEntity}</td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#334155' }}>
                      {m.cdsViews.length > 0 ? m.cdsViews.join(', ') : '-'}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#334155' }}>
                      {m.behaviorDefinition}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#334155' }}>
                      {m.serviceDefinition}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#334155' }}>
                      {m.uiAnnotations.length > 0 ? m.uiAnnotations.join(', ') : '-'}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: m.coverage === 'FULL' ? '#DEF7EC' : m.coverage === 'PARTIAL' ? '#FEF3C7' : '#FEE2E2',
                          color: m.coverage === 'FULL' ? '#03543F' : m.coverage === 'PARTIAL' ? '#92400E' : '#991B1B'
                        }}
                      >
                        {m.coverage}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Past Export History */}
      {(project.activityHistory || []).some((a) => a.action?.includes('EXPORT')) || (project as any).exportHistory?.length > 0 ? (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
            <Archive size={18} color="#0066FF" />
            Project Export History
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#475569', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px' }}>Filename</th>
                  <th style={{ padding: '8px 10px' }}>Exported By</th>
                  <th style={{ padding: '8px 10px' }}>Size</th>
                  <th style={{ padding: '8px 10px' }}>Artifacts</th>
                  <th style={{ padding: '8px 10px' }}>Score</th>
                  <th style={{ padding: '8px 10px' }}>Timestamp</th>
                  <th style={{ padding: '8px 10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {((project as any).exportHistory || []).map((h: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#0F172A' }}>
                      {h.filename}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#475569' }}>{h.exportedBy}</td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>{Math.round(h.sizeBytes / 1024)} KB</td>
                    <td style={{ padding: '8px 10px', color: '#64748B' }}>{h.artifactCount} files</td>
                    <td style={{ padding: '8px 10px', color: '#0066FF', fontWeight: 600 }}>{h.traceabilityIndex}%</td>
                    <td style={{ padding: '8px 10px', color: '#94A3B8' }}>{new Date(h.timestamp).toLocaleString()}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <a
                        href={defaultFrontendGenerationProjectService.getDownloadExportUrl(project.projectId, h.filename)}
                        download={h.filename}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: '#0066FF',
                          textDecoration: 'none',
                          fontWeight: 600
                        }}
                      >
                        <Download size={12} /> Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};
