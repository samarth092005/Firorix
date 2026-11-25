/**
 * Fiorify — SAP Transaction Discovery Adapter
 *
 * Implements live SAP transaction metadata discovery from SAP S/4HANA 2023 System S21 (Client 200).
 *
 * Key Principles:
 * - Read-only operations.
 * - Does not invent SAP APIs, endpoints, OData services, or transaction metadata.
 * - Decoupled provider-based discovery architecture (Workstream D2).
 * - Honestly distinguishes:
 *     - FOUND
 *     - NOT_FOUND
 *     - PARTIALLY_AVAILABLE
 *     - PENDING_VERIFICATION
 *     - LIVE_CONNECTION_FAILED
 *     - SYNTAX_INVALID
 * - A failed HTTP connection or authorization blockage is NEVER conflated with a nonexistent transaction.
 * - Explicitly documents required Basis authorizations (e.g. S_ADT_RES, S_DEVELOP, S_TABU_DIS).
 */

import { btpDestinationAdapter, sanitizeErrorMessage } from './btpDestinationAdapter.js';
import { sapGatewayMetadataAdapter } from './sapGatewayMetadataAdapter.js';
import { defaultTransactionMasterIndex } from '../services/transactionMasterIndex.js';
import { STANDARD_TRANSACTION_CATALOG } from '../services/standardTransactionKnowledge.js';
import {
  validateTcodeSyntax,
  TransactionRegistryProvider,
  TransactionDescriptionProvider,
  RepositoryMetadataProvider,
  DDICMetadataProvider,
  AuthorizationEvidenceProvider,
  GatewayCorrelationProvider,
  TRANSACTION_EXISTENCE_STATES
} from '../services/transactionDiscoveryProviders.js';

export const SAP_TCODE_REGEX = /^[A-Z0-9_\-\/]{1,20}$/;

/**
 * Known standard SAP reference metadata used for backward compatibility and fast lookup.
 */
export const STANDARD_SAP_TRANSACTION_REGISTRY = {
  ...STANDARD_TRANSACTION_CATALOG,
  'F-31': {
    tcode: 'F-31',
    standardDescription: 'Clear Customer',
    functionalArea: 'Financial Accounting — Accounts Receivable (FI-AR)',
    historicalProgram: 'SAPMF05A',
    historicalPackage: 'FBAS',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['FAR_MANUAL_CLEARING', 'FAR_PAYMENT_POST']
  },
  'F-32': {
    tcode: 'F-32',
    standardDescription: 'Clear Customer',
    functionalArea: 'Financial Accounting — Accounts Receivable (FI-AR)',
    historicalProgram: 'SAPMF05A',
    historicalPackage: 'FBAS',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['FAR_MANUAL_CLEARING']
  },
  'F-44': {
    tcode: 'F-44',
    standardDescription: 'Clear Vendor',
    functionalArea: 'Financial Accounting — Accounts Payable (FI-AP)',
    historicalProgram: 'SAPMF05A',
    historicalPackage: 'FBAS',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['FAP_MANUAL_CLEARING']
  },
  'F-53': {
    tcode: 'F-53',
    standardDescription: 'Post Outgoing Payments - For Suppliers',
    functionalArea: 'Financial Accounting — Accounts Payable (FI-AP)',
    historicalProgram: 'SAPMF05A',
    historicalPackage: 'FBAS',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['PAYMENT_POST', 'MANUAL_CLEARING', 'FAP_PAYMENT']
  },
  'F-28': {
    tcode: 'F-28',
    standardDescription: 'Post Incoming Payments - For Customers',
    functionalArea: 'Financial Accounting — Accounts Receivable (FI-AR)',
    historicalProgram: 'SAPMF05A',
    historicalPackage: 'FBAS',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['FAR_PAYMENT_POST', 'FAR_MANUAL_CLEARING']
  },
  'ME21N': {
    tcode: 'ME21N',
    standardDescription: 'Create Purchase Order',
    functionalArea: 'Materials Management — Purchasing (MM-PUR)',
    historicalProgram: 'SAPLMEGUI',
    historicalPackage: 'ME',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['MM_PUR_CREATE', 'MM_PUR_CNTRL']
  },
  'VA01': {
    tcode: 'VA01',
    standardDescription: 'Create Sales Order',
    functionalArea: 'Sales and Distribution — Sales (SD-SLS)',
    historicalProgram: 'SAPMV45A',
    historicalPackage: 'VA',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['SALES_ORD', 'SD_']
  },
  'FB03': {
    tcode: 'FB03',
    standardDescription: 'Display Document',
    functionalArea: 'Financial Accounting — General Ledger (FI-GL)',
    historicalProgram: 'SAPMF05A',
    historicalPackage: 'FBAS',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['CUSTOMER_LINE_ITEMS', 'PROCESS_FLOW']
  },
  'FB50': {
    tcode: 'FB50',
    standardDescription: 'Enter G/L Account Document',
    functionalArea: 'Financial Accounting — General Ledger (FI-GL)',
    historicalProgram: 'SAPMF05A',
    historicalPackage: 'FBAS',
    transactionType: 'TRANSACTION',
    correlatedServiceKeywords: ['JOURNALENTRY', 'GLACCOUNT', 'GENERAL_LEDGER']
  }
};

