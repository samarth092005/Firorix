/**
 * FioriX — Standard SAP Fiori Application Matching & Ranking Engine (MATCH-01 + MATCH-02)
 *
 * Implements evidence-based, deterministic matching and explainable ranking:
 * - Searches canonical Fiori catalogue (fiori_app_catalog_cache.json via officialFioriCatalogueAdapter).
 * - Evaluates candidates across 6 dimensions:
 *   1. Transaction Code Relationship (exact leading T-Code, explicit successor)
 *   2. Functional Fit (business functionality, description keywords, capabilities)
 *   3. Technical Fit (OData dependencies, UI5 component, active Gateway services)
 *   4. Business Context (Line of Business, business roles, launchpad catalogs)
 *   5. Release Compatibility (product version, software component level)
 *   6. Evidence Completeness & Reliability
 * - Configurable central scoring model with strict governance guardrails.
 * - Comprehensive explainability (matching reasons, functional/technical gaps, conflicts, assumptions).
 * - Candidate comparison matrix generation.
 * - Recommendation-readiness contract for downstream Fit-Gap assessment (FITGAP-01/02).
 */

import { officialFioriCatalogueAdapter } from '../adapters/officialFioriCatalogueAdapter.js';
import { CONFIDENCE_LEVELS } from './technicalEvidenceEngine.js';

export const MATCHING_WEIGHTS = {
  tcodeRelationship: 30,
  functionalFit: 25,
  technicalFit: 25,
  businessContext: 10,
  releaseCompatibility: 10
};

export const MATCH_CLASSIFICATIONS = {
  VERIFIED_MATCH: 'VERIFIED_MATCH',
  STRONG_CANDIDATE: 'STRONG_CANDIDATE',
  PARTIAL_MATCH: 'PARTIAL_MATCH',
  PARTIAL_FIT: 'PARTIAL_FIT',
  ALTERNATIVE_APPROACH: 'ALTERNATIVE_APPROACH',
  WEAK_CANDIDATE: 'WEAK_CANDIDATE',
  NO_MATCH: 'NO_MATCH',
  INCOMPATIBLE: 'INCOMPATIBLE',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION'
};

export const RECOMMENDATION_READINESS = {
  SUFFICIENT_EVIDENCE_FOR_ASSESSMENT: 'SUFFICIENT_EVIDENCE_FOR_ASSESSMENT',
  PARTIAL_EVIDENCE_REQUIRES_REVIEW: 'PARTIAL_EVIDENCE_REQUIRES_REVIEW',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
  NO_SUITABLE_STANDARD_CANDIDATE: 'NO_SUITABLE_STANDARD_CANDIDATE'
};

export class FioriMatchingEngine {
  constructor(options = {}) {
    this.catalogueAdapter = options.catalogueAdapter || officialFioriCatalogueAdapter;
    this.weights = { ...MATCHING_WEIGHTS, ...(options.weights || {}) };
  }

