import React, { useState } from 'react';
import { CheckCircle2, Code2, LayoutTemplate, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
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
  onNavigateView,
  initialBox = 'abap'
}) => {
  const [openBox, setOpenBox] = useState<'abap' | 'fiori'>(initialBox);
  const [abapApproved, setAbapApproved] = useState<boolean>(false);

  const rawRegistry = project.artifactRegistry?.artifacts;
  const artifacts: any[] = rawRegistry
    ? (Array.isArray(rawRegistry) ? rawRegistry : Object.values(rawRegistry))
    : [];
  const abapCount = artifacts.filter((a) => !String(a.filePath || '').startsWith('webapp/') && a.filePath !== 'package.json' && a.filePath !== 'mockserver.js' && a.filePath !== 'start.js').length;
  const fioriCount = artifacts.filter((a) => String(a.filePath || '').startsWith('webapp/') || a.filePath === 'package.json').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Box 1: ABAP RAP Core */}
      <div
        onMouseEnter={() => {
          if (!abapApproved) setOpenBox('abap');
        }}
        style={{
          backgroundColor: '#FFFFFF',
          border: openBox === 'abap' ? '1.5px solid #0066FF' : '1px solid #E2E8F0',
          borderRadius: '10px',
          overflow: 'hidden',
          transition: 'border-color 0.15s ease'
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpenBox('abap')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOpenBox('abap');
          }}
          style={{
            padding: '14px 18px',
            backgroundColor: openBox === 'abap' ? '#F8FAFC' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {openBox === 'abap' ? <ChevronDown size={16} color="#0066FF" /> : <ChevronRight size={16} color="#64748B" />}
            <Code2 size={17} color="#0066FF" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                1. ABAP RAP Core (CDS, Behavior Definition &amp; Service)
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {abapCount > 0 ? `${abapCount} ABAP Cloud artifact(s) generated` : 'Generate Clean Core ABAP RAP backend artifacts'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {(abapApproved || abapCount > 0) && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 9px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={13} /> {abapApproved ? 'Approved' : 'Generated'}
              </span>
            )}
            {openBox === 'abap' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setAbapApproved(true);
                  setOpenBox('fiori');
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#0066FF',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span>Approve ABAP &amp; Open Fiori UI5</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>

        {openBox === 'abap' && (
          <div style={{ padding: '16px 18px', borderTop: '1px solid #E2E8F0' }}>
            <AbapGenerator
              project={project}
              onProjectUpdated={onProjectUpdated}
              onNavigateView={() => {
                setAbapApproved(true);
                setOpenBox('fiori');
              }}
            />
          </div>
        )}
      </div>

      {/* Box 2: Fiori UI5 App */}
      <div
        onMouseEnter={() => {
          if (abapApproved) setOpenBox('fiori');
        }}
        style={{
          backgroundColor: '#FFFFFF',
          border: openBox === 'fiori' ? '1.5px solid #0066FF' : '1px solid #E2E8F0',
          borderRadius: '10px',
          overflow: 'hidden',
          transition: 'border-color 0.15s ease'
        }}
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpenBox('fiori')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setOpenBox('fiori');
          }}
          style={{
            padding: '14px 18px',
            backgroundColor: openBox === 'fiori' ? '#F8FAFC' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {openBox === 'fiori' ? <ChevronDown size={16} color="#0066FF" /> : <ChevronRight size={16} color="#64748B" />}
            <LayoutTemplate size={17} color="#0066FF" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                2. Fiori UI5 App (Floorplan, Manifest &amp; Local Runner)
              </div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>
                {fioriCount > 0 ? `${fioriCount} Fiori UI5 artifact(s) ready for Live Preview` : 'Generate Fiori UI5 application matching your selected floorplan'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {fioriCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 9px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={13} /> Ready
              </span>
            )}
          </div>
        </div>

        {openBox === 'fiori' && (
          <div style={{ padding: '16px 18px', borderTop: '1px solid #E2E8F0' }}>
            <FioriUiGenerator
              project={project}
              onProjectUpdated={onProjectUpdated}
              onNavigateView={onNavigateView}
            />
          </div>
        )}
      </div>
    </div>
  );
};
