/**
 * FioriX Enterprise API & Service Contracts
 * Prepared for SAP BTP CAP OData V4 integration.
 * In Demo Mode, served by isolated DemoDataProvider.
 */

export type AssessmentResultType =
  | 'EXPLICIT_SUCCESSOR'
  | 'SAP_GUI_HTML'
  | 'FUNCTIONAL_ALTERNATIVE'
  | 'PENDING_VERIFICATION'
  | 'RELEASE_INCOMPATIBLE'
  | 'NO_VERIFIED_MATCH'
  | 'CUSTOM_RAP_REQUIRED';

export type AssessmentLifecycleStatus =
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'PENDING_VERIFICATION'
  | 'FLAGGED'
  | 'DRAFT'
  | 'DISCOVERY_COMPLETED'
  | 'MATCHING_COMPLETED'
  | 'FITGAP_COMPLETED'
  | 'RECOMMENDATION_COMPLETED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface MatchingFioriAppInfo {
  appId: string;
  appName: string;
  appType: string;
  uiTechnology: string;
  releaseCompatibility: 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN';
  sourceLabel: string;
  businessRoles?: string[];
  odataServices?: string[];
}

export interface AssessmentRecord {
  id: string;
  tcode: string;
  description: string;
  businessArea: string;
  subArea?: string;
  classification: 'STANDARD' | 'CUSTOM' | 'PARTNER' | 'UNKNOWN';
  programName: string;
  screenNumber: string;
  packageName: string;
  originalSystem: string;
  softwareComponent: string;
  assessmentResult: AssessmentResultType;
  matchingFioriApp: MatchingFioriAppInfo | null;
  lastAssessed: string;
  status: AssessmentLifecycleStatus;
  systemId: string;
  client: string;
  release: string;
  isDemo: boolean;
  evidenceNotes: string[];
  rationale: string;
  requestId?: string;
  lifecycleStatus?: AssessmentLifecycleStatus;
  fitGapScore?: number;
  scoreCoverage?: number;
  evidenceConfidence?: string;
  recommendation?: any;
  remediationPlan?: any[];
  actionableRemediationPlan?: any[];
  auditEvents?: any[];
  dimensions?: any[];
  dimensionResults?: any;
  identifiedGaps?: any[];
  missingEvidence?: any[];
  conflictingEvidence?: any[];
  createdAt?: string;
  updatedAt?: string;
  businessContext?: BusinessContext;
  applicationRequirements?: ApplicationRequirements;
  catalogueReference?: CatalogueReference | null;
  [key: string]: any;
}

export interface AssessmentSummary {
  totalAssessed: number;
  verifiedMatchesCount: number;
  explicitSuccessorsCount: number;
  pendingVerificationCount: number;
  sapGuiHtmlCount: number;
  functionalAlternativeCount: number;
  releaseIncompatibleCount: number;
  noVerifiedMatchCount: number;
  distribution: {
    category: AssessmentResultType;
    label: string;
    count: number;
    percentage: number;
    color: string;
  }[];
}

export type SystemConnectionState = 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED' | 'DEMO_MODE';

export interface SapComponentInfo {
  name: string;
  release: string;
  spLevel: string;
  description: string;
  status: 'RECORDED_AWAITING_REFRESH' | 'VERIFIED_LIVE' | 'OUTDATED';
}

export type IndicatorStatus =
  | 'CONNECTED'
  | 'ONLINE'
  | 'CONFIGURED'
  | 'DISCONNECTED'
  | 'OFFLINE'
  | 'UNAUTHORIZED'
  | 'PARTIAL'
  | 'UNREACHABLE'
  | 'NOT_VERIFIED'
  | 'UNKNOWN';

export interface HealthIndicatorItem {
  id: string;
  label: string;
  status: IndicatorStatus;
  statusText: string;
  badgeVariant: 'success' | 'warning' | 'error' | 'neutral' | 'info';
  details: string;
  lastChecked?: string;
}

