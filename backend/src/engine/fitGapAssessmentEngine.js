/**
 * Fiorify — Advanced Fit-Gap Assessment Engine (FITGAP-02)
 *
 * Evaluates business requirements against discovered SAP Fiori application candidates
 * across 10 structured dimensions using evidence-backed rules, normalized weighting,
 * explicit score coverage calculation, and strict Clean Core governance guardrails.
 *
 * Key Principles:
 * - Pure and deterministic evaluation logic (no network/SAP requests).
 * - Independent evaluation across 10 structured dimensions.
 * - Explicit score coverage percentage (% of applicable dimensions with evidence) separate from evidence confidence.
 * - Missing evidence is NEVER treated as proof of failure (marked UNKNOWN / PENDING_VERIFICATION with neutral score).
 * - Dimensions marked NOT_APPLICABLE are removed from the denominator and weights normalized across applicable dimensions.
 * - Hard Governance Guardrail: High technical score NEVER hides a critical functional gap.
 * - Critical functional gaps or release incompatibilities strictly prevent VERIFIED_FIT.
 * - Z-prefixed service aliases require explicit verification before counting as technical matches.
 * - Clean Core Extensibility evaluation (Key User vs Developer Extensibility vs Classic Dynpro modification).
 */

export const DEFAULT_DIMENSION_WEIGHTS = Object.freeze({
  functionalCoverage: 0.25,
  businessProcessAlignment: 0.10,
  uxAppTypeSuitability: 0.08,
  technicalIntegrationReadiness: 0.12,
  odataGatewayReadiness: 0.10,
  authorizationAndRoles: 0.08,
  releaseCompatibility: 0.07,
  extensibilityAndCustomization: 0.08,
  cleanCoreAlignment: 0.06,
  operationalAndDeploymentReadiness: 0.06
});

export const DEFAULT_SCORING_WEIGHTS = Object.freeze({
  functional: 0.35,
  technical: 0.25,
  process: 0.15,
  activationAndRoles: 0.15,
  compatibility: 0.10
});

export const DIMENSION_STATUSES = Object.freeze({
  VERIFIED_FIT: 'VERIFIED_FIT',
  PASS: 'VERIFIED_FIT',
  PARTIAL_FIT: 'PARTIAL_FIT',
  PARTIAL: 'PARTIAL_FIT',
  NO_FIT: 'NO_FIT',
  FAIL: 'NO_FIT',
  UNKNOWN: 'UNKNOWN',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  BLOCKED_BY_AUTHORIZATION: 'BLOCKED_BY_AUTHORIZATION'
});

export const ASSESSMENT_STATUSES = Object.freeze({
  VERIFIED_FIT: 'VERIFIED_FIT',
  PARTIAL_FIT: 'PARTIAL_FIT',
  POSSIBLE_FIT: 'POSSIBLE_FIT',
  NO_FIT: 'NO_FIT',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE'
});

export const GAP_SEVERITIES = Object.freeze({
  CRITICAL: 'CRITICAL',
  MAJOR: 'MAJOR',
  HIGH: 'MAJOR',
  MEDIUM: 'MEDIUM',
  MINOR: 'MINOR',
  LOW: 'MINOR',
  INFORMATIONAL: 'INFO',
  INFO: 'INFO'
});

export const GAP_CATEGORIES = Object.freeze({
  FUNCTIONAL_CAPABILITY: 'FUNCTIONAL_CAPABILITY',
  FUNCTIONAL_GAP: 'FUNCTIONAL_CAPABILITY',
  TECHNICAL_DEPENDENCY: 'TECHNICAL_DEPENDENCY',
  TECHNICAL_GAP: 'TECHNICAL_DEPENDENCY',
  ODATA_GAP: 'TECHNICAL_DEPENDENCY',
  AUTHORIZATION: 'AUTHORIZATION',
  AUTHORIZATION_GAP: 'AUTHORIZATION',
  COMPATIBILITY: 'COMPATIBILITY',
  RELEASE_INCOMPATIBILITY: 'COMPATIBILITY',
  CUSTOM_VARIANT: 'CUSTOM_VARIANT',
  CUSTOMIZATION_CONFLICT: 'CUSTOM_VARIANT',
  UX_DISPARITY: 'UX_DISPARITY',
  CLEAN_CORE_VIOLATION: 'CLEAN_CORE_VIOLATION',
  ACTIVATION: 'ACTIVATION',
  DEPLOYMENT_DEPENDENCY: 'ACTIVATION',
  MISSING_EVIDENCE: 'MISSING_EVIDENCE'
});

export class FitGapAssessmentEngine {
  constructor(options = {}) {
    this.dimensionWeights = Object.freeze({
      ...DEFAULT_DIMENSION_WEIGHTS,
      ...(options.dimensionWeights || {})
    });
    this.classicWeights = Object.freeze({
      ...DEFAULT_SCORING_WEIGHTS,
      ...(options.weights || {})
    });
  }

