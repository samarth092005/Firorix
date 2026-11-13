/**
 * Fiorify — Technical Evidence Collection Engine (DISC-02)
 *
 * Collects, normalizes, and classifies technical evidence from multiple SAP sources:
 * 1. Transaction Repository Evidence (TSTC, TSTCT, TADIR, program, package, type)
 * 2. ABAP Development Evidence (ADT discovery, repository objects, CDS views)
 * 3. Gateway Evidence (Service catalogue, service versions, metadata EDMX, entity sets, operations)
 * 4. Fiori Application Evidence (FAL App ID, UI5 component, BSP path, business/technical catalogs, roles, OData deps)
 * 5. Authorization Evidence (Business roles, PFCG objects, SU24 where verified)
 *
 * Core Tenets:
 * - A Gateway OData service is NOT automatically a Fiori application.
 * - An OData dependency is NOT proof that an application replaces a transaction.
 * - Every piece of evidence carries explicit provenance and confidence.
 * - Missing evidence is explicitly surfaced rather than guessed.
 */

export const PROVENANCE_CATEGORIES = {
  LIVE_SAP: 'LIVE_SAP',
  OFFICIAL_FAL_EXPORT: 'OFFICIAL_FAL_EXPORT',
  OFFICIAL_CATALOGUE_LIVE: 'OFFICIAL_CATALOGUE_LIVE',
  OFFICIAL_CATALOGUE_CACHED: 'OFFICIAL_CATALOGUE_CACHED',
  CURATED_FIXTURE: 'CURATED_FIXTURE',
  INFERRED: 'INFERRED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  UNAVAILABLE: 'UNAVAILABLE'
};

export const EVIDENCE_CLASSIFICATIONS = {
  USER_PROVIDED: 'USER_PROVIDED',
  FORMAT_VALIDATED: 'FORMAT_VALIDATED',
  LIVE_SAP_VERIFIED: 'LIVE_SAP_VERIFIED',
  CURATED_FIXTURE: 'CURATED_FIXTURE',
  INFERRED: 'INFERRED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  BLOCKED_BY_AUTHORIZATION: 'BLOCKED_BY_AUTHORIZATION',
  UNAVAILABLE: 'UNAVAILABLE'
};

export const CONFIDENCE_LEVELS = {
  VERIFIED: 'VERIFIED', // Directly confirmed by an authoritative accessible source
  HIGH: 'HIGH',         // Supported by multiple independent reliable sources
  MEDIUM: 'MEDIUM',     // Partially supported by available metadata
  LOW: 'LOW',           // Inferred from limited or circumstantial evidence
  UNKNOWN: 'UNKNOWN'    // Insufficient evidence
};

