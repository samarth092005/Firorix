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
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Action Bar & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '260px', maxWidth: '360px', flex: 1 }}>
            <Search
              size={15}
              color="#94A3B8"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by ID, name, T-Code..."
              className="fiori-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '36px', fontSize: '13px', width: '100%' }}
            />
          </div>

          {/* Status Filter */}
          <select
            className="fiori-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ height: '36px', fontSize: '12px', minWidth: '140px' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="REQUIREMENTS_IN_PROGRESS">Requirements in Progress</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          {/* Origin Filter */}
          <select
            className="fiori-select"
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            style={{ height: '36px', fontSize: '12px', minWidth: '150px' }}
          >
            <option value="ALL">All Origins</option>
            <option value="DISCOVERY_BUILD">Discovery Build</option>
            <option value="STANDALONE">Standalone</option>
          </select>

          {/* Sort By */}
          <select
            className="fiori-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{ height: '36px', fontSize: '12px', minWidth: '150px' }}
          >
            <option value="updatedAt">Sort by: Recently Updated</option>
            <option value="projectName">Sort by: Project Name</option>
          </select>

          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            style={{ height: '36px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={onRefresh}
            disabled={isLoading}
            title="Refresh projects list"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          </button>

          <button
            type="button"
            className="fiori-btn fiori-btn-subtle"
            style={{ height: '36px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#B91C1C' }}
            onClick={() => setIsResetDialogOpen(true)}
            title="Reset demo projects and clear clutter"
          >
            <RotateCcw size={14} color="#DC2626" />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Reset Demo</span>
          </button>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          className="fiori-btn fiori-btn-primary"
          style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 16px', fontWeight: 600 }}
          onClick={onCreateProject}
        >
          <Plus size={16} />
          <span>New Generation Project</span>
        </button>
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px'
          }}
        >
          {filteredProjects.map((project) => {
            const isArchived = project.lifecycleStatus === 'ARCHIVED';
            const progress = getPhaseProgress(project);

            return (
              <div
                key={project.projectId}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid var(--fiori-border, #E2E8F0)',
                  borderRadius: '8px',
                  boxShadow: 'var(--fiori-shadow-card, 0 1px 3px rgba(0,0,0,0.06))',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  overflow: 'hidden'
                }}
              >
                {/* Card Top: Badges & Origin */}
                <div
                  style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#F8FAFC'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: project.origin === 'DISCOVERY_BUILD' ? '#EDE9FE' : '#F1F5F9',
                        color: project.origin === 'DISCOVERY_BUILD' ? '#6D28D9' : '#475569',
                        fontWeight: 700
                      }}
                    >
                      {project.origin === 'DISCOVERY_BUILD' ? 'DISCOVERY BUILD' : 'STANDALONE'}
                    </span>

                    {project.sourceTransactionCode && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: '#FEF3C7',
                          color: '#92400E',
                          fontWeight: 700
                        }}
                      >
                        {project.sourceTransactionCode}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: isArchived ? '#FEE2E2' : '#DCFCE7',
                      color: isArchived ? '#991B1B' : '#166534',
                      fontWeight: 700
                    }}
                  >
                    {project.lifecycleStatus}
                  </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: 700,
                        color: '#0F172A',
                        lineHeight: 1.3
                      }}
                    >
                      {project.projectName}
                    </h3>
                    <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                      ID: {project.projectId}
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      color: '#475569',
                      lineHeight: 1.4,
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
                      color: '#64748B',
                      padding: '8px 10px',
                      backgroundColor: '#F8FAFC',
                      borderRadius: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
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

                  {/* Phase Progress Bar (Derived from Real Data) */}
                  <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>
                      <span>Phases Completed</span>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>
                        {progress.completed} of {progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        backgroundColor: '#E2E8F0',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={{
                          width: `${progress.percentage}%`,
                          height: '100%',
                          backgroundColor: '#0066FF',
                          borderRadius: '3px',
                          transition: 'width 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer: Timestamp & Actions */}
                <div
                  style={{
                    padding: '12px 18px',
                    borderTop: '1px solid #F1F5F9',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    {new Date(project.updatedAt || project.createdAt).toLocaleDateString()}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="fiori-btn fiori-btn-subtle"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      onClick={() => onDuplicateProject(project.projectId)}
                      title="Duplicate this project"
                    >
                      <Copy size={13} />
                    </button>

                    {isArchived ? (
                      <button
                        type="button"
                        className="fiori-btn fiori-btn-subtle"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => onRestoreProject(project.projectId)}
                        title="Restore project to active DRAFT"
                      >
                        <RotateCcw size={13} color="#166534" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="fiori-btn fiori-btn-subtle"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={() => onArchiveProject(project.projectId)}
                        title="Archive project (read-only)"
                      >
                        <Archive size={13} color="#D97706" />
                      </button>
                    )}

                    <button
                      type="button"
                      className="fiori-btn fiori-btn-subtle"
                      style={{ padding: '4px 8px', fontSize: '12px', color: '#DC2626' }}
                      onClick={() => onDeleteProject(project.projectId)}
                      title="Delete project"
                    >
                      <Trash2 size={13} />
                    </button>

                    <button
                      type="button"
                      className="fiori-btn fiori-btn-primary"
                      style={{ padding: '4px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => onOpenProject(project)}
                    >
                      <span>Open</span>
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
