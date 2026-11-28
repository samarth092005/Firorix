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
    title: 'Requirements',
    subtitle: 'Functional & UI Design',
    views: ['requirements'],
    defaultView: 'requirements',
    subItems: []
  },
  {
    id: 2,
    title: 'CDS Model',
    subtitle: 'Entities & Types',
    views: ['data-model'],
    defaultView: 'data-model',
    subItems: []
  },
  {
    id: 3,
    title: 'Architecture & Gates',
    subtitle: 'RAP & 13-Gate Check',
    views: ['architecture', 'spec-lifecycle'],
    defaultView: 'architecture',
    subItems: []
  },
  {
    id: 4,
    title: 'Build',
    subtitle: 'ABAP RAP & Fiori UI5',
    views: ['abap-generator', 'ui-generator'],
    defaultView: 'abap-generator',
    subItems: []
  },
  {
    id: 5,
    title: 'Live Preview',
    subtitle: 'Sandbox & Diff Copilot',
    views: ['preview-validation'],
    defaultView: 'preview-validation',
    subItems: []
  },
  {
    id: 6,
    title: 'Export & Connect',
    subtitle: 'ZIP & CF Runbook',
    views: ['review-export', 'deployment'],
    defaultView: 'review-export',
    subItems: []
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

    const reqItems = project.requirementsSpec?.items || [];
    const hasPendingReqs = reqItems.some((r) => r.status === 'DRAFT');
    const hasConfirmedReqs = reqItems.some((r) => r.status === 'CONFIRMED');
    const hasEntities = (project.dataModelSpec?.entities?.length || 0) > 0;

    switch (stageId) {
      case 1:
        return (hasConfirmedReqs && !hasPendingReqs) || hasArtifacts;
      case 2:
        return hasEntities || hasArtifacts;
      case 3:
        return Boolean(project.approvedBy) || lifecycle === 'READY_FOR_GENERATION' || lifecycle === 'GENERATED' || lifecycle === 'VALIDATION_COMPLETED' || lifecycle === 'EXPORTED';
      case 4:
        return lifecycle === 'GENERATED' || lifecycle === 'VALIDATION_COMPLETED' || lifecycle === 'EXPORTED' || hasArtifacts;
      case 5:
        return lifecycle === 'VALIDATION_COMPLETED' || lifecycle === 'EXPORTED';
      case 6:
        return lifecycle === 'EXPORTED' || Boolean(project.reviewRecord);
      default:
        return false;
    }
  };

  const isSubCompleted = (subId: StudioInternalView): boolean => {
    if (!project) return false;
    const rawRegistry = project.artifactRegistry?.artifacts;
    const artifacts: any[] = rawRegistry
      ? (Array.isArray(rawRegistry) ? rawRegistry : Object.values(rawRegistry))
      : [];
    const hasArtifacts = artifacts.length > 0;
    const reqItems = project.requirementsSpec?.items || [];
    switch (subId) {
      case 'requirements':
        return reqItems.length > 0 && reqItems.every((r) => r.status === 'CONFIRMED' || r.status === 'DEFERRED');
      case 'data-model':
        return (project.dataModelSpec?.entities?.length || 0) > 0;
      case 'architecture':
        return Boolean(project.architectureSpec);
      case 'spec-lifecycle':
        return isStageCompleted(2);
      case 'abap-generator':
      case 'ui-generator':
        return hasArtifacts;
      case 'preview-validation':
        return project.lifecycleStatus === 'VALIDATION_COMPLETED' || project.lifecycleStatus === 'EXPORTED';
      case 'review-export':
        return project.lifecycleStatus === 'EXPORTED';
      default:
        return false;
    }
  };

  // Dashboard & Launchpad already have their own clean canvas
  if (isDashboard || activeView === 'launchpad') {
    return null;
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
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: FOCUSED SUB-VIEW PILL SWITCHER                                     */}
      {/* ========================================================================= */}
      {!isEnvironment && currentStage.subItems.length > 0 && (
        <div className="studio-pill-bar">
          <div className="studio-pills-group" role="tablist" aria-label="Stage Workspace Views">
            {currentStage.subItems.map((sub) => {
              const SubIcon = sub.icon;
              const isSubActive = activeView === sub.id;
              const subDone = isSubCompleted(sub.id);
              const isDisabled = sub.id === 'deployment';

              return (
                <button
                  key={sub.id}
                  type="button"
                  role="tab"
                  aria-selected={isSubActive}
                  disabled={isDisabled}
                  onClick={() => {
                    if (!isDisabled) onSelectView(sub.id);
                  }}
                  className={`studio-pill-btn ${isSubActive ? 'active' : ''}`}
                  title={isDisabled ? 'SAP DEV Deployment is currently On Hold / Coming Soon' : `Open ${sub.label}`}
                  style={isDisabled ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                >
                  <SubIcon size={14} />
                  <span>{sub.label}</span>
                  {subDone && !isSubActive && !isDisabled && (
                    <Check size={12} strokeWidth={2.5} color="#16A34A" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