export class TechnicalEvidenceEngine {
  /**
   * Collects and normalizes technical evidence for a transaction.
   *
   * @param {Object} params
   * @param {string} params.tcode - SAP transaction code
   * @param {Object} [params.transactionData] - Discovered transaction metadata
   * @param {Object} [params.tadirData] - TADIR repository entry
   * @param {Object} [params.adtProbe] - ADT interface probing result
   * @param {Array} [params.gatewayServices] - Matching Gateway services
   * @param {Array} [params.candidateApps] - Matching Fiori applications
   * @param {Object} [params.system] - SAP system landscape info
   * @param {boolean} [params.isLiveMode] - Whether target is a live SAP system
   * @returns {Object} Normalized evidence collection with confidence & missing evidence list
   */
  collectEvidence(params = {}) {
    const {
      tcode = '',
      transactionData = {},
      tadirData = {},
      adtProbe = {},
      gatewayServices = [],
      candidateApps = [],
      system = {},
      isLiveMode = false
    } = params;

    const normTcode = (tcode || '').trim().toUpperCase();
    const evidence = [];
    const missingEvidence = [];
    const verificationWarnings = [];

    let evidenceCounter = 1;
    const nextId = () => `EVD-${String(evidenceCounter++).padStart(3, '0')}`;

    const defaultSystemId = system.systemId || (isLiveMode ? 'S21-200' : 'S4H-DEV-200');

    // -------------------------------------------------------------------------
    // 1. Transaction Repository Evidence (TSTC / TSTCT / TADIR)
    // -------------------------------------------------------------------------
    if (transactionData && transactionData.exists) {
      // 1a. TSTC Entry (T-Code & Program)
      evidence.push({
        evidenceId: nextId(),
        evidenceType: 'TRANSACTION_REPOSITORY',
        sourceSystem: defaultSystemId,
        sourceName: 'TSTC',
        sourceRecordId: normTcode,
        evidenceValue: {
          transactionCode: normTcode,
          program: transactionData.program || 'PENDING_VERIFICATION',
          screenNumber: transactionData.screenNumber || '0100',
          transactionType: transactionData.transactionType || 'TRANSACTION'
        },
        provenance: isLiveMode ? PROVENANCE_CATEGORIES.LIVE_SAP : PROVENANCE_CATEGORIES.CURATED_FIXTURE,
        confidence: transactionData.program && transactionData.program !== 'PENDING_VERIFICATION'
          ? CONFIDENCE_LEVELS.VERIFIED
          : CONFIDENCE_LEVELS.MEDIUM,
        retrievedAt: new Date().toISOString(),
        verificationStatus: transactionData.program && transactionData.program !== 'PENDING_VERIFICATION'
          ? 'VERIFIED'
          : 'PARTIALLY_AVAILABLE',
        relatedTransaction: normTcode,
        limitations: transactionData.program === 'PENDING_VERIFICATION'
          ? ['Direct TSTC program verification pending Basis table access.']
          : []
      });

      // 1b. TSTCT Entry (Description)
      if (transactionData.description) {
        evidence.push({
          evidenceId: nextId(),
          evidenceType: 'TRANSACTION_REPOSITORY',
          sourceSystem: defaultSystemId,
          sourceName: 'TSTCT',
          sourceRecordId: `${normTcode}:EN`,
          evidenceValue: {
            transactionCode: normTcode,
            description: transactionData.description,
            language: transactionData.language || 'EN'
          },
          provenance: isLiveMode ? PROVENANCE_CATEGORIES.LIVE_SAP : PROVENANCE_CATEGORIES.CURATED_FIXTURE,
          confidence: CONFIDENCE_LEVELS.VERIFIED,
          retrievedAt: new Date().toISOString(),
          verificationStatus: 'VERIFIED',
          relatedTransaction: normTcode,
          limitations: []
        });
      } else {
        missingEvidence.push('TSTCT: Language-specific transaction description missing.');
      }

      // 1c. TADIR Entry (Package / Devclass / Original System)
      const pkg = tadirData.devclass || transactionData.packageName;
      const srcSys = tadirData.srcsystem || transactionData.originalSystem;
      const comp = tadirData.softwareComponent || transactionData.softwareComponent;

      if (pkg && pkg !== 'PENDING_VERIFICATION') {
        evidence.push({
          evidenceId: nextId(),
          evidenceType: 'TRANSACTION_REPOSITORY',
          sourceSystem: defaultSystemId,
          sourceName: 'TADIR',
          sourceRecordId: `R3TR:TRAN:${normTcode}`,
          evidenceValue: {
            programId: 'R3TR',
            objectType: 'TRAN',
            objectName: normTcode,
            package: pkg,
            originalSystem: srcSys || 'SAP',
            softwareComponent: comp || 'S4CORE 108'
          },
          provenance: isLiveMode ? PROVENANCE_CATEGORIES.LIVE_SAP : PROVENANCE_CATEGORIES.CURATED_FIXTURE,
          confidence: CONFIDENCE_LEVELS.VERIFIED,
          retrievedAt: new Date().toISOString(),
          verificationStatus: 'VERIFIED',
          relatedTransaction: normTcode,
          limitations: []
        });
      } else {
        missingEvidence.push('TADIR: Package (DEVCLASS) and original system (SRCSYSTEM) pending verification.');
        verificationWarnings.push('Package allocation unverified in TADIR; standard vs custom classification may have reduced confidence.');
      }
    } else {
      missingEvidence.push(`TSTC: Transaction "${normTcode}" not found in system table.`);
    }

    // -------------------------------------------------------------------------
    // 2. ABAP Development Evidence (ADT Discovery)
    // -------------------------------------------------------------------------
    if (adtProbe && adtProbe.accessible) {
      evidence.push({
        evidenceId: nextId(),
        evidenceType: 'ABAP_DEVELOPMENT',
        sourceSystem: defaultSystemId,
        sourceName: 'ADT_DISCOVERY',
        sourceRecordId: '/sap/bc/adt/discovery',
        evidenceValue: {
          accessible: true,
          httpStatus: 200,
          services: ['programs', 'transactions', 'packages', 'classes']
        },
        provenance: PROVENANCE_CATEGORIES.LIVE_SAP,
        confidence: CONFIDENCE_LEVELS.VERIFIED,
        retrievedAt: new Date().toISOString(),
        verificationStatus: 'VERIFIED',
        relatedTransaction: normTcode,
        limitations: []
      });
    } else if (isLiveMode) {
      const code = adtProbe.code || 'SADT_RESOURCE_003';
      const msg = adtProbe.message || 'No authorization to access the resource /sap/bc/adt/discovery.';
      missingEvidence.push(`ADT Discovery: Inaccessible (${code} - HTTP ${adtProbe.httpStatus || 403}). Low-level ABAP repository objects require Basis authorization.`);
      verificationWarnings.push('ADT interface blocked by authorization: direct CDS and ABAP object inspection unavailable.');

      evidence.push({
        evidenceId: nextId(),
        evidenceType: 'ABAP_DEVELOPMENT',
        sourceSystem: defaultSystemId,
        sourceName: 'ADT_DISCOVERY',
        sourceRecordId: '/sap/bc/adt/discovery',
        evidenceValue: {
          accessible: false,
          httpStatus: adtProbe.httpStatus || 403,
          code,
          message: msg,
          requiredAuthorizations: adtProbe.requiredAuthorizations || [
            'S_ADT_RES (Activity 03)',
            'S_DEVELOP (Activity 03: PROG, TRAN, DEVC)'
          ]
        },
        provenance: PROVENANCE_CATEGORIES.LIVE_SAP,
        confidence: CONFIDENCE_LEVELS.VERIFIED, // It is verified that access is blocked
        retrievedAt: new Date().toISOString(),
        verificationStatus: 'BLOCKED_BY_AUTHORIZATION',
        relatedTransaction: normTcode,
        limitations: ['Authorization denied: cannot inspect raw ABAP source or CDS definitions directly.']
      });
    }

    // -------------------------------------------------------------------------
    // 3. Gateway Evidence (OData Catalogue & Services)
    // -------------------------------------------------------------------------
    if (gatewayServices && gatewayServices.length > 0) {
      for (const srv of gatewayServices) {
        evidence.push({
          evidenceId: nextId(),
          evidenceType: 'GATEWAY_CATALOG',
          sourceSystem: defaultSystemId,
          sourceName: 'IWFND/CATALOGSERVICE;v=2',
          sourceRecordId: srv.technicalServiceName || srv.id,
          evidenceValue: {
            technicalServiceName: srv.technicalServiceName || srv.id,
            title: srv.title,
            description: srv.description,
            serviceUrl: srv.serviceUrl,
            metadataUrl: srv.metadataUrl,
            serviceType: srv.serviceType || 'UI'
          },
          provenance: isLiveMode ? PROVENANCE_CATEGORIES.LIVE_SAP : PROVENANCE_CATEGORIES.CURATED_FIXTURE,
          confidence: CONFIDENCE_LEVELS.HIGH,
          retrievedAt: new Date().toISOString(),
          verificationStatus: 'VERIFIED',
          relatedTransaction: normTcode,
          limitations: [
            'Active Gateway OData service corroborates backend service availability, but does NOT prove UI application existence or functional equivalence to the legacy transaction.'
          ],
          gatewayIntegrity: {
            serviceDiscovered: true,
            odataMetadataAvailable: Boolean(srv.metadataUrl || srv.technicalServiceName),
            applicationMapped: false,
            functionallySuitable: false
          }
        });
      }
    } else {
      missingEvidence.push('Gateway Catalogue: No active OData services correlated for this transaction on target system.');
    }

    // -------------------------------------------------------------------------
    // 4. Fiori Application Evidence (FAL Canonical Catalogue)
    // -------------------------------------------------------------------------
    if (candidateApps && candidateApps.length > 0) {
      for (const app of candidateApps) {
        evidence.push({
          evidenceId: nextId(),
          evidenceType: 'FIORI_CATALOGUE',
          sourceSystem: 'SAP_FAL',
          sourceRecordId: app.appId,
          evidenceValue: {
            appId: app.appId,
            appName: app.appName,
            appType: app.appType,
            uiTechnology: app.uiTechnology,
            productVersion: app.productVersion,
            softwareComponent: app.softwareComponent,
            businessRole: app.businessRole,
            businessCatalog: app.businessCatalog,
            technicalCatalog: app.technicalCatalog,
            odataServices: app.odataServices || [],
            sapui5Component: app.sapui5Component,
            leadingTransactionCodes: app.leadingTransactionCodes || []
          },
          provenance: app.provenance || PROVENANCE_CATEGORIES.OFFICIAL_CATALOGUE_CACHED,
          confidence: app.provenance?.startsWith('OFFICIAL') ? CONFIDENCE_LEVELS.VERIFIED : CONFIDENCE_LEVELS.HIGH,
          retrievedAt: new Date().toISOString(),
          verificationStatus: 'VERIFIED',
          relatedTransaction: normTcode,
          relatedApplication: app.appId,
          limitations: []
        });
      }
    } else {
      missingEvidence.push('FAL Catalogue: No standard Fiori application candidates found matching transaction code or functional scope.');
    }

    // -------------------------------------------------------------------------
    // 5. Authorization Evidence (PFCG / SU24)
    // -------------------------------------------------------------------------
    // If business roles are specified in candidate apps, add them as pending verification authorization evidence
    const candidateRoles = candidateApps
      .map((a) => a.businessRole)
      .filter(Boolean)
      .flatMap((r) => r.split('*').map((s) => s.trim()))
      .filter(Boolean);

    if (candidateRoles.length > 0) {
      evidence.push({
        evidenceId: nextId(),
        evidenceType: 'AUTHORIZATION',
        sourceSystem: defaultSystemId,
        sourceName: 'PFCG_CATALOG',
        sourceRecordId: candidateRoles[0],
        evidenceValue: {
          candidateRoles: Array.from(new Set(candidateRoles)),
          su24Objects: ['S_TCODE', 'S_START', 'S_SERVICE'],
          userAuthorizationsProvided: false
        },
        provenance: PROVENANCE_CATEGORIES.INFERRED,
        confidence: CONFIDENCE_LEVELS.MEDIUM,
        retrievedAt: new Date().toISOString(),
        verificationStatus: 'PENDING_VERIFICATION',
        relatedTransaction: normTcode,
        limitations: [
          'User PFCG role assignment is pending verification against active user authorizations.'
        ]
      });
    } else {
      missingEvidence.push('SU24 / PFCG: Authorization profiles and business roles unverified for transaction.');
    }

    // -------------------------------------------------------------------------
    // Calculate Overall Evidence Confidence
    // -------------------------------------------------------------------------
    let overallConfidence = CONFIDENCE_LEVELS.UNKNOWN;
    const verifiedCount = evidence.filter((e) => e.confidence === CONFIDENCE_LEVELS.VERIFIED).length;
    const highCount = evidence.filter((e) => e.confidence === CONFIDENCE_LEVELS.HIGH).length;

    if (verifiedCount >= 3 && highCount >= 1) {
      overallConfidence = CONFIDENCE_LEVELS.VERIFIED;
    } else if (verifiedCount >= 2 || highCount >= 2) {
      overallConfidence = CONFIDENCE_LEVELS.HIGH;
    } else if (evidence.length >= 2) {
      overallConfidence = CONFIDENCE_LEVELS.MEDIUM;
    } else if (evidence.length === 1) {
      overallConfidence = CONFIDENCE_LEVELS.LOW;
    }

    return {
      transactionCode: normTcode,
      totalEvidenceItems: evidence.length,
      overallConfidence,
      evidence,
      missingEvidence,
      verificationWarnings,
      collectionTimestamp: new Date().toISOString()
    };
  }

