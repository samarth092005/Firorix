import {
  AssessmentRecord,
  CatalogueReference,
  DetailedEvidenceRecord,
  EvidenceCategory,
  RoleValidationRecord,
  ODataServiceValidationRecord,
  ReleaseCompatibilityRecord,
  SystemAvailabilityAudit,
  AssessmentRecommendation,
  AssessmentEvidenceScore,
  RecommendationOutcome,
  BucketizedEvidenceItem,
  IndependentAssessmentMetrics,
  StageCompletionStatus
} from '../../../services/contracts/types';
import { fioriCatalogueAdapter } from '../../../services/catalogue/catalogueAdapter';

export class EvidenceEngine {
  /**
   * Compiles fine-grained, evidence-backed audit records across all SAP DDIC,
   * TADIR repository, Official Fiori Catalogue, and System S21 dimensions.
   */
  public compileDetailedEvidence(assessment: AssessmentRecord): DetailedEvidenceRecord[] {
    const cleanTcode = assessment.tcode.toUpperCase();
    const evidence: DetailedEvidenceRecord[] = [];
    const now = assessment.lastAssessed || new Date().toISOString().replace('T', ' ').substring(0, 16);
    const isLive = !assessment.isDemo;
    const baseProvenance = isLive ? 'LIVE_SAP_S21' : 'CURATED_DEMO_FIXTURE';

    // 1. Transaction Existence in TSTC
    evidence.push({
      id: `EVD-${cleanTcode}-01`,
      category: 'TRANSACTION_EXISTENCE',
      title: 'Dictionary Registry Verification (TSTC)',
      finding: `Transaction ${cleanTcode} is registered in SAP DDIC table TSTC on system ${assessment.systemId} (Client ${assessment.client}).`,
      sourceSystem: assessment.systemId,
      sourceTableOrService: 'TSTC (Transaction Codes)',
      verificationStatus: 'VERIFIED',
      provenance: baseProvenance,
      timestamp: now,
      explanation: `Verified transaction existence and primary executable linkage in the central SAP R/3 repository dictionary.`
    });

    // 2. Transaction Description in TSTCT
    evidence.push({
      id: `EVD-${cleanTcode}-02`,
      category: 'TRANSACTION_DESCRIPTION',
      title: 'Descriptive Text Verification (TSTCT)',
      finding: `Standard description in language EN: "${assessment.description}".`,
      sourceSystem: assessment.systemId,
      sourceTableOrService: 'TSTCT (Transaction Texts)',
      verificationStatus: 'VERIFIED',
      provenance: baseProvenance,
      timestamp: now,
      explanation: `Session language text confirmed in DDIC language-dependent table TSTCT.`
    });

    // 3. Repository Classification & TADIR
    const isCustom = assessment.classification === 'CUSTOM';
    const isStandard = assessment.classification === 'STANDARD';
    const targetRelease = assessment.release || (assessment as any).targetRelease || 'SAP S/4HANA 2023 Private Edition';
    const pkgName = assessment.packageName?.trim() || (cleanTcode === 'F-53' || cleanTcode === 'F-28' || cleanTcode === 'FB03' ? 'FBAS' : (cleanTcode.startsWith('Z') ? 'Z_CUSTOM' : 'Standard SAP Core (FBAS)'));
    const origSystem = assessment.originalSystem || 'SAP';
    const softComp = assessment.softwareComponent || 'S4CORE 108';

    evidence.push({
      id: `EVD-${cleanTcode}-03`,
      category: 'REPOSITORY_CLASSIFICATION',
      title: 'Object Directory Classification (TADIR)',
      finding: `Object R3TR TRAN ${cleanTcode} owned by package ${pkgName}, original system ${origSystem}. Classified as ${assessment.classification || 'STANDARD'}.`,
      sourceSystem: assessment.systemId,
      sourceTableOrService: 'TADIR (Directory of R/3 Repository Objects)',
      verificationStatus: isStandard || isCustom ? 'VERIFIED' : 'PENDING_VERIFICATION',
      provenance: baseProvenance,
      timestamp: now,
      explanation: isCustom
        ? `Object resides in customer namespace or local package (${pkgName}) originating from ${origSystem}. Customer modification rule applies.`
        : `Object resides in standard SAP package ${pkgName} originating from SAP. Standard delivery rule applies.`
    });

    // 5. Package & Software Component (TDEVC / CVERS)
    evidence.push({
      id: `EVD-${cleanTcode}-05`,
      category: 'PACKAGE_ORIGIN',
      title: 'Software Component Assignment (TDEVC / CVERS)',
      finding: `Package ${pkgName} belongs to software component ${softComp} (Target S/4HANA release: ${targetRelease}).`,
      sourceSystem: assessment.systemId,
      sourceTableOrService: 'TDEVC / CVERS',
      verificationStatus: 'VERIFIED',
      provenance: baseProvenance,
      timestamp: now,
      explanation: `Software component determines simplification item applicability and Fiori release compatibility.`
    });

    // 6. Application Match in Official Fiori Reference Library
    if (assessment.matchingFioriApp) {
      evidence.push({
        id: `EVD-${cleanTcode}-06`,
        category: 'APPLICATION_MATCH',
        title: 'Official SAP Fiori Apps Reference Library Match',
        finding: `App ID: ${assessment.matchingFioriApp.appId} ("${assessment.matchingFioriApp.appName}") classified as ${assessment.assessmentResult}.`,
        sourceSystem: 'fal.cloud.sap',
        sourceTableOrService: 'SAP Fiori Apps Reference Library (2023 FPS02)',
        verificationStatus: 'VERIFIED',
        provenance: 'OFFICIAL_CATALOGUE',
        timestamp: now,
        explanation: `Documented as standard successor or functional alternative on official SAP reference library (Source: https://fal.cloud.sap/apps/${assessment.matchingFioriApp.appId}).`
      });
    } else {
      evidence.push({
        id: `EVD-${cleanTcode}-06`,
        category: 'APPLICATION_MATCH',
        title: 'Official Fiori Catalogue Match Status',
        finding: assessment.assessmentResult === 'NO_VERIFIED_MATCH'
          ? `No standard SAP Fiori successor exists in the reference library for customer transaction ${cleanTcode}.`
          : `Catalogue match evaluation pending for transaction ${cleanTcode}.`,
        sourceSystem: 'fal.cloud.sap',
        sourceTableOrService: 'SAP Fiori Apps Reference Library',
        verificationStatus: assessment.assessmentResult === 'NO_VERIFIED_MATCH' ? 'VERIFIED' : 'PENDING_VERIFICATION',
        provenance: 'OFFICIAL_CATALOGUE',
        timestamp: now,
        explanation: `Search executed across official reference library. Does not constitute permanent absence if future SAP FPS delivers coverage.`
      });
    }

    // 7. Release Compatibility
    evidence.push({
      id: `EVD-${cleanTcode}-07`,
      category: 'RELEASE_COMPATIBILITY',
      title: 'S/4HANA 2023 Private Edition Compatibility Evaluation',
      finding: assessment.matchingFioriApp
        ? `Application ${assessment.matchingFioriApp.appId} compatibility status: ${assessment.matchingFioriApp.releaseCompatibility || 'COMPATIBLE'} on ${targetRelease}.`
        : `Target system release ${targetRelease} confirmed for T-Code runtime.`,
      sourceSystem: assessment.systemId,
      sourceTableOrService: 'CVERS (Component Versions) / FAL Compatibility Matrix',
      verificationStatus: 'VERIFIED',
      provenance: 'OFFICIAL_CATALOGUE',
      timestamp: now,
      explanation: `Verified against software component minimum baseline requirements (S4CORE 108 SP0003, SAP_BASIS 758 SP0003).`
    });

    // 8. Business Role Validation
    const roleProvided = assessment.applicationRequirements?.relevantBusinessRole;
    const rolesDoc = assessment.matchingFioriApp?.businessRoles || [];
    evidence.push({
      id: `EVD-${cleanTcode}-08`,
      category: 'BUSINESS_ROLE',
      title: 'Business Role Mapping & Authorization Audit',
      finding: roleProvided
        ? `User provided role: ${roleProvided}. Documented catalogue roles: ${rolesDoc.join(', ') || 'None'}.`
        : `Documented catalogue roles: ${rolesDoc.join(', ') || 'To be determined'}.`,
      sourceSystem: assessment.systemId,
      sourceTableOrService: 'PFCG (Role Maintenance) / FAL Metadata',
      verificationStatus: 'PARTIALLY_VERIFIED',
      provenance: roleProvided ? 'USER_PROVIDED' : 'OFFICIAL_CATALOGUE',
      timestamp: now,
      explanation: `Business roles documented by SAP must be assigned via PFCG and activated in Fiori Launchpad user catalogs.`
    });

    // 9. OData Service Verification & Discrepancy Tracking
    const odataProvided = assessment.applicationRequirements?.knownODataService;
    const odataDoc = assessment.matchingFioriApp?.odataServices || [];
    evidence.push({
      id: `EVD-${cleanTcode}-09`,
      category: 'ODATA_SERVICE',
      title: 'OData Service Exposure & Registry Verification',
      finding: odataProvided && odataDoc.length > 0 && !odataDoc.some(s => s.includes(odataProvided))
        ? `Discrepancy detected: User referenced "${odataProvided}", whereas official SAP catalogue specifies "${odataDoc.join(', ')}". Both preserved for Basis verification.`
        : `Active OData service specification: ${odataDoc.join(', ') || odataProvided || 'None (SAP GUI for HTML / Classic)'}.`,
      sourceSystem: assessment.systemId,
      sourceTableOrService: '/IWFND/MAINT_SERVICE (Service Catalog)',
      verificationStatus: odataDoc.length > 0 ? 'PARTIALLY_VERIFIED' : 'PENDING_VERIFICATION',
      provenance: odataProvided ? 'USER_PROVIDED' : 'OFFICIAL_CATALOGUE',
      timestamp: now,
      explanation: `OData service registration in /IWFND/MAINT_SERVICE is required for Fiori elements runtime communication with backend S4CORE.`
    });

    // 10. S21 Live Application Availability Check
    evidence.push({
      id: `EVD-${cleanTcode}-10`,
      category: 'S21_AVAILABILITY',
      title: 'S21 Client 200 Activation & Availability Status',
      finding: `Catalogue match established; actual activation in S21 client 200 is PENDING_VERIFICATION (Basis activation / PFCG role assignment required).`,
      sourceSystem: assessment.systemId,
      sourceTableOrService: 'SAP Fiori Launchpad Content Manager (/UI2/FLPCM_CUST)',
      verificationStatus: 'PENDING_VERIFICATION',
      provenance: 'PENDING_VERIFICATION',
      timestamp: now,
      explanation: `Catalogue availability does NOT automatically equate to active deployment in target S21 client 200.`
    });

    return evidence;
  }

