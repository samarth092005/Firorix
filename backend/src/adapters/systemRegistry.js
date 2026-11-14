/**
 * Fiorify — SAP Landscape & System Registry (SAP-LIVE-01 & ENTERPRISE-01)
 *
 * Implements:
 * - Multi-system registry with environment classification (DEV, QAS, PRD, SANDBOX).
 * - Comprehensive read-only connection diagnostics:
 *   1. BTP Destination resolution
 *   2. Authentication check
 *   3. Network & Cloud Connector reachability
 *   4. SAP Gateway Catalog service availability (/IWFND/CATALOGSERVICE;v=2)
 *   5. ADT interface probing (/sap/bc/adt/discovery)
 *   6. Release & component metadata verification
 * - Granular diagnostic states:
 *   CONNECTED, AUTHENTICATION_FAILED, DESTINATION_NOT_FOUND, NETWORK_UNREACHABLE,
 *   CLOUD_CONNECTOR_UNAVAILABLE, SERVICE_UNAVAILABLE, AUTHORIZATION_BLOCKED,
 *   PARTIAL_CONNECTIVITY, UNKNOWN.
 * - Evidence provenance tracking for all technical objects.
 */

import { btpDestinationAdapter, sanitizeErrorMessage } from './btpDestinationAdapter.js';
import { sapGatewayMetadataAdapter } from './sapGatewayMetadataAdapter.js';
import { sapTransactionDiscoveryAdapter } from './sapTransactionDiscoveryAdapter.js';
import { SapSystemRepository } from '../infrastructure/db/repositories/sapSystemRepository.js';
import { defaultSapConnectionHealthService, SapConnectionHealthService } from '../infrastructure/connectivity/sapConnectionHealthService.js';

export const CONNECTIVITY_STATUSES = Object.freeze({
  CONNECTED: 'CONNECTED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  DESTINATION_NOT_FOUND: 'DESTINATION_NOT_FOUND',
  NETWORK_UNREACHABLE: 'NETWORK_UNREACHABLE',
  CLOUD_CONNECTOR_UNAVAILABLE: 'CLOUD_CONNECTOR_UNAVAILABLE',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  AUTHORIZATION_BLOCKED: 'AUTHORIZATION_BLOCKED',
  PARTIAL_CONNECTIVITY: 'PARTIAL_CONNECTIVITY',
  UNKNOWN: 'UNKNOWN'
});

