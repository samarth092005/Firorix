/**
 * Fiorify — Assessment Store Constants & Audit Hash Helpers
 */

import path from 'node:path';
import crypto from 'node:crypto';

export const LIFECYCLE_STATES = Object.freeze({
  DRAFT: 'DRAFT',
  DISCOVERY_COMPLETED: 'DISCOVERY_COMPLETED',
  MATCHING_COMPLETED: 'MATCHING_COMPLETED',
  FITGAP_COMPLETED: 'FITGAP_COMPLETED',
  RECOMMENDATION_COMPLETED: 'RECOMMENDATION_COMPLETED',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ARCHIVED: 'ARCHIVED'
});

export const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: ['DISCOVERY_COMPLETED', 'ARCHIVED'],
  DISCOVERY_COMPLETED: ['MATCHING_COMPLETED', 'DRAFT', 'ARCHIVED'],
  MATCHING_COMPLETED: ['FITGAP_COMPLETED', 'DISCOVERY_COMPLETED', 'ARCHIVED'],
  FITGAP_COMPLETED: ['RECOMMENDATION_COMPLETED', 'MATCHING_COMPLETED', 'ARCHIVED'],
  RECOMMENDATION_COMPLETED: ['PENDING_REVIEW', 'ARCHIVED'],
  PENDING_REVIEW: ['APPROVED', 'REJECTED', 'ARCHIVED'],
  APPROVED: ['ARCHIVED'],
  REJECTED: ['PENDING_REVIEW', 'DRAFT', 'ARCHIVED'],
  ARCHIVED: ['DRAFT']
});

export const MODERNIZATION_ACTION_TYPES = Object.freeze({
  ADD_FOUND: 'ADD_FOUND',
  CONFIGURE_ADOPT_READINESS: 'CONFIGURE_ADOPT_READINESS',
  ADD_AND_CONFIGURE: 'ADD_AND_CONFIGURE',
  BUILD_PROJECT: 'BUILD_PROJECT'
});

export const CHECKLIST_STATUSES = Object.freeze([
  'VERIFIED',
  'PENDING',
  'BLOCKED',
  'NOT_APPLICABLE',
  'NOT_VERIFIED'
]);

export const SERVER_AUTHORITATIVE_FIELDS = Object.freeze([
  'id',
  'createdAt',
  'createdBy',
  'creatorRole',
  'auditEvents',
  'versionHistory',
  'fitGapScore',
  'scoreCoverage',
  'dimensionResults',
  'scoringBreakdown',
  'approvalSignature',
  'leadArchitectApproval'
]);

export function computeEventHash(event, previousHash = 'GENESIS') {
  const content = `${previousHash}|${event.eventId}|${event.timestamp}|${event.action}|${event.actorId || event.author}|${event.previousState || ''}|${event.newState || ''}|${event.comment || ''}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function isTestRunnerActive() {
  return Boolean(
    process.env.NODE_ENV === 'test' ||
    process.env.npm_lifecycle_event === 'test' ||
    (Array.isArray(process.execArgv) && process.execArgv.some((arg) => typeof arg === 'string' && arg.includes('--test'))) ||
    (Array.isArray(process.argv) && process.argv.some((arg) => typeof arg === 'string' && (arg.includes('--test') || arg.includes('test/')))) ||
    process.env.NODE_TEST_CONTEXT
  );
}

export function resolveDefaultStoragePath() {
  const cwd = process.cwd();
  if (path.basename(cwd) === 'backend') {
    return path.resolve(cwd, 'data', 'assessments.json');
  }
  return path.resolve(cwd, 'backend', 'data', 'assessments.json');
}