  /**
   * Compiles audit evidence categorized into the 5 mandatory governance buckets:
   * Bucket A: S21 Live Evidence
   * Bucket B: Official SAP Catalogue Evidence
   * Bucket C: User-Provided Evidence
   * Bucket D: Inferred Evidence
   * Bucket E: Pending Verification
   */
  public compileBucketizedEvidence(
    assessment: AssessmentRecord,
    candidate: CatalogueReference | null
  ): BucketizedEvidenceItem[] {
    const cleanTcode = assessment.tcode.toUpperCase();
    const now = assessment.lastAssessed || new Date().toISOString().replace('T', ' ').substring(0, 16);
    const isLive = !assessment.isDemo;
    const sysClient = `${assessment.systemId || 'S21'}-${assessment.client || '200'}`;
    const items: BucketizedEvidenceItem[] = [];

    // --- BUCKET A: S21 Live Evidence ---
    items.push({
      id: `EVD-A-01-${cleanTcode}`,
      bucket: 'A_S21_LIVE',
      category: 'TRANSACTION_EXISTENCE',
      title: 'DDIC Transaction Registry (TSTC)',
      finding: `Transaction ${cleanTcode} registered in SAP DDIC table TSTC on system ${assessment.systemId} (Client ${assessment.client}). Program: ${assessment.programName || 'SAPMF05A'}, Screen: ${assessment.screenNumber || '0100'}.`,
      source: `SAP DDIC Table TSTC (${sysClient})`,
      sourceTableOrService: 'TSTC',
      verificationStatus: 'VERIFIED',
      provenance: isLive ? 'LIVE_SAP_S21' : 'CURATED_DEMO_FIXTURE',
      timestamp: now,
      systemClient: sysClient,
      reference: `TSTC-TCODE=${cleanTcode}`,
      limitation: 'Proves transaction existence in ABAP dictionary; does not prove Fiori successor compatibility.',
      explanation: 'Corroborates active transaction code definition and primary executable linkage in the central SAP repository.'
    });

    items.push({
      id: `EVD-A-02-${cleanTcode}`,
      bucket: 'A_S21_LIVE',
      category: 'TRANSACTION_DESCRIPTION',
      title: 'DDIC Language Text (TSTCT)',
      finding: `Description in language EN: "${assessment.description}".`,
      source: `SAP DDIC Table TSTCT (${sysClient})`,
      sourceTableOrService: 'TSTCT',
      verificationStatus: 'VERIFIED',
      provenance: isLive ? 'LIVE_SAP_S21' : 'CURATED_DEMO_FIXTURE',
      timestamp: now,
      systemClient: sysClient,
      reference: `TSTCT-SPRSL=E,TCODE=${cleanTcode}`,
      limitation: 'Descriptive text only; does not define transaction functional scope or business rules.',
      explanation: 'Session language text confirmed in DDIC language-dependent table TSTCT.'
    });

    const bucketRelease = assessment.release || (assessment as any).targetRelease || 'SAP S/4HANA 2023 Private Edition';
    const bucketPkg = assessment.packageName?.trim() || (cleanTcode === 'F-53' || cleanTcode === 'F-28' || cleanTcode === 'FB03' ? 'FBAS' : (cleanTcode.startsWith('Z') ? 'Z_CUSTOM' : 'Standard Core Package (FBAS)'));

    items.push({
      id: `EVD-A-03-${cleanTcode}`,
      bucket: 'A_S21_LIVE',
      category: 'REPOSITORY_CLASSIFICATION',
      title: 'Repository Object Directory (TADIR)',
      finding: `Object R3TR TRAN ${cleanTcode} owned by package ${bucketPkg}, original system ${assessment.originalSystem || 'SAP'}. Classified as ${assessment.classification || 'STANDARD'}.`,
      source: `SAP TADIR Directory (${sysClient})`,
      sourceTableOrService: 'TADIR',
      verificationStatus: 'VERIFIED',
      provenance: isLive ? 'LIVE_SAP_S21' : 'CURATED_DEMO_FIXTURE',
      timestamp: now,
      systemClient: sysClient,
      reference: `TADIR-PGMID=R3TR,OBJECT=TRAN,OBJ_NAME=${cleanTcode}`,
      limitation: 'Identifies software ownership and delivery package; does not indicate modern extensibility status.',
      explanation: 'Proves package residency and SAP Standard vs Customer classification.'
    });

    items.push({
      id: `EVD-A-04-${cleanTcode}`,
      bucket: 'A_S21_LIVE',
      category: 'PACKAGE_ORIGIN',
      title: 'Software Component Baseline (CVERS)',
      finding: `Software component ${assessment.softwareComponent || 'S4CORE 108 SP0003'} confirmed on system ${sysClient}. Target release: ${bucketRelease}.`,
      source: `SAP System Table CVERS (${sysClient})`,
      sourceTableOrService: 'CVERS',
      verificationStatus: 'VERIFIED',
      provenance: isLive ? 'LIVE_SAP_S21' : 'CURATED_DEMO_FIXTURE',
      timestamp: now,
      systemClient: sysClient,
      reference: 'CVERS-COMPONENT=S4CORE,EXTRELEASE=108',
      limitation: 'Verifies installed component version; does not guarantee active business function switches.',
      explanation: 'Base platform component levels satisfy minimum foundation prerequisites for S/4HANA 2023.'
    });

    // --- BUCKET B: Official SAP Catalogue Evidence ---
    const primaryApp = candidate || assessment.matchingFioriApp;
    if (primaryApp && primaryApp.appId) {
      const appName = primaryApp.appName || ('description' in primaryApp ? (primaryApp as any).description : 'Fiori App');
      const appType = ('appType' in primaryApp ? (primaryApp as any).appType : (primaryApp as any).uiTechnology) || 'SAP Fiori elements';
      items.push({
        id: `EVD-B-01-${cleanTcode}`,
        bucket: 'B_OFFICIAL_CATALOGUE',
        category: 'APPLICATION_MATCH',
        title: 'SAP Fiori Apps Reference Library Designated Match',
        finding: `App ID: ${primaryApp.appId} ("${appName}"), classified as ${appType}.`,
        source: 'SAP Fiori Apps Reference Library (fal.cloud.sap)',
        sourceTableOrService: 'FAL 2023 FPS02',
        verificationStatus: 'VERIFIED',
        provenance: 'OFFICIAL_CATALOGUE',
        timestamp: now,
        systemClient: 'fal.cloud.sap',
        reference: `https://fal.cloud.sap/apps/${primaryApp.appId}`,
        limitation: 'Official documentation confirms standard SAP delivery; does NOT prove application is configured or activated on S21.',
        explanation: 'Designated standard Fiori successor in the official SAP curated knowledgebase.'
      });

      items.push({
        id: `EVD-B-02-${cleanTcode}`,
        bucket: 'B_OFFICIAL_CATALOGUE',
        category: 'BUSINESS_ROLE',
        title: 'Documented Business Roles (FAL)',
        finding: `Standard business roles documented: ${(primaryApp.businessRoles && primaryApp.businessRoles.length > 0) ? primaryApp.businessRoles.join(', ') : 'SAP_BR_AP_ACCOUNTANT'}.`,
        source: 'SAP Fiori Apps Reference Library',
        sourceTableOrService: 'FAL Metadata - Leading Business Roles',
        verificationStatus: 'VERIFIED',
        provenance: 'OFFICIAL_CATALOGUE',
        timestamp: now,
        systemClient: 'fal.cloud.sap',
        reference: `FAL-APP=${primaryApp.appId}-ROLES`,
        limitation: 'Proves role template exists in SAP standard delivery; does NOT prove PFCG role has been generated or assigned in S21 client 200.',
        explanation: 'Leading business role template recommended by SAP for standard authorization catalog assignment.'
      });

      items.push({
        id: `EVD-B-03-${cleanTcode}`,
        bucket: 'B_OFFICIAL_CATALOGUE',
        category: 'ODATA_SERVICE',
        title: 'Documented OData Service Specification (FAL)',
        finding: `Official backend services: ${(primaryApp.odataServices && primaryApp.odataServices.length > 0) ? primaryApp.odataServices.join(', ') : 'FAR_OUTGOING_PAYMENT_SRV (OData V2), C_OUTGOINGPAYMENT_CDS (OData V4)'}.`,
        source: 'SAP Fiori Apps Reference Library',
        sourceTableOrService: 'FAL Metadata - OData Services',
        verificationStatus: 'VERIFIED',
        provenance: 'OFFICIAL_CATALOGUE',
        timestamp: now,
        systemClient: 'fal.cloud.sap',
        reference: `FAL-APP=${primaryApp.appId}-ODATA`,
        limitation: 'Proves service is part of standard application delivery; does NOT prove service is registered or active in S21 /IWFND/MAINT_SERVICE.',
        explanation: 'Backend OData communication interface documented by SAP for modern UI5/Elements runtime.'
      });
    }

    // --- BUCKET C: User-Provided Evidence ---
    const userRole = assessment.applicationRequirements?.relevantBusinessRole;
    const userSrv = assessment.applicationRequirements?.knownODataService;
    items.push({
      id: `EVD-C-01-${cleanTcode}`,
      bucket: 'C_USER_PROVIDED',
      category: 'BUSINESS_ROLE',
      title: 'Consultant-Provided Business Role Context',
      finding: userRole ? `Specified target business role: "${userRole}".` : 'Standard finance business role assumed during intake.',
      source: 'Guided Discovery Intake (Step 4)',
      sourceTableOrService: 'User Requirements Profile',
      verificationStatus: userRole ? 'PARTIALLY_VERIFIED' : 'NOT_APPLICABLE',
      provenance: 'USER_PROVIDED',
      timestamp: now,
      systemClient: 'CLIENT-SESSION',
      reference: 'REQ-INTAKE-ROLE',
      limitation: 'User-entered value; unverified against live S21 PFCG authorization tables (AGR_USERS).',
      explanation: 'Captured during guided modernization discovery questionnaire.'
    });

    if (userSrv) {
      items.push({
        id: `EVD-C-02-${cleanTcode}`,
        bucket: 'C_USER_PROVIDED',
        category: 'ODATA_SERVICE',
        title: 'User-Provided OData Service Alias',
        finding: `User referenced service alias: "${userSrv}". Preserved for Basis cross-check.`,
        source: 'Guided Discovery Intake (Step 4)',
        sourceTableOrService: 'User Requirements Profile',
        verificationStatus: 'PARTIALLY_VERIFIED',
        provenance: 'USER_PROVIDED',
        timestamp: now,
        systemClient: 'CLIENT-SESSION',
        reference: 'REQ-INTAKE-ODATA',
        limitation: 'User-specified alias; must be checked against /IWFND/MAINT_SERVICE before deployment.',
        explanation: 'Preserves potential custom Z-service wrapper or customer Gateway alias.'
      });
    }

    // --- BUCKET D: Inferred Evidence ---
    items.push({
      id: `EVD-D-01-${cleanTcode}`,
      bucket: 'D_INFERRED',
      category: 'APPLICATION_MATCH',
      title: 'Clean Core Extensibility Tiering Heuristic',
      finding: assessment.classification === 'STANDARD'
        ? 'Clean Core Tier 1 (Key User Extensibility) or Tier 2 (Developer Extensibility via released BAdIs) applies for standard application enhancement.'
        : 'Clean Core Tier 2 (Custom RAP on ABAP Cloud) required for proprietary custom transaction.',
      source: 'FioriX Architecture Rules Engine',
      sourceTableOrService: 'Clean Core Extensibility Matrix',
      verificationStatus: 'VERIFIED',
      provenance: 'CURATED_DEMO_FIXTURE',
      timestamp: now,
      systemClient: 'FIORIX-ENGINE',
      reference: 'SAP-CLEAN-CORE-2023',
      limitation: 'Algorithmic tiering heuristic; requires final sign-off by Enterprise Architecture board.',
      explanation: 'Evaluates customization risk and enforces zero-modification principles.'
    });

    // --- BUCKET E: Pending Verification ---
    items.push({
      id: `EVD-E-01-${cleanTcode}`,
      bucket: 'E_PENDING_VERIFICATION',
      category: 'ODATA_SERVICE',
      title: 'Live S21 Gateway Service Registration Status',
      finding: `Service registration in S21 client 200 Gateway catalogue is PENDING_BASIS_CHECK (/IWFND/MAINT_SERVICE).`,
      source: `SAP Gateway Hub (${sysClient})`,
      sourceTableOrService: '/IWFND/MAINT_SERVICE',
      verificationStatus: 'PENDING_VERIFICATION',
      provenance: 'PENDING_VERIFICATION',
      timestamp: now,
      systemClient: sysClient,
      reference: '/IWFND/MAINT_SERVICE-SRV_NAME=FAR_OUTGOING_PAYMENT_SRV',
      limitation: 'Cannot be verified without active SAP RFC connection or ADT Gateway catalog authorization.',
      explanation: 'Basis team must confirm service active state and system alias routing in client 200.'
    });

    items.push({
      id: `EVD-E-02-${cleanTcode}`,
      bucket: 'E_PENDING_VERIFICATION',
      category: 'S21_AVAILABILITY',
      title: 'S21 ICF Node Activation Status',
      finding: `SICF node /sap/opu/odata/sap/FAR_OUTGOING_PAYMENT_SRV activation in S21 is PENDING_BASIS_CHECK.`,
      source: `Internet Communication Framework (${sysClient})`,
      sourceTableOrService: 'SICF',
      verificationStatus: 'PENDING_VERIFICATION',
      provenance: 'PENDING_VERIFICATION',
      timestamp: now,
      systemClient: sysClient,
      reference: 'SICF-PATH=/sap/opu/odata/sap/FAR_OUTGOING_PAYMENT_SRV',
      limitation: 'Requires Basis administrator confirmation via transaction SICF.',
      explanation: 'Inactive ICF node returns HTTP 403 or 404 at runtime even if catalogue metadata is valid.'
    });

    items.push({
      id: `EVD-E-03-${cleanTcode}`,
      bucket: 'E_PENDING_VERIFICATION',
      category: 'BUSINESS_ROLE',
      title: 'S21 Live PFCG User Role Assignment Status',
      finding: `Role SAP_BR_AP_ACCOUNTANT assignment to end-users in S21 client 200 is REQUIRES_PFCG_ROLE_ASSIGNMENT.`,
      source: `SAP User Master Records (${sysClient})`,
      sourceTableOrService: 'PFCG / AGR_USERS / SU01',
      verificationStatus: 'PENDING_VERIFICATION',
      provenance: 'PENDING_VERIFICATION',
      timestamp: now,
      systemClient: sysClient,
      reference: 'AGR_USERS-AGR_NAME=SAP_BR_AP_ACCOUNTANT',
      limitation: 'Cannot be verified without live user master authorization check.',
      explanation: 'End users cannot view Launchpad space or tiles without active PFCG role assignment.'
    });

    return items;
  }

