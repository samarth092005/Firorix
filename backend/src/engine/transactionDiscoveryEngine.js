/**
 * FioriX — SAP Transaction Discovery Engine (DISC-01)
 *
 * Implements authoritative SAP transaction discovery across live SAP S21 and mock landscapes:
 * - Normalizes input T-Codes and validates against SAP naming rules.
 * - Coordinates discovery across TSTC/TSTCT, TADIR, and ADT probes.
 * - Integrates with TechnicalEvidenceEngine to build multi-source evidence collections.
 * - Strictly separates LIVE_SAP and MOCK execution without silent fallback.
 */

import { mockSapAdapter } from '../adapters/mockSapAdapter.js';
import { sapTransactionDiscoveryAdapter } from '../adapters/sapTransactionDiscoveryAdapter.js';
import { technicalEvidenceEngine, PROVENANCE_CATEGORIES, CONFIDENCE_LEVELS, EVIDENCE_CLASSIFICATIONS } from './technicalEvidenceEngine.js';
import { EvidenceClassifier } from '../evidenceClassifier.js';
import { defaultTransactionMasterIndex, TransactionMasterIndex } from '../services/transactionMasterIndex.js';

// Standard SAP transaction naming: 1-20 uppercase alphanumeric, underscores, hyphens, or slashes (e.g. /UI2/FLP, ME21N)
const SAP_TCODE_REGEX = /^[A-Z0-9_\-\/]{1,20}$/;

export class TransactionDiscoveryEngine {
  constructor(options = {}) {
    this.liveDiscoveryAdapter = options.liveDiscoveryAdapter || sapTransactionDiscoveryAdapter;
    this.mockAdapter = options.mockAdapter || mockSapAdapter;
    this.evidenceEngine = options.evidenceEngine || technicalEvidenceEngine;
    this.masterIndex = options.masterIndex || defaultTransactionMasterIndex;
  }

  /**
   * Normalizes and validates incoming transaction code or business input.
   *
   * @param {string} input - Raw input
   * @returns {{ isValid: boolean, normalizedTcode: string, error?: string, errors: string[] }}
   */
  normalizeInput(input) {
    if (!input || typeof input !== 'string') {
      const err = 'Transaction code cannot be blank.';
      return {
        isValid: false,
        normalizedTcode: '',
        error: err,
        errors: [err]
      };
    }

    const trimmed = input.trim();
    if (trimmed.length === 0) {
      const err = 'Transaction code cannot be blank whitespace.';
      return {
        isValid: false,
        normalizedTcode: '',
        error: err,
        errors: [err]
      };
    }

    const upper = trimmed.toUpperCase();
    if (!SAP_TCODE_REGEX.test(upper)) {
      const err = `Transaction code "${upper}" violates SAP naming conventions (must be 1-20 alphanumeric characters, hyphens, underscores, or slashes).`;
      return {
        isValid: false,
        normalizedTcode: upper,
        error: err,
        errors: [err]
      };
    }

    return {
      isValid: true,
      normalizedTcode: upper,
      errors: []
    };
  }

