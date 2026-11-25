/**
 * Fiorify — Security Middleware & Request Sanitation Utilities (SEC-004)
 *
 * Enforces rejection or sanitization of client-controlled security fields:
 * - createdBy, creatorId, creatorRole
 * - tenantId (must strictly be inferred from verified token/context)
 * - approvedBy, approvalStatus, approvalSignature, architectApproved, leadArchitectApproval
 * - auditEvents, auditHistory
 * - isAdmin, roles, permissions, scopes
 * - trustedScore, verifiedEvidence, isProductionReady
 */

export const PROTECTED_SECURITY_FIELDS = Object.freeze([
  'createdBy',
  'creatorId',
  'creatorRole',
  'tenantId',
  'approvedBy',
  'approverId',
  'approverName',
  'approvalStatus',
  'approvalSignature',
  'architectApproved',
  'leadArchitectApproval',
  'lifecycleStatus',
  'lifecycleState',
  'auditEvents',
  'auditHistory',
  'auditMetadata',
  'trustedTimestamps',
  'createdAt',
  'updatedAt',
  'approvedAt',
  'handoffAuthorization',
  'generationAuthorization',
  'isAdmin',
  'roles',
  'permissions',
  'scopes',
  'trustedScore',
  'verifiedEvidence',
  'isProductionReady'
]);

/**
 * Sanitizes an object by stripping or detecting client-supplied protected security fields.
 *
 * @param {Record<string, any>} payload - Client request body
 * @param {object} options
 * @param {boolean} [options.strict=false] - If true, throws Error on finding protected fields
 * @param {string[]} [options.allowedFields=[]] - Specific fields permitted in this context
 * @returns {Record<string, any>} Sanitized payload clone
 */
export function sanitizeProtectedFields(payload, options = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  const { strict = false, allowedFields = [] } = options;
  const sanitized = { ...payload };
  const detectedViolations = [];

  for (const field of PROTECTED_SECURITY_FIELDS) {
    if (field in sanitized && !allowedFields.includes(field)) {
      detectedViolations.push(field);
      delete sanitized[field];
    }
  }

  if (typeof options.onViolation === 'function' && detectedViolations.length > 0) {
    options.onViolation(detectedViolations);
  }

  if (strict && detectedViolations.length > 0) {
    const error = new Error(
      `Security Violation: Request contains unauthorized protected security field(s): ${detectedViolations.join(', ')}`
    );
    error.code = 'SECURITY_FIELD_INJECTION';
    error.detectedFields = detectedViolations;
    throw error;
  }

  return sanitized;
}

/**
 * Middleware/helper to sanitize incoming payload for controllers.
 * Strips client-forged security attributes and attaches server-authoritative tenant/user context.
 *
 * @param {Record<string, any>} payload
 * @param {object} userContext
 * @returns {Record<string, any>}
 */
export function enforceAuthoritativeContext(payload, userContext = null) {
  const clean = sanitizeProtectedFields(payload, { strict: false });

  if (userContext && !userContext.isUnauthenticated) {
    clean.tenantId = userContext.tenantId || 'DEFAULT-TENANT-S21';
    clean.authorId = userContext.id || userContext.userId || 'system';
    clean.author = userContext.name || userContext.email || userContext.id || 'system';
    clean.actorRole = userContext.role || 'VIEWER';
  }

  return clean;
}