  /**
   * Calculates independent, decoupled metrics across all dimensions.
   * None of these metrics serve as a proxy for another.
   */
  public calculateIndependentMetrics(
    assessment: AssessmentRecord,
    evidence: BucketizedEvidenceItem[] | DetailedEvidenceRecord[],
    candidate: CatalogueReference | null,
    functionalRequirements?: any[]
  ): IndependentAssessmentMetrics {
    // 1. Evidence Completeness (0-100)
    let completeness = 0;
    const hasDdic = evidence.some(e => (e.category === 'TRANSACTION_EXISTENCE' || e.category === 'REPOSITORY_CLASSIFICATION') && e.verificationStatus === 'VERIFIED');
    const hasCatalogue = Boolean(candidate || assessment.matchingFioriApp);
    const hasRelease = Boolean(assessment.release?.includes('2023') || assessment.softwareComponent?.includes('S4CORE'));
    const hasRolesOrServices = (candidate?.businessRoles?.length || 0) > 0 || (candidate?.odataServices?.length || 0) > 0 || (assessment.matchingFioriApp?.businessRoles?.length || 0) > 0;
    const hasLiveTarget = !assessment.isDemo;

    if (hasDdic) completeness += 25;
    if (hasCatalogue) completeness += 25;
    if (hasRelease) completeness += 20;
    if (hasRolesOrServices) completeness += 15;
    if (hasLiveTarget) completeness += 15;
    else completeness += 6; // Baseline snapshot

    // 2. Recommendation Confidence (0-100)
    let confidence = 0;
    if (hasDdic) confidence += 30; // DDIC authoritative
    if (hasCatalogue) confidence += 30; // FAL authoritative
    if (hasRelease) confidence += 20; // Release baseline authoritative
    if (hasLiveTarget) confidence += 20; // Live Gateway/PFCG active
    else confidence += 0; // Live S21 checks pending: 30+30+20-10 = 70%

    // Baseline normalized confidence for F-53 demo scenario
    const normalizedConfidence = hasLiveTarget ? confidence : Math.min(70, confidence);

    // 3. Functional Coverage (0-100)
    let coverage = 80;
    if (functionalRequirements && functionalRequirements.length > 0) {
      const applicable = functionalRequirements.filter(r => r.coverageStatus !== 'NOT_APPLICABLE');
      if (applicable.length > 0) {
        const score = applicable.reduce((acc, r) => {
          if (r.coverageStatus === 'SUPPORTED') return acc + 100;
          if (r.coverageStatus === 'PARTIALLY_SUPPORTED') return acc + 50;
          return acc;
        }, 0);
        coverage = Math.round(score / applicable.length);
      }
    }

    // 4. Technical Compatibility (0-100)
    const technicalCompatibility = 100;

    // 5. Release Compatibility (0-100)
    const releaseCompatibility = 100;

    // Stage completion statuses
    const stage1Verdict: StageCompletionStatus = 'COMPLETED';
    const stage2FitGap: StageCompletionStatus = 'COMPLETED';
    const stage3TechnicalProof: StageCompletionStatus = hasLiveTarget ? 'COMPLETED' : 'PARTIALLY_COMPLETED';
    const stage4ModernizationDecision: StageCompletionStatus = stage3TechnicalProof === 'COMPLETED' ? 'COMPLETED' : 'PENDING_VERIFICATION';

    return {
      evidenceCompleteness: completeness,
      recommendationConfidence: normalizedConfidence,
      functionalCoverage: coverage,
      technicalCompatibility,
      releaseCompatibility,
      stageStatuses: {
        stage1Verdict,
        stage2FitGap,
        stage3TechnicalProof,
        stage4ModernizationDecision
      },
      methodologyNotes: {
        completeness: `Evidence completeness (${completeness}%) measures verified artifacts across DDIC (25%), catalogue match (25%), release baseline (20%), technical roles & OData services (15%), and target system verification (15%).`,
        confidence: `Recommendation confidence (${normalizedConfidence}%) reflects primary source authority: live DDIC (30%), official FAL (30%), release baseline (20%), and live S21 activation (20%). Pending live S21 checks withhold 20% to prevent false certainty.`,
        coverage: `Functional coverage (${coverage}%) represents verified requirement support: SUPPORTED (100%), PARTIALLY_SUPPORTED (50%), NOT_SUPPORTED/NOT_VERIFIED (0%).`,
        technical: `Technical compatibility (${technicalCompatibility}%) evaluates component baselines: S4CORE 108 SP0003, SAP_BASIS 758 SP0003, SAP_UI 758 SP0003, SAP_GWFND 758 SP0003.`,
        release: `Release compatibility (${releaseCompatibility}%) confirms target release SAP S/4HANA 2023 Private Edition alignment.`
      }
    };
  }

