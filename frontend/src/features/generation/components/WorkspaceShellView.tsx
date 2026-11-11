import React from 'react';
import {
  FileText,
  Database,
  Cpu,
  Code2,
  LayoutTemplate,
  CheckCircle2,
  PackageCheck,
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

interface WorkspaceShellViewProps {
  viewId: StudioInternalView;
  project: GenerationProject | null;
  onNavigateView: (view: StudioInternalView) => void;
  onProjectUpdated?: (updatedProject: GenerationProject) => void;
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
    phaseName: 'Phase 4: RAP Architecture & Capabilities Specification',
    phaseNumber: 4,
    purpose: 'Formulate the technical RAP scenario profile (Managed with Draft), standard operations, custom actions, and Clean Core Tier 2 settings.',
    prerequisites: ['Phase 3: Formulated CDS data model'],
    emptyStateTitle: 'RAP Architecture Workspace Scheduled for Phase 4',
    emptyStateDescription: 'RAP Managed behavior definition, draft table configuration, and action definitions will be configured in Phase 4.'
  },
  'abap-generator': {
    title: 'ABAP Generator',
    icon: Code2,
    phaseName: 'Phase 5: Automated ABAP Artifact Generation',
    phaseNumber: 5,
    purpose: 'Synthesize clean ABAP Cloud artifacts: CDS View Entities, Behavior Definitions (BDEF), Service Definitions (SRVD), and Service Bindings (SRVB).',
    prerequisites: ['Phase 4: Architecture specification confirmed'],
    emptyStateTitle: 'ABAP Cloud Generator Engine Scheduled for Phase 5',
    emptyStateDescription: 'Deterministic template-based generation of ABAP Cloud source code and syntax verification will execute in Phase 5.'
  },
  'ui-generator': {
    title: 'Fiori UI Generator',
    icon: LayoutTemplate,
    phaseName: 'Phase 6: SAP Fiori Elements Generation',
    phaseNumber: 6,
    purpose: 'Generate List Report / Object Page floorplan manifests, UI annotations, local mock data sets, and ui5.yaml configuration.',
    prerequisites: ['Phase 4: Architecture profile', 'Phase 5: Service definition'],
    emptyStateTitle: 'Fiori Elements Generator Scheduled for Phase 6',
    emptyStateDescription: 'Automated synthesis of UI5 application manifests and realistic mock data sets will be introduced in Phase 6.'
  },
  'preview-validation': {
    title: 'Preview & Validation',
    icon: CheckCircle2,
    phaseName: 'Phase 7: Local Mock Preview & Syntax Verification',
    phaseNumber: 7,
    purpose: 'Run the standalone local preview server, inspect rendered Fiori UI, test draft handling, and run validation lint suites.',
    prerequisites: ['Phase 5: ABAP artifacts', 'Phase 6: UI5 application'],
    emptyStateTitle: 'Preview & Validation Suite Scheduled for Phase 7',
    emptyStateDescription: 'Interactive mock server hosting and AST-level syntax validation will be activated in Phase 7.'
  },
  'review-export': {
    title: 'Review & Export',
    icon: PackageCheck,
    phaseName: 'Phase 8: Audit Review & Transport Packaging',
    phaseNumber: 8,
    purpose: 'Inspect cryptographic provenance, download the complete ZIP project bundle, and review Clean Core compliance certificate.',
    prerequisites: ['Phase 7: Validation passed with zero errors'],
    emptyStateTitle: 'Review & Export Manager Scheduled for Phase 8',
    emptyStateDescription: 'Final ZIP bundle packaging, checksum verification, and Clean Core sign-off certificate export will be available in Phase 8.'
  },
  environment: {
    title: 'Environment & Toolchain',
    icon: Wrench,
    phaseName: 'System & Toolchain Diagnostics',
    phaseNumber: 0,
    purpose: 'View backend health, persistence storage statistics, local mock server status, and connected SAP system configuration.',
    prerequisites: ['Admin or SAP Consultant role'],
    emptyStateTitle: 'Toolchain Configuration Operational',
    emptyStateDescription: 'Current execution environment: Windows, Node.js 20 Native HTTP Server, Port 4004.'
  }
};

