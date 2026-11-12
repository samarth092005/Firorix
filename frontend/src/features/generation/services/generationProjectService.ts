/**
 * FioriX — Frontend Generation Project Service (GEN-02, GEN-03, GEN-04)
 *
 * Communicates with backend /api/v1/generation REST endpoints.
 * Provides client-side methods for Projects, Requirements, and Data Model designers.
 */

import {
  GenerationProject,
  CreateProjectPayload,
  ProjectSummary,
  ActivityEvent,
  ProjectOrigin,
  ProjectLifecycleStatus,
  GenerationRequirement,
  RequirementsSummary,
  RequirementsSpec,
  GenerationEntity,
  GenerationField,
  GenerationRelationship,
  DataModelSpec,
  DataModelValidationReport,
  CdsRegistryEntry,
  AssessmentHandoffContext,
  ArchitectureSpec,
  GeneratedArtifact,
  GenerationRun,
  StaticValidationReport,
  TraceabilityItem,
  PreviewSessionInfo,
  PreviewRequestLog,
  ExportReadinessResult,
  FullTraceabilityReport,
  ExportPackageResult,
  ToolchainReport,
  DeveloperHandoverGuide
} from '../types';

const API_PROJECTS = '/api/v1/generation/projects';
const API_GEN_BASE = '/api/v1/generation';

export interface ListProjectsParams {
  search?: string;
  lifecycleStatus?: ProjectLifecycleStatus | 'ALL';
  origin?: ProjectOrigin | 'ALL';
  page?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
}

export interface ListProjectsResponse {
  success: boolean;
  total: number;
  count: number;
  page: number;
  pageSize: number;
  projects: GenerationProject[];
}