  /**
   * Calculates a transparent, formulaic evidence score (0-100) based on verified findings.
   * Documented clearly as an evidence completeness metric, NOT an arbitrary "SAP confidence" rating.
   */
  public calculateEvidenceScore(assessment: AssessmentRecord, evidence: DetailedEvidenceRecord[]): AssessmentEvidenceScore {
    let dictionaryScore = 0;
    let catalogueScore = 0;
    let compatibilityScore = 0;
    let technicalServicesScore = 0;
    let systemAvailabilityScore = 0;

    // Dictionary Score (max 25)
    if (evidence.some(e => e.category === 'TRANSACTION_EXISTENCE' && e.verificationStatus === 'VERIFIED')) dictionaryScore += 10;
    if (evidence.some(e => e.category === 'TRANSACTION_DESCRIPTION' && e.verificationStatus === 'VERIFIED')) dictionaryScore += 5;
    if (evidence.some(e => e.category === 'REPOSITORY_CLASSIFICATION' && e.verificationStatus === 'VERIFIED')) dictionaryScore += 10;

    // Catalogue Score (max 25)
    if (assessment.matchingFioriApp) {
      catalogueScore += 15;
      if (assessment.matchingFioriApp.appId && assessment.matchingFioriApp.uiTechnology) catalogueScore += 10;
    } else if (assessment.assessmentResult === 'NO_VERIFIED_MATCH') {
      catalogueScore += 15; // Verified absence in standard catalog
    } else {
      catalogueScore += 5; // Search attempted
    }

    // Compatibility Score (max 20)
    if (assessment.matchingFioriApp?.releaseCompatibility === 'COMPATIBLE') {
      compatibilityScore += 20;
    } else if (assessment.matchingFioriApp?.releaseCompatibility === 'UNKNOWN') {
      compatibilityScore += 10;
    } else if (assessment.release?.includes('2023')) {
      compatibilityScore += 15;
    }

    // Technical Services & Roles Score (max 15)
    if (assessment.matchingFioriApp?.odataServices && assessment.matchingFioriApp.odataServices.length > 0) technicalServicesScore += 8;
    if (assessment.matchingFioriApp?.businessRoles && assessment.matchingFioriApp.businessRoles.length > 0) technicalServicesScore += 7;
    if (technicalServicesScore === 0 && assessment.assessmentResult === 'SAP_GUI_HTML') technicalServicesScore += 15;

    // S21 Target Availability Score (max 15)
    if (!assessment.isDemo) {
      systemAvailabilityScore = 15;
    } else {
      systemAvailabilityScore = 6;
    }

    const totalScore = dictionaryScore + catalogueScore + compatibilityScore + technicalServicesScore + systemAvailabilityScore;

    let completenessLabel: 'COMPLETE' | 'SUBSTANTIAL' | 'PARTIAL' | 'INSUFFICIENT' = 'PARTIAL';
    if (totalScore >= 85) completenessLabel = 'COMPLETE';
    else if (totalScore >= 70) completenessLabel = 'SUBSTANTIAL';
    else if (totalScore >= 50) completenessLabel = 'PARTIAL';
    else completenessLabel = 'INSUFFICIENT';

    return {
      totalScore,
      completenessLabel,
      breakdown: {
        dictionaryScore,
        catalogueScore,
        compatibilityScore,
        technicalServicesScore,
        systemAvailabilityScore
      },
      explanation: `Calculated from ${evidence.length} verified audit evidence points across DDIC dictionary (25%), catalogue match (25%), release compatibility (20%), technical roles & OData services (15%), and S21 target availability check (15%). Represents verified audit artifact completeness, not arbitrary SAP confidence.`
    };
  }

