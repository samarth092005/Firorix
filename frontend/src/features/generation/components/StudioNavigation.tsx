import React from 'react';
import {
  FolderKanban,
  FileText,
  Database,
  Cpu,
  ShieldCheck,
  Code2,
  LayoutTemplate,
  CheckCircle2,
  PackageCheck,
  Send,
  Wrench,
  Check,
  LucideIcon
} from 'lucide-react';
import { GenerationProject, StudioInternalView } from '../types';

interface StudioNavigationProps {
  activeView: StudioInternalView;
  onSelectView: (view: StudioInternalView) => void;
  hasActiveProject: boolean;
  project?: GenerationProject | null;
}

interface SubItem {
  id: StudioInternalView;
  label: string;
  icon: LucideIcon;
}

interface StageDefinition {
  id: number;
  title: string;
  subtitle: string;
  views: StudioInternalView[];
  defaultView: StudioInternalView;
  subItems: SubItem[];
}

const STAGES: StageDefinition[] = [
  {
    id: 1,
    title: 'Stage 1: Scope & Data Model',
    subtitle: 'Requirements & CDS Entities',
    views: ['requirements', 'data-model'],
    defaultView: 'requirements',
    subItems: [
      { id: 'requirements', label: 'Requirements Backlog', icon: FileText },
      { id: 'data-model', label: 'CDS Data Model', icon: Database }
    ]
  },
  {
    id: 2,
    title: 'Stage 2: Architecture & Governance',
    subtitle: 'RAP Pattern & 13-Gate Review',
    views: ['architecture', 'spec-lifecycle'],
    defaultView: 'architecture',
    subItems: [
      { id: 'architecture', label: 'RAP Architecture', icon: Cpu },
      { id: 'spec-lifecycle', label: 'Readiness & Governance', icon: ShieldCheck }
    ]
  },
  {
    id: 3,
    title: 'Stage 3: Synthesis & Live Preview',
    subtitle: 'ABAP, Fiori & Local Sandbox',
    views: ['abap-generator', 'ui-generator', 'preview-validation'],
    defaultView: 'preview-validation',
    subItems: [
      { id: 'abap-generator', label: 'ABAP Cloud Artifacts', icon: Code2 },
      { id: 'ui-generator', label: 'Fiori Elements Manifest', icon: LayoutTemplate },
      { id: 'preview-validation', label: 'Live Fiori Sandbox', icon: CheckCircle2 }
    ]
  },
  {
    id: 4,
    title: 'Stage 4: Package & Deploy',
    subtitle: 'ZIP Export & SAP DEV Staging',
    views: ['review-export', 'deployment'],
    defaultView: 'review-export',
    subItems: [
      { id: 'review-export', label: 'Review & ZIP Export', icon: PackageCheck },
      { id: 'deployment', label: 'SAP DEV Deployment', icon: Send }
    ]
  }
];

export const StudioNavigation: React.FC<StudioNavigationProps> = ({
  activeView,
  onSelectView,
  hasActiveProject,
  project
}) => {
  const isDashboard = activeView === 'projects';
  const isEnvironment = activeView === 'environment';

  // Find stage containing the active view, defaulting to Stage 1 if unknown or in environment
  const currentStage = STAGES.find((s) => s.views.includes(activeView)) || STAGES[0];

  // Helper to determine stage completion from canonical project status
  const isStageCompleted = (stageId: number): boolean => {
    if (!project) return false;
    const rawRegistry = project.artifactRegistry?.artifacts;
    const artifacts: any[] = rawRegistry
      ? (Array.isArray(rawRegistry) ? rawRegistry : Object.values(rawRegistry))
      : [];
    const hasArtifacts = artifacts.length > 0;
    const lifecycle = project.lifecycleStatus || '';

    switch (stageId) {
      case 1:
        return (project.dataModelSpec?.entities?.length || 0) > 0 || hasArtifacts;
      case 2:
        return Boolean(project.approvedBy) || lifecycle === 'READY_FOR_GENERATION' || lifecycle === 'GENERATED' || lifecycle === 'VALIDATION_COMPLETED' || lifecycle === 'EXPORTED';
      case 3:
        return lifecycle === 'GENERATED' || lifecycle === 'VALIDATION_COMPLETED' || lifecycle === 'EXPORTED' || hasArtifacts;
      case 4:
        return lifecycle === 'EXPORTED' || Boolean(project.reviewRecord);
      default:
        return false;
    }
  };

  // If in Dashboard mode (no project active or projects view selected)
  if (isDashboard) {
    return (
      <div className="studio-stepper-container" aria-label="Projects Dashboard Navigation">
        <div className="studio-dashboard-nav-banner">
          <div className="studio-dashboard-nav-title">
            <FolderKanban size={18} color="var(--studio-primary, #0066FF)" />
            <span>Projects Dashboard</span>
            <span className="studio-dashboard-nav-sub">
              Select or open a project below to enter the 4-Stage Application Engineering Pipeline.
            </span>
          </div>
          <button
            type="button"
            className="studio-pill-utility"
            onClick={() => onSelectView('environment')}
            title="Inspect Environment and Toolchain Diagnostics"
          >
            <Wrench size={13} />
            <span>System Toolchain</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="studio-stepper-container" aria-label="Generation Studio 4-Stage Stepper Navigation">
      {/* ========================================================================= */}
      {/* TIER 1: 4-STAGE PIPELINE STEPPER                                          */}
      {/* ========================================================================= */}
      <div className="studio-stage-stepper" role="tablist" aria-label="4-Stage Engineering Pipeline">
        {STAGES.map((stage) => {
          const isActiveStage = currentStage.id === stage.id && !isEnvironment;
          const isCompleted = isStageCompleted(stage.id);

          return (
            <button
              key={stage.id}
              type="button"
              role="tab"
              aria-selected={isActiveStage}
              disabled={!hasActiveProject}
              onClick={() => {
                // If clicked, open the stage's default view
                if (!isActiveStage) {
                  onSelectView(stage.defaultView);
                }
              }}
              className={`studio-stage-step ${isActiveStage ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              title={stage.subtitle}
            >
              <div className="studio-step-indicator">
                {isCompleted ? <Check size={14} strokeWidth={2.5} /> : stage.id}
              </div>
              <div className="studio-step-text">
                <span className="studio-step-title">{stage.title}</span>
                <span className="studio-step-sub">{stage.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: FOCUSED SUB-VIEW PILL SWITCHER                                     */}
      {/* ========================================================================= */}
      <div className="studio-pill-bar">
        <div className="studio-pills-group" role="tablist" aria-label="Stage Workspace Views">
          <span className="studio-pills-label">Active Workspace:</span>
          {currentStage.subItems.map((sub) => {
            const SubIcon = sub.icon;
            const isSubActive = activeView === sub.id && !isEnvironment;

            return (
              <button
                key={sub.id}
                type="button"
                role="tab"
                aria-selected={isSubActive}
                onClick={() => onSelectView(sub.id)}
                className={`studio-pill-btn ${isSubActive ? 'active' : ''}`}
                title={`Open ${sub.label}`}
              >
                <SubIcon size={14} />
                <span>{sub.label}</span>
              </button>
            );
          })}
        </div>

        {/* Global Utility Toolchain Diagnostics Link */}
        <div className="studio-pill-right">
          <button
            type="button"
            className={`studio-pill-utility ${isEnvironment ? 'active' : ''}`}
            onClick={() => onSelectView('environment')}
            title="Inspect Environment and Toolchain Diagnostics"
          >
            <Wrench size={13} />
            <span>Toolchain Diagnostics</span>
          </button>
        </div>
      </div>
    </div>
  );
};
