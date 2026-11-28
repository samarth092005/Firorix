import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Code2,
  LayoutTemplate,
  ArrowRight,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { GenerationProject, StudioInternalView } from '../types';
import { AbapGenerator } from './AbapGenerator';
import { FioriUiGenerator } from './FioriUiGenerator';

interface BuildWorkspaceViewProps {
  project: GenerationProject;
  onProjectUpdated: (updated: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
  initialBox?: 'abap' | 'fiori';
}

export const BuildWorkspaceView: React.FC<BuildWorkspaceViewProps> = ({
  project,
  onProjectUpdated,
  onNavigateView
}) => {
  const [activeCard, setActiveCard] = useState<'abap' | 'fiori' | null>(null);
  const [abapApproved, setAbapApproved] = useState<boolean>(false);
  const [fioriApproved, setFioriApproved] = useState<boolean>(false);

  useEffect(() => {
    if (!activeCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCard(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCard]);

  const rawRegistry = project.artifactRegistry?.artifacts;
  const artifacts: any[] = rawRegistry
    ? (Array.isArray(rawRegistry) ? rawRegistry : Object.values(rawRegistry))
    : [];
  const abapCount = artifacts.filter(
    (a) =>
      !String(a.filePath || '').startsWith('webapp/') &&
      a.filePath !== 'package.json' &&
      a.filePath !== 'mockserver.js' &&
      a.filePath !== 'start.js' &&
      a.filePath !== 'manifest.yml' &&
      a.filePath !== 'RUNBOOK.md' &&
      a.filePath !== 'LOCAL_SETUP.md'
  ).length;
  const fioriCount = artifacts.filter(
    (a) => String(a.filePath || '').startsWith('webapp/') || a.filePath === 'package.json'
  ).length;

  if (activeCard === 'abap') {
    return (
      <div className="studio-zoom-expanded" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
            <Code2 size={16} color="#0066FF" />
            <span>1. ABAP RAP Core</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setAbapApproved(true);
                setActiveCard(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={14} />
              <span>Approve &amp; Back</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCard(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Minimize2 size={13} />
              <span>Close</span>
            </button>
          </div>
        </div>

        <AbapGenerator
          project={project}
          onProjectUpdated={onProjectUpdated}
          onNavigateView={() => {
            setAbapApproved(true);
            setActiveCard(null);
          }}
          hideNextButton
        />
      </div>
    );
  }

  if (activeCard === 'fiori') {
    return (
      <div className="studio-zoom-expanded" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            padding: '10px 16px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
            <LayoutTemplate size={16} color="#0066FF" />
            <span>2. Fiori UI5 App</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setFioriApproved(true);
                setActiveCard(null);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={14} />
              <span>Approve &amp; Back</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCard(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Minimize2 size={13} />
              <span>Close</span>
            </button>
          </div>
        </div>

        <FioriUiGenerator
          project={project}
          onProjectUpdated={onProjectUpdated}
          onNavigateView={onNavigateView}
          hideNextButton
        />
      </div>
    );
  }

  return (
    <div className="studio-zoom-grid" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
            Build Workspace (ABAP RAP Core &amp; Fiori UI5 App)
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
            Click a card to zoom in, generate &amp; inspect code, then approve to return here.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateView('preview-validation')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '8px',
            border: 'none',
            background: fioriCount > 0
              ? 'linear-gradient(180deg, #1A75FF 0%, #005CE6 100%)'
              : '#0F172A',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <span>Next: Live Preview</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <div
          role="button"
          tabIndex={0}
          className="studio-zoom-card"
          onClick={() => setActiveCard('abap')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveCard('abap');
          }}
          style={{
            padding: '22px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
            minHeight: '280px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Code2 size={20} />
            </div>
            {(abapApproved || abapCount > 0) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 9px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={13} /> {abapApproved ? 'Approved' : `${abapCount} Files`}
              </span>
            )}
          </div>

          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              1. ABAP RAP Core
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              Synthesize Clean Core CDS View Entities, Behavior Definition (BDEF), Behavior Pool, and OData V4 Service Binding.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0066FF' }}>
            <Maximize2 size={14} />
            <span>Open &amp; Generate ABAP</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className="studio-zoom-card"
          onClick={() => setActiveCard('fiori')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveCard('fiori');
          }}
          style={{
            padding: '22px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '16px',
            minHeight: '280px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#0066FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LayoutTemplate size={20} />
            </div>
            {(fioriApproved || fioriCount > 0) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 9px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={13} /> {fioriApproved ? 'Approved' : `${fioriCount} Files`}
              </span>
            )}
          </div>

          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              2. Fiori UI5 App
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              Generate Fiori UI5 manifest, XML views/annotations, local mockserver, and Cloud Foundry runbook for your chosen floorplan.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0066FF' }}>
            <Maximize2 size={14} />
            <span>Open &amp; Generate UI5</span>
          </div>
        </div>
      </div>
    </div>
  );
};