  /**
   * Normalizes raw evidence entries into canonical TechnicalEvidenceRecords.
   *
   * @param {Array<Object>} items
   * @returns {Array<Object>} Normalized evidence records
   */
  normalizeEvidence(items = []) {
    if (!Array.isArray(items)) return [];

    const CANONICAL_CATEGORIES = [
      'TRANSACTION_REPOSITORY',
      'ABAP_DEV_METADATA',
      'GATEWAY_ODATA',
      'FAL_CATALOGUE',
      'AUTHORIZATION'
    ];

    return items.map((item, idx) => {
      const category = item.category || item.evidenceType || 'TRANSACTION_REPOSITORY';
      const isBlocked = item.status === 'BLOCKED_BY_AUTHORIZATION' || item.verificationStatus === 'BLOCKED_BY_AUTHORIZATION';

      const limitations = Array.isArray(item.limitations)
        ? [...item.limitations]
        : isBlocked
          ? ['Probing blocked by SAP Basis authorization check (SADT_RESOURCE_003).']
          : [];

      const verificationRequirements = Array.isArray(item.verificationRequirements)
        ? [...item.verificationRequirements]
        : isBlocked
          ? ['Requires SAP Basis authorization objects: S_ADT_RES (Activity 03, 16) and S_DEVELOP (Activity 03).']
          : [];

      const verified = Boolean(item.verified) && !isBlocked;

      let confidence = item.confidence;
      if (!confidence) {
        if (isBlocked) confidence = CONFIDENCE_LEVELS.UNKNOWN;
        else if (verified) confidence = CONFIDENCE_LEVELS.HIGH;
        else confidence = CONFIDENCE_LEVELS.MEDIUM;
      }

      return {
        evidenceId: item.evidenceId || `EVD-NORM-${String(idx + 1).padStart(3, '0')}`,
        category,
        evidenceType: item.evidenceType || category,
        source: item.source || item.sourceName || 'SAP S/4HANA System S21',
        retrievedValue: item.retrievedValue !== undefined
          ? item.retrievedValue
          : (item.evidenceValue ? JSON.stringify(item.evidenceValue) : ''),
        provenance: item.provenance || (isBlocked ? PROVENANCE_CATEGORIES.LIVE_SAP : PROVENANCE_CATEGORIES.INFERRED),
        confidence,
        reliabilityScore: item.reliabilityScore || (confidence === CONFIDENCE_LEVELS.VERIFIED ? 1.0 : (confidence === CONFIDENCE_LEVELS.HIGH ? 0.85 : 0.5)),
        verified,
        verificationStatus: item.verificationStatus || item.status || (verified ? 'VERIFIED' : (isBlocked ? 'BLOCKED_BY_AUTHORIZATION' : 'PENDING_VERIFICATION')),
        limitations,
        missingEvidence: item.missingEvidence || [],
        verificationRequirements
      };
    });
  }