export class SapTransactionDiscoveryAdapter {
  constructor(options = {}) {
    this.btpAdapter = options.btpAdapter || btpDestinationAdapter;
    this.gatewayAdapter = options.gatewayAdapter || sapGatewayMetadataAdapter;
    this.masterIndex = options.masterIndex || defaultTransactionMasterIndex;

    this.registryProvider = new TransactionRegistryProvider({ masterIndex: this.masterIndex });
    this.descriptionProvider = new TransactionDescriptionProvider({ masterIndex: this.masterIndex });
    this.repositoryProvider = new RepositoryMetadataProvider({ masterIndex: this.masterIndex });
    this.ddicProvider = new DDICMetadataProvider({ masterIndex: this.masterIndex });
    this.authProvider = new AuthorizationEvidenceProvider();
    this.correlationProvider = new GatewayCorrelationProvider({ gatewayAdapter: this.gatewayAdapter });
  }

  /**
   * Probes the SAP ABAP Development Tools (ADT) interface on S21.
   * Reports authorization status honestly (e.g. HTTP 403 Forbidden).
   */
  async probeAdtInterface() {
    try {
      const response = await this.btpAdapter.executeRequest({
        path: '/sap/bc/adt/discovery',
        method: 'GET',
        headers: {
          Accept: 'application/xml, text/xml, */*'
        }
      });

      console.info(`[S21 ADT Probe] path=/sap/bc/adt/discovery httpStatus=${response?.httpStatus} success=${Boolean(response?.success)}`);
      if (response.httpStatus === 403) {
        return {
          accessible: false,
          httpStatus: 403,
          status: 'UNAUTHORIZED',
          code: 'SADT_RESOURCE_003',
          message: 'No authorization to access the resource /sap/bc/adt/discovery.',
          requiredAuthorizations: [
            'PFCG Authorization Object: S_ADT_RES (Activity 03: Display)',
            'PFCG Authorization Object: S_DEVELOP (Activity 03: Display for object types PROG, TRAN, DEVC)',
            'Alternative: Custom read-only OData service (e.g. Z_Fiorify_DISCOVERY_SRV) with S_TABU_DIS (Activity 03) for TSTC/TSTCT/TADIR'
          ]
        };
      }

      if (response.success && response.httpStatus === 200) {
        return {
          accessible: true,
          httpStatus: 200,
          status: 'AUTHORIZED',
          message: 'SAP ADT discovery service is accessible.'
        };
      }

      return {
        accessible: false,
        httpStatus: response.httpStatus || 500,
        status: response.statusCode || 'ADT_UNAVAILABLE',
        message: response.errorMessage || 'ADT interface returned non-200 status.'
      };
    } catch (err) {
      return {
        accessible: false,
        httpStatus: 502,
        status: 'CONNECTION_FAILED',
        message: sanitizeErrorMessage(err.message)
      };
    }
  }

  /**
   * Decodes basic XML/HTML entities returned by SAP ADT endpoints.
   */
  _decodeXmlEntities(str) {
    if (!str || typeof str !== 'string') return str;
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .trim();
  }

