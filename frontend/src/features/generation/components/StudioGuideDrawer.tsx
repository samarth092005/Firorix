import React from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  ArrowRight,
  Compass,
  BookOpen
} from 'lucide-react';
import { GenerationProject, StudioInternalView } from '../types';

interface StudioGuideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: StudioInternalView;
  project: GenerationProject | null;
  onNavigateView: (view: StudioInternalView) => void;
  onOpenOverviewModal: () => void;
}

interface ViewGuidance {
  stageLabel: string;
  title: string;
  goal: string;
  steps: string[];
  nextView?: StudioInternalView;
  nextLabel?: string;
}

const VIEW_GUIDANCE: Record<StudioInternalView, ViewGuidance> = {
  launchpad: {
    stageLabel: 'Overview',
    title: 'Modernization Launchpad',
    goal: 'Review your target T-Code context and 4-stage modernization progress before starting.',
    steps: [
      'Click "Start App Modernization" (or "Continue") to jump into your active step.',
      'Open "4-Step Guide" anytime to review the end-to-end pipeline.'
    ],
    nextView: 'requirements',
    nextLabel: 'Go to Requirements'
  },
  projects: {
    stageLabel: 'Workspace',
    title: 'Modernization Projects',
    goal: 'Select an existing modernization project or create a new one from an assessed SAP transaction.',
    steps: [
      'Open an existing project card to resume where you left off.',
      'Use "Show Test Fixtures" only when inspecting automated QA builds.'
    ]
  },
  requirements: {
    stageLabel: 'Stage 1 · Step 1',
    title: 'Requirements & Floorplan',
    goal: 'Confirm business requirements and choose the Fiori UI floorplan that fits your users.',
    steps: [
      'Review auto-extracted requirements and mark items as Confirmed or Deferred.',
      'Select the Fiori Floorplan (List Report, Worklist, ALP, Overview Cockpit, or Guided Wizard).',
      'Click "Next: CDS Data Model" once requirements are confirmed.'
    ],
    nextView: 'data-model',
    nextLabel: 'Next: CDS Data Model'
  },
  'data-model': {
    stageLabel: 'Stage 1 · Step 2',
    title: 'CDS Data Model Designer',
    goal: 'Verify the root/child CDS entities, primary keys, and field labels that drive OData V4 & UI5.',
    steps: [
      'Ensure at least one ROOT entity exists with a key field.',
      'Add or rename business fields if needed, then validate the model.'
    ],
    nextView: 'architecture',
    nextLabel: 'Next: RAP Architecture'
  },
  architecture: {
    stageLabel: 'Stage 2 · Step 1',
    title: 'RAP Architecture Designer',
    goal: 'Evaluate the Clean Core ABAP RAP pattern (Managed / Unmanaged, Draft handling, OData V4).',
    steps: [
      'Run or review the architecture evaluation.',
      'Proceed to Readiness & Governance for the 13-Gate approval check.'
    ],
    nextView: 'spec-lifecycle',
    nextLabel: 'Next: Readiness & Governance'
  },
  'spec-lifecycle': {
    stageLabel: 'Stage 2 · Step 2',
    title: 'Readiness & Governance',
    goal: 'Run the 13-Gate Clean Core readiness check and approve the specification for code generation.',
    steps: [
      'Verify all blocking governance gates are green.',
      'Click "Approve for Code Generation" to unlock ABAP & Fiori build.'
    ],
    nextView: 'abap-generator',
    nextLabel: 'Proceed to ABAP & Fiori Build'
  },
  'abap-generator': {
    stageLabel: 'Stage 3 · Step 1',
    title: 'ABAP Cloud Code Generator',
    goal: 'Generate Clean Core ABAP RAP CDS views, Behavior Definitions, and Service Bindings.',
    steps: [
      'Click Generate ABAP Artifacts and inspect the generated CDS/BDEF files.',
      'Proceed to Fiori Elements UI generation.'
    ],
    nextView: 'ui-generator',
    nextLabel: 'Next: Fiori Elements UI'
  },
  'ui-generator': {
    stageLabel: 'Stage 3 · Step 2',
    title: 'Fiori Elements / UI5 Generator',
    goal: 'Generate the Fiori manifest, annotations, and local mockserver matching your selected floorplan.',
    steps: [
      'Click Generate Fiori UI to synthesize webapp files and local mockserver.js.',
      'Launch Live Fiori Sandbox to test the running application.'
    ],
    nextView: 'preview-validation',
    nextLabel: 'Next: Live Fiori Sandbox'
  },
  'preview-validation': {
    stageLabel: 'Stage 3 · Step 3',
    title: 'Live Fiori Sandbox & Copilot',
    goal: 'Test the live OData V4 application in the browser and refine it with the Copilot.',
    steps: [
      'Interact with the rendered Fiori app in the sandbox.',
      'Use "Request Changes & Review Diff" to modify columns, badges, actions, or floorplan.',
      'Proceed to Review & ZIP Export when ready.'
    ],
    nextView: 'review-export',
    nextLabel: 'Next: Review & ZIP Export'
  },
  'review-export': {
    stageLabel: 'Stage 4 · Step 1',
    title: 'Review & ZIP Export',
    goal: 'Download the standalone customer ZIP package (ready for local `npm install && npm start`).',
    steps: [
      'Review governance readiness and export the customer ZIP bundle.',
      'Optionally proceed to SAP DEV Deployment.'
    ],
    nextView: 'deployment',
    nextLabel: 'Next: SAP DEV Deployment'
  },
  deployment: {
    stageLabel: 'Stage 4 · Step 2',
    title: 'SAP DEV Deployment',
    goal: 'Prepare transport/deployment artifacts for your target SAP landscape (read-only safe by default).',
    steps: [
      'Verify target destination and preflight checks.',
      'Export offline bundle or review deployment readiness.'
    ]
  },
  environment: {
    stageLabel: 'Toolchain',
    title: 'Environment & Toolchain',
    goal: 'Inspect connected SAP destinations, MCP status, and local runtime configuration.',
    steps: [
      'Verify S21 connectivity and local Node/UI5 runtime prerequisites.'
    ]
  }
};

