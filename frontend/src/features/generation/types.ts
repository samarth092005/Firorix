/**
 * FioriX — Generation Studio Domain Types & View Models (GEN-02, GEN-03, GEN-04)
 */

export type ProjectOrigin = 'DISCOVERY_BUILD' | 'STANDALONE' | 'TEMPLATE';

export type ProjectLifecycleStatus =
  | 'DRAFT'
  | 'REQUIREMENTS_IN_PROGRESS'
  | 'REQUIREMENTS_CONFIRMED'
  | 'DATA_MODEL_IN_PROGRESS'
  | 'DATA_MODEL_VALIDATED'
  | 'READY_FOR_ARCHITECTURE'
  | 'DESIGN_IN_PROGRESS'
  | 'READY_FOR_GENERATION'
  | 'GENERATION_IN_PROGRESS'
  | 'GENERATED'
  | 'VALIDATION_IN_PROGRESS'
  | 'VALIDATION_COMPLETED'
  | 'REVIEW_IN_PROGRESS'
  | 'REVIEW_COMPLETED'
  | 'EXPORTED'
  | 'ARCHIVED';

export type TargetDeploymentModel = 'ON_PREMISE' | 'BTP_PRIVATE_CLOUD' | 'BTP_PUBLIC_CLOUD';

export type StudioInternalView =
  | 'projects'
  | 'requirements'
  | 'data-model'
  | 'architecture'
  | 'abap-generator'
  | 'ui-generator'
  | 'preview-validation'
  | 'review-export'
  | 'environment';

export interface ActivityEvent {
  eventId: string;
  timestamp: string;
  author: string;
  actorId?: string;
  action: string;
  details?: Record<string, any>;
  previousStatus?: string | null;
  newStatus?: string;
}

export interface AssessmentContext {
  businessDomain?: string | null;
  programName?: string | null;
  packageName?: string | null;
  softwareComponent?: string | null;
  screenNumber?: string | null;
  identifiedGaps?: string[];
  evaluatedCandidates?: any[];
  fitGapFindings?: any;
  technicalEvidenceSummary?: {
    programName?: string | null;
    packageName?: string | null;
    softwareComponent?: string | null;
    screenNumber?: string | null;
    originalSystem?: string | null;
    confidence?: string;
  } | null;
  securityAuthorizations?: any;
  approvalProvenance?: {
    approvedAt: string;
    approver: string;
    approverId?: string;
    justification: string;
  } | null;
}