  /**
   * Assesses evidence completeness against canonical SAP evidence categories.
   *
   * @param {Array<Object>} evidenceItems
   * @returns {Object} Completeness metrics and overall confidence
   */
  assessEvidenceCompleteness(evidenceItems = []) {
    const CANONICAL_CATEGORIES = [
      'TRANSACTION_REPOSITORY',
      'ABAP_DEV_METADATA',
      'GATEWAY_ODATA',
      'FAL_CATALOGUE',
      'AUTHORIZATION'
    ];

    const presentSet = new Set(
      evidenceItems
        .map((e) => e.category || e.evidenceType)
        .filter(Boolean)
    );

    const presentCategories = CANONICAL_CATEGORIES.filter((c) => presentSet.has(c));
    const missingCategories = CANONICAL_CATEGORIES.filter((c) => !presentSet.has(c));

    const verifiedCount = evidenceItems.filter((e) => e.confidence === CONFIDENCE_LEVELS.VERIFIED || e.verified).length;
    const highCount = evidenceItems.filter((e) => e.confidence === CONFIDENCE_LEVELS.HIGH).length;

    let overallConfidence = CONFIDENCE_LEVELS.LOW;
    if (presentCategories.length === 5 && (verifiedCount >= 3 || highCount >= 3)) {
      overallConfidence = CONFIDENCE_LEVELS.HIGH;
    } else if (presentCategories.length >= 3) {
      overallConfidence = CONFIDENCE_LEVELS.MEDIUM;
    } else if (presentCategories.length <= 1) {
      overallConfidence = CONFIDENCE_LEVELS.LOW;
    }

    return {
      totalCategories: CANONICAL_CATEGORIES.length,
      presentCategories: presentCategories.length,
      missingCategories,
      verifiedCount,
      overallConfidence
    };
  }