export const StudioGuideDrawer: React.FC<StudioGuideDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  project,
  onNavigateView,
  onOpenOverviewModal
}) => {
  if (!isOpen) return null;

  const guidance = VIEW_GUIDANCE[activeView] || VIEW_GUIDANCE.requirements;
  const reqItems = project?.requirementsSpec?.items || [];
  const reqConfirmed = reqItems.length > 0 && reqItems.every((r) => r.status === 'CONFIRMED' || r.status === 'DEFERRED');
  const modelReady = (project?.dataModelSpec?.entities?.length || 0) > 0;
  const govApproved = Boolean(project?.approvedBy) || project?.lifecycleStatus === 'READY_FOR_GENERATION' || project?.lifecycleStatus === 'GENERATED' || project?.lifecycleStatus === 'EXPORTED';
  const codeGenerated = project?.lifecycleStatus === 'GENERATED' || project?.lifecycleStatus === 'VALIDATION_COMPLETED' || project?.lifecycleStatus === 'EXPORTED';

  const checklist = [
    { label: 'Requirements Confirmed', done: reqConfirmed, view: 'requirements' as StudioInternalView },
    { label: 'CDS Data Model Defined', done: modelReady, view: 'data-model' as StudioInternalView },
    { label: 'Governance Approved', done: govApproved, view: 'spec-lifecycle' as StudioInternalView },
    { label: 'ABAP & Fiori Code Generated', done: codeGenerated, view: 'ui-generator' as StudioInternalView }
  ];

  return (
    <aside
      aria-label="Workflow Guide"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '380px',
        maxWidth: '92vw',
        zIndex: 1150,
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #E2E8F0',
        boxShadow: '-12px 0 32px rgba(15, 23, 42, 0.12)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#F8FAFC'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={18} color="#0066FF" />
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#0066FF', textTransform: 'uppercase' }}>
              {guidance.stageLabel}
            </div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
              {guidance.title}
            </h3>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close Workflow Guide"
          onClick={onClose}
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '6px' }}>
            Step Goal
          </div>
          <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.55, color: '#334155' }}>
            {guidance.goal}
          </p>
        </div>

        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
            What To Do Here
          </div>
          <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#1E293B', lineHeight: 1.45 }}>
            {guidance.steps.map((s, idx) => (
              <li key={idx}>{s}</li>
            ))}
          </ol>
        </div>

        {project && (
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px' }}>
              Project Readiness Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {checklist.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    onNavigateView(item.view);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: item.done ? '#F0FDF4' : '#F8FAFC',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: item.done ? '#166534' : '#334155' }}>
                    {item.done ? <CheckCircle2 size={15} color="#16A34A" /> : <Circle size={15} color="#94A3B8" />}
                    {item.label}
                  </span>
                  <ArrowRight size={13} color="#64748B" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '14px 20px',
          borderTop: '1px solid #E2E8F0',
          backgroundColor: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        {guidance.nextView && guidance.nextLabel && project && (
          <button
            type="button"
            onClick={() => {
              onNavigateView(guidance.nextView!);
              onClose();
            }}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 14px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#0066FF',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <span>{guidance.nextLabel}</span>
            <ArrowRight size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenOverviewModal();
          }}
          style={{
            width: '100%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            color: '#334155',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <BookOpen size={14} />
          <span>View 4-Stage Pipeline Overview</span>
        </button>
      </div>
    </aside>
  );
};
