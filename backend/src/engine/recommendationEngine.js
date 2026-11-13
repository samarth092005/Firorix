/**
 * Fiorify — Governed Recommendation Engine (REC-01 & REC-QA-01)
 *
 * Formulates authoritative architectural verdicts:
 * - ADOPT: Standard Fiori application fulfills all requirements with verified compatibility.
 * - CONFIGURE: Standard application fits, but requires standard administrative / Launchpad enablement.
 * - EXTEND: Standard application covers core flow, requires Clean Core Key User / Developer extension.
 * - BUILD: Confirmed material gaps with verified 9-point preconditions, justified custom RAP / CAP development.
 * - REVIEW: Identified architectural gaps, release blocker, or conflicting evidence requiring stakeholder review.
 * - PENDING_VERIFICATION: Target system evidence or release compatibility is pending verification.
 * - INSUFFICIENT_EVIDENCE: Essential requirements or candidate specifications missing / unverified.
 *
 * Hard Governance Rules:
 * - Deterministic, evidence-backed decision matrix.
 * - Missing evidence is NEVER an excuse to recommend BUILD (hard 9-point precondition check).
 * - Release blocker or critical functional gap prevents unconditional ADOPT.
 * - Classic WebGUI tiles are treated as bridge / transition solutions, never permanent Clean Core targets.
 * - Clean Core extensibility tiering explicitly evaluated (Tier 1 Key User, Tier 2 Developer Cloud, Tier 3 Classic Core).
 * - Actionable remediation plans sequenced by operational responsibility (Basis, Security, Developer, Process Owner).
 * - Detailed decision explanations provided for auditability and governance boards.
 */

import {
  fitGapAssessmentEngine,
  ASSESSMENT_STATUSES,
  DIMENSION_STATUSES,
  GAP_SEVERITIES,
  GAP_CATEGORIES
} from './fitGapAssessmentEngine.js';

export const RECOMMENDATION_OUTCOMES = Object.freeze({
  ADOPT: 'ADOPT',
  CONFIGURE: 'CONFIGURE',
  EXTEND: 'EXTEND',
  BUILD: 'BUILD',
  REVIEW: 'REVIEW',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE'
});

export const EXTENSIBILITY_TIERS = Object.freeze({
  TIER_1_KEY_USER: 'TIER_1_KEY_USER',
  TIER_2_CLOUD_DEVELOPER: 'TIER_2_CLOUD_DEVELOPER',
  TIER_3_CLASSIC_CORE: 'TIER_3_CLASSIC_CORE',
  NONE: 'NONE'
});

export const GOVERNANCE_OVERRIDES = Object.freeze({
  CRITICAL_FUNCTIONAL_GAP_PREVENTS_ADOPT: 'CRITICAL_FUNCTIONAL_GAP_PREVENTS_ADOPT',
  RELEASE_BLOCKER_PREVENTS_ADOPT: 'RELEASE_BLOCKER_PREVENTS_ADOPT',
  MISSING_EVIDENCE_PREVENTS_BUILD: 'MISSING_EVIDENCE_PREVENTS_BUILD',
  BUILD_PRECONDITIONS_FAILED: 'BUILD_PRECONDITIONS_FAILED',
  LEGACY_GUI_FALLBACK_RECOMMENDED: 'LEGACY_GUI_FALLBACK_RECOMMENDED',
  CLEAN_CORE_EXTENSIBILITY_ENFORCED: 'CLEAN_CORE_EXTENSIBILITY_ENFORCED',
  UNVERIFIED_AUTHORIZATION_REQUIRES_CONFIG: 'UNVERIFIED_AUTHORIZATION_REQUIRES_CONFIG',
  UNREGISTERED_GATEWAY_SERVICE_REQUIRES_CONFIG: 'UNREGISTERED_GATEWAY_SERVICE_REQUIRES_CONFIG',
  Z_ALIAS_UNVERIFIED_REQUIRES_REVIEW: 'Z_ALIAS_UNVERIFIED_REQUIRES_REVIEW',
  SYSTEM_VERIFICATION_PENDING: 'SYSTEM_VERIFICATION_PENDING'
});

