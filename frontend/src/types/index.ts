// Fiorify Domain Models & Type Definitions

export type SystemEnvironment = 'DEVELOPMENT' | 'QUALITY' | 'SANDBOX' | 'PRODUCTION';
export type ConnectionStatus = 'CONNECTED_SIMULATED' | 'OFFLINE' | 'AUTHENTICATION_REQUIRED' | 'CONFIG_ERROR';

export interface SapSystem {
  id: string;
  alias: string;
  environment: SystemEnvironment;
  destinationReference: string;
  host: string;
  client: string;
  targetReleaseProfile: string;
  connectionStatus: ConnectionStatus;
  lastVerifiedTimestamp: string;
  adtEndpoint: string;
  cloudConnectorSubaccount?: string;
  description?: string;
  isDemoRecord: boolean;
}

export type TransactionModule = 'SD' | 'MM' | 'FI' | 'CO' | 'PP' | 'QM' | 'CUSTOM';
export type ObjectType = 'STANDARD' | 'CUSTOM';
export type AssessmentStatus = 'NOT_ASSESSED' | 'IN_PROGRESS' | 'REVIEW_READY' | 'APPROVED' | 'ARCHIVED';

export type EvidenceConfidence = 'VERIFIED' | 'INFERRED' | 'UNKNOWN' | 'NOT_AVAILABLE' | 'NOT_AUTHORIZED' | 'NOT_TESTED';

export interface TechnicalEvidence {
  id: string;
  sourceInterface: string; // e.g. '/sap/bc/adt/repository/informationsystem/search'
  confidence: EvidenceConfidence;
  extractedTimestamp: string;
  details: string;
  rawPayloadSnippet?: string;
}

export interface TechnicalObject {
  id: string;
  name: string;
  type: 'PROGRAM' | 'INCLUDE' | 'CDS_VIEW' | 'TABLE' | 'CLASS' | 'FUNCTION_MODULE' | 'AUTH_OBJECT' | 'SERVICE_DEFINITION';
  description: string;
  packageName: string;
  status: EvidenceConfidence;
  linesOfCode?: number;
  evidence: TechnicalEvidence;
}

export interface TransactionCode {
  id: string;
  tcode: string;
  description: string;
  module: TransactionModule;
  type: ObjectType;
  programName: string;
  packageName: string;
  assessmentStatus: AssessmentStatus;
  linkedTables: string[];
  linkedCdsViews: string[];
  linkedAuthObjects: string[];
  objectsCount: number;
  lastScanned?: string;
  isDemoRecord: boolean;
}

export type RequirementPriority = 'MUST' | 'SHOULD' | 'COULD';
export type RequirementReviewStatus = 'DRAFT' | 'CONFIRMED' | 'REJECTED';

export interface BusinessRequirement {
  id: string;
  assessmentId: string;
  title: string;
  statement: string;
  businessRule: string;
  actorRole: string;
  inputOutput: string;
  validationLogic: string;
  exceptionHandling: string;
  priority: RequirementPriority;
  acceptanceCriteria: string;
  evidenceSource: string;
  reviewStatus: RequirementReviewStatus;
  reviewedBy?: string;
  reviewedDate?: string;
  isConfirmed: boolean;
}

export type FioriAppType = 'Fiori Elements' | 'Freestyle' | 'Transactional' | 'Analytical';

export interface FioriPrerequisite {
  id: string;
  type: 'SOFTWARE_COMPONENT' | 'FRONTEND_COMPONENT' | 'ODATA_SERVICE' | 'BUSINESS_ROLE';
  name: string;
  version: string;
  verified: boolean;
}

export interface FioriApplication {
  id: string;
  appId: string; // e.g. F1814
  appName: string;
  appType: FioriAppType;
  lineOfBusiness: string;
  businessRole: string;
  supportedReleases: string[];
  softwareComponents: string[];
  odataServices: string[];
  prerequisites: FioriPrerequisite[];
  extensibilityStatus: 'EXTENSIBLE_BADI' | 'IN_APP_EXTENSIBILITY' | 'NOT_EXTENSIBLE' | 'UNKNOWN';
  sourceReferenceUrl: string;
  verifiedDate: string;
  isCuratedDemoData: boolean;
}

export type CoverageStatus = 'SUPPORTED' | 'PARTIAL' | 'UNSUPPORTED' | 'UNKNOWN';

