import React from 'react';
import { uiConfig } from '../../../config/uiConfig';
import {
  Layers,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  Wrench,
  HelpCircle
} from 'lucide-react';
import { GenerationProject } from '../types';

interface StudioHeaderProps {
  project: GenerationProject | null;
  onBackToDashboard: () => void;
  onRefresh: () => void;
  onOpenToolchain?: () => void;
  onOpenGuide?: () => void;
  isLoading?: boolean;
}

function formatLifecycleLabel(status?: string): string {
  switch (status) {
    case 'DRAFT': return 'Draft';
    case 'DATA_MODEL_VALIDATED': return 'Model Ready';
    case 'READY_FOR_ARCHITECTURE': return 'Ready for Architecture';
    case 'DESIGN_IN_PROGRESS': return 'Design In Progress';
    case 'READY_FOR_GENERATION': return 'Ready to Build';
    case 'GENERATED': return 'Code Generated';
    case 'VALIDATION_COMPLETED': return 'Validated';
    case 'EXPORTED': return 'Exported';
    case 'ARCHIVED': return 'Archived';
    default: return status || 'Draft';
  }
}

export const StudioHeader: React.FC<StudioHeaderProps> = ({
  project,
  onBackToDashboard,
  onRefresh,
  onOpenToolchain,
  onOpenGuide,
  isLoading
}) => {
  const isArchived = project?.lifecycleStatus === 'ARCHIVED';

  return (
    <header className="studio-header">
      <div className="studio-header-row">
        {/* Left: Navigation & Project Title */}
        <div className="studio-header-left">
          {project ? (
            <>
              <button
                type="button"
                className="studio-btn-back"
                onClick={onBackToDashboard}
                title="Back to Projects Dashboard"
              >
                <ArrowLeft size={14} /> Projects
              </button>
              <span className="studio-header-divider">/</span>
              <div className="studio-project-title-group">
                <Layers size={16} color="var(--studio-primary)" />
                <h1 className="studio-project-heading">{project.projectName}</h1>
                <span className={`studio-chip ${isArchived ? '' : 'success'}`}>
                  {formatLifecycleLabel(project.lifecycleStatus)}
                </span>
                {project.sourceTransactionCode && (
                  <span className="studio-chip primary">
                    {project.sourceTransactionCode}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="studio-project-title-group">
              <Layers size={18} color="var(--studio-primary)" />
              <h1 className="studio-project-heading">{uiConfig.brand.productName}</h1>
              <span className="studio-header-sub">
                Clean Core SAP Fiori & ABAP Cloud Application Studio
              </span>
            </div>
          )}
        </div>

        {/* Right: Metadata & Utility Actions */}
        <div className="studio-header-actions">
          {project && (
            <div className="studio-context-pills">
              <span className="studio-meta-pill">
                {project.targetRelease || 'S/4HANA 2023'}
                {project.sourceSystemId ? ` · ${project.sourceSystemId}` : ''}
                {project.sourceClient ? `/${project.sourceClient}` : ''}
              </span>
              <span className="studio-meta-pill mono">{project.projectId}</span>
            </div>
          )}

          {onOpenGuide && (
            <button
              type="button"
              className="studio-btn-icon"
              onClick={onOpenGuide}
              title="Open Context-Aware Workflow Guide"
            >
              <HelpCircle size={13} />
              <span>Workflow Guide</span>
            </button>
          )}

          {onOpenToolchain && (
            <button
              type="button"
              className="studio-btn-icon"
              onClick={onOpenToolchain}
              title="System & Toolchain Diagnostics"
            >
              <Wrench size={13} />
              <span>Toolchain</span>
            </button>
          )}

          <button
            type="button"
            className="studio-btn-icon"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh workspace"
          >
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {isArchived && (
        <div className="studio-archived-banner">
          <AlertTriangle size={14} color="#DC2626" />
          <span>
            This project is <strong>ARCHIVED</strong> (Read-Only). Restore it from the dashboard to edit or generate artifacts.
          </span>
        </div>
      )}
    </header>
  );
};