export class RecommendationEngine {
  /**
   * Generates a governed recommendation based on fit-gap assessment and context.
   */
  generate(input = {}, options = {}) {
    let { assessment, requirement, candidate, context = {}, discoveryResult = null, matchingResult = null } = input;

    // If assessment is not directly provided, evaluate using fitGapAssessmentEngine
    if (!assessment || typeof assessment !== 'object' || !assessment.overallStatus) {
      if (!requirement || !candidate) {
        return this._buildIncompleteRecommendation({
          outcome: RECOMMENDATION_OUTCOMES.INSUFFICIENT_EVIDENCE,
          reason: 'Both requirement and candidate specifications are required to formulate a recommendation.'
        });
      }
      assessment = fitGapAssessmentEngine.evaluate({ requirement, candidate, context });
    }

    const recTimestamp = new Date().toISOString();
    const recommendationId = `REC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Extract inputs from assessment if not explicitly passed
    const req = requirement || assessment.requirement || {
      id: assessment.requirementId,
      title: assessment.requirementTitle
    };
    const cand = candidate || assessment.candidate || {
      appId: assessment.candidateAppId,
      appName: assessment.candidateAppName
    };

    const identifiedGaps = Array.isArray(assessment.identifiedGaps) ? assessment.identifiedGaps : [];
    const missingEvidence = Array.isArray(assessment.missingEvidence) ? assessment.missingEvidence : [];
    const conflictingEvidence = Array.isArray(assessment.conflictingEvidence) ? assessment.conflictingEvidence : [];
    const dimensionResults = assessment.dimensionResults || {};

    const governanceOverridesApplied = [];
    const risks = [];

    // Analyze gaps and statuses
    const criticalGaps = identifiedGaps.filter((g) => g.severity === GAP_SEVERITIES.CRITICAL);
    const majorGaps = identifiedGaps.filter((g) => g.severity === GAP_SEVERITIES.MAJOR);
    const hasReleaseBlocker = identifiedGaps.some(
      (g) => g.category === GAP_CATEGORIES.COMPATIBILITY || g.gapClassification === 'RELEASE_INCOMPATIBILITY'
    );
    const hasUnverifiedZAlias = identifiedGaps.some(
      (g) => g.gapId?.includes('ALIAS') || conflictingEvidence.some((c) => /alias|Z-service/i.test(c))
    );
    const hasAuthorizationGap = identifiedGaps.some(
      (g) => g.category === GAP_CATEGORIES.AUTHORIZATION || g.gapClassification === 'AUTHORIZATION_GAP'
    );
    const hasMissingODataServices = identifiedGaps.some(
      (g) => g.gapId?.includes('ODATA') || g.category === GAP_CATEGORIES.ODATA_GAP
    );
    const hasCustomizationGaps = identifiedGaps.some(
      (g) => g.category === GAP_CATEGORIES.CUSTOM_VARIANT || g.gapClassification === 'CUSTOMIZATION_CONFLICT'
    );

    const isClassicGui = cand.appType === 'SAP GUI' || cand.uiTechnology?.includes('SAP GUI');

    // Decision Logic
    let outcome = RECOMMENDATION_OUTCOMES.REVIEW;
    let rationale = '';
    let extensibilityStrategy = {
      tier: EXTENSIBILITY_TIERS.NONE,
      recommendedApproach: 'Standard application adoption with no custom coding.',
      cleanCoreCompliant: true
    };

    // 1. Check for Insufficient Evidence
    if (
      assessment.overallStatus === ASSESSMENT_STATUSES.INSUFFICIENT_EVIDENCE ||
      assessment.confidence === 'VERY_LOW'
    ) {
      outcome = RECOMMENDATION_OUTCOMES.INSUFFICIENT_EVIDENCE;
      rationale = 'Essential business requirement parameters or candidate application specifications are missing or unverified.';
      risks.push({
        id: 'RISK-INSUFFICIENT-DATA',
        category: 'GOVERNANCE',
        severity: 'HIGH',
        description: 'Proceeding without verified requirement specifications risks delivering misaligned business capability.',
        mitigation: 'Conduct requirements refinement workshop and capture complete capability statements.'
      });
    }

    // 2. Check for Pending Verification Status
    else if (
      assessment.overallStatus === ASSESSMENT_STATUSES.PENDING_VERIFICATION ||
      cand.releaseCompatibility === 'PENDING_VERIFICATION' ||
      cand.verificationStatus === 'PENDING_VERIFICATION'
    ) {
      outcome = RECOMMENDATION_OUTCOMES.PENDING_VERIFICATION;
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.SYSTEM_VERIFICATION_PENDING);
      rationale = `Candidate "${cand.appName || cand.appId}" has pending landscape verification. Technical metadata must be corroborated with the active SAP system before architectural sign-off.`;
      risks.push({
        id: 'RISK-PENDING-VERIFICATION',
        category: 'GOVERNANCE',
        severity: 'MEDIUM',
        description: 'Unverified candidate metadata may hide activation dependencies or release discrepancies.',
        mitigation: 'Run system connectivity diagnostics and query target SAP Gateway catalog.'
      });
    }

    // 3. Check for Release Incompatibility Blocker
    else if (hasReleaseBlocker || dimensionResults.compatibility?.status === DIMENSION_STATUSES.NO_FIT) {
      outcome = RECOMMENDATION_OUTCOMES.REVIEW;
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.RELEASE_BLOCKER_PREVENTS_ADOPT);
      rationale = `Standard application "${cand.appName}" (${cand.appId}) is incompatible with target SAP release (${context.targetSystem?.release || context.systemRelease || 'Target Release'}). Direct adoption is blocked.`;
      risks.push({
        id: 'RISK-RELEASE-INCOMPATIBILITY',
        category: 'COMPATIBILITY',
        severity: 'CRITICAL',
        description: 'Deploying release-incompatible Fiori apps causes runtime UI crashes and missing Gateway entities.',
        mitigation: 'Inspect SAP Fiori Apps Library for release-specific successor components or verify minimum SPS level.'
      });
    }

    // 4. Conflicting Evidence or Unverified Z-Service Aliases
    else if (hasUnverifiedZAlias || conflictingEvidence.length > 0) {
      outcome = RECOMMENDATION_OUTCOMES.REVIEW;
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.Z_ALIAS_UNVERIFIED_REQUIRES_REVIEW);
      rationale = `Conflicting evidence detected: Customer namespace service alias requires formal EDMX contract verification before application adoption.`;
      risks.push({
        id: 'RISK-UNVERIFIED-Z-ALIAS',
        category: 'INTEGRATION',
        severity: 'HIGH',
        description: 'Customer Z-service aliases may diverge from standard SAP OData contracts, breaking standard UI components.',
        mitigation: 'Compare EDMX $metadata between standard service and customer Z-service alias.'
      });
    }

    // 5. Classic WebGUI Tile Handling
    else if (isClassicGui) {
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.LEGACY_GUI_FALLBACK_RECOMMENDED);
      outcome = RECOMMENDATION_OUTCOMES.CONFIGURE;
      rationale = `Classic SAP GUI for HTML WebGUI tile provides 100% functional fallback for legacy transaction ${req.tcode || ''}, preserving Dynpro screens and exits. It is recommended as a transitional bridge while modern Fiori elements adoption is planned.`;
      extensibilityStrategy = {
        tier: EXTENSIBILITY_TIERS.NONE,
        recommendedApproach: 'WebGUI tile execution; legacy screen exits run unchanged.',
        cleanCoreCompliant: false
      };
      risks.push({
        id: 'RISK-LEGACY-UX-COUPLING',
        category: 'CLEAN_CORE',
        severity: 'MEDIUM',
        description: 'Classic Dynpro in WebGUI retains legacy on-stack coupling and does not conform to responsive Fiori guidelines.',
        mitigation: 'Plan phased deprecation and migrate users to modern Fiori elements apps.'
      });
    }

    // 6. NO_FIT Handling (Strict 9-Point BUILD Precondition Check)
    else if (assessment.overallStatus === ASSESSMENT_STATUSES.NO_FIT) {
      const buildPreconditions = this._evaluateBuildPreconditions({
        requirement: req,
        candidate: cand,
        context,
        assessment,
        dimensionResults
      });

      if (!buildPreconditions.passed) {
        // Missing evidence guardrail: NEVER BUILD on missing evidence or failed preconditions
        governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.MISSING_EVIDENCE_PREVENTS_BUILD);
        outcome = RECOMMENDATION_OUTCOMES.REVIEW;
        rationale = `Under Fiorify Clean Core governance rules, custom BUILD is strictly prevented without fulfilling mandatory preconditions: ${buildPreconditions.missingCriteria.join(', ')}. Complete verification first.`;
        risks.push({
          id: 'RISK-PREMATURE-BUILD',
          category: 'GOVERNANCE',
          severity: 'HIGH',
          description: 'Prematurely building custom apps without validating standard alternatives creates technical debt.',
          mitigation: 'Conduct full catalogue discovery and functional comparison before commissioning custom development.'
        });
      } else {
        // Confirmed material gap on verified candidate with all 9 preconditions verified
        outcome = RECOMMENDATION_OUTCOMES.BUILD;
        rationale = `Standard application candidate fails to fulfill core mandatory business capabilities (${dimensionResults.functionalFit?.missingCapabilities?.join(', ') || 'required capabilities'}). No suitable standard alternative exists. Custom SAP Fiori Elements / RAP development is justified under Clean Core Tier 2.`;
        extensibilityStrategy = {
          tier: EXTENSIBILITY_TIERS.TIER_2_CLOUD_DEVELOPER,
          recommendedApproach: 'Custom SAP Fiori Elements application powered by ABAP RESTful Application Programming Model (RAP) and Core Data Services (CDS).',
          cleanCoreCompliant: true
        };
        risks.push({
          id: 'RISK-CUSTOM-BUILD-OVERHEAD',
          category: 'MAINTENANCE',
          severity: 'HIGH',
          description: 'Custom application development introduces lifecycle maintenance overhead.',
          mitigation: 'Strictly follow ABAP Cloud developer extensibility guidelines and released public APIs.'
        });
      }
    }

    // 7. Customization Required -> EXTEND
    else if (hasCustomizationGaps) {
      outcome = RECOMMENDATION_OUTCOMES.EXTEND;
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.CLEAN_CORE_EXTENSIBILITY_ENFORCED);
      rationale = `Standard application "${cand.appName}" (${cand.appId}) covers the core business workflow, but requires extension to support specific business rules or field additions. Adhere strictly to Clean Core extensibility (Key User / Developer BAdIs).`;
      extensibilityStrategy = {
        tier: EXTENSIBILITY_TIERS.TIER_1_KEY_USER,
        recommendedApproach: 'SAP Key User Extensibility (Custom Fields and Logic app) or Developer Extensibility via released BAdIs.',
        cleanCoreCompliant: true
      };
      risks.push({
        id: 'RISK-EXTENSIBILITY-UPGRADE',
        category: 'UPGRADE_STABILITY',
        severity: 'LOW',
        description: 'Extensions must only use released SAP extension points to avoid upgrade disruptions.',
        mitigation: 'Enforce SAP Clean Core Tier 1 (Key User) and Tier 2 (Developer) governance policies.'
      });
    }

    // 8. Functional Capability Partial Fit -> EXTEND
    else if (
      assessment.overallStatus === ASSESSMENT_STATUSES.PARTIAL_FIT &&
      dimensionResults.functionalFit?.missingCapabilities?.length > 0 &&
      dimensionResults.functionalFit?.verifiedCapabilities?.length > 0
    ) {
      outcome = RECOMMENDATION_OUTCOMES.EXTEND;
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.CLEAN_CORE_EXTENSIBILITY_ENFORCED);
      rationale = `Candidate "${cand.appName}" (${cand.appId}) covers primary capabilities, but missing capabilities (${dimensionResults.functionalFit.missingCapabilities.join(', ')}) require extensibility adaptation or companion applications.`;
      extensibilityStrategy = {
        tier: EXTENSIBILITY_TIERS.TIER_1_KEY_USER,
        recommendedApproach: 'SAP Key User Extensibility or companion standard Fiori applications.',
        cleanCoreCompliant: true
      };
    }

    // 9. Administrative / Technical Enablement Pending -> CONFIGURE
    else if (
      hasAuthorizationGap ||
      hasMissingODataServices ||
      dimensionResults.activation?.status === DIMENSION_STATUSES.PENDING_VERIFICATION ||
      (assessment.overallStatus === ASSESSMENT_STATUSES.PARTIAL_FIT && criticalGaps.length === 0)
    ) {
      outcome = RECOMMENDATION_OUTCOMES.CONFIGURE;
      if (hasAuthorizationGap) governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.UNVERIFIED_AUTHORIZATION_REQUIRES_CONFIG);
      if (hasMissingODataServices) governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.UNREGISTERED_GATEWAY_SERVICE_REQUIRES_CONFIG);

      rationale = `Standard application "${cand.appName}" (${cand.appId}) fulfills business requirements, but requires standard administrative enablement (Launchpad catalog assignments, PFCG business roles, and/or SAP Gateway service activation).`;
      risks.push({
        id: 'RISK-CONFIG-DEPENDENCY',
        category: 'OPERATIONAL',
        severity: 'LOW',
        description: 'Standard role or service activation is pending Basis and Security action.',
        mitigation: 'Execute sequenced configuration checklist in target development/QA landscape.'
      });
    }

    // 10. Complete Verified Fit -> ADOPT
    else if (
      assessment.overallStatus === ASSESSMENT_STATUSES.VERIFIED_FIT &&
      criticalGaps.length === 0
    ) {
      outcome = RECOMMENDATION_OUTCOMES.ADOPT;
      rationale = `Standard SAP Fiori application "${cand.appName}" (${cand.appId}) fulfills all functional, technical, and process requirements with active backend services on the target system. Immediate adoption is recommended.`;
      risks.push({
        id: 'RISK-USER-ADOPTION',
        category: 'CHANGE_MANAGEMENT',
        severity: 'LOW',
        description: 'Transitioning end users from classic Dynpro to Fiori requires change management support.',
        mitigation: 'Provide role-based training and Launchpad personalizations.'
      });
    }

    // Fallback: Missing evidence guardrail
    else {
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.MISSING_EVIDENCE_PREVENTS_BUILD);
      outcome = RECOMMENDATION_OUTCOMES.REVIEW;
      rationale = `Assessment findings are inconclusive due to pending evidence. Missing evidence must never default to custom BUILD. Conduct focused verification.`;
    }

    // Guardrail Enforcement: If candidate has critical functional gaps, ADOPT is strictly forbidden
    if (criticalGaps.length > 0 && outcome === RECOMMENDATION_OUTCOMES.ADOPT) {
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.CRITICAL_FUNCTIONAL_GAP_PREVENTS_ADOPT);
      outcome = RECOMMENDATION_OUTCOMES.EXTEND;
    }

    // Generate Actionable Remediation Plan
    const remediationPlan = this._generateActionableRemediationPlan({
      outcome,
      candidate: cand,
      requirement: req,
      identifiedGaps,
      missingEvidence,
      extensibilityStrategy,
      context
    });

    // Determine Overall Risk Level
    let overallRisk = 'LOW';
    if (risks.some((r) => r.severity === 'CRITICAL')) {
      overallRisk = 'CRITICAL';
    } else if (risks.some((r) => r.severity === 'HIGH')) {
      overallRisk = 'HIGH';
    } else if (risks.some((r) => r.severity === 'MEDIUM')) {
      overallRisk = 'MEDIUM';
    }

    // Formulate Comprehensive Decision Explanations (REC-QA-01)
    const decisionExplanations = {
      outcome,
      selectionReason: rationale,
      rejectedAlternatives: this._evaluateRejectedAlternatives(outcome, cand),
      supportingEvidence: this._extractSupportingEvidence(assessment, cand, context),
      missingEvidence: missingEvidence.length > 0 ? missingEvidence : (assessment.missingEvidence || []),
      remainingAssumptions: this._deriveRemainingAssumptions(outcome, assessment, context),
      humanVerificationRequired: this._deriveHumanVerificationRequired(outcome, assessment, cand)
    };

    return {
      recommendationId,
      assessmentId: assessment.assessmentId,
      requirementId: req.id || 'REQ-UNKNOWN',
      candidateAppId: cand.appId,
      candidateAppName: cand.appName || cand.appId,
      outcome,
      confidence: assessment.confidence || 'MEDIUM',
      scoreCoverage: assessment.scoreCoverage !== undefined ? assessment.scoreCoverage : 50,
      overallScore: assessment.overallScore !== undefined ? assessment.overallScore : 0,

      summary: this._formulateSummary(outcome, cand),
      rationale,
      decisionExplanations,
      extensibilityStrategy,
      governanceOverridesApplied,

      riskAssessment: {
        overallRisk,
        risks
      },

      actionableRemediationPlan: remediationPlan,
      remediationPlan,

      auditMetadata: {
        engine: 'Fiorify_GOVERNED_RECOMMENDATION_ENGINE',
        version: 'REC-01',
        timestamp: recTimestamp
      }
    };
  }

  /**
   * Evaluates the 9 mandatory preconditions for recommending a custom BUILD.
   */
  _evaluateBuildPreconditions({ requirement, candidate, context, assessment, dimensionResults }) {
    const missingCriteria = [];

    // 1. Original business requirement present
    const hasReq = Boolean(requirement && (requirement.title || requirement.statement || requirement.tcode));
    if (!hasReq) missingCriteria.push('1. Original business requirement statement');

    // 2. Candidate search evidence collected
    const hasCandidate = Boolean(candidate && candidate.appId);
    if (!hasCandidate) missingCriteria.push('2. Candidate search evidence from official catalogue');

    // 3. Evaluation of standard alternatives performed
    const hasEvaluation = Boolean(assessment && assessment.overallStatus);
    if (!hasEvaluation) missingCriteria.push('3. Evaluation of available standard alternatives');

    // 4. Functional comparison documented
    const functionalFit = dimensionResults.functionalFit;
    const hasFunctionalCompare = Boolean(functionalFit && functionalFit.status);
    if (!hasFunctionalCompare) missingCriteria.push('4. Functional comparison against standard capabilities');

    // 5. Technical feasibility analyzed
    const hasTechFeasibility = Boolean(candidate.uiTechnology || candidate.appType);
    if (!hasTechFeasibility) missingCriteria.push('5. Technical feasibility analysis');

    // 6. Explanation why configuration is insufficient
    const hasConfigExplanation = Boolean(functionalFit?.missingCapabilities && functionalFit.missingCapabilities.length > 0);
    if (!hasConfigExplanation) missingCriteria.push('6. Evidence that configuration alone is insufficient');

    // 7. Explanation why extension is insufficient
    const isExtensionInsufficient = (assessment.overallStatus === ASSESSMENT_STATUSES.NO_FIT);
    if (!isExtensionInsufficient) missingCriteria.push('7. Evidence that Clean Core extension is insufficient');

    // 8. Unmet capability evidence documented
    const hasUnmetEvidence = Boolean(functionalFit?.missingCapabilities?.length > 0 || assessment.identifiedGaps?.length > 0);
    if (!hasUnmetEvidence) missingCriteria.push('8. Documented unmet capability evidence');

    // 9. Candidate metadata completeness (not missing metadata or low confidence)
    const isMissingMetadata = !candidate.supportedCapabilities && !candidate.capabilities && !candidate.productVersion;
    if (isMissingMetadata || assessment.confidence === 'LOW') {
      missingCriteria.push('9. High-confidence candidate metadata verification');
    }

    return {
      passed: missingCriteria.length === 0,
      missingCriteria
    };
  }

  _formulateSummary(outcome, candidate) {
    switch (outcome) {
      case RECOMMENDATION_OUTCOMES.ADOPT:
        return `Adopt standard application ${candidate.appId} (${candidate.appName}) as verified modernization target.`;
      case RECOMMENDATION_OUTCOMES.CONFIGURE:
        return `Configure standard application ${candidate.appId} (${candidate.appName}) via Launchpad and PFCG roles.`;
      case RECOMMENDATION_OUTCOMES.EXTEND:
        return `Extend standard application ${candidate.appId} using SAP Clean Core Key User / Developer Extensibility.`;
      case RECOMMENDATION_OUTCOMES.BUILD:
        return `Build custom SAP Fiori Elements / RAP application due to confirmed material functional gaps.`;
      case RECOMMENDATION_OUTCOMES.REVIEW:
        return `Review identified architectural gaps and release dependencies for ${candidate.appId} with stakeholders.`;
      case RECOMMENDATION_OUTCOMES.PENDING_VERIFICATION:
        return `Target landscape verification pending for ${candidate.appId}; connect SAP system to complete assessment.`;
      case RECOMMENDATION_OUTCOMES.INSUFFICIENT_EVIDENCE:
      default:
        return `Assessment inconclusive for ${candidate.appId}; refine business requirement specification.`;
    }
  }

  _evaluateRejectedAlternatives(chosenOutcome, candidate) {
    const alternatives = [];
    if (chosenOutcome !== RECOMMENDATION_OUTCOMES.ADOPT) {
      alternatives.push({
        outcome: RECOMMENDATION_OUTCOMES.ADOPT,
        rejectedReason: 'Direct adoption rejected due to unresolved gaps, missing service activations, or release divergence.'
      });
    }
    if (chosenOutcome !== RECOMMENDATION_OUTCOMES.BUILD) {
      alternatives.push({
        outcome: RECOMMENDATION_OUTCOMES.BUILD,
        rejectedReason: 'Custom BUILD rejected to prioritize standard SAP software capabilities and adhere to Clean Core principles.'
      });
    }
    if (chosenOutcome !== RECOMMENDATION_OUTCOMES.CONFIGURE && chosenOutcome !== RECOMMENDATION_OUTCOMES.ADOPT) {
      alternatives.push({
        outcome: RECOMMENDATION_OUTCOMES.CONFIGURE,
        rejectedReason: 'Configuration alone is insufficient to bridge functional, customization, or release gaps.'
      });
    }
    return alternatives;
  }

  _extractSupportingEvidence(assessment, candidate, context) {
    const evidence = [];
    if (candidate.appId) {
      evidence.push(`Catalog candidate ${candidate.appId} identified with UI technology: ${candidate.uiTechnology || 'SAPUI5'}`);
    }
    if (assessment.dimensionResults?.compatibility?.status === 'VERIFIED_FIT') {
      evidence.push(`Release compatibility verified against ${context.targetSystem?.release || 'target landscape'}`);
    }
    if (candidate.verifiedODataServices?.length > 0) {
      evidence.push(`Active OData services corroborated: ${candidate.verifiedODataServices.map((s) => s.serviceName).join(', ')}`);
    }
    return evidence;
  }

  _deriveRemainingAssumptions(outcome, assessment, context) {
    const assumptions = [];
    if (outcome === RECOMMENDATION_OUTCOMES.ADOPT || outcome === RECOMMENDATION_OUTCOMES.CONFIGURE) {
      assumptions.push('Standard OData entities and CDS views in the target landscape remain un-deprecated in future SPS.');
    }
    if (context.userAuthorizations === undefined || context.userAuthorizations?.length === 0) {
      assumptions.push('Target end-users will be granted appropriate PFCG composite business roles prior to cutover.');
    }
    return assumptions;
  }

  _deriveHumanVerificationRequired(outcome, assessment, candidate) {
    const checklist = [];
    if (outcome === RECOMMENDATION_OUTCOMES.BUILD) {
      checklist.push('Enterprise Architecture Board formal review of custom RAP data model and released C1 contract usage.');
    }
    if (outcome === RECOMMENDATION_OUTCOMES.EXTEND) {
      checklist.push('Security and Basis validation of Key User Extensibility permissions on target quality system.');
    }
    if (candidate.appType === 'SAP GUI') {
      checklist.push('Business process owner sign-off on transitional WebGUI user experience.');
    }
    checklist.push('Sign-off on actionable remediation checklist by designated role leads.');
    return checklist;
  }

  _generateActionableRemediationPlan({ outcome, candidate, requirement, identifiedGaps, missingEvidence, extensibilityStrategy, context }) {
    const steps = [];
    let stepNumber = 1;

    // Step for Missing OData services
    const odataGaps = identifiedGaps.filter((g) => g.gapId?.includes('ODATA') || g.category === GAP_CATEGORIES.ODATA_GAP);
    if (odataGaps.length > 0) {
      steps.push({
        step: stepNumber++,
        title: 'Activate Missing OData Services in SAP Gateway',
        description: `Register and activate missing backend services in transaction /IWFND/MAINT_SERVICE: ${odataGaps.map((g) => g.missingInformation?.[0] || g.description).join('; ')}.`,
        responsibleRole: 'Basis Administrator',
        priority: 'IMMEDIATE',
        estimatedEffort: 'LOW',
        prerequisites: ['Target SAP landscape access', 'Developer / Basis authorization in Gateway client'],
        requiredEvidence: 'Green service status in /IWFND/MAINT_SERVICE and HTTP 200 on $metadata request.'
      });
    }

    // Step for Z-Alias Verification
    const aliasGaps = identifiedGaps.filter((g) => g.gapId?.includes('ALIAS'));
    if (aliasGaps.length > 0) {
      steps.push({
        step: stepNumber++,
        title: 'Formally Verify Custom Z-Service Alias Schema',
        description: 'Inspect EDMX schema of customer namespace service alias and compare EntitySets/FunctionImports against standard contract.',
        responsibleRole: 'ABAP Developer',
        priority: 'HIGH',
        estimatedEffort: 'MEDIUM',
        prerequisites: ['Service activation confirmed in Gateway'],
        requiredEvidence: 'Schema diff report confirming full contract compatibility.'
      });
    }

    // Step for Authorization / Business Role Assignment
    const authGaps = identifiedGaps.filter((g) => g.category === GAP_CATEGORIES.AUTHORIZATION || g.gapClassification === 'AUTHORIZATION_GAP');
    if (authGaps.length > 0 || (candidate.businessRoles && candidate.businessRoles.length > 0)) {
      steps.push({
        step: stepNumber++,
        title: 'Assign Fiori Business Roles and Catalogs in PFCG',
        description: `Assign standard business roles (${candidate.businessRoles?.join(', ') || 'Standard PFCG Role'}) to target user master records in transaction PFCG/SU01.`,
        responsibleRole: 'Security / Authorizations Team',
        priority: 'HIGH',
        estimatedEffort: 'LOW',
        prerequisites: ['User master records established in client'],
        requiredEvidence: 'Successful role assignment display in SU01.'
      });
    }

    // Step for Extensibility Implementation
    if (outcome === RECOMMENDATION_OUTCOMES.EXTEND) {
      steps.push({
        step: stepNumber++,
        title: 'Implement Clean Core Extension Logic',
        description: `Implement required business logic and fields using ${extensibilityStrategy.recommendedApproach}. Strictly avoid modifying standard SAP on-stack objects.`,
        responsibleRole: 'ABAP Developer / Key User',
        priority: 'MEDIUM',
        estimatedEffort: 'MEDIUM',
        prerequisites: ['Key User Tools enabled on S/4HANA', 'Developer extensibility authorization'],
        requiredEvidence: 'Successful activation of custom logic without core modifications.'
      });
    }

    // Step for Custom Build
    if (outcome === RECOMMENDATION_OUTCOMES.BUILD) {
      steps.push({
        step: stepNumber++,
        title: 'Architect Custom RAP Business Object and CDS Projections',
        description: 'Create unmanaged or managed ABAP RESTful Application Programming Model (RAP) business object adhering to SAP ABAP Cloud guidelines.',
        responsibleRole: 'Lead ABAP Architect',
        priority: 'CRITICAL',
        estimatedEffort: 'HIGH',
        prerequisites: ['Clean Core architectural review approval', 'Target S/4HANA 2023 development environment'],
        requiredEvidence: 'RAP BO verification with unit tests passing.'
      });
    }

    // Baseline Testing & Sign-off step
    steps.push({
      step: stepNumber++,
      title: 'Conduct Business Process Acceptance Testing',
      description: `Validate end-to-end transaction flow in target QA environment with designated business process owners for ${requirement.title || requirement.id}.`,
      responsibleRole: 'Business Process Owner',
      priority: 'MEDIUM',
      estimatedEffort: 'MEDIUM',
      prerequisites: ['Service activation and role assignments complete'],
      requiredEvidence: 'Signed UAT test script confirming successful execution.'
    });

    return steps;
  }

  _buildIncompleteRecommendation({ outcome, reason }) {
    return {
      recommendationId: `REC-${Date.now()}-INCOMPLETE`,
      outcome,
      confidence: 'VERY_LOW',
      overallScore: 0,
      summary: reason,
      rationale: reason,
      decisionExplanations: {
        outcome,
        selectionReason: reason,
        rejectedAlternatives: [],
        supportingEvidence: [],
        missingEvidence: ['Complete requirement or candidate specification'],
        remainingAssumptions: [],
        humanVerificationRequired: ['Conduct requirement definition workshop']
      },
      extensibilityStrategy: {
        tier: EXTENSIBILITY_TIERS.NONE,
        recommendedApproach: 'No recommendation possible without requirement definition.',
        cleanCoreCompliant: false
      },
      governanceOverridesApplied: [GOVERNANCE_OVERRIDES.MISSING_EVIDENCE_PREVENTS_BUILD],
      riskAssessment: {
        overallRisk: 'HIGH',
        risks: [
          {
            id: 'RISK-INCOMPLETE-INPUT',
            category: 'GOVERNANCE',
            severity: 'HIGH',
            description: reason,
            mitigation: 'Provide complete requirement and candidate specifications.'
          }
        ]
      },
      actionableRemediationPlan: [],
      remediationPlan: [],
      auditMetadata: {
        engine: 'Fiorify_GOVERNED_RECOMMENDATION_ENGINE',
        version: 'REC-01',
        timestamp: new Date().toISOString()
      }
    };
  }
}

export const recommendationEngine = new RecommendationEngine();
