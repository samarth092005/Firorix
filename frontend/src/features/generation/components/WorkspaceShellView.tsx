import React from 'react';
import {
  FileText,
  Database,
  Cpu,
  Code2,
  LayoutTemplate,
  CheckCircle2,
  PackageCheck,
  Send,
  Wrench,
  AlertCircle,
  HardDrive,
  Info,
  Layers,
  ArrowRight,
  LucideIcon
} from 'lucide-react';
import { GenerationProject, StudioInternalView } from '../types';
import { RequirementsDesigner } from './RequirementsDesigner';
import { DataModelDesigner } from './DataModelDesigner';
import { ArchitectureDesigner } from './ArchitectureDesigner';
import { AbapGenerator } from './AbapGenerator';
import { FioriUiGenerator } from './FioriUiGenerator';
import { PreviewValidationView } from './PreviewValidationView';
import { ReviewExportView } from './ReviewExportView';
import { ToolchainView } from './ToolchainView';
import { SpecificationLifecycleView } from './SpecificationLifecycleView';
import { DeploymentWorkspaceView } from './DeploymentWorkspaceView';
import { LaunchpadView } from './LaunchpadView';
import { BuildWorkspaceView } from './BuildWorkspaceView';
import { ArchitectureAndGatesView } from './ArchitectureAndGatesView';

interface WorkspaceShellViewProps {
  viewId: StudioInternalView;
  project: GenerationProject | null;
  onNavigateView: (view: StudioInternalView) => void;
  onProjectUpdated?: (updatedProject: GenerationProject) => void;
  onOpenGuide?: () => void;
}

interface ViewMetadata {
  title: string;
  icon: LucideIcon;
  phaseName: string;
  phaseNumber: number;
  purpose: string;
  prerequisites: string[];
  emptyStateTitle: string;
  emptyStateDescription: string;
}