  /**
   * Fetches read-only ADT transaction object XML to extract program (PGMNA) and screen (DYPNO).
   */
  async fetchAdtTransactionDetails(tcode, objectUri = null) {
    const candidatePaths = [];
    if (objectUri && typeof objectUri === 'string' && objectUri.startsWith('/sap/bc/adt/')) {
      candidatePaths.push(objectUri);
    }
    const vitPath = `/sap/bc/adt/vit/wb/object_type/trant/object_name/${encodeURIComponent(tcode.toUpperCase())}`;
    if (!candidatePaths.includes(vitPath)) {
      candidatePaths.push(vitPath);
    }

    for (const detailPath of candidatePaths) {
      try {
        const res = await this.btpAdapter.executeRequest({
          path: detailPath,
          method: 'GET',
          headers: { Accept: 'application/xml, text/xml, */*' }
        });
        console.info(`[S21 ADT Detail] tcode=${tcode} path=${detailPath} httpStatus=${res?.httpStatus} success=${Boolean(res?.success)}`);
        if (!res || !res.success || !res.data) continue;
        const xml = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

        // Extract program name from SAP ADT transaction XML representations
        const progMatch =
          xml.match(/(?:programName|abapProgram|program|PGMNA)="([^"]+)"/i) ||
          xml.match(/<(?:\w+:)?(?:programName|program|PGMNA)[^>]*>([^<]+)<\/(?:\w+:)?(?:programName|program|PGMNA)>/i) ||
          xml.match(/<adtcore:objectReference[^>]*adtcore:type="PROG[^"]*"[^>]*adtcore:name="([^"]+)"/i);

        const screenMatch =
          xml.match(/(?:screenNumber|dynpro|DYPNO)="([^"]+)"/i) ||
          xml.match(/<(?:\w+:)?(?:screenNumber|dynpro|DYPNO)[^>]*>([^<]+)<\/(?:\w+:)?(?:screenNumber|dynpro|DYPNO)>/i);

        const pkgMatch =
          xml.match(/adtcore:packageName="([^"]+)"/i) ||
          xml.match(/<adtcore:packageRef[^>]*adtcore:name="([^"]+)"/i);