export const EVIDENCE_PROVENANCE = Object.freeze({
  USER_PROVIDED: 'USER_PROVIDED',
  FORMAT_VALIDATED: 'FORMAT_VALIDATED',
  LIVE_SAP_VERIFIED: 'LIVE_SAP_VERIFIED',
  CURATED_FIXTURE: 'CURATED_FIXTURE',
  INFERRED: 'INFERRED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  BLOCKED_BY_AUTHORIZATION: 'BLOCKED_BY_AUTHORIZATION',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const DEFAULT_SAP_SYSTEMS = Object.freeze([
  {
    systemId: 'S21-200',
    displayName: 'SAP S/4HANA 2023 Private Edition (Client 200)',
    systemName: 'S21 SAP S/4HANA 2023 Private Edition (Live Target)',
    environment: 'PRODUCTION',
    mode: 'LIVE_SAP',
    active: true,
    product: 'SAP S/4HANA',
    deploymentEdition: 'Private Edition',
    release: 'SAP S/4HANA 2023 Private Edition',
    clientIdentifier: '200',
    client: '200',
    destinationName: 'S21',
    rfcDestination: 'S21_RFC_DISCOVERY',
    gatewayCatalogService: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
    adtDiscoveryEndpoint: '/sap/bc/adt/discovery',
    connectivityStatus: CONNECTIVITY_STATUSES.UNKNOWN,
    lastSuccessfulCheck: null,
    evidenceProvenance: EVIDENCE_PROVENANCE.PENDING_VERIFICATION,
    configurationStatus: 'CONFIGURED',
    components: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
    softwareComponents: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
    capabilities: ['GATEWAY_CATALOG', 'ODATA_V2', 'ODATA_V4', 'FIORI_LAUNCHPAD']
  },
  {
    systemId: 'S21-200-DEV',
    displayName: 'SAP S/4HANA 2023 Development (Client 200)',
    systemName: 'S/4HANA Development (Client 200)',
    environment: 'DEVELOPMENT',
    mode: 'MOCK',
    active: true,
    product: 'SAP S/4HANA',
    deploymentEdition: 'Private Edition',
    release: 'SAP S/4HANA 2023',
    clientIdentifier: '200',
    client: '200',
    destinationName: 'S21_DEV',
    gatewayCatalogService: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
    adtDiscoveryEndpoint: '/sap/bc/adt/discovery',
    connectivityStatus: CONNECTIVITY_STATUSES.UNKNOWN,
    lastSuccessfulCheck: null,
    evidenceProvenance: EVIDENCE_PROVENANCE.PENDING_VERIFICATION,
    configurationStatus: 'CONFIGURED',
    components: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
    softwareComponents: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
    capabilities: ['GATEWAY_CATALOG', 'ODATA_V2', 'ABAP_CLOUD']
  },
  {
    systemId: 'S21-200-QAS',
    displayName: 'SAP S/4HANA 2023 Quality Assurance (Client 200)',
    systemName: 'S/4HANA Quality Assurance (Client 200)',
    environment: 'QA',
    mode: 'MOCK',
    active: true,
    product: 'SAP S/4HANA',
    deploymentEdition: 'Private Edition',
    release: 'SAP S/4HANA 2023',
    clientIdentifier: '200',
    client: '200',
    destinationName: 'S21_QAS',
    gatewayCatalogService: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
    adtDiscoveryEndpoint: '/sap/bc/adt/discovery',
    connectivityStatus: CONNECTIVITY_STATUSES.UNKNOWN,
    lastSuccessfulCheck: null,
    evidenceProvenance: EVIDENCE_PROVENANCE.PENDING_VERIFICATION,
    configurationStatus: 'CONFIGURED',
    components: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
    softwareComponents: ['S4CORE 108', 'SAP_BASIS 758', 'SAP_UI 758', 'SAP_GWFND 758'],
    capabilities: ['GATEWAY_CATALOG', 'ODATA_V2', 'FIORI_LAUNCHPAD']
  },
  {
    systemId: 'ECC-100',
    displayName: 'SAP ERP 6.0 EHP8 on HANA (Client 100)',
    systemName: 'SAP ERP 6.0 EHP8 (Legacy Source)',
    environment: 'PRODUCTION',
    mode: 'MOCK',
    active: true,
    product: 'SAP ERP',
    deploymentEdition: 'On-Premise',
    release: 'SAP ECC 6.0 EHP8',
    clientIdentifier: '100',
    client: '100',
    destinationName: 'ECC_100',
    gatewayCatalogService: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
    adtDiscoveryEndpoint: '/sap/bc/adt/discovery',
    connectivityStatus: CONNECTIVITY_STATUSES.UNKNOWN,
    lastSuccessfulCheck: null,
    evidenceProvenance: EVIDENCE_PROVENANCE.PENDING_VERIFICATION,
    configurationStatus: 'CONFIGURED',
    components: ['SAP_APPL 618', 'SAP_BASIS 750'],
    softwareComponents: ['SAP_APPL 618', 'SAP_BASIS 750'],
    capabilities: ['CLASSIC_DYNPRO', 'WEBGUI', 'RFC']
  }
]);

export class SystemRegistry {
  constructor(options = {}) {
    this.systems = new Map(DEFAULT_SAP_SYSTEMS.map((s) => [s.systemId, { ...s }]));
    this.btpAdapter = options.btpAdapter || btpDestinationAdapter;
    this.gatewayAdapter = options.gatewayAdapter || sapGatewayMetadataAdapter;
    this.discoveryAdapter = options.discoveryAdapter || sapTransactionDiscoveryAdapter;
    this.healthService = options.healthService || defaultSapConnectionHealthService;

    const persistenceEnv = (process.env.FIORIFY_PERSISTENCE || process.env.Fiorify_PERSISTENCE || '').toLowerCase();
    this.useDatabase = options.useDatabase !== undefined ? options.useDatabase : (persistenceEnv === 'postgres');
    this.repository = options.repository || (this.useDatabase ? new SapSystemRepository() : null);
    this.defaultTenantId = options.tenantId || 'DEFAULT-TENANT-S21';
  }