const VIEW_METADATA: Record<Exclude<StudioInternalView, 'projects'>, ViewMetadata> = {
  launchpad: {
    title: 'Modernization Launchpad',
    icon: Layers,
    phaseName: 'Overview: 4-Stage Modernization Hub',
    phaseNumber: 1,
    purpose: 'Review target T-Code context, 4-stage pipeline progress, and start modernization.',
    prerequisites: ['Active Project Workspace'],
    emptyStateTitle: 'Modernization Launchpad',
    emptyStateDescription: 'Overview of your modernization pipeline.'
  },
  requirements: {
    title: 'Requirements Designer',
    icon: FileText,
    phaseName: 'Phase 2: Requirements Specification & Scope Definition',
    phaseNumber: 2,
    purpose: 'Structure, prioritize, and categorize functional capabilities, user stories, acceptance criteria, and Clean Core compliance rules.',
    prerequisites: ['Active Project Workspace in DRAFT state'],
    emptyStateTitle: 'Requirements Workspace Active',
    emptyStateDescription: 'Configure business and technical requirements.'
  },
  'data-model': {
    title: 'Data Model Designer',
    icon: Database,
    phaseName: 'Phase 3: CDS Data Model Specification',
    phaseNumber: 3,
    purpose: 'Define root and composition business object entity structures, field types, semantic annotations, and C1 released associations.',
    prerequisites: ['Phase 2: Confirmed business requirements'],
    emptyStateTitle: 'CDS Data Model Designer Active',
    emptyStateDescription: 'Model RAP entities, ABAP types, and relationships.'
  },
  architecture: {
    title: 'Architecture Designer',
    icon: Cpu,
    phaseName: 'RAP Architecture & Capabilities Specification',
    phaseNumber: 4,
    purpose: 'Formulate the technical RAP scenario profile (Managed with Draft), standard operations, custom actions, and Clean Core Tier 2 settings.',
    prerequisites: ['CDS data model defined'],
    emptyStateTitle: 'RAP Architecture Workspace',
    emptyStateDescription: 'Configure RAP Managed behavior definition, draft table configuration, and action definitions.'
  },
  'spec-lifecycle': {
    title: 'Specification Lifecycle & Governance',
    icon: CheckCircle2,
    phaseName: 'Specification Readiness & Governance',
    phaseNumber: 5,
    purpose: 'Verify 13 deterministic readiness gates, snapshot immutable versions, and govern Lead/Chief Architect approval.',
    prerequisites: ['Requirements, Data Model and Architecture definitions confirmed'],
    emptyStateTitle: 'Specification Lifecycle Active',
    emptyStateDescription: '13-Gate Readiness, Immutable Version History & Architect Approvals.'
  },
  'abap-generator': {
    title: 'ABAP Generator',
    icon: Code2,
    phaseName: 'Automated ABAP Cloud Artifact Generation',
    phaseNumber: 6,
    purpose: 'Synthesize clean ABAP Cloud artifacts: CDS View Entities, Behavior Definitions (BDEF), Service Definitions (SRVD), and Service Bindings (SRVB).',
    prerequisites: ['Architecture specification confirmed'],
    emptyStateTitle: 'ABAP Cloud Generator Engine Active',
    emptyStateDescription: 'Deterministic template-based generation of ABAP Cloud source code and syntax verification.'
  },
  'ui-generator': {
    title: 'Fiori UI Generator',
    icon: LayoutTemplate,
    phaseName: 'SAP Fiori Elements Generation',
    phaseNumber: 7,
    purpose: 'Generate List Report / Object Page floorplan manifests, UI annotations, local mock data sets, and ui5.yaml configuration.',
    prerequisites: ['Architecture profile and service definitions confirmed'],
    emptyStateTitle: 'Fiori Elements Generator Active',
    emptyStateDescription: 'Automated synthesis of UI5 application manifests and realistic mock data sets.'
  },
  'preview-validation': {
    title: 'Preview & Validation',
    icon: CheckCircle2,
    phaseName: 'Interactive Preview & Syntax Validation',
    phaseNumber: 8,
    purpose: 'Run the standalone preview server, inspect rendered Fiori UI, test draft handling, and run validation lint suites.',
    prerequisites: ['ABAP artifacts and UI5 application synthesized'],
    emptyStateTitle: 'Preview & Validation Suite Active',
    emptyStateDescription: 'Interactive mock server hosting and AST-level syntax validation.'
  },
  'review-export': {
    title: 'Review & Export',
    icon: PackageCheck,
    phaseName: 'Audit Review & Transport Packaging',
    phaseNumber: 9,
    purpose: 'Inspect cryptographic provenance, download the complete ZIP project bundle, and review Clean Core compliance certificate.',
    prerequisites: ['Validation passed with zero errors'],
    emptyStateTitle: 'Review & Export Manager Ready',
    emptyStateDescription: 'Final ZIP bundle packaging, checksum verification, and Clean Core sign-off certificate export.'
  },
  deployment: {
    title: 'SAP DEV Deployment',
    icon: Send,
    phaseName: 'SAP S/4HANA Deployment & Verification',
    phaseNumber: 10,
    purpose: 'Execute preflight checks, generate dependency-ordered deployment plans, sign off approvals, and verify active SAP repository objects.',
    prerequisites: ['Export package verified'],
    emptyStateTitle: 'Deployment Orchestration Ready',
    emptyStateDescription: 'Target landscape S21 / Client 200 ready for deployment plan staging.'
  },
  environment: {
    title: 'Environment & Toolchain',
    icon: Wrench,
    phaseName: 'System & Toolchain Diagnostics',
    phaseNumber: 0,
    purpose: 'View backend health, persistence storage statistics, local mock server status, and connected SAP system configuration.',
    prerequisites: ['Admin or SAP Consultant role'],
    emptyStateTitle: 'Toolchain Configuration Operational',
    emptyStateDescription: 'Inspect live backend health, database migrations, and SAP landscape connectivity.'
  }
};

