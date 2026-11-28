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
    title: 'Scope & Model',
    subtitle: 'Requirements & CDS Entities',
    views: ['requirements', 'data-model'],
    defaultView: 'requirements',
    subItems: [
      { id: 'requirements', label: 'Requirements', icon: FileText },
      { id: 'data-model', label: 'CDS Data Model', icon: Database }
    ]
  },
  {
    id: 2,
    title: 'Architecture & Review',
    subtitle: 'RAP Pattern & 13-Gate Check',
    views: ['architecture', 'spec-lifecycle'],
    defaultView: 'architecture',
    subItems: [
      { id: 'architecture', label: 'RAP Architecture', icon: Cpu },
      { id: 'spec-lifecycle', label: 'Readiness & Governance', icon: ShieldCheck }
    ]
  },
  {
    id: 3,
    title: 'Build & Preview',
    subtitle: 'ABAP, Fiori & Live Sandbox',
    views: ['abap-generator', 'ui-generator', 'preview-validation'],
    defaultView: 'abap-generator',
    subItems: [
      { id: 'abap-generator', label: 'ABAP Cloud Code', icon: Code2 },
      { id: 'ui-generator', label: 'Fiori Elements UI', icon: LayoutTemplate },
      { id: 'preview-validation', label: 'Live Fiori Sandbox', icon: CheckCircle2 }
    ]
  },
  {
    id: 4,
    title: 'Package & Deploy',
    subtitle: 'ZIP Export & SAP DEV Staging',
    views: ['review-export', 'deployment'],
    defaultView: 'review-export',
    subItems: [
      { id: 'review-export', label: 'Review & ZIP Export', icon: PackageCheck },
      { id: 'deployment', label: 'SAP DEV Deployment (Coming Soon)', icon: Send }
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

    const reqItems = project.requirementsSpec?.items || [];
    const hasPendingReqs = reqItems.some((r) => r.status === 'DRAFT');
    const hasConfirmedReqs = reqItems.some((r) => r.status === 'CONFIRMED');
    const hasEntities = (project.dataModelSpec?.entities?.length || 0) > 0;

    switch (stageId) {
      case 1:
        return (hasEntities && hasConfirmedReqs && !hasPendingReqs) || hasArtifacts;
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

  // Dashboard already has its own clean header & action bar
  if (isDashboard) {
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
                <span className="studio-step-sub">{stage.subtitle}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TIER 2: FOCUSED SUB-VIEW PILL SWITCHER                                     */}
      {/* ========================================================================= */}
      {!isEnvironment && (
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