export interface LandscapeHealthIndicators {
  backendHealth: HealthIndicatorItem;        // 1. FioriX backend health
  configuredSystem: HealthIndicatorItem;     // 2. Configured SAP system status
  sapHostReachability: HealthIndicatorItem;  // 3. SAP host reachability
  cloudConnector: HealthIndicatorItem;       // 4. Cloud Connector availability (where measurable)
  sapGateway: HealthIndicatorItem;           // 5. SAP Gateway availability
  gatewayCatalog: HealthIndicatorItem;       // 6. Gateway service catalogue retrieval status
}

export interface SystemHealthResponse {
  systemId: string;
  client: string;
  platform: string;
  systemName: string;
  connectionState: SystemConnectionState;
  isLiveConnection: boolean;
  lastSyncTimestamp: string;
  connectivityStatus: {
    status: 'ONLINE' | 'OFFLINE' | 'SIMULATED' | 'ERROR';
    latencyMs?: number;
    destinationName: string;
    cloudConnectorSubaccount?: string;
    message: string;
  };
  metadataService: {
    status: 'AVAILABLE' | 'UNAVAILABLE' | 'MOCK_STANDBY';
    endpoint: string;
    version: string;
  };
  catalogueStatus: {
    status: 'LOADED' | 'OUT_OF_SYNC' | 'NOT_INITIALIZED';
    version: string;
    totalAppsCatalogued: number;
  };
  components: SapComponentInfo[];
  indicators?: LandscapeHealthIndicators;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  type: 'ASSESSMENT_COMPLETED' | 'ASSESSMENT_STARTED' | 'VERIFICATION_PENDING' | 'SYSTEM_PROBE' | 'CATALOGUE_SYNC';
  title: string;
  description: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  tcode?: string;
  systemId?: string;
}

