/**
 * FioriX Phase 1 - Domain Types & API Contracts
 * Local Mock Demo - Not connected to SAP/BTP
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

/**
 * Stable Status Codes for Phase 1 Search Outcome
 */
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
