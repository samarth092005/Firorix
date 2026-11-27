/**
 * Fiorify — Assessment Query, Filtering & Summary Service
 */

import { LIFECYCLE_STATES } from './assessmentConstants.js';

export function filterAndPaginateAssessments(allRecords, filters = {}) {
  let records = [...allRecords];
  const {
    businessArea,
    status,
    lifecycleStatus,
    systemId,
    assessmentLevel,
    search,
    tenantId: requestedTenantId,
    includeArchived = false,
    limit,
    offset = 0
  } = filters;

  if (requestedTenantId && typeof requestedTenantId === 'string') {
    records = records.filter((r) => r.tenantId === requestedTenantId);
  }
  if (!includeArchived) {
    records = records.filter((r) => r.lifecycleStatus !== LIFECYCLE_STATES.ARCHIVED && r.status !== 'ARCHIVED');
  }
  if (businessArea && typeof businessArea === 'string') {
    const target = businessArea.trim().toLowerCase();
    records = records.filter((r) => r.businessArea && r.businessArea.toLowerCase().includes(target));
  }
  if (status && typeof status === 'string') {
    const target = status.trim().toUpperCase();
    records = records.filter((r) => String(r.status).toUpperCase() === target || String(r.lifecycleStatus).toUpperCase() === target);
  }
  if (lifecycleStatus && typeof lifecycleStatus === 'string') {
    const target = lifecycleStatus.trim().toUpperCase();
    records = records.filter((r) => String(r.lifecycleStatus).toUpperCase() === target);
  }
  if (systemId && typeof systemId === 'string') {
    const target = systemId.trim().toUpperCase();
    records = records.filter((r) => r.systemId && r.systemId.toUpperCase() === target);
  }
  if (assessmentLevel && typeof assessmentLevel === 'string') {
    const target = assessmentLevel.trim().toUpperCase();
    records = records.filter((r) => r.assessmentLevel && r.assessmentLevel.toUpperCase() === target);
  }
  if (search && typeof search === 'string') {
    const q = search.trim().toLowerCase();
    records = records.filter(
      (r) =>
        (r.tcode && r.tcode.toLowerCase().includes(q)) ||
        (r.id && r.id.toLowerCase().includes(q)) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.businessArea && r.businessArea.toLowerCase().includes(q)) ||
        (r.matchingFioriApp?.appName && r.matchingFioriApp.appName.toLowerCase().includes(q)) ||
        (r.matchingFioriApp?.appId && r.matchingFioriApp.appId.toLowerCase().includes(q))
    );
  }

  records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const totalCount = records.length;
  const paginated = limit !== undefined
    ? records.slice(Number(offset), Number(offset) + Number(limit))
    : records.slice(Number(offset));

  paginated.totalCount = totalCount;
  paginated.count = paginated.length;
  paginated.limit = limit !== undefined ? Number(limit) : totalCount;
  paginated.offset = Number(offset);
  return paginated;
}

export function computeAssessmentSummary(all) {
  const totalAssessments = all.length;
  const completed = all.filter((r) => ['COMPLETED', 'APPROVED', 'RECOMMENDATION_COMPLETED'].includes(r.lifecycleStatus)).length;
  const pendingReview = all.filter((r) => r.lifecycleStatus === 'PENDING_REVIEW').length;
  const approved = all.filter((r) => r.lifecycleStatus === 'APPROVED').length;
  const rejected = all.filter((r) => r.lifecycleStatus === 'REJECTED').length;
  const inProgress = all.filter((r) => ['DRAFT', 'DISCOVERY_COMPLETED', 'MATCHING_COMPLETED', 'FITGAP_COMPLETED'].includes(r.lifecycleStatus)).length;
  const verifiedMatchesCount = all.filter(
    (r) =>
      ['VERIFIED_FIT', 'PARTIAL_FIT', 'EXPLICIT_SUCCESSOR', 'FUNCTIONAL_ALTERNATIVE'].includes(r.assessmentResult) ||
      (r.matchingFioriApp && r.matchingFioriApp.appId)
  ).length;

  const scores = all.map((r) => r.fitGapScore).filter((s) => typeof s === 'number' && !isNaN(s) && s > 0);
  const averageFitGapScore = scores.length > 0
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : 0;

  const byOutcome = {};
  for (const r of all) {
    const outcome = r.recommendation?.outcome || 'REVIEW';
    byOutcome[outcome] = (byOutcome[outcome] || 0) + 1;
  }

  const bySystem = {};
  for (const r of all) {
    const sys = r.systemId || 'S21-200';
    bySystem[sys] = (bySystem[sys] || 0) + 1;
  }

  return {
    totalAssessed: totalAssessments,
    totalAssessments,
    verifiedMatchesCount,
    completed,
    pendingReview,
    approved,
    rejected,
    inProgress,
    averageFitGapScore,
    byOutcome,
    bySystem,
    timestamp: new Date().toISOString()
  };
}