export const WorkspaceShellView: React.FC<WorkspaceShellViewProps> = ({
  viewId,
  project,
  onNavigateView,
  onProjectUpdated
}) => {
  // If viewing requirements and project is active, render RequirementsDesigner
  if (viewId === 'requirements' && project) {
    return (
      <div style={{ padding: '24px' }}>
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
      <div style={{ padding: '24px' }}>
        <DataModelDesigner
          project={project}
          onProjectUpdated={onProjectUpdated || (() => {})}
          onNavigateView={onNavigateView}
        />
      </div>
    );
  }

  // If viewing architecture and project is active, render ArchitectureDesigner (GEN-05)
  if (viewId === 'architecture' && project) {
    return (
      <div style={{ padding: '24px' }}>
        <ArchitectureDesigner
          project={project}
          onProjectUpdated={onProjectUpdated || (() => {})}
          onNavigateView={onNavigateView}
        />
      </div>
    );
  }

  // If viewing abap-generator and project is active, render AbapGenerator (GEN-05)
  if (viewId === 'abap-generator' && project) {
    return (
      <div style={{ padding: '24px' }}>
        <AbapGenerator
          project={project}
          onProjectUpdated={onProjectUpdated || (() => {})}
          onNavigateView={onNavigateView}
        />
      </div>
    );
  }

  // If viewing ui-generator and project is active, render FioriUiGenerator (GEN-06)
  if (viewId === 'ui-generator' && project) {
    return (
      <div style={{ padding: '24px' }}>
        <FioriUiGenerator
          project={project}
          onProjectUpdated={onProjectUpdated || (() => {})}
          onNavigateView={onNavigateView}
        />
      </div>
    );
  }

  // If viewing preview-validation and project is active, render PreviewValidationView (GEN-07)
  if (viewId === 'preview-validation' && project) {
    return (
      <div style={{ padding: '24px' }}>
        <PreviewValidationView
          project={project}
          onProjectUpdated={onProjectUpdated}
        />
      </div>
    );
  }

  // If viewing review-export and project is active, render ReviewExportView (GEN-08)
  if (viewId === 'review-export' && project) {
    return (
      <div style={{ padding: '24px' }}>
        <ReviewExportView
          project={project}
          onProjectUpdated={onProjectUpdated}
        />
      </div>
    );
  }

  // If viewing environment / toolchain, render ToolchainView (GEN-09)
  if (viewId === 'environment') {
    return (
      <div style={{ padding: '24px' }}>
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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Permanent Local Mock Watermark */}
      <div
        style={{
          padding: '12px 18px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #CBD5E1',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <HardDrive size={18} color="#0284C7" />
          <div style={{ fontSize: '13px', color: '#1E293B', fontWeight: 600 }}>
            Local-First Review Workspace — Local Mock Data Only (No Remote SAP Deployment)
          </div>
        </div>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            backgroundColor: '#EDE9FE',
            color: '#6D28D9',
            borderRadius: '4px',
            fontWeight: 700
          }}
        >
          {meta.phaseName}
        </span>
      </div>

      {/* Structured Workspace Overview Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--fiori-border, #E2E8F0)',
          borderRadius: '8px',
          boxShadow: 'var(--fiori-shadow-card, 0 1px 3px rgba(0,0,0,0.06))',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0066FF'
              }}
            >
              <Icon size={20} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                {meta.title}
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {project ? `Project: ${project.projectName} (${project.projectId})` : 'No Active Project Selected'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '4px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                fontWeight: 700
              }}
            >
              Scheduled Milestone: {meta.phaseName.split(':')[0]}
            </span>
          </div>
        </div>

        {/* View Purpose & Context */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              Workspace Purpose
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              {meta.purpose}
            </p>
          </div>

          <div>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
              Milestone Dependencies
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
              {meta.prerequisites.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>

          {/* Meaningful Empty State Card */}
          <div
            style={{
              padding: '32px 24px',
              backgroundColor: '#F8FAFC',
              border: '1px dashed #CBD5E1',
              borderRadius: '8px',
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
                backgroundColor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B'
              }}
            >
              <AlertCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
                {meta.emptyStateTitle}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B', maxWidth: '520px', margin: '4px auto 0 auto' }}>
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
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#475569'
                }}
              >
                <Layers size={14} color="#0066FF" />
                Active Project Context: <strong style={{ color: '#0F172A' }}>{project.projectName}</strong>
                <span style={{ color: '#94A3B8' }}>•</span>
                Lifecycle: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{project.lifecycleStatus}</span>
              </div>
            ) : (
              <div style={{ marginTop: '8px' }}>
                <button
                  className="fiori-btn-secondary"
                  onClick={() => onNavigateView('projects')}
                  style={{ fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  Return to Projects Dashboard <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