  /**
   * Retrieves all registered SAP system profiles.
   */
  async listSystems(tenantId = this.defaultTenantId) {
    if (this.repository) {
      try {
        const dbList = await this.repository.list({}, tenantId);
        if (dbList && dbList.length > 0) {
          // Merge with memory map to preserve rich UI metadata
          return dbList.map(dbItem => {
            const memItem = this.systems.get(dbItem.systemId) || {};
            return {
              ...memItem,
              ...dbItem,
              connectivityStatus: dbItem.connectionState || dbItem.connectivityStatus || memItem.connectivityStatus
            };
          });
        }
      } catch (err) {
        console.warn('[SystemRegistry] Database query error, falling back to memory:', err.message);
      }
    }
    return Array.from(this.systems.values());
  }

  /**
   * Synchronous list for backwards compatibility
   */
  listSystemsSync() {
    return Array.from(this.systems.values());
  }

  /**
   * Retrieves a specific SAP system profile by ID.
   */
  async getSystem(systemId, tenantId = this.defaultTenantId) {
    if (!systemId) return null;
    if (this.repository) {
      try {
        const dbItem = await this.repository.getById(systemId, tenantId);
        if (dbItem) {
          const memItem = this.systems.get(systemId) || {};
          return {
            ...memItem,
            ...dbItem,
            connectivityStatus: dbItem.connectionState || dbItem.connectivityStatus || memItem.connectivityStatus
          };
        }
      } catch (err) {
        console.warn('[SystemRegistry] Database get error, falling back to memory:', err.message);
      }
    }
    return this.systems.get(systemId) || null;
  }

  /**
   * Synchronous get for backwards compatibility
   */
  getSystemSync(systemId) {
    if (!systemId) return null;
    return this.systems.get(systemId) || null;
  }

  /**
   * Registers or updates an SAP system profile.
   */
  async registerSystem(profile, tenantId = this.defaultTenantId) {
    if (!profile || (!profile.systemId && !profile.system_id)) {
      throw new Error('System profile requires a non-empty systemId.');
    }
    const systemId = String(profile.systemId || profile.system_id).trim();
    const sanitized = {
      systemId,
      tenantId: profile.tenantId || tenantId,
      displayName: String(profile.displayName || profile.description || systemId).trim(),
      description: String(profile.description || profile.displayName || `SAP S/4HANA ${systemId}`).trim(),
      environment: String(profile.environment || 'SANDBOX').toUpperCase(),
      product: String(profile.product || 'SAP S/4HANA').trim(),
      deploymentEdition: String(profile.deploymentEdition || profile.deployment_type || 'Private Edition').trim(),
      deploymentType: String(profile.deploymentType || profile.deployment_type || 'Private Edition').trim(),
      release: String(profile.release || 'SAP S/4HANA 2023 Private Edition').trim(),
      clientIdentifier: String(profile.clientIdentifier || profile.client || '200').trim(),
      client: String(profile.client || profile.clientIdentifier || '200').trim(),
      destinationName: String(profile.destinationName || profile.destination_name || systemId).trim(),
      connectionMode: String(profile.connectionMode || profile.connection_mode || 'DIRECT_HTTP').toUpperCase(),
      baseUrl: profile.baseUrl || profile.base_url || null,
      gatewayCatalogService: profile.gatewayCatalogService || profile.gateway_catalog_path || '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
      gatewayCatalogPath: profile.gatewayCatalogPath || profile.gateway_catalog_path || '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
      adtDiscoveryEndpoint: profile.adtDiscoveryEndpoint || profile.adt_discovery_path || '/sap/bc/adt/discovery',
      adtDiscoveryPath: profile.adtDiscoveryPath || profile.adt_discovery_path || '/sap/bc/adt/discovery',
      authType: String(profile.authType || profile.auth_type || 'BASIC').toUpperCase(),
      authSecretRef: profile.authSecretRef || profile.auth_secret_ref || null,
      tlsConfig: profile.tlsConfig || profile.tls_config || { rejectUnauthorized: true },
      isReadOnly: true, // Non-negotiable SAP safety directive
      connectivityStatus: profile.connectivityStatus || profile.connection_state || CONNECTIVITY_STATUSES.UNKNOWN,
      connectionState: profile.connectionState || profile.connectivityStatus || 'CONFIGURED',
      lastSuccessfulCheck: new Date().toISOString(),
      evidenceProvenance: profile.evidenceProvenance || EVIDENCE_PROVENANCE.USER_PROVIDED,
      configurationStatus: 'CONFIGURED',
      components: Array.isArray(profile.components) ? profile.components : ['S4CORE 108'],
      capabilities: Array.isArray(profile.capabilities) ? profile.capabilities : ['GATEWAY_CATALOG']
    };

    this.systems.set(sanitized.systemId, sanitized);

    if (this.repository) {
      try {
        await this.repository.upsert(sanitized, sanitized.tenantId);
      } catch (repoErr) {
        console.warn('[SystemRegistry] Database upsert warning:', repoErr.message);
      }
    }

    return sanitized;
  }