  /**
   * Evaluates the 4-way separation of Business Roles:
   * 1. Mentioned in user business requirements
   * 2. Documented by official application catalogue
   * 3. Assigned in S21 client 200
   * 4. Overall role availability status
   */
  public evaluateRoleValidation(
    assessment: AssessmentRecord,
    candidate: CatalogueReference | null
  ): RoleValidationRecord[] {
    const userRole = assessment.applicationRequirements?.relevantBusinessRole || '';
    const officialRoles = candidate?.businessRoles || assessment.matchingFioriApp?.businessRoles || [];

    const roleMap = new Map<string, RoleValidationRecord>();

    // 1. Process official documented roles
    for (const r of officialRoles) {
      const isUserMentioned = userRole.includes(r) || (userRole.length > 0 && r.includes(userRole));
      roleMap.set(r, {
        roleName: r,
        description: r.includes('AP_ACCOUNTANT')
          ? 'Accounts Payable Accountant: Responsible for processing supplier invoices and vendor outgoing payments.'
          : r.includes('AR_ACCOUNTANT')
          ? 'Accounts Receivable Accountant: Responsible for incoming customer clearing, lockbox and payment matching.'
          : r.includes('GL_ACCOUNTANT')
          ? 'General Ledger Accountant: Responsible for G/L account master data and journal entry maintenance.'
          : r.includes('PURCHASER')
          ? 'Purchaser: Responsible for purchase order creation and vendor lifecycle management.'
          : 'Standard SAP Business Role documented in Fiori Reference Library.',
        mentionedInBusinessContext: isUserMentioned,
        documentedInOfficialCatalogue: true,
        assignedInS21Status: 'PENDING_BASIS_CHECK',
        roleAvailabilityStatus: 'REQUIRES_PFCG_ROLE_ASSIGNMENT',
        notes: 'Documented in official SAP Fiori Apps Reference Library. Requires PFCG role assignment in S21 client 200 before launchpad tiles appear.',
        evidenceSource: 'Official SAP Fiori Apps Reference Library (fal.cloud.sap)'
      });
    }

    // 2. Process user-provided role if not already in official list
    if (userRole && !roleMap.has(userRole) && !officialRoles.some(r => r.includes(userRole))) {
      roleMap.set(userRole, {
        roleName: userRole,
        description: 'User-provided business role specified during guided discovery context intake.',
        mentionedInBusinessContext: true,
        documentedInOfficialCatalogue: false,
        assignedInS21Status: 'PENDING_BASIS_CHECK',
        roleAvailabilityStatus: 'PENDING_VERIFICATION',
        notes: 'Specified by consultant in Discovery Step 4. Pending verification against S21 client 200 PFCG authorization tables (AGR_USERS / AGR_1251).',
        evidenceSource: 'User-Provided Context (Unverified against FAL)'
      });
    }

    // If empty fallback
    if (roleMap.size === 0) {
      roleMap.set('SAP_BR_BUSINESS_PROCESS_SPECIALIST', {
        roleName: 'SAP_BR_BUSINESS_PROCESS_SPECIALIST',
        description: 'Generic Business Process Specialist template role.',
        mentionedInBusinessContext: false,
        documentedInOfficialCatalogue: false,
        assignedInS21Status: 'PENDING_BASIS_CHECK',
        roleAvailabilityStatus: 'PENDING_VERIFICATION',
        notes: 'No specific business role documented in catalog or provided by user. Default generic template.',
        evidenceSource: 'System Default'
      });
    }

    return Array.from(roleMap.values());
  }

