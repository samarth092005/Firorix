import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudioHeader } from './components/StudioHeader';
import { StudioNavigation } from './components/StudioNavigation';
import { ProjectsDashboard } from './components/ProjectsDashboard';
import { CreateProjectModal } from './components/CreateProjectModal';
import { WorkspaceShellView } from './components/WorkspaceShellView';
import { frontendGenerationProjectService } from './services/generationProjectService';
import { GenerationProject, StudioInternalView, CreateProjectPayload } from './types';

export const GenerationStudioPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven internal navigation state
  const urlProjectId = searchParams.get('projectId') || null;
  const urlView = (searchParams.get('view') as StudioInternalView) || 'projects';
  const incomingAssessmentId = searchParams.get('assessmentId') || searchParams.get('sourceAssessmentId') || searchParams.get('id') || null;

  const [activeProject, setActiveProject] = useState<GenerationProject | null>(null);
  const [activeView, setActiveView] = useState<StudioInternalView>(urlView);
  const [projectsList, setProjectsList] = useState<GenerationProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(Boolean(incomingAssessmentId && !urlProjectId));

  // Sync state to URL search parameters
  const updateUrlParams = useCallback((projectId: string | null, view: StudioInternalView) => {
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      if (projectId) {
        updated.set('projectId', projectId);
      } else {
        updated.delete('projectId');
      }
      if (view && view !== 'projects') {
        updated.set('view', view);
      } else {
        updated.delete('view');
      }
      return updated;
    }, { replace: true });
  }, [setSearchParams]);

  // Load projects list from backend
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await frontendGenerationProjectService.listProjects();
      setProjectsList(res.projects || []);

      // If URL has projectId, resolve active project
      if (urlProjectId) {
        const matched = (res.projects || []).find((p: GenerationProject) => p.projectId === urlProjectId);
        if (matched) {
          setActiveProject(matched);
        } else {
          // Fetch directly from backend
          try {
            const fetched = await frontendGenerationProjectService.getProject(urlProjectId);
            setActiveProject(fetched);
          } catch {
            setError(`Project "${urlProjectId}" was not found or is inaccessible.`);
            setActiveProject(null);
            setActiveView('projects');
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load generation projects:', err);
      setError(err?.message || 'Failed to connect to backend generation project store.');
    } finally {
      setIsLoading(false);
    }
  }, [urlProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Handle incoming assessment handoff query
  useEffect(() => {
    if (incomingAssessmentId && !urlProjectId) {
      setIsCreateModalOpen(true);
    }
  }, [incomingAssessmentId, urlProjectId]);

  // Navigation handlers
  const handleSelectView = (view: StudioInternalView) => {
    setActiveView(view);
    updateUrlParams(activeProject?.projectId || null, view);
  };

  const handleOpenProject = (project: GenerationProject) => {
    setActiveProject(project);
    setActiveView('requirements'); // Default landing inside opened project
    updateUrlParams(project.projectId, 'requirements');
  };

  const handleBackToDashboard = () => {
    setActiveView('projects');
    updateUrlParams(activeProject?.projectId || null, 'projects');
  };

  // CRUD actions
  const handleCreateProject = async (payload: CreateProjectPayload) => {
    const res = await frontendGenerationProjectService.createProject(payload);
    await loadProjects();
    setActiveProject(res.project);
    setActiveView('requirements');
    updateUrlParams(res.project.projectId, 'requirements');
  };

  const handleDuplicateProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      const duplicated = await frontendGenerationProjectService.duplicateProject(projectId);
      await loadProjects();
      setActiveProject(duplicated);
      setActiveView('requirements');
      updateUrlParams(duplicated.projectId, 'requirements');
    } catch (err: any) {
      setError(`Failed to duplicate project: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleArchiveProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      const archived = await frontendGenerationProjectService.archiveProject(projectId);
      if (activeProject?.projectId === projectId) {
        setActiveProject(archived);
      }
      await loadProjects();
    } catch (err: any) {
      setError(`Failed to archive project: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleRestoreProject = async (projectId: string) => {
    try {
      setIsLoading(true);
      const restored = await frontendGenerationProjectService.restoreProject(projectId);
      if (activeProject?.projectId === projectId) {
        setActiveProject(restored);
      }
      await loadProjects();
    } catch (err: any) {
      setError(`Failed to restore project: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete project "${projectId}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await frontendGenerationProjectService.deleteProject(projectId, true);
      if (activeProject?.projectId === projectId) {
        setActiveProject(null);
        setActiveView('projects');
        updateUrlParams(null, 'projects');
      }
      await loadProjects();
    } catch (err: any) {
      setError(`Failed to delete project: ${err.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 56px)',
        backgroundColor: '#F8FAFC'
      }}
    >
      {/* 4.1 Studio Header */}
      <StudioHeader
        project={activeProject}
        onBackToDashboard={handleBackToDashboard}
        onRefresh={loadProjects}
        isLoading={isLoading}
      />

      {/* 4.2 Internal 9-View Navigation Bar */}
      <StudioNavigation
        activeView={activeView}
        onSelectView={handleSelectView}
        hasActiveProject={Boolean(activeProject)}
      />

      {/* Main View Area */}
      <div style={{ flex: 1, maxWidth: '1440px', width: '100%', margin: '0 auto' }}>
        {activeView === 'projects' ? (
          <ProjectsDashboard
            projects={projectsList}
            isLoading={isLoading}
            error={error}
            onOpenProject={handleOpenProject}
            onCreateProject={() => setIsCreateModalOpen(true)}
            onDuplicateProject={handleDuplicateProject}
            onArchiveProject={handleArchiveProject}
            onRestoreProject={handleRestoreProject}
            onDeleteProject={handleDeleteProject}
            onRefresh={loadProjects}
          />
        ) : (
          <WorkspaceShellView
            viewId={activeView}
            project={activeProject}
            onNavigateView={handleSelectView}
            onProjectUpdated={(p) => {
              setActiveProject(p);
              loadProjects();
            }}
          />
        )}
      </div>

      {/* Project Creation Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateProject}
        initialAssessmentId={incomingAssessmentId}
      />
    </div>
  );
};