export class FrontendGenerationProjectService {
  /**
   * Lists generation projects with search, filter, and pagination support.
   */
  async listProjects(params: ListProjectsParams = {}): Promise<ListProjectsResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.lifecycleStatus && params.lifecycleStatus !== 'ALL') query.set('lifecycleStatus', params.lifecycleStatus);
    if (params.origin && params.origin !== 'ALL') query.set('origin', params.origin);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);

    const url = `${API_PROJECTS}${query.toString() ? `?${query.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.errorMessage || `Failed to fetch projects (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data;
  }

  /**
   * Retrieves a single project by ID.
   */
  async getProject(projectId: string): Promise<GenerationProject> {
    if (!projectId || !projectId.trim()) {
      throw new Error('Project ID is required.');
    }

    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId.trim())}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.errorMessage || `Project "${projectId}" not found (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.project;
  }

  /**
   * Creates a new generation project (Standalone or from Approved Assessment Handoff).
   */
  async createProject(payload: CreateProjectPayload): Promise<{ project: GenerationProject; alreadyExists?: boolean; message?: string }> {
    const res = await fetch(API_PROJECTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || data.error || `Project creation failed (HTTP ${res.status})`);
    }

    return {
      project: data.project,
      alreadyExists: Boolean(data.alreadyExists),
      message: data.message
    };
  }

  /**
   * Updates project metadata or specification.
   */
  async updateProject(projectId: string, patch: Record<string, any>): Promise<GenerationProject> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId.trim())}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to update project "${projectId}" (HTTP ${res.status})`);
    }

    return data.project;
  }

  /**
   * Retrieves project summary telemetry.
   */
  async getProjectSummary(projectId: string): Promise<ProjectSummary> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId.trim())}/summary`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.errorMessage || `Failed to fetch project summary (HTTP ${res.status})`);
    }

    const data = await res.json();
    return data.summary;
  }

  /**
   * Duplicates an existing project.
   */
  async duplicateProject(projectId: string, payload: { newProjectName?: string } = {}): Promise<GenerationProject> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId.trim())}/duplicate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to duplicate project (HTTP ${res.status})`);
    }

    return data.project;
  }

  /**
   * Retrieves activity history for a project.
   */
  async getProjectActivity(projectId: string): Promise<{ count: number; activityHistory: ActivityEvent[]; activity: ActivityEvent[] }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId.trim())}/activity`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.errorMessage || `Failed to fetch activity history (HTTP ${res.status})`);
    }

    const data = await res.json();
    const activity = data.activity || data.activityHistory || [];
    return {
      count: data.count !== undefined ? data.count : activity.length,
      activityHistory: activity,
      activity
    };
  }

  /**
   * Archives a project.
   */
  async archiveProject(projectId: string, reason?: string): Promise<GenerationProject> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId.trim())}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to archive project "${projectId}" (HTTP ${res.status})`);
    }

    return data.project;
  }

  /**
   * Restores an archived project back to DRAFT.
   */
  async restoreProject(projectId: string, reason?: string): Promise<GenerationProject> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId.trim())}/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to restore project "${projectId}" (HTTP ${res.status})`);
    }

    return data.project;
  }

  /**
   * Permanently deletes a project.
   */
  async deleteProject(projectId: string, confirmed: boolean = false): Promise<boolean> {
    const query = confirmed ? '?confirmed=true' : '';
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId.trim())}${query}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmed })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to delete project "${projectId}" (HTTP ${res.status})`);
    }

    return true;
  }

  // ============================================================
  // GEN-01 / SPRINT 1: HANDOFF & PROJECT PROVISIONING
  // ============================================================

  /**
   * Retrieves a persisted generation handoff record by handoffId.
   */
  async getHandoff(handoffId: string): Promise<any> {
    if (!handoffId || !handoffId.trim()) {
      throw new Error('Handoff ID is required.');
    }
    const res = await fetch(`${API_GEN_BASE}/handoff/${encodeURIComponent(handoffId.trim())}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to retrieve handoff "${handoffId}" (HTTP ${res.status})`);
    }
    return data.handoff;
  }

  /**
   * Idempotently resolves or provisions a generation project from an approved handoff.
   */
  async provisionProjectFromHandoff(handoffId: string): Promise<{ project: GenerationProject; alreadyExists: boolean; message?: string }> {
    if (!handoffId || !handoffId.trim()) {
      throw new Error('Handoff ID is required to provision a project.');
    }
    const res = await fetch(API_PROJECTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: 'DISCOVERY_BUILD',
        handoffId: handoffId.trim()
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || data.error || `Failed to provision project from handoff (HTTP ${res.status})`);
    }
    return {
      project: data.project,
      alreadyExists: Boolean(data.alreadyExists),
      message: data.message
    };
  }

  // ============================================================
  // GEN-02: ASSESSMENT CONTEXT RESOLUTION
  // ============================================================

  /**
   * Resolves server-authoritative assessment context and BUILD eligibility.
   */
  async getAssessmentContext(assessmentId: string): Promise<AssessmentHandoffContext> {
    const res = await fetch(`${API_GEN_BASE}/context/${encodeURIComponent(assessmentId.trim())}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to resolve assessment context (HTTP ${res.status})`);
    }
    return data;
  }

  // ============================================================
  // GEN-03: REQUIREMENTS DESIGNER
  // ============================================================

  /**
   * Lists requirements for a project along with summary stats.
   */
  async listRequirements(projectId: string): Promise<{ requirements: GenerationRequirement[]; summary: RequirementsSummary }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/requirements`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to list requirements (HTTP ${res.status})`);
    }
    return {
      requirements: data.requirements || [],
      summary: data.summary || {
        totalCount: 0,
        confirmedCount: 0,
        needsClarificationCount: 0,
        deferredCount: 0,
        rejectedCount: 0,
        draftCount: 0,
        pendingCount: 0,
        mustHaveOutstandingCount: 0,
        isGateSatisfied: false,
        allConfirmedOrResolved: false
      }
    };
  }

  /**
   * Creates a new manual requirement.
   */
  async createRequirement(projectId: string, payload: Partial<GenerationRequirement>): Promise<{ requirement: GenerationRequirement }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to create requirement (HTTP ${res.status})`);
    }
    return { requirement: data.requirement };
  }

  /**
   * Updates an existing requirement.
   */
  async updateRequirement(projectId: string, requirementId: string, patch: Partial<GenerationRequirement>): Promise<{ requirement: GenerationRequirement }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to update requirement (HTTP ${res.status})`);
    }
    return { requirement: data.requirement };
  }

  /**
   * Deletes a requirement.
   */
  async deleteRequirement(projectId: string, requirementId: string): Promise<boolean> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to delete requirement (HTTP ${res.status})`);
    }
    return true;
  }

  /**
   * Imports functional requirements and confirmed gaps from the Discovery assessment.
   */
  async importRequirementsFromAssessment(projectId: string, assessmentId?: string): Promise<{ importedCount: number; requirements: GenerationRequirement[] }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/requirements/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to import requirements from assessment (HTTP ${res.status})`);
    }
    return {
      importedCount: data.importedCount || 0,
      requirements: data.requirements || data.importedRequirements || []
    };
  }

  /**
   * Executes the confirmation gate on a requirement (CONFIRM, DEFER, REJECT, REQUEST_CLARIFICATION).
   */
  async confirmRequirement(
    projectId: string,
    requirementId: string,
    action: 'CONFIRM' | 'DEFER' | 'REJECT' | 'REQUEST_CLARIFICATION',
    comment?: string
  ): Promise<{ requirement: GenerationRequirement; summary: RequirementsSummary }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason: comment, comment })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to ${action.toLowerCase()} requirement (HTTP ${res.status})`);
    }
    return {
      requirement: data.requirement,
      summary: data.summary
    };
  }

  // ============================================================
  // GEN-04: DATA MODEL DESIGNER
  // ============================================================

  /**
   * Retrieves the current data model specification for a project.
   */
  async getDataModel(projectId: string): Promise<{ dataModel: DataModelSpec }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to get data model (HTTP ${res.status})`);
    }
    return {
      dataModel: data.dataModel || {
        specVersion: 1,
        entities: [],
        relationships: [],
        status: 'EMPTY'
      }
    };
  }

  /**
   * Saves the entire data model specification for a project.
   */
  async saveDataModel(projectId: string, dataModel: Partial<DataModelSpec>): Promise<{ dataModel: DataModelSpec }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dataModel)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to save data model (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Requests an evidence-driven Data Model suggestion from discovery facts.
   */
  async suggestDataModel(projectId: string, options: Record<string, any> = {}): Promise<{
    success: boolean;
    suggestedDataModel: {
      rootEntity: string;
      entities: GenerationEntity[];
      relationships: GenerationRelationship[];
      missingEvidence: string[];
      provenanceSummary: {
        verifiedCount: number;
        inferredCount: number;
        missingEvidenceCount: number;
      };
    };
  }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to generate data model suggestion (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Adds an entity to the data model.
   */
  async addEntity(projectId: string, entity: Partial<GenerationEntity>): Promise<{ entity: GenerationEntity }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entity)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to add entity (HTTP ${res.status})`);
    }
    return { entity: data.entity };
  }

  /**
   * Updates an existing entity.
   */
  async updateEntity(projectId: string, entityId: string, patch: Partial<GenerationEntity>): Promise<{ entity: GenerationEntity }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/entities/${encodeURIComponent(entityId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to update entity (HTTP ${res.status})`);
    }
    return { entity: data.entity };
  }

  /**
   * Deletes an entity.
   */
  async deleteEntity(projectId: string, entityId: string): Promise<boolean> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/entities/${encodeURIComponent(entityId)}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to delete entity (HTTP ${res.status})`);
    }
    return true;
  }

  /**
   * Adds a field to an entity.
   */
  async addField(projectId: string, entityId: string, field: Partial<GenerationField>): Promise<{ field: GenerationField }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/entities/${encodeURIComponent(entityId)}/fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(field)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to add field (HTTP ${res.status})`);
    }
    return { field: data.field };
  }

  /**
   * Updates a field on an entity.
   */
  async updateField(projectId: string, entityId: string, fieldId: string, patch: Partial<GenerationField>): Promise<{ field: GenerationField }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/entities/${encodeURIComponent(entityId)}/fields/${encodeURIComponent(fieldId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to update field (HTTP ${res.status})`);
    }
    return { field: data.field };
  }

  /**
   * Deletes a field from an entity.
   */
  async deleteField(projectId: string, entityId: string, fieldId: string): Promise<boolean> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/entities/${encodeURIComponent(entityId)}/fields/${encodeURIComponent(fieldId)}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to delete field (HTTP ${res.status})`);
    }
    return true;
  }

  /**
   * Adds a relationship between entities.
   */
  async addRelationship(projectId: string, relationship: Partial<GenerationRelationship>): Promise<{ relationship: GenerationRelationship }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/relationships`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(relationship)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to add relationship (HTTP ${res.status})`);
    }
    return { relationship: data.relationship };
  }

  /**
   * Deletes a relationship.
   */
  async deleteRelationship(projectId: string, relationshipId: string): Promise<boolean> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/relationships/${encodeURIComponent(relationshipId)}`, {
      method: 'DELETE'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to delete relationship (HTTP ${res.status})`);
    }
    return true;
  }

  /**
   * Validates the data model against structural, relationship, SAP compatibility, and business rules.
   */
  async validateDataModel(projectId: string): Promise<{ validationReport: DataModelValidationReport }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/data-model/validate`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Data model validation failed (HTTP ${res.status})`);
    }
    return { validationReport: data.validationReport || data.report };
  }

  /**
   * Searches the SAP standard CDS view reuse registry.
   */
  async searchCdsRegistry(query: string = '', category: string = ''): Promise<{ views: CdsRegistryEntry[] }> {
    const q = new URLSearchParams();
    if (query) q.set('query', query);
    if (category) q.set('category', category);
    const res = await fetch(`${API_GEN_BASE}/cds-registry?${q.toString()}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to query CDS registry (HTTP ${res.status})`);
    }
    return { views: data.views || data.entries || [] };
  }

  // ==========================================
  // GEN-05 & GEN-06 EXTENSIONS
  // ==========================================

  /**
   * Evaluates or recalculates the RAP architecture specification.
   */
  async evaluateArchitecture(projectId: string, overrides: any = {}): Promise<{ architecture: ArchitectureSpec; lifecycleStatus: string }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/architecture/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Architecture evaluation failed (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Retrieves the architecture specification for a project.
   */
  async getArchitecture(projectId: string): Promise<{ architecture: ArchitectureSpec; lifecycleStatus: string }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/architecture`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to fetch architecture (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Updates user-defined architecture configuration.
   */
  async updateArchitecture(projectId: string, patch: any): Promise<{ architecture: ArchitectureSpec; lifecycleStatus: string }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/architecture`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to update architecture (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Synthesizes all ABAP RAP artifacts.
   */
  async generateAbap(projectId: string, options: any = {}): Promise<{ totalGenerated: number; artifacts: GeneratedArtifact[]; runRecord: GenerationRun }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/abap/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `ABAP generation failed (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Regenerates ABAP artifacts, supporting selective single-artifact regeneration.
   */
  async regenerateAbap(projectId: string, options: any = {}): Promise<{ totalGenerated: number; artifacts: GeneratedArtifact[]; runRecord: GenerationRun }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/abap/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `ABAP regeneration failed (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Synthesizes SAP Fiori Elements application.
   */
  async generateFiori(projectId: string, config: any = {}): Promise<{ totalGenerated: number; artifacts: GeneratedArtifact[]; runRecord: GenerationRun }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/fiori/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Fiori generation failed (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Retrieves all generated artifacts from the shared registry.
   */
  async getArtifacts(projectId: string): Promise<{ count: number; artifacts: GeneratedArtifact[]; version: number }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/artifacts`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to fetch artifacts (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Updates an artifact's content, tracking developer manual edits.
   */
  async updateArtifact(projectId: string, artifactId: string, content: string): Promise<{ artifact: GeneratedArtifact; manualEditStatus: string }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to update artifact (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Restores a manually modified artifact back to its original generated template version.
   */
  async restoreArtifact(projectId: string, artifactId: string): Promise<{ artifact: GeneratedArtifact }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactId)}/restore`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to restore artifact (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Retrieves generation execution runs history.
   */
  async getGenerationRuns(projectId: string): Promise<{ generationRuns: GenerationRun[] }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/generation-runs`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to fetch generation runs (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Retrieves the requirements-to-artifacts traceability matrix.
   */
  async getTraceability(projectId: string): Promise<{ traceabilityMatrix: TraceabilityItem[] }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/traceability`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Failed to fetch traceability (HTTP ${res.status})`);
    }
    return data;
  }

  /**
   * Runs the static validation engine across all project artifacts.
   */
  async validateGeneration(projectId: string): Promise<{ validationReport: StaticValidationReport }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/validate-generation`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.errorMessage || `Static validation failed (HTTP ${res.status})`);
    }
    return data;
  }

  // =========================================================================
  // GEN-07: Preview & Mock OData V4 Methods
  // =========================================================================

  async startPreview(projectId: string): Promise<{ session: PreviewSessionInfo }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/preview/start`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to start preview (HTTP ${res.status})`);
    return data;
  }

  async stopPreview(projectId: string): Promise<{ result: any }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/preview/stop`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to stop preview (HTTP ${res.status})`);
    return data;
  }

  async restartPreview(projectId: string): Promise<{ session: PreviewSessionInfo }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/preview/restart`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to restart preview (HTTP ${res.status})`);
    return data;
  }

  async getPreviewStatus(projectId: string): Promise<{ previewStatus: PreviewSessionInfo }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/preview/status`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to fetch preview status (HTTP ${res.status})`);
    return data;
  }

  async getPreviewRequests(projectId: string): Promise<{ requests: PreviewRequestLog[] }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/preview/requests`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to fetch preview requests (HTTP ${res.status})`);
    return data;
  }

  async resetSyntheticData(projectId: string): Promise<{ result: any }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/preview/synthetic-data/reset`, {
      method: 'POST'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to reset synthetic data (HTTP ${res.status})`);
    return data;
  }

  // =========================================================================
  // GEN-08: Review, Governance & Export Methods
  // =========================================================================

  async getExportReadiness(projectId: string, acknowledgedWarnings = false): Promise<{ readiness: ExportReadinessResult }> {
    const query = acknowledgedWarnings ? '?acknowledgedWarnings=true' : '';
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/review/readiness${query}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to check export readiness (HTTP ${res.status})`);
    return data;
  }

  async getTraceabilityReport(projectId: string): Promise<{ report: FullTraceabilityReport }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/traceability-matrix`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to fetch traceability matrix (HTTP ${res.status})`);
    return data;
  }

  async packageExport(projectId: string, options: { acknowledgedWarnings?: boolean } = {}): Promise<ExportPackageResult> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Export failed (HTTP ${res.status})`);
    return data;
  }

  getDownloadExportUrl(projectId: string, filename: string): string {
    return `${API_PROJECTS}/${encodeURIComponent(projectId)}/exports/${encodeURIComponent(filename)}/download`;
  }

  // =========================================================================
  // GEN-09: Developer Toolchain & Readiness Methods
  // =========================================================================

  async getToolchainStatus(): Promise<{ toolchain: ToolchainReport }> {
    const res = await fetch(`${API_GEN_BASE}/toolchain/status`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to fetch toolchain status (HTTP ${res.status})`);
    return data;
  }

  async getHandoverGuide(projectId: string): Promise<{ handoverGuide: DeveloperHandoverGuide }> {
    const res = await fetch(`${API_PROJECTS}/${encodeURIComponent(projectId)}/handover-guide`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.errorMessage || `Failed to fetch handover guide (HTTP ${res.status})`);
    return data;
  }
}

export const defaultFrontendGenerationProjectService = new FrontendGenerationProjectService();
export const frontendGenerationProjectService = defaultFrontendGenerationProjectService;
