import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { GenerationProject, StudioInternalView } from '../types';
import { ArchitectureDesigner } from './ArchitectureDesigner';
import { SpecificationLifecycleView } from './SpecificationLifecycleView';

interface ArchitectureAndGatesViewProps {
  project: GenerationProject;
  onProjectUpdated: (updated: GenerationProject) => void;
  onNavigateView: (view: StudioInternalView) => void;
  initialCard?: 'architecture' | 'gates' | null;
}

export const ArchitectureAndGatesView: React.FC<ArchitectureAndGatesViewProps> = ({
  project,
  onProjectUpdated,
  onNavigateView,
  initialCard = null
}) => {
  const [activeCard, setActiveCard] = useState<'architecture' | 'gates' | null>(initialCard);
  const [archApproved, setArchApproved] = useState<boolean>(Boolean(project.architectureSpec?.selectedProfile));

  useEffect(() => {
    if (!activeCard) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveCard(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeCard]);

  const lifecycle = project.lifecycleStatus || '';
  const gatesApproved =
    Boolean(project.approvedBy) ||
    lifecycle === 'READY_FOR_GENERATION' ||
    lifecycle === 'GENERATED' ||
    lifecycle === 'VALIDATION_COMPLETED' ||
    lifecycle === 'EXPORTED';

  if (activeCard === 'architecture') {
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
            <Cpu size={16} color="#0066FF" />
            <span>1. RAP Pattern &amp; Naming Blueprint</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => {
                setArchApproved(true);
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

        <ArchitectureDesigner
          project={project}
          onProjectUpdated={onProjectUpdated}
          onNavigateView={() => {
            setArchApproved(true);
            setActiveCard(null);
          }}
        />
      </div>
    );
  }

  if (activeCard === 'gates') {
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
            <ShieldCheck size={16} color="#0066FF" />
            <span>2. 13-Gate Readiness Check</span>
          </div>
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

        <SpecificationLifecycleView
          project={project}
          onProjectUpdated={onProjectUpdated}
          onNavigateView={(view) => {
            if (view === 'architecture') {
              setActiveCard('architecture');
              return;
            }
            onNavigateView(view);
          }}
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
            Architecture &amp; 13-Gate Readiness
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#64748B' }}>
            Select a card to expand, review, and approve before building ABAP &amp; Fiori code.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateView('abap-generator')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 16px',
            borderRadius: '8px',
            border: 'none',
            background: gatesApproved
              ? 'linear-gradient(180deg, #1A75FF 0%, #005CE6 100%)'
              : '#0F172A',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <span>Next: Build Workspace</span>
          <ArrowRight size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <div
          role="button"
          tabIndex={0}
          className="studio-zoom-card"
          onClick={() => setActiveCard('architecture')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveCard('architecture');
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
              <Cpu size={20} />
            </div>
            {archApproved && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 9px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={13} /> Configured
              </span>
            )}
          </div>

          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              1. RAP Pattern &amp; Naming Blueprint
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              Review the Clean Core RAP pattern ({project.architectureSpec?.selectedProfile || 'MANAGED_RAP_DRAFT'}) and SAP DDIC naming blueprint.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#0066FF' }}>
            <Maximize2 size={14} />
            <span>Open &amp; Configure</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          className="studio-zoom-card"
          onClick={() => setActiveCard('gates')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveCard('gates');
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
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} />
            </div>
            {gatesApproved && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '3px 9px', borderRadius: '999px', border: '1px solid #BBF7D0' }}>
                <CheckCircle2 size={13} /> Approved
              </span>
            )}
          </div>

          <div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              2. 13-Gate Readiness Check
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
              Verify all 13 Clean Core readiness gates and approve the specification for ABAP &amp; Fiori build.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#059669' }}>
            <Maximize2 size={14} />
            <span>Open &amp; Verify Gates</span>
          </div>
        </div>
      </div>
    </div>
  );
};