  /**
   * Matches a discovered transaction against the canonical Fiori catalogue.
   *
   * @param {Object} params
   * @param {Object} params.transaction - Canonical transaction discovery record
   * @param {Array} [params.technicalEvidence] - Discovered technical evidence
   * @param {Array} [params.liveGatewayServices] - Active Gateway services on target system
   * @param {Object} [params.userRequirement] - Optional user business requirement
   * @param {string} [params.targetRelease] - Target SAP product release
   * @returns {Promise<Object>} Ranked candidates, explainability, comparison, and recommendation readiness
   */
  async match(params = {}) {
    const {
      transaction = {},
      technicalEvidence = [],
      liveGatewayServices = [],
      userRequirement = null,
      targetRelease = 'SAP S/4HANA 2023 Private Edition'
    } = params;

    const tcode = (transaction.transactionCode || transaction.tcode || params.tcode || '').trim().toUpperCase();
    const tcodeDesc = transaction.transactionDescription || transaction.description || params.transactionDescription || params.description || '';

    if (!tcode) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        errorMessage: 'Transaction code is required for application matching.',
        rankedCandidates: [],
        bestCandidate: null,
        matchClassification: MATCH_CLASSIFICATIONS.NO_MATCH,
        recommendationReadiness: RECOMMENDATION_READINESS.INSUFFICIENT_EVIDENCE
      };
    }

    // -------------------------------------------------------------------------
    // 1. Search Canonical Fiori Catalogue or Consume Merged Candidate Pool
    // -------------------------------------------------------------------------
    let candidateApps = [];
    if (Array.isArray(params.candidatePool)) {
      candidateApps = params.candidatePool;
    } else {
      const searchResult = await this.catalogueAdapter.searchApps({
        tcode,
        query: tcodeDesc,
        limit: 50
      });
      candidateApps = searchResult.candidates || [];
    }

    // Filter out synthesized custom workspace entries or non-standard tiles from standard candidate matching
    candidateApps = candidateApps.filter((a) => !a.isCustom && !a.isSynthesizedWebGui);

    if (candidateApps.length === 0) {
      return {
        success: true,
        statusCode: 'NO_CANDIDATES_FOUND',
        transactionCode: tcode,
        matchClassification: MATCH_CLASSIFICATIONS.NO_MATCH,
        totalCandidatesEvaluated: 0,
        rankedCandidates: [],
        bestCandidate: null,
        candidateComparison: [],
        missingEvidence: [`No standard SAP Fiori application found for ${tcode} in canonical catalogue.`],
        verificationWarnings: ['Absence of standard Fiori app: consider SAP GUI for HTML or custom extension.'],
        recommendationReadiness: RECOMMENDATION_READINESS.NO_SUITABLE_STANDARD_CANDIDATE,
        scoringWeights: this.weights,
        assessmentHandoff: (transaction.classification === 'CUSTOM' || tcode.startsWith('Z') || tcode.startsWith('Y')) ? {
          requirement: {
            title: `Modernise custom transaction ${tcode}`,
            tcode,
            statement: `Customer proprietary transaction ${tcode} requires Clean Core RAP modernization in Generation Studio.`,
            businessProcess: 'Custom Modernization',
            capabilities: ['Custom Business Logic', 'Fiori Elements UI'],
            isCustom: true
          },
          candidate: null,
          context: {
            systemId: (params.transaction && (params.transaction.systemId || params.transaction.targetSystem?.systemId)) || 'S21-200',
            client: (params.transaction && (params.transaction.client || params.transaction.targetSystem?.client)) || '200',
            systemRelease: targetRelease
          }
        } : null,
        evaluatedAt: new Date().toISOString()
      };
    }

    // Prepare live Gateway service lookup set
    const activeGatewayNames = new Set(
      liveGatewayServices.map((s) => (s.technicalServiceName || s.id || '').toUpperCase().replace(/^Z/, ''))
    );

    // -------------------------------------------------------------------------
    // 2. Multi-Dimensional Candidate Evaluation
    // -------------------------------------------------------------------------
    const evaluatedCandidates = candidateApps.map((app) =>
      this.evaluateCandidate({
        app,
        tcode,
        tcodeDesc,
        transaction,
        technicalEvidence,
        activeGatewayNames,
        userRequirement,
        targetRelease
      })
    );

    // -------------------------------------------------------------------------
    // 3. Deterministic Ranking
    // -------------------------------------------------------------------------
    evaluatedCandidates.sort((a, b) => {
      // 0 priority: Direct equivalents and official successors precede indirect/related apps
      const aIsDirectOrSuccessor = a.tcodeRelationshipType === 'OFFICIAL_SUCCESSOR' || a.tcodeRelationshipType === 'DIRECT_EQUIVALENT';
      const bIsDirectOrSuccessor = b.tcodeRelationshipType === 'OFFICIAL_SUCCESSOR' || b.tcodeRelationshipType === 'DIRECT_EQUIVALENT';
      if (aIsDirectOrSuccessor && !bIsDirectOrSuccessor) return -1;
      if (!aIsDirectOrSuccessor && bIsDirectOrSuccessor) return 1;

      // 1st priority: Overall Score descending
      if (b.overallScore !== a.overallScore) {
        return b.overallScore - a.overallScore;
      }
      // 2nd priority: T-Code Relationship score descending
      if (b.dimensionScores.tcodeRelationship !== a.dimensionScores.tcodeRelationship) {
        return b.dimensionScores.tcodeRelationship - a.dimensionScores.tcodeRelationship;
      }
      // 3rd priority: App ID alphabetical
      return a.appId.localeCompare(b.appId);
    });

    // Assign ranking positions
    evaluatedCandidates.forEach((cand, idx) => {
      cand.rank = idx + 1;
    });

    const bestCandidate = evaluatedCandidates[0] || null;

    // -------------------------------------------------------------------------
    // 4. Overall Match Classification & Recommendation Readiness
    // -------------------------------------------------------------------------
    let overallMatchClassification = MATCH_CLASSIFICATIONS.NO_MATCH;
    let recommendationReadiness = RECOMMENDATION_READINESS.INSUFFICIENT_EVIDENCE;

    if (bestCandidate) {
      overallMatchClassification = bestCandidate.matchClassification;

      if (bestCandidate.matchClassification === MATCH_CLASSIFICATIONS.VERIFIED_MATCH) {
        recommendationReadiness = RECOMMENDATION_READINESS.SUFFICIENT_EVIDENCE_FOR_ASSESSMENT;
      } else if (
        bestCandidate.matchClassification === MATCH_CLASSIFICATIONS.STRONG_CANDIDATE ||
        bestCandidate.matchClassification === MATCH_CLASSIFICATIONS.PARTIAL_MATCH
      ) {
        recommendationReadiness = RECOMMENDATION_READINESS.PARTIAL_EVIDENCE_REQUIRES_REVIEW;
      } else if (bestCandidate.matchClassification === MATCH_CLASSIFICATIONS.WEAK_CANDIDATE) {
        recommendationReadiness = RECOMMENDATION_READINESS.PARTIAL_EVIDENCE_REQUIRES_REVIEW;
      } else {
        recommendationReadiness = RECOMMENDATION_READINESS.NO_SUITABLE_STANDARD_CANDIDATE;
      }
    }

    // -------------------------------------------------------------------------
    // 5. Candidate Comparison Matrix
    // -------------------------------------------------------------------------
    const candidateComparison = evaluatedCandidates.map((c) => ({
      rank: c.rank,
      appId: c.appId,
      appName: c.appName,
      appType: c.appType,
      tcodeRelationship: c.tcodeRelationshipType,
      functionalFitPercent: Math.round((c.dimensionScores.functionalFit / this.weights.functionalFit) * 100),
      technicalFitPercent: Math.round((c.dimensionScores.technicalFit / this.weights.technicalFit) * 100),
      releaseCompatibility: c.releaseCompatibilityStatus,
      missingEvidenceCount: c.missingEvidence.length,
      overallScore: c.overallScore,
      matchClassification: c.matchClassification,
      provenance: c.provenance,
      source: c.source || c.provenance,
      sources: c.sources || [c.source || c.provenance],
      inLocalCatalogue: c.inLocalCatalogue !== false,
      isExternalMcpDiscovered: Boolean(c.isExternalMcpDiscovered),
      conflictingFields: c.conflictingFields || []
    }));

    // -------------------------------------------------------------------------
    // 6. Assessment Handoff Payload (FITGAP-01/02 Ready)
    // -------------------------------------------------------------------------
    let assessmentHandoff = null;
    if (bestCandidate) {
      assessmentHandoff = {
        requirement: {
          title: userRequirement?.title || `Evaluate standard Fiori replacement for ${tcode}`,
          tcode,
          statement: userRequirement?.statement || `Replace SAP transaction ${tcode} (${tcodeDesc || 'Standard'}) with verified Fiori application.`,
          businessProcess: userRequirement?.businessProcess || bestCandidate.businessProcess || 'Financial Accounting',
          capabilities: userRequirement?.capabilities || (bestCandidate.description ? [bestCandidate.appName] : ['General Transactional Capabilities'])
        },
        candidate: {
          appId: bestCandidate.appId,
          appName: bestCandidate.appName,
          appType: bestCandidate.appType,
          uiTechnology: bestCandidate.uiTechnology,
          productVersion: bestCandidate.productVersion,
          businessRole: bestCandidate.businessRole,
          odataDependencies: bestCandidate.odataServices || [],
          capabilities: [bestCandidate.appName]
        },
        context: {
          systemId: (params.transaction && (params.transaction.systemId || params.transaction.targetSystem?.systemId)) || 'S21-200',
          client: (params.transaction && (params.transaction.client || params.transaction.targetSystem?.client)) || '200',
          systemRelease: targetRelease,
          activeServices: liveGatewayServices,
          userAuthorizations: []
        }
      };
    }

    return {
      success: true,
      statusCode: 'SUCCESS',
      transactionCode: tcode,
      transactionDescription: tcodeDesc,
      matchClassification: overallMatchClassification,
      recommendationReadiness,
      totalCandidatesEvaluated: evaluatedCandidates.length,
      bestCandidate,
      rankedCandidates: evaluatedCandidates,
      candidateComparison,
      assessmentHandoff,
      scoringWeights: this.weights,
      evaluatedAt: new Date().toISOString()
    };
  }

  /**
   * Evaluates a single candidate application against the transaction across 6 dimensions.
   */
  evaluateCandidate(options) {
    const {
      app,
      tcode,
      tcodeDesc,
      transaction,
      technicalEvidence,
      activeGatewayNames,
      userRequirement,
      targetRelease
    } = options;

    const matchingReasons = [];
    const positiveFactors = [];
    const negativeFactors = [];
    const functionalGaps = [];
    const technicalGaps = [];
    const missingEvidence = [];
    const conflicts = [];
    const assumptions = [];
    const verificationRequirements = [];

    const dimensionScores = {
      tcodeRelationship: 0,
      functionalFit: 0,
      technicalFit: 0,
      businessContext: 0,
      releaseCompatibility: 0
    };

    // =========================================================================
    // Dimension 1: Transaction Code Relationship (Weight: 30)
    // =========================================================================
    const CANONICAL_SUCCESSORS = {
      'F1612': ['F-53', 'F-58'],
      'F1367': ['F-53'],
      'F0718': ['FB50', 'F-02'],
      'F0842A': ['ME21N', 'ME22N', 'ME23N'],
      'F1873': ['VA01', 'VA02', 'VA03', 'VA05'],
      'F1345': ['F-28'],
      'F0717': ['FB01', 'FB02', 'FB03'],
      'F0859A': ['FB60', 'FV60', 'MIRO', 'MIR7'],
      'F1061': ['MIGO'],
      'F3163': ['BP'],
      'F0731': ['FS00'],
      'F2059': ['OB52'],
      'F3445': ['FBN1'],
      'F1602': ['MM01', 'MM02', 'MM03'],
      'F0771': ['F110'],
      'F3956': ['CO01', 'CO02', 'CO03'],
      'F2175': ['IW31', 'IW32', 'IW33'],
      'F1813': ['CS01', 'CS02', 'CS03'],
      'F0798': ['VF01', 'VF02', 'VF03', 'VF04'],
      'F2228': ['VL01N', 'VL02N', 'VL03N', 'VL06O'],
      'F0712': ['FBL1N'],
      'F0711': ['FBL3N'],
      'F0713': ['FBL5N'],
      'F1303': ['SU01', 'SU10'],
      'F1492': ['PFCG'],
      'F1443': ['KS01', 'KS02', 'KS03'],
      'F2078': ['QA01', 'QA02', 'QA03'],
      'F1643': ['ME51N'],
      'F2229': ['ME52N', 'ME53N', 'ME54N'],
      'F2427': ['KB11N'],
      'F1444': ['KO01', 'KO02', 'KO03'],
      'F2564': ['SE11'],
      'F2565': ['SE38'],
      'F1708': ['SM30'],
      'F1709': ['SPRO'],
      'F2850': ['FB70'],
      'F3389': ['MIGO'],
      'F1595': ['MB51'],
      'F2342': ['MB52'],
      'F0247': ['MD04'],
      'F3616': ['OB08']
    };

    let tcodeRelationshipType = 'UNVERIFIED_RELATIONSHIP';
    const isExactAppIdMatch = app.appId.toUpperCase() === tcode;
    const isLeadingTcodeMatch = (app.leadingTransactionCodes || []).map((t) => t.trim().toUpperCase()).includes(tcode);
    const isCanonicalSuccessor = (CANONICAL_SUCCESSORS[app.appId] || []).includes(tcode);
    const isSapGuiApp = app.appType === 'SAP GUI' || (app.uiTechnology && String(app.uiTechnology).includes('SAP GUI'));

    if (isLeadingTcodeMatch || isCanonicalSuccessor) {
      tcodeRelationshipType = 'OFFICIAL_SUCCESSOR';
      dimensionScores.tcodeRelationship = this.weights.tcodeRelationship;
      positiveFactors.push(`Official FAL designates ${app.appId} as leading modern replacement for legacy T-Code ${tcode}.`);
      matchingReasons.push(`Official SAP Fiori Apps Library designated modern successor for legacy transaction ${tcode}.`);
    } else if (isExactAppIdMatch && isSapGuiApp) {
      tcodeRelationshipType = 'WEBGUI_BRIDGE';
      dimensionScores.tcodeRelationship = this.weights.tcodeRelationship * 0.75;
      positiveFactors.push(`Classic WebGUI bridge: App ${app.appId} provides direct Launchpad access to legacy transaction ${tcode} via WebGUI.`);
      matchingReasons.push(`Classic SAP GUI transaction hosted in Fiori Launchpad (WebGUI tile ${app.appId}). Modern Fiori Elements apps preferred for Clean Core.`);
    } else if (isExactAppIdMatch) {
      tcodeRelationshipType = 'DIRECT_EQUIVALENT';
      dimensionScores.tcodeRelationship = this.weights.tcodeRelationship * 0.95;
      positiveFactors.push(`App ID ${app.appId} matches transaction identifier.`);
      matchingReasons.push(`App ID matches transaction code.`);
    } else {
      const nameUpper = (app.appName || '').toUpperCase();
      const descUpper = (app.description || '').toUpperCase();
      if (nameUpper.includes(tcode) || descUpper.includes(tcode)) {
        tcodeRelationshipType = 'UNVERIFIED_RELATIONSHIP';
        dimensionScores.tcodeRelationship = this.weights.tcodeRelationship * 0.5;
        positiveFactors.push(`Candidate documentation references legacy transaction ${tcode}.`);
        matchingReasons.push(`Candidate documentation references T-Code ${tcode}.`);
      } else {
        tcodeRelationshipType = 'RELATED_APPLICATION';
        dimensionScores.tcodeRelationship = this.weights.tcodeRelationship * 0.2;
        negativeFactors.push(`No direct 1:1 T-Code linkage in official catalogue; matched on related functional process area.`);
        assumptions.push(`Candidate operates in similar functional domain (${app.businessProcess || app.lineOfBusiness || 'Core'}), but is not a verified 1:1 successor.`);
      }
    }

    // =========================================================================
    // Dimension 2: Functional Fit (Weight: 25)
    // =========================================================================
    let functionalMatches = 0;
    const tcodeTokens = tcodeDesc.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const appText = `${app.appName} ${app.description}`.toLowerCase();

    for (const token of tcodeTokens) {
      if (appText.includes(token)) {
        functionalMatches++;
      }
    }

    const keywordRatio = tcodeTokens.length > 0 ? functionalMatches / tcodeTokens.length : 0.5;
    dimensionScores.functionalFit = Math.round(this.weights.functionalFit * Math.min(1.0, keywordRatio + 0.3));

    if (keywordRatio >= 0.5) {
      positiveFactors.push(`Core business terminology aligned: ${(keywordRatio * 100).toFixed(0)}% vocabulary overlap.`);
      matchingReasons.push(`Application capabilities align with transaction scope "${tcodeDesc}".`);
    } else {
      negativeFactors.push(`Low vocabulary overlap with transaction description.`);
      functionalGaps.push(`Detailed functional scope requires verification against legacy Dynpro screens.`);
    }

    // Check user requirement alignment if provided
    if (userRequirement && typeof userRequirement === 'object') {
      const reqText = `${userRequirement.title || ''} ${userRequirement.statement || ''}`.toLowerCase();
      const candProcess = (app.businessProcess || app.lineOfBusiness || '').toLowerCase();
      const reqProcess = (userRequirement.businessProcess || '').toLowerCase();

      if (reqProcess && candProcess && !candProcess.includes(reqProcess) && !reqProcess.includes(candProcess)) {
        dimensionScores.functionalFit = Math.max(0, dimensionScores.functionalFit - 18);
        negativeFactors.push(`Process area mismatch: requirement specifies "${userRequirement.businessProcess}" vs candidate "${app.businessProcess || app.lineOfBusiness}".`);
        functionalGaps.push(`Functional divergence: user requirement business process is "${userRequirement.businessProcess}".`);
      } else if (appText.includes('payment') && reqText.includes('payment')) {
        dimensionScores.functionalFit = Math.min(this.weights.functionalFit, dimensionScores.functionalFit + 5);
        positiveFactors.push('Fulfills specific user requirement for payment processing.');
      }
    }

    // =========================================================================
    // Dimension 3: Technical Fit (Weight: 25)
    // =========================================================================
    const appODataList = (app.odataServices || []).map((s) => s.toUpperCase());
    let activeODataCount = 0;

    for (const reqSrv of appODataList) {
      const cleanSrv = reqSrv.replace(/_SRV$/, '');
      if (activeGatewayNames.has(reqSrv) || activeGatewayNames.has(cleanSrv)) {
        activeODataCount++;
      }
    }

    const hasActiveOData = appODataList.length > 0 && activeODataCount > 0;
    const isAllODataActive = appODataList.length > 0 && activeODataCount === appODataList.length;

    if (isAllODataActive) {
      dimensionScores.technicalFit = this.weights.technicalFit;
      positiveFactors.push(`All ${appODataList.length} declared OData backend service(s) are active on target Gateway.`);
      matchingReasons.push(`Mandatory backend OData service (${appODataList.join(', ')}) is active and verified.`);
    } else if (hasActiveOData) {
      dimensionScores.technicalFit = this.weights.technicalFit * 0.7;
      positiveFactors.push(`Primary OData backend service active (${activeODataCount}/${appODataList.length}).`);
      technicalGaps.push(`Secondary OData service(s) require activation on target Gateway.`);
    } else if (app.appType === 'SAP GUI') {
      dimensionScores.technicalFit = this.weights.technicalFit * 0.9;
      positiveFactors.push('WebGUI tile uses standard ITS / WebGUI kernel service (no OData dependency required).');
      matchingReasons.push('Hosted via standard SAP Internet Transaction Server (ITS) WebGUI.');
    } else if (appODataList.length > 0) {
      dimensionScores.technicalFit = this.weights.technicalFit * 0.3;
      negativeFactors.push(`Required OData service(s) (${appODataList.join(', ')}) not found active on target Gateway.`);
      technicalGaps.push(`Backend service activation required in /IWFND/MAINT_SERVICE: ${appODataList.join(', ')}.`);
      verificationRequirements.push(`Activate Gateway OData service ${appODataList[0]} on target SAP system.`);
    } else {
      dimensionScores.technicalFit = this.weights.technicalFit * 0.4;
      technicalGaps.push('No OData services registered in catalogue entry; backend service mapping unverified.');
      missingEvidence.push('Catalogue manifest declares no explicit OData service dependency.');
      verificationRequirements.push('Inspect SAPUI5 component manifest.json for backend service dataSource declaration.');
    }

    // =========================================================================
    // Dimension 4: Business Context Match (Weight: 10)
    // =========================================================================
    let contextScore = 0;
    if (app.lineOfBusiness || app.businessProcess) {
      contextScore += 5;
      positiveFactors.push(`Assigned to business area: ${app.lineOfBusiness || app.businessProcess}.`);
    }
    if (app.businessRole) {
      contextScore += 5;
      positiveFactors.push(`Target business role defined: ${app.businessRole}.`);
    }
    dimensionScores.businessContext = contextScore;

    // =========================================================================
    // Dimension 5: Release Compatibility (Weight: 10)
    // =========================================================================
    let releaseCompatibilityStatus = 'COMPATIBILITY_UNKNOWN';
    const appRelease = (app.productVersion || '').toUpperCase();
    const targetRelUpper = (targetRelease || '').toUpperCase();

    if (targetRelUpper.includes('ECC') && (appRelease.includes('S/4HANA') || !appRelease.includes('ECC'))) {
      releaseCompatibilityStatus = 'INCOMPATIBLE';
      dimensionScores.releaseCompatibility = 0;
      negativeFactors.push(`Release incompatibility: target is ${targetRelease} (ECC), but candidate app requires ${app.productVersion || 'SAP S/4HANA'}.`);
      conflicts.push(`Target system release (${targetRelease}) does not support S/4HANA native Fiori app (${app.productVersion || 'SAP S/4HANA'}).`);
    } else if (appRelease.includes('PUBLIC EDITION') && targetRelUpper.includes('PRIVATE EDITION')) {
      releaseCompatibilityStatus = 'DIFFERENT_DEPLOYMENT_EDITION';
      dimensionScores.releaseCompatibility = 4;
      negativeFactors.push(`Deployment edition divergence: candidate is designated for Public Edition (${app.productVersion}), while target is ${targetRelease}.`);
      conflicts.push(`Candidate app release is Public Edition (${app.productVersion}); verify availability in Private Edition.`);
    } else if (targetRelUpper.includes('2023') && (appRelease.includes('2025') || appRelease.includes('2026') || appRelease.includes('2024'))) {
      releaseCompatibilityStatus = 'SUPPORTED_ON_LATER_RELEASE_ONLY';
      dimensionScores.releaseCompatibility = 6;
      negativeFactors.push(`Catalogue entry records compatibility for ${app.productVersion}; unconfirmed for target release ${targetRelease}.`);
      missingEvidence.push(`Exact FPS compatibility for ${targetRelease} pending verification in SAP Notes / FAL matrix.`);
    } else if (appRelease.includes('2023') || appRelease.includes('2022') || (appRelease.includes('S/4HANA') && !appRelease.includes('2025') && !appRelease.includes('2024'))) {
      releaseCompatibilityStatus = 'COMPATIBLE';
      dimensionScores.releaseCompatibility = this.weights.releaseCompatibility;
      positiveFactors.push(`Compatible with S/4HANA target release baseline (${app.productVersion || 'SAP S/4HANA'}).`);
    } else if (appRelease.length === 0) {
      releaseCompatibilityStatus = 'COMPATIBILITY_UNKNOWN';
      dimensionScores.releaseCompatibility = 5;
      missingEvidence.push('Specific S/4HANA release compatibility not declared in catalogue export.');
      verificationRequirements.push('Check SAP Fiori Apps Library for exact FPS compatibility.');
    } else {
      releaseCompatibilityStatus = 'COMPATIBILITY_UNKNOWN';
      dimensionScores.releaseCompatibility = 5;
      negativeFactors.push(`Declared release (${app.productVersion}) may diverge from target ${targetRelease}.`);
      conflicts.push(`Release divergence: target ${targetRelease} vs candidate ${app.productVersion}.`);
    }

    // =========================================================================
    // Total Score Calculation
    // =========================================================================
    const overallScore = Math.min(
      100,
      dimensionScores.tcodeRelationship +
      dimensionScores.functionalFit +
      dimensionScores.technicalFit +
      dimensionScores.businessContext +
      dimensionScores.releaseCompatibility
    );

    // =========================================================================
    // Match Classification & Governance Guardrails
    // =========================================================================
    let matchClassification = MATCH_CLASSIFICATIONS.WEAK_CANDIDATE;

    // GUARDRAIL 1: A high technical score CANNOT override a critical functional mismatch
    const hasCriticalFunctionalMismatch =
      (dimensionScores.functionalFit < 8 && (tcodeRelationshipType === 'RELATED_APPLICATION' || tcodeRelationshipType === 'UNVERIFIED_RELATIONSHIP')) ||
      (userRequirement && userRequirement.businessProcess && dimensionScores.functionalFit < 12);

    // GUARDRAIL 2: Highest score != VERIFIED_MATCH unless verified relationship & active service & compatible release
    const isVerifiedSuccessorWithActiveOData =
      (tcodeRelationshipType === 'OFFICIAL_SUCCESSOR' || tcodeRelationshipType === 'DIRECT_EQUIVALENT') &&
      (isAllODataActive || app.appType === 'SAP GUI') &&
      (releaseCompatibilityStatus === 'COMPATIBLE' || releaseCompatibilityStatus === 'EXPLICITLY_SUPPORTED');

    if (releaseCompatibilityStatus === 'INCOMPATIBLE') {
      matchClassification = MATCH_CLASSIFICATIONS.INCOMPATIBLE;
      negativeFactors.push('Governance Guardrail: Target system release does not support candidate application.');
    } else if (hasCriticalFunctionalMismatch) {
      matchClassification = MATCH_CLASSIFICATIONS.WEAK_CANDIDATE;
      negativeFactors.push('Governance Guardrail: Functional fit score below threshold; classified as WEAK_CANDIDATE despite technical availability.');
    } else if (isVerifiedSuccessorWithActiveOData) {
      matchClassification = MATCH_CLASSIFICATIONS.VERIFIED_MATCH;
    } else if (overallScore >= 70) {
      matchClassification = MATCH_CLASSIFICATIONS.STRONG_CANDIDATE;
    } else if (overallScore >= 45) {
      matchClassification = (tcodeRelationshipType === 'RELATED_APPLICATION' || tcodeRelationshipType === 'FUNCTIONAL_ALTERNATIVE')
        ? MATCH_CLASSIFICATIONS.ALTERNATIVE_APPROACH
        : MATCH_CLASSIFICATIONS.PARTIAL_FIT;
    } else {
      matchClassification = MATCH_CLASSIFICATIONS.WEAK_CANDIDATE;
    }

    // Evidence confidence
    let confidence = CONFIDENCE_LEVELS.MEDIUM;
    if (matchClassification === MATCH_CLASSIFICATIONS.VERIFIED_MATCH) {
      confidence = CONFIDENCE_LEVELS.VERIFIED;
    } else if (matchClassification === MATCH_CLASSIFICATIONS.STRONG_CANDIDATE) {
      confidence = CONFIDENCE_LEVELS.HIGH;
    }

    const explainability = {
      matchingReasons,
      positiveFactors,
      negativeFactors,
      functionalGaps,
      technicalGaps,
      missingEvidence,
      conflicts,
      assumptions,
      verificationRequirements
    };

    return {
      appId: app.appId,
      appName: app.appName,
      description: app.description || '',
      appType: app.appType || 'Transactional',
      uiTechnology: app.uiTechnology || 'SAP Fiori (SAPUI5)',
      productVersion: app.productVersion || 'SAP S/4HANA',
      softwareComponent: app.softwareComponent,
      businessRole: app.businessRole,
      businessProcess: app.businessProcess || app.lineOfBusiness || 'Core',
      lineOfBusiness: app.lineOfBusiness || app.businessProcess || 'Core',
      odataServices: appODataList,
      sapui5Component: app.sapui5Component,
      documentationUrl: app.documentationUrl,
      provenance: app.provenance || 'OFFICIAL_CATALOGUE',
      source: app.source || app.provenance || 'OFFICIAL_CATALOGUE',
      sources: app.sources || [app.source || app.provenance || 'OFFICIAL_CATALOGUE'],
      inLocalCatalogue: app.inLocalCatalogue !== false,
      isExternalMcpDiscovered: Boolean(app.isExternalMcpDiscovered),
      conflictingFields: app.conflictingFields || [],
      mcpEnrichment: app.mcpEnrichment || null,
      overallScore,
      dimensionScores,
      scoreBreakdown: {
        tcodeRelationship: dimensionScores.tcodeRelationship,
        functionalFit: dimensionScores.functionalFit,
        technicalFit: dimensionScores.technicalFit,
        businessContext: dimensionScores.businessContext,
        releaseCompatibility: dimensionScores.releaseCompatibility
      },
      explainability,
      tcodeRelationshipType,
      mappingClassification: tcodeRelationshipType,
      isWebGui: Boolean(app.appType === 'SAP GUI' || (app.uiTechnology && String(app.uiTechnology).includes('SAP GUI'))),
      releaseCompatibilityStatus,
      matchClassification,
      confidence,
      matchingReasons,
      positiveFactors,
      negativeFactors,
      functionalGaps,
      technicalGaps,
      missingEvidence,
      conflicts,
      assumptions,
      verificationRequirements
    };
  }
}

export const fioriMatchingEngine = new FioriMatchingEngine();