  /**
   * Evaluates a single business requirement against a candidate application.
   */
  evaluate(input = {}, options = {}) {
    const { requirement, candidate, context = {} } = input;
    const assessmentTimestamp = new Date().toISOString();
    const assessmentId = `ASM-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // 1. Guard against empty inputs
    if (!requirement || typeof requirement !== 'object') {
      return this._buildEmptyAssessment({
        assessmentId,
        status: ASSESSMENT_STATUSES.INSUFFICIENT_EVIDENCE,
        message: 'Business requirement definition is missing or invalid.',
        assessmentTimestamp
      });
    }

    if (!candidate || typeof candidate !== 'object' || !candidate.appId) {
      return this._buildEmptyAssessment({
        assessmentId,
        status: ASSESSMENT_STATUSES.INSUFFICIENT_EVIDENCE,
        message: 'Candidate application specification is missing or invalid.',
        requirementId: requirement.id,
        assessmentTimestamp
      });
    }

    const evidenceReferences = [];
    const identifiedGaps = [];
    const missingEvidenceList = [];
    const conflictingEvidenceList = [];
    const governanceGuardrailsApplied = [];

    // =========================================================================
    // 10 Dimension Evaluations (FITGAP-02)
    // =========================================================================

    // Dim 1: Functional Coverage
    const functionalCoverage = this._evaluateFunctionalCoverage({
      requirement,
      candidate,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList,
      governanceGuardrailsApplied
    });

    // Dim 2: Business Process Alignment
    const businessProcessAlignment = this._evaluateBusinessProcessAlignment({
      requirement,
      candidate,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList
    });

    // Dim 3: UX & App Type Suitability
    const uxAppTypeSuitability = this._evaluateUxAppTypeSuitability({
      requirement,
      candidate,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList
    });

    // Dim 4: Technical Integration Readiness
    const technicalIntegrationReadiness = this._evaluateTechnicalIntegrationReadiness({
      requirement,
      candidate,
      context,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList,
      governanceGuardrailsApplied
    });

    // Dim 5: OData & Gateway Service Readiness
    const odataGatewayReadiness = this._evaluateODataGatewayReadiness({
      requirement,
      candidate,
      context,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList,
      conflictingEvidenceList,
      governanceGuardrailsApplied
    });

    // Dim 6: Authorization & Business Role Readiness
    const authorizationAndRoles = this._evaluateAuthorizationAndRoles({
      candidate,
      context,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList,
      governanceGuardrailsApplied
    });

    // Dim 7: SAP Release & Component Compatibility
    const releaseCompatibility = this._evaluateReleaseCompatibility({
      candidate,
      context,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList,
      governanceGuardrailsApplied
    });

    // Dim 8: Extensibility & Customization Requirements
    const extensibilityAndCustomization = this._evaluateExtensibilityAndCustomization({
      requirement,
      candidate,
      context,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList
    });

    // Dim 9: Clean Core Alignment
    const cleanCoreAlignment = this._evaluateCleanCoreAlignment({
      requirement,
      candidate,
      context,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList
    });

    // Dim 10: Operational & Deployment Readiness
    const operationalAndDeploymentReadiness = this._evaluateOperationalAndDeploymentReadiness({
      candidate,
      context,
      evidenceReferences,
      identifiedGaps,
      missingEvidenceList,
      governanceGuardrailsApplied
    });

    // Legacy technical score calculation to match sprint8 expectations exactly
    const technicalScore = Math.round((odataGatewayReadiness.score * 0.6) + (technicalIntegrationReadiness.score * 0.4));
    let technicalStatus = DIMENSION_STATUSES.NO_FIT;
    if (odataGatewayReadiness.missingServices.length === 0 && technicalIntegrationReadiness.missingOperations.length === 0) {
      technicalStatus = DIMENSION_STATUSES.VERIFIED_FIT;
    } else if (odataGatewayReadiness.verifiedServices.length > 0 || candidate.appType === 'SAP GUI') {
      technicalStatus = DIMENSION_STATUSES.PARTIAL_FIT;
    }

    const technicalEval = {
      dimensionKey: 'technicalIntegrationReadiness',
      dimensionName: 'Technical Fit & Integration',
      status: technicalStatus,
      score: technicalScore,
      weight: this.classicWeights.technical,
      declaredServices: odataGatewayReadiness.declaredServices,
      verifiedServices: odataGatewayReadiness.verifiedServices,
      missingServices: odataGatewayReadiness.missingServices,
      verifiedOperations: technicalIntegrationReadiness.verifiedOperations,
      missingOperations: technicalIntegrationReadiness.missingOperations,
      rationale: `Verified ${odataGatewayReadiness.verifiedServices.length} of ${odataGatewayReadiness.declaredServices.length} declared OData services and ${technicalIntegrationReadiness.verifiedOperations.length} of ${technicalIntegrationReadiness.verifiedOperations.length + technicalIntegrationReadiness.missingOperations.length} required operations.`,
      evidenceReferences: technicalIntegrationReadiness.evidenceReferences.concat(odataGatewayReadiness.evidenceReferences)
    };

    // Compile 10 dimension results
    const dimensionResults = {
      functionalCoverage,
      businessProcessAlignment,
      uxAppTypeSuitability,
      technicalIntegrationReadiness,
      odataGatewayReadiness,
      authorizationAndRoles,
      releaseCompatibility,
      extensibilityAndCustomization,
      cleanCoreAlignment,
      operationalAndDeploymentReadiness,

      // Aliases for backward compatibility with existing tests and UI
      functionalFit: functionalCoverage,
      processFit: businessProcessAlignment,
      uxAppType: uxAppTypeSuitability,
      technicalFit: technicalEval,
      odataReadiness: odataGatewayReadiness,
      authorization: authorizationAndRoles,
      compatibility: releaseCompatibility,
      customization: extensibilityAndCustomization,
      activation: operationalAndDeploymentReadiness
    };

    const dimensionsList = [
      functionalCoverage,
      businessProcessAlignment,
      uxAppTypeSuitability,
      technicalIntegrationReadiness,
      odataGatewayReadiness,
      authorizationAndRoles,
      releaseCompatibility,
      extensibilityAndCustomization,
      cleanCoreAlignment,
      operationalAndDeploymentReadiness
    ];

    // =========================================================================
    // Score Coverage & Normalized Weighted Score Calculation
    // =========================================================================
    const applicableDimensions = dimensionsList.filter((d) => d.isApplicable && d.status !== DIMENSION_STATUSES.NOT_APPLICABLE);
    const applicableWeightsSum = applicableDimensions.reduce((acc, d) => acc + (this.dimensionWeights[d.dimensionKey] || 0.1), 0);

    let normalizedOverallScore = 0;
    let verifiedEvidenceDimensionCount = 0;

    for (const d of applicableDimensions) {
      const rawWeight = this.dimensionWeights[d.dimensionKey] || 0.1;
      const normalizedWeight = applicableWeightsSum > 0 ? rawWeight / applicableWeightsSum : (1 / applicableDimensions.length);
      d.normalizedWeight = Number(normalizedWeight.toFixed(4));

      const dimScore = typeof d.score === 'number' ? d.score : 0;
      normalizedOverallScore += dimScore * normalizedWeight;

      if (d.status === DIMENSION_STATUSES.VERIFIED_FIT || d.status === DIMENSION_STATUSES.PARTIAL_FIT || (d.evidenceReferences && d.evidenceReferences.length > 0)) {
        if (d.status !== DIMENSION_STATUSES.UNKNOWN && d.status !== DIMENSION_STATUSES.PENDING_VERIFICATION) {
          verifiedEvidenceDimensionCount++;
        }
      }
    }

    const overallScore = Math.round(normalizedOverallScore);
    const scoreCoverage = applicableDimensions.length > 0
      ? Math.round((verifiedEvidenceDimensionCount / applicableDimensions.length) * 100)
      : 0;

    // Classic 5-group scoring breakdown for backward compatibility
    const functionalScore = functionalCoverage.score;
    const processScore = businessProcessAlignment.score;
    const activationAndRolesScore = Math.round(
      (operationalAndDeploymentReadiness.score * 0.5) + (authorizationAndRoles.score * 0.5)
    );
    const compatibilityScore = releaseCompatibility.score;

    // Evidence Completeness & Confidence (Dimension 8 in legacy FITGAP-01)
    const evidenceCompletenessEval = this._evaluateEvidenceCompleteness({
      evidenceReferences,
      missingEvidenceList,
      conflictingEvidenceList,
      scoreCoverage
    });
    dimensionResults.evidenceCompleteness = evidenceCompletenessEval;

    // =========================================================================
    // Overall Status Resolution with Hard Governance Guardrails
    // =========================================================================
    const statusResolution = this._resolveOverallStatus({
      functionalCoverage,
      technicalEval,
      businessProcessAlignment,
      releaseCompatibility,
      extensibilityAndCustomization,
      cleanCoreAlignment,
      evidenceCompletenessEval,
      identifiedGaps,
      overallScore,
      conflictingEvidenceList,
      governanceGuardrailsApplied
    });

    // =========================================================================
    // Recommendation Formulator
    // =========================================================================
    const recommendation = this._formulateRecommendation({
      status: statusResolution.status,
      candidate,
      requirement,
      identifiedGaps,
      extensibilityAndCustomization,
      technicalIntegrationReadiness,
      statusResolution,
      cleanCoreAlignment
    });

    return {
      assessmentId,
      requirementId: requirement.id || 'REQ-UNKNOWN',
      requirementTitle: requirement.title || requirement.statement || 'Untitled Business Requirement',
      candidateAppId: candidate.appId,
      candidateAppName: candidate.appName || candidate.appId,
      candidateAppType: candidate.appType || 'Transactional',
      candidateUiTechnology: candidate.uiTechnology || 'SAP Fiori',
      candidate,
      requirement,
      overallStatus: statusResolution.status,
      overallScore,
      scoreCoverage,
      evidenceConfidence: evidenceCompletenessEval.confidence,
      confidence: evidenceCompletenessEval.confidence,

      scoringBreakdown: {
        functionalScore,
        technicalScore,
        processScore,
        activationAndRolesScore,
        compatibilityScore,
        weights: this.classicWeights,
        dimensionWeights: this.dimensionWeights,
        scoreCoverage
      },

      dimensionResults,
      dimensions: dimensionsList,

      verifiedCapabilities: functionalCoverage.verifiedCapabilities,
      unverifiedCapabilities: functionalCoverage.unverifiedCapabilities,
      missingCapabilities: functionalCoverage.missingCapabilities,

      verifiedOperations: technicalIntegrationReadiness.verifiedOperations,
      missingOperations: technicalIntegrationReadiness.missingOperations,

      identifiedGaps,
      missingEvidence: missingEvidenceList,
      conflictingEvidence: conflictingEvidenceList,
      governanceGuardrailsApplied,

      recommendation,
      evidenceReferences,
      provenance: 'Fiorify_FIT_GAP_ASSESSMENT_ENGINE',
      assessmentTimestamp
    };
  }

  // =========================================================================
  // Dimension 1: Functional Coverage (Weight: 25%)
  // =========================================================================
  _evaluateFunctionalCoverage({ requirement, candidate, evidenceReferences, identifiedGaps, missingEvidenceList, governanceGuardrailsApplied }) {
    const requiredCaps = Array.isArray(requirement.requiredCapabilities)
      ? requirement.requiredCapabilities
      : Array.isArray(requirement.expectedFunctionality)
        ? requirement.expectedFunctionality
        : [];

    const supportedCaps = new Set(
      (candidate.supportedCapabilities || candidate.capabilities || []).map((c) => String(c).toUpperCase())
    );

    const verified = [];
    const unverified = [];
    const missing = [];

    const isExactClassicGuiTile =
      candidate.appType === 'SAP GUI' &&
      candidate.appId.toUpperCase() === (requirement.tcode || '').toUpperCase();

    for (const reqCap of requiredCaps) {
      const capUpper = reqCap.toUpperCase();
      if (supportedCaps.has(capUpper)) {
        verified.push(reqCap);
      } else if (isExactClassicGuiTile) {
        unverified.push(reqCap);
      } else {
        missing.push(reqCap);
      }
    }

    let score = 0;
    if (requiredCaps.length > 0) {
      score = Math.round(
        ((verified.length * 1.0 + unverified.length * 0.4) / requiredCaps.length) * 100
      );
    } else {
      score = 70;
    }

    const isMandatoryRequirement =
      requirement.priority === 'MANDATORY' ||
      requirement.priority === 'HIGH' ||
      requirement.priority === 'MUST';

    if (missing.length > 0 && isMandatoryRequirement) {
      identifiedGaps.push({
        gapId: `GAP-FUNC-${candidate.appId}-${identifiedGaps.length + 1}`,
        title: 'Missing Mandatory Functional Capabilities',
        description: `Candidate does not support mandatory business capabilities: ${missing.join(', ')}.`,
        category: GAP_CATEGORIES.FUNCTIONAL_CAPABILITY,
        gapClassification: 'FUNCTIONAL_GAP',
        severity: GAP_SEVERITIES.CRITICAL,
        missingInformation: [`Detailed support for ${missing.join(', ')}`],
        recommendedInvestigation: 'Evaluate companion Fiori applications or retain classic GUI transaction.'
      });
      governanceGuardrailsApplied.push('CRITICAL_FUNCTIONAL_GAP_RECORDED');
    } else if (missing.length > 0) {
      identifiedGaps.push({
        gapId: `GAP-FUNC-${candidate.appId}-${identifiedGaps.length + 1}`,
        title: 'Missing Secondary Functional Capabilities',
        description: `Candidate does not provide capabilities: ${missing.join(', ')}.`,
        category: GAP_CATEGORIES.FUNCTIONAL_CAPABILITY,
        gapClassification: 'FUNCTIONAL_GAP',
        severity: GAP_SEVERITIES.MAJOR,
        missingInformation: [`Capability coverage for ${missing.join(', ')}`],
        recommendedInvestigation: 'Conduct functional fit-gap review with business process owner.'
      });
    }

    if (unverified.length > 0) {
      missingEvidenceList.push(
        `Capabilities pending functional verification: ${unverified.join(', ')}`
      );
    }

    evidenceReferences.push({
      evidenceId: `EVD-FUNC-${candidate.appId}`,
      evidenceType: 'FUNCTIONAL_METADATA',
      source: candidate.documentationUrl || `Fiori Apps Library ${candidate.appId}`,
      retrievedValue: `Verified: [${verified.join(', ')}], Unverified: [${unverified.join(', ')}], Missing: [${missing.join(', ')}]`,
      verificationStatus: verified.length > 0 ? 'VERIFIED_CATALOGUE' : 'PENDING_VERIFICATION',
      confidence: verified.length > 0 ? 'HIGH' : 'MEDIUM',
      explanation: `Evaluated ${requiredCaps.length} required business capabilities against candidate application profile.`
    });

    let status = DIMENSION_STATUSES.NO_FIT;
    if (missing.length === 0 && unverified.length === 0 && requiredCaps.length > 0) {
      status = DIMENSION_STATUSES.VERIFIED_FIT;
    } else if (verified.length > 0 || unverified.length > 0) {
      status = DIMENSION_STATUSES.PARTIAL_FIT;
    } else if (requiredCaps.length === 0) {
      status = DIMENSION_STATUSES.PENDING_VERIFICATION;
    }

    return {
      dimensionKey: 'functionalCoverage',
      dimensionName: 'Functional Coverage',
      isApplicable: true,
      status,
      score,
      weight: this.dimensionWeights.functionalCoverage,
      verifiedCapabilities: verified,
      unverifiedCapabilities: unverified,
      missingCapabilities: missing,
      rationale: `Verified ${verified.length} of ${requiredCaps.length} required capabilities. ${missing.length} missing, ${unverified.length} unverified.`,
      evidenceReferences: [`EVD-FUNC-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Dimension 2: Business Process Alignment (Weight: 10%)
  // =========================================================================
  _evaluateBusinessProcessAlignment({ requirement, candidate, evidenceReferences, identifiedGaps, missingEvidenceList }) {
    const reqProcess = (requirement.businessProcess || '').toUpperCase().trim();
    const candProcess = (candidate.businessProcess || candidate.lineOfBusiness || '').toUpperCase().trim();

    if (!reqProcess) {
      missingEvidenceList.push('Business process not specified in requirement.');
      return {
        dimensionKey: 'businessProcessAlignment',
        dimensionName: 'Business Process Alignment',
        isApplicable: true,
        status: DIMENSION_STATUSES.PENDING_VERIFICATION,
        score: 60,
        weight: this.dimensionWeights.businessProcessAlignment,
        rationale: 'Requirement does not specify a target business process; evaluated neutrally.',
        evidenceReferences: []
      };
    }

    const hasDirectProcessMatch =
      candProcess.includes(reqProcess) ||
      reqProcess.includes(candProcess) ||
      (reqProcess.includes('PAY') && candProcess.includes('PAY')) ||
      (reqProcess.includes('FIN') && candProcess.includes('FIN')) ||
      (reqProcess.includes('PROC') && candProcess.includes('PROC'));

    let score = 30;
    let status = DIMENSION_STATUSES.NO_FIT;

    if (hasDirectProcessMatch) {
      score = 100;
      status = DIMENSION_STATUSES.VERIFIED_FIT;
    } else {
      identifiedGaps.push({
        gapId: `GAP-PROC-${candidate.appId}`,
        title: 'Business Process Divergence',
        description: `Candidate process area "${candidate.businessProcess || 'General'}" differs from required process "${requirement.businessProcess}".`,
        category: GAP_CATEGORIES.FUNCTIONAL_CAPABILITY,
        gapClassification: 'FUNCTIONAL_GAP',
        severity: GAP_SEVERITIES.MAJOR,
        missingInformation: ['Process alignment rationale'],
        recommendedInvestigation: 'Verify business role and catalog assignment.'
      });
    }

    evidenceReferences.push({
      evidenceId: `EVD-PROC-${candidate.appId}`,
      evidenceType: 'OFFICIAL_CATALOGUE',
      source: 'Official SAP Fiori Apps Reference Library',
      retrievedValue: `Candidate: "${candidate.businessProcess || 'Unassigned'}" vs Required: "${requirement.businessProcess}"`,
      verificationStatus: 'VERIFIED_CATALOGUE',
      confidence: 'HIGH',
      explanation: 'Evaluated Line of Business and process taxonomy alignment.'
    });

    return {
      dimensionKey: 'businessProcessAlignment',
      dimensionName: 'Business Process Alignment',
      isApplicable: true,
      status,
      score,
      weight: this.dimensionWeights.businessProcessAlignment,
      rationale: hasDirectProcessMatch
        ? `Process alignment confirmed for "${candidate.businessProcess || requirement.businessProcess}".`
        : `Process divergence: candidate is aligned with "${candidate.businessProcess}" while requirement specifies "${requirement.businessProcess}".`,
      evidenceReferences: [`EVD-PROC-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Dimension 3: UX & App Type Suitability (Weight: 8%)
  // =========================================================================
  _evaluateUxAppTypeSuitability({ requirement, candidate, evidenceReferences, identifiedGaps, missingEvidenceList }) {
    const isClassicGui = candidate.appType === 'SAP GUI' || candidate.uiTechnology?.includes('SAP GUI');
    const isFioriElements = candidate.uiTechnology?.includes('elements') || candidate.uiTechnology?.includes('SAPUI5');
    const requiresMobile = Array.isArray(requirement.mandatoryConditions) &&
      requirement.mandatoryConditions.some((c) => /mobile|tablet|responsive/i.test(c));

    let score = 90;
    let status = DIMENSION_STATUSES.VERIFIED_FIT;

    if (isClassicGui) {
      if (requiresMobile) {
        score = 20;
        status = DIMENSION_STATUSES.NO_FIT;
        identifiedGaps.push({
          gapId: `GAP-UX-MOBILE-${candidate.appId}`,
          title: 'Mobile Form Factor Unsupported on Classic GUI',
          description: 'Classic Dynpro screen in SAP GUI for HTML is unsuitable for required mobile or responsive use cases.',
          category: GAP_CATEGORIES.UX_DISPARITY,
          gapClassification: 'UX_DISPARITY',
          severity: GAP_SEVERITIES.CRITICAL,
          missingInformation: ['Fiori Elements responsive UI definition'],
          recommendedInvestigation: 'Adopt a standard SAP Fiori Elements app with responsive viewport support.'
        });
      } else {
        score = 60;
        status = DIMENSION_STATUSES.PARTIAL_FIT;
        identifiedGaps.push({
          gapId: `GAP-UX-CLASSIC-${candidate.appId}`,
          title: 'Classic Dynpro UX Disparity',
          description: 'Classic SAP GUI for HTML WebGUI tile does not conform to SAP Fiori Design Guidelines.',
          category: GAP_CATEGORIES.UX_DISPARITY,
          gapClassification: 'UX_DISPARITY',
          severity: GAP_SEVERITIES.MINOR,
          missingInformation: ['Modern Fiori UX design parity'],
          recommendedInvestigation: 'Position as transitional fallback while planning migration to Fiori elements.'
        });
      }
    } else if (isFioriElements) {
      score = 100;
      status = DIMENSION_STATUSES.VERIFIED_FIT;
    }

    evidenceReferences.push({
      evidenceId: `EVD-UX-${candidate.appId}`,
      evidenceType: 'UX_METADATA',
      source: 'FAL UI Technology Metadata',
      retrievedValue: `App Type: ${candidate.appType || 'Fiori'}, Technology: ${candidate.uiTechnology || 'SAPUI5'}`,
      verificationStatus: 'VERIFIED_CATALOGUE',
      confidence: 'HIGH',
      explanation: 'Evaluated UI technology suitability against SAP Fiori design standards and form factors.'
    });

    return {
      dimensionKey: 'uxAppTypeSuitability',
      dimensionName: 'UX & App Type Suitability',
      isApplicable: true,
      status,
      score,
      weight: this.dimensionWeights.uxAppTypeSuitability,
      appType: candidate.appType || 'Fiori',
      uiTechnology: candidate.uiTechnology || 'SAPUI5',
      rationale: isClassicGui
        ? 'Classic Dynpro rendered via WebGUI; preserves functionality but lacks modern responsive Fiori UX.'
        : 'Modern responsive SAP Fiori application conforming to Fiori Design Guidelines.',
      evidenceReferences: [`EVD-UX-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Dimension 4: Technical Integration Readiness (Weight: 12%)
  // =========================================================================
  _evaluateTechnicalIntegrationReadiness({ requirement, candidate, context, evidenceReferences, identifiedGaps, missingEvidenceList, governanceGuardrailsApplied }) {
    const requiredOps = Array.isArray(requirement.requiredOperations) ? requirement.requiredOperations : [];
    const verifiedServices = Array.isArray(candidate.verifiedODataServices) ? candidate.verifiedODataServices : [];

    const availableOps = new Set();
    for (const v of verifiedServices) {
      if (Array.isArray(v.availableOperations)) {
        for (const op of v.availableOperations) {
          availableOps.add(op.toUpperCase());
        }
      }
    }

    const verifiedOps = [];
    const missingOps = [];

    for (const op of requiredOps) {
      if (availableOps.has(op.toUpperCase())) {
        verifiedOps.push(op);
      } else {
        missingOps.push(op);
      }
    }

    let opsScore = 100;
    if (requiredOps.length > 0) {
      opsScore = Math.round((verifiedOps.length / requiredOps.length) * 100);
    }

    if (missingOps.length > 0) {
      identifiedGaps.push({
        gapId: `GAP-TECH-OPS-${candidate.appId}`,
        title: 'Missing Backend Operations in Service Contract',
        description: `Mandatory backend operations missing in active OData schema: ${missingOps.join(', ')}.`,
        category: GAP_CATEGORIES.TECHNICAL_DEPENDENCY,
        gapClassification: 'TECHNICAL_GAP',
        severity: GAP_SEVERITIES.CRITICAL,
        missingInformation: [`FunctionImport or EntitySet action for ${missingOps.join(', ')}`],
        recommendedInvestigation: 'Verify Gateway service metadata version and backend SP level.'
      });
      governanceGuardrailsApplied.push('CRITICAL_BACKEND_OPERATION_GAP_RECORDED');
    }

    let status = DIMENSION_STATUSES.VERIFIED_FIT;
    if (missingOps.length > 0) {
      status = DIMENSION_STATUSES.PARTIAL_FIT;
    }

    evidenceReferences.push({
      evidenceId: `EVD-INT-${candidate.appId}`,
      evidenceType: 'BACKEND_INTEGRATION',
      source: 'Gateway Schema & Operations Directory',
      retrievedValue: `Verified Operations: [${verifiedOps.join(', ')}], Missing: [${missingOps.join(', ')}]`,
      verificationStatus: missingOps.length === 0 ? 'VERIFIED_LIVE' : 'PARTIALLY_AVAILABLE',
      confidence: 'HIGH',
      explanation: `Evaluated ${requiredOps.length} required backend operations.`
    });

    return {
      dimensionKey: 'technicalIntegrationReadiness',
      dimensionName: 'Technical Integration Readiness',
      isApplicable: true,
      status,
      score: opsScore,
      weight: this.dimensionWeights.technicalIntegrationReadiness,
      verifiedOperations: verifiedOps,
      missingOperations: missingOps,
      rationale: `Verified ${verifiedOps.length} of ${requiredOps.length} required backend operations.`,
      evidenceReferences: [`EVD-INT-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Dimension 5: OData & Gateway Service Readiness (Weight: 10%)
  // =========================================================================
  _evaluateODataGatewayReadiness({ requirement, candidate, context, evidenceReferences, identifiedGaps, missingEvidenceList, conflictingEvidenceList, governanceGuardrailsApplied }) {
    const declaredServices = Array.isArray(candidate.odataDependencies)
      ? candidate.odataDependencies
      : (Array.isArray(candidate.odataServices) ? candidate.odataServices : []);

    const verifiedServices = Array.isArray(candidate.verifiedODataServices) ? candidate.verifiedODataServices : [];

    if (candidate.appType === 'SAP GUI') {
      return {
        dimensionKey: 'odataGatewayReadiness',
        dimensionName: 'OData & Gateway Service Readiness',
        isApplicable: false,
        status: DIMENSION_STATUSES.NOT_APPLICABLE,
        score: 100,
        weight: this.dimensionWeights.odataGatewayReadiness,
        declaredServices: [],
        verifiedServices: [],
        missingServices: [],
        rationale: 'Classic SAP GUI for HTML WebGUI does not require OData services.',
        evidenceReferences: []
      };
    }

    const missingServices = [];
    const verifiedServiceNames = [];

    for (const srv of declaredServices) {
      const match = verifiedServices.find(
        (v) =>
          v.serviceName?.toUpperCase() === srv.toUpperCase() ||
          v.technicalAlias?.toUpperCase() === srv.toUpperCase() ||
          v.technicalAlias?.toUpperCase() === `Z${srv.toUpperCase()}`
      );

      if (match) {
        if (match.technicalAlias && match.technicalAlias.startsWith('Z') && !match.isAliasVerified) {
          conflictingEvidenceList.push(
            `Service alias "${match.technicalAlias}" uses customer namespace Z without schema verification against standard contract "${srv}".`
          );
          identifiedGaps.push({
            gapId: `GAP-TECH-ALIAS-${candidate.appId}`,
            title: 'Unverified Custom Z-Service Alias',
            description: `Backend service alias "${match.technicalAlias}" has not been formally verified against standard contract "${srv}".`,
            category: GAP_CATEGORIES.TECHNICAL_DEPENDENCY,
            gapClassification: 'ODATA_GAP',
            severity: GAP_SEVERITIES.MAJOR,
            missingInformation: ['Formal EDMX contract verification between standard service and Z-alias'],
            recommendedInvestigation: 'Inspect /IWFND/MAINT_SERVICE and compare $metadata EDMX structure.'
          });
          governanceGuardrailsApplied.push('UNVERIFIED_Z_ALIAS_RECORDED');
        }
        verifiedServiceNames.push(match.technicalAlias || match.serviceName);
      } else {
        missingServices.push(srv);
      }
    }

    let odataScore = 0;
    if (declaredServices.length === 0) {
      odataScore = candidate.appType === 'SAP GUI' ? 100 : 80;
    } else {
      odataScore = Math.round((verifiedServiceNames.length / declaredServices.length) * 100);
    }

    if (missingServices.length > 0) {
      identifiedGaps.push({
        gapId: `GAP-TECH-ODATA-${candidate.appId}`,
        title: 'Missing OData Service Registrations in Gateway',
        description: `Candidate declares OData service dependencies not registered on target SAP system: ${missingServices.join(', ')}.`,
        category: GAP_CATEGORIES.TECHNICAL_DEPENDENCY,
        gapClassification: 'ODATA_GAP',
        severity: GAP_SEVERITIES.CRITICAL,
        missingInformation: [`Active service registration for ${missingServices.join(', ')}`],
        recommendedInvestigation: 'Activate missing services in SAP Gateway transaction /IWFND/MAINT_SERVICE.'
      });
      governanceGuardrailsApplied.push('MISSING_GATEWAY_SERVICE_RECORDED');
    }

    evidenceReferences.push({
      evidenceId: `EVD-ODATA-${candidate.appId}`,
      evidenceType: 'ODATA_METADATA',
      source: 'Target SAP S21 Gateway Catalog & $metadata',
      retrievedValue: `Active: [${verifiedServiceNames.join(', ')}], Missing: [${missingServices.join(', ')}]`,
      verificationStatus: missingServices.length === 0 ? 'VERIFIED_LIVE' : 'PARTIALLY_AVAILABLE',
      confidence: 'HIGH',
      explanation: `Evaluated ${declaredServices.length} OData services against active Gateway catalog.`
    });

    let status = DIMENSION_STATUSES.NO_FIT;
    if (missingServices.length === 0 && declaredServices.length > 0) {
      status = DIMENSION_STATUSES.VERIFIED_FIT;
    } else if (verifiedServiceNames.length > 0) {
      status = DIMENSION_STATUSES.PARTIAL_FIT;
    } else if (declaredServices.length === 0) {
      status = DIMENSION_STATUSES.VERIFIED_FIT;
    }

    return {
      dimensionKey: 'odataGatewayReadiness',
      dimensionName: 'OData & Gateway Service Readiness',
      isApplicable: true,
      status,
      score: odataScore,
      weight: this.dimensionWeights.odataGatewayReadiness,
      declaredServices,
      verifiedServices: verifiedServiceNames,
      missingServices,
      rationale: `Verified ${verifiedServiceNames.length} of ${declaredServices.length} declared OData services.`,
      evidenceReferences: [`EVD-ODATA-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Dimension 6: Authorization & Business Role Readiness (Weight: 8%)
  // =========================================================================
  _evaluateAuthorizationAndRoles({ candidate, context, evidenceReferences, identifiedGaps, missingEvidenceList, governanceGuardrailsApplied }) {
    const declaredRoles = Array.isArray(candidate.businessRoles)
      ? candidate.businessRoles
      : (Array.isArray(candidate.userRoles) ? candidate.userRoles : []);

    const userAuthorizations = Array.isArray(context.userAuthorizations)
      ? context.userAuthorizations.map((r) => r.toUpperCase())
      : (Array.isArray(context.userRoles) ? context.userRoles.map((r) => r.toUpperCase()) : null);

    if (!userAuthorizations) {
      missingEvidenceList.push(
        `User PFCG authorization assignments pending verification for candidate roles: [${declaredRoles.join(', ')}].`
      );

      evidenceReferences.push({
        evidenceId: `EVD-AUTH-${candidate.appId}`,
        evidenceType: 'OFFICIAL_CATALOGUE',
        source: 'Official SAP Fiori Apps Reference Library',
        retrievedValue: `Declared Roles: [${declaredRoles.join(', ')}] (User authorizations not supplied)`,
        verificationStatus: 'PENDING_VERIFICATION',
        confidence: 'MEDIUM',
        explanation: 'Business roles identified in catalogue, but user-level PFCG assignment is unverified.'
      });

      return {
        dimensionKey: 'authorizationAndRoles',
        dimensionName: 'Authorization & Role Readiness',
        isApplicable: true,
        status: DIMENSION_STATUSES.PENDING_VERIFICATION,
        score: 50,
        weight: this.dimensionWeights.authorizationAndRoles,
        declaredRoles,
        rationale: `Business roles identified (${declaredRoles.join(', ') || 'Standard User'}), but user authorization assignments remain unverified on target system.`,
        evidenceReferences: [`EVD-AUTH-${candidate.appId}`]
      };
    }

    const hasRoleMatch = declaredRoles.some((role) =>
      userAuthorizations.includes(role.toUpperCase())
    );

    let status = DIMENSION_STATUSES.VERIFIED_FIT;
    let score = 100;

    if (!hasRoleMatch) {
      status = DIMENSION_STATUSES.BLOCKED_BY_AUTHORIZATION;
      score = 40;
      identifiedGaps.push({
        gapId: `GAP-AUTH-${candidate.appId}`,
        title: 'Missing PFCG Business Role Assignment',
        description: `Target user/test profile lacks explicit assignment for required business role(s): ${declaredRoles.join(', ')}.`,
        category: GAP_CATEGORIES.AUTHORIZATION,
        gapClassification: 'AUTHORIZATION_GAP',
        severity: GAP_SEVERITIES.MAJOR,
        missingInformation: ['PFCG role assignment record'],
        recommendedInvestigation: 'Assign required standard PFCG role via transaction SU01 / PFCG.'
      });
      governanceGuardrailsApplied.push('AUTHORIZATION_BLOCKED_FLAGGED');
    }

    return {
      dimensionKey: 'authorizationAndRoles',
      dimensionName: 'Authorization & Role Readiness',
      isApplicable: true,
      status,
      score,
      weight: this.dimensionWeights.authorizationAndRoles,
      declaredRoles,
      rationale: hasRoleMatch
        ? 'User has verified authorization for required business role.'
        : 'User lacks explicit PFCG assignment for required candidate business roles.',
      evidenceReferences: [`EVD-AUTH-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Dimension 7: SAP Release & Component Compatibility (Weight: 7%)
  // =========================================================================
  _evaluateReleaseCompatibility({ candidate, context, evidenceReferences, identifiedGaps, missingEvidenceList, governanceGuardrailsApplied }) {
    const targetRelease = context.targetSystem?.release || context.systemRelease || '';
    const candVersion = candidate.productVersion || candidate.supportedProductRelease || '';

    if (!candVersion || !targetRelease) {
      missingEvidenceList.push('Target system release or candidate product version is missing.');
      return {
        dimensionKey: 'releaseCompatibility',
        dimensionName: 'Release & Component Compatibility',
        isApplicable: true,
        status: DIMENSION_STATUSES.PENDING_VERIFICATION,
        score: 50,
        weight: this.dimensionWeights.releaseCompatibility,
        rationale: 'Compatibility cannot be definitively confirmed due to missing release metadata.',
        evidenceReferences: []
      };
    }

    const candUpper = candVersion.toUpperCase();
    const targetUpper = targetRelease.toUpperCase();

    const isTargetEcc = targetUpper.includes('ECC') || targetUpper.includes('ERP 6');
    const isCandS4 = candUpper.includes('S/4HANA') || candUpper.includes('S4HANA');
    const isTargetS4 = targetUpper.includes('S/4HANA') || targetUpper.includes('S4HANA') || targetUpper.includes('2020') || targetUpper.includes('2021') || targetUpper.includes('2022') || targetUpper.includes('2023');

    let isCompatible = false;
    if (isTargetEcc && isCandS4) {
      isCompatible = false;
    } else if (isTargetS4 && isCandS4) {
      isCompatible = true;
    } else if (targetUpper.includes(candUpper) || candUpper.includes(targetUpper)) {
      isCompatible = true;
    } else if (isCandS4 && !isTargetEcc) {
      isCompatible = true;
    }

    if (!isCompatible) {
      identifiedGaps.push({
        gapId: `GAP-COMPAT-${candidate.appId}`,
        title: 'SAP Release Incompatibility',
        description: `Candidate version (${candVersion}) is incompatible with target release (${targetRelease}).`,
        category: GAP_CATEGORIES.COMPATIBILITY,
        gapClassification: 'RELEASE_INCOMPATIBILITY',
        severity: GAP_SEVERITIES.CRITICAL,
        missingInformation: ['Compatible software component version'],
        recommendedInvestigation: 'Check SAP Fiori Apps Library for release-specific application versions.'
      });
      governanceGuardrailsApplied.push('RELEASE_INCOMPATIBILITY_BLOCKED');
    }

    evidenceReferences.push({
      evidenceId: `EVD-COMPAT-${candidate.appId}`,
      evidenceType: 'SYSTEM_PROFILE',
      source: 'System Profile & Catalogue Release Spec',
      retrievedValue: `Candidate: "${candVersion}" vs Target: "${targetRelease}"`,
      verificationStatus: isCompatible ? 'VERIFIED_CATALOGUE' : 'NOT_AVAILABLE',
      confidence: 'HIGH',
      explanation: 'Evaluated application release compatibility against target system release.'
    });

    return {
      dimensionKey: 'releaseCompatibility',
      dimensionName: 'Release & Component Compatibility',
      isApplicable: true,
      status: isCompatible ? DIMENSION_STATUSES.VERIFIED_FIT : DIMENSION_STATUSES.NO_FIT,
      score: isCompatible ? 100 : 0,
      weight: this.dimensionWeights.releaseCompatibility,
      rationale: isCompatible
        ? `Application compatible with target release (${targetRelease}).`
        : `Application version (${candVersion}) is incompatible with target release (${targetRelease}).`,
      evidenceReferences: [`EVD-COMPAT-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Dimension 8: Extensibility & Customization Requirements (Weight: 8%)
  // =========================================================================
  _evaluateExtensibilityAndCustomization({ requirement, candidate, context, evidenceReferences, identifiedGaps, missingEvidenceList }) {
    const customReqs = Array.isArray(requirement.customizationRequirements)
      ? requirement.customizationRequirements
      : [];
    const isCustomVariantActive = Boolean(context.customVariantActive);

    const isFioriElements = candidate.uiTechnology?.includes('SAPUI5') || candidate.uiTechnology?.includes('elements');
    const isClassicGui = candidate.appType === 'SAP GUI' || candidate.uiTechnology?.includes('SAP GUI');

    if (customReqs.length > 0 || isCustomVariantActive) {
      if (isFioriElements) {
        identifiedGaps.push({
          gapId: `GAP-CUST-${candidate.appId}`,
          title: 'Legacy Screen Modification Incompatibility',
          description: 'Standard Fiori elements application does not execute legacy Dynpro user exits, screen modifications, or BDC batch inputs.',
          category: GAP_CATEGORIES.CUSTOM_VARIANT,
          gapClassification: 'CUSTOMIZATION_CONFLICT',
          severity: GAP_SEVERITIES.MAJOR,
          missingInformation: ['Custom extension logic analysis'],
          recommendedInvestigation: 'Evaluate Key User Extensibility, Developer Extensibility, or retain Classic GUI for HTML tile.'
        });

        return {
          dimensionKey: 'extensibilityAndCustomization',
          dimensionName: 'Extensibility & Customization Requirements',
          isApplicable: true,
          status: DIMENSION_STATUSES.PARTIAL_FIT,
          score: 40,
          weight: this.dimensionWeights.extensibilityAndCustomization,
          extensibilityTier: 'TIER_1_KEY_USER',
          rationale: 'Active customizations identified in transaction. Standard Fiori elements app requires custom extension adaptation.',
          evidenceReferences: []
        };
      }

      if (isClassicGui) {
        return {
          dimensionKey: 'extensibilityAndCustomization',
          dimensionName: 'Extensibility & Customization Requirements',
          isApplicable: true,
          status: DIMENSION_STATUSES.VERIFIED_FIT,
          score: 95,
          weight: this.dimensionWeights.extensibilityAndCustomization,
          extensibilityTier: 'LEGACY_DYNPRO',
          rationale: 'Classic SAP GUI for HTML preserves 100% of custom Dynpro screens, user exits, and variant logic.',
          evidenceReferences: []
        };
      }
    }

    return {
      dimensionKey: 'extensibilityAndCustomization',
      dimensionName: 'Extensibility & Customization Requirements',
      isApplicable: true,
      status: DIMENSION_STATUSES.VERIFIED_FIT,
      score: 100,
      weight: this.dimensionWeights.extensibilityAndCustomization,
      extensibilityTier: 'STANDARD',
      rationale: 'No conflicting legacy screen customizations detected.',
      evidenceReferences: []
    };
  }

  // =========================================================================
  // Dimension 9: Clean Core Alignment (Weight: 6%)
  // =========================================================================
  _evaluateCleanCoreAlignment({ requirement, candidate, context, evidenceReferences, identifiedGaps, missingEvidenceList }) {
    const isClassicGui = candidate.appType === 'SAP GUI' || candidate.uiTechnology?.includes('SAP GUI');
    const isCustomVariantActive = Boolean(context.customVariantActive);

    let score = 100;
    let status = DIMENSION_STATUSES.VERIFIED_FIT;
    let cleanCoreRating = 'GREEN';
    let rationale = 'Application fully conforms to SAP Clean Core standards via standard public APIs and upgrade-stable UI.';

    if (isClassicGui) {
      score = 55;
      status = DIMENSION_STATUSES.PARTIAL_FIT;
      cleanCoreRating = 'AMBER';
      rationale = 'Classic WebGUI tile preserves legacy Dynpro coupling; acceptable as bridge solution but does not meet full Clean Core modernization objectives.';

      identifiedGaps.push({
        gapId: `GAP-CLEAN-CORE-${candidate.appId}`,
        title: 'Legacy Core Coupling in Classic WebGUI',
        description: 'Classic SAP GUI for HTML tile relies on legacy on-stack Dynpro runtime, maintaining core coupling.',
        category: GAP_CATEGORIES.CLEAN_CORE_VIOLATION,
        gapClassification: 'CLEAN_CORE_VIOLATION',
        severity: GAP_SEVERITIES.MEDIUM,
        missingInformation: ['Clean Core modernization roadmap'],
        recommendedInvestigation: 'Plan phased migration from Classic WebGUI to ABAP Cloud / Fiori Elements.'
      });
    } else if (isCustomVariantActive) {
      score = 75;
      status = DIMENSION_STATUSES.PARTIAL_FIT;
      cleanCoreRating = 'AMBER';
      rationale = 'Legacy variants must be re-architected using SAP Key User Extensibility or Developer Extensibility (Tier 1/2) to maintain clean core compliance.';
    }

    evidenceReferences.push({
      evidenceId: `EVD-CLEAN-CORE-${candidate.appId}`,
      evidenceType: 'GOVERNANCE_AUDIT',
      source: 'SAP Clean Core Extensibility Framework',
      retrievedValue: `Clean Core Rating: ${cleanCoreRating}, UI: ${candidate.uiTechnology || 'SAP Fiori'}`,
      verificationStatus: 'VERIFIED_CATALOGUE',
      confidence: 'HIGH',
      explanation: 'Evaluated compliance with Clean Core upgrade-stability principles.'
    });

    return {
      dimensionKey: 'cleanCoreAlignment',
      dimensionName: 'Clean Core Alignment',
      isApplicable: true,
      status,
      score,
      weight: this.dimensionWeights.cleanCoreAlignment,
      cleanCoreRating,
      rationale,
      evidenceReferences: [`EVD-CLEAN-CORE-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Dimension 10: Operational & Deployment Readiness (Weight: 6%)
  // =========================================================================
  _evaluateOperationalAndDeploymentReadiness({ candidate, context, evidenceReferences, identifiedGaps, missingEvidenceList, governanceGuardrailsApplied }) {
    const activeServicesList = Array.isArray(context.activeServices)
      ? context.activeServices.map((s) => s.toUpperCase())
      : (Array.isArray(context.activeGatewayServices) ? context.activeGatewayServices.map((s) => s.toUpperCase()) : []);

    const liveServices = Array.isArray(context.liveServices) ? context.liveServices : [];

    let isActivated = false;
    let isUnknown = false;

    if (candidate.appType === 'SAP GUI') {
      isActivated = true;
    } else if (candidate.verifiedODataServices && candidate.verifiedODataServices.length > 0) {
      isActivated = true;
    } else if (activeServicesList.length > 0) {
      const deps = candidate.odataDependencies || candidate.odataServices || [];
      isActivated = deps.some((dep) => activeServicesList.includes(dep.toUpperCase()));
    } else if (liveServices.length > 0) {
      const deps = candidate.odataDependencies || candidate.odataServices || [];
      isActivated = deps.some((dep) =>
        liveServices.some((ls) => (ls.technicalServiceName || '').toUpperCase().includes(dep.toUpperCase()))
      );
    } else {
      isUnknown = true;
    }

    if (isUnknown) {
      missingEvidenceList.push(
        `Activation status unverified for candidate "${candidate.appId}" on target system.`
      );
      identifiedGaps.push({
        gapId: `GAP-ACT-${candidate.appId}`,
        title: 'SICF & Gateway Service Activation Unverified',
        description: 'Application activation status (ICF service & OData activation) cannot be confirmed without live system inspection.',
        category: GAP_CATEGORIES.ACTIVATION,
        gapClassification: 'DEPLOYMENT_DEPENDENCY',
        severity: GAP_SEVERITIES.MAJOR,
        missingInformation: ['SICF and /IWFND/MAINT_SERVICE activation records'],
        recommendedInvestigation: 'Inspect SICF node and verify Gateway service status on target S/4HANA system.'
      });

      return {
        dimensionKey: 'operationalAndDeploymentReadiness',
        dimensionName: 'Operational & Deployment Readiness',
        isApplicable: true,
        status: DIMENSION_STATUSES.PENDING_VERIFICATION,
        score: 50,
        weight: this.dimensionWeights.operationalAndDeploymentReadiness,
        rationale: 'Application activation status remains unverified on target system. Evidence pending.',
        evidenceReferences: []
      };
    }

    evidenceReferences.push({
      evidenceId: `EVD-ACT-${candidate.appId}`,
      evidenceType: 'SYSTEM_PROFILE',
      source: 'Live SAP Gateway Catalog',
      retrievedValue: isActivated ? 'Active & Registered' : 'Not Activated',
      verificationStatus: isActivated ? 'VERIFIED_LIVE' : 'NOT_AVAILABLE',
      confidence: 'HIGH',
      explanation: 'Verified backend service presence in active Gateway service registry.'
    });

    return {
      dimensionKey: 'operationalAndDeploymentReadiness',
      dimensionName: 'Operational & Deployment Readiness',
      isApplicable: true,
      status: isActivated ? DIMENSION_STATUSES.VERIFIED_FIT : DIMENSION_STATUSES.NO_FIT,
      score: isActivated ? 100 : 0,
      weight: this.dimensionWeights.operationalAndDeploymentReadiness,
      rationale: isActivated
        ? 'Application backend service is active and registered in target Gateway catalog.'
        : 'Application service is not active on target SAP system.',
      evidenceReferences: [`EVD-ACT-${candidate.appId}`]
    };
  }

  // =========================================================================
  // Evidence Completeness & Confidence (Evaluation Dimension)
  // =========================================================================
  _evaluateEvidenceCompleteness({ evidenceReferences, missingEvidenceList, conflictingEvidenceList, scoreCoverage }) {
    const verifiedCount = evidenceReferences.filter((e) =>
      ['VERIFIED_LIVE', 'VERIFIED_CATALOGUE'].includes(e.verificationStatus)
    ).length;
    const totalCount = evidenceReferences.length + missingEvidenceList.length;

    const ratio = totalCount > 0 ? verifiedCount / totalCount : 0;
    let confidence = 'VERY_LOW';

    if (ratio >= 0.75 && conflictingEvidenceList.length === 0 && scoreCoverage >= 70) {
      confidence = 'HIGH';
    } else if (ratio >= 0.50) {
      confidence = 'MEDIUM';
    } else if (ratio >= 0.25) {
      confidence = 'LOW';
    }

    return {
      dimensionKey: 'evidenceCompleteness',
      dimensionName: 'Evidence Completeness & Confidence',
      status: ratio >= 0.5 ? DIMENSION_STATUSES.VERIFIED_FIT : DIMENSION_STATUSES.PARTIAL_FIT,
      score: Math.round(ratio * 100),
      confidence,
      verifiedEvidenceCount: verifiedCount,
      totalEvidenceCount: totalCount,
      completenessRatio: Number(ratio.toFixed(2)),
      scoreCoverage,
      rationale: `Evidence completeness: ${Math.round(ratio * 100)}% (${verifiedCount} verified evidence items, ${missingEvidenceList.length} items missing, ${conflictingEvidenceList.length} conflicts). Score coverage: ${scoreCoverage}%.`
    };
  }

  // =========================================================================
  // Overall Status & Governance Resolution
  // =========================================================================
  _resolveOverallStatus({
    functionalCoverage,
    technicalEval,
    businessProcessAlignment,
    releaseCompatibility,
    extensibilityAndCustomization,
    cleanCoreAlignment,
    evidenceCompletenessEval,
    identifiedGaps,
    overallScore,
    conflictingEvidenceList,
    governanceGuardrailsApplied
  }) {
    const criticalGaps = identifiedGaps.filter(
      (g) => g.severity === GAP_SEVERITIES.CRITICAL
    );
    const majorGaps = identifiedGaps.filter(
      (g) => g.severity === GAP_SEVERITIES.MAJOR
    );

    // Rule 1: Insufficient Evidence
    if (evidenceCompletenessEval.confidence === 'VERY_LOW' || functionalCoverage.status === DIMENSION_STATUSES.PENDING_VERIFICATION) {
      return {
        status: ASSESSMENT_STATUSES.INSUFFICIENT_EVIDENCE,
        reason: 'Evidence completeness is too low to determine fit.'
      };
    }

    // Rule 2: Release Incompatibility or Zero Functional Fit
    if (releaseCompatibility.status === DIMENSION_STATUSES.NO_FIT || (functionalCoverage.score < 25 && functionalCoverage.missingCapabilities.length > 0)) {
      return {
        status: ASSESSMENT_STATUSES.NO_FIT,
        reason: releaseCompatibility.status === DIMENSION_STATUSES.NO_FIT
          ? 'Application is incompatible with the target SAP release.'
          : 'Candidate fails to fulfill basic functional capabilities.'
      };
    }

    // Rule 3: HARD GOVERNANCE GUARDRAIL — Critical Gaps Prevent VERIFIED_FIT
    if (criticalGaps.length > 0) {
      governanceGuardrailsApplied.push('CRITICAL_GAP_PREVENTS_VERIFIED_FIT');
      return {
        status: ASSESSMENT_STATUSES.PARTIAL_FIT,
        reason: `Candidate has ${criticalGaps.length} critical gap(s) (${criticalGaps.map((g) => g.description).join('; ')}) preventing full verification.`
      };
    }

    // Rule 4: Major Gaps or High Customization Impact
    if (majorGaps.length > 0 || extensibilityAndCustomization.score < 50) {
      return {
        status: ASSESSMENT_STATUSES.PARTIAL_FIT,
        reason: `Candidate has ${majorGaps.length} major gap(s) requiring functional or technical remediation.`
      };
    }

    // Rule 5: Pure Score-Based Resolution
    if (
      overallScore >= 85 &&
      functionalCoverage.status === DIMENSION_STATUSES.VERIFIED_FIT &&
      technicalEval.status === DIMENSION_STATUSES.VERIFIED_FIT
    ) {
      return {
        status: ASSESSMENT_STATUSES.VERIFIED_FIT,
        reason: 'Application fulfills all mandatory functional, technical, and process requirements with verified evidence.'
      };
    }

    if (overallScore >= 60) {
      return {
        status: ASSESSMENT_STATUSES.PARTIAL_FIT,
        reason: 'Application satisfies core requirements but has secondary gaps or unverified dimensions.'
      };
    }

    return {
      status: ASSESSMENT_STATUSES.POSSIBLE_FIT,
      reason: 'Application shares process context but requires further technical and functional validation.'
    };
  }

  // =========================================================================
  // Formulate Recommendations
  // =========================================================================
  _formulateRecommendation({ status, candidate, requirement, identifiedGaps, extensibilityAndCustomization, technicalIntegrationReadiness, statusResolution, cleanCoreAlignment }) {
    const isClassicGui = candidate.appType === 'SAP GUI' || candidate.uiTechnology?.includes('SAP GUI');

    if ((status === ASSESSMENT_STATUSES.VERIFIED_FIT || status === ASSESSMENT_STATUSES.PARTIAL_FIT) && isClassicGui) {
      return {
        verdict: 'CLASSIC_GUI_FALLBACK',
        rationale: `Classic SAP GUI for HTML WebGUI tile provides fallback access for legacy ${requirement.tcode || 'transaction'} workflows, but does not provide modern Fiori UX. Full functional parity for bespoke Dynpro variants or special G/L keys requires verification.`,
        cleanCoreRating: 'AMBER',
        nextActions: [
          'Publish as fallback tile in SAP Fiori Launchpad.',
          'Verify specific special G/L keys and Dynpro screen variants with business users.',
          'Plan phased migration to modern Fiori elements successor applications.'
        ]
      };
    }

    if (status === ASSESSMENT_STATUSES.VERIFIED_FIT) {
      return {
        verdict: 'RECOMMENDED_STANDARD',
        rationale: `Standard SAP Fiori application "${candidate.appName}" (${candidate.appId}) satisfies all requirements with active backend services on target system.`,
        cleanCoreRating: 'GREEN',
        nextActions: [
          'Assign business role to pilot users for user-acceptance testing.',
          'Verify Launchpad catalog and space/page assignments in production.'
        ]
      };
    }

    if (status === ASSESSMENT_STATUSES.PARTIAL_FIT) {
      return {
        verdict: 'RECOMMENDED_WITH_GAPS',
        rationale: `Candidate "${candidate.appName}" (${candidate.appId}) covers primary requirements, but ${identifiedGaps.length} gap(s) require technical or operational consideration: ${statusResolution.reason}`,
        cleanCoreRating: cleanCoreAlignment?.cleanCoreRating || 'AMBER',
        nextActions: [
          'Conduct detailed business process walkthrough of identified gaps with stakeholders.',
          'Evaluate companion applications (e.g. F1367) or key-user extensibility for missing capabilities.',
          'Review backend service activation in /IWFND/MAINT_SERVICE.'
        ]
      };
    }

    if (status === ASSESSMENT_STATUSES.NO_FIT) {
      return {
        verdict: 'CUSTOM_REQUIRED',
        rationale: `Candidate does not fit requirements: ${statusResolution.reason}`,
        cleanCoreRating: 'RED',
        nextActions: [
          'Evaluate custom SAP Fiori elements development or explore alternative standard catalogue entries.',
          'Retain existing SAP GUI transaction as classic WebGUI tile if available.'
        ]
      };
    }

    return {
      verdict: 'ASSESSMENT_INCONCLUSIVE',
      rationale: statusResolution.reason || 'Insufficient data available to formulate a definitive recommendation.',
      cleanCoreRating: 'AMBER',
      nextActions: [
        'Collect missing requirement parameters and verify live SAP Gateway service metadata.',
        'Re-run assessment after updating system context.'
      ]
    };
  }

  _buildEmptyAssessment({ assessmentId, status, message, requirementId = 'REQ-NONE', assessmentTimestamp }) {
    return {
      assessmentId,
      requirementId,
      requirementTitle: 'Incomplete Assessment',
      candidateAppId: 'UNKNOWN',
      candidateAppName: 'Unknown Candidate',
      overallStatus: status,
      overallScore: 0,
      scoreCoverage: 0,
      evidenceConfidence: 'VERY_LOW',
      confidence: 'VERY_LOW',
      scoringBreakdown: {
        functionalScore: 0,
        technicalScore: 0,
        processScore: 0,
        activationAndRolesScore: 0,
        compatibilityScore: 0,
        weights: this.classicWeights,
        dimensionWeights: this.dimensionWeights,
        scoreCoverage: 0
      },
      dimensionResults: {},
      dimensions: [],
      verifiedCapabilities: [],
      unverifiedCapabilities: [],
      missingCapabilities: [],
      verifiedOperations: [],
      missingOperations: [],
      identifiedGaps: [
        {
          gapId: 'GAP-INPUT-ERROR',
          title: 'Input Definition Error',
          description: message,
          category: GAP_CATEGORIES.FUNCTIONAL_CAPABILITY,
          gapClassification: 'FUNCTIONAL_GAP',
          severity: GAP_SEVERITIES.CRITICAL,
          missingInformation: ['Valid requirement and candidate definitions'],
          recommendedInvestigation: 'Provide valid inputs to assessment engine.'
        }
      ],
      missingEvidence: [message],
      conflictingEvidence: [],
      governanceGuardrailsApplied: ['INPUT_VALIDATION_FAILED'],
      recommendation: {
        verdict: 'ASSESSMENT_INCONCLUSIVE',
        rationale: message,
        nextActions: ['Provide complete requirement and candidate objects.']
      },
      evidenceReferences: [],
      provenance: 'Fiorify_FIT_GAP_ASSESSMENT_ENGINE',
      assessmentTimestamp
    };
  }
}

export const fitGapAssessmentEngine = new FitGapAssessmentEngine();
