/**
 * Fiorify — Generation Project Validator (P1-B)
 *
 * Implements validation guardrails for Generation Studio projects:
 * - Strict Project ID validation (prevents path traversal and shell injection)
 * - Payload structure and data type validation
 * - Origin validation (DISCOVERY_BUILD vs STANDALONE vs TEMPLATE)
 * - Safe path resolution within storage boundaries
 */

import path from 'node:path';
import {
  PROJECT_ORIGINS,
  LIFECYCLE_STATUSES,
  TARGET_DEPLOYMENT_MODELS
} from '../contracts/generationProjectContract.js';

const PROJECT_ID_REGEX = /^[A-Za-z0-9_-]{3,64}$/;

/**
 * Validates a Project ID string.
 * Must match [A-Za-z0-9_-]{3,64} and contain no path separators or traversal elements.
 */
export function validateProjectId(projectId) {
  if (!projectId || typeof projectId !== 'string') {
    return {
      isValid: false,
      error: 'Project ID is required and must be a non-empty string.'
    };
  }

  const trimmed = projectId.trim();

  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
    return {
      isValid: false,
      error: 'Project ID must not contain directory traversal characters or slashes.'
    };
  }

  if (!PROJECT_ID_REGEX.test(trimmed)) {
    return {
      isValid: false,
      error: 'Project ID must be between 3 and 64 alphanumeric characters, underscores, or hyphens (e.g. "GEN-ME21N-001").'
    };
  }

  return { isValid: true, sanitizedId: trimmed };
}

/**
 * Validates that a target path is strictly contained within the base directory.
 * Throws an error on path traversal attempts.
 */
export function assertSafePath(baseDir, targetPath) {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(targetPath);

  if (!resolvedTarget.startsWith(resolvedBase + path.sep) && resolvedTarget !== resolvedBase) {
    const err = new Error(`Access Denied: Path traversal detected outside storage boundary: "${targetPath}"`);
    err.code = 'PATH_TRAVERSAL_DETECTED';
    throw err;
  }

  return resolvedTarget;
}

/**
 * Validates payload for project creation.
 */
export function validateCreateProjectPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      isValid: false,
      error: 'Request body must be a JSON object.'
    };
  }

  if (!payload.projectName || typeof payload.projectName !== 'string' || !payload.projectName.trim()) {
    return {
      isValid: false,
      error: 'projectName is required as a non-empty string.'
    };
  }

  const origin = payload.origin || (payload.sourceAssessmentId ? PROJECT_ORIGINS.DISCOVERY_BUILD : PROJECT_ORIGINS.STANDALONE);

  if (!Object.values(PROJECT_ORIGINS).includes(origin)) {
    return {
      isValid: false,
      error: `Invalid origin "${origin}". Must be one of: ${Object.values(PROJECT_ORIGINS).join(', ')}.`
    };
  }

  if (origin === PROJECT_ORIGINS.DISCOVERY_BUILD) {
    if (!payload.sourceAssessmentId || typeof payload.sourceAssessmentId !== 'string' || !payload.sourceAssessmentId.trim()) {
      return {
        isValid: false,
        error: 'sourceAssessmentId is required for projects with origin DISCOVERY_BUILD.'
      };
    }
  }

  if (payload.projectId) {
    const idCheck = validateProjectId(payload.projectId);
    if (!idCheck.isValid) {
      return idCheck;
    }
  }

  if (payload.targetDeploymentModel && !Object.values(TARGET_DEPLOYMENT_MODELS).includes(payload.targetDeploymentModel)) {
    return {
      isValid: false,
      error: `Invalid targetDeploymentModel "${payload.targetDeploymentModel}". Must be one of: ${Object.values(TARGET_DEPLOYMENT_MODELS).join(', ')}.`
    };
  }

  return { isValid: true, origin };
}

/**
 * Validates patch payload for project updates.
 * Prevents modifications to immutable fields.
 */
export function validateUpdateProjectPayload(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return {
      isValid: false,
      error: 'Patch body must be a JSON object.'
    };
  }

  const IMMUTABLE_FIELDS = ['projectId', 'createdAt', 'createdBy', 'creatorId', 'schemaVersion', 'origin', 'sourceAssessmentId'];

  for (const field of IMMUTABLE_FIELDS) {
    if (patch[field] !== undefined) {
      return {
        isValid: false,
        error: `Field "${field}" is immutable and cannot be updated.`
      };
    }
  }

  if (patch.projectName !== undefined) {
    if (typeof patch.projectName !== 'string' || !patch.projectName.trim()) {
      return {
        isValid: false,
        error: 'projectName must be a non-empty string if provided.'
      };
    }
  }

  if (patch.lifecycleStatus !== undefined) {
    if (!Object.values(LIFECYCLE_STATUSES).includes(patch.lifecycleStatus)) {
      return {
        isValid: false,
        error: `Invalid lifecycleStatus "${patch.lifecycleStatus}". Must be one of: ${Object.values(LIFECYCLE_STATUSES).join(', ')}.`
      };
    }
  }

  return { isValid: true };
}