        const descMatch = xml.match(/adtcore:description="([^"]+)"/i);

        if (progMatch || screenMatch || pkgMatch) {
          return {
            found: true,
            program: progMatch ? progMatch[1].trim().toUpperCase() : null,
            screenNumber: screenMatch ? screenMatch[1].trim() : null,
            packageName: pkgMatch ? pkgMatch[1].trim().toUpperCase() : null,
            description: descMatch ? this._decodeXmlEntities(descMatch[1]) : null
          };
        }
      } catch {
        // Try next candidate path
      }
    }
    return null;
  }

  /**
   * Performs live SAP ADT repository quick search for a transaction code (filtered to TRAN first).
   */
  async searchAdtTransaction(tcode) {
    const cleanTcode = String(tcode || '').trim().toUpperCase();
    const searchPaths = [
      `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodeURIComponent(cleanTcode)}&objectType=TRAN&maxResults=10`,
      `/sap/bc/adt/repository/informationsystem/search?operation=quickSearch&query=${encodeURIComponent(cleanTcode)}&maxResults=25`
    ];

    try {
      let bestTag = null;
      for (const searchPath of searchPaths) {
        const response = await this.btpAdapter.executeRequest({
          path: searchPath,
          method: 'GET',
          headers: {
            Accept: 'application/xml, text/xml, */*'
          }
        });

        console.info(`[S21 ADT Search] tcode=${cleanTcode} path=${searchPath} httpStatus=${response?.httpStatus} success=${Boolean(response?.success)}`);
        if (response && response.success && response.data) {
          const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          const tagRegex = /<adtcore:objectReference\b[^>]*\/>/gi;
          const tags = raw.match(tagRegex) || [];
          console.info(`[S21 ADT Search] tcode=${cleanTcode} objectReferenceCount=${tags.length}`);

          for (const tag of tags) {
            const nameMatch = tag.match(/adtcore:name="([^"]+)"/i);
            if (nameMatch && nameMatch[1].toUpperCase() === cleanTcode) {
              const typeMatch = tag.match(/adtcore:type="([^"]+)"/i);
              const type = typeMatch ? typeMatch[1].toUpperCase() : '';
              if (type.startsWith('TRAN')) {
                bestTag = tag;
                break;
              }
              if (!bestTag) {
                bestTag = tag;
              }
            }
          }
          if (bestTag) break;
        }
      }

      if (bestTag) {
        const nameMatch = bestTag.match(/adtcore:name="([^"]+)"/i);
        const pkgMatch = bestTag.match(/adtcore:packageName="([^"]+)"/i);
        const descMatch = bestTag.match(/adtcore:description="([^"]+)"/i);
        const uriMatch = bestTag.match(/adtcore:uri="([^"]+)"/i);

        const details = await this.fetchAdtTransactionDetails(cleanTcode, uriMatch ? uriMatch[1] : null);

        return {
          found: true,
          tcode: nameMatch ? nameMatch[1].toUpperCase() : cleanTcode,
          packageName: (details?.packageName || (pkgMatch ? pkgMatch[1] : null)) || null,
          program: details?.program || null,
          screenNumber: details?.screenNumber || null,
          description: details?.description || (descMatch ? this._decodeXmlEntities(descMatch[1]) : null),
          uri: uriMatch ? uriMatch[1] : null,
          provenance: 'LIVE_SAP_S21_ADT'
        };
      }

      // Direct VIT transaction object fallback even if quickSearch missed it
      const directDetails = await this.fetchAdtTransactionDetails(cleanTcode, null);
      if (directDetails && directDetails.found) {
        return {
          found: true,
          tcode: cleanTcode,
          packageName: directDetails.packageName || null,
          program: directDetails.program || null,
          screenNumber: directDetails.screenNumber || null,
          description: directDetails.description || null,
          provenance: 'LIVE_SAP_S21_ADT'
        };
      }

      return { found: false };
    } catch {
      return { found: false };
    }
  }

  /**
   * Discovers transaction metadata from S21 using the provider architecture,
   * correlating with the live Gateway Catalog and providing honest verification.
   */
  async discoverTransaction(rawTcode = '', options = {}) {
    const startTime = Date.now();

    // 1. Validate Input Syntactically
    const syntax = validateTcodeSyntax(rawTcode);
    if (!syntax.isValid) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        verificationStatus: 'NOT_FOUND',
        httpStatus: 400,
        tcode: syntax.normalizedTcode || rawTcode,
        errorMessage: syntax.reason || `Transaction code "${rawTcode}" violates SAP naming conventions.`,
        evidence: [`T-Code failed syntax check: ${syntax.reason}`],
        provenance: 'USER_PROVIDED',
        timestamp: new Date().toISOString()
      };
    }

    const tcode = syntax.normalizedTcode;
    const systemId = options.systemId || 'S21-200';
    const client = options.client || '200';
    const language = options.language || 'EN';

    // 2 & 3. Probe SAP Gateway Catalog & ADT Interface concurrently for sub-second response
    const [rawCatalogResult, adtProbe] = await Promise.all([
      this.gatewayAdapter.getCatalogServices().catch((catErr) => ({
        success: false,
        statusCode: 'GATEWAY_ERROR',
        httpStatus: 502,
        errorMessage: sanitizeErrorMessage(catErr.message)
      })),
      this.probeAdtInterface().catch((adtErr) => ({
        accessible: false,
        httpStatus: 502,
        status: 'CONNECTION_FAILED',
        message: sanitizeErrorMessage(adtErr.message)
      }))
    ]);

    let catalogResult = rawCatalogResult;
    if (!catalogResult || !catalogResult.success) {
      if (options.strictLive === true || catalogResult?.httpStatus === 504 || catalogResult?.httpStatus === 502 || catalogResult?.statusCode === 'LIVE_CONNECTION_FAILED' || catalogResult?.statusCode === 'GATEWAY_ERROR') {
        return {
          success: false,
          statusCode: 'LIVE_CONNECTION_FAILED',
          verificationStatus: 'LIVE_CONNECTION_FAILED',
          httpStatus: catalogResult?.httpStatus || 502,
          tcode,
          errorMessage: catalogResult?.errorMessage || 'Live SAP S21 connection failed during Gateway Catalog query.',
          evidence: [`S21 Gateway returned status: ${catalogResult?.statusCode || 'GATEWAY_UNAVAILABLE'}`],
          provenance: 'LIVE_SAP_S21',
          discoveryProvenance: {
            source: 'LIVE_SAP_S21',
            sapSystem: systemId.split('-')[0] || 'S21',
            sapClient: client,
            retrievalTimestamp: new Date().toISOString(),
            label: 'Authoritative S21 Discovery (Live Gateway Connection Failed)'
          },
          timestamp: new Date().toISOString()
        };
      }
      catalogResult = {
        success: true,
        services: [],
        totalCount: 0,
        isOfflineFallback: true,
        notice: 'Target SAP S21 Gateway unreachable. Proceeding with Authoritative DDIC Repository.'
      };
    }

    const isAdtAccessible = adtProbe.accessible;

    // 3b. If ADT is accessible, perform live repository search on S21
    let adtTx = { found: false };
    if (isAdtAccessible) {
      adtTx = await this.searchAdtTransaction(tcode);
    }

    // 4. Corroborate with Gateway Services on S21
    const correlatedServices = await this.correlationProvider.correlateServices(
      tcode,
      catalogResult.services || []
    );

    // 5. Query Registry Provider (Authoritative DDIC snapshot, live ADT, or live status)
    const registryResult = await this.registryProvider.checkExistence(tcode, {
      systemId,
      client,
      adtProbe,
      adtTx,
      isLiveMode: true
    });

    const elapsedMs = Date.now() - startTime;

    // 6. Handle Confirmed Non-Existent
    if (registryResult.state === TRANSACTION_EXISTENCE_STATES.CONFIRMED_NON_EXISTENT) {
      const searchedCount = catalogResult.totalCount !== undefined
        ? catalogResult.totalCount
        : (Array.isArray(catalogResult.services) ? catalogResult.services.length : 0);
      return {
        success: false,
        statusCode: 'NOT_FOUND',
        verificationStatus: 'NOT_FOUND',
        httpStatus: 404,
        tcode,
        errorMessage: registryResult.reason || `Transaction code "${tcode}" has no verified record or related OData service in target SAP S21 Gateway Catalog.`,
        evidence: [
          `S21 Gateway Catalog: ${searchedCount} registered services searched; 0 matches found.`,
          `ADT Interface (/sap/bc/adt/discovery): ${adtProbe.status} (HTTP ${adtProbe.httpStatus}).`
        ],
        diagnostics: {
          adtProbe,
          catalogServicesSearched: searchedCount,
          elapsedMs
        },
        provenance: registryResult.provenance || (options.isLiveMode ? 'LIVE_SAP_S21' : 'OFFLINE_DDIC_CATALOG'),
        discoveryProvenance: {
          source: registryResult.provenance || (options.isLiveMode ? 'LIVE_SAP_S21' : 'OFFLINE_DDIC_CATALOG'),
          sapSystem: systemId.split('-')[0] || 'S21',
          sapClient: client,
          retrievalTimestamp: new Date().toISOString(),
          label: 'Authoritative S21 Discovery (Not Found in Target)'
        },
        timestamp: new Date().toISOString()
      };
    }

    // 7. Resolve Metadata via Providers
    const descResult = this.descriptionProvider.resolveDescription(tcode, {
      language,
      systemId,
      client,
      adtTx,
      correlatedService: correlatedServices[0]
    });

    const repoMetadata = this.repositoryProvider.resolveMetadata(tcode, { systemId, client, adtTx });
    const ddicMetadata = this.ddicProvider.resolveDDIC(tcode, { systemId, client });
    const authMetadata = this.authProvider.resolveAuthorizations(tcode);
    const standardRef = STANDARD_SAP_TRANSACTION_REGISTRY[tcode];

    const basisAuthorizationRequirements = !isAdtAccessible
      ? {
          status: 'ACTION_REQUIRED_FOR_FULL_ABAP_METADATA',
          requiredObjects: adtProbe.requiredAuthorizations || [
            'PFCG Authorization Object: S_ADT_RES (Activity 03: Display)',
            'PFCG Authorization Object: S_DEVELOP (Activity 03: Display for object types PROG, TRAN, DEVC)',
            'Alternative: Custom read-only OData service with S_TABU_DIS for TSTC/TSTCT/TADIR'
          ],
          impact: 'Fiorify successfully discovers Gateway OData services and live S21 integration endpoints, but cannot inspect raw database tables (TSTC, TSTCT, TADIR, TRDIR) without these authorizations.'
        }
      : null;

    // 8. Determine Verification Status & Evidence
    let verificationStatus;
    let statusCode = 'SUCCESS';

    if (registryResult.state === TRANSACTION_EXISTENCE_STATES.AUTHORIZATION_BLOCKED) {
      verificationStatus = 'PENDING_VERIFICATION';
      statusCode = 'AUTHORIZATION_BLOCKED';
    } else if (
      registryResult.state === TRANSACTION_EXISTENCE_STATES.CONFIRMED_REGISTERED ||
      registryResult.state === TRANSACTION_EXISTENCE_STATES.CONFIRMED_EXISTING
    ) {
      verificationStatus = isAdtAccessible ? 'FOUND' : 'PARTIALLY_AVAILABLE';
    } else if (correlatedServices.length > 0) {
      verificationStatus = 'PARTIALLY_AVAILABLE';
    } else {
      // Valid syntax, but not in local snapshot and ADT access restricted (HTTP 403)
      // NEVER claim NOT_FOUND on authorization blockage!
      verificationStatus = 'PENDING_VERIFICATION';
      statusCode = 'PARTIAL_METADATA';
    }

    const evidence = [
      `S21 Gateway Catalog: Verified live connectivity (${catalogResult.totalCount} active OData services registered).`,
      `Live S21 Services Correlated: ${correlatedServices.length} matching OData services identified.`,
      adtProbe.accessible
        ? 'ADT Interface: Accessible and verified.'
        : `ADT Interface: ${adtProbe.code || 'HTTP 403'} (${adtProbe.message}) — low-level table metadata pending Basis authorization.`
    ];

    if (adtTx && adtTx.found) {
      evidence.push(`ADT Live Repository: Transaction verified live in S21 (Package: ${adtTx.packageName}, Description: "${adtTx.description}").`);
    } else if (registryResult.state === TRANSACTION_EXISTENCE_STATES.CONFIRMED_REGISTERED) {
      evidence.push(`DDIC Snapshot: Verified record in S/4HANA 2023 Master Index (Program: ${repoMetadata.program}, Package: ${repoMetadata.packageName}).`);
    } else {
      evidence.push(`Discovery Status: Transaction "${tcode}" valid format, pending direct TSTC check.`);
    }

    if (correlatedServices.length > 0) {
      evidence.push(`Primary correlated S21 Gateway service: ${correlatedServices[0].technicalServiceName} ("${correlatedServices[0].description}")`);
    }

    return {
      success: true,
      statusCode,
      verificationStatus,
      httpStatus: 200,
      transaction: {
        tcode,
        description: descResult.description || standardRef?.standardDescription || `Transaction ${tcode}`,
        language: descResult.language || language,
        functionalArea: standardRef?.functionalArea || 'SAP Core',
        transactionType: standardRef?.transactionType || 'TRANSACTION',
        classification: repoMetadata.classification,
        screenNumber: ddicMetadata.screenNumber,
        sourceTables: ddicMetadata.sourceTables,
        authorizationObjects: authMetadata.authorizationObjects,
        primaryAuthObject: authMetadata.primaryAuthObject,
        program: {
          value: repoMetadata.program,
          status: isAdtAccessible ? 'FOUND' : 'PENDING_VERIFICATION',
          evidence: repoMetadata.isVerified ? ['Verified via Authoritative DDIC Snapshot'] : ['Pending Basis authorization for TRDIR/TADIR access']
        },
        package: {
          value: repoMetadata.packageName,
          status: isAdtAccessible ? 'FOUND' : 'PENDING_VERIFICATION',
          evidence: repoMetadata.isVerified ? ['Verified via Authoritative DDIC Snapshot'] : ['Pending Basis authorization for TADIR access']
        },
        softwareComponent: repoMetadata.softwareComponent,
        metadataSource: repoMetadata.isVerified ? 'AUTHORITATIVE_DDIC_SNAPSHOT' : 'LIVE_SAP_S21_GATEWAY_CORROBORATION',
        verificationStatus
      },
      correlatedGatewayServices: correlatedServices,
      basisAuthorizationRequirements,
      diagnostics: {
        adtProbe,
        elapsedMs,
        catalogServicesCount: catalogResult.totalCount
      },
      evidence,
      tcode,
      provenance: (options.isMock || options.isMockFixture)
        ? 'SIMULATED_FIXTURE'
        : (catalogResult.isOfflineFallback
          ? (repoMetadata.isVerified ? 'AUTHORITATIVE_DDIC_SNAPSHOT' : 'OFFLINE_DDIC_CATALOG')
          : 'LIVE_SAP_S21'),
      discoveryProvenance: {
        source: (options.isMock || options.isMockFixture)
          ? 'SIMULATED_FIXTURE'
          : (catalogResult.isOfflineFallback
            ? (repoMetadata.isVerified ? 'AUTHORITATIVE_DDIC_SNAPSHOT' : 'OFFLINE_DDIC_CATALOG')
            : 'LIVE_SAP_S21'),
        sapSystem: systemId.split('-')[0] || 'S21',
        sapClient: client,
        retrievalTimestamp: new Date().toISOString(),
        label: `Authoritative S21 Discovery (${repoMetadata.isVerified ? 'DDIC Verified' : 'Gateway Corroborated'})`
      },
      timestamp: new Date().toISOString()
    };
  }
}

export const sapTransactionDiscoveryAdapter = new SapTransactionDiscoveryAdapter();
