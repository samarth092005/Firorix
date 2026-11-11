import { catalogueAdapter } from './adapters/catalogueAdapter.js';

export class MatchingEngine {
  evaluate(input) {
    const { system, tcode, transaction } = input;
    const warnings = [];

    if (transaction?.exists && transaction.metadataStatus === 'INCOMPLETE') {
      warnings.push(
        'Transaction exists in mock system, but optional description or executable program metadata is missing in the fixture.'
      );
    }

    const mappingRows = catalogueAdapter.getMappingsForTCode(tcode);

    // Check if transaction has pending catalogue or TADIR verification
    const isPendingVerification =
      mappingRows.some((m) => m.matchType === 'CATALOGUE_PENDING_VERIFICATION') ||
      (transaction?.evidence &&
        transaction.evidence.some((e) => e.toLowerCase().includes('pending verification')));

    if (isPendingVerification) {
      const matchingRuleApplied =
        'Catalogue Pending Verification Rule: Transaction exists in SAP DDIC (TSTC/TSTCT verified), but TADIR package classification and official Fiori catalogue matching remain pending verification.';
      const decisionExplanation = `Transaction "${tcode}" verified in system (${system.systemId}). DDIC records confirmed (TSTC/TSTCT). TADIR classification and official SAP Fiori Apps Reference Library mapping have not yet been audited. In accordance with Golden Invariant BR-03 ("Unknown is not Unsupported"), this transaction remains in CATALOGUE_PENDING_VERIFICATION.`;

      return {
        status: 'CATALOGUE_PENDING_VERIFICATION',
        candidates: [],
        diagnostics: {
          provenance: [
            'TSTC / TSTCT verified in system',
            'TADIR classification pending verification',
            'Official SAP Fiori catalogue matching pending verification'
          ],
          classificationEvidence: transaction ? [...transaction.evidence] : [],
          matchingRuleApplied,
          warnings: ['TADIR package classification and official SAP Fiori catalogue mapping remain pending technical verification.'],
          releaseCompatibilityEvaluated: {
            systemRelease: system.release,
            evaluatedCandidates: 0,
            compatibleCount: 0,
            incompatibleCount: 0
          },
          excludedCandidates: [],
          decisionExplanation
        }
      };
    }

    // Check if mapping explicitly records verified absence of standard application
    const hasNoStandardAppMapping = mappingRows.some((m) => m.matchType === 'NO_STANDARD_APP_EXISTS');
    if (hasNoStandardAppMapping) {
      const matchingRuleApplied =
        'Verified Absence Rule: Curated catalogue audit confirms no standard SAP Fiori application exists for this transaction in the target S/4HANA release.';
      const decisionExplanation = `Transaction "${tcode}" verified in system (${system.systemId}) with classification "${transaction?.classification || 'CUSTOM'}". Curated catalogue audit confirms that NO standard SAP Fiori application exists for this workflow. Custom application development or classic GUI access may be evaluated.`;

      return {
        status: 'NO_STANDARD_APP_EXISTS',
        candidates: [],
        diagnostics: {
          provenance: [
            'TSTC / TSTCT / TADIR verified',
            'Official SAP Fiori Apps Reference Library audit',
            'Curated absence confirmation'
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
        }
      };
    }

    const candidates = [];
    const excludedCandidates = [];
    let compatibleCount = 0;
    let incompatibleCount = 0;

    for (const mapping of mappingRows) {
      if (
        mapping.matchType === 'CATALOGUE_PENDING_VERIFICATION' ||
        mapping.matchType === 'NO_STANDARD_APP_EXISTS'
      ) {
        continue;
      }

      const appRecord = catalogueAdapter.getAppById(mapping.appId);
      const appName = appRecord?.appName || mapping.appId;
      const productVersion = appRecord?.productVersion || 'UNKNOWN';

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
          exclusionReason: `Release compatibility is unverified (UNKNOWN) for target release ${system.release}.`
        });
        continue;
      }

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
          releaseCompatibility: mapping.releaseCompatibility,
          rationale: mapping.rationale
        });
      }
    }

    let matchingRuleApplied = 'Rule 4 — No Match: No verified Fiori app candidate in curated demo catalogue.';
    let status = 'NO_VERIFIED_MATCH';

    if (candidates.length > 0) {
      const hasExplicitSuccessor = candidates.some((c) => c.matchType === 'EXPLICIT_SUCCESSOR');
      const hasSapGuiHtml = candidates.some((c) => c.matchType === 'SAP_GUI_HTML' || c.matchType === 'SAME_TRANSACTION_CLASSIC');
      const hasFunctionalAlternative = candidates.some((c) => c.matchType === 'FUNCTIONAL_ALTERNATIVE');
      const hasDirect = candidates.some((c) => c.matchType === 'DIRECT_MATCH');
      const hasRelated = candidates.some((c) => c.matchType === 'RELATED_MATCH');

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
        matchingRuleApplied = 'Rule 1 — Exact Match: Approved 1:1 T-Code association verified in catalogue.';
      } else if (hasRelated) {
        matchingRuleApplied =
          'Rule 2 — Curated Related: Curated business-function mapping; related functionality does not establish functional equivalence.';
      }

      status = 'MATCH_FOUND';
    }

    let decisionExplanation = '';
    if (!transaction || !transaction.exists) {
      decisionExplanation = `Lookup for "${tcode}" executed against landscape (${system.systemId}). Transaction was not found in TSTC tables.`;
    } else if (candidates.length > 0) {
      const candidateList = candidates.map((c) => `${c.appName} (${c.appId}) [${c.matchType}]`).join(', ');
      decisionExplanation = `Transaction "${tcode}" verified in system (${system.systemId}) with classification "${transaction.classification}". Matching engine identified ${candidates.length} compatible candidate(s): ${candidateList}. ${matchingRuleApplied}`;
    } else if (excludedCandidates.length > 0) {
      decisionExplanation = `Transaction "${tcode}" verified in system (${system.systemId}), but all ${excludedCandidates.length} candidate mapping(s) were excluded due to release incompatibility with ${system.release}.`;
    } else {
      decisionExplanation = `Transaction "${tcode}" verified in system (${system.systemId}), but no approved mapping row exists in the curated catalogue.`;
    }

    return {
      status,
      candidates,
      diagnostics: {
        provenance: [
          'TSTC / TSTCT / TADIR repository evidence',
          'Curated Fiori catalogue fixtures',
          'Approved deterministic mappings'
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
      }
    };
  }
}

export const matchingEngine = new MatchingEngine();
