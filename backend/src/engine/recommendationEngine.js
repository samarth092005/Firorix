/**
 * Fiorify — Governed Recommendation Engine (REC-01 & REC-QA-01)
 *
 * Formulates authoritative architectural verdicts:
 * - ADD_AND_CONFIGURE: Standard Fiori application fulfills requirements through addition, configuration, or Clean Core adaptation.
 * - BUILD: Confirmed material gaps with verified 9-point preconditions, justified custom RAP / CAP development.
 * - REVIEW: Identified architectural gaps, release blocker, or conflicting evidence requiring stakeholder review.
 * - PENDING_VERIFICATION: Target system evidence or release compatibility is pending verification.
 * - INSUFFICIENT_EVIDENCE: Essential requirements or candidate specifications missing / unverified.
 *
 * Hard Governance Rules:
 * - Exactly two canonical business decision outcomes: ADD_AND_CONFIGURE and BUILD.
 * - REVIEW is an internal governance / assessment state, never an automated authorization for BUILD.
 * - Missing evidence is NEVER an excuse to recommend BUILD (hard 9-point precondition check).
 * - Release blocker or critical functional gap prevents unconditional ADD_AND_CONFIGURE.
 * - Classic WebGUI tiles are treated as bridge / transition solutions, configured in Launchpad.
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

export const BUSINESS_OUTCOMES = Object.freeze({
  ADD_AND_CONFIGURE: 'ADD_AND_CONFIGURE',
  BUILD: 'BUILD'
});

export const GOVERNANCE_STATES = Object.freeze({
  REVIEW: 'REVIEW',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE'
});

export const RECOMMENDATION_OUTCOMES = Object.freeze({
  ...BUSINESS_OUTCOMES,
  ...GOVERNANCE_STATES
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
    const criticalFunctionalGaps = identifiedGaps.filter(
      (g) => g.severity === GAP_SEVERITIES.CRITICAL &&
        (g.category === GAP_CATEGORIES.FUNCTIONAL_CAPABILITY ||
         g.gapClassification === 'FUNCTIONAL_GAP' ||
         g.category === 'FUNCTIONAL_GAP')
    );
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

    // 1b. Check for Missing Functional Requirements
    else if (
      assessment.missingFunctionalRequirements === true ||
      req.missingFunctionalRequirements === true ||
      (!req.statement && !req.title && !req.description && !assessment.requirementTitle && !assessment.description) ||
      (req.statement && /^(tbd|n\/a|none|placeholder|test)$/i.test(String(req.statement).trim())) ||
      (req.title && /^(tbd|n\/a|none|placeholder|test)$/i.test(String(req.title).trim()))
    ) {
      outcome = RECOMMENDATION_OUTCOMES.REVIEW;
      governanceOverridesApplied.push('MISSING_FUNCTIONAL_REQUIREMENTS_PREVENTS_DECISION');
      rationale = 'Functional requirements are missing or specified with placeholder text. Retained in REVIEW for requirement elaboration.';
      risks.push({
        id: 'RISK-MISSING-REQUIREMENTS',
        category: 'GOVERNANCE',
        severity: 'HIGH',
        description: 'Proceeding without verified functional requirements risks delivering misaligned business capability.',
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

    // 2b. Check for Stale Candidate Metadata
    else if (cand.isStale === true || assessment.candidateStale === true) {
      outcome = RECOMMENDATION_OUTCOMES.REVIEW;
      governanceOverridesApplied.push('STALE_METADATA_REQUIRES_REFRESH');
      rationale = `Candidate "${cand.appName || cand.appId}" metadata is stale or out of synchronization with the target SAP release. Retained in REVIEW for catalogue refresh.`;
      risks.push({
        id: 'RISK-STALE-METADATA',
        category: 'GOVERNANCE',
        severity: 'MEDIUM',
        description: 'Stale candidate metadata may not reflect recent deprecations, UI5 changes, or backend service updates.',
        mitigation: 'Refresh candidate metadata from official SAP Fiori Apps Reference Library.'
      });
    }

    // 2c. Check for Unverified Release Compatibility
    else if (cand.releaseCompatibility === 'UNVERIFIED') {
      outcome = RECOMMENDATION_OUTCOMES.REVIEW;
      governanceOverridesApplied.push('UNVERIFIED_RELEASE_COMPATIBILITY_REQUIRES_REVIEW');
      rationale = `Candidate "${cand.appName || cand.appId}" release compatibility is unverified against target SAP release. Retained in REVIEW for verification.`;
      risks.push({
        id: 'RISK-UNVERIFIED-RELEASE',
        category: 'COMPATIBILITY',
        severity: 'HIGH',
        description: 'Unverified release compatibility may cause runtime failures in target landscape.',
        mitigation: 'Verify minimum component versions and release notes in SAP Fiori Apps Reference Library.'
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
      outcome = RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE;
      rationale = `Classic SAP GUI for HTML WebGUI tile provides 100% functional fallback for legacy transaction ${req.tcode || ''}, preserving Dynpro screens and exits. It is recommended to add and configure as a transitional bridge while modern Fiori elements adoption is planned.`;
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

    // 6. NO_FIT / Critical Functional Gap Handling (Strict 9-Point BUILD Precondition Check)
    else if (assessment.overallStatus === ASSESSMENT_STATUSES.NO_FIT || criticalFunctionalGaps.length > 0) {
      const approval = context.leadArchitectApproval || assessment.leadArchitectApproval;
      const isApprovalPending = Boolean(
        context.approvalPending === true ||
        context.approvalStatus === 'PENDING' ||
        context.approvalStatus === 'PENDING_APPROVAL' ||
        assessment.approvalStatus === 'PENDING' ||
        assessment.approvalStatus === 'PENDING_APPROVAL' ||
        assessment.lifecycleStatus === 'PENDING_REVIEW' ||
        assessment.lifecycleStatus === 'PENDING_APPROVAL' ||
        (approval && approval.approved === false)
      );

      let isApprovalValidForBuild = false;
      let approvalInvalidReason = null;

      if (approval && typeof approval === 'object' && approval.approved === true) {
        const currentAssessmentId = assessment.id || assessment.assessmentId;
        const currentVersion = assessment.version !== undefined ? assessment.version : 1;
        if (approval.assessmentId && currentAssessmentId && approval.assessmentId !== currentAssessmentId) {
          approvalInvalidReason = `Approval belongs to assessment "${approval.assessmentId}", which does not match target assessment "${currentAssessmentId}".`;
        } else if (approval.scope && !['BUILD', 'CUSTOM_DEVELOPMENT'].includes(String(approval.scope).toUpperCase())) {
          approvalInvalidReason = `Approval was scoped to "${approval.scope}", not BUILD. Custom development requires explicit BUILD authorization.`;
        } else if (approval.assessmentVersion !== undefined && approval.assessmentVersion !== currentVersion) {
          approvalInvalidReason = `Approval was bound to assessment version ${approval.assessmentVersion}, but current version is ${currentVersion}. Fresh architect approval required.`;
        } else if (approval.expiresAt && new Date(approval.expiresAt).getTime() < Date.now()) {
          approvalInvalidReason = `Architectural approval expired at ${approval.expiresAt}. Fresh architect review required.`;
        } else if (!approval.approver || /^(unknown|tbd|n\/a|none)$/i.test(String(approval.approver).trim())) {
          approvalInvalidReason = 'Approval approver identity is missing or invalid.';
        } else if (assessment.materialRequirementsChanged === true || assessment.evidenceModifiedAfterApproval === true) {
          approvalInvalidReason = 'Assessment evidence or material requirements changed after approval was granted. Fresh architect review required.';
        } else {
          isApprovalValidForBuild = true;
        }
      }

      const candAppId = cand.appId || assessment.candidateAppId || assessment.matchingFioriApp?.appId;
      const hasStandardCandidate = Boolean(
        candAppId &&
        typeof candAppId === 'string' &&
        candAppId.trim().length > 0 &&
        !['NO_MATCH', 'NONE', 'UNKNOWN', 'NOT_FOUND', 'N/A'].includes(candAppId.trim().toUpperCase())
      );

      const requiresExplicitApproval = !hasStandardCandidate || context.approvalStatus !== undefined || assessment.approvalStatus !== undefined || Boolean(approval);
      const hasArchitectApproved = isApprovalValidForBuild || (!requiresExplicitApproval && !isApprovalPending && (context.approvalStatus === 'APPROVED' || assessment.lifecycleStatus === 'APPROVED'));

      const buildPreconditions = this._evaluateBuildPreconditions({
        requirement: req,
        candidate: cand,
        context,
        assessment,
        dimensionResults,
        discoveryResult,
        matchingResult
      });

      if (isApprovalPending || approvalInvalidReason || (requiresExplicitApproval && !hasArchitectApproved)) {
        outcome = RECOMMENDATION_OUTCOMES.REVIEW;
        rationale = approvalInvalidReason
          ? `Custom BUILD cannot be authorized: ${approvalInvalidReason} Retained in REVIEW for architect sign-off.`
          : 'Custom BUILD requires Lead Architect sign-off. Architect approval is currently pending. Retained in REVIEW for architectural authorization.';
        governanceOverridesApplied.push('PENDING_ARCHITECT_APPROVAL');
        risks.push({
          id: 'RISK-PENDING-ARCHITECT-APPROVAL',
          category: 'GOVERNANCE',
          severity: 'HIGH',
          description: 'Custom BUILD cannot be authorized without Lead Architect sign-off.',
          mitigation: 'Submit assessment to Enterprise Architecture Board for approval.'
        });
      } else if (!buildPreconditions.passed) {
        // Missing evidence guardrail: NEVER BUILD on missing evidence or failed preconditions
        governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.MISSING_EVIDENCE_PREVENTS_BUILD);
        outcome = RECOMMENDATION_OUTCOMES.REVIEW;
        rationale = `Under Fiorify Clean Core governance rules, custom BUILD is strictly prevented without fulfilling mandatory preconditions: ${buildPreconditions.missingCriteria.join(', ')}. Retained in REVIEW for verification.`;
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
        rationale = hasStandardCandidate
          ? `Standard application candidate fails to fulfill core mandatory business capabilities (${dimensionResults.functionalFit?.missingCapabilities?.join(', ') || 'required capabilities'}). No suitable standard alternative exists. Custom SAP Fiori Elements / RAP development is justified under Clean Core Tier 2.`
          : `Official catalogue discovery confirms zero standard SAP Fiori successors for custom process ${req.tcode || 'transaction'}. Technical DDIC evidence verified on target landscape. Custom SAP Fiori Elements / RAP development is justified under Clean Core Tier 2.`;
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

    // 7. Customization Required -> ADD_AND_CONFIGURE with Clean Core Adaptation
    else if (hasCustomizationGaps) {
      outcome = RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE;
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.CLEAN_CORE_EXTENSIBILITY_ENFORCED);
      rationale = `Standard application "${cand.appName}" (${cand.appId}) covers the core business workflow. Recommend ADD & CONFIGURE with Clean Core adaptation (Key User / Developer BAdIs) to support specific business rules without a custom rebuild.`;
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

    // 8. Functional Capability Partial Fit -> ADD_AND_CONFIGURE with Adaptation
    else if (
      assessment.overallStatus === ASSESSMENT_STATUSES.PARTIAL_FIT &&
      dimensionResults.functionalFit?.missingCapabilities?.length > 0 &&
      dimensionResults.functionalFit?.verifiedCapabilities?.length > 0
    ) {
      outcome = RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE;
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.CLEAN_CORE_EXTENSIBILITY_ENFORCED);
      rationale = `Candidate "${cand.appName}" (${cand.appId}) covers primary capabilities. Recommend ADD & CONFIGURE with companion standard Fiori applications or Clean Core adaptation bridging remaining capabilities (${dimensionResults.functionalFit.missingCapabilities.join(', ')}).`;
      extensibilityStrategy = {
        tier: EXTENSIBILITY_TIERS.TIER_1_KEY_USER,
        recommendedApproach: 'SAP Key User Extensibility or companion standard Fiori applications.',
        cleanCoreCompliant: true
      };
    }

    // 9. Administrative / Technical Enablement Pending -> ADD_AND_CONFIGURE
    else if (
      hasAuthorizationGap ||
      hasMissingODataServices ||
      dimensionResults.activation?.status === DIMENSION_STATUSES.PENDING_VERIFICATION ||
      (assessment.overallStatus === ASSESSMENT_STATUSES.PARTIAL_FIT && criticalGaps.length === 0)
    ) {
      outcome = RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE;
      if (hasAuthorizationGap) governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.UNVERIFIED_AUTHORIZATION_REQUIRES_CONFIG);
      if (hasMissingODataServices) governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.UNREGISTERED_GATEWAY_SERVICE_REQUIRES_CONFIG);

      rationale = `Standard application "${cand.appName}" (${cand.appId}) fulfills business requirements. Recommend ADD & CONFIGURE through standard administrative enablement (Launchpad catalog assignments, PFCG business roles, and/or SAP Gateway service activation).`;
      risks.push({
        id: 'RISK-CONFIG-DEPENDENCY',
        category: 'OPERATIONAL',
        severity: 'LOW',
        description: 'Standard role or service activation is pending Basis and Security action.',
        mitigation: 'Execute sequenced configuration checklist in target development/QA landscape.'
      });
    }

    // 10. Complete Verified Fit -> ADD_AND_CONFIGURE
    else if (
      assessment.overallStatus === ASSESSMENT_STATUSES.VERIFIED_FIT &&
      criticalGaps.length === 0
    ) {
      outcome = RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE;
      rationale = `Standard SAP Fiori application "${cand.appName}" (${cand.appId}) fulfills all functional, technical, and process requirements with active backend services on the target system. Recommend ADD & CONFIGURE for immediate adoption and catalog configuration.`;
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
      rationale = `Assessment findings are inconclusive due to pending evidence. Missing evidence must never default to custom BUILD. Retained in REVIEW for focused verification.`;
    }

    // Guardrail Enforcement: If candidate has critical functional gaps, ADD_AND_CONFIGURE is strictly forbidden
    if (criticalFunctionalGaps.length > 0 && outcome === RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE) {
      governanceOverridesApplied.push(GOVERNANCE_OVERRIDES.CRITICAL_FUNCTIONAL_GAP_PREVENTS_ADOPT);
      const approval = context.leadArchitectApproval || assessment.leadArchitectApproval;
      const isApprovalPending = Boolean(
        context.approvalPending === true ||
        context.approvalStatus === 'PENDING' ||
        context.approvalStatus === 'PENDING_APPROVAL' ||
        assessment.approvalStatus === 'PENDING' ||
        assessment.approvalStatus === 'PENDING_APPROVAL' ||
        assessment.lifecycleStatus === 'PENDING_REVIEW' ||
        assessment.lifecycleStatus === 'PENDING_APPROVAL' ||
        (approval && approval.approved === false)
      );

      let isApprovalValidForBuild = false;
      let approvalInvalidReason = null;

      if (approval && typeof approval === 'object' && approval.approved === true) {
        const currentAssessmentId = assessment.id || assessment.assessmentId;
        const currentVersion = assessment.version !== undefined ? assessment.version : 1;
        if (approval.assessmentId && currentAssessmentId && approval.assessmentId !== currentAssessmentId) {
          approvalInvalidReason = `Approval belongs to assessment "${approval.assessmentId}", which does not match target assessment "${currentAssessmentId}".`;
        } else if (approval.scope && !['BUILD', 'CUSTOM_DEVELOPMENT'].includes(String(approval.scope).toUpperCase())) {
          approvalInvalidReason = `Approval was scoped to "${approval.scope}", not BUILD. Custom development requires explicit BUILD authorization.`;
        } else if (approval.assessmentVersion !== undefined && approval.assessmentVersion !== currentVersion) {
          approvalInvalidReason = `Approval was bound to assessment version ${approval.assessmentVersion}, but current version is ${currentVersion}. Fresh architect approval required.`;
        } else if (approval.expiresAt && new Date(approval.expiresAt).getTime() < Date.now()) {
          approvalInvalidReason = `Architectural approval expired at ${approval.expiresAt}. Fresh architect review required.`;
        } else if (!approval.approver || /^(unknown|tbd|n\/a|none)$/i.test(String(approval.approver).trim())) {
          approvalInvalidReason = 'Approval approver identity is missing or invalid.';
        } else if (assessment.materialRequirementsChanged === true || assessment.evidenceModifiedAfterApproval === true) {
          approvalInvalidReason = 'Assessment evidence or material requirements changed after approval was granted. Fresh architect review required.';
        } else {
          isApprovalValidForBuild = true;
        }
      }

      const candAppId = cand.appId || assessment.candidateAppId || assessment.matchingFioriApp?.appId;
      const hasStandardCandidate = Boolean(
        candAppId &&
        typeof candAppId === 'string' &&
        candAppId.trim().length > 0 &&
        !['NO_MATCH', 'NONE', 'UNKNOWN', 'NOT_FOUND', 'N/A'].includes(candAppId.trim().toUpperCase())
      );

      const requiresExplicitApproval = !hasStandardCandidate || context.approvalStatus !== undefined || assessment.approvalStatus !== undefined || Boolean(approval);
      const hasArchitectApproved = isApprovalValidForBuild || (!requiresExplicitApproval && !isApprovalPending && (context.approvalStatus === 'APPROVED' || assessment.lifecycleStatus === 'APPROVED'));

      if (isApprovalPending || approvalInvalidReason || (requiresExplicitApproval && !hasArchitectApproved)) {
        outcome = RECOMMENDATION_OUTCOMES.REVIEW;
        rationale = approvalInvalidReason
          ? `Critical functional gaps detected on standard candidate "${cand.appName}", but approval is invalid: ${approvalInvalidReason} Retained in REVIEW for architectural authorization.`
          : `Critical functional gaps detected on standard candidate "${cand.appName}", but Lead Architect approval is pending. Retained in REVIEW for architectural authorization.`;
        governanceOverridesApplied.push('PENDING_ARCHITECT_APPROVAL');
      } else {
        const buildPreconditions = this._evaluateBuildPreconditions({
          requirement: req,
          candidate: cand,
          context,
          assessment,
          dimensionResults,
          discoveryResult,
          matchingResult
        });
        if (buildPreconditions.passed) {
          outcome = RECOMMENDATION_OUTCOMES.BUILD;
          rationale = `Critical functional gaps detected on standard candidate "${cand.appName}". No suitable standard alternative fulfills mandatory requirements. Custom BUILD justified under Clean Core.`;
        } else {
          outcome = RECOMMENDATION_OUTCOMES.REVIEW;
          rationale = `Critical functional gaps detected on standard candidate "${cand.appName}". Retained in REVIEW for architectural alignment and precondition verification: ${buildPreconditions.missingCriteria.join(', ')}.`;
        }
      }
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
      businessOutcome: (outcome === BUSINESS_OUTCOMES.ADD_AND_CONFIGURE || outcome === BUSINESS_OUTCOMES.BUILD) ? outcome : null,
      governanceState: (outcome === BUSINESS_OUTCOMES.ADD_AND_CONFIGURE || outcome === BUSINESS_OUTCOMES.BUILD) ? null : outcome,
      isBusinessOutcome: (outcome === BUSINESS_OUTCOMES.ADD_AND_CONFIGURE || outcome === BUSINESS_OUTCOMES.BUILD),
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
   * Supports two distinct architectural evidence paths:
   * - Path A: Standard candidate exists in official catalogue but has confirmed material functional gaps.
   * - Path B: No standard candidate exists; verified custom process established via completed discovery.
   */
  _evaluateBuildPreconditions({ requirement, candidate, context, assessment, dimensionResults, discoveryResult, matchingResult }) {
    const missingCriteria = [];

    // Determine whether a standard candidate was identified (Path A vs Path B)
    const candAppId = candidate?.appId || assessment?.candidateAppId || assessment?.matchingFioriApp?.appId;
    const hasStandardCandidate = Boolean(
      candAppId &&
      typeof candAppId === 'string' &&
      candAppId.trim().length > 0 &&
      !['NO_MATCH', 'NONE', 'UNKNOWN', 'NOT_FOUND', 'N/A'].includes(candAppId.trim().toUpperCase())
    );

    // Precondition 1: Original business requirement statement
    // Proves a genuine, non-empty, non-placeholder requirement statement
    const reqText = String(requirement?.statement || requirement?.title || requirement?.description || assessment?.requirementTitle || assessment?.requirementStatement || '').trim();
    const isPlaceholderText = /^(tbd|n\/a|none|test|todo|unknown|placeholder|\.+)$/i.test(reqText);
    const hasValidTcode = Boolean((requirement?.tcode || assessment?.tcode || context?.tcode) && String(requirement?.tcode || assessment?.tcode || context?.tcode).trim().length >= 2);
    if (!reqText || reqText.length < 3 || isPlaceholderText || !hasValidTcode) {
      missingCriteria.push('1. Original business requirement statement (genuine non-placeholder specification and valid transaction code required)');
    }

    if (hasStandardCandidate) {
      // ----------------------------------------------------------------------
      // PATH A: Standard Candidate Exists in Official Reference Library
      // ----------------------------------------------------------------------

      // Precondition 2: Candidate search evidence from official catalogue
      const isValidAppId = typeof candAppId === 'string' && candAppId.trim().length > 0 && !/^(unknown|tbd|n\/a)$/i.test(candAppId.trim());
      if (!isValidAppId) {
        missingCriteria.push('2. Candidate search evidence from official catalogue (valid candidate Fiori application ID)');
      }

      // Precondition 3: Evaluation of standard alternatives performed
      const hasEvaluation = Boolean(
        (assessment && assessment.overallStatus) ||
        (assessment && assessment.fitGapScore !== undefined) ||
        dimensionResults?.functionalFit ||
        dimensionResults?.technicalFit
      );
      if (!hasEvaluation) {
        missingCriteria.push('3. Evaluation of available standard alternatives (fit-gap evaluation required)');
      }

      // Precondition 4: Functional comparison documented
      const functionalFit = dimensionResults?.functionalFit || assessment?.dimensionResults?.functionalFit;
      const hasFunctionalCompare = Boolean(
        functionalFit && (
          functionalFit.status ||
          (Array.isArray(functionalFit.missingCapabilities) && functionalFit.missingCapabilities.length > 0) ||
          (Array.isArray(functionalFit.verifiedCapabilities) && functionalFit.verifiedCapabilities.length > 0)
        )
      );
      if (!hasFunctionalCompare) {
        missingCriteria.push('4. Functional comparison against standard capabilities (functional fit dimension evaluation required)');
      }

      // Precondition 5: Technical feasibility analysis
      const uiTech = candidate?.uiTechnology || candidate?.appType || assessment?.matchingFioriApp?.uiTechnology;
      const isTechAnalyzed = Boolean(uiTech && !/^(unknown|tbd|n\/a)$/i.test(uiTech));
      if (!isTechAnalyzed) {
        missingCriteria.push('5. Technical feasibility analysis (UI technology and component architecture evaluation)');
      }

      // Precondition 6: Evidence that configuration alone is insufficient
      // Must prove that configuration/parameterization cannot resolve the mandatory gap
      const hasCriticalFunctionalGaps = (Array.isArray(assessment?.identifiedGaps) ? assessment.identifiedGaps : []).some(
        (g) => (g.category === GAP_CATEGORIES.FUNCTIONAL_CAPABILITY || g.gapClassification === 'FUNCTIONAL_GAP' || g.category === 'FUNCTIONAL_GAP') &&
               (g.severity === GAP_SEVERITIES.CRITICAL || g.severity === GAP_SEVERITIES.BLOCKER)
      );
      const hasMissingCapabilities = Boolean(functionalFit?.missingCapabilities && Array.isArray(functionalFit.missingCapabilities) && functionalFit.missingCapabilities.length > 0);
      const isConfigurationExplicitlyInsufficient = Boolean(
        assessment?.configurationInsufficient !== false && (
          hasCriticalFunctionalGaps ||
          assessment?.configurationInsufficient === true ||
          (hasMissingCapabilities && functionalFit?.status === DIMENSION_STATUSES.NO_FIT)
        )
      );
      if (!isConfigurationExplicitlyInsufficient) {
        missingCriteria.push('6. Evidence that configuration alone is insufficient (documented critical functional gap proving configuration cannot satisfy requirement)');
      }

      // Precondition 7: Evidence that Clean Core extension is insufficient
      // Must prove in-app Key User or Developer Extensibility BAdIs cannot bridge the gap on the standard app
      const isCleanCoreExtensionEvaluated = Boolean(
        assessment?.cleanCoreExtensionEvaluated !== false && (
          assessment?.overallStatus === ASSESSMENT_STATUSES.NO_FIT ||
          functionalFit?.status === DIMENSION_STATUSES.NO_FIT ||
          assessment?.cleanCoreExtensionEvaluated === true ||
          hasCriticalFunctionalGaps
        )
      );
      if (!isCleanCoreExtensionEvaluated) {
        missingCriteria.push('7. Evidence that Clean Core extension is insufficient (evaluation proving in-app adaptation or standard BAdIs cannot fulfill requirement)');
      }

      // Precondition 8: Documented unmet capability evidence
      const unmetCapabilities = (functionalFit?.missingCapabilities && Array.isArray(functionalFit.missingCapabilities))
        ? functionalFit.missingCapabilities.filter(c => typeof c === 'string' && c.trim().length > 0 && !/^(none|tbd|n\/a)$/i.test(c.trim()))
        : [];
      const criticalGapsList = (Array.isArray(assessment?.identifiedGaps) ? assessment.identifiedGaps : []).filter(
        g => g.severity === GAP_SEVERITIES.CRITICAL || g.severity === GAP_SEVERITIES.BLOCKER
      );
      const hasUnmetEvidence = unmetCapabilities.length > 0 || criticalGapsList.length > 0;
      if (!hasUnmetEvidence) {
        missingCriteria.push('8. Documented unmet capability evidence (actionable list of missing capabilities or critical gaps)');
      }

      // Precondition 9: High-confidence candidate metadata verification
      const candMetaComplete = Boolean(
        candidate?.productVersion ||
        candidate?.supportedCapabilities ||
        candidate?.capabilities ||
        candidate?.supportedProductRelease ||
        assessment?.matchingFioriApp?.releaseCompatibility
      );
      const isReleaseVerified = candidate?.releaseCompatibility !== 'PENDING_VERIFICATION' && candidate?.verificationStatus !== 'UNVERIFIED';
      const isNotStale = candidate?.isStale !== true && assessment?.candidateStale !== true;
      const isConfidenceAcceptable = assessment?.confidence !== 'LOW' && assessment?.confidence !== 'VERY_LOW';
      if (!candMetaComplete || !isReleaseVerified || !isNotStale || !isConfidenceAcceptable) {
        missingCriteria.push('9. High-confidence candidate metadata verification (complete, non-stale release and capability metadata without pending verification)');
      }

    } else {
      // ----------------------------------------------------------------------
      // PATH B: No Standard Candidate Exists (Custom Transaction / Zero Successor)
      // ----------------------------------------------------------------------

      // Extract recorded catalogue search evidence from multiple valid sources
      const catSearch = assessment?.catalogueSearch || context?.catalogueSearch || matchingResult?.searchRecord || discoveryResult?.catalogueSearch || null;

      const isSearchFailedOrIncomplete = Boolean(
        catSearch && (
          ['FAILED', 'INCOMPLETE', 'ERROR', 'TIMED_OUT'].includes(String(catSearch.searchCompletionStatus || catSearch.status).toUpperCase()) ||
          catSearch.failed === true ||
          catSearch.incomplete === true
        )
      );

      const hasOfficialSearchProvenance = Boolean(
        catSearch &&
        !isSearchFailedOrIncomplete &&
        (catSearch.searchExecutionId || catSearch.executionId) &&
        (catSearch.officialSourceId || catSearch.sourceId) &&
        (
          catSearch.searchCompletionStatus === 'COMPLETED_ZERO_MATCHES' ||
          (catSearch.resultCount === 0 && ['COMPLETED', 'COMPLETED_ZERO_MATCHES'].includes(String(catSearch.searchCompletionStatus || catSearch.status).toUpperCase()))
        ) &&
        (catSearch.targetRelease || catSearch.release || context?.targetSystem?.release || context?.systemRelease) &&
        (catSearch.query || catSearch.searchQuery || requirement?.tcode || assessment?.tcode) &&
        (catSearch.timestamp || catSearch.searchTimestamp || catSearch.executionTimestamp || assessment?.lastAssessed)
      );

      const isCatalogueSearchRecorded = !isSearchFailedOrIncomplete && (
        hasOfficialSearchProvenance ||
        Boolean(
          catSearch && (
            (catSearch.searchScope || catSearch.scope) &&
            (catSearch.targetRelease || catSearch.release || context?.targetSystem?.release || context?.systemRelease) &&
            (catSearch.query || catSearch.searchQuery || requirement?.tcode || assessment?.tcode) &&
            (catSearch.timestamp || catSearch.searchTimestamp || assessment?.lastAssessed)
          )
        ) ||
        Boolean(
          assessment?.assessmentResult === 'NO_VERIFIED_MATCH' &&
          assessment?.catalogueSearchVerified === true &&
          (assessment?.evidenceNotes?.some(n => /catalogue|fiori apps reference library/i.test(n)) || (Array.isArray(assessment?.missingEvidence) && assessment.missingEvidence.length === 0))
        )
      );

      // Precondition 2: Recorded catalogue search execution proving no standard successor
      if (!isCatalogueSearchRecorded) {
        missingCriteria.push('2. Catalogue search evidence from official catalogue (recorded search execution with official source ID, execution ID, scope, target release, query, COMPLETED_ZERO_MATCHES status, and timestamp proving zero standard successors)');
      }

      // Precondition 3: Evaluation of standard alternatives performed
      // Confirmed absence of standard apps, generic capabilities, companion applications, and WebGUI fallback
      const hasStandardAlternativesEvaluated = Boolean(
        assessment?.genericCapabilitiesEvaluated !== false &&
        catSearch?.genericCapabilitiesEvaluated !== false &&
        assessment?.companionAppsEvaluated !== false &&
        catSearch?.companionAppsEvaluated !== false &&
        assessment?.webGuiFallbackEvaluated !== false &&
        catSearch?.webGuiFallbackEvaluated !== false &&
        (
          assessment?.standardAlternativesEvaluated === true ||
          catSearch?.standardAlternativesEvaluated === true ||
          assessment?.assessmentResult === 'NO_VERIFIED_MATCH' ||
          assessment?.assessmentResult === 'CUSTOM_RAP_REQUIRED' ||
          assessment?.overallStatus === ASSESSMENT_STATUSES.NO_FIT ||
          catSearch?.noMatchFound === true ||
          (Array.isArray(matchingResult?.candidates) && matchingResult.candidates.length === 0)
        )
      );
      if (!hasStandardAlternativesEvaluated) {
        missingCriteria.push('3. Evaluation of available standard alternatives (documented evaluation of standard applications, generic capabilities, companion applications, and WebGUI fallback establishing complete absence of standard successors)');
      }

      // Precondition 4: Functional requirements and process scope documented
      const reqCapabilities = Array.isArray(requirement?.requiredCapabilities) ? requirement.requiredCapabilities : (Array.isArray(assessment?.requiredCapabilities) ? assessment.requiredCapabilities : []);
      const functionalDescription = String(requirement?.statement || requirement?.title || assessment?.description || '').trim();
      const hasFunctionalScopeDocumented = reqCapabilities.length > 0 || functionalDescription.length >= 10;
      if (!hasFunctionalScopeDocumented) {
        missingCriteria.push('4. Functional requirements and process scope documented (explicit capability statements for custom development)');
      }

      // Precondition 5: Technical feasibility analysis for custom development
      // Evaluates target system runtime support for RAP / OData V4 / CDS
      const targetRel = String(context?.targetSystem?.release || context?.systemRelease || assessment?.targetRelease || assessment?.release || '').toUpperCase();
      const isS4HanaOrCloud = /S\/4HANA|202\d|1909|CLOUD/i.test(targetRel) || context?.supportsRap === true || assessment?.supportsRap === true;
      if (!isS4HanaOrCloud) {
        missingCriteria.push('5. Technical feasibility analysis (target SAP landscape support for ABAP Cloud, RAP runtime, and OData V4)');
      }

      // Precondition 6: Evidence that configuration alone is insufficient
      // Requires documented evaluation of configuration options proving configuration/customizing cannot bridge the requirements
      const isConfigInsufficientProved = Boolean(
        assessment?.configurationEvaluated !== false &&
        catSearch?.configurationEvaluated !== false &&
        (
          assessment?.configurationInsufficient === true ||
          catSearch?.configurationInsufficient === true ||
          context?.configurationInsufficient === true ||
          (isCatalogueSearchRecorded && hasStandardAlternativesEvaluated && assessment?.configurationInsufficient !== false)
        )
      );
      if (!isConfigInsufficientProved) {
        missingCriteria.push('6. Evidence that configuration alone is insufficient (documented evaluation proving configuration and customizing cannot satisfy requirement)');
      }

      // Precondition 7: Evidence that Clean Core extension is insufficient
      // Requires documented evaluation of Clean Core in-app Key User adaptation and Developer BAdIs proving extension cannot bridge the requirements
      const isExtensionInsufficientProved = Boolean(
        assessment?.cleanCoreExtensionEvaluated !== false &&
        catSearch?.cleanCoreExtensionEvaluated !== false &&
        (
          assessment?.extensionAlternativesEvaluated === true ||
          assessment?.extensionInsufficient === true ||
          catSearch?.extensionInsufficient === true ||
          context?.cleanCoreExtensionInsufficient === true ||
          (hasStandardAlternativesEvaluated && assessment?.cleanCoreExtensionEvaluated !== false)
        )
      );
      if (!isExtensionInsufficientProved) {
        missingCriteria.push('7. Evidence that Clean Core extension is insufficient (documented evaluation proving in-app Key User adaptation and Developer BAdIs cannot bridge requirements)');
      }

      // Precondition 8: Documented unmet capability evidence
      // Must document custom business logic requirements not present in standard software
      const hasDocumentedCapabilities = (reqCapabilities.length > 0 && reqCapabilities.some(c => typeof c === 'string' && c.length > 2)) ||
        (Array.isArray(assessment?.identifiedGaps) && assessment.identifiedGaps.length > 0) ||
        (functionalDescription.length >= 15);
      if (!hasDocumentedCapabilities) {
        missingCriteria.push('8. Documented unmet capability evidence (actionable capability statements required for custom RAP object)');
      }

      // Precondition 9: High-confidence technical DDIC & repository metadata verification
      const isDdicVerified = Boolean(
        (assessment?.verificationStatus === 'VERIFIED' || assessment?.tcodeExistenceStatus === 'CONFIRMED_IN_S21') &&
        (assessment?.programName || context?.programName || requirement?.programName) &&
        (assessment?.packageName || context?.packageName || requirement?.packageName) &&
        assessment?.exists !== false
      );
      const isConfidenceAcceptable = assessment?.confidence !== 'LOW' && assessment?.confidence !== 'VERY_LOW';
      if (!isDdicVerified || !isConfidenceAcceptable) {
        missingCriteria.push('9. High-confidence candidate metadata verification (verified DDIC program, package, and repository metadata in target system without missing evidence)');
      }
    }

    return {
      path: hasStandardCandidate ? 'PATH_A_STANDARD_CANDIDATE' : 'PATH_B_NO_STANDARD_CANDIDATE',
      passed: missingCriteria.length === 0,
      missingCriteria
    };
  }

  _formulateSummary(outcome, candidate) {
    switch (outcome) {
      case RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE:
        return `Add and configure standard application ${candidate.appId} (${candidate.appName}) as verified modernization target.`;
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
    if (chosenOutcome !== RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE) {
      alternatives.push({
        outcome: RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE,
        rejectedReason: 'Standard application addition and configuration rejected due to unresolved critical gaps or absence of suitable standard Fiori applications.'
      });
    }
    if (chosenOutcome !== RECOMMENDATION_OUTCOMES.BUILD) {
      alternatives.push({
        outcome: RECOMMENDATION_OUTCOMES.BUILD,
        rejectedReason: 'Custom BUILD rejected to prioritize standard SAP software capabilities and adhere to Clean Core principles.'
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
    if (outcome === RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE) {
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
    if (outcome === RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE) {
      checklist.push('Validation of business role assignments and Launchpad configuration in target QA system.');
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
    if (outcome === RECOMMENDATION_OUTCOMES.ADD_AND_CONFIGURE && extensibilityStrategy?.tier && extensibilityStrategy.tier !== EXTENSIBILITY_TIERS.NONE) {
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
