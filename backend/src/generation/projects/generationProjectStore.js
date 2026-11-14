/**
 * Fiorify — Generation Project Persistence Store (P1-B)
 *
 * Implements server-side canonical persistence for Generation Studio projects.
 * - One canonical directory per project: backend/data/generation-projects/<projectId>/project.json
 * - Atomic writes via temporary files and rename
 * - Serialized write locks per project to prevent race conditions
 * - Backup and recovery (.bak file protection)
 * - Corruption detection and graceful recovery
 * - Strict safe path boundary enforcement (no path traversal)
 * - Real lifecycle metric calculation (no fake scores)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  GENERATION_PROJECT_SCHEMA_VERSION,
  LIFECYCLE_STATUSES,
  PROJECT_PHASES,
  createGenerationProjectRecord
} from '../contracts/generationProjectContract.js';
import {
  validateProjectId,
  assertSafePath,
  validateCreateProjectPayload,
  validateUpdateProjectPayload
} from './generationProjectValidator.js';
import {
  validateLifecycleTransition,
  recordLifecycleEvent
} from './generationProjectLifecycle.js';
import { GenerationProjectRepository } from '../../infrastructure/db/repositories/generationProjectRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_PROJECTS_DIR = path.resolve(__dirname, '../../../data/generation-projects');

export class GenerationProjectStore {
  constructor(storageDir = DEFAULT_PROJECTS_DIR, options = {}) {
    if (typeof storageDir === 'object' && storageDir !== null && !options.repository) {
      options = storageDir;
      storageDir = options.storageDir || DEFAULT_PROJECTS_DIR;
    }
    this.storageDir = path.resolve(storageDir);
    this._writeLocks = new Map();
    this._globalLock = Promise.resolve();
    this.tenantId = options.tenantId || 'DEFAULT-TENANT-S21';
    const persistenceMode = (process.env.FIORIFY_PERSISTENCE || process.env.Fiorify_PERSISTENCE || '').toLowerCase();
    this.useDatabase = options.useDatabase || (persistenceMode === 'postgres' && storageDir === DEFAULT_PROJECTS_DIR);
    this.repository = options.repository || (this.useDatabase ? new GenerationProjectRepository() : null);
  }

  /**
   * Serializes write operations for a specific project ID.
   */
  async _withProjectLock(projectId, operation) {
    const prevLock = this._writeLocks.get(projectId) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    this._writeLocks.set(projectId, gate);

    await prevLock.catch(() => {});
    try {
      return await operation();
    } finally {
      release();
    }
  }

  /**
   * Resolves and verifies safe canonical path for a project file.
   */
  _getProjectFilePath(projectId) {
    const idCheck = validateProjectId(projectId);
    if (!idCheck.isValid) {
      const err = new Error(idCheck.error);
      err.code = 'INVALID_PROJECT_ID';
      throw err;
    }

    const safeId = idCheck.sanitizedId;
    const projectDir = path.join(this.storageDir, safeId);
    assertSafePath(this.storageDir, projectDir);

    const projectFile = path.join(projectDir, 'project.json');
    assertSafePath(this.storageDir, projectFile);

    return { projectDir, projectFile, projectId: safeId };
  }

  /**
   * Ensures base storage directory exists.
   */
  async _ensureStorageDir() {
    if (!fs.existsSync(this.storageDir)) {
      await fs.promises.mkdir(this.storageDir, { recursive: true });
    }
  }

  /**
   * Persists a project object atomically to disk with backup protection.
   */
  async _atomicSaveProject(project) {
    const { projectDir, projectFile } = this._getProjectFilePath(project.projectId);

    if (!fs.existsSync(projectDir)) {
      await fs.promises.mkdir(projectDir, { recursive: true });
    }

    const backupFile = `${projectFile}.bak`;
    if (fs.existsSync(projectFile)) {
      try {
        await fs.promises.copyFile(projectFile, backupFile);
      } catch (backupErr) {
        console.warn(`[GenerationProjectStore] Non-fatal backup failure for ${project.projectId}:`, backupErr.message);
      }
    }

    const json = JSON.stringify(project, null, 2);
    const tempFile = path.join(projectDir, `project.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);

    await fs.promises.writeFile(tempFile, json, 'utf8');
    await fs.promises.rename(tempFile, projectFile);
  }

  /**
   * Reads a project from disk with corruption detection and backup recovery.
   */
  async _readProject(projectId) {
    const { projectFile } = this._getProjectFilePath(projectId);

    if (!fs.existsSync(projectFile)) {
      return null;
    }

    let raw;
    try {
      raw = await fs.promises.readFile(projectFile, 'utf8');
    } catch (readErr) {
      const err = new Error(`Failed to read project file for "${projectId}": ${readErr.message}`);
      err.code = 'STORAGE_READ_ERROR';
      throw err;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseErr) {
      console.warn(`[GenerationProjectStore] Corruption detected in ${projectId}: ${parseErr.message}. Attempting backup recovery.`);
      const backupFile = `${projectFile}.bak`;
      if (fs.existsSync(backupFile)) {
        try {
          const backupRaw = await fs.promises.readFile(backupFile, 'utf8');
          parsed = JSON.parse(backupRaw);
          // Restore corrupted file from valid backup
          await fs.promises.copyFile(backupFile, projectFile);
          console.info(`[GenerationProjectStore] Successfully recovered ${projectId} from backup.`);
        } catch (backupRestoreErr) {
          const err = new Error(`Project file "${projectId}" is corrupted and backup recovery failed: ${parseErr.message}`);
          err.code = 'CORRUPTED_PROJECT_FILE';
          throw err;
        }
      } else {
        const err = new Error(`Project file "${projectId}" is corrupted and no backup exists: ${parseErr.message}`);
        err.code = 'CORRUPTED_PROJECT_FILE';
        throw err;
      }
    }

    if (!parsed || parsed.projectId !== projectId) {
      const err = new Error(`Project file for "${projectId}" contains invalid or mismatched project ID.`);
      err.code = 'CORRUPTED_PROJECT_FILE';
      throw err;
    }

    return parsed;
  }

  /**
   * Creates and persists a new Generation Studio Project.
   */
  async createProject(payload = {}, userContext = null) {
    const validation = validateCreateProjectPayload(payload);
    if (!validation.isValid) {
      const err = new Error(validation.error);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (this.repository) {
      const tenantId = userContext?.tenantId || this.tenantId;
      let candidateId = payload.projectId;
      if (!candidateId) {
        const prefix = payload.sourceTransactionCode
          ? `GEN-${payload.sourceTransactionCode.toUpperCase()}`
          : 'GEN-STANDALONE';
        const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        candidateId = `${prefix}-${randSuffix}`;
      }

      const existing = await this.repository.getProjectById(candidateId, tenantId);
      if (existing) {
        const err = new Error(`Project with ID "${candidateId}" already exists. Duplicate IDs are prevented.`);
        err.code = 'ID_CONFLICT';
        throw err;
      }

      const projectRecord = createGenerationProjectRecord({
        ...payload,
        projectId: candidateId
      }, userContext);

      return await this.repository.createProject(projectRecord, tenantId);
    }

    await this._ensureStorageDir();

    let candidateId = payload.projectId;
    if (!candidateId) {
      const prefix = payload.sourceTransactionCode
        ? `GEN-${payload.sourceTransactionCode.toUpperCase()}`
        : 'GEN-STANDALONE';
      const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      candidateId = `${prefix}-${randSuffix}`;
    }

    const { projectFile, projectId } = this._getProjectFilePath(candidateId);

    // Duplicate ID check
    if (fs.existsSync(projectFile)) {
      const err = new Error(`Project with ID "${projectId}" already exists. Duplicate IDs are prevented.`);
      err.code = 'ID_CONFLICT';
      throw err;
    }

    const projectRecord = createGenerationProjectRecord({
      ...payload,
      projectId
    }, userContext);

    await this._withProjectLock(projectId, async () => {
      await this._atomicSaveProject(projectRecord);
    });

    return projectRecord;
  }

  /**
   * Retrieves a Generation Studio Project by ID.
   */
  async getProject(projectId, userContext = null) {
    if (this.repository) {
      const tenantId = userContext?.tenantId || this.tenantId;
      return await this.repository.getProjectById(projectId, tenantId);
    }
    const idCheck = validateProjectId(projectId);
    if (!idCheck.isValid) {
      const err = new Error(idCheck.error);
      err.code = 'INVALID_PROJECT_ID';
      throw err;
    }
    const project = await this._readProject(idCheck.sanitizedId);
    if (!project) return null;
    const requestedTenant = userContext ? (userContext.tenantId || this.tenantId) : null;
    if (requestedTenant && project.tenantId && project.tenantId !== requestedTenant) {
      return null;
    }
    return project;
  }

  /**
   * Updates an existing project.
   */
  async updateProject(projectId, patch = {}, userContext = null) {
    const patchValidation = validateUpdateProjectPayload(patch);
    if (!patchValidation.isValid) {
      const err = new Error(patchValidation.error);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    if (this.repository) {
      const tenantId = userContext?.tenantId || this.tenantId;
      return await this.repository.updateProject(projectId, patch, tenantId);
    }

    return await this._withProjectLock(projectId, async () => {
      const existing = await this._readProject(projectId);
      if (!existing) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const requestedTenant = userContext?.tenantId;
      if (requestedTenant && existing.tenantId && existing.tenantId !== requestedTenant) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (existing.lifecycleStatus === LIFECYCLE_STATUSES.ARCHIVED) {
        const err = new Error(`Project "${projectId}" is archived and read-only. Restore the project before making updates.`);
        err.code = 'PROJECT_ARCHIVED';
        throw err;
      }

      const now = new Date().toISOString();
      const actorName = userContext?.name || userContext?.username || 'Lead SAP Architect';
      const actorId = userContext?.id || 'USR-LOCAL-001';

      // Check lifecycle transition if status is being updated
      if (patch.lifecycleStatus && patch.lifecycleStatus !== existing.lifecycleStatus) {
        const transCheck = validateLifecycleTransition(existing.lifecycleStatus, patch.lifecycleStatus, patch.isEngineOperation || false);
        if (!transCheck.isValid) {
          const err = new Error(transCheck.error);
          err.code = 'INVALID_LIFECYCLE_TRANSITION';
          throw err;
        }

        recordLifecycleEvent(existing, patch.lifecycleStatus, userContext, patch.statusReason);
      }

      // Apply allowable fields
      if (patch.projectName !== undefined) existing.projectName = patch.projectName.trim();
      if (patch.description !== undefined) existing.description = String(patch.description).trim();
      if (patch.targetRelease !== undefined) existing.targetRelease = String(patch.targetRelease).trim();
      if (patch.targetDeploymentModel !== undefined) existing.targetDeploymentModel = patch.targetDeploymentModel;
      if (patch.targetPackage !== undefined) existing.targetPackage = String(patch.targetPackage).trim();
      if (patch.requirementsSpec !== undefined) existing.requirementsSpec = patch.requirementsSpec;
      if (patch.dataModelSpec !== undefined) existing.dataModelSpec = patch.dataModelSpec;
      if (patch.architectureSpec !== undefined) existing.architectureSpec = patch.architectureSpec;
      if (patch.artifactRegistry !== undefined) existing.artifactRegistry = patch.artifactRegistry;
      if (patch.validationReport !== undefined) existing.validationReport = patch.validationReport;
      if (patch.fioriConfig !== undefined) existing.fioriConfig = patch.fioriConfig;
      if (patch.reviewRecord !== undefined) existing.reviewRecord = patch.reviewRecord;
      if (patch.exportHistory !== undefined) existing.exportHistory = patch.exportHistory;

      existing.specificationVersion = (existing.specificationVersion || 1) + 1;
      existing.updatedAt = now;

      // Log update activity
      existing.activityHistory.push({
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        timestamp: now,
        author: actorName,
        actorId,
        action: 'PROJECT_UPDATED',
        details: {
          updatedFields: Object.keys(patch).filter((k) => k !== 'statusReason')
        },
        previousStatus: existing.lifecycleStatus,
        newStatus: existing.lifecycleStatus
      });

      await this._atomicSaveProject(existing);
      return existing;
    });
  }

  /**
   * Archives a project.
   */
  async archiveProject(projectId, userContext = null) {
    if (this.repository) {
      const tenantId = userContext?.tenantId || this.tenantId;
      return await this.repository.archiveProject(projectId, userContext, tenantId);
    }

    return await this._withProjectLock(projectId, async () => {
      const existing = await this._readProject(projectId);
      if (!existing) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const requestedTenant = userContext?.tenantId;
      if (requestedTenant && existing.tenantId && existing.tenantId !== requestedTenant) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (existing.lifecycleStatus === LIFECYCLE_STATUSES.ARCHIVED) {
        return existing; // Idempotent archive
      }

      recordLifecycleEvent(existing, LIFECYCLE_STATUSES.ARCHIVED, userContext, 'Project archived by user.');
      await this._atomicSaveProject(existing);
      return existing;
    });
  }

  /**
   * Restores an archived project back to DRAFT.
   */
  async restoreProject(projectId, userContext = null) {
    if (this.repository) {
      const tenantId = userContext?.tenantId || this.tenantId;
      return await this.repository.restoreProject(projectId, userContext, tenantId);
    }

    return await this._withProjectLock(projectId, async () => {
      const existing = await this._readProject(projectId);
      if (!existing) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const requestedTenant = userContext?.tenantId;
      if (requestedTenant && existing.tenantId && existing.tenantId !== requestedTenant) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      if (existing.lifecycleStatus !== LIFECYCLE_STATUSES.ARCHIVED) {
        return existing; // Already active
      }

      recordLifecycleEvent(existing, LIFECYCLE_STATUSES.DRAFT, userContext, 'Project restored from archive to active DRAFT.');
      await this._atomicSaveProject(existing);
      return existing;
    });
  }

  /**
   * Duplicates an existing project under a new ID and name.
   */
  async duplicateProject(sourceProjectId, options = {}, userContext = null) {
    if (this.repository) {
      const tenantId = userContext?.tenantId || this.tenantId;
      return await this.repository.duplicateProject(sourceProjectId, options, userContext, tenantId);
    }

    const sourceProject = await this.getProject(sourceProjectId);
    if (!sourceProject) {
      const err = new Error(`Source project "${sourceProjectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const newName = options.newProjectName || `${sourceProject.projectName} (Copy)`;
    const newId = options.newProjectId || `${sourceProject.projectId}-COPY-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    const duplicatePayload = {
      ...sourceProject,
      projectId: newId,
      projectName: newName,
      description: options.newDescription || sourceProject.description,
      origin: sourceProject.origin,
      sourceAssessmentId: sourceProject.sourceAssessmentId,
      sourceTransactionCode: sourceProject.sourceTransactionCode,
      sourceSystemId: sourceProject.sourceSystemId,
      sourceClient: sourceProject.sourceClient,
      targetRelease: sourceProject.targetRelease,
      targetDeploymentModel: sourceProject.targetDeploymentModel
    };

    // Remove artifacts, validation, and review from the duplicate to start clean
    delete duplicatePayload.artifactRegistry;
    delete duplicatePayload.validationReport;
    delete duplicatePayload.reviewRecord;
    delete duplicatePayload.activityHistory;

    return await this.createProject(duplicatePayload, userContext);
  }

  /**
   * Deletes a project with safeguards against accidental destruction.
   */
  async deleteProject(projectId, options = {}) {
    if (this.repository) {
      const tenantId = options?.userContext?.tenantId || this.tenantId;
      const success = await this.repository.deleteProject(projectId, tenantId);
      return { success, deletedProjectId: projectId };
    }

    const { projectDir, projectFile } = this._getProjectFilePath(projectId);

    return await this._withProjectLock(projectId, async () => {
      if (!fs.existsSync(projectFile)) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const existing = await this._readProject(projectId);
      if (!existing) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const requestedTenant = options.userContext?.tenantId || this.tenantId;
      if (requestedTenant && existing.tenantId && existing.tenantId !== requestedTenant) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const hasArtifacts = existing && existing.artifactRegistry && Object.keys(existing.artifactRegistry).length > 0;
      const isExported = existing && existing.lifecycleStatus === LIFECYCLE_STATUSES.EXPORTED;

      if ((hasArtifacts || isExported) && !options.confirmed) {
        const err = new Error(`Project "${projectId}" contains generated artifacts or was exported. Deletion requires explicit confirmation ({ confirmed: true }).`);
        err.code = 'CONFIRMATION_REQUIRED';
        throw err;
      }

      // Remove directory recursively
      await fs.promises.rm(projectDir, { recursive: true, force: true });
      return { success: true, deletedProjectId: projectId };
    });
  }

  /**
   * Lists all persisted generation projects with filtering, sorting, and pagination.
   */
  async listProjects(filters = {}, userContext = null) {
    if (this.repository) {
      const tenantId = userContext?.tenantId || filters.tenantId || this.tenantId;
      const items = await this.repository.listProjects(filters, tenantId);
      const page = Math.max(1, parseInt(filters.page, 10) || 1);
      const pageSize = Math.max(1, Math.min(100, parseInt(filters.pageSize, 10) || 20));
      const total = items.length;
      const offset = (page - 1) * pageSize;
      const paginated = items.slice(offset, offset + pageSize);
      return {
        total,
        count: paginated.length,
        page,
        pageSize,
        projects: paginated
      };
    }

    await this._ensureStorageDir();

    let entries = [];
    try {
      entries = await fs.promises.readdir(this.storageDir, { withFileTypes: true });
    } catch {
      return { total: 0, count: 0, projects: [] };
    }

    const projects = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        try {
          const project = await this._readProject(entry.name);
          if (project) {
            projects.push(project);
          }
        } catch (readErr) {
          console.warn(`[GenerationProjectStore] Skipping unreadable project dir "${entry.name}":`, readErr.message);
        }
      }
    }

    let filtered = projects;

    // Filter by tenant isolation
    const requestedTenant = userContext?.tenantId || filters.tenantId || this.tenantId;
    if (requestedTenant) {
      filtered = filtered.filter((p) => !p.tenantId || p.tenantId === requestedTenant);
    }

    // Filter by search query
    if (filters.search && typeof filters.search === 'string') {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter((p) =>
        p.projectId.toLowerCase().includes(q) ||
        p.projectName.toLowerCase().includes(q) ||
        (p.sourceTransactionCode && p.sourceTransactionCode.toLowerCase().includes(q)) ||
        (p.sourceAssessmentId && p.sourceAssessmentId.toLowerCase().includes(q))
      );
    }

    // Filter by lifecycleStatus
    if (filters.lifecycleStatus && filters.lifecycleStatus !== 'ALL') {
      filtered = filtered.filter((p) => p.lifecycleStatus === filters.lifecycleStatus);
    }

    // Filter by origin
    if (filters.origin && filters.origin !== 'ALL') {
      filtered = filtered.filter((p) => p.origin === filters.origin);
    }

    // Sort by updatedAt descending by default
    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const total = filtered.length;
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const pageSize = Math.max(1, parseInt(filters.pageSize, 10) || 50);
    const offset = (page - 1) * pageSize;
    const paginated = filtered.slice(offset, offset + pageSize);

    return {
      total,
      count: paginated.length,
      page,
      pageSize,
      projects: paginated
    };
  }

  /**
   * Computes honest, data-driven summary metrics for a project.
   */
  async getProjectSummary(projectId, userContext = null) {
    const project = await this.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Calculate completed phases based on REAL persisted data
    const phases = PROJECT_PHASES.map((phase) => {
      let isCompleted = false;
      let notes = 'Not started';

      switch (phase.id) {
        case 'PHASE_1_WORKSPACE':
          isCompleted = true; // Workspace setup is complete upon project creation
          notes = 'Workspace and persistence initialized';
          break;
        case 'PHASE_2_REQUIREMENTS':
          isCompleted = Boolean(project.requirementsSpec && project.requirementsSpec.items && project.requirementsSpec.items.length > 0 && project.requirementsSpec.status === 'CONFIRMED');
          notes = isCompleted ? `${project.requirementsSpec.items.length} requirements documented` : 'Pending Phase 2 requirements definition';
          break;
        case 'PHASE_3_DATA_MODEL':
          isCompleted = Boolean(project.dataModelSpec && project.dataModelSpec.rootEntity && project.dataModelSpec.status === 'CONFIRMED');
          notes = isCompleted ? 'CDS entity hierarchy modeled' : 'Pending Phase 3 CDS data model definition';
          break;
        case 'PHASE_4_ARCHITECTURE':
          isCompleted = Boolean(project.architectureSpec && project.architectureSpec.status === 'CONFIRMED');
          notes = isCompleted ? `RAP profile ${project.architectureSpec.rapScenario} confirmed` : 'Pending Phase 4 RAP architecture formulation';
          break;
        case 'PHASE_5_ABAP_GENERATION':
          isCompleted = Boolean(project.artifactRegistry && Object.values(project.artifactRegistry).some((a) => a.layer === 'ABAP'));
          notes = isCompleted ? 'ABAP artifacts generated' : 'Pending Phase 5 ABAP generator execution';
          break;
        case 'PHASE_6_UI_GENERATION':
          isCompleted = Boolean(project.artifactRegistry && Object.values(project.artifactRegistry).some((a) => a.layer === 'UI5'));
          notes = isCompleted ? 'Fiori Elements artifacts generated' : 'Pending Phase 6 UI generator execution';
          break;
        case 'PHASE_7_VALIDATION':
          isCompleted = Boolean(project.validationReport && project.validationReport.completedAt);
          notes = isCompleted ? `Validation score: ${project.validationReport.overallScore}/100` : 'Pending Phase 7 validation test';
          break;
        case 'PHASE_8_EXPORT':
          isCompleted = project.lifecycleStatus === LIFECYCLE_STATUSES.EXPORTED;
          notes = isCompleted ? 'Project package exported' : 'Pending Phase 8 review and export';
          break;
      }

      return {
        ...phase,
        isCompleted,
        notes
      };
    });

    const completedCount = phases.filter((p) => p.isCompleted).length;

    return {
      projectId: project.projectId,
      projectName: project.projectName,
      origin: project.origin,
      lifecycleStatus: project.lifecycleStatus,
      targetRelease: project.targetRelease,
      targetDeploymentModel: project.targetDeploymentModel,
      phases,
      completedPhaseCount: completedCount,
      totalPhaseCount: phases.length,
      progressPercentage: Math.round((completedCount / phases.length) * 100),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };
  }

  async recordSpecification(projectId, specType, specContent, userContext = null) {
    if (this.repository) {
      return await this.repository.saveSpecification(projectId, specType, specContent?.specVersion || specContent?.revision || 1, specContent);
    }
    return await this._withProjectLock(projectId, async () => {
      const existing = await this._readProject(projectId);
      if (!existing) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const requestedTenant = userContext?.tenantId;
      if (requestedTenant && existing.tenantId && existing.tenantId !== requestedTenant) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }
      if (specType === 'REQUIREMENTS') existing.requirementsSpec = specContent;
      else if (specType === 'DATA_MODEL') existing.dataModelSpec = specContent;
      else if (specType === 'ARCHITECTURE') existing.architectureSpec = specContent;
      else existing.specification = specContent;
      existing.updatedAt = new Date().toISOString();
      await this._atomicSaveProject(existing);
      return { projectId, specType, specContent };
    });
  }

  async getSpecification(projectId, specType) {
    if (this.repository) {
      return await this.repository.getSpecification(projectId, specType);
    }
    const project = await this.getProject(projectId);
    if (!project) return null;
    if (specType === 'REQUIREMENTS') return project.requirementsSpec || null;
    if (specType === 'DATA_MODEL') return project.dataModelSpec || null;
    if (specType === 'ARCHITECTURE') return project.architectureSpec || null;
    return project.specification || null;
  }

  async recordArtifact(projectId, artifact, userContext = null) {
    if (this.repository) {
      return await this.repository.saveArtifactRecord(projectId, artifact);
    }
    return await this._withProjectLock(projectId, async () => {
      const existing = await this._readProject(projectId);
      if (!existing) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }

      const requestedTenant = userContext?.tenantId;
      if (requestedTenant && existing.tenantId && existing.tenantId !== requestedTenant) {
        const err = new Error(`Project "${projectId}" was not found.`);
        err.code = 'NOT_FOUND';
        throw err;
      }
      existing.artifactRegistry = existing.artifactRegistry || {};
      existing.artifactRegistry[artifact.artifactName || artifact.id] = artifact;
      existing.updatedAt = new Date().toISOString();
      await this._atomicSaveProject(existing);
      return artifact;
    });
  }

  async listArtifacts(projectId) {
    if (this.repository) {
      return await this.repository.listArtifacts(projectId);
    }
    const project = await this.getProject(projectId);
    if (!project) return [];
    return Object.values(project.artifactRegistry || {});
  }

  /**
   * Retrieves activity history for a project.
   */
  async getProjectActivity(projectId, userContext = null) {
    const project = await this.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    return {
      projectId: project.projectId,
      count: project.activityHistory?.length || 0,
      activityHistory: project.activityHistory || []
    };
  }

  /**
   * Purges generated studio projects and resets storage to a clean baseline for the specified tenant.
   * If tenantId is specified, restricts PostgreSQL deletion strictly to that tenant instead of global TRUNCATE.
   */
  async resetDemoProjects(tenantId = null) {
    if (this.repository && this.repository.pool) {
      try {
        if (tenantId) {
          // Tenant-scoped deletion avoiding global cross-tenant truncation
          await this.repository.pool.query(
            'DELETE FROM generation_artifacts WHERE project_id IN (SELECT project_id FROM generation_projects WHERE tenant_id = $1);',
            [tenantId]
          );
          await this.repository.pool.query(
            'DELETE FROM generation_specifications WHERE project_id IN (SELECT project_id FROM generation_projects WHERE tenant_id = $1);',
            [tenantId]
          );
          await this.repository.pool.query(
            'DELETE FROM generation_activity_events WHERE project_id IN (SELECT project_id FROM generation_projects WHERE tenant_id = $1);',
            [tenantId]
          );
          await this.repository.pool.query(
            'DELETE FROM generation_projects WHERE tenant_id = $1;',
            [tenantId]
          );
        } else {
          await this.repository.pool.query(
            'TRUNCATE TABLE generation_artifacts, generation_specifications, generation_projects CASCADE'
          );
        }
      } catch (err) {
        console.warn('[GenerationProjectStore] Postgres purge note:', err.message);
      }
    }

    await this._ensureStorageDir();
    let purgedCount = 0;
    try {
      const entries = await fs.promises.readdir(this.storageDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(this.storageDir, entry.name);
          const manifestPath = path.join(dirPath, 'project.json');
          let shouldDelete = true;
          if (tenantId && fs.existsSync(manifestPath)) {
            try {
              const meta = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
              if (meta.tenantId && meta.tenantId !== tenantId) {
                shouldDelete = false;
              }
            } catch {
              // ignore
            }
          }
          if (shouldDelete) {
            await fs.promises.rm(dirPath, { recursive: true, force: true });
            purgedCount++;
          }
        }
      }
    } catch (err) {
      console.warn('[GenerationProjectStore] Reset demo files purge error:', err.message);
    }

    this._writeLocks.clear();
    return { success: true, purgedCount };
  }
}

export const defaultGenerationProjectStore = new GenerationProjectStore();
