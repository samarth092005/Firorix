import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StudioHeader } from './components/StudioHeader';
import { StudioNavigation } from './components/StudioNavigation';
import { ProjectsDashboard } from './components/ProjectsDashboard';
import { CreateProjectModal } from './components/CreateProjectModal';
import { WorkspaceShellView } from './components/WorkspaceShellView';
import { StudioOnboardingModal } from './components/StudioOnboardingModal';
import { StudioGuideDrawer } from './components/StudioGuideDrawer';
import { frontendGenerationProjectService } from './services/generationProjectService';
import { GenerationProject, StudioInternalView, CreateProjectPayload } from './types';
import './GenerationStudio.css';

export const GenerationStudioPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven internal navigation state
  const urlProjectId = searchParams.get('projectId') || null;
  const urlView = (searchParams.get('view') as StudioInternalView) || (urlProjectId ? 'workspace' : 'projects');
  const incomingHandoffId = searchParams.get('handoffId') || null;
  const incomingAssessmentId = searchParams.get('assessmentId') || searchParams.get('sourceAssessmentId') || searchParams.get('id') || null;

  const [activeProject, setActiveProject] = useState<GenerationProject | null>(null);
  const [activeView, setActiveView] = useState<StudioInternalView>(urlView);
  const [projectsList, setProjectsList] = useState<GenerationProject[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitializingHandoff, setIsInitializingHandoff] = useState<boolean>(Boolean(incomingHandoffId && !urlProjectId));
  const [handoffStatusMessage, setHandoffStatusMessage] = useState<string>('Resolving approved Clean Core modernization handoff...');
  const [error, setError] = useState<string | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Modal states - never auto-open when auto-provisioning from assessmentId/handoffId
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!activeProject || activeView === 'projects') return;
    try {
      const seen = window.localStorage.getItem('fiorify_studio_onboarding_seen');
      if (seen !== '1') {
        setIsOnboardingOpen(true);
      }
    } catch {
      // ignore storage access issues
    }
  }, [activeProject?.projectId]);

  const handleCloseOnboarding = (dontShowAgain: boolean) => {
    setIsOnboardingOpen(false);
    if (dontShowAgain) {
      try {
        window.localStorage.setItem('fiorify_studio_onboarding_seen', '1');
      } catch {
        // ignore storage access issues
      }
    }
  };

  // Sync state to URL search parameters (and clear one-time handoff/assessment triggers)
  const updateUrlParams = useCallback((projectId: string | null, view: StudioInternalView, clearIncoming = false) => {
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
      if (clearIncoming) {
        updated.delete('assessmentId');
        updated.delete('sourceAssessmentId');
        updated.delete('id');
        updated.delete('handoffId');
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

  // Handle incoming assessment query: auto-create/load project without intrusive popup
  useEffect(() => {
    if (incomingAssessmentId && !incomingHandoffId && !urlProjectId) {
      let isCancelled = false;
      setIsInitializingHandoff(true);
      setHandoffStatusMessage('Initializing Modernization Workspace for assessed transaction...');

      frontendGenerationProjectService
        .listProjects()
        .then(async (listRes) => {
          if (isCancelled) return;
          const existing = (listRes.projects || []).find(
            (p: GenerationProject) => p.sourceAssessmentId === incomingAssessmentId
          );
          if (existing) {
            setActiveProject(existing);
            setActiveView('requirements');
            updateUrlParams(existing.projectId, 'requirements', true);
            return;
          }
          const res = await frontendGenerationProjectService.createProject({
            sourceAssessmentId: incomingAssessmentId,
            projectName: `Modernization (${incomingAssessmentId})`,
            description: `Clean Core RAP Modernization synthesized from Assessment ${incomingAssessmentId}`
          });
          if (isCancelled) return;
          await loadProjects();
          setActiveProject(res.project);
          setActiveView('requirements');
          updateUrlParams(res.project.projectId, 'requirements', true);
        })
        .catch((err: any) => {
          if (isCancelled) return;
          console.error('Failed to auto-provision project from assessment:', err);
          setError(err?.message || 'Failed to initialize project from assessment.');
          setActiveView('projects');
        })
        .finally(() => {
          if (!isCancelled) {
            setIsInitializingHandoff(false);
          }
        });
    }
  }, [incomingAssessmentId, incomingHandoffId, urlProjectId, loadProjects]);

  // Handle incoming approved handoff: auto-provision / resolve without opening popup
  useEffect(() => {
    if (incomingHandoffId && !urlProjectId) {
      let isCancelled = false;
      setIsInitializingHandoff(true);
      setHandoffStatusMessage('Resolving approved architectural handoff & provisioning workspace...');

      frontendGenerationProjectService
        .provisionProjectFromHandoff(incomingHandoffId)
        .then(async (res) => {
          if (isCancelled) return;
          setHandoffStatusMessage('Workspace provisioned. Initializing engineering context...');
          await loadProjects();
          setActiveProject(res.project);
          setActiveView('requirements');
          updateUrlParams(res.project.projectId, 'requirements', true);
        })
        .catch((err: any) => {
          if (isCancelled) return;
          console.error('Failed to auto-provision project from handoff:', err);
          setError(err?.message || 'Failed to initialize project from architectural handoff.');
          setActiveView('projects');
        })
        .finally(() => {
          if (!isCancelled) {
            setIsInitializingHandoff(false);
          }
        });

      return () => {
        isCancelled = true;
      };
    }
  }, [incomingHandoffId, urlProjectId, loadProjects, updateUrlParams]);

  // Navigation handlers
  const handleSelectView = (view: StudioInternalView) => {
    setActiveView(view);
    updateUrlParams(activeProject?.projectId || null, view);
  };

  const resolveResumeView = (project: GenerationProject): StudioInternalView => {
    const status = project.lifecycleStatus || '';
    if (status === 'EXPORTED') return 'review-export';
    if (status === 'GENERATED' || status === 'VALIDATION_COMPLETED') return 'preview-validation';
    if (status === 'READY_FOR_GENERATION') return 'abap-generator';
    if (status === 'DATA_MODEL_VALIDATED' || status === 'READY_FOR_ARCHITECTURE') return 'architecture';
    return 'requirements';
  };

  const handleOpenProject = (project: GenerationProject) => {
    const targetView = resolveResumeView(project);
    setActiveProject(project);
    setActiveView(targetView);
    updateUrlParams(project.projectId, targetView);
  };

  const handleBackToDashboard = () => {
    setActiveProject(null);
    setActiveView('projects');
    updateUrlParams(null, 'projects', true);
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

  const handleDeleteProject = (projectId: string) => {
    setDeleteTargetId(projectId);
  };

  const confirmDeleteProject = async () => {
    if (!deleteTargetId) return;
    const projectId = deleteTargetId;
    setDeleteTargetId(null);
    try {
      setIsLoading(true);
      await frontendGenerationProjectService.deleteProject(projectId, true);
      if (activeProject?.projectId === projectId) {
        setActiveProject(null);
        setActiveView('projects');
        updateUrlParams(null, 'projects', true);
      }
      await loadProjects();
    } catch (err: any) {
      setError(`Failed to delete project: ${err.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="studio-root">
      {/* 4.1 Studio Header */}
      <StudioHeader
        project={activeProject}
        onBackToDashboard={handleBackToDashboard}
        onRefresh={loadProjects}
        onOpenToolchain={() => handleSelectView('environment')}
        onOpenGuide={() => setIsGuideOpen(true)}
        isLoading={isLoading}
      />

      {/* 4.2 Internal 2-Tier Stepper Navigation Bar */}
      <StudioNavigation
        activeView={activeView}
        onSelectView={handleSelectView}
        hasActiveProject={Boolean(activeProject)}
        project={activeProject}
      />

      {/* Main View Area */}
      <div style={{ flex: 1, maxWidth: '100%', width: '100%', margin: '0 auto', padding: '0 0 32px' }}>
        {isInitializingHandoff ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 24px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              marginTop: '40px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #E2E8F0',
                borderTopColor: '#0070F2',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '20px'
              }}
            />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>
              Initializing Generation Workspace
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', maxWidth: '500px', textAlign: 'center' }}>
              {handoffStatusMessage}
            </p>
            {incomingHandoffId && (
              <span
                style={{
                  marginTop: '16px',
                  display: 'inline-block',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  backgroundColor: '#F1F5F9',
                  color: '#475569',
                  borderRadius: '4px'
                }}
              >
                Handoff ID: {incomingHandoffId}
              </span>
            )}
          </div>
        ) : activeView === 'projects' ? (
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
        onClose={() => {
          setIsCreateModalOpen(false);
          if (incomingAssessmentId || incomingHandoffId) {
            updateUrlParams(activeProject?.projectId || null, activeView, true);
          }
        }}
        onSubmit={handleCreateProject}
        initialAssessmentId={incomingAssessmentId}
      />

      {/* Enterprise 4-Stage Onboarding Modal */}
      <StudioOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={handleCloseOnboarding}
        onStartStep={(targetView, dontShowAgain) => {
          handleCloseOnboarding(dontShowAgain);
          handleSelectView(targetView);
        }}
        currentView={activeView}
      />

      {/* Context-Aware Workflow Guide Drawer */}
      <StudioGuideDrawer
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        activeView={activeView}
        project={activeProject}
        onNavigateView={handleSelectView}
        onOpenOverviewModal={() => setIsOnboardingOpen(true)}
      />

      {/* In-App Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="studio-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-project-title">
          <div className="studio-confirm-dialog">
            <h3 id="delete-project-title" style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
              Delete Generation Project?
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#475569', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete project <code>{deleteTargetId}</code>? All generated artifacts and specifications for this project will be removed.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="studio-btn-secondary"
                onClick={() => setDeleteTargetId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="studio-btn-danger"
                onClick={confirmDeleteProject}
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
