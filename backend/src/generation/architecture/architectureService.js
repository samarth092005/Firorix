/**
 * Fiorify — GEN-05: Architecture Service
 *
 * Provides service-layer methods for evaluating, persisting, and updating
 * RAP architecture decisions on a Generation Project.
 */

import { defaultArchitectureDecisionEngine } from './architectureDecisionEngine.js';
import { defaultGenerationProjectStore } from '../projects/generationProjectStore.js';
import { LIFECYCLE_STATUSES } from '../contracts/generationProjectContract.js';

export class ArchitectureService {
  constructor(projectStore = defaultGenerationProjectStore, engine = defaultArchitectureDecisionEngine) {
    this.projectStore = projectStore;
    this.engine = engine;
  }

  /**
   * Evaluates or recalculates the RAP architecture specification for a project.
   */
  async evaluateArchitecture(projectId, overrides = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Generation project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const architectureSpec = this.engine.evaluate(project, overrides);

    // Persist evaluation result onto project
    project.architectureSpec = architectureSpec;

    // Advance lifecycle if appropriate
    let targetStatus = project.lifecycleStatus;
    if (project.lifecycleStatus === LIFECYCLE_STATUSES.DATA_MODEL_VALIDATED ||
        project.lifecycleStatus === LIFECYCLE_STATUSES.READY_FOR_ARCHITECTURE ||
        project.lifecycleStatus === LIFECYCLE_STATUSES.DATA_MODEL_IN_PROGRESS ||
        project.lifecycleStatus === LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS) {
      targetStatus = architectureSpec.status === 'CONFIRMED'
        ? LIFECYCLE_STATUSES.READY_FOR_GENERATION
        : LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS;
    }

    const updated = await this.projectStore.updateProject(projectId, {
      architectureSpec,
      lifecycleStatus: targetStatus,
      author: userContext?.name || 'Lead Architect',
      actorId: userContext?.id || 'USR-LOCAL',
      activityAction: 'ARCHITECTURE_EVALUATED',
      activityDetails: {
        profile: architectureSpec.selectedProfile,
        draft: architectureSpec.draftDecision.enabled,
        status: architectureSpec.status
      }
    }, userContext);

    return {
      success: true,
      projectId,
      architecture: updated.architectureSpec,
      lifecycleStatus: updated.lifecycleStatus
    };
  }

  /**
   * Retrieves the current architecture specification for a project.
   */
  async getArchitecture(projectId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Generation project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    // If architectureSpec is empty or uninitialized, evaluate on-the-fly
    if (!project.architectureSpec || project.architectureSpec.status === 'EMPTY' || !project.architectureSpec.selectedProfile) {
      return this.evaluateArchitecture(projectId, {}, userContext);
    }

    return {
      success: true,
      projectId,
      architecture: project.architectureSpec,
      lifecycleStatus: project.lifecycleStatus
    };
  }

  /**
   * Updates user-defined architecture choices (profile, draft, persistence, naming).
   */
  async updateArchitecture(projectId, patch = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Generation project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const current = project.architectureSpec || {};
    const updatedArchitecture = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    const updated = await this.projectStore.updateProject(projectId, {
      architectureSpec: updatedArchitecture,
      author: userContext?.name || 'Lead Architect',
      actorId: userContext?.id || 'USR-LOCAL',
      activityAction: 'ARCHITECTURE_UPDATED',
      activityDetails: {
        profile: updatedArchitecture.selectedProfile,
        draft: updatedArchitecture.draftDecision?.enabled
      }
    }, userContext);

    return {
      success: true,
      projectId,
      architecture: updated.architectureSpec,
      lifecycleStatus: updated.lifecycleStatus
    };
  }
}

export const defaultArchitectureService = new ArchitectureService();