export const WorkspaceShellView: React.FC<WorkspaceShellViewProps> = ({
  viewId,
  project,
  onNavigateView,
  onProjectUpdated,
  onOpenGuide
}) => {
  if (viewId === 'launchpad' && project) {
    return (
      <div className="workspace-canvas">
        <LaunchpadView
          project={project}
          onStartStep={onNavigateView}
          onOpenGuide={onOpenGuide || (() => {})}
        />
      </div>
    );
  }

  // If viewing requirements and project is active, render RequirementsDesigner
  if (viewId === 'requirements' && project) {
    return (
      <div className="workspace-canvas">
        <RequirementsDesigner
          project={project}
          onProjectUpdated={onProjectUpdated || (() => {})}
          onNavigateView={onNavigateView}
        />
      </div>
    );
  }

  // If viewing data-model and project is active, render DataModelDesigner
  if (viewId === 'data-model' && project) {
    return (
      <div className="workspace-canvas">
        <DataModelDesigner
          project={project}
          onProjectUpdated={onProjectUpdated || (() => {})}
          onNavigateView={onNavigateView}
        />
      </div>
    );
  }

  // Stage 3 Architecture & 13-Gate Readiness (2 Zoom-Out / Zoom-In Cards)
  if ((viewId === 'architecture' || viewId === 'spec-lifecycle') && project) {
    return (
      <div className="workspace-canvas">
        <ArchitectureAndGatesView
          project={project}
          onProjectUpdated={onProjectUpdated || (() => {})}
          onNavigateView={onNavigateView}
          initialCard={viewId === 'spec-lifecycle' ? 'gates' : null}
        />
      </div>
    );
  }

  // Stage 4 Build: Interactive 2-Box ABAP RAP Core + Fiori UI5 App
  if ((viewId === 'abap-generator' || viewId === 'ui-generator') && project) {
    return (
      <div className="workspace-canvas">
        <BuildWorkspaceView
          project={project}
          onProjectUpdated={onProjectUpdated || (() => {})}
          onNavigateView={onNavigateView}
          initialBox={viewId === 'ui-generator' ? 'fiori' : 'abap'}
        />
      </div>
    );
  }

  // If viewing preview-validation and project is active, render PreviewValidationView (GEN-07)
  if (viewId === 'preview-validation' && project) {
    return (
      <div className="workspace-canvas">
        <PreviewValidationView
          project={project}
          onProjectUpdated={onProjectUpdated}
          onNavigateView={onNavigateView}
        />
      </div>
    );
  }

  // If viewing review-export and project is active, render ReviewExportView (GEN-08)
  if (viewId === 'review-export' && project) {
    return (
      <div className="workspace-canvas">
        <ReviewExportView
          project={project}
          onProjectUpdated={onProjectUpdated}
        />
      </div>
    );
  }

  // If viewing deployment and project is active, render DeploymentWorkspaceView (Sprint 11)
  if (viewId === 'deployment' && project) {
    return (
      <div className="workspace-canvas">
        <DeploymentWorkspaceView
          project={project}
          onNavigateView={onNavigateView}
        />
      </div>
    );
  }

  // If viewing environment / toolchain, render ToolchainView (GEN-09)
  if (viewId === 'environment') {
    return (
      <div className="workspace-canvas">
        <ToolchainView project={project} />
      </div>
    );
  }

  if (viewId === 'projects') {
    return null;
  }

  const meta = VIEW_METADATA[viewId] || {
    title: 'Workspace View',
    icon: Info,
    phaseName: 'Phase Overview',
    phaseNumber: 0,
    purpose: 'Workspace functionality overview.',
    prerequisites: [],
    emptyStateTitle: 'View Scheduled',
    emptyStateDescription: 'This module is scheduled for upcoming milestones.'
  };

  const Icon = meta.icon;

  return (
    <div className="workspace-canvas">
      {/* Structured Workspace Overview Card */}
      <div className="canvas-header-card">
        <div className="canvas-title-group">
          <div className="canvas-icon-wrap">
            <Icon size={22} />
          </div>
          <div>
            <h2 className="canvas-title">
              {meta.title}
            </h2>
            <div className="canvas-desc">
              {project ? `Project: ${project.projectName} (${project.projectId})` : 'No Active Project Selected'}
            </div>
          </div>
        </div>

        <span className="studio-chip primary">
          Milestone: {meta.phaseName.split(':')[0]}
        </span>
      </div>

      {/* View Purpose & Context */}
      <div className="canvas-surface-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: 'var(--studio-text-main)' }}>
            Workspace Purpose
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--studio-text-muted)', lineHeight: 1.6 }}>
            {meta.purpose}
          </p>
        </div>

        <div>
          <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: 'var(--studio-text-main)' }}>
            Milestone Dependencies
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: 'var(--studio-text-muted)', lineHeight: 1.6 }}>
            {meta.prerequisites.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        </div>

        {/* Meaningful Empty State Card */}
        <div
          style={{
            padding: '36px 24px',
            backgroundColor: 'var(--studio-surface-subtle)',
            border: '1px dashed var(--studio-border-hover)',
            borderRadius: 'var(--studio-radius-md)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--studio-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--studio-text-muted)',
              boxShadow: 'var(--studio-shadow-sm)'
            }}
          >
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--studio-text-main)' }}>
              {meta.emptyStateTitle}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--studio-text-muted)', maxWidth: '520px', margin: '4px auto 0 auto' }}>
              {meta.emptyStateDescription}
            </div>
          </div>

          {project ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginTop: '8px',
                padding: '8px 14px',
                backgroundColor: 'var(--studio-surface)',
                border: '1px solid var(--studio-border)',
                borderRadius: 'var(--studio-radius-sm)',
                fontSize: '12px',
                color: 'var(--studio-text-muted)'
              }}
            >
              <Layers size={14} color="var(--studio-primary)" />
              Active Project Context: <strong style={{ color: 'var(--studio-text-main)' }}>{project.projectName}</strong>
              <span style={{ color: 'var(--studio-text-subtle)' }}>•</span>
              Lifecycle: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{project.lifecycleStatus}</span>
            </div>
          ) : (
            <div style={{ marginTop: '8px' }}>
              <button
                className="btn-open-workspace"
                onClick={() => onNavigateView('projects')}
              >
                Return to Projects Dashboard <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