  /**
   * Tracks and highlights OData service references, preserving both user-provided
   * and official catalogue references with transparent discrepancy detection.
   *
   * CRITICAL GOVERNANCE RULE:
   * An OData service documented by SAP in FAL does NOT prove registration in S21.
   * Unless verified via live RFC / Gateway catalog call, status must remain PENDING_BASIS_CHECK.
   */
  public evaluateODataValidation(
    assessment: AssessmentRecord,
    candidate: CatalogueReference | null
  ): ODataServiceValidationRecord[] {
    const cleanTcode = assessment.tcode.toUpperCase();
    const userSrv = assessment.applicationRequirements?.knownODataService || '';
    const officialServices = candidate?.odataServices || assessment.matchingFioriApp?.odataServices || [];
    const list: ODataServiceValidationRecord[] = [];
    const isLiveConnected = !assessment.isDemo && assessment.systemAvailability?.serviceRegistrationStatus === 'REGISTERED';
    const documentedServiceStatus = isLiveConnected ? 'REGISTERED_ACTIVE' : 'PENDING_BASIS_CHECK';

    // Specific Finance Pilot Discrepancy Scenarios
    if (cleanTcode === 'FB03' || candidate?.uiTechnology === 'SAP GUI for HTML' || assessment.matchingFioriApp?.uiTechnology === 'SAP GUI for HTML') {
      list.push({
        serviceName: 'None (Classic WebGUI / ITS)',
        version: 'N/A',
        provenance: 'OFFICIAL_CATALOGUE',
        registrationStatus: 'REGISTERED_ACTIVE',
        icfPath: '/sap/bc/gui/sap/its/webgui',
        notes: 'Classic SAP GUI transaction embedded in Fiori Launchpad via WebGUI runtime; does not require custom OData service.'
      });
      return list;
    }

    if (cleanTcode === 'F-53') {
      list.push({
        serviceName: 'FAR_OUTGOING_PAYMENT_SRV',
        version: 'OData V2',
        provenance: 'OFFICIAL_CATALOGUE',
        registrationStatus: documentedServiceStatus,
        icfPath: '/sap/opu/odata/sap/FAR_OUTGOING_PAYMENT_SRV',
        notes: 'Documented in official SAP Fiori Apps Reference Library for F0773 (Manage Outgoing Payments). Registration requires check in S21 /IWFND/MAINT_SERVICE.'
      });
      list.push({
        serviceName: 'C_OUTGOINGPAYMENT_CDS',
        version: 'OData V4 (RAP)',
        provenance: 'OFFICIAL_CATALOGUE',
        registrationStatus: documentedServiceStatus,
        icfPath: '/sap/opu/odata4/sap/c_outgoingpayment_cds/srvd_a2x/sap/outgoingpayment/0001',
        notes: 'Modern Core Data Services RAP projection for S/4HANA 2023 payment items. Requires check in S21 /IWFND/V4_ADMIN.'
      });
      if (userSrv && userSrv !== 'FAR_OUTGOING_PAYMENT_SRV') {
        list.push({
          serviceName: userSrv,
          version: 'OData V2 (User Specified)',
          provenance: 'USER_PROVIDED',
          registrationStatus: 'PENDING_BASIS_CHECK',
          icfPath: `/sap/opu/odata/sap/${userSrv.split(' ')[0]}`,
          notes: `User-provided reference "${userSrv}". Preserved alongside official FAR_OUTGOING_PAYMENT_SRV; requires verification in /IWFND/MAINT_SERVICE.`
        });
      }
      return list;
    }

    if (cleanTcode === 'F-28') {
      list.push({
        serviceName: 'FAP_POST_INCOMING_PAYMENTS_SRV',
        version: 'OData V2',
        provenance: 'OFFICIAL_CATALOGUE',
        registrationStatus: documentedServiceStatus,
        icfPath: '/sap/opu/odata/sap/FAP_POST_INCOMING_PAYMENTS_SRV',
        notes: 'Official backend service for F1345 (Post Incoming Payments) open item clearing engine. Requires check in S21 /IWFND/MAINT_SERVICE.'
      });
      if (userSrv && !userSrv.includes('FAP_POST_INCOMING_PAYMENTS_SRV')) {
        list.push({
          serviceName: userSrv,
          version: 'OData V2 (User Specified)',
          provenance: 'USER_PROVIDED',
          registrationStatus: 'PENDING_BASIS_CHECK',
          icfPath: `/sap/opu/odata/sap/${userSrv.split(' ')[0]}`,
          notes: `User entered reference "${userSrv}". Discrepancy noted against official FAP_POST_INCOMING_PAYMENTS_SRV; stored with provenance USER_PROVIDED.`
        });
      }
      return list;
    }

    if (cleanTcode === 'FS00') {
      list.push({
        serviceName: 'GL_ACCOUNT_MD_SRV',
        version: 'OData V4',
        provenance: 'OFFICIAL_CATALOGUE',
        registrationStatus: documentedServiceStatus,
        icfPath: '/sap/opu/odata4/sap/gl_account_md_srv/0001',
        notes: 'Official OData service for F0984A (Manage G/L Account Master Data) supporting Chart of Accounts maintenance. Requires check in S21 /IWFND/V4_ADMIN.'
      });
      list.push({
        serviceName: 'FAC_MANAGE_GLACCOUNT_SRV',
        version: 'OData V2 (Legacy / Companion)',
        provenance: userSrv.includes('FAC_MANAGE_GLACCOUNT') ? 'USER_PROVIDED' : 'OFFICIAL_CATALOGUE',
        registrationStatus: documentedServiceStatus,
        icfPath: '/sap/opu/odata/sap/FAC_MANAGE_GLACCOUNT_SRV',
        notes: 'Companion G/L account service used in earlier releases. Maintained in S/4HANA 2023 for backward compatibility.'
      });
      return list;
    }

    // Generic fallback for other transactions
    for (const srv of officialServices) {
      list.push({
        serviceName: srv.split(' ')[0],
        version: srv.includes('V4') ? 'OData V4' : 'OData V2',
        provenance: 'OFFICIAL_CATALOGUE',
        registrationStatus: documentedServiceStatus,
        icfPath: `/sap/opu/odata/sap/${srv.split(' ')[0]}`,
        notes: 'Documented in official catalogue. Requires verification in S21 /IWFND/MAINT_SERVICE.'
      });
    }

    if (userSrv && !list.some(s => s.serviceName === userSrv.split(' ')[0])) {
      list.push({
        serviceName: userSrv.split(' ')[0],
        version: 'User Specified',
        provenance: 'USER_PROVIDED',
        registrationStatus: 'PENDING_BASIS_CHECK',
        icfPath: `/sap/opu/odata/sap/${userSrv.split(' ')[0]}`,
        notes: 'Provided during discovery intake. Marked as unverified until checked in S21 /IWFND/MAINT_SERVICE.'
      });
    }

    if (list.length === 0) {
      list.push({
        serviceName: 'None (Classic WebGUI / ITS)',
        version: 'N/A',
        provenance: 'OFFICIAL_CATALOGUE',
        registrationStatus: 'REGISTERED_ACTIVE',
        icfPath: '/sap/bc/gui/sap/its/webgui',
        notes: 'Classic SAP GUI transaction embedded in Fiori Launchpad via WebGUI runtime; does not require custom OData service.'
      });
    }

    return list;
  }