export interface PhaseStatusItem {
  id: string;
  name: string;
  isCompleted: boolean;
  notes: string;
  requiredForGeneration: boolean;
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  origin: ProjectOrigin;
  lifecycleStatus: ProjectLifecycleStatus;
  targetRelease: string;
  targetDeploymentModel: TargetDeploymentModel;
  phases: PhaseStatusItem[];
  completedPhaseCount: number;
  totalPhaseCount: number;
  progressPercentage: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// GEN-03: REQUIREMENTS TYPES
// ==========================================

export type RequirementCategory =
  | 'DATA_READ'
  | 'DATA_CREATE'
  | 'DATA_UPDATE'
  | 'DATA_DELETE'
  | 'BUSINESS_RULE'
  | 'VALIDATION'
  | 'DETERMINATION'
  | 'ACTION'
  | 'UI_INTERACTION'
  | 'AUTHORIZATION'
  | 'REPORTING'
  | 'INTEGRATION'
  | 'OTHER';

export type RequirementPriority = 'MUST_HAVE' | 'SHOULD_HAVE' | 'NICE_TO_HAVE';

export type RequirementStatus =
  | 'DRAFT'
  | 'NEEDS_CLARIFICATION'
  | 'CONFIRMED'
  | 'DEFERRED'
  | 'REJECTED';

export type RequirementSourceType =
  | 'DISCOVERY_ASSESSMENT'
  | 'FIT_GAP_FINDING'
  | 'MANUAL_INPUT'
  | 'DEVELOPER_REVIEW';

export interface GenerationRequirement {
  id?: string;
  requirementId: string;
  projectId: string;
  title: string;
  description: string;
  requirementType: string;
  category: RequirementCategory;
  priority: RequirementPriority;
  status: RequirementStatus;
  acceptanceCriteria: string[];
  sourceType: RequirementSourceType;
  sourceAssessmentReference?: string | null;
  relatedGapReference?: string | null;
  relatedEvidenceReferences?: string[];
  relatedEntities?: string[];
  cleanCoreImpact?: string;
  developerNotes?: string | null;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  deferralOrRejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RequirementsSummary {
  totalCount: number;
  confirmedCount: number;
  needsClarificationCount: number;
  deferredCount: number;
  rejectedCount: number;
  draftCount: number;
  pendingCount: number;
  mustHaveOutstandingCount: number;
  isGateSatisfied: boolean;
  allConfirmedOrResolved: boolean;
}

export interface RequirementsSpec {
  specVersion: number;
  items: GenerationRequirement[];
  summary?: RequirementsSummary;
  status: string;
}

// ==========================================
// GEN-04: DATA MODEL TYPES
// ==========================================

export type EntityType = 'ROOT' | 'CHILD' | 'REFERENCE' | 'VALUE_HELP';
export type PersistenceStrategy = 'MANAGED_TABLE' | 'UNMANAGED' | 'EXISTING_TABLE' | 'TRANSIENT';
export type RelationshipType = 'ASSOCIATION' | 'COMPOSITION' | 'TEXT_ASSOCIATION' | 'VALUE_HELP';
export type Cardinality = '[0..1]' | '[1..1]' | '[0..*]' | '[1..*]';

export interface GenerationField {
  id?: string;
  fieldId: string;
  name: string;
  label: string;
  description?: string;
  type: string;
  length?: number;
  precision?: number | null;
  scale?: number | null;
  isKey: boolean;
  isMandatory: boolean;
  isReadOnly?: boolean;
  semanticRole: string;
  cukyField?: string | null;
  unitField?: string | null;
  valueHelpEntityId?: string | null;
  textAssociationEntityId?: string | null;
  sourceFieldReference?: string | null;
  defaultValue?: string | null;
}

export interface GenerationEntity {
  id?: string;
  entityId: string;
  name: string;
  businessName?: string;
  entityType: EntityType;
  isRoot?: boolean;
  businessPurpose?: string;
  dataSource?: string;
  persistenceStrategy?: PersistenceStrategy;
  tableName?: string;
  cdsViewName?: string;
  parentEntity?: string;
  fields: GenerationField[];
  sourceProvenance?: string;
}

export interface GenerationRelationship {
  id?: string;
  relationshipId: string;
  name: string;
  relationshipType: RelationshipType;
  sourceEntityId: string;
  targetEntityId: string;
  cardinality: Cardinality;
  mapping: Array<{ sourceField: string; targetField: string }>;
  onDelete?: string;
  rationale?: string;
}

export interface DataModelValidationFinding {
  findingId: string;
  ruleId: string;
  category: 'STRUCTURAL' | 'RELATIONSHIP' | 'SAP_COMPATIBILITY' | 'BUSINESS_INTEGRITY';
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  explanation: string;
  remediation: string;
  entityId?: string | null;
  fieldId?: string | null;
  relationshipId?: string | null;
  provenance: string;
  blocksProgression: boolean;
}

export interface DataModelValidationReport {
  status: 'VALID' | 'VALID_WITH_WARNINGS' | 'BLOCKED' | 'PENDING_SAP_VERIFICATION';
  errorCount: number;
  warningCount: number;
  infoCount: number;
  blockingCount: number;
  summary: {
    totalFindings: number;
    errorsCount: number;
    warningsCount: number;
    infoCount: number;
    blockingCount: number;
  };
  findings: DataModelValidationFinding[];
  validatedAt: string;
}

export interface DataModelSpec {
  specVersion: number;
  rootEntity?: GenerationEntity | null;
  entities: GenerationEntity[];
  relationships: GenerationRelationship[];
  validationReport?: DataModelValidationReport | null;
  status: string;
}

export interface CdsRegistryEntry {
  technicalName: string;
  businessDescription: string;
  category: string;
  sourceSystem: string;
  sourceRelease: string;
  softwareComponent: string;
  releaseContract: string;
  documentedReleaseContract?: string;
  availabilityStatus: string;
  targetVerificationStatus?: string;
  isLiveVerified?: boolean;
  verificationNote?: string;
  keyFields: string[];
  supportedFields: string[];
  provenance: string;
  cdsViewName?: string;
  name?: string;
}

export interface AssessmentHandoffContext {
  success: boolean;
  assessmentId: string;
  tcode: string;
  transactionCode: string;
  description: string;
  businessDomain: string;
  systemId: string;
  client: string;
  targetRelease: string;
  recommendation: any;
  lifecycleStatus: string;
  identifiedGaps: any[];
  evaluatedCandidates: any[];
  technicalEvidenceSummary: any;
  approvalProvenance: any;
  isEligibleForBuild: boolean;
  ineligibilityReason?: string;
  recommendedArtifacts?: string[];
  assessment?: any;
}

export interface ArchitectureSpec {
  specVersion: number;
  selectedProfile: 'MANAGED_RAP_DRAFT' | 'MANAGED_RAP_NON_DRAFT' | 'UNMANAGED_RAP' | 'READ_ONLY_QUERY' | 'ARCHITECTURE_REVIEW_REQUIRED';
  rationale: string;
  rootEntity?: {
    entityId: string;
    name: string;
    businessName: string;
    tableName: string;
    draftTableName?: string | null;
  } | null;
  childEntities?: Array<{
    entityId: string;
    name: string;
    businessName: string;
    tableName: string;
    draftTableName?: string | null;
    compositionParent?: string | null;
  }>;
  persistenceApproach: string;
  draftDecision: {
    enabled: boolean;
    draftTableName?: string | null;
    reason: string;
  };
  lockStrategy: string;
  etagStrategy: string;
  authorizationStrategy: string;
  serviceProtocol: string;
  cleanCoreImplications: {
    tier: string;
    guideline: string;
    notes: string[];
  };
  unresolvedDesignDecisions: Array<{
    id: string;
    category: string;
    description: string;
    severity: string;
    resolution: string;
  }>;
  supportingEvidenceReferences: Array<{
    type: string;
    reference: string;
    summary: string;
  }>;
  evaluatedAt?: string;
  status: string;
}

export interface GeneratedArtifact {
  artifactId: string;
  projectId: string;
  artifactType: string;
  objectName: string;
  filePath: string;
  content: string;
  language: string;
  generationTemplateVersion: string;
  sourceRequirementIds?: string[];
  sourceEntityIds?: string[];
  generatedAt: string;
  version: number;
  checksum: string;
  originalChecksum?: string;
  validationStatus: string;
  manualEditStatus: 'ORIGINAL' | 'MODIFIED';
  dependencies: string[];
  limitations?: string[];
  templateContent?: string;
}

export interface GenerationRun {
  runId: string;
  projectId: string;
  phase: string;
  startedAt: string;
  completedAt?: string | null;
  result: string;
  inputSnapshotHash: string;
  generatedArtifactIds: string[];
  preservedManualEditsCount: number;
  overwrittenCount: number;
  errors: string[];
  warnings: string[];
  templateVersion: string;
}

export interface ArtifactRegistryState {
  artifacts: Record<string, GeneratedArtifact>;
  generationRuns: GenerationRun[];
  version: number;
  lastGeneratedAt?: string | null;
}

export interface StaticValidationReport {
  status: 'VALID' | 'VALID_WITH_WARNINGS' | 'INVALID';
  isValid: boolean;
  totalFindings: number;
  errorsCount: number;
  warningsCount: number;
  findings: Array<{
    ruleId: string;
    severity: 'ERROR' | 'WARNING' | 'INFO';
    category: string;
    artifactId?: string | null;
    location?: string;
    message: string;
    explanation: string;
    suggestedCorrection: string;
    evidenceBasis: string;
  }>;
  evaluatedAt: string;
}

export interface TraceabilityItem {
  requirementId: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  mappedArtifactsCount: number;
  mappedArtifacts: Array<{
    artifactId: string;
    objectName: string;
    artifactType: string;
    filePath: string;
  }>;
}

export interface GenerationProject {
  projectId: string;
  schemaVersion: string;
  projectName: string;
  description: string;
  origin: ProjectOrigin;
  sourceAssessmentId?: string | null;
  sourceTransactionCode?: string | null;
  sourceSystemId?: string | null;
  sourceClient?: string | null;
  targetProduct: string;
  targetRelease: string;
  targetDeploymentModel: TargetDeploymentModel;
  lifecycleStatus: ProjectLifecycleStatus;
  currentPhase: string;
  specificationVersion: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  creatorId?: string;
  assessmentContext?: AssessmentContext;
  requirementsSpec?: RequirementsSpec;
  dataModelSpec?: DataModelSpec;
  architectureSpec?: ArchitectureSpec;
  artifactRegistry?: ArtifactRegistryState;
  fioriConfig?: Record<string, any>;
  validationReport?: any;
  reviewRecord?: any;
  activityHistory: ActivityEvent[];
}

export interface CreateProjectPayload {
  projectId?: string;
  projectName: string;
  description?: string;
  origin?: ProjectOrigin;
  sourceAssessmentId?: string | null;
  sourceTransactionCode?: string | null;
  targetRelease?: string;
  targetDeploymentModel?: TargetDeploymentModel;
  targetSystemId?: string | null;
  targetClient?: string | null;
  targetPackage?: string;
  abapPackage?: string;
  softwareComponent?: string;
}

export interface PreviewSessionInfo {
  sessionId: string;
  projectId: string;
  port: number;
  host: string;
  previewUrl: string;
  serviceBasePath: string;
  metadataUrl: string;
  status: 'STARTING' | 'RUNNING' | 'STOPPED';
  startedAt: string;
  lastActiveAt: string;
  totalRequests: number;
  syntheticRecordCounts?: Record<string, number>;
}

export interface PreviewRequestLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  error?: string;
}

export interface ExportReadinessResult {
  canExport: boolean;
  reason?: string;
  message: string;
  requiresWarningAcknowledgment?: boolean;
  errors?: any[];
  warnings?: any[];
  traceabilityMetrics?: {
    requirementCoveragePct: number;
    entityCoveragePct: number;
    uiCoveragePct: number;
    traceabilityIndex: number;
    totalRequirements: number;
    totalEntities: number;
  };
}

export interface FullTraceabilityReport {
  projectId: string;
  generatedAt: string;
  metrics: {
    totalRequirements: number;
    fullyMappedRequirements: number;
    partiallyMappedRequirements: number;
    unmappedRequirements: number;
    requirementCoveragePct: number;
    totalEntities: number;
    fullyMappedEntities: number;
    entityCoveragePct: number;
    totalCdsViews: number;
    annotatedCdsViews: number;
    uiCoveragePct: number;
    traceabilityIndex: number;
  };
  requirementMappings: Array<{
    requirementId: string;
    title: string;
    category: string;
    isConfirmed: boolean;
    mappedEntity: string;
    cdsViews: string[];
    behaviorDefinition: string;
    serviceDefinition: string;
    uiAnnotations: string[];
    coverageScore: number;
    coverage: 'FULL' | 'PARTIAL' | 'UNMAPPED';
  }>;
  entityMappings: Array<{
    entityId: string;
    name: string;
    entityType: string;
    fieldsCount: number;
    databaseTable: string;
    interfaceView: string;
    consumptionView: string;
    metadataExtension: string;
    status: 'COMPLETE' | 'INCOMPLETE';
  }>;
}

export interface ExportPackageResult {
  success: boolean;
  exportId: string;
  filename: string;
  sizeBytes: number;
  zipSha256: string;
  downloadUrl: string;
  manifest: any;
}

export interface ToolchainToolInfo {
  name: string;
  detected: boolean;
  version: string;
  status: 'READY' | 'ACTION_REQUIRED' | 'UPGRADE_RECOMMENDED' | 'OPTIONAL';
  details: string;
  installPath?: string | null;
}

export interface ToolchainReport {
  timestamp: string;
  overallStatus: 'READY' | 'PARTIALLY_READY' | 'ACTION_REQUIRED';
  targetSystem: {
    systemId: string;
    client: string;
    release: string;
    sapBasis: string;
    sapUi: string;
  };
  tools: Record<string, ToolchainToolInfo>;
  ports: Array<{ port: number; service: string; free: boolean }>;
  recommendations: string[];
}

export interface DeveloperHandoverGuide {
  projectId: string;
  projectName: string;
  targetSystem: string;
  targetClient: string;
  profile: string;
  abapSteps: Array<{ stepNumber: number; title: string; description: string }>;
  fioriSteps: Array<{ stepNumber: number; title: string; description: string }>;
  markdown: string;
}
