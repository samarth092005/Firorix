import { EvidenceClassifier } from '../evidenceClassifier.js';
import { sapTransactionDiscoveryAdapter } from './sapTransactionDiscoveryAdapter.js';

export class LiveSapAdapter {
  constructor(timeoutMs = 15000, options = {}) {
    this.timeoutMs = timeoutMs;
    this.discoveryAdapter = options.discoveryAdapter || sapTransactionDiscoveryAdapter;
  }

  async queryTransaction(system, rawTcode) {
    if (!rawTcode || typeof rawTcode !== 'string') {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: 'Transaction code must not be empty.'
      };
    }

    const trimmed = rawTcode.trim().toUpperCase();
    if (trimmed.length === 0) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: 'Transaction code cannot be blank whitespace.'
      };
    }

    const sapTcodeRegex = /^[A-Z0-9_\-\/]{1,20}$/;
    if (!sapTcodeRegex.test(trimmed)) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        system,
        errorMessage: `Transaction code "${trimmed}" violates SAP naming conventions.`
      };
    }

    // Perform live SAP transaction discovery via S21 Gateway Catalog & ADT Probing
    const discoveryResult = await this.discoveryAdapter.discoverTransaction(trimmed);

    if (!discoveryResult.success) {
      const isConnectionFailure = discoveryResult.statusCode === 'LIVE_CONNECTION_FAILED';
      return {
        success: false,
        statusCode: isConnectionFailure ? 'CONNECTION_ERROR' : (discoveryResult.statusCode || 'NOT_FOUND'),
        system,
        errorMessage: discoveryResult.errorMessage || `Transaction "${trimmed}" could not be discovered on live SAP S21.`,
        transaction: {
          tcode: trimmed,
          exists: false,
          classification: 'UNKNOWN',
          metadataStatus: 'NOT_AVAILABLE',
          verificationStatus: discoveryResult.verificationStatus || 'NOT_FOUND',
          evidence: discoveryResult.evidence || []
        }
      };
    }

    const discovered = discoveryResult.transaction;
    const programName = typeof discovered.program === 'object' ? discovered.program.value : discovered.program;
    const packageName = typeof discovered.package === 'object' ? discovered.package.value : discovered.package;
    const isStandard = !trimmed.startsWith('Z') && !trimmed.startsWith('Y');

    const tadir = {
      pgmid: 'R3TR',
      object: 'TRAN',
      objName: trimmed,
      devclass: packageName !== 'PENDING_VERIFICATION' ? packageName : undefined,
      srcsystem: isStandard ? 'SAP' : undefined,
      softwareComponent: isStandard ? 'S4CORE 108' : undefined
    };

    const classificationEval = EvidenceClassifier.classify({
      tcode: trimmed,
      program: programName !== 'PENDING_VERIFICATION' ? programName : undefined,
      packageName: packageName !== 'PENDING_VERIFICATION' ? packageName : undefined,
      originalSystem: isStandard ? 'SAP' : undefined,
      softwareComponent: isStandard ? 'S4CORE 108' : undefined,
      tadir
    });

    const metadataStatus = (programName && programName !== 'PENDING_VERIFICATION' && discovered.description)
      ? 'COMPLETE'
      : 'INCOMPLETE';

    const evidence = [
      `Live SAP S/4HANA query to ${system.systemId} (Client ${system.client})`,
      `Gateway Catalog discovery status: ${discoveryResult.verificationStatus}`,
      discovered.description ? `Discovered description: "${discovered.description}"` : 'Description: [Pending]',
      programName ? `Program: ${programName}` : 'Program: [Pending]',
      packageName ? `Package: ${packageName}` : 'Package: [Pending]',
      ...discoveryResult.evidence
    ];

    return {
      success: true,
      system,
      transaction: {
        tcode: trimmed,
        exists: true,
        classification: classificationEval.classification,
        description: discovered.description,
        program: programName,
        packageName,
        originalSystem: isStandard ? 'SAP' : undefined,
        softwareComponent: isStandard ? 'S4CORE 108' : undefined,
        metadataStatus,
        verificationStatus: discoveryResult.verificationStatus,
        correlatedGatewayServices: discoveryResult.correlatedGatewayServices || [],
        basisAuthorizationRequirements: discoveryResult.basisAuthorizationRequirements,
        evidence,
        tadir,
        classificationDetails: classificationEval.details
      }
    };
  }
}

export const liveSapAdapter = new LiveSapAdapter();