export interface FitGapResult {
  id: string;
  assessmentId: string;
  requirementId: string;
  requirementTitle: string;
  candidateAppId: string;
  candidateAppName: string;
  coverageStatus: CoverageStatus;
  evidence: string;
  gapExplanation: string;
  reviewerNotes?: string;
  reviewerName?: string;
  reviewedTimestamp?: string;
}

export type DecisionOutcome = 'ADD_AND_CONFIGURE' | 'BUILD';
export type AssessmentGovernanceStatus = 'REVIEW' | 'PENDING_VERIFICATION' | 'INSUFFICIENT_EVIDENCE';

export interface Recommendation {
  assessmentId: string;
  outcome: DecisionOutcome | null;
  governanceStatus?: AssessmentGovernanceStatus;
  rationale: string;
  criticalRequirementsMet: number;
  totalRequirements: number;
  unresolvedQuestions: string[];
  evidenceCitations: string[];
  reviewerName: string;
  approvalStatus: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  decidedTimestamp: string;
}

export interface GeneratedArtifact {
  id: string;
  fileName: string;
  filePath: string;
  fileType: 'CDS' | 'SRVD' | 'SRVB' | 'JSON' | 'JS' | 'XML';
  sizeBytes: number;
  checksum: string;
  contentSnippet: string;
}

export interface GeneratedApplicationBlueprint {
  projectId: string;
  assessmentId: string;
  targetReleaseProfile: string;
  applicationPattern: 'LIST_REPORT_OBJECT_PAGE' | 'WORKLIST' | 'ANALYTICAL_LIST_PAGE';
  dataModelProposal: {
    rootEntity: string;
    compositionEntities: string[];
    associations: string[];
    keyFields: string[];
  };
  serviceProposal: {
    serviceDefinitionName: string;
    serviceBindingName: string;
    protocol: 'ODATA_V4' | 'ODATA_V2';
  };
  uiProposal: {
    floorplan: string;
    listReportFields: string[];
    objectPageSections: string[];
    actions: string[];
  };
  validationStatus: 'PASS' | 'WARNING' | 'FAIL' | 'NOT_RUN';
  artifacts: GeneratedArtifact[];
  generatedTimestamp: string;
}

export type ValidationCategory = 'ARCHITECTURE' | 'TECHNICAL_QUALITY' | 'SECURITY' | 'AUTHORIZATION' | 'CLEAN_CORE' | 'RELEASE_COMPATIBILITY';
export type ValidationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type ValidationStatus = 'PASS' | 'WARNING' | 'FAIL' | 'NOT_RUN';

export interface ValidationFinding {
  id: string;
  category: ValidationCategory;
  ruleId: string;
  title: string;
  description: string;
  severity: ValidationSeverity;
  status: ValidationStatus;
  evidence: string;
  suggestedRemediation: string;
  sapGuidelineReference: string;
}

export type AssessmentStep = 
  | 'OVERVIEW' 
  | 'TECHNICAL' 
  | 'BUSINESS_CONTEXT_REQUIREMENTS' 
  | 'FIORI_DISCOVERY' 
  | 'FIT_GAP' 
  | 'RECOMMENDATION' 
  | 'GENERATION_STUDIO' 
  | 'VALIDATION' 
  | 'AUDIT_HISTORY'
  // Backward compatibility aliases
  | 'BUSINESS_CONTEXT' 
  | 'REQUIREMENTS' 
  | 'BLUEPRINT' 
  | 'AUDIT';

export interface Assessment {
  id: string;
  title: string;
  tcode: string;
  systemId: string;
  systemAlias: string;
  status: AssessmentStatus;
  currentStep: AssessmentStep;
  progressPercent: number;
  ownerName: string;
  createdDate: string;
  updatedDate: string;
  recommendationOutcome?: DecisionOutcome | null;
  governanceState?: AssessmentGovernanceStatus;
  businessProcess: string;
  targetRelease: string;
  isDemoRecord: boolean;
}

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface DiscoveryJob {
  id: string;
  jobType: 'DISCOVERY_SCAN' | 'WHERE_USED_ANALYSIS' | 'FIT_GAP_CALCULATION' | 'DRAFT_GENERATION';
  systemAlias: string;
  targetTCode: string;
  status: JobStatus;
  progressPercent: number;
  createdDate: string;
  startedDate?: string;
  finishedDate?: string;
  errorMessage?: string;
  executedBy: string;
  stageDetails: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  userId: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  systemId?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'WARNING';
  details: string;
  correlationId: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface FilterState {
  searchQuery?: string;
  module?: string;
  environment?: string;
  status?: string;
  priority?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: Pagination;
}
