/**
 * Fiorify — Generation Project Data Contract & Schemas (P1-B)
 *
 * Defines the canonical, versioned GenerationProject contract for Generation Studio.
 * Complies with S/4HANA 2023 On-Premise Clean Core guidelines.
 */

export const GENERATION_PROJECT_SCHEMA_VERSION = '1.0.0';

export const PROJECT_ORIGINS = Object.freeze({
  DISCOVERY_BUILD: 'DISCOVERY_BUILD',
  STANDALONE: 'STANDALONE',
  TEMPLATE: 'TEMPLATE'
});

export const LIFECYCLE_STATUSES = Object.freeze({
  DRAFT: 'DRAFT',
  REQUIREMENTS_IN_PROGRESS: 'REQUIREMENTS_IN_PROGRESS',
  REQUIREMENTS_CONFIRMED: 'REQUIREMENTS_CONFIRMED',
  DATA_MODEL_IN_PROGRESS: 'DATA_MODEL_IN_PROGRESS',
  DATA_MODEL_VALIDATED: 'DATA_MODEL_VALIDATED',
  READY_FOR_ARCHITECTURE: 'READY_FOR_ARCHITECTURE',
  DESIGN_IN_PROGRESS: 'DESIGN_IN_PROGRESS',
  READY_FOR_GENERATION: 'READY_FOR_GENERATION',
  GENERATION_IN_PROGRESS: 'GENERATION_IN_PROGRESS',
  GENERATED: 'GENERATED',
  VALIDATION_IN_PROGRESS: 'VALIDATION_IN_PROGRESS',
  VALIDATION_COMPLETED: 'VALIDATION_COMPLETED',
  REVIEW_IN_PROGRESS: 'REVIEW_IN_PROGRESS',
  REVIEW_COMPLETED: 'REVIEW_COMPLETED',
  EXPORTED: 'EXPORTED',
  ARCHIVED: 'ARCHIVED'
});

export const TARGET_DEPLOYMENT_MODELS = Object.freeze({
  ON_PREMISE: 'ON_PREMISE',
  BTP_PRIVATE_CLOUD: 'BTP_PRIVATE_CLOUD',
  BTP_PUBLIC_CLOUD: 'BTP_PUBLIC_CLOUD'
});

export const PROJECT_PHASES = Object.freeze([
  { id: 'PHASE_1_WORKSPACE', name: 'Workspace Foundation & Setup', requiredForGeneration: true },
  { id: 'PHASE_2_REQUIREMENTS', name: 'Requirements & Scope', requiredForGeneration: true },
  { id: 'PHASE_3_DATA_MODEL', name: 'CDS Data Model Design', requiredForGeneration: true },
  { id: 'PHASE_4_ARCHITECTURE', name: 'RAP Architecture Design', requiredForGeneration: true },
  { id: 'PHASE_5_ABAP_GENERATION', name: 'ABAP Artifact Generation', requiredForGeneration: true },
  { id: 'PHASE_6_UI_GENERATION', name: 'Fiori Elements Generation', requiredForGeneration: true },
  { id: 'PHASE_7_VALIDATION', name: 'Mock Preview & Validation', requiredForGeneration: false },
  { id: 'PHASE_8_EXPORT', name: 'Review & Package Export', requiredForGeneration: false }
]);

/**
 * Creates a normalized GenerationProject record compliant with schema 1.0.0.
 */
export function createGenerationProjectRecord(input = {}, userContext = null) {
  const actorContext = userContext;
  const now = new Date().toISOString();
  const actorName = actorContext?.name || input.createdBy || 'Lead SAP Architect';
  const actorId = actorContext?.id || input.creatorId || 'USR-LOCAL-001';

  const origin = input.origin || (input.sourceAssessmentId ? PROJECT_ORIGINS.DISCOVERY_BUILD : PROJECT_ORIGINS.STANDALONE);

  const initialStatus = LIFECYCLE_STATUSES.DRAFT;

  const initialActivity = {
    eventId: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    timestamp: now,
    author: actorName,
    actorId,
    action: 'PROJECT_CREATED',
    details: {
      origin,
      sourceAssessmentId: input.sourceAssessmentId || null,
      sourceTransactionCode: input.sourceTransactionCode || null,
      targetRelease: input.targetRelease || 'SAP S/4HANA 2023 On-Premise',
      status: initialStatus
    },
    previousStatus: null,
    newStatus: initialStatus
  };

  const requestedTenant = userContext?.tenantId || input.tenantId || 'DEFAULT-TENANT-S21';

  return {
    projectId: input.projectId,
    tenantId: requestedTenant,
    schemaVersion: GENERATION_PROJECT_SCHEMA_VERSION,
    projectName: input.projectName,
    description: input.description || '',
    origin,
    sourceAssessmentId: input.sourceAssessmentId || null,
    handoffId: input.handoffId || input.assessmentContext?.handoffId || null,
    sourceTransactionCode: input.sourceTransactionCode ? input.sourceTransactionCode.toUpperCase() : null,
    sourceSystemId: input.sourceSystemId || null,
    sourceClient: input.sourceClient || null,
    targetProduct: input.targetProduct || 'SAP S/4HANA',
    targetRelease: input.targetRelease || 'SAP S/4HANA 2023 On-Premise',
    targetDeploymentModel: input.targetDeploymentModel || TARGET_DEPLOYMENT_MODELS.ON_PREMISE,
    lifecycleStatus: initialStatus,
    currentPhase: 'PHASE_1_WORKSPACE',
    specificationVersion: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: actorName,
    creatorId: actorId,
    // Context carried from assessment when origin is DISCOVERY_BUILD
    assessmentContext: input.assessmentContext || {
      businessDomain: input.businessDomain || null,
      programName: input.programName || null,
      packageName: input.packageName || null,
      softwareComponent: input.softwareComponent || null,
      identifiedGaps: Array.isArray(input.identifiedGaps) ? input.identifiedGaps : [],
      evaluatedCandidates: Array.isArray(input.evaluatedCandidates) ? input.evaluatedCandidates : [],
      fitGapFindings: input.fitGapFindings || null,
      technicalEvidenceSummary: input.technicalEvidenceSummary || null,
      securityAuthorizations: input.securityAuthorizations || null,
      approvalProvenance: input.approvalProvenance || null
    },
    // Future phase specification shells
    requirementsSpec: input.requirementsSpec || {
      specVersion: 1,
      items: [],
      status: 'EMPTY'
    },
    dataModelSpec: input.dataModelSpec || {
      specVersion: 1,
      rootEntity: null,
      entities: [],
      relationships: [],
      validationReport: null,
      status: 'EMPTY'
    },
    architectureSpec: input.architectureSpec || {
      specVersion: 1,
      rapScenario: 'RAP_MANAGED',
      odataVersion: 'ODATA_V4',
      uiPattern: 'LIST_REPORT_OBJECT_PAGE',
      cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER',
      status: 'EMPTY'
    },
    artifactRegistry: input.artifactRegistry || {},
    validationReport: input.validationReport || null,
    reviewRecord: input.reviewRecord || null,
    activityHistory: Array.isArray(input.activityHistory) ? input.activityHistory : [initialActivity]
  };
}
