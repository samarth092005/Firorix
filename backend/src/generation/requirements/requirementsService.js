/**
 * Fiorify — Generation Studio Requirements Service (GEN-03)
 *
 * Implements requirement management, Discovery assessment import,
 * validation gate checks, and state transitions for Generation Projects.
 */

import {
  REQUIREMENT_CATEGORIES,
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STATUSES,
  REQUIREMENT_SOURCE_TYPES,
  createRequirementRecord,
  validateRequirementConfirmation
} from './requirementsContract.js';
import { defaultGenerationProjectStore } from '../projects/generationProjectStore.js';
import { defaultAssessmentStore } from '../../services/assessmentStore.js';
import { LIFECYCLE_STATUSES } from '../contracts/generationProjectContract.js';

export class RequirementsService {
  constructor(options = {}) {
    this.projectStore = options.projectStore || defaultGenerationProjectStore;
    this.assessmentStore = options.assessmentStore || defaultAssessmentStore;
  }

  /**
   * Retrieves all requirements for a project.
   */
  async listRequirements(projectId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const items = project.requirementsSpec?.items || [];
    const summary = this.computeRequirementsSummary(items);

    return {
      success: true,
      projectId,
      totalCount: items.length,
      summary,
      requirements: items
    };
  }

  /**
   * Retrieves a single requirement by ID.
   */
  async getRequirement(projectId, requirementId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const items = project.requirementsSpec?.items || [];
    const req = items.find((r) => r.requirementId === requirementId);
    if (!req) {
      const err = new Error(`Requirement "${requirementId}" was not found in project "${projectId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    return req;
  }

  /**
   * Creates and adds a new manual requirement to the project.
   */
  async createRequirement(projectId, payload = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const newReq = createRequirementRecord({
      ...payload,
      projectId
    }, userContext);

    const currentSpec = project.requirementsSpec || { specVersion: 1, items: [], status: 'EMPTY' };
    const items = [...(currentSpec.items || []), newReq];

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      items,
      status: items.length > 0 ? 'DRAFT_IN_PROGRESS' : 'EMPTY'
    };

    // If project was DRAFT, advance to REQUIREMENTS_IN_PROGRESS
    const patch = { requirementsSpec: nextSpec };
    if (project.lifecycleStatus === LIFECYCLE_STATUSES.DRAFT) {
      patch.lifecycleStatus = LIFECYCLE_STATUSES.REQUIREMENTS_IN_PROGRESS;
      patch.currentPhase = 'PHASE_2_REQUIREMENTS';
    }

    await this.projectStore.updateProject(projectId, patch, userContext);
    return newReq;
  }

  /**
   * Updates an existing requirement.
   */
  async updateRequirement(projectId, requirementId, patch = {}, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.requirementsSpec || { specVersion: 1, items: [] };
    const items = [...(currentSpec.items || [])];
    const index = items.findIndex((r) => r.requirementId === requirementId);

    if (index === -1) {
      const err = new Error(`Requirement "${requirementId}" was not found in project "${projectId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const existing = items[index];
    const now = new Date().toISOString();

    const updated = {
      ...existing,
      ...patch,
      requirementId: existing.requirementId, // Immutable
      projectId: existing.projectId,         // Immutable
      updatedAt: now,
      version: (existing.version || 1) + 1
    };

    items[index] = updated;

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      items
    };

    await this.projectStore.updateProject(projectId, { requirementsSpec: nextSpec }, userContext);
    return updated;
  }

  /**
   * Deletes a requirement safely.
   */
  async deleteRequirement(projectId, requirementId, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.requirementsSpec || { specVersion: 1, items: [] };
    const items = currentSpec.items || [];
    const index = items.findIndex((r) => r.requirementId === requirementId);

    if (index === -1) {
      const err = new Error(`Requirement "${requirementId}" was not found in project "${projectId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const removed = items.splice(index, 1)[0];

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      items,
      status: items.length > 0 ? currentSpec.status : 'EMPTY'
    };

    await this.projectStore.updateProject(projectId, { requirementsSpec: nextSpec }, userContext);
    return {
      success: true,
      deletedRequirementId: requirementId,
      remainingCount: items.length
    };
  }

  /**
   * Imports functional requirements and confirmed gaps from a Discovery assessment.
   * Server-authoritative: loads directly from AssessmentStore without trusting client.
   * Deterministic deduplication: avoids duplicate requirements on repeated imports.
   */
  async importFromAssessment(projectId, targetAssessmentId = null, userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const assessmentId = targetAssessmentId || project.sourceAssessmentId;
    if (!assessmentId) {
      const err = new Error(`Project "${projectId}" does not have an associated source assessment ID to import from.`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const assessment = await this.assessmentStore.getById(assessmentId);
    if (!assessment) {
      const err = new Error(`Assessment "${assessmentId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.requirementsSpec || { specVersion: 1, items: [], status: 'EMPTY' };
    const existingItems = currentSpec.items || [];

    // Existing signatures for deduplication
    const existingGapRefs = new Set(existingItems.map((r) => r.relatedGapReference).filter(Boolean));
    const existingTitles = new Set(existingItems.map((r) => r.title.toLowerCase().trim()));

    const importedRequirements = [];

    // 1. Extract identified functional gaps from assessment
    const gaps = Array.isArray(assessment.identifiedGaps) && assessment.identifiedGaps.length > 0
      ? assessment.identifiedGaps
      : (assessment.recommendation?.outstandingChecks || []);

    let gapIdx = 1;
    for (const rawGap of gaps) {
      const gapText = typeof rawGap === 'string' ? rawGap.trim() : (rawGap.description || rawGap.text || rawGap.title || '').trim();
      if (!gapText) continue;

      const gapRef = typeof rawGap === 'object' && rawGap.gapId ? rawGap.gapId : `GAP-${gapIdx}`;
      gapIdx++;

      // Deduplicate check
      if (existingGapRefs.has(gapRef) || existingTitles.has(gapText.toLowerCase())) {
        continue;
      }

      // Infer appropriate category based on keywords
      let category = REQUIREMENT_CATEGORIES.BUSINESS_RULE;
      const lower = gapText.toLowerCase();
      if (lower.includes('create') || lower.includes('entry') || lower.includes('post') || lower.includes('new')) {
        category = REQUIREMENT_CATEGORIES.DATA_CREATE;
      } else if (lower.includes('validat') || lower.includes('check') || lower.includes('rule') || lower.includes('require')) {
        category = REQUIREMENT_CATEGORIES.VALIDATION;
      } else if (lower.includes('display') || lower.includes('read') || lower.includes('list') || lower.includes('view')) {
        category = REQUIREMENT_CATEGORIES.DATA_READ;
      } else if (lower.includes('action') || lower.includes('release') || lower.includes('approve') || lower.includes('reject')) {
        category = REQUIREMENT_CATEGORIES.ACTION;
      } else if (lower.includes('auth') || lower.includes('pfcg') || lower.includes('role')) {
        category = REQUIREMENT_CATEGORIES.AUTHORIZATION;
      } else if (lower.includes('workflow') || lower.includes('ui') || lower.includes('screen')) {
        category = REQUIREMENT_CATEGORIES.UI_INTERACTION;
      }

      // If functional text is brief or unverified, require clarification
      const isBrief = gapText.length < 25;
      const status = isBrief ? REQUIREMENT_STATUSES.NEEDS_CLARIFICATION : REQUIREMENT_STATUSES.DRAFT;

      const req = createRequirementRecord({
        projectId,
        title: gapText.length > 60 ? `${gapText.slice(0, 57)}...` : gapText,
        description: gapText,
        requirementType: category === REQUIREMENT_CATEGORIES.AUTHORIZATION ? 'SECURITY' : 'FUNCTIONAL',
        category,
        priority: REQUIREMENT_PRIORITIES.MUST_HAVE,
        status,
        acceptanceCriteria: [
          `RAP business object enforces "${gapText}".`,
          `Custom Fiori elements UI exposes relevant fields and actions for this requirement.`
        ],
        sourceType: REQUIREMENT_SOURCE_TYPES.FIT_GAP_FINDING,
        sourceAssessmentReference: assessment.id,
        relatedGapReference: gapRef,
        relatedEvidenceReferences: [
          assessment.tcode ? `SAP T-Code: ${assessment.tcode}` : null,
          assessment.targetRelease ? `Target: ${assessment.targetRelease}` : null
        ].filter(Boolean),
        cleanCoreImpact: 'TIER_2_CLOUD_DEVELOPMENT',
        developerNotes: `Imported from Discovery Assessment ${assessment.id}. Identified as critical functional gap.`
      }, userContext);

      importedRequirements.push(req);
      existingGapRefs.add(gapRef);
      existingTitles.add(req.title.toLowerCase());
    }

    // 2. If no gaps existed, create a primary baseline requirement from the assessment itself
    if (importedRequirements.length === 0 && existingItems.length === 0) {
      const primaryReq = createRequirementRecord({
        projectId,
        title: `Custom RAP Modernization for ${assessment.tcode || 'Transaction'}`,
        description: assessment.description || `Build custom Clean Core Tier 2 RAP application to replace classic transaction ${assessment.tcode}.`,
        requirementType: 'FUNCTIONAL',
        category: REQUIREMENT_CATEGORIES.BUSINESS_RULE,
        priority: REQUIREMENT_PRIORITIES.MUST_HAVE,
        status: REQUIREMENT_STATUSES.DRAFT,
        acceptanceCriteria: [
          'Root RAP business entity provides full header management.',
          'Transactional behavior matches standard business object lifecycle.'
        ],
        sourceType: REQUIREMENT_SOURCE_TYPES.DISCOVERY_ASSESSMENT,
        sourceAssessmentReference: assessment.id,
        relatedGapReference: 'PRIMARY_GAP',
        cleanCoreImpact: 'TIER_2_CLOUD_DEVELOPMENT'
      }, userContext);

      importedRequirements.push(primaryReq);
    }

    const updatedItems = [...existingItems, ...importedRequirements];
    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      items: updatedItems,
      status: updatedItems.length > 0 ? 'DRAFT_IN_PROGRESS' : 'EMPTY'
    };

    const patch = { requirementsSpec: nextSpec };
    if (project.lifecycleStatus === LIFECYCLE_STATUSES.DRAFT) {
      patch.lifecycleStatus = LIFECYCLE_STATUSES.REQUIREMENTS_IN_PROGRESS;
      patch.currentPhase = 'PHASE_2_REQUIREMENTS';
    }

    await this.projectStore.updateProject(projectId, patch, userContext);

    return {
      success: true,
      assessmentId: assessment.id,
      importedCount: importedRequirements.length,
      totalCount: updatedItems.length,
      importedRequirements,
      requirements: updatedItems
    };
  }

  /**
   * Executes the confirmation gate on a requirement.
   * Actions: CONFIRM, DEFER, REJECT, REQUEST_CLARIFICATION
   */
  async confirmRequirement(projectId, requirementId, action = 'CONFIRM', reason = '', userContext = null) {
    const project = await this.projectStore.getProject(projectId, userContext);
    if (!project) {
      const err = new Error(`Project "${projectId}" was not found.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const currentSpec = project.requirementsSpec || { specVersion: 1, items: [] };
    const items = [...(currentSpec.items || [])];
    const index = items.findIndex((r) => r.requirementId === requirementId);

    if (index === -1) {
      const err = new Error(`Requirement "${requirementId}" was not found in project "${projectId}".`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    const req = items[index];
    const now = new Date().toISOString();
    const actorName = userContext?.name || userContext?.username || 'Lead SAP Architect';

    const normalizedAction = String(action).toUpperCase().trim();

    if (normalizedAction === 'CONFIRM') {
      const gateValidation = validateRequirementConfirmation(req, {
        comment: reason,
        reason
      });
      if (!gateValidation.isEligible) {
        const err = new Error(`Requirement confirmation blocked: ${gateValidation.issues.join('; ')}`);
        err.code = 'VALIDATION_ERROR';
        err.issues = gateValidation.issues;
        throw err;
      }

      req.status = REQUIREMENT_STATUSES.CONFIRMED;
      req.confirmationStatus = 'CONFIRMED';
      req.confirmedBy = actorName;
      req.confirmedAt = now;
      req.deferralOrRejectionReason = null;
    } else if (normalizedAction === 'DEFER') {
      if (!reason || !reason.trim()) {
        const err = new Error('A documented reason is mandatory when deferring a requirement.');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      req.status = REQUIREMENT_STATUSES.DEFERRED;
      req.confirmationStatus = 'DEFERRED';
      req.deferralOrRejectionReason = reason.trim();
    } else if (normalizedAction === 'REJECT') {
      if (!reason || !reason.trim()) {
        const err = new Error('A documented reason is mandatory when rejecting a requirement.');
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      req.status = REQUIREMENT_STATUSES.REJECTED;
      req.confirmationStatus = 'REJECTED';
      req.deferralOrRejectionReason = reason.trim();
    } else if (normalizedAction === 'REQUEST_CLARIFICATION') {
      req.status = REQUIREMENT_STATUSES.NEEDS_CLARIFICATION;
      req.confirmationStatus = 'UNCONFIRMED';
      if (reason && reason.trim()) {
        req.developerNotes = req.developerNotes ? `${req.developerNotes}\n[Clarification Needed]: ${reason.trim()}` : `[Clarification Needed]: ${reason.trim()}`;
      }
    } else {
      const err = new Error(`Invalid confirmation action "${action}". Allowed: CONFIRM, DEFER, REJECT, REQUEST_CLARIFICATION.`);
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    req.updatedAt = now;
    req.version = (req.version || 1) + 1;
    items[index] = req;

    const summary = this.computeRequirementsSummary(items);

    const nextSpec = {
      ...currentSpec,
      specVersion: (currentSpec.specVersion || 1) + 1,
      items,
      summary,
      status: summary.isGateSatisfied ? 'CONFIRMED' : 'DRAFT_IN_PROGRESS'
    };

    const patch = { requirementsSpec: nextSpec };

    // Advance project lifecycle if gate is satisfied and currently in DRAFT or REQUIREMENTS_IN_PROGRESS
    if (summary.isGateSatisfied && (project.lifecycleStatus === LIFECYCLE_STATUSES.REQUIREMENTS_IN_PROGRESS || project.lifecycleStatus === LIFECYCLE_STATUSES.DRAFT)) {
      patch.lifecycleStatus = LIFECYCLE_STATUSES.REQUIREMENTS_CONFIRMED;
    }

    await this.projectStore.updateProject(projectId, patch, userContext);

    return {
      success: true,
      requirement: req,
      summary
    };
  }

  /**
   * Computes structured summary statistics across requirements.
   */
  computeRequirementsSummary(items = []) {
    const totalCount = items.length;
    let confirmedCount = 0;
    let needsClarificationCount = 0;
    let deferredCount = 0;
    let rejectedCount = 0;
    let draftCount = 0;
    let mustHaveOutstandingCount = 0;

    for (const r of items) {
      if (r.status === REQUIREMENT_STATUSES.CONFIRMED) {
        confirmedCount++;
      } else if (r.status === REQUIREMENT_STATUSES.NEEDS_CLARIFICATION) {
        needsClarificationCount++;
      } else if (r.status === REQUIREMENT_STATUSES.DEFERRED) {
        deferredCount++;
      } else if (r.status === REQUIREMENT_STATUSES.REJECTED) {
        rejectedCount++;
      } else {
        draftCount++;
      }

      // Check must-have outstanding
      if (r.priority === REQUIREMENT_PRIORITIES.MUST_HAVE) {
        if (r.status === REQUIREMENT_STATUSES.DRAFT || r.status === REQUIREMENT_STATUSES.NEEDS_CLARIFICATION) {
          mustHaveOutstandingCount++;
        }
      }
    }

    const pendingCount = draftCount + needsClarificationCount;
    const isGateSatisfied = totalCount > 0 && mustHaveOutstandingCount === 0 && needsClarificationCount === 0;
    const allConfirmedOrResolved = totalCount > 0 && pendingCount === 0;

    return {
      totalCount,
      confirmedCount,
      needsClarificationCount,
      deferredCount,
      rejectedCount,
      draftCount,
      pendingCount,
      mustHaveOutstandingCount,
      isGateSatisfied,
      allConfirmedOrResolved
    };
  }
}

export const defaultRequirementsService = new RequirementsService();