  /**
   * Discovers transaction metadata and collects technical evidence.
   *
   * @param {Object} params
   * @param {string} params.tcode - Transaction code
   * @param {string} [params.systemId] - Target SAP system ID (e.g. "S21-200")
   * @param {string} [params.language] - Session language (default "EN")
   * @param {string} [params.mode] - Discovery mode ("LIVE" or "MOCK")
   * @param {boolean} [params.useLiveSap] - Explicit live SAP switch
   * @param {Object} [params.targetSystem] - Explicit target system override
   * @returns {Promise<Object>} Canonical Transaction Discovery result
   */
  async discover(params = {}) {
    const rawTcode = params.tcode || '';
    const normResult = this.normalizeInput(rawTcode);

    if (!normResult.isValid) {
      return {
        success: false,
        statusCode: 'INVALID_TCODE_FORMAT',
        httpStatus: 400,
        errorMessage: normResult.error,
        validationErrors: normResult.errors,
        tcode: normResult.normalizedTcode,
        transactionCode: normResult.normalizedTcode,
        discoveryTimestamp: new Date().toISOString()
      };
    }

    const tcode = normResult.normalizedTcode;
    const systemId = (params.systemId || 'S21-200').trim();
    const language = (params.language || 'EN').toUpperCase();

    // Determine target system from registry
    const targetSystem = params.targetSystem || this.mockAdapter.getSystemById(systemId) || {
      systemId,
      systemName: systemId === 'S21-200' ? 'SAP S/4HANA 2023 System S21' : 'SAP Landscape',
      client: systemId === 'S21-200' ? '200' : '---',
      release: 'SAP S/4HANA 2023 Private Edition',
      mode: systemId === 'S21-200' ? 'LIVE_SAP' : 'MOCK'
    };

    let isLiveMode = false;
    if (params.useLiveSap === true) {
      isLiveMode = true;
    } else if (params.useLiveSap === false || params.mode === 'MOCK' || systemId === 'S21-200-DEMO' || systemId === 'S4H-DEV-200') {
      isLiveMode = false;
    } else if (targetSystem.mode) {
      isLiveMode = targetSystem.mode === 'LIVE_SAP';
    }

    // -------------------------------------------------------------------------
    // A. Live SAP S21 Discovery Execution
    // -------------------------------------------------------------------------
    if (isLiveMode) {
      const liveResult = await this.liveDiscoveryAdapter.discoverTransaction(tcode);

      if (!liveResult.success) {
        const isConnectionError = liveResult.statusCode === 'LIVE_CONNECTION_FAILED';
        return {
          success: false,
          statusCode: isConnectionError ? 'CONNECTION_ERROR' : (liveResult.statusCode || 'NOT_FOUND'),
          httpStatus: liveResult.httpStatus || (isConnectionError ? 502 : 404),
          tcode,
          transactionCode: tcode,
          mode: 'LIVE_SAP',
          systemId: targetSystem.systemId,
          client: targetSystem.client,
          systemRelease: targetSystem.release,
          errorMessage: liveResult.errorMessage || `Transaction "${tcode}" could not be discovered on live SAP system ${systemId}.`,
          transactionIdentity: {
            userSuppliedTCode: tcode,
            formatValidation: { passed: normResult.isValid, classification: 'UNKNOWN' },
            sapExistenceVerification: {
              status: 'NOT_FOUND',
              classification: 'NON_EXISTENT',
              details: liveResult.errorMessage || `Transaction code "${tcode}" does not exist in SAP system.`
            },
            programMetadata: { value: null, status: 'NOT_FOUND', classification: 'NON_EXISTENT' },
            packageMetadata: { value: null, status: 'NOT_FOUND', classification: 'NON_EXISTENT' },
            authorizationMetadata: { value: null, status: 'NOT_FOUND', classification: 'NON_EXISTENT' }
          },
          evidence: liveResult.evidence || [],
          technicalEvidence: liveResult.evidence || [],
          evidenceSources: liveResult.evidence || [],
          evidenceConfidence: CONFIDENCE_LEVELS.UNKNOWN,
          provenance: PROVENANCE_CATEGORIES.LIVE_SAP,
          warnings: isConnectionError
            ? ['Live SAP Gateway connection failed. Fallback to mock data strictly prohibited without explicit user request.']
            : ['Transaction not found in live SAP repository.'],
          discoveryTimestamp: new Date().toISOString()
        };
      }

      // Collect technical evidence for discovered live transaction
      const rawTx = liveResult.transaction || {};
      const masterRecord = this.masterIndex.lookup(tcode, { systemId: targetSystem.systemId, client: targetSystem.client });
      const rawProg = typeof rawTx.program === 'object' ? rawTx.program?.value : rawTx.program;
      const programName = rawProg || masterRecord?.program || 'PENDING_VERIFICATION';
      const rawPkg = typeof rawTx.package === 'object' ? rawTx.package?.value : (rawTx.packageName || rawTx.package);
      const packageName = rawPkg || masterRecord?.packageName || 'PENDING_VERIFICATION';
      const originalSystem = rawTx.originalSystem || masterRecord?.originalSystem || (tcode.startsWith('Z') || tcode.startsWith('Y') ? 'S21' : undefined);
      const softwareComponent = rawTx.softwareComponent || masterRecord?.softwareComponent || undefined;

      const tadir = {
        devclass: packageName !== 'PENDING_VERIFICATION' ? packageName : undefined,
        srcsystem: originalSystem !== 'PENDING_VERIFICATION' ? originalSystem : undefined,
        softwareComponent
      };

      const classificationEval = EvidenceClassifier.classify({
        tcode,
        program: programName !== 'PENDING_VERIFICATION' ? programName : undefined,
        packageName: packageName !== 'PENDING_VERIFICATION' ? packageName : undefined,
        originalSystem: tadir.srcsystem,
        softwareComponent: tadir.softwareComponent,
        tadir
      });

      const evidenceCollection = this.evidenceEngine.collectEvidence({
        tcode,
        transactionData: {
          exists: true,
          description: rawTx.description || masterRecord?.description,
          program: programName,
          packageName,
          transactionType: rawTx.transactionType || 'TRANSACTION',
          language
        },
        tadirData: tadir,
        adtProbe: liveResult.diagnostics?.adtProbe,
        gatewayServices: liveResult.correlatedGatewayServices || [],
        system: targetSystem,
        isLiveMode: true
      });

      const transactionIdentity = this.evidenceEngine.classifyTransactionIdentity({
        tcode,
        isValidFormat: normResult.isValid,
        isLiveMode: true,
        liveProbeResult: liveResult,
        mockTx: null
      });

      return {
        success: true,
        statusCode: 'SUCCESS',
        httpStatus: 200,
        tcode,
        transactionCode: tcode,
        exists: true,
        verificationStatus: liveResult.verificationStatus || 'VERIFIED',
        transactionIdentity,
        description: rawTx.description || masterRecord?.description || `Transaction ${tcode}`,
        transactionDescription: rawTx.description || masterRecord?.description || `Transaction ${tcode}`,
        transactionType: rawTx.transactionType || 'TRANSACTION',
        classification: rawTx.classification || masterRecord?.classification || classificationEval.classification,
        classificationDetails: classificationEval.details,
        program: programName !== 'PENDING_VERIFICATION' ? programName : null,
        programName: programName !== 'PENDING_VERIFICATION' ? programName : null,
        package: packageName !== 'PENDING_VERIFICATION' ? packageName : null,
        packageName: packageName !== 'PENDING_VERIFICATION' ? packageName : null,
        softwareComponent: tadir.softwareComponent || null,
        authorizationObject: rawTx.authorizationObject || null,
        applicationArea: rawTx.functionalArea || null,
        systemId: targetSystem.systemId,
        client: targetSystem.client,
        systemRelease: targetSystem.release,
        mode: 'LIVE_SAP',
        relatedServices: (liveResult.correlatedGatewayServices || []).map((s) => s.technicalServiceName),
        corroboratingServices: (liveResult.correlatedGatewayServices || []).map((s) => s.technicalServiceName),
        relatedObjects: [
          `R3TR:TRAN:${tcode}`,
          programName && programName !== 'PENDING_VERIFICATION' ? `R3TR:PROG:${programName}` : null
        ].filter(Boolean),
        basisAuthorizationRequirements: liveResult.basisAuthorizationRequirements,
        evidence: evidenceCollection.evidence,
        technicalEvidence: evidenceCollection.evidence,
        missingEvidence: evidenceCollection.missingEvidence,
        warnings: [
          ...evidenceCollection.verificationWarnings,
          ...(liveResult.basisAuthorizationRequirements ? [liveResult.basisAuthorizationRequirements.impact] : [])
        ],
        evidenceSources: [
          'Live SAP S21 Gateway Catalog (/sap/opu/odata/IWFND/CATALOGSERVICE;v=2)',
          'SAP ABAP Development Tools Interface (/sap/bc/adt/discovery)',
          'SAP S/4HANA System S21 Landscape Registry'
        ],
        evidenceConfidence: evidenceCollection.overallConfidence,
        provenance: PROVENANCE_CATEGORIES.LIVE_SAP,
        discoveryTimestamp: new Date().toISOString()
      };
    }

    // -------------------------------------------------------------------------
    // B. Curated Demo / Mock Landscape Discovery Execution
    // -------------------------------------------------------------------------
    let mockResult = this.mockAdapter.queryTransaction(systemId, tcode);
    if (!mockResult.success && mockResult.statusCode === 'SYSTEM_NOT_CONFIGURED') {
      mockResult = this.mockAdapter.queryTransaction('S21-200-DEMO', tcode);
    }

    if (!mockResult.success || !mockResult.transaction || !mockResult.transaction.exists) {
      // Check verified master index snapshot before falling back to unindexed state
      const masterRecord = this.masterIndex.lookup(tcode, { systemId: targetSystem.systemId, client: targetSystem.client });
      if (masterRecord) {
        const evidenceCollection = this.evidenceEngine.collectEvidence({
          tcode,
          transactionData: {
            exists: true,
            description: masterRecord.description,
            program: masterRecord.program,
            packageName: masterRecord.packageName,
            transactionType: 'TRANSACTION',
            language
          },
          tadirData: {
            devclass: masterRecord.packageName,
            srcsystem: masterRecord.originalSystem,
            softwareComponent: masterRecord.softwareComponent
          },
          system: targetSystem,
          isLiveMode: false
        });

        const transactionIdentity = this.evidenceEngine.classifyTransactionIdentity({
          tcode,
          isValidFormat: normResult.isValid,
          isLiveMode: false,
          liveProbeResult: null,
          mockTx: { exists: true, classification: masterRecord.classification }
        });

        return {
          success: true,
          statusCode: 'SUCCESS',
          httpStatus: 200,
          tcode,
          transactionCode: tcode,
          transactionIdentity,
          description: masterRecord.description,
          transactionDescription: masterRecord.description,
          classification: masterRecord.classification,
          classificationDetails: { conflictsDetected: [], rulesApplied: ['MASTER_INDEX_VERIFIED'] },
          program: masterRecord.program,
          programName: masterRecord.program,
          package: masterRecord.packageName,
          packageName: masterRecord.packageName,
          softwareComponent: masterRecord.softwareComponent,
          authorizationObject: null,
          applicationArea: null,
          systemId: targetSystem.systemId,
          client: targetSystem.client,
          systemRelease: targetSystem.release,
          mode: 'MOCK',
          isCached: true,
          extractionDate: masterRecord.extractionDate,
          snapshotAgeHours: masterRecord.snapshotAgeHours,
          snapshotVersion: masterRecord.snapshotVersion,
          relatedServices: [],
          corroboratingServices: [],
          relatedObjects: [`R3TR:TRAN:${tcode}`, `R3TR:PROG:${masterRecord.program}`],
          evidence: evidenceCollection.evidence,
          technicalEvidence: evidenceCollection.evidence,
          missingEvidence: evidenceCollection.missingEvidence,
          warnings: [
            `Verified transaction record retrieved from authoritative master snapshot (${masterRecord.systemId}-${masterRecord.client}, extracted ${masterRecord.extractionDate}).`
          ],
          evidenceSources: ['Verified Transaction Master Snapshot (TSTC/TSTCT/TADIR/CVERS)'],
          evidenceConfidence: CONFIDENCE_LEVELS.HIGH,
          provenance: masterRecord.provenance || PROVENANCE_CATEGORIES.CACHED_CATALOGUE,
          discoveryTimestamp: new Date().toISOString()
        };
      }

      // If it's a valid syntax T-Code not found in mock fixtures or master index, handle honestly as unindexed without fabricating data
      const evidenceCollection = this.evidenceEngine.collectEvidence({
        tcode,
        transactionData: { exists: false },
        system: targetSystem,
        isLiveMode: false
      });

      const transactionIdentity = this.evidenceEngine.classifyTransactionIdentity({
        tcode,
        isValidFormat: normResult.isValid,
        isLiveMode: false,
        liveProbeResult: null,
        mockTx: null
      });

      return {
        success: true,
        statusCode: 'SUCCESS',
        httpStatus: 200,
        tcode,
        transactionCode: tcode,
        exists: false,
        verificationStatus: 'NOT_FOUND',
        transactionIdentity,
        description: 'Custom or Unindexed Transaction',
        transactionDescription: 'Custom or Unindexed Transaction',
        isCustomOrUnknown: true,
        classification: 'CUSTOM',
        classificationDetails: { conflictsDetected: [], rulesApplied: ['DEFAULT_CUSTOM_UNINDEXED'] },
        program: null,
        programName: null,
        package: null,
        packageName: null,
        softwareComponent: null,
        authorizationObject: null,
        applicationArea: null,
        systemId: targetSystem.systemId,
        client: targetSystem.client,
        systemRelease: targetSystem.release,
        mode: 'MOCK',
        relatedServices: [],
        corroboratingServices: [],
        relatedObjects: [`R3TR:TRAN:${tcode}`],
        evidence: evidenceCollection.evidence,
        technicalEvidence: evidenceCollection.evidence,
        missingEvidence: evidenceCollection.missingEvidence,
        warnings: [
          'No curated or live dictionary metadata found in verified master snapshot or mock fixtures. Absence from cached snapshot is NOT proof that the transaction does not exist on SAP. Treated as unindexed custom transaction.'
        ],
        evidenceSources: ['Mock DDIC repository fixtures'],
        evidenceConfidence: CONFIDENCE_LEVELS.UNKNOWN,
        provenance: PROVENANCE_CATEGORIES.UNAVAILABLE,
        discoveryTimestamp: new Date().toISOString()
      };
    }

    const tx = mockResult.transaction;
    const evidenceCollection = this.evidenceEngine.collectEvidence({
      tcode,
      transactionData: tx,
      tadirData: tx.tadir || {},
      system: targetSystem,
      isLiveMode: false
    });

    const transactionIdentity = this.evidenceEngine.classifyTransactionIdentity({
      tcode,
      isValidFormat: normResult.isValid,
      isLiveMode: false,
      liveProbeResult: null,
      mockTx: tx
    });

    return {
      success: true,
      statusCode: 'SUCCESS',
      httpStatus: 200,
      tcode,
      transactionCode: tcode,
      transactionIdentity,
      description: tx.description,
      transactionDescription: tx.description,
      transactionType: 'TRANSACTION',
      classification: tx.classification || 'STANDARD',
      classificationDetails: tx.classificationDetails || {},
      program: tx.program || null,
      programName: tx.program || null,
      package: tx.packageName || null,
      packageName: tx.packageName || null,
      softwareComponent: tx.softwareComponent || 'S4CORE 108',
      authorizationObject: tx.authorizationObject || null,
      applicationArea: tx.applicationArea || tx.functionalArea || null,
      systemId: targetSystem.systemId,
      client: targetSystem.client,
      systemRelease: targetSystem.release,
      mode: 'MOCK',
      relatedServices: tx.correlatedGatewayServices || [],
      corroboratingServices: tx.correlatedGatewayServices || [],
      relatedObjects: [`R3TR:TRAN:${tcode}`, tx.program ? `R3TR:PROG:${tx.program}` : null].filter(Boolean),
      evidence: evidenceCollection.evidence,
      technicalEvidence: evidenceCollection.evidence,
      missingEvidence: evidenceCollection.missingEvidence,
      warnings: evidenceCollection.verificationWarnings,
      evidenceSources: ['Mock DDIC repository fixtures', 'Curated transaction mappings'],
      evidenceConfidence: evidenceCollection.overallConfidence,
      provenance: PROVENANCE_CATEGORIES.CURATED_FIXTURE,
      discoveryTimestamp: new Date().toISOString()
    };
  }
}

export const transactionDiscoveryEngine = new TransactionDiscoveryEngine();
