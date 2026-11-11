/**
 * FioriX — Generation Project Lifecycle State Machine (P1-B)
 *
 * Enforces controlled state transitions for Generation Projects:
 * - DRAFT (Initial)
 * - REQUIREMENTS_IN_PROGRESS
 * - DESIGN_IN_PROGRESS
 * - READY_FOR_GENERATION
 * - GENERATION_IN_PROGRESS
 * - GENERATED
 * - VALIDATION_IN_PROGRESS
 * - VALIDATION_COMPLETED
 * - REVIEW_IN_PROGRESS
 * - REVIEW_COMPLETED
 * - EXPORTED
 * - ARCHIVED
 *
 * In Phase 1 (Workspace Foundation):
 * - Direct jumps to GENERATED, VALIDATION_COMPLETED, EXPORTED are strictly rejected.
 * - Archiving is permitted from any non-archived state.
 * - Restoring returns to the previous active status or DRAFT.
 * - Modification of archived projects is blocked.
 */

import { LIFECYCLE_STATUSES } from '../contracts/generationProjectContract.js';

export const ALLOWED_PROJECT_TRANSITIONS = Object.freeze({
  [LIFECYCLE_STATUSES.DRAFT]: [
    LIFECYCLE_STATUSES.REQUIREMENTS_IN_PROGRESS,
    LIFECYCLE_STATUSES.READY_FOR_GENERATION,
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.REQUIREMENTS_IN_PROGRESS]: [
    LIFECYCLE_STATUSES.DRAFT,
    LIFECYCLE_STATUSES.REQUIREMENTS_CONFIRMED,
    LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.REQUIREMENTS_CONFIRMED]: [
    LIFECYCLE_STATUSES.REQUIREMENTS_IN_PROGRESS,
    LIFECYCLE_STATUSES.DATA_MODEL_IN_PROGRESS,
    LIFECYCLE_STATUSES.DATA_MODEL_VALIDATED,
    LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.DATA_MODEL_IN_PROGRESS]: [
    LIFECYCLE_STATUSES.REQUIREMENTS_CONFIRMED,
    LIFECYCLE_STATUSES.DATA_MODEL_VALIDATED,
    LIFECYCLE_STATUSES.READY_FOR_ARCHITECTURE,
    LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS,
    LIFECYCLE_STATUSES.READY_FOR_GENERATION,
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.DATA_MODEL_VALIDATED]: [
    LIFECYCLE_STATUSES.DATA_MODEL_IN_PROGRESS,
    LIFECYCLE_STATUSES.READY_FOR_ARCHITECTURE,
    LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS,
    LIFECYCLE_STATUSES.READY_FOR_GENERATION,
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.READY_FOR_ARCHITECTURE]: [
    LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS,
    LIFECYCLE_STATUSES.READY_FOR_GENERATION,
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.DATA_MODEL_VALIDATED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS]: [
    LIFECYCLE_STATUSES.READY_FOR_ARCHITECTURE,
    LIFECYCLE_STATUSES.READY_FOR_GENERATION,
    LIFECYCLE_STATUSES.GENERATION_IN_PROGRESS,
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.REQUIREMENTS_IN_PROGRESS,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.READY_FOR_GENERATION]: [
    LIFECYCLE_STATUSES.DESIGN_IN_PROGRESS,
    LIFECYCLE_STATUSES.GENERATION_IN_PROGRESS,
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.GENERATION_IN_PROGRESS]: [
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.READY_FOR_GENERATION,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.GENERATED]: [
    LIFECYCLE_STATUSES.VALIDATION_IN_PROGRESS,
    LIFECYCLE_STATUSES.READY_FOR_GENERATION,
    LIFECYCLE_STATUSES.GENERATION_IN_PROGRESS,
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.VALIDATION_IN_PROGRESS]: [
    LIFECYCLE_STATUSES.VALIDATION_COMPLETED,
    LIFECYCLE_STATUSES.GENERATED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.VALIDATION_COMPLETED]: [
    LIFECYCLE_STATUSES.REVIEW_IN_PROGRESS,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.REVIEW_IN_PROGRESS]: [
    LIFECYCLE_STATUSES.REVIEW_COMPLETED,
    LIFECYCLE_STATUSES.VALIDATION_COMPLETED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.REVIEW_COMPLETED]: [
    LIFECYCLE_STATUSES.EXPORTED,
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.EXPORTED]: [
    LIFECYCLE_STATUSES.ARCHIVED
  ],
  [LIFECYCLE_STATUSES.ARCHIVED]: [
    LIFECYCLE_STATUSES.DRAFT // Restoring re-opens to DRAFT
  ]
});

// States blocked in Phase 1 because their generation/validation engines do not exist yet
const PHASE_1_BLOCKED_TARGET_STATES = new Set([
  LIFECYCLE_STATUSES.GENERATED,
  LIFECYCLE_STATUSES.VALIDATION_COMPLETED,
  LIFECYCLE_STATUSES.EXPORTED
]);

/**
 * Validates a requested project lifecycle transition.
 */
export function validateLifecycleTransition(currentStatus, targetStatus, isEngineOperation = false) {
  if (!currentStatus || !targetStatus) {
    return {
      isValid: false,
      error: 'Current and target lifecycle status must both be specified.'
    };
  }

  if (currentStatus === targetStatus) {
    return { isValid: true };
  }

  if (currentStatus === LIFECYCLE_STATUSES.ARCHIVED && targetStatus !== LIFECYCLE_STATUSES.DRAFT) {
    return {
      isValid: false,
      error: `Project is archived. It must be explicitly restored before status can change to "${targetStatus}".`
    };
  }

  // Phase 1 Guardrail: Reject simulation of future engine completions
  if (!isEngineOperation && PHASE_1_BLOCKED_TARGET_STATES.has(targetStatus)) {
    return {
      isValid: false,
      error: `Cannot transition to "${targetStatus}". Automated generation/validation engines are scheduled for future milestones. Phase 1 only supports workspace foundation states.`
    };
  }

  const allowed = ALLOWED_PROJECT_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    return {
      isValid: false,
      error: `Illegal lifecycle transition: cannot move project from "${currentStatus}" to "${targetStatus}". Allowed next states: [${allowed.join(', ')}].`
    };
  }

  return { isValid: true };
}

/**
 * Appends a lifecycle transition event to the project's activity history.
 */
export function recordLifecycleEvent(project, newStatus, userContext = null, comment = '') {
  const now = new Date().toISOString();
  const actorName = userContext?.name || userContext?.username || 'Lead SAP Architect';
  const actorId = userContext?.id || 'USR-LOCAL-001';

  const event = {
    eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    timestamp: now,
    author: actorName,
    actorId,
    action: newStatus === LIFECYCLE_STATUSES.ARCHIVED ? 'PROJECT_ARCHIVED' : (newStatus === LIFECYCLE_STATUSES.DRAFT && project.lifecycleStatus === LIFECYCLE_STATUSES.ARCHIVED ? 'PROJECT_RESTORED' : 'STATUS_CHANGED'),
    details: {
      previousStatus: project.lifecycleStatus,
      newStatus,
      comment: comment || `Lifecycle status changed from ${project.lifecycleStatus} to ${newStatus}`
    },
    previousStatus: project.lifecycleStatus,
    newStatus
  };

  if (!Array.isArray(project.activityHistory)) {
    project.activityHistory = [];
  }
  project.activityHistory.push(event);
  project.lifecycleStatus = newStatus;
  project.updatedAt = now;

  return event;
}
