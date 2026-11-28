import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Cpu,
  FileText,
  Layers,
  PackageCheck,
  PlayCircle
} from 'lucide-react';
import { GenerationProject, StudioInternalView } from '../types';

interface LaunchpadViewProps {
  project: GenerationProject;
  onStartStep: (view: StudioInternalView) => void;
  onOpenGuide: () => void;
}

export const LaunchpadView: React.FC<LaunchpadViewProps> = ({
  project,
  onStartStep,
  onOpenGuide
}) => {
  const reqItems = project.requirementsSpec?.items || [];
  const reqDone = reqItems.length > 0 && reqItems.every((r) => r.status === 'CONFIRMED' || r.status === 'DEFERRED');
  const modelDone = (project.dataModelSpec?.entities?.length || 0) > 0;
  const stage1Done = reqDone && modelDone;

  const lifecycle = project.lifecycleStatus || '';
  const stage2Done =
    Boolean(project.approvedBy) ||
    lifecycle === 'READY_FOR_GENERATION' ||
    lifecycle === 'GENERATED' ||
    lifecycle === 'VALIDATION_COMPLETED' ||
    lifecycle === 'EXPORTED';

  const rawRegistry = project.artifactRegistry?.artifacts;
  const hasArtifacts = Array.isArray(rawRegistry)
    ? rawRegistry.length > 0
    : Boolean(rawRegistry && Object.keys(rawRegistry).length > 0);
  const stage3Done = hasArtifacts || lifecycle === 'GENERATED' || lifecycle === 'VALIDATION_COMPLETED' || lifecycle === 'EXPORTED';
  const stage4Done = lifecycle === 'EXPORTED';

  const nextView: StudioInternalView = !stage1Done
    ? 'requirements'
    : !stage2Done
      ? 'spec-lifecycle'
      : !stage3Done
        ? 'abap-generator'
        : 'review-export';

  const steps = [
    {
      num: '01',
      title: 'Scope & Model',
      desc: 'Business + UI requirements & CDS entity relations',
      icon: FileText,
      done: stage1Done
    },
    {
      num: '02',
      title: 'Architecture & 13-Gate Review',
      desc: 'SAP naming conventions & readiness gates',
      icon: Cpu,
      done: stage2Done
    },
    {
      num: '03',
      title: 'Build & Live Sandbox',
      desc: 'Generate ABAP/Fiori & refine with Diff Copilot',
      icon: PlayCircle,
      done: stage3Done
    },
    {
      num: '04',
      title: 'Export Customer ZIP',
      desc: 'Download standalone app (<5s local run)',
      icon: PackageCheck,
      done: stage4Done
    }
  ];

  const tCode = project.sourceTransactionCode || 'CUSTOM';
  const targetLabel = `${project.sourceSystemId || 'S21'}${project.sourceClient ? `-${project.sourceClient}` : '-200'}`;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '28px 16px 40px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '880px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden'
        }}
      >
        {/* Top Hero Section */}
        <div
          style={{
            padding: '26px 28px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#0066FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Layers size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '5px',
                    backgroundColor: '#0066FF',
                    color: '#FFFFFF'
                  }}
                >
                  {tCode}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '5px',
                    backgroundColor: '#E2E8F0',
                    color: '#334155'
                  }}
                >
                  Target: {targetLabel} · {project.targetRelease || 'S/4HANA 2023'}
                </span>
              </div>
              <h2 style={{ margin: '8px 0 4px', fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>
                {project.projectName}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#475569', maxWidth: '580px', lineHeight: 1.5 }}>
                {project.description || `Clean Core SAP Fiori & ABAP Cloud modernization workspace for ${tCode}.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenGuide}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '9px 15px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#1E293B',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <BookOpen size={15} color="#0066FF" />
            <span>4-Step Guide</span>
          </button>
        </div>

        {/* 4-Step Visual Roadmap (Display-Only Status) */}
        <div style={{ padding: '24px 28px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
            Modernization Pipeline (4 Steps)
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))',
              gap: '12px'
            }}
          >
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: step.done ? '1px solid #BBF7D0' : '1px solid #E2E8F0',
                    backgroundColor: step.done ? '#F0FDF4' : '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: step.done ? '#15803D' : '#0066FF' }}>
                      STEP {step.num}
                    </span>
                    {step.done ? (
                      <CheckCircle2 size={16} color="#16A34A" />
                    ) : (
                      <Circle size={15} color="#CBD5E1" />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon size={15} color={step.done ? '#166534' : '#334155'} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {step.title}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Bar */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <span style={{ fontSize: '12.5px', color: '#64748B' }}>
            {stage1Done
              ? 'Scope & Model ready — continue from your current step.'
              : 'Start by reviewing extracted business & UI requirements.'}
          </span>

          <button
            type="button"
            onClick={() => onStartStep(nextView)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(180deg, #1A75FF 0%, #005CE6 100%)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 102, 255, 0.25)'
            }}
          >
            <span>{stage1Done ? 'Continue Modernization' : 'Start App Modernization'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