  /**
   * Executes a controlled, read-only diagnostic check against a configured SAP system.
   */
  async runDiagnostics(systemId, userContext = null) {
    const tenantId = userContext?.tenantId || this.defaultTenantId;
    const system = await this.getSystem(systemId, tenantId);
    if (!system) {
      return {
        success: false,
        systemId,
        connectivityStatus: CONNECTIVITY_STATUSES.DESTINATION_NOT_FOUND,
        errorMessage: `System "${systemId}" is not registered in the SAP landscape registry.`
      };
    }

    const checkTimestamp = new Date().toISOString();
    const startTime = Date.now();

    // Execute through hardened SapConnectionHealthService
    let healthReport;
    if (system.mode === 'MOCK' || system.mode === 'DEMO' || process.env.Fiorify_DEMO_MODE === 'true') {
      healthReport = {
        success: true,
        status: CONNECTIVITY_STATUSES.CONNECTED,
        capabilities: {
          DESTINATION_RESOLUTION: { tested: true, supported: true, status: 'VERIFIED', details: 'Mock destination resolved successfully' },
          CLOUD_CONNECTOR_REACHABILITY: { tested: true, supported: true, status: 'VERIFIED', details: 'Mock network connection verified' },
          AUTHENTICATION: { tested: true, supported: true, status: 'VERIFIED', details: 'Mock credentials validated' },
          GATEWAY_CATALOG: { tested: true, supported: true, status: 'VERIFIED', details: 'Mock gateway catalog service verified' },
          ADT_DISCOVERY: { tested: true, supported: true, status: 'VERIFIED', details: 'Mock ADT discovery verified' }
        }
      };
    } else {
      try {
        healthReport = await this.healthService.runHealthCheck({
          destinationName: system.destinationName || system.systemId,
          connectionMode: system.connectionMode || (system.baseUrl ? 'DIRECT_HTTP' : 'BTP_DESTINATION'),
          baseUrl: system.baseUrl,
          sapClient: system.client,
          gatewayCatalogPath: system.gatewayCatalogPath || system.gatewayCatalogService,
          adtDiscoveryPath: system.adtDiscoveryPath || system.adtDiscoveryEndpoint,
          release: system.release
        });
      } catch (healthErr) {
        healthReport = {
          success: false,
          status: CONNECTIVITY_STATUSES.SERVICE_UNAVAILABLE,
          capabilities: {},
          errorMessage: sanitizeErrorMessage(healthErr.message)
        };
      }
    }

    const responseTimeMs = Date.now() - startTime;
    const overallStatus = healthReport.status || CONNECTIVITY_STATUSES.UNKNOWN;
    const checks = {
      destinationResolution: healthReport.capabilities?.DESTINATION_RESOLUTION || { status: 'PENDING' },
      authentication: healthReport.capabilities?.AUTHENTICATION || { status: 'PENDING' },
      networkReachability: healthReport.capabilities?.CLOUD_CONNECTOR_REACHABILITY || { status: 'PENDING' },
      cloudConnector: healthReport.capabilities?.CLOUD_CONNECTOR_REACHABILITY || { status: 'PENDING' },
      gatewayCatalog: healthReport.capabilities?.GATEWAY_CATALOG || { status: 'PENDING' },
      adtDiscovery: healthReport.capabilities?.ADT_DISCOVERY || { status: 'PENDING' }
    };

    // Update system record in memory
    system.connectivityStatus = overallStatus;
    system.connectionState = overallStatus;
    system.lastSuccessfulCheck = checkTimestamp;
    system.lastDiagnosticAt = checkTimestamp;
    if (healthReport.success) {
      system.lastSuccessfulConnectionAt = checkTimestamp;
    }

    const diagnosticResult = {
      success: healthReport.success || overallStatus === CONNECTIVITY_STATUSES.CONNECTED || overallStatus === CONNECTIVITY_STATUSES.PARTIAL_CONNECTIVITY,
      systemId: system.systemId,
      displayName: system.displayName,
      product: system.product,
      release: system.release,
      environment: system.environment,
      connectionMode: system.connectionMode || 'DIRECT_HTTP',
      connectivityStatus: overallStatus,
      connectionState: overallStatus,
      timestamp: checkTimestamp,
      responseTimeMs,
      checks,
      remediationGuidance: checks.adtDiscovery?.status === 'AUTHORIZATION_FAILED' || checks.adtDiscovery?.status === 'BLOCKED_BY_AUTHORIZATION'
        ? 'SAP Gateway is accessible, but ADT repository discovery is restricted. Request Basis administrator to grant S_ADT_RES display authorization.'
        : (overallStatus === CONNECTIVITY_STATUSES.CONNECTED ? 'System is fully operational for read-only transaction discovery and Fiori catalogue matching.' : 'Review SAP connection parameters and network reachability.')
    };

    // Persist to PostgreSQL if repository is active
    if (this.repository) {
      try {
        await this.repository.updateDiagnostics(system.systemId, diagnosticResult, tenantId);
        await this.repository.recordDiagnosticHistory({
          systemProfileId: system.systemId,
          connectionMode: system.connectionMode || 'DIRECT_HTTP',
          connectionState: overallStatus,
          gatewayStatus: checks.gatewayCatalog?.status || 'UNKNOWN',
          adtStatus: checks.adtDiscovery?.status || 'UNKNOWN',
          responseTimeMs,
          diagnosticDetails: diagnosticResult,
          errorMessage: healthReport.errorMessage || null,
          executedBy: userContext?.id || 'SYSTEM'
        }, tenantId);
      } catch (persistErr) {
        console.warn('[SystemRegistry] Diagnostic persistence error:', persistErr.message);
      }
    }

    return diagnosticResult;
  }

  /**
   * Retrieves diagnostic history for a system profile.
   */
  async getDiagnosticHistory(systemId, tenantId = this.defaultTenantId, limit = 20) {
    if (this.repository) {
      return await this.repository.getDiagnosticHistory(systemId, tenantId, limit);
    }
    return [];
  }

  /**
   * Inspects OData $metadata for an allowlisted service endpoint
   */
  async inspectGatewayMetadata(systemId, servicePath, tenantId = this.defaultTenantId) {
    const system = await this.getSystem(systemId, tenantId);
    if (!system) {
      return { success: false, statusCode: 'NOT_FOUND', errorMessage: `System "${systemId}" not found.` };
    }

    return await this.healthService.inspectGatewayMetadata(servicePath, {
      destinationName: system.destinationName || system.systemId,
      connectionMode: system.connectionMode || (system.baseUrl ? 'DIRECT_HTTP' : 'BTP_DESTINATION'),
      baseUrl: system.baseUrl,
      sapClient: system.client
    });
  }
}

export const defaultSystemRegistry = new SystemRegistry();
export const systemRegistry = defaultSystemRegistry;
