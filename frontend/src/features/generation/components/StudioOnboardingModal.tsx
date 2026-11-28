import React from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  PlayCircle,
  PackageCheck,
  ArrowRight,
  Layers
} from 'lucide-react';
import { StudioInternalView } from '../types';

interface StudioOnboardingModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
  onStartStep: (view: StudioInternalView, dontShowAgain: boolean) => void;
  currentView: StudioInternalView;
}

const STAGES = [
  {
    step: '01',
    title: 'Scope & Model',
    view: 'requirements' as StudioInternalView,
    icon: FileText,
    desc: 'Confirm functional requirements, choose the Fiori floorplan (List Report, Worklist, ALP, Overview, or Wizard), and verify CDS entities.'
  },
  {
    step: '02',
    title: 'Architecture & Review',
    view: 'architecture' as StudioInternalView,
    icon: ShieldCheck,
    desc: 'Validate Clean Core RAP architecture and pass the 13-Gate Governance check before code generation.'
  },
  {
    step: '03',
    title: 'Build & Live Sandbox',
    view: 'abap-generator' as StudioInternalView,
    icon: PlayCircle,
    desc: 'Generate ABAP Cloud + Fiori UI5 artifacts, launch the Live Fiori Sandbox, and refine UI using the Request Changes & Review Diff Copilot.'
  },
  {
    step: '04',
    title: 'Package & Deploy',
    view: 'review-export' as StudioInternalView,
    icon: PackageCheck,
    desc: 'Download the runnable customer ZIP (npm install && npm start) or deploy directly to SAP DEV.'
  }
];

export const StudioOnboardingModal: React.FC<StudioOnboardingModalProps> = ({
  isOpen,
  onClose,
  onStartStep,
  currentView
}) => {
  const [dontShowAgain, setDontShowAgain] = React.useState<boolean>(true);

  if (!isOpen) return null;

  const targetView: StudioInternalView = currentView === 'projects' ? 'requirements' : currentView;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-onboarding-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '760px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.18)',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#EFF6FF',
                color: '#0066FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Layers size={18} />
            </div>
            <div>
              <h2 id="studio-onboarding-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>
                Fiorify Generation Studio — 4-Stage Workflow
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748B' }}>
                From SAP DDIC &amp; Business Requirements to a runnable Clean Core Fiori + ABAP RAP application.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close workflow overview"
            onClick={() => onClose(dontShowAgain)}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: '20px 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '14px'
          }}
        >
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#0066FF',
                      backgroundColor: '#EFF6FF',
                      padding: '2px 7px',
                      borderRadius: '4px'
                    }}
                  >
                    STAGE {stage.step}
                  </span>
                  <Icon size={15} color="#334155" />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                    {stage.title}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.5, color: '#475569' }}>
                  {stage.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#475569', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            Don&apos;t show automatically next time (always available via &ldquo;? Workflow Guide&rdquo;)
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => onClose(dontShowAgain)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => onStartStep(targetView, dontShowAgain)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#0066FF',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Start Current Step</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