export interface AssessmentFilterParams {
  searchTerm?: string;
  search?: string;
  businessArea?: string;
  assessmentResult?: AssessmentResultType | 'ALL';
  status?: AssessmentLifecycleStatus | 'ALL';
  lifecycleStatus?: AssessmentLifecycleStatus | 'ALL';
  includeArchived?: boolean;
  systemId?: string;
  sortBy?: 'tcode' | 'description' | 'lastAssessed' | 'status' | string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Sprint 3 Guided Discovery & Catalogue Contracts
 * Prepared for SAP CAP OData V4 Services
 */

export interface BusinessContext {
  businessProcess: string;
  subProcess?: string;
  primaryScenario: string;
  selectedRequirements: string[];
  expectedFunctionality: string[];
  assessmentObjective: string;
  businessCriticality: 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedDailyVolume?: string;
  notes?: string;
}

export interface ApplicationRequirements {
  relevantBusinessRole: string;
  knownODataService: string;
  requiredFunctionality: string[];
  knownLimitations: string;
  targetReleaseProfile: string;
  isUserProvidedUnverified: boolean;
}

export interface CatalogueReference {
  appId: string;
  appName: string;
  description: string;
  relatedTCodes: string[];
  supportedProductRelease: string;
  uiTechnology: 'SAP Fiori elements' | 'SAPUI5 freestyle' | 'SAP GUI for HTML' | 'Web Dynpro' | 'UNKNOWN';
  businessRoles: string[];
  businessCatalogues: string[];
  odataServices: string[];
  technicalComponent: string;
  implementationInfo: string;
  officialSourceUrl: string; // e.g. https://fal.cloud.sap/apps/F0773
  sourceVerificationDate: string;
  importVersion: string;
  isCuratedDemoData: boolean;
}

export interface TransactionDiscoveryRequest {
  requestId: string;
  tcode: string;
  systemId: string;
  client: string;
  targetRelease: string;
  timestamp: string;
}

export interface TransactionDiscoveryResponse {
  requestId: string;
  tcode: string;
  systemId: string;
  client: string;
  targetRelease: string;
  exists: boolean;
  classification: 'STANDARD' | 'CUSTOM' | 'PARTNER' | 'UNKNOWN';
  description: string;
  programName: string;
  screenNumber: string;
  packageName: string;
  originalSystem: string;
  softwareComponent: string;
  metadataStatus: 'COMPLETE' | 'INCOMPLETE' | 'NOT_AVAILABLE';
  isLiveVerified: boolean;
  basisAuthorizationRequirements?: {
    status?: string;
    requiredObjects?: string[];
    impact?: string;
  } | null;
  verificationStatus?: string;
  provenance: 'LIVE_SAP_S21' | 'CURATED_DEMO_FIXTURE' | 'LOCAL_CACHE';
  tadirEvidence: {
    pgmid: string;
    object: string;
    objName: string;
    devclass: string;
    srcsystem: string;
  };
  catalogueCandidates: CatalogueReference[];
  timestamp: string;
}

export interface AssessmentCreationRequest {
  tcode: string;
  systemId: string;
  client: string;
  targetRelease: string;
  businessContext: BusinessContext;
  applicationRequirements: ApplicationRequirements;
  discoveryMetadata: {
    description: string;
    programName: string;
    screenNumber: string;
    packageName: string;
    classification: 'STANDARD' | 'CUSTOM' | 'PARTNER' | 'UNKNOWN';
    originalSystem: string;
    softwareComponent: string;
  };
  catalogueReference?: CatalogueReference | null;
  matchingFioriApp?: any;
  fitScore?: number;
  assessmentResult?: string;
  status?: string;
  lifecycleStatus?: string;
}

/**
 * Sprint 4 Assessment Workspace & Evidence Engine Contracts
 * Prepared for SAP CAP OData V4 Services
 */

export type EvidenceCategory =
  | 'TRANSACTION_EXISTENCE'
  | 'TRANSACTION_DESCRIPTION'
  | 'REPOSITORY_CLASSIFICATION'
  | 'PROGRAM_SCREEN'
  | 'PACKAGE_ORIGIN'
  | 'APPLICATION_MATCH'
  | 'RELEASE_COMPATIBILITY'
  | 'BUSINESS_ROLE'
  | 'ODATA_SERVICE'
  | 'S21_AVAILABILITY';

export type EvidenceVerificationStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'PENDING_VERIFICATION'
  | 'DISCREPANCY'
  | 'NOT_APPLICABLE';

export type EvidenceProvenance =
  | 'LIVE_SAP_S21'
  | 'CURATED_DEMO_FIXTURE'
  | 'USER_PROVIDED'
  | 'OFFICIAL_CATALOGUE'
  | 'PENDING_VERIFICATION';

export interface DetailedEvidenceRecord {
  id: string;
  category: EvidenceCategory;
  title: string;
  finding: string;
  sourceSystem: string;
  sourceTableOrService: string;
  verificationStatus: EvidenceVerificationStatus;
  provenance: EvidenceProvenance;
  timestamp: string;
  explanation: string;
}

export interface RoleValidationRecord {
  roleName: string;
  description: string;
  mentionedInBusinessContext: boolean;
  documentedInOfficialCatalogue: boolean;
  assignedInS21Status: 'CONFIRMED_ASSIGNED' | 'NOT_ASSIGNED' | 'PENDING_BASIS_CHECK';
  roleAvailabilityStatus: 'READY_FOR_USE' | 'REQUIRES_PFCG_ROLE_ASSIGNMENT' | 'PENDING_VERIFICATION';
  notes: string;
  evidenceSource: string;
}

export interface ODataServiceValidationRecord {
  serviceName: string;
  version: string;
  provenance: 'USER_PROVIDED' | 'OFFICIAL_CATALOGUE' | 'S21_GATEWAY_CATALOG';
  registrationStatus: 'REGISTERED_ACTIVE' | 'REGISTERED_INACTIVE' | 'NOT_REGISTERED' | 'PENDING_BASIS_CHECK';
  icfPath: string;
  notes: string;
}

export interface ComponentCompatibilityCheck {
  component: string;
  requiredLevel: string;
  systemLevel: string;
  compatible: boolean;
  notes?: string;
}

export interface ReleaseCompatibilityRecord {
  targetRelease: string;
  requiredProductVersion: string;
  status: 'COMPATIBLE' | 'INCOMPATIBLE' | 'PARTIALLY_VERIFIED' | 'PENDING_VERIFICATION';
  minimumRelease: string;
  componentChecks: ComponentCompatibilityCheck[];
  details: string;
}

export interface SystemAvailabilityAudit {
  catalogueMatchStatus: 'CATALOGUE_VERIFIED' | 'CATALOGUE_NOT_FOUND' | 'PENDING_CATALOGUE_VERIFICATION';
  activationStatus: 'ACTIVATED' | 'INACTIVE' | 'PENDING_VERIFICATION' | 'NOT_APPLICABLE';
  serviceRegistrationStatus: 'REGISTERED' | 'NOT_REGISTERED' | 'PENDING_BASIS_CHECK';
  roleAssignmentStatus: 'ASSIGNED' | 'NOT_ASSIGNED' | 'PENDING_VERIFICATION';
  launchpadVisibilityStatus: 'CONFIRMED' | 'NOT_CONFIRMED' | 'PENDING_AUTHORIZATION';
  overallS21Availability: 'VERIFIED_READY' | 'PENDING_VERIFICATION' | 'CONFIGURATION_REQUIRED' | 'UNAVAILABLE';
}

export type RecommendationOutcome =
  | 'ADOPT'
  | 'CONFIGURE'
  | 'EXTEND'
  | 'BUILD'
  | 'INSUFFICIENT_EVIDENCE'
  | 'PENDING_VERIFICATION'
  // Legacy aliases supported for backward compatibility
  | 'USE_STANDARD_FIORI_SUCCESSOR'
  | 'USE_CLASSIC_TRANSACTION_LAUNCHPAD'
  | 'EVALUATE_FUNCTIONAL_ALTERNATIVE'
  | 'INVESTIGATE_CATALOGUE_INFO'
  | 'VALIDATE_RELEASE_INCOMPATIBILITY'
  | 'TECHNICAL_ANALYSIS_REQUIRED';

export type FunctionalCoverageStatus =
  | 'SUPPORTED'
  | 'PARTIALLY_SUPPORTED'
  | 'NOT_SUPPORTED'
  | 'NOT_VERIFIED'
  | 'NOT_APPLICABLE';

export type StageCompletionStatus =
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'PENDING_VERIFICATION'
  | 'BLOCKED'
  | 'FAILED';

export type EvidenceBucketCategory =
  | 'A_S21_LIVE'
  | 'B_OFFICIAL_CATALOGUE'
  | 'C_USER_PROVIDED'
  | 'D_INFERRED'
  | 'E_PENDING_VERIFICATION';

export interface BucketizedEvidenceItem {
  id: string;
  bucket: EvidenceBucketCategory;
  category: EvidenceCategory;
  title: string;
  finding: string;
  source: string;
  sourceTableOrService: string;
  verificationStatus: EvidenceVerificationStatus;
  provenance: EvidenceProvenance;
  timestamp: string;
  systemClient: string;
  reference: string;
  limitation: string;
  explanation: string;
}

export interface IndependentAssessmentMetrics {
  evidenceCompleteness: number;      // 0 - 100
  recommendationConfidence: number;  // 0 - 100
  functionalCoverage: number;        // 0 - 100
  technicalCompatibility: number;    // 0 - 100
  releaseCompatibility: number;      // 0 - 100
  stageStatuses: {
    stage1Verdict: StageCompletionStatus;
    stage2FitGap: StageCompletionStatus;
    stage3TechnicalProof: StageCompletionStatus;
    stage4ModernizationDecision: StageCompletionStatus;
  };
  methodologyNotes: {
    completeness: string;
    confidence: string;
    coverage: string;
    technical: string;
    release: string;
  };
}

export interface GenerationHandoffPayload {
  handoffId: string;
  sourceAssessmentId: string;
  tcode: string;
  transactionDescription: string;
  targetRelease: string;
  systemId: string;
  client: string;
  programName: string;
  packageName: string;
  classification: string;
  recommendationOutcome: RecommendationOutcome;
  architectApproved: boolean;
  architectName: string;
  architectSignOffTimestamp: string;
  verifiedMetadata: {
    programName: string;
    screenNumber: string;
    packageName: string;
    softwareComponent: string;
  };
  businessRequirements: {
    process: string;
    scenario: string;
    criticality: string;
    requiredCapabilities: string[];
  };
  fitGapSummary: {
    identifiedGaps: string[];
    missingCapabilities: string[];
    justification: string;
  };
  architectureBaseline: {
    backendModel: 'RAP_MANAGED';
    cdsViewType: 'VIEW_ENTITY';
    odataVersion: 'ODATA_V4';
    uiPattern: 'FIORI_ELEMENTS_LIST_REPORT_OBJECT_PAGE';
    cleanCoreTier: 'TIER_2_CLOUD_DEVELOPER';
  };
  createdAt: string;
  proposedAppType?: string;
  cleanCoreJustification?: string;
  currentStage?: string;
}

export type ChecklistItemStatus = 'VERIFIED' | 'PENDING' | 'BLOCKED' | 'NOT_APPLICABLE' | 'NOT_VERIFIED';

export interface ImplementationReadinessChecklist {
  productReleaseCompatibility: ChecklistItemStatus;
  odataServices: ChecklistItemStatus;
  serviceRegistration: ChecklistItemStatus;
  icfUi5Services: ChecklistItemStatus;
  systemAlias: ChecklistItemStatus;
  businessCatalogue: ChecklistItemStatus;
  pfcgBusinessRoles: ChecklistItemStatus;
  launchpadAvailability: ChecklistItemStatus;
  userAuthorization: ChecklistItemStatus;
  [key: string]: ChecklistItemStatus | undefined;
}

export type ModernizationActionType = 'ADD_FOUND' | 'CONFIGURE_ADOPT_READINESS' | 'EXTEND_PLAN' | 'BUILD_PROJECT';

export interface ModernizationDecisionRecord {
  actionId: string;
  actionType: ModernizationActionType;
  timestamp: string;
  author: string;
  actorId?: string;
  actorRole?: string;
  details?: Record<string, any>;
  comment?: string;
  idempotencyKey?: string | null;
}

export interface AssessmentRecommendation {
  outcome: RecommendationOutcome;
  canonicalOutcome?: 'ADOPT' | 'CONFIGURE' | 'EXTEND' | 'BUILD' | 'INSUFFICIENT_EVIDENCE' | 'PENDING_VERIFICATION';
  recommendedAction: string;
  supportingEvidence: string[];
  knownLimitations: string[];
  outstandingChecks: string[];
  requiredNextSteps: string[];
}

export interface AssessmentEvidenceScore {
  totalScore: number; // 0 - 100
  completenessLabel: 'COMPLETE' | 'SUBSTANTIAL' | 'PARTIAL' | 'INSUFFICIENT';
  breakdown: {
    dictionaryScore: number; // max 25
    catalogueScore: number;  // max 25
    compatibilityScore: number; // max 20
    technicalServicesScore: number; // max 15
    systemAvailabilityScore: number; // max 15
  };
  explanation: string;
}

/**
 * Proposed Future CAP Endpoints (Backend Readiness Contracts)
 */
export interface AssessmentDetailResponse {
  assessment: AssessmentRecord;
  evidence: DetailedEvidenceRecord[];
  evidenceScore: AssessmentEvidenceScore;
  candidates: CatalogueReference[];
  roleValidation: RoleValidationRecord[];
  odataValidation: ODataServiceValidationRecord[];
  compatibility: ReleaseCompatibilityRecord;
  systemAvailability: SystemAvailabilityAudit;
  recommendation: AssessmentRecommendation;
}

export interface AssessmentEvidenceResponse {
  assessmentId: string;
  tcode: string;
  evidenceCount: number;
  evidenceScore: AssessmentEvidenceScore;
  evidence: DetailedEvidenceRecord[];
}

export interface AssessmentCandidatesResponse {
  assessmentId: string;
  tcode: string;
  primaryAppId: string | null;
  candidates: CatalogueReference[];
}

export interface CatalogueAppDetailResponse {
  app: CatalogueReference;
  relatedTCodes: string[];
  isCuratedDemoData: boolean;
}

/**
 * ============================================================================
 * Canonical SAP System, Transaction Discovery & T-Code Search Contracts
 * ============================================================================
 */

export type SapSystemMode = 'MOCK' | 'LIVE_SAP';

export interface SapSystemRecord {
  systemId: string;
  systemName: string;
  client: string;
  release: string;
  mode: SapSystemMode;
  active: boolean;
  softwareComponents?: string[];
  rfcDestination?: string;
  odataServiceUrl?: string;
}

export type TransactionClassification = 'STANDARD' | 'CUSTOM' | 'PARTNER' | 'UNKNOWN';

export type MetadataCompletenessStatus = 'COMPLETE' | 'INCOMPLETE' | 'NOT_AVAILABLE';

export type LookupBehavior = 'SUCCESS' | 'CONNECTION_ERROR' | 'ACCESS_DENIED';

export interface TadirEvidence {
  pgmid?: string;
  object?: string;
  objName?: string;
  devclass?: string;
  srcsystem?: string;
  softwareComponent?: string;
  author?: string;
  namespace?: string;
}

export interface ClassificationEvidenceDetails {
  evaluatedClassification: TransactionClassification;
  namespaceEvidence: string;
  packageEvidence: string;
  originalSystemEvidence: string;
  softwareComponentEvidence: string;
  conflictsDetected: string[];
}

export interface TransactionFixture {
  systemId: string;
  tcode: string;
  exists: boolean;
  classification: TransactionClassification;
  description?: string;
  program?: string;
  screenNumber?: string;
  packageName?: string;
  originalSystem?: string;
  softwareComponent?: string;
  metadataStatus: MetadataCompletenessStatus;
  lookupBehavior: LookupBehavior;
  evidence: string[];
  tadir?: TadirEvidence;
  classificationDetails?: ClassificationEvidenceDetails;
}

export type FioriAppType = 'TRANSACTIONAL' | 'ANALYTICAL' | 'FACTSHEET' | 'SAP Fiori - Transactional' | 'SAP GUI';

export type UiTechnology =
  | 'SAP Fiori elements'
  | 'SAPUI5 freestyle'
  | 'SAP GUI for HTML'
  | 'Web Dynpro'
  | 'SAP GUI'
  | 'UNKNOWN';

export type RelationshipClassification =
  | 'EXPLICIT_SUCCESSOR'
  | 'SAME_TRANSACTION_CLASSIC'
  | 'SAP_GUI_HTML'
  | 'FUNCTIONAL_ALTERNATIVE'
  | 'NO_STANDARD_APP_EXISTS'
  | 'CATALOGUE_PENDING_VERIFICATION'
  | 'RELEASE_INCOMPATIBLE'
  | 'NO_VERIFIED_MATCH'
  | 'UNKNOWN'
  | 'DIRECT_MATCH'
  | 'RELATED_MATCH'
  | 'POSSIBLE_MATCH';

export type FioriSourceStatus = 'VERIFIED_DEMO_FIXTURE';

export type CatalogueVerificationStatus = 'CATALOGUE_FOUND' | 'CATALOGUE_NOT_FOUND';

export type DescriptorVerificationStatus = 'DESCRIPTOR_FOUND' | 'NOT_CHECKED' | 'NOT_FOUND';

export type AccessVerificationStatus = 'ACCESS_CONFIRMED' | 'NOT_CHECKED' | 'NOT_CONFIRMED';

export interface FioriAppRecord {
  appId: string;
  appName: string;
  appType: FioriAppType;
  uiTechnology: UiTechnology;
  productVersion: string;
  softwareComponent?: string;
  sourceLabel: string;
  sourceStatus: FioriSourceStatus;
  descriptorStatus: DescriptorVerificationStatus;
  accessStatus: AccessVerificationStatus;
}

export type MatchType = RelationshipClassification;

export type ReleaseCompatibility = 'COMPATIBLE' | 'INCOMPATIBLE' | 'UNKNOWN';

export interface TCodeAppMapping {
  mappingId: string;
  systemId: string;
  tcode: string;
  appId: string;
  matchType: MatchType;
  rationale: string;
  reviewStatus: 'APPROVED_FOR_DEMO' | 'DRAFT' | 'REJECTED' | 'PENDING_VERIFICATION';
  releaseCompatibility: ReleaseCompatibility;
}

export type SearchStatusCode =
  | 'INVALID_INPUT'
  | 'SYSTEM_NOT_CONFIGURED'
  | 'CONNECTION_ERROR'
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'METADATA_INCOMPLETE'
  | 'NO_VERIFIED_MATCH'
  | 'MATCH_FOUND'
  | 'EXPLICIT_SUCCESSOR'
  | 'SAME_TRANSACTION_CLASSIC'
  | 'SAP_GUI_HTML'
  | 'FUNCTIONAL_ALTERNATIVE'
  | 'CATALOGUE_PENDING_VERIFICATION'
  | 'NO_STANDARD_APP_EXISTS'
  | 'RELEASE_INCOMPATIBLE'
  | 'UNKNOWN';

export interface FioriCandidateResult {
  appId: string;
  appName: string;
  appType: FioriAppType;
  uiTechnology: UiTechnology;
  productVersion: string;
  softwareComponent?: string;
  matchType: MatchType;
  matchEvidence: string[];
  catalogueStatus: CatalogueVerificationStatus;
  descriptorStatus: DescriptorVerificationStatus;
  accessStatus: AccessVerificationStatus;
  sourceLabel: string;
  releaseCompatibility: ReleaseCompatibility;
  rationale: string;
}

export interface ExcludedCandidateResult {
  appId: string;
  appName: string;
  productVersion: string;
  exclusionReason: string;
  releaseCompatibility: ReleaseCompatibility;
}

export interface TechnicalDiagnostics {
  provenance: string[];
  classificationEvidence: string[];
  matchingRuleApplied: string;
  warnings: string[];
  releaseCompatibilityEvaluated: {
    systemRelease: string;
    evaluatedCandidates: number;
    compatibleCount: number;
    incompatibleCount: number;
  };
  excludedCandidates: ExcludedCandidateResult[];
  decisionExplanation: string;
}

export interface TCodeSearchRequest {
  systemId: string;
  tcode: string;
  language?: string;
  mode?: 'MOCK' | 'LIVE_SAP';
}

export interface TCodeSearchResponse {
  requestId: string;
  mode: 'MOCK' | 'LIVE_SAP';
  timestamp: string;
  system: {
    systemId: string;
    systemName: string;
    client: string;
    release: string;
    mode?: 'MOCK' | 'LIVE_SAP';
    softwareComponents?: string[];
  };
  transaction?: {
    tcode: string;
    exists: boolean;
    classification: TransactionClassification;
    description?: string;
    program?: string;
    screenNumber?: string;
    packageName?: string;
    originalSystem?: string;
    softwareComponent?: string;
    metadataStatus: MetadataCompletenessStatus;
    evidence: string[];
    tadir?: TadirEvidence;
    classificationDetails?: ClassificationEvidenceDetails;
  };
  matching: {
    status: SearchStatusCode;
    candidates: FioriCandidateResult[];
  };
  overallStatus: SearchStatusCode;
  diagnostics: TechnicalDiagnostics;
  errorMessage?: string;
}

export interface SearchHistoryItem {
  id: string;
  systemId: string;
  tcode: string;
  timestamp: string;
  resultStatus: SearchStatusCode;
  classification?: TransactionClassification;
  candidateCount: number;
}