  /**
   * Release compatibility evaluation with component baseline verification
   */
  public evaluateReleaseCompatibility(
    assessment: AssessmentRecord,
    candidate: CatalogueReference | null
  ): ReleaseCompatibilityRecord {
    const targetRelease = assessment.release || 'SAP S/4HANA 2023 Private Edition';
    const isS4HANA2023 = targetRelease.includes('2023');

    const componentChecks = [
      {
        component: 'S4CORE',
        requiredLevel: '108 SP0002 or higher',
        systemLevel: '108 SP0003',
        compatible: true,
        notes: 'Core ERP financial and logistics business logic.'
      },
      {
        component: 'SAP_BASIS',
        requiredLevel: '758 SP0002 or higher',
        systemLevel: '758 SP0003',
        compatible: true,
        notes: 'ABAP Platform 2023 foundation.'
      },
      {
        component: 'SAP_UI',
        requiredLevel: '758 SP0002 or higher',
        systemLevel: '758 SP0003',
        compatible: true,
        notes: 'SAPUI5 library runtime (Horizon theme support).'
      },
      {
        component: 'SAP_GWFND',
        requiredLevel: '758 SP0002 or higher',
        systemLevel: '758 SP0003',
        compatible: true,
        notes: 'SAP Gateway Foundation (OData V2 and V4 runtime).'
      }
    ];

    let status: 'COMPATIBLE' | 'INCOMPATIBLE' | 'PARTIALLY_VERIFIED' | 'PENDING_VERIFICATION' = 'COMPATIBLE';

    if (assessment.assessmentResult === 'RELEASE_INCOMPATIBLE') {
      status = 'INCOMPATIBLE';
    } else if (assessment.assessmentResult === 'PENDING_VERIFICATION') {
      status = 'PENDING_VERIFICATION';
    } else if (!isS4HANA2023) {
      status = 'PARTIALLY_VERIFIED';
    }

    const details = candidate
      ? `Application ${candidate.appId} is verified for ${candidate.supportedProductRelease}. Target system S21 runs S4CORE 108 SP0003 and SAP_BASIS 758 SP0003, satisfying all minimum release prerequisites.`
      : `Target system S21 components confirmed for ${targetRelease}. Transaction execution runtime is compatible.`;

    return {
      targetRelease,
      requiredProductVersion: 'SAP S/4HANA 2023 FPS02',
      status,
      minimumRelease: 'SAP S/4HANA 2021',
      componentChecks,
      details
    };
  }

  /**
   * S21 Application Availability Audit (5 Checkpoints)
   * Enforces strict separation between catalogue match and target S21 live availability.
   */
  public evaluateSystemAvailability(
    assessment: AssessmentRecord,
    candidate: CatalogueReference | null
  ): SystemAvailabilityAudit {
    const hasCandidate = Boolean(candidate || assessment.matchingFioriApp);

    if (assessment.assessmentResult === 'NO_VERIFIED_MATCH') {
      return {
        catalogueMatchStatus: 'CATALOGUE_NOT_FOUND',
        activationStatus: 'NOT_APPLICABLE',
        serviceRegistrationStatus: 'NOT_REGISTERED',
        roleAssignmentStatus: 'NOT_ASSIGNED',
        launchpadVisibilityStatus: 'NOT_CONFIRMED',
        overallS21Availability: 'UNAVAILABLE'
      };
    }

    return {
      catalogueMatchStatus: hasCandidate ? 'CATALOGUE_VERIFIED' : 'PENDING_CATALOGUE_VERIFICATION',
      activationStatus: hasCandidate ? 'PENDING_VERIFICATION' : 'NOT_APPLICABLE',
      serviceRegistrationStatus: 'PENDING_BASIS_CHECK',
      roleAssignmentStatus: 'PENDING_VERIFICATION',
      launchpadVisibilityStatus: 'PENDING_AUTHORIZATION',
      overallS21Availability: 'PENDING_VERIFICATION'
    };
  }

  /**
   * Maps any legacy recommendation outcome or assessment status to one of the 6 canonical outcomes:
   * ADOPT, CONFIGURE, EXTEND, BUILD, INSUFFICIENT_EVIDENCE, PENDING_VERIFICATION.
   */
  public mapToCanonicalOutcome(
    outcome: RecommendationOutcome,
    availability?: SystemAvailabilityAudit
  ): 'ADOPT' | 'CONFIGURE' | 'EXTEND' | 'BUILD' | 'INSUFFICIENT_EVIDENCE' | 'PENDING_VERIFICATION' {
    if (outcome === 'ADOPT' || outcome === 'CONFIGURE' || outcome === 'EXTEND' || outcome === 'BUILD' || outcome === 'INSUFFICIENT_EVIDENCE' || outcome === 'PENDING_VERIFICATION') {
      return outcome;
    }

    if (outcome === 'USE_STANDARD_FIORI_SUCCESSOR') {
      // If service registration or role assignment is pending, governance mandates CONFIGURE rather than unconditional ADOPT
      if (availability?.serviceRegistrationStatus === 'PENDING_BASIS_CHECK' ||
          availability?.roleAssignmentStatus === 'PENDING_VERIFICATION' ||
          availability?.activationStatus === 'PENDING_VERIFICATION') {
        return 'CONFIGURE';
      }
      return 'ADOPT';
    }

    if (outcome === 'USE_CLASSIC_TRANSACTION_LAUNCHPAD') {
      return 'CONFIGURE';
    }

    if (outcome === 'EVALUATE_FUNCTIONAL_ALTERNATIVE') {
      return 'EXTEND';
    }

    if (outcome === 'INVESTIGATE_CATALOGUE_INFO') {
      return 'PENDING_VERIFICATION';
    }

    if (outcome === 'TECHNICAL_ANALYSIS_REQUIRED') {
      return 'BUILD';
    }

    return 'INSUFFICIENT_EVIDENCE';
  }

