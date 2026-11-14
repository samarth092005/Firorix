import React, { useState, useEffect } from 'react';
import {
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  Play,
  RotateCw,
  Terminal,
  Layers,
  ArrowRight,
  Lock,
  Search,
  ExternalLink,
  Activity,
  FileText
} from 'lucide-react';
import {
  GenerationProject,
  DeploymentPreflight,
  DeploymentPlan,
  DeploymentExecution,
  StudioInternalView
} from '../types';
import { defaultFrontendGenerationProjectService } from '../services/generationProjectService';
import '../GenerationStudio.css';

interface DeploymentWorkspaceViewProps {
  project: GenerationProject;
  onNavigateView?: (view: StudioInternalView) => void;
}

export const DeploymentWorkspaceView: React.FC<DeploymentWorkspaceViewProps> = ({
  project,
  onNavigateView
}) => {
  const [activeTab, setActiveTab] = useState<'PREFLIGHT' | 'COMPATIBILITY' | 'PLAN' | 'EXECUTION' | 'VERIFICATION'>('PREFLIGHT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [preflight, setPreflight] = useState<DeploymentPreflight | null>(null);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [plan, setPlan] = useState<DeploymentPlan | null>(null);
  const [latestApproval, setLatestApproval] = useState<any | null>(null);
  const [execution, setExecution] = useState<DeploymentExecution | null>(null);

  // Load initial diagnostics
  useEffect(() => {
    loadPreflightAndReadiness();
  }, [project.projectId]);

  const loadPreflightAndReadiness = async () => {
    setLoading(true);
    setError(null);
    try {
      const [preflightData, readinessData] = await Promise.all([
        defaultFrontendGenerationProjectService.getPreflightDiagnostics(),
        defaultFrontendGenerationProjectService.getDeploymentReadiness(project.projectId)
      ]);
      setPreflight(preflightData);
      setReadiness(readinessData.readiness);
    } catch (err: any) {
      setError(err.message || 'Failed to load SAP preflight data.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.generateDeploymentPlan(project.projectId, {
        targetSystem: 'S21',
        targetClient: '200',
        targetPackage: '$TMP',
        forcePlan: true
      });
      setPlan(res.plan);
      setActiveTab('PLAN');
    } catch (err: any) {
      setError(err.message || 'Failed to generate deployment plan.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!plan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.approveDeploymentPlan(plan.id, {
        comments: 'Approved by Chief Architect for SAP S21 DEV deployment verification.'
      });
      setLatestApproval(res.approval);
      setPlan(prev => prev ? { ...prev, status: 'APPROVED' } : null);
    } catch (err: any) {
      setError(err.message || 'Approval failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!plan) return;
    setLoading(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.executeDeploymentPlan(plan.id);
      setExecution(res.execution);
      setActiveTab('EXECUTION');
    } catch (err: any) {
      setError(err.message || 'Execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!execution) return;
    setLoading(true);
    setError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.verifyDeployment(execution.id);
      setExecution(prev => prev ? { ...prev, verificationResults: res.verification } : null);
      setActiveTab('VERIFICATION');
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '8px' }}>
      {/* Top Banner */}
      <div className="preview-banner-card">
        <div className="preview-banner-info">
          <div className="preview-banner-icon" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5' }}>
            <Server size={24} />
          </div>
          <div className="preview-banner-content">
            <div className="preview-banner-title-row">
              <h2 className="preview-banner-title">
                SAP DEV Deployment &amp; System Verification (S11)
              </h2>
              <span className="preview-banner-badge" style={{ backgroundColor: '#DEF7EC', color: '#03543F' }}>
                <span className="preview-banner-badge-dot" style={{ backgroundColor: '#10B981' }} />
                TARGET: S21 / CLIENT 200 (S4CORE 108)
              </span>
            </div>
            <p className="preview-banner-desc">
              Structured orchestration from artifact compatibility to cryptographic approval and post-deployment verification.
            </p>
          </div>
        </div>

        <div className="preview-banner-actions">
          <button
            type="button"
            className="preview-action-btn"
            onClick={loadPreflightAndReadiness}
            disabled={loading}
            title="Refresh SAP Preflight Diagnostics"
          >
            <RotateCw size={14} />
            <span>Refresh Diagnostics</span>
          </button>

          {!plan ? (
            <button
              type="button"
              className="preview-action-btn preview-action-btn-primary"
              onClick={handleGeneratePlan}
              disabled={loading}
            >
              <FileCheck size={14} />
              <span>Generate Deployment Plan</span>
            </button>
          ) : plan.status !== 'APPROVED' ? (
            <button
              type="button"
              className="preview-action-btn preview-action-btn-primary"
              onClick={handleApprovePlan}
              disabled={loading}
              style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
            >
              <ShieldCheck size={14} />
              <span>Chief Architect Sign-Off</span>
            </button>
          ) : (
            <button
              type="button"
              className="preview-action-btn preview-action-btn-primary"
              onClick={handleExecute}
              disabled={loading}
              style={{ backgroundColor: '#6366F1', borderColor: '#6366F1' }}
            >
              <Play size={14} />
              <span>Stage &amp; Guard Execution</span>
            </button>
          )}

          {onNavigateView && (
            <>
              <div className="preview-divider" />
              <button
                type="button"
                className="preview-next-btn"
                onClick={() => onNavigateView('environment')}
                title="View Environment and Toolchain Diagnostics"
              >
                <span>Next: Environment</span>
                <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '13px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Clean Core Safety Notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', fontSize: '12px', color: '#92400E' }}>
        <Lock size={16} />
        <span>
          <strong>SAP Clean Core Safety Directives Enforced:</strong> Fiorify executes 100% read-only diagnostic and verification calls. The execution engine stops at the SAP Write Boundary without creating unapproved repository objects in S21.
        </span>
      </div>

      {/* Workspace Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
        {[
          { key: 'PREFLIGHT', label: '1. SAP 15-Point Preflight', count: preflight?.checks.length },
          { key: 'COMPATIBILITY', label: '2. Artifact Compatibility', count: readiness?.compatibilitySummary?.score ? `${readiness.compatibilitySummary.score}%` : null },
          { key: 'PLAN', label: '3. Deployment Plan & DAG', count: plan?.planDetails.operations.length },
          { key: 'EXECUTION', label: '4. Execution & Write Boundary Guard', count: execution?.logs.length },
          { key: 'VERIFICATION', label: '5. Post-Deployment Verification', count: execution?.verificationResults?.checks?.length }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #2563EB' : '2px solid transparent',
              background: 'transparent',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#1E293B' : '#64748B',
              cursor: 'pointer'
            }}
          >
            {tab.label} {tab.count !== null && tab.count !== undefined && <span style={{ marginLeft: '4px', fontSize: '11px', padding: '2px 6px', background: '#F1F5F9', borderRadius: '10px' }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* TAB 1: PREFLIGHT */}
      {activeTab === 'PREFLIGHT' && preflight && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div style={{ padding: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>OVERALL READINESS</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: preflight.overallReadiness === 'READY' ? '#10B981' : '#F59E0B', marginTop: '4px' }}>
                {preflight.overallReadiness}
              </div>
            </div>
            <div style={{ padding: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>SYSTEM IDENTIFICATION</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                {preflight.targetSystem.systemId} (Client {preflight.targetSystem.client})
              </div>
            </div>
            <div style={{ padding: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>S/4HANA RELEASE</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '4px' }}>
                {preflight.targetSystem.release}
              </div>
            </div>
            <div style={{ padding: '14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>CHECKS PASSED</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>
                {preflight.summary.passed} / {preflight.summary.totalChecks}
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>#</th>
                  <th style={{ padding: '10px 14px' }}>Check Name</th>
                  <th style={{ padding: '10px 14px' }}>Category</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Diagnostic Details</th>
                  <th style={{ padding: '10px 14px' }}>Latency</th>
                </tr>
              </thead>
              <tbody>
                {preflight.checks.map((c, idx) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{idx + 1}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>{c.name}</td>
                    <td style={{ padding: '10px 14px', color: '#64748B' }}>{c.category}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: c.status === 'PASSED' ? '#DEF7EC' : (c.status === 'WARNING' ? '#FEF3C7' : '#FEE2E2'),
                        color: c.status === 'PASSED' ? '#03543F' : (c.status === 'WARNING' ? '#92400E' : '#991B1B')
                      }}>
                        {c.status === 'PASSED' ? <CheckCircle2 size={12} /> : (c.status === 'WARNING' ? <AlertTriangle size={12} /> : <XCircle size={12} />)}
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#475569', fontFamily: 'monospace', fontSize: '11px' }}>
                      {JSON.stringify(c.details)}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748B' }}>{c.latencyMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMPATIBILITY */}
      {activeTab === 'COMPATIBILITY' && readiness && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#0F172A' }}>
              Semantic Compatibility Rating: <span style={{ color: readiness.compatibilitySummary.rating === 'COMPATIBLE' ? '#10B981' : '#F59E0B' }}>{readiness.compatibilitySummary.rating}</span>
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#64748B' }}>
              Evaluates generated RAP ABAP CDS views, behavior pools, service definitions, and Fiori Elements contracts against S/4HANA 2023 Clean Core rules.
            </p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <div><strong>Compatibility Score:</strong> {readiness.compatibilitySummary.score}%</div>
              <div><strong>Service Binding Proposal State:</strong> <span style={{ color: '#2563EB', fontWeight: 600 }}>{readiness.compatibilitySummary.serviceBindingStatus}</span></div>
            </div>
          </div>

          {readiness.compatibilitySummary.limitations && readiness.compatibilitySummary.limitations.length > 0 && (
            <div style={{ padding: '14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#92400E', marginBottom: '6px' }}>
                Identified Developer Handover Items / Limitations:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#78350F' }}>
                {readiness.compatibilitySummary.limitations.map((lim: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '4px' }}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PLAN */}
      {activeTab === 'PLAN' && plan && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#0F172A' }}>Deployment Plan: {plan.id}</h3>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  Target: <strong>{plan.targetSystem}</strong> | Client: <strong>{plan.targetClient}</strong> | Package: <strong>{plan.targetPackage}</strong> | Status: <strong>{plan.status}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#64748B' }}>PLAN SHA-256 HASH</div>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#2563EB' }}>
                  {plan.planHash.substring(0, 24)}...
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', fontWeight: 600, fontSize: '13px' }}>
              Dependency Execution DAG ({plan.planDetails.operations.length} Artifacts)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '8px 14px' }}>Seq</th>
                  <th style={{ padding: '8px 14px' }}>Operation</th>
                  <th style={{ padding: '8px 14px' }}>Artifact Type</th>
                  <th style={{ padding: '8px 14px' }}>Object Name</th>
                  <th style={{ padding: '8px 14px' }}>Target Package</th>
                </tr>
              </thead>
              <tbody>
                {plan.planDetails.operations.map(op => (
                  <tr key={op.sequence} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 14px', fontWeight: 700, color: '#2563EB' }}>{op.sequence}</td>
                    <td style={{ padding: '8px 14px', color: '#0F172A' }}>{op.operationType}</td>
                    <td style={{ padding: '8px 14px', color: '#64748B' }}>{op.artifactType}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: '#0F172A' }}>{op.objectName}</td>
                    <td style={{ padding: '8px 14px', color: '#475569' }}>{op.targetPackage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXECUTION & WRITE BOUNDARY GUARD */}
      {activeTab === 'EXECUTION' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={28} color="#DC2626" />
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#991B1B' }}>
                  EXECUTION BOUNDARY ENFORCED: STOPPED_AT_WRITE_BOUNDARY
                </div>
                <div style={{ fontSize: '13px', color: '#7F1D1D', marginTop: '2px' }}>
                  Preflight staging complete. In accordance with Fiorify SAP Safety Directives, mutating requests to S21 require explicit write confirmation.
                </div>
              </div>
            </div>
          </div>

          {execution && (
            <div style={{ background: '#0F172A', color: '#E2E8F0', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '350px', overflowY: 'auto' }}>
              <div style={{ color: '#94A3B8', marginBottom: '8px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
                // Execution Terminal Output ({execution.id})
              </div>
              {execution.logs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '6px', color: log.level === 'GUARDRAIL' ? '#F87171' : (log.level === 'INFO' ? '#38BDF8' : '#FCD34D') }}>
                  [{log.timestamp}] [{log.level}] {log.message}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="preview-action-btn"
              onClick={handleVerify}
              disabled={loading}
            >
              <Activity size={14} />
              <span>Run Post-Deployment Verification Probes</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: POST-DEPLOYMENT VERIFICATION */}
      {activeTab === 'VERIFICATION' && execution?.verificationResults && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#0F172A' }}>
                  Evidence-Based Verification Status: <span style={{ color: '#F59E0B' }}>{execution.verificationResults.overallVerificationStatus}</span>
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                  100% read-only queries against SAP S21 Gateway &amp; ADT to verify real object states.
                </p>
              </div>
              <button
                type="button"
                className="preview-action-btn"
                onClick={handleVerify}
                disabled={loading}
              >
                <RotateCw size={14} />
                <span>Re-verify</span>
              </button>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textAlign: 'left', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Probe Name</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                  <th style={{ padding: '10px 14px' }}>Target Endpoint</th>
                  <th style={{ padding: '10px 14px' }}>Evidence / Diagnostic Observation</th>
                </tr>
              </thead>
              <tbody>
                {execution.verificationResults.checks.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>{c.name}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: c.status === 'PASSED' ? '#DEF7EC' : (c.status === 'NOT_FOUND' || c.status === 'NOT_ACCESSIBLE' ? '#FEE2E2' : '#FEF3C7'),
                        color: c.status === 'PASSED' ? '#03543F' : (c.status === 'NOT_FOUND' || c.status === 'NOT_ACCESSIBLE' ? '#991B1B' : '#92400E')
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#64748B', fontSize: '11px' }}>{c.endpoint}</td>
                    <td style={{ padding: '10px 14px', color: '#334155' }}>{c.evidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
