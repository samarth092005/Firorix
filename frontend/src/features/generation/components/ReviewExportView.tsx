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
  const [runbookTab, setRunbookTab] = useState<'local' | 'cf' | 'sap'>('local');
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);

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
            Final readiness verification, SAP connectivity setup, and standalone Customer ZIP packaging.
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

      {/* Turnkey Hosting & Setup Rulebook (Local < 5s / Cloud Foundry cf push / Live SAP) */}
      {(() => {
        const commands: Record<'local' | 'cf' | 'sap', { title: string; desc: string; cmd: string }> = {
          local: {
            title: 'Local Laptop Testing — Ready in < 5 Seconds',
            desc: 'Unzip and run directly with Node.js (zero heavy @sap/ux-ui5-tooling install required). Full details in RUNBOOK.md & LOCAL_SETUP.md.',
            cmd: 'cd fiori && node start.js'
          },
          cf: {
            title: 'Host on SAP BTP Cloud Foundry (Turnkey manifest.yml included)',
            desc: 'A pre-configured manifest.yml is packaged inside fiori/ — push directly to Cloud Foundry in 3 commands.',
            cmd: 'cf login -a https://api.cf.eu10-005.hana.ondemand.com\ncd fiori\ncf push'
          },
          sap: {
            title: 'Full UI5 CLI Build & Live SAP Integration (< 4–5 Minutes)',
            desc: 'Install @ui5/cli to bundle dist/ or proxy /sap/* to your BTP Destination via ui5.yaml / xs-app.json.',
            cmd: 'cd fiori && npm install && npm run build'
          }
        };
        const active = commands[runbookTab];
        return (
          <div
            style={{
              padding: '16px 18px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                Deployment &amp; Hosting Rulebook (Included in ZIP as <code>RUNBOOK.md</code>)
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([
                  { id: 'local', label: 'Local (< 5s)' },
                  { id: 'cf', label: 'Cloud Foundry (cf push)' },
                  { id: 'sap', label: 'UI5 Build / SAP' }
                ] as const).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setRunbookTab(t.id)}
                    style={{
                      padding: '5px 11px',
                      borderRadius: '6px',
                      border: runbookTab === t.id ? '1px solid #0066FF' : '1px solid #CBD5E1',
                      backgroundColor: runbookTab === t.id ? '#EFF6FF' : '#F8FAFC',
                      color: runbookTab === t.id ? '#0066FF' : '#334155',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ fontSize: '12.5px', color: '#475569' }}>
              <strong style={{ color: '#0F172A' }}>{active.title}:</strong> {active.desc}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', backgroundColor: '#0F172A', color: '#E2E8F0', padding: '10px 14px', borderRadius: '6px', fontFamily: 'monospace', fontSize: '12px' }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{active.cmd}</pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(active.cmd);
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 1800);
                }}
                style={{
                  padding: '5px 10px',
                  borderRadius: '5px',
                  border: '1px solid #334155',
                  backgroundColor: '#1E293B',
                  color: '#F8FAFC',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {copiedCmd ? 'Copied ✓' : 'Copy'}
              </button>
            </div>
          </div>
        );
      })()}

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
            ✓ Contains <code>/abap/</code>, <code>/fiori/</code>, <code>/docs/</code>, <code>.abapgit.xml</code>, and <code>Fiorify-export-manifest.json</code>. Strictly zero credentials or connection tokens.
          </div>
        </div>
      )}

      {/* Package File Tree Preview */}
      {(() => {
        const rawReg = project.artifactRegistry?.artifacts;
        const artList: any[] = rawReg ? (Array.isArray(rawReg) ? rawReg : Object.values(rawReg)) : [];
        if (artList.length === 0) return null;
        return (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                <Package size={16} color="#0066FF" />
                <span>ZIP Package Contents Preview ({artList.length + 5} files)</span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B' }}>abapGit + Eclipse ADT Ready</span>
            </div>
            <div
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                padding: '10px 14px',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '11.5px',
                color: '#334155',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '4px 16px'
              }}
            >
              {artList.map((a: any, idx: number) => (
                <div key={a.artifactId || idx} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  • {a.filePath || a.objectName || a.name}
                </div>
              ))}
              <div>• .abapgit.xml</div>
              <div>• docs/TRACEABILITY.md</div>
              <div>• docs/ARCHITECTURE.md</div>
              <div>• docs/ECLIPSE_ADT_HANDOVER_SOP.md</div>
              <div>• Fiorify-export-manifest.json</div>
            </div>
          </div>
        );
      })()}

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

        {/* Non-blocking warnings advisory note */}
        {hasWarnings && !hasBlockingErrors && !acknowledgedWarnings && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '12px',
              color: '#92400E'
            }}
          >
            <AlertTriangle size={15} color="#D97706" />
            <span>
              Review the findings below. Authorize export using the governance acknowledgment banner above.
            </span>
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

      {/* SAP Connectivity & Integration Setup */}
      {(() => {
        const rootEnt = project.dataModelSpec?.entities?.find((e: any) => e.entityType === 'ROOT' || e.isRoot) || project.dataModelSpec?.entities?.[0];
        const stem = (rootEnt?.name || project.sourceTransactionCode || 'CUSTOM').replace(/[^a-zA-Z0-9_]/g, '').toUpperCase();
        const srvName = stem.startsWith('ZUI_') ? stem : `ZUI_${stem.replace(/^Z_?[IC]_?/i, '')}`;
        const odataPath = `/sap/opu/odata4/sap/${srvName.toLowerCase()}/srvd/sap/${srvName.toLowerCase()}/0001/`;
        return (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                SAP Connectivity &amp; Integration Setup
              </div>
              <span style={{ fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '999px', backgroundColor: '#EFF6FF', color: '#1D4ED8' }}>
                Local Mock + Live SAP Ready
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12.5px' }}>
              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Target SAP System</div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                  {project.sourceSystemId || 'S21'} (Client {project.sourceClient || '200'})
                </div>
                <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                  BTP Destination: <code>{(project as any).targetDestination || 'S21_FIORI'}</code>
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>OData V4 Service Binding</div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '4px', fontFamily: 'monospace' }}>
                  {srvName}
                </div>
                <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {odataPath}
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Routing &amp; Proxy Config</div>
                <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '4px' }}>
                  <code>ui5.yaml</code> &amp; <code>xs-app.json</code>
                </div>
                <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>
                  Pre-configured for <code>/sap/*</code> proxy to SAP S/4HANA or local <code>mockserver.js</code>.
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', opacity: 0.85 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>Direct SAP DEV Deployment</div>
                <div style={{ fontWeight: 700, color: '#92400E', marginTop: '4px' }}>
                  On Hold · Coming Soon
                </div>
                <div style={{ fontSize: '11.5px', color: '#92400E', marginTop: '2px' }}>
                  Direct repository transport is disabled in this release. Use ZIP export or <code>cf push</code>.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
