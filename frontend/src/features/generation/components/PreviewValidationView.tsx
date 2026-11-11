import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Database,
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  Server,
  RefreshCw,
  Eye
} from 'lucide-react';
import { GenerationProject, PreviewSessionInfo, PreviewRequestLog } from '../types';
import { defaultFrontendGenerationProjectService } from '../services/generationProjectService';

interface PreviewValidationViewProps {
  project: GenerationProject;
  onProjectUpdated?: (updatedProject: GenerationProject) => void;
}

export const PreviewValidationView: React.FC<PreviewValidationViewProps> = ({
  project
}) => {
  const [session, setSession] = useState<PreviewSessionInfo | null>(null);
  const [requests, setRequests] = useState<PreviewRequestLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Poll status while mounted
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const res = await defaultFrontendGenerationProjectService.getPreviewStatus(project.projectId);
        if (isMounted) setSession(res.previewStatus);
      } catch (err: any) {
        // Not running or error
        if (isMounted) setSession(null);
      }
    };

    fetchStatus();
    const interval = setInterval(async () => {
      try {
        const res = await defaultFrontendGenerationProjectService.getPreviewStatus(project.projectId);
        if (isMounted) setSession(res.previewStatus);
        if (res.previewStatus && res.previewStatus.status === 'RUNNING') {
          const reqRes = await defaultFrontendGenerationProjectService.getPreviewRequests(project.projectId);
          const raw = reqRes?.requests;
          const reqList = Array.isArray(raw) ? raw : [];
          if (isMounted) setRequests(reqList);
        }
      } catch {}
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [project.projectId]);

  const handleStart = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.startPreview(project.projectId);
      setSession(res.session);
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setActionError(err.message || 'Failed to start local preview server.');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    setActionError(null);
    try {
      await defaultFrontendGenerationProjectService.stopPreview(project.projectId);
      setSession(null);
      setRequests([]);
    } catch (err: any) {
      setActionError(err.message || 'Failed to stop preview server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestart = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await defaultFrontendGenerationProjectService.restartPreview(project.projectId);
      setSession(res.session);
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setActionError(err.message || 'Failed to restart preview.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      await defaultFrontendGenerationProjectService.resetSyntheticData(project.projectId);
      const res = await defaultFrontendGenerationProjectService.getPreviewStatus(project.projectId);
      setSession(res.previewStatus);
      setIframeKey((k) => k + 1);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reset synthetic data.');
    } finally {
      setLoading(false);
    }
  };

  const isRunning = session?.status === 'RUNNING';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0' }}>
      {/* Top Banner: Local Preview Status & Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: isRunning ? '#ECFDF5' : '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isRunning ? '#10B981' : '#64748B'
            }}
          >
            {isRunning ? <Activity size={24} /> : <Server size={24} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                Local Fiori Elements Preview (Mock OData V4)
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
                  backgroundColor: isRunning ? '#DEF7EC' : '#F3F4F6',
                  color: isRunning ? '#03543F' : '#4B5563',
                  textTransform: 'uppercase'
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: isRunning ? '#10B981' : '#9CA3AF'
                  }}
                />
                {isRunning ? `RUNNING on Port ${session?.port}` : 'STOPPED'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B' }}>
              Isolated in-process Node.js HTTP server bound strictly to loopback (127.0.0.1). Serves generated Fiori UI and synthetic OData V4.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isRunning ? (
            <>
              <button
                className="fiori-btn-secondary"
                onClick={handleRestart}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                title="Restart Mock Server"
              >
                <RotateCw size={14} /> Restart
              </button>
              <button
                className="fiori-btn-secondary"
                onClick={handleResetData}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                title="Reset synthetic data to baseline"
              >
                <RefreshCw size={14} /> Reset Data
              </button>
              <button
                className="fiori-btn-secondary"
                onClick={() => window.open(session?.previewUrl, '_blank')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                title="Open in new browser tab"
              >
                <ExternalLink size={14} /> Open Tab
              </button>
              <button
                className="fiori-btn-secondary"
                onClick={handleStop}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#DC2626', borderColor: '#FCA5A5' }}
              >
                <Square size={14} /> Stop Preview
              </button>
            </>
          ) : (
            <button
              className="fiori-btn-primary"
              onClick={handleStart}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', backgroundColor: '#0066FF' }}
            >
              <Play size={14} /> Launch Local Preview
            </button>
          )}
        </div>
      </div>

      {actionError && (
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
          {actionError}
        </div>
      )}

      {/* Main Preview Container */}
      {isRunning && session ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Watermark Security Notice */}


          {/* Embedded WebApp Frame */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
            }}
          >
            <div
              style={{
                height: '36px',
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#64748B'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#F59E0B', display: 'inline-block' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                <span style={{ marginLeft: '10px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#334155' }}>
                  {session.previewUrl}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
 
              </div>
            </div>

            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={session.previewUrl}
              title="Fiori Elements App Preview"
              style={{
                width: '100%',
                height: '620px',
                border: 'none',
                display: 'block',
                backgroundColor: '#FAFAFA'
              }}
            />
          </div>

          {/* Live Request Telemetry Log */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
                <Activity size={16} color="#0066FF" />
                Live Mock OData V4 Request Log
              </div>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {(Array.isArray(requests) ? requests : []).length} recorded operations
              </span>
            </div>

            {(Array.isArray(requests) ? requests : []).length === 0 ? (
              <div style={{ fontSize: '13px', color: '#94A3B8', padding: '12px 0', textAlign: 'center' }}>
                No HTTP requests received yet. Navigate or interact with the preview application above.
              </div>
            ) : (
              <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Method</th>
                      <th style={{ padding: '6px 8px' }}>Status</th>
                      <th style={{ padding: '6px 8px' }}>URL Resource</th>
                      <th style={{ padding: '6px 8px' }}>Duration</th>
                      <th style={{ padding: '6px 8px' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(requests) ? requests : []).slice(-10).reverse().map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              backgroundColor: r.method === 'POST' ? '#DCFCE7' : r.method === 'DELETE' ? '#FEE2E2' : '#EFF6FF',
                              color: r.method === 'POST' ? '#166534' : r.method === 'DELETE' ? '#991B1B' : '#1D4ED8',
                              border: `1px solid ${r.method === 'POST' ? '#BBF7D0' : r.method === 'DELETE' ? '#FECACA' : '#BFDBFE'}`
                            }}
                          >
                            {r.method}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: r.status < 400 ? '#DEF7EC' : '#FDE8E8',
                              color: r.status < 400 ? '#03543F' : '#9B1C1C'
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '6px 8px', color: '#334155', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.url}
                        </td>
                        <td style={{ padding: '6px 8px', color: '#64748B' }}>{r.durationMs}ms</td>
                        <td style={{ padding: '6px 8px', color: '#94A3B8' }}>{new Date(r.timestamp).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State: Preview Not Started */
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px dashed #CBD5E1',
            borderRadius: '8px',
            padding: '50px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0066FF'
            }}
          >
            <Play size={32} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
              Launch In-Process Mock OData V4 Preview
            </h3>
            <p style={{ margin: '6px auto 0 auto', fontSize: '13px', color: '#64748B', maxWidth: '520px' }}>
              Starts a lightweight HTTP server on 127.0.0.1 (ports 4050–4099) hosting the generated SAP Fiori Elements web application against synthetic in-memory data.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginTop: '8px',
              padding: '12px 20px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
              color: '#475569'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="#10B981" /> Zero SAP Connection
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="#10B981" /> Permanent Watermark
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={14} color="#10B981" /> Dynamic Port Allocation
            </div>
          </div>

          <button
            className="fiori-btn-primary"
            onClick={handleStart}
            disabled={loading}
            style={{
              marginTop: '10px',
              padding: '10px 22px',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Play size={16} /> Start Local Preview Server
          </button>
        </div>
      )}
    </div>
  );
};
