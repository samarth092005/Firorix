import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  FolderKanban,
  ExternalLink,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  Calendar,
  Layers,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { GenerationProject, ProjectLifecycleStatus, ProjectOrigin } from '../types';
import { useApp } from '../../../app/providers';
import { ConfirmDialog } from '../../../components/dialogs/ConfirmDialog';

interface ProjectsDashboardProps {
  projects: GenerationProject[];
  isLoading: boolean;
  error: string | null;
  onOpenProject: (project: GenerationProject) => void;
  onCreateProject: () => void;
  onDuplicateProject: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onRefresh: () => void;
}

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  isLoading,
  error,
  onOpenProject,
  onCreateProject,
  onDuplicateProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'projectName'>('updatedAt');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const { resetDemoData } = useApp();

  // Filter & Sort Projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.projectId.toLowerCase().includes(q) ||
          p.projectName.toLowerCase().includes(q) ||
          (p.sourceTransactionCode && p.sourceTransactionCode.toLowerCase().includes(q)) ||
          (p.sourceAssessmentId && p.sourceAssessmentId.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'ALL') {
      result = result.filter((p) => p.lifecycleStatus === statusFilter);
    }

    if (originFilter !== 'ALL') {
      result = result.filter((p) => p.origin === originFilter);
    }

    result.sort((a, b) => {
      if (sortBy === 'updatedAt') {
        const dateA = new Date(a.updatedAt || a.createdAt).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt).getTime();
        return dateB - dateA;
      }
      return a.projectName.localeCompare(b.projectName);
    });

    return result;
  }, [projects, searchQuery, statusFilter, originFilter, sortBy]);

  // Compute real completed phase count for a card
  const getPhaseProgress = (project: GenerationProject) => {
    // 8 canonical phases:
    // 1. Workspace (always 1 if project exists)
    // 2. Requirements (if confirmed items exist)
    // 3. Data Model (if entities defined)
    // 4. Architecture (if RAP profile confirmed)
    // 5. ABAP (if ABAP/RAP artifacts exist)
    // 6. UI (if Fiori UI5 artifacts exist)
    // 7. Preview & Validation (if preview active or validation report exists)
    // 8. Export (if exported or exportHistory exists)

    const rawRegistry = project.artifactRegistry?.artifacts;
    const artifacts: any[] = rawRegistry
      ? (Array.isArray(rawRegistry) ? rawRegistry : Object.values(rawRegistry))
      : [];

    const hasAbap = artifacts.some((a) =>
      a.language === 'ABAP' ||
      a.artifactType?.startsWith('RAP_') ||
      a.artifactType?.startsWith('CDS_') ||
      a.artifactType === 'DDL_SOURCE' ||
      a.filePath?.startsWith('src/')
    );

    const hasUi = artifacts.some((a) =>
      a.filePath?.startsWith('webapp/') ||
      a.artifactType?.startsWith('FIORI_') ||
      a.filePath?.includes('ui5.yaml')
    );

    let count = 1; // Phase 1: Workspace ready

    // Phase 2: Requirements
    const reqItems = project.requirementsSpec?.items || [];
    if (reqItems.length > 0) {
      const hasConfirmed = reqItems.some((r) => r.status === 'CONFIRMED');
      if (hasConfirmed || project.requirementsSpec?.status === 'CONFIRMED' || project.lifecycleStatus === 'REQUIREMENTS_CONFIRMED' || project.lifecycleStatus === 'GENERATED' || project.lifecycleStatus === 'VALIDATION_COMPLETED' || project.lifecycleStatus === 'EXPORTED') {
        count++;
      } else {
        count += 0.5;
      }
    }

    // Phase 3: Data Model
    const entities = project.dataModelSpec?.entities || [];
    if (entities.length > 0 || project.dataModelSpec?.rootEntity) {
      if (hasAbap || project.lifecycleStatus === 'GENERATED' || project.lifecycleStatus === 'VALIDATION_COMPLETED' || project.lifecycleStatus === 'EXPORTED' || project.dataModelSpec?.status === 'VALIDATED') {
        count++;
      } else {
        count += 0.5;
      }
    }

    // Phase 4: Architecture
    if (project.architectureSpec?.selectedProfile || project.architectureSpec?.status === 'CONFIRMED' || hasAbap) {
      count++;
    }

    // Phase 5: ABAP Generation
    if (hasAbap) {
      count++;
    }

    // Phase 6: Fiori UI Generation
    if (hasUi) {
      count++;
    }

    // Phase 7: Preview & Validation
    const hasPreviewOrValidation = (
      (project.validationReport as any)?.status ||
      ((project as any).previewSession as any)?.status === 'RUNNING' ||
      (hasAbap && hasUi)
    );
    if (hasPreviewOrValidation) {
      count++;
    }

    // Phase 8: Review & Export
    const isExported = project.lifecycleStatus === 'EXPORTED' || Boolean((project as any).exportHistory && (project as any).exportHistory.length > 0);
    if (isExported) {
      count++;
    }

    return {
      completed: Math.min(8, Math.floor(count)),
      total: 8,
      percentage: Math.min(100, Math.round((Math.min(8, Math.floor(count)) / 8) * 100))
    };
  };

  return (
    <div className="dashboard-container">
      {/* Top Action Bar & Filters */}
      <div className="dashboard-toolbar">
        <div className="dashboard-search-wrap">
          <Search size={16} className="dashboard-search-icon" />
          <input
            type="text"
            placeholder="Search by ID, name, T-Code..."
            className="dashboard-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="dashboard-filter-group">
          {/* Status Filter */}
          <select
            className="dashboard-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="REQUIREMENTS_IN_PROGRESS">Requirements in Progress</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Origin Filter */}
          <select
            className="dashboard-select"
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
          >
            <option value="ALL">All Origins</option>
            <option value="DISCOVERY_BUILD">Discovery Build</option>
            <option value="STANDALONE">Standalone</option>
          </select>

          {/* Sort By */}
          <select
            className="dashboard-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="updatedAt">Recently Updated</option>
            <option value="projectName">Project Name</option>
          </select>

          <button
            type="button"
            className="studio-btn-icon"
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh projects list"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          </button>

          {/* Primary Action Button */}
          <button
            type="button"
            className="dashboard-btn-create"
            onClick={onCreateProject}
          >
            <Plus size={16} />
            <span>New Generation Project</span>
          </button>
        </div>
      </div>

      {/* Error Strip */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #F87171',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={18} color="#DC2626" />
            <span style={{ fontSize: '13px', color: '#991B1B', fontWeight: 500 }}>{error}</span>
          </div>
          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            style={{ padding: '2px 8px', fontSize: '12px' }}
            onClick={onRefresh}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px auto', color: '#0066FF' }} />
          <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading Generation Projects...</div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Reading canonical project stores from local backend persistence.
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProjects.length === 0 && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px dashed var(--fiori-border, #CBD5E1)',
            borderRadius: '8px',
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '28px',
              backgroundColor: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0066FF'
            }}
          >
            <FolderKanban size={28} />
          </div>

          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              {projects.length === 0 ? 'No Generation Projects Yet' : 'No Matching Projects Found'}
            </h3>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#64748B', maxWidth: '480px' }}>
              {projects.length === 0
                ? 'Create a standalone project for independent Clean Core development, or hand off an approved BUILD assessment from Discovery.'
                : 'Try adjusting your search criteria or filter selections.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              className="fiori-btn fiori-btn-primary"
              onClick={onCreateProject}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Create New Project</span>
            </button>
            {projects.length > 0 && (
              <button
                type="button"
                className="fiori-btn fiori-btn-subtle"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setOriginFilter('ALL');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && filteredProjects.length > 0 && (
        <div className="project-cards-grid">
          {filteredProjects.map((project) => {
            const isArchived = project.lifecycleStatus === 'ARCHIVED';
            const progress = getPhaseProgress(project);

            return (
              <div key={project.projectId} className="project-card">
                {/* Card Top: Badges & Origin */}
                <div className="project-card-header">
                  <div>
                    <h3 className="project-card-title">
                      {project.projectName}
                    </h3>
                    <span className="project-card-code">
                      ID: {project.projectId}
                    </span>
                  </div>

                  <span className={`studio-chip ${isArchived ? '' : 'success'}`}>
                    {project.lifecycleStatus}
                  </span>
                </div>

                {/* Card Body */}
                <div className="project-card-body">
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span className={`studio-chip ${project.origin === 'DISCOVERY_BUILD' ? 'primary' : ''}`}>
                      {project.origin === 'DISCOVERY_BUILD' ? 'DISCOVERY BUILD' : 'STANDALONE'}
                    </span>

                    {project.sourceTransactionCode && (
                      <span className="studio-chip" style={{ backgroundColor: 'var(--studio-warning-bg)', color: 'var(--studio-warning)', borderColor: '#FDE68A' }}>
                        T-Code: {project.sourceTransactionCode}
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: 'var(--studio-text-muted)',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {project.description || 'Clean Core custom RAP Managed modernization project.'}
                  </p>

                  {/* System & Target Metadata */}
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--studio-text-muted)',
                      padding: '10px 12px',
                      backgroundColor: 'var(--studio-surface-subtle)',
                      borderRadius: 'var(--studio-radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      border: '1px solid var(--studio-border)'
                    }}
                  >
                    <div>
                      <strong>Target Release:</strong> {project.targetRelease || 'SAP S/4HANA 2023'}
                    </div>
                    {project.sourceAssessmentId && (
                      <div>
                        <strong>Source Assessment:</strong> <code>{project.sourceAssessmentId}</code>
                      </div>
                    )}
                    {project.sourceSystemId && (
                      <div>
                        <strong>Verified System:</strong> {project.sourceSystemId}
                        {project.sourceClient ? ` (Client ${project.sourceClient})` : ''}
                      </div>
                    )}
                  </div>

                  {/* Segmented Phase Progress Bar */}
                  <div className="progress-meter" style={{ marginTop: 'auto', paddingTop: '8px' }}>
                    <div className="progress-header">
                      <span className="progress-label">8-Phase Pipeline</span>
                      <span className="progress-fraction">
                        {progress.completed} of {progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <div className="progress-track" title={`${progress.completed} of ${progress.total} phases completed`}>
                      {Array.from({ length: 8 }).map((_, idx) => (
                        <div
                          key={idx}
                          className={`progress-segment ${idx < progress.completed ? 'completed' : (idx === progress.completed ? 'active' : '')}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer: Timestamp & Actions */}
                <div className="project-card-footer">
                  <span style={{ fontSize: '11px', color: 'var(--studio-text-subtle)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={12} />
                    {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn-card-icon"
                      onClick={() => onDuplicateProject(project.projectId)}
                      title="Duplicate this project"
                    >
                      <Copy size={13} />
                    </button>

                    {isArchived ? (
                      <button
                        type="button"
                        className="btn-card-icon"
                        onClick={() => onRestoreProject(project.projectId)}
                        title="Restore project to active DRAFT"
                      >
                        <RotateCcw size={13} color="var(--studio-success)" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-card-icon"
                        onClick={() => onArchiveProject(project.projectId)}
                        title="Archive project (read-only)"
                      >
                        <Archive size={13} color="var(--studio-warning)" />
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-card-icon danger"
                      onClick={() => onDeleteProject(project.projectId)}
                      title="Delete project"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      type="button"
                      className="btn-open-workspace"
                      onClick={() => onOpenProject(project)}
                    >
                      <span>Workspace</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={async () => {
          setIsResetDialogOpen(false);
          await resetDemoData();
        }}
        title="Reset Fiorify Demo Projects"
        message="This will clear all generated Studio projects, drafts, assessment handoffs, and browser caches, restoring Fiorify to a clean Clean Core baseline. Are you sure you want to proceed?"
        confirmLabel="Reset Everything"
        isDestructive={true}
      />
    </div>
  );
};
