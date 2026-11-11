import React, { useState, useEffect } from 'react';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCw,
  Server,
  Layers,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Cpu,
  Monitor
} from 'lucide-react';
import { GenerationProject, ToolchainReport, DeveloperHandoverGuide } from '../types';
import { defaultFrontendGenerationProjectService } from '../services/generationProjectService';

interface ToolchainViewProps {
  project?: GenerationProject | null;
}

export const ToolchainView: React.FC<ToolchainViewProps> = ({ project }) => {
  const [toolchain, setToolchain] = useState<ToolchainReport | null>(null);
  const [guide, setGuide] = useState<DeveloperHandoverGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'abap' | 'fiori'>('abap');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchToolchain = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await defaultFrontendGenerationProjectService.getToolchainStatus();
      setToolchain(res.toolchain);

      if (project?.projectId) {
        const guideRes = await defaultFrontendGenerationProjectService.getHandoverGuide(project.projectId);
        setGuide(guideRes.handoverGuide);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to inspect developer toolchain.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToolchain();
  }, [project?.projectId]);

  const handleCopyMarkdown = () => {
    if (!guide?.markdown) return;
    navigator.clipboard.writeText(guide.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'READY':
        return { bg: '#DEF7EC', text: '#03543F', border: '#86EFAC' };
      case 'PARTIALLY_READY':
      case 'UPGRADE_RECOMMENDED':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
      case 'ACTION_REQUIRED':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '4px 0' }}>
      {/* Header Banner */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0066FF'
            }}
          >
            <Wrench size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                Developer Toolchain & Workstation Readiness
              </h2>
              {toolchain && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    ...getStatusColor(toolchain.overallStatus),
                    textTransform: 'uppercase'
                  }}
                >
                  {toolchain.overallStatus.replace('_', ' ')}
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
              Read-only system inspection of local runtimes, Eclipse ADT, and developer handover instructions for SAP S21.
            </p>
          </div>
        </div>

        <button
          className="fiori-btn-secondary"
          onClick={fetchToolchain}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
        >
          <RotateCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Scanning...' : 'Rescan Toolchain'}
        </button>
      </div>

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

      {/* Target SAP System Banner */}
      <div
        style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#334155'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={16} color="#0066FF" />
          <span>
            <strong>Target Landscape:</strong> SAP S/4HANA 2023 FPS01 (System: <code>S21</code>, Client: <code>200</code>)
          </span>
          <span style={{ color: '#94A3B8' }}>•</span>
          <span>SAP_BASIS: <code>7.58</code></span>
          <span style={{ color: '#94A3B8' }}>•</span>
          <span>SAP_UI: <code>7.58</code></span>
        </div>
        <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>
          Strict Policy: NO direct SAP writes / NO CTS transports triggered
        </div>
      </div>

      {/* Tools Inspection Grid */}
      {toolchain && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={16} color="#0066FF" /> Workstation Environment Inventory
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {Object.entries(toolchain.tools).map(([key, t]) => {
              const colors = getStatusColor(t.status);
              return (
                <div
                  key={key}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minHeight: '110px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B' }}>{t.name}</div>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '8px',
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: colors.bg,
                          color: colors.text
                        }}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#0066FF', marginTop: '4px' }}>
                      {t.version}
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '8px', lineHeight: '1.3' }}>
                    {t.details}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Local Ports Diagnostic Grid */}
      {toolchain && (
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
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Monitor size={16} color="#0066FF" /> Port Availability Diagnostic
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {toolchain.ports.map((p) => (
              <div
                key={p.port}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 12px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: p.free ? '#10B981' : '#F59E0B'
                  }}
                />
                <span>Port {p.port}: {p.service}</span>
                <span style={{ fontSize: '11px', color: p.free ? '#059669' : '#D97706', fontWeight: 600 }}>
                  ({p.free ? 'FREE' : 'IN USE'})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Developer Handover Instructions Section */}
      {guide && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              <Terminal size={18} color="#0066FF" />
              S/4HANA 2023 Developer Handover Instructions ({guide.targetSystem}, Client {guide.targetClient})
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ display: 'flex', border: '1px solid #E2E8F0', borderRadius: '6px', overflow: 'hidden' }}>
                <button
                  onClick={() => setActiveGuideTab('abap')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeGuideTab === 'abap' ? '#0066FF' : '#F8FAFC',
                    color: activeGuideTab === 'abap' ? '#FFFFFF' : '#475569'
                  }}
                >
                  ABAP Cloud (ADT) Handover
                </button>
                <button
                  onClick={() => setActiveGuideTab('fiori')}
                  style={{
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeGuideTab === 'fiori' ? '#0066FF' : '#F8FAFC',
                    color: activeGuideTab === 'fiori' ? '#FFFFFF' : '#475569'
                  }}
                >
                  Fiori UI5 Handover
                </button>
              </div>

              <button
                className="fiori-btn-secondary"
                onClick={handleCopyMarkdown}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                {copied ? 'Copied Guide!' : 'Copy Markdown'}
              </button>
            </div>
          </div>

          {/* Stepper list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(activeGuideTab === 'abap' ? guide.abapSteps : guide.fioriSteps).map((s) => (
              <div
                key={s.stepNumber}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  gap: '12px'
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: '#0066FF',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {s.stepNumber}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                    {s.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