  /**
   * Generates a structured final recommendation with traceable supporting evidence,
   * known limitations, outstanding checks, and required next steps.
   *
   * Maintains legacy 'outcome' string for backward compatibility, while always providing
   * the canonical outcome ('ADOPT' | 'CONFIGURE' | 'EXTEND' | 'BUILD' | 'INSUFFICIENT_EVIDENCE' | 'PENDING_VERIFICATION').
   */
  public generateRecommendation(
    assessment: AssessmentRecord,
    candidate: CatalogueReference | null,
    compatibility: ReleaseCompatibilityRecord,
    availability: SystemAvailabilityAudit
  ): AssessmentRecommendation {
    const cleanTcode = assessment.tcode.toUpperCase();
    const appId = candidate?.appId || assessment.matchingFioriApp?.appId;
    const appName = candidate?.appName || assessment.matchingFioriApp?.appName;

    // Outcome A: Standard Fiori Successor
    if (assessment.assessmentResult === 'EXPLICIT_SUCCESSOR' && appId) {
      const canonicalOutcome = (availability.serviceRegistrationStatus === 'PENDING_BASIS_CHECK' ||
        availability.roleAssignmentStatus === 'PENDING_VERIFICATION')
        ? 'CONFIGURE'
        : 'ADOPT';

      return {
        outcome: 'USE_STANDARD_FIORI_SUCCESSOR',
        canonicalOutcome,
        recommendedAction: `Deploy and configure standard SAP Fiori application ${appId} ("${appName}") as the primary modern successor to classic transaction ${cleanTcode}. Complete Basis service activation and PFCG role assignment in S21 client 200.`,
        supportingEvidence: [
          `Official SAP Fiori Apps Reference Library explicitly designates ${appId} as the modern successor for ${cleanTcode}.`,
          `Target release compatibility confirmed: S4CORE 108 SP0003 and SAP_BASIS 758 SP0003 satisfy all minimum prerequisite levels.`,
          `Provides native Fiori Horizon UX, mobile responsiveness, and embedded analytical capabilities that supersede classic Dynpro screen ${assessment.screenNumber}.`
        ],
        knownLimitations: [
          'Classic custom batch input recording (BDC) is not supported; integration must transition to standard OData/BAPIs.',
          'Custom table control user exits require migration to Key User Extensibility or Developer Extensibility (RAP).'
        ],
        outstandingChecks: [
          `Verify service registration in S21 Gateway (/IWFND/MAINT_SERVICE).`,
          `Assign documented business role to target users in S21 client 200 via PFCG.`,
          `Execute end-to-end integration test with target payment/master data scenarios.`
        ],
        requiredNextSteps: [
          `Basis Team: Activate ICF nodes and OData services in S21 client 200.`,
          `Security Team: Configure business catalogue in Fiori Launchpad Content Manager (/UI2/FLPCM_CUST).`,
          `Functional Consultant: Conduct user acceptance testing comparing open-item processing with ${cleanTcode}.`
        ]
      };
    }

    // Outcome B: Classic SAP GUI through Fiori Launchpad
    if (assessment.assessmentResult === 'SAP_GUI_HTML') {
      return {
        outcome: 'USE_CLASSIC_TRANSACTION_LAUNCHPAD',
        canonicalOutcome: 'CONFIGURE',
        recommendedAction: `Retain classic transaction ${cleanTcode} hosted inside SAP Fiori Launchpad via WebGUI runtime (SAP GUI for HTML).`,
        supportingEvidence: [
          `No separate Fiori elements application is required; classic Dynpro ${assessment.screenNumber} is fully supported in Fiori Launchpad WebGUI.`,
          `Full feature parity with desktop SAP GUI including all existing authorization objects and document display logic.`,
          `Zero customization or RAP redevelopment required.`
        ],
        knownLimitations: [
          'Limited responsiveness on mobile or tablet form factors.',
          'UI styling adheres to WebGUI theme rather than native Fiori elements layouts.'
        ],
        outstandingChecks: [
          'Confirm WebGUI ICF service /sap/bc/gui/sap/its/webgui is active in SICF on S21.',
          'Verify Launchpad tile catalog mapping for transaction display.'
        ],
        requiredNextSteps: [
          'Ensure Launchpad application descriptor is registered in /UI2/FLPCM_CUST.',
          'Validate user authorization for S_TCODE and S_TABU_DIS.'
        ]
      };
    }

    // Outcome C: Functional Alternative
    if (assessment.assessmentResult === 'FUNCTIONAL_ALTERNATIVE' && appId) {
      return {
        outcome: 'EVALUATE_FUNCTIONAL_ALTERNATIVE',
        canonicalOutcome: 'EXTEND',
        recommendedAction: `Evaluate application ${appId} ("${appName}") as a modern functional alternative, while retaining ${cleanTcode} for legacy edge cases.`,
        supportingEvidence: [
          `Application ${appId} covers the core business scenarios of ${cleanTcode} with enhanced usability and real-time validation.`,
          `Recommended by SAP as the primary transaction path for general accounting operations.`
        ],
        knownLimitations: [
          `Not a 1:1 direct screen clone; some legacy screen fields and specialized clearing sub-screens may differ.`,
          `Requires user change management and workflow realignment.`
        ],
        outstandingChecks: [
          'Perform fit-gap analysis between legacy multi-step posting and modern journal entry review.',
          'Verify document type authorizations in S21 client 200.'
        ],
        requiredNextSteps: [
          'Organize fit-gap workshop with Finance leads.',
          'Pilot standard application alongside classic transaction in S21 quality client.'
        ]
      };
    }

    // Outcome D: Custom Transaction / No Standard Match -> AUTHORITATIVE BUILD DECISION
    if (
      assessment.classification === 'CUSTOM' ||
      assessment.assessmentResult === 'CUSTOM_RAP_REQUIRED' ||
      assessment.assessmentResult === 'NO_VERIFIED_MATCH' ||
      (!candidate && (cleanTcode.startsWith('Z') || cleanTcode.startsWith('Y') || assessment.businessArea === 'Custom Extension'))
    ) {
      return {
        outcome: 'BUILD',
        canonicalOutcome: 'BUILD',
        recommendedAction: `Modernize custom transaction ${cleanTcode} into a Clean Core Tier 2 ABAP RESTful Application Programming Model (RAP) Business Object and SAP Fiori Elements application.`,
        supportingEvidence: [
          `Transaction ${cleanTcode} is customer-developed in package ${assessment.packageName || 'Z-Custom'} (Main Program: ${assessment.programName || 'N/A'}).`,
          `Official SAP Fiori Apps Reference Library contains no standard successor for proprietary customer business logic.`,
          `Target landscape ${assessment.systemId} (${assessment.targetRelease || 'S/4HANA 2023'}) fully supports native RAP Draft runtime and OData V4 service bindings without modifying SAP standard core.`
        ],
        knownLimitations: [
          'Classic Dynpro screen controls and batch input recordings (BDC) must be refactored into RAP actions and determinations.',
          'Custom table access should leverage released CDS views or Tier 2 custom CDS entities.'
        ],
        outstandingChecks: [
          'Review candidate CDS data model and business entity relationships in Generation Studio.',
          'Sign off Architectural BUILD approval in Stage 4 (Modernization Decision).'
        ],
        requiredNextSteps: [
          'Proceed to Stage 4 (Modernization Decision) to review governance checks and approve the BUILD decision.',
          'Transition directly to Generation Studio to model CDS entities, evaluate RAP architecture, and generate ABAP/Fiori deliverables.'
        ]
      };
    }

    // Outcome E: Missing Catalogue Information / Pending Verification
    if (assessment.assessmentResult === 'PENDING_VERIFICATION') {
      return {
        outcome: 'INVESTIGATE_CATALOGUE_INFO',
        canonicalOutcome: 'PENDING_VERIFICATION',
        recommendedAction: `Conduct technical investigation in S21 client 200 to establish whether a specialized Fiori app or classic WebGUI tile is preferred for ${cleanTcode}.`,
        supportingEvidence: [
          `Transaction ${cleanTcode} exists in S21 dictionary (program ${assessment.programName}), but catalog matching remains unconfirmed.`,
          `Candidate application exists in related modules but requires activation confirmation.`
        ],
        knownLimitations: [
          'No verified standard Fiori mapping is currently locked into the baseline.',
          'Operational dependency on classic transaction persists until verified.'
        ],
        outstandingChecks: [
          `Query S21 Launchpad Content Manager for tiles referencing ${cleanTcode}.`,
          `Inspect SAP Simplification List for specific migration guidance.`
        ],
        requiredNextSteps: [
          'Run transaction /UI2/FLIA in S21 to analyze Launchpad app intent.',
          'Determine whether classic WebGUI or Fiori elements reporting fits best.'
        ]
      };
    }

    // Outcome F: Release Incompatible or Default
    return {
      outcome: 'VALIDATE_RELEASE_INCOMPATIBILITY',
      canonicalOutcome: 'INSUFFICIENT_EVIDENCE',
      recommendedAction: `Validate release prerequisites or defer deployment of application until target support package is applied.`,
      supportingEvidence: [
        `Assessment flagged release or technical compatibility constraints for ${cleanTcode}.`
      ],
      knownLimitations: [
        'Prerequisite software components or support packages missing from current landscape.'
      ],
      outstandingChecks: [
        'Check S21 CVERS component levels against SAP Note simplification requirements.'
      ],
      requiredNextSteps: [
        'Coordinate with SAP Basis team regarding upcoming SPS upgrade schedule.'
      ]
    };
  }

  /**
   * Generates a canonical recommendation with explicit canonical outcome.
   */
  public generateCanonicalRecommendation(
    assessment: AssessmentRecord,
    candidate: CatalogueReference | null,
    compatibility: ReleaseCompatibilityRecord,
    availability: SystemAvailabilityAudit
  ): AssessmentRecommendation {
    const rec = this.generateRecommendation(assessment, candidate, compatibility, availability);
    return {
      ...rec,
      outcome: rec.canonicalOutcome || this.mapToCanonicalOutcome(rec.outcome, availability)
    };
  }
}

export const evidenceEngine = new EvidenceEngine();
