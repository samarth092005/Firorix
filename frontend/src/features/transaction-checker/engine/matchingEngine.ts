import {
  SapSystemRecord,
  FioriCandidateResult,
  ExcludedCandidateResult,
  SearchStatusCode,
  TechnicalDiagnostics,
  TransactionClassification,
  MetadataCompletenessStatus
} from '../types';
import { mockCatalogueAdapter } from '../adapters/mockCatalogueAdapter';

export interface EvaluationInput {
  system: SapSystemRecord;
  tcode: string;
  transaction?: {
    tcode: string;
    exists: boolean;
    classification: TransactionClassification;
    description?: string;
    program?: string;
    screenNumber?: string;
    packageName?: string;
    metadataStatus: MetadataCompletenessStatus;
    evidence: string[];
  };
}

export interface EvaluationResult {
  status: SearchStatusCode;
  candidates: FioriCandidateResult[];
  diagnostics: TechnicalDiagnostics;
}

export class MatchingEngine {
  /**
   * Evaluates Fiori catalogue candidates deterministically.
   * Enforces Rules 1-4 and release compatibility constraints.
   * Absolutely NO keyword similarity or probabilistic matching.
   */
  public evaluate(input: EvaluationInput): EvaluationResult {
    const { system, tcode, transaction } = input;
    const warnings: string[] = [];

    // Check transaction metadata status
    if (transaction?.exists && transaction.metadataStatus === 'INCOMPLETE') {
      warnings.push(
        'Transaction exists in mock system, but optional description or executable program metadata is missing in the fixture.'
      );
    }

    const mappingRows = mockCatalogueAdapter.getMappingsForTCode(tcode);

    // Check if transaction has pending catalogue or TADIR verification
    const isPendingVerification =
      mappingRows.some((m) => m.matchType === 'CATALOGUE_PENDING_VERIFICATION') ||
      (transaction?.evidence &&
        transaction.evidence.some((e) => e.toLowerCase().includes('pending verification')));

    if (isPendingVerification) {
      const matchingRuleApplied =
        'Catalogue Pending Verification Rule: Transaction exists in SAP DDIC (TSTC/TSTCT verified), but TADIR package classification and official Fiori catalogue matching remain pending verification. Unknown evidence is strictly preserved and not marked as an absent app.';
      const decisionExplanation = `Transaction "${tcode}" verified in mock system (${system.systemId}). DDIC records confirmed (TSTC/TSTCT). TADIR classification and official SAP Fiori Apps Reference Library mapping have not yet been audited. In accordance with Golden Invariant BR-03 ("Unknown is not Unsupported"), this transaction remains in CATALOGUE_PENDING_VERIFICATION rather than a confirmed absence.`;

      const diagnostics: TechnicalDiagnostics = {
        provenance: [
          'TSTC / TSTCT verified in mock system (data/transactions.csv)',
          'TADIR classification pending verification',
          'Official SAP Fiori catalogue matching pending verification'
        ],
        classificationEvidence: transaction ? [...transaction.evidence] : [],
        matchingRuleApplied,
        warnings: [
          'TADIR package classification and official SAP Fiori catalogue mapping remain pending technical verification.'
        ],
        releaseCompatibilityEvaluated: {
          systemRelease: system.release,
          evaluatedCandidates: 0,
          compatibleCount: 0,
          incompatibleCount: 0
        },
        excludedCandidates: [],
        decisionExplanation
      };

      return {
        status: 'CATALOGUE_PENDING_VERIFICATION',
        candidates: [],
        diagnostics
      };
    }

    // Check if mapping explicitly records verified absence of standard application
    const hasNoStandardAppMapping = mappingRows.some((m) => m.matchType === 'NO_STANDARD_APP_EXISTS');
    if (hasNoStandardAppMapping) {
      const matchingRuleApplied =
        'Verified Absence Rule: Curated catalogue audit confirms no standard SAP Fiori application exists for this transaction in the target S/4HANA release.';
      const decisionExplanation = `Transaction "${tcode}" verified in system (${system.systemId}) with classification "${transaction?.classification || 'CUSTOM'}". Curated catalogue audit (data/tcode_app_mappings.csv) confirms that NO standard SAP Fiori application exists for this workflow. Custom application development or classic GUI access may be evaluated.`;

      const diagnostics: TechnicalDiagnostics = {
        provenance: [
          'TSTC / TSTCT / TADIR verified (data/transactions.csv)',
          'Official SAP Fiori Apps Reference Library audit',
          'Curated absence confirmation (data/tcode_app_mappings.csv)'
        ],
        classificationEvidence: transaction ? [...transaction.evidence] : [],
        matchingRuleApplied,
        warnings: ['No standard SAP Fiori application exists in the target release.'],
        releaseCompatibilityEvaluated: {
          systemRelease: system.release,
          evaluatedCandidates: 0,
          compatibleCount: 0,
          incompatibleCount: 0
        },
        excludedCandidates: [],
        decisionExplanation
      };

      return {
        status: 'NO_STANDARD_APP_EXISTS',
        candidates: [],
        diagnostics
      };
    }

    const candidates: FioriCandidateResult[] = [];
    const excludedCandidates: ExcludedCandidateResult[] = [];

    let compatibleCount = 0;
    let incompatibleCount = 0;

    for (const mapping of mappingRows) {
      if (
        mapping.matchType === 'CATALOGUE_PENDING_VERIFICATION' ||
        mapping.matchType === 'NO_STANDARD_APP_EXISTS'
      ) {
        continue;
      }

      const appRecord = mockCatalogueAdapter.getAppById(mapping.appId);
      const appName = appRecord?.appName || mapping.appId;
      const productVersion = appRecord?.productVersion || 'UNKNOWN';

      // Rule: Release Compatibility Check
      if (mapping.releaseCompatibility === 'INCOMPATIBLE') {
        incompatibleCount++;
        excludedCandidates.push({
          appId: mapping.appId,
          appName,
          productVersion,
          releaseCompatibility: 'INCOMPATIBLE',
          exclusionReason: `Candidate version (${productVersion}) is incompatible with selected demo landscape release (${system.release}). Rationale: ${mapping.rationale}`
        });
        continue;
      }

      if (mapping.releaseCompatibility === 'UNKNOWN') {
        incompatibleCount++;
        excludedCandidates.push({
          appId: mapping.appId,
          appName,
          productVersion,
          releaseCompatibility: 'UNKNOWN',
          exclusionReason: `Release compatibility is unverified (UNKNOWN) for target release ${system.release}. Excluded from primary recommendations per Phase 1 governance.`
        });
        continue;
      }

      // Candidate is COMPATIBLE
      compatibleCount++;

      if (appRecord) {
        candidates.push({
          appId: appRecord.appId,
          appName: appRecord.appName,
          appType: appRecord.appType,
          uiTechnology: appRecord.uiTechnology || 'UNKNOWN',
          productVersion: appRecord.productVersion,
          matchType: mapping.matchType,
          matchEvidence: [mapping.rationale],
          catalogueStatus: 'CATALOGUE_FOUND',
          descriptorStatus: appRecord.descriptorStatus,
          accessStatus: appRecord.accessStatus,
          sourceLabel: appRecord.sourceLabel,
          releaseCompatibility: mapping.releaseCompatibility,
          rationale: mapping.rationale
        });
      }
    }

    // Determine matching rule and status
    let matchingRuleApplied = 'Rule 4 — No Match: No verified Fiori app candidate in curated demo catalogue.';
    let status: SearchStatusCode = 'NO_VERIFIED_MATCH';

    if (candidates.length > 0) {
      const hasExplicitSuccessor = candidates.some((c) => c.matchType === 'EXPLICIT_SUCCESSOR');
      const hasSapGuiHtml = candidates.some((c) => c.matchType === 'SAP_GUI_HTML' || c.matchType === 'SAME_TRANSACTION_CLASSIC');
      const hasFunctionalAlternative = candidates.some((c) => c.matchType === 'FUNCTIONAL_ALTERNATIVE');
      const hasDirect = candidates.some((c) => c.matchType === 'DIRECT_MATCH');
      const hasRelated = candidates.some((c) => c.matchType === 'RELATED_MATCH');
      const hasPossible = candidates.some((c) => c.matchType === 'POSSIBLE_MATCH');

      if (hasExplicitSuccessor) {
        matchingRuleApplied =
          'Explicit Successor Rule: SAP-designated standard Fiori elements application verified as direct successor for legacy transaction.';
      } else if (hasSapGuiHtml) {
        matchingRuleApplied =
          'Classic Transaction in Launchpad Rule: Transaction is hosted in Fiori Launchpad via SAP GUI for HTML (WebGUI). This is NOT a native SAP Fiori elements application.';
      } else if (hasFunctionalAlternative) {
        matchingRuleApplied =
          'Functional Alternative Rule: Standard SAP Fiori elements application offers modern web capabilities alternative for classic transaction workflow.';
      } else if (hasDirect) {
        matchingRuleApplied = 'Rule 1 — Exact Match: Approved 1:1 T-Code association verified in mock catalogue.';
      } else if (hasRelated) {
        matchingRuleApplied =
          'Rule 2 — Curated Related: Curated business-function mapping; related functionality does not establish functional equivalence.';
      } else if (hasPossible) {
        matchingRuleApplied =
          'Rule 3 — Possible Match: Candidate flagged for review; not confirmed as direct equivalent.';
      }

      status = 'MATCH_FOUND';
    }

    // Compose human-readable decision explanation
    let decisionExplanation = '';
    if (!transaction || !transaction.exists) {
      decisionExplanation = `Lookup for "${tcode}" executed against mock SAP landscape (${system.systemId}). Transaction was not found in mock TSTC tables. Catalogue matching was skipped.`;
    } else if (candidates.length > 0) {
      const candidateList = candidates.map((c) => `${c.appName} (${c.appId}) [${c.matchType}]`).join(', ');
      decisionExplanation = `Transaction "${tcode}" verified in mock system (${system.systemId}) with classification "${transaction.classification}". Matching engine identified ${candidates.length} compatible candidate(s): ${candidateList}. ${matchingRuleApplied}`;
    } else if (excludedCandidates.length > 0) {
      decisionExplanation = `Transaction "${tcode}" verified in mock system (${system.systemId}), but all ${excludedCandidates.length} candidate mapping(s) were excluded due to release incompatibility with ${system.release}. Outcome: NO_VERIFIED_MATCH.`;
    } else {
      decisionExplanation = `Transaction "${tcode}" verified in mock system (${system.systemId}), but no approved mapping row exists in the curated demo catalogue (data/tcode_app_mappings.csv). Keyword-only guessing is prohibited. Outcome: NO_VERIFIED_MATCH.`;
    }

    const diagnostics: TechnicalDiagnostics = {
      provenance: [
        'TSTC / TSTCT / TADIR mock fixtures (data/transactions.csv)',
        'Curated Fiori catalogue fixtures (data/fiori_catalogue.csv)',
        'Approved deterministic mappings (data/tcode_app_mappings.csv)'
      ],
      classificationEvidence: transaction ? [...transaction.evidence] : [],
      matchingRuleApplied,
      warnings,
      releaseCompatibilityEvaluated: {
        systemRelease: system.release,
        evaluatedCandidates: mappingRows.length,
        compatibleCount,
        incompatibleCount
      },
      excludedCandidates,
      decisionExplanation
    };

    return {
      status,
      candidates,
      diagnostics
    };
  }
}

export const matchingEngine = new MatchingEngine();