  /**
   * Evaluates and classifies a transaction's identity across format validation,
   * live SAP verification, fixture availability, and authorization status.
   */
  classifyTransactionIdentity({ tcode = '', isValidFormat = false, isLiveMode = false, liveProbeResult = null, mockTx = null } = {}) {
    const norm = (tcode || '').trim().toUpperCase();

    if (!norm) {
      return {
        userSuppliedTCode: '',
        formatValidation: { passed: false, classification: EVIDENCE_CLASSIFICATIONS.UNAVAILABLE },
        sapExistenceVerification: { status: 'UNAVAILABLE', classification: EVIDENCE_CLASSIFICATIONS.UNAVAILABLE },
        programMetadata: { value: null, status: 'UNAVAILABLE', classification: EVIDENCE_CLASSIFICATIONS.UNAVAILABLE },
        packageMetadata: { value: null, status: 'UNAVAILABLE', classification: EVIDENCE_CLASSIFICATIONS.UNAVAILABLE },
        authorizationMetadata: { value: null, status: 'UNAVAILABLE', classification: EVIDENCE_CLASSIFICATIONS.UNAVAILABLE }
      };
    }

    const formatClassification = isValidFormat
      ? EVIDENCE_CLASSIFICATIONS.FORMAT_VALIDATED
      : EVIDENCE_CLASSIFICATIONS.UNAVAILABLE;

    if (isLiveMode) {
      const isConnectionFailed = liveProbeResult?.statusCode === 'LIVE_CONNECTION_FAILED';
      const isAuthBlocked = liveProbeResult?.error?.statusCode === 403 ||
        liveProbeResult?.httpStatus === 403 ||
        liveProbeResult?.statusCode === 'ACCESS_DENIED' ||
        liveProbeResult?.statusCode === 'BLOCKED_BY_AUTHORIZATION' ||
        (typeof liveProbeResult?.error?.message === 'string' && liveProbeResult.error.message.toLowerCase().includes('authorization'));
      const isAdtAccessible = liveProbeResult?.diagnostics?.adtProbe?.accessible === true;
      const hasCorrelated = (liveProbeResult?.correlatedGatewayServices || []).length > 0;

      let existenceStatus = 'NOT_FOUND';
      let existenceClass = EVIDENCE_CLASSIFICATIONS.UNAVAILABLE;

      if (isConnectionFailed) {
        existenceStatus = 'CONNECTION_FAILED';
        existenceClass = EVIDENCE_CLASSIFICATIONS.UNAVAILABLE;
      } else if (isAuthBlocked) {
        existenceStatus = 'BLOCKED_BY_AUTHORIZATION';
        existenceClass = EVIDENCE_CLASSIFICATIONS.BLOCKED_BY_AUTHORIZATION;
      } else if (isAdtAccessible) {
        existenceStatus = 'VERIFIED';
        existenceClass = EVIDENCE_CLASSIFICATIONS.LIVE_SAP_VERIFIED;
      } else if (hasCorrelated || liveProbeResult?.success) {
        existenceStatus = 'PARTIALLY_AVAILABLE';
        existenceClass = EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION;
      }

      return {
        userSuppliedTCode: norm,
        formatValidation: { passed: isValidFormat, classification: formatClassification },
        sapExistenceVerification: {
          status: existenceStatus,
          classification: existenceClass,
          details: isAuthBlocked
            ? (liveProbeResult?.error?.message || 'Access blocked by authorization policy (HTTP 403 / S_ADT_RES / S_DEVELOP).')
            : (isAdtAccessible
              ? 'Verified directly via ADT on live SAP S21.'
              : (hasCorrelated ? 'Corroborated by active Gateway services on S21, pending Basis ADT authorization.' : 'Unconfirmed on live SAP S21.'))
        },
        programMetadata: {
          value: isAdtAccessible ? liveProbeResult?.transaction?.program : null,
          status: isAdtAccessible ? 'VERIFIED' : 'PENDING_VERIFICATION',
          classification: isAdtAccessible ? EVIDENCE_CLASSIFICATIONS.LIVE_SAP_VERIFIED : EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION
        },
        packageMetadata: {
          value: isAdtAccessible ? liveProbeResult?.transaction?.packageName : null,
          status: isAdtAccessible ? 'VERIFIED' : 'PENDING_VERIFICATION',
          classification: isAdtAccessible ? EVIDENCE_CLASSIFICATIONS.LIVE_SAP_VERIFIED : EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION
        },
        authorizationMetadata: {
          value: null,
          status: 'PENDING_VERIFICATION',
          classification: EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION,
          details: 'Business transaction authorization (SU24/PFCG) unverified from live SAP tables.'
        }
      };
    }

    // Mock / Curated Demo Mode
    if (mockTx && mockTx.exists) {
      return {
        userSuppliedTCode: norm,
        formatValidation: { passed: isValidFormat, classification: formatClassification },
        sapExistenceVerification: {
          status: 'CURATED_FIXTURE',
          classification: EVIDENCE_CLASSIFICATIONS.CURATED_FIXTURE,
          details: 'Retrieved from curated demo fixture registry.'
        },
        programMetadata: {
          value: mockTx.program || null,
          status: 'CURATED_FIXTURE',
          classification: EVIDENCE_CLASSIFICATIONS.CURATED_FIXTURE
        },
        packageMetadata: {
          value: mockTx.packageName || null,
          status: 'CURATED_FIXTURE',
          classification: EVIDENCE_CLASSIFICATIONS.CURATED_FIXTURE
        },
        authorizationMetadata: {
          value: mockTx.authorizationObject || null,
          status: mockTx.authorizationObject ? 'CURATED_FIXTURE' : 'PENDING_VERIFICATION',
          classification: mockTx.authorizationObject ? EVIDENCE_CLASSIFICATIONS.CURATED_FIXTURE : EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION,
          details: mockTx.authorizationObject
            ? 'Authorization object documented in curated fixture.'
            : 'Authorization profile unassigned in fixture; SU24 verification pending.'
        }
      };
    }

    // Custom or Unknown in Mock Mode
    return {
      userSuppliedTCode: norm,
      formatValidation: { passed: isValidFormat, classification: formatClassification },
      sapExistenceVerification: {
        status: 'UNINDEXED',
        classification: EVIDENCE_CLASSIFICATIONS.UNAVAILABLE,
        details: 'T-Code syntax is valid, but no SAP dictionary or fixture entry exists.'
      },
      programMetadata: {
        value: null,
        status: 'UNAVAILABLE',
        classification: EVIDENCE_CLASSIFICATIONS.UNAVAILABLE
      },
      packageMetadata: {
        value: null,
        status: 'UNAVAILABLE',
        classification: EVIDENCE_CLASSIFICATIONS.UNAVAILABLE
      },
      authorizationMetadata: {
        value: null,
        status: 'PENDING_VERIFICATION',
        classification: EVIDENCE_CLASSIFICATIONS.PENDING_VERIFICATION,
        details: 'Authorization profile unverified; no SAP dictionary entry found.'
      }
    };
  }
}

export const technicalEvidenceEngine = new TechnicalEvidenceEngine();
