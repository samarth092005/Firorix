/**
 * FioriX — Generation Studio Requirements Data Contract & Schemas (GEN-03)
 *
 * Implements canonical schemas, enumerations, and validation for
 * business and technical requirements in Generation Studio.
 * Complies with S/4HANA 2023 Clean Core Tier 2 guidelines.
 */

import crypto from 'node:crypto';

export const REQUIREMENT_CATEGORIES = Object.freeze({
  BUSINESS: 'BUSINESS',
  FUNCTIONAL: 'FUNCTIONAL',
  TECHNICAL: 'TECHNICAL',
  NON_FUNCTIONAL: 'NON_FUNCTIONAL',
  DATA_READ: 'DATA_READ',
  DATA_CREATE: 'DATA_CREATE',
  DATA_UPDATE: 'DATA_UPDATE',
  DATA_DELETE: 'DATA_DELETE',
  BUSINESS_RULE: 'BUSINESS_RULE',
  VALIDATION: 'VALIDATION',
  DETERMINATION: 'DETERMINATION',
  ACTION: 'ACTION',
  UI_INTERACTION: 'UI_INTERACTION',
  AUTHORIZATION: 'AUTHORIZATION',
  REPORTING: 'REPORTING',
  INTEGRATION: 'INTEGRATION',
  OTHER: 'OTHER'
});

export const REQUIREMENT_PRIORITIES = Object.freeze({
  MUST_HAVE: 'MUST_HAVE',
  SHOULD_HAVE: 'SHOULD_HAVE',
  NICE_TO_HAVE: 'NICE_TO_HAVE'
});

export const REQUIREMENT_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  NEEDS_CLARIFICATION: 'NEEDS_CLARIFICATION',
  CONFIRMED: 'CONFIRMED',
  DEFERRED: 'DEFERRED',
  REJECTED: 'REJECTED'
});

export const REQUIREMENT_SOURCE_TYPES = Object.freeze({
  DISCOVERY_ASSESSMENT: 'DISCOVERY_ASSESSMENT',
  FIT_GAP_FINDING: 'FIT_GAP_FINDING',
  MANUAL_INPUT: 'MANUAL_INPUT',
  DEVELOPER_REVIEW: 'DEVELOPER_REVIEW'
});

export const REQUIREMENT_TYPES = Object.freeze({
  FUNCTIONAL: 'FUNCTIONAL',
  NON_FUNCTIONAL: 'NON_FUNCTIONAL',
  SECURITY: 'SECURITY',
  INTEGRATION: 'INTEGRATION',
  REPORTING: 'REPORTING'
});

export const CLEAN_CORE_IMPACTS = Object.freeze({
  TIER_1_CORE_CLEAN: 'TIER_1_CORE_CLEAN',
  TIER_2_CLOUD_DEVELOPMENT: 'TIER_2_CLOUD_DEVELOPMENT',
  TIER_3_CLASSIC_EXT: 'TIER_3_CLASSIC_EXT',
  NOT_EVALUATED: 'NOT_EVALUATED'
});

/**
 * Normalizes and creates a validated requirement object.
 */
export function createRequirementRecord(input = {}, userContext = null) {
  const title = String(input.title || '').trim();
  if (!title) {
    const err = new Error('Requirement title is required and cannot be empty.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const description = String(input.description || '').trim();
  if (!description) {
    const err = new Error('Requirement description is required.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const randSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const requirementId = input.requirementId || `REQ-${Date.now()}-${randSuffix}`;

  const category = REQUIREMENT_CATEGORIES[input.category] || REQUIREMENT_CATEGORIES.OTHER;
  const priority = REQUIREMENT_PRIORITIES[input.priority] || REQUIREMENT_PRIORITIES.SHOULD_HAVE;
  const status = REQUIREMENT_STATUSES[input.status] || REQUIREMENT_STATUSES.DRAFT;
  const sourceType = REQUIREMENT_SOURCE_TYPES[input.sourceType] || REQUIREMENT_SOURCE_TYPES.MANUAL_INPUT;
  const requirementType = REQUIREMENT_TYPES[input.requirementType] || REQUIREMENT_TYPES.FUNCTIONAL;
  const cleanCoreImpact = CLEAN_CORE_IMPACTS[input.cleanCoreImpact] || CLEAN_CORE_IMPACTS.TIER_2_CLOUD_DEVELOPMENT;

  const now = new Date().toISOString();
  const actorName = userContext?.name || userContext?.username || input.createdBy || 'Lead SAP Architect';

  const rawCriteria = Array.isArray(input.acceptanceCriteria) ? input.acceptanceCriteria : [];
  const acceptanceCriteria = rawCriteria
    .map((c) => String(c).trim())
    .filter((c) => c.length > 0);

  return {
    id: requirementId,
    requirementId,
    projectId: input.projectId,
    title,
    description,
    requirementType,
    category,
    priority,
    status,
    acceptanceCriteria,
    sourceType,
    sourceAssessmentReference: input.sourceAssessmentReference || null,
    relatedGapReference: input.relatedGapReference || null,
    relatedEvidenceReferences: Array.isArray(input.relatedEvidenceReferences) ? input.relatedEvidenceReferences : [],
    relatedEntities: Array.isArray(input.relatedEntities) ? input.relatedEntities : [],
    cleanCoreImpact,
    developerNotes: input.developerNotes ? String(input.developerNotes).trim() : '',
    confirmationStatus: status === REQUIREMENT_STATUSES.CONFIRMED ? 'CONFIRMED' : (status === REQUIREMENT_STATUSES.DEFERRED ? 'DEFERRED' : (status === REQUIREMENT_STATUSES.REJECTED ? 'REJECTED' : 'UNCONFIRMED')),
    deferralOrRejectionReason: input.deferralOrRejectionReason || null,
    confirmedBy: status === REQUIREMENT_STATUSES.CONFIRMED ? actorName : null,
    confirmedAt: status === REQUIREMENT_STATUSES.CONFIRMED ? now : null,
    createdAt: input.createdAt || now,
    updatedAt: now,
    version: Number.isInteger(input.version) ? input.version : 1
  };
}

/**
 * Validates a requirement against confirmation gate rules.
 */
export function validateRequirementConfirmation(requirement, options = {}) {
  const issues = [];

  if (!requirement.title || !requirement.title.trim()) {
    issues.push('Requirement title is missing or empty.');
  }

  if (!requirement.description || requirement.description.trim().length < 10) {
    issues.push('Requirement description is insufficient (minimum 10 characters required for architectural review).');
  }

  if (!Array.isArray(requirement.acceptanceCriteria) || requirement.acceptanceCriteria.length === 0) {
    issues.push('Mandatory acceptance criteria are missing. At least one explicit verifiable acceptance criterion is required.');
  }

  const hasResolutionComment = Boolean((options.comment && options.comment.trim()) || (options.reason && options.reason.trim()) || options.hasClarificationComment);
  if (requirement.status === REQUIREMENT_STATUSES.NEEDS_CLARIFICATION && !hasResolutionComment) {
    issues.push('Requirement is marked as NEEDS_CLARIFICATION. Clarification comment or justification must be provided before confirmation.');
  }

  return {
    isEligible: issues.length === 0,
    issues
  };
}
