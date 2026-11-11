/**
 * FioriX — Official SAP Fiori Apps Reference Library Adapter
 *
 * Integrates directly with the official SAP Fiori Apps Reference Library
 * to retrieve real, machine-readable application catalogue information.
 *
 * Primary Public Portal:
 * - https://fioriappslibrary.hana.ondemand.com/
 *
 * Integration Endpoint:
 * - https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/InputFilterParam(InpFilterValue='1NA')/Results
 *
 * Key Capabilities:
 * - Search by Application ID (e.g. F1612, F-53, F0771, F3616).
 * - Search by Application Name (e.g. "Post Outgoing Payments").
 * - Search by Business Process / Line of Business.
 * - Search by T-Code where a verified relationship exists.
 * - Multi-criteria filtering (Product Version, Application Type).
 * - Normalizes data model with full technical and functional attributes.
 * - Compares candidate app OData service dependencies against live S21 Gateway metadata.
 * - Resilient local filesystem caching (`backend/data/fiori_app_catalog_cache.json`).
 * - Distinguishes OFFICIAL_CATALOGUE_LIVE from OFFICIAL_CATALOGUE_CACHED.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanitizeErrorMessage } from './btpDestinationAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function resolveCanonicalCatalogueCachePath() {
  return path.resolve(__dirname, '../../data/fiori_app_catalog_cache.json');
}

export function resolveCanonicalCatalogueStatusPath() {
  return path.resolve(__dirname, '../../data/fiori_app_catalog_status.json');
}

export const CATALOGUE_AVAILABILITY_STATES = Object.freeze({
  LIVE_AVAILABLE: 'LIVE_AVAILABLE',
  CACHE_AVAILABLE: 'CACHE_AVAILABLE',
  LIVE_AND_CACHE_AVAILABLE: 'LIVE_AND_CACHE_AVAILABLE',
  OFFICIAL_EXPORT_IMPORTED: 'OFFICIAL_EXPORT_IMPORTED',
  EMPTY_CATALOGUE: 'EMPTY_CATALOGUE',
  SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
  SEARCH_INCOMPLETE: 'SEARCH_INCOMPLETE',
  INVALID_SOURCE_RESPONSE: 'INVALID_SOURCE_RESPONSE'
});

export const OFFICIAL_FIORI_LIBRARY_BASE_URL =
  'https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/services/SingleApp.xsodata/InputFilterParam(InpFilterValue=\'1NA\')/Results';

/**
 * Extracts and cleans OData service names from raw library string.
 * Example: "$$,$FAP_PAYMENT_POST_SRV$" -> ["FAP_PAYMENT_POST_SRV"]
 */
export function extractODataServices(raw = '') {
  if (!raw || typeof raw !== 'string') return [];
  const tokens = raw.split(/[\$,;|\s]+/).map((s) => s.trim()).filter(Boolean);
  return [...new Set(tokens.filter((t) => t.length > 2))];
}

/**
 * Normalizes raw Fiori Apps Library record into the FioriX catalogue data model.
 */
export function normalizeCatalogueApp(rawApp, provenance = 'OFFICIAL_CATALOGUE_LIVE') {
  if (!rawApp || typeof rawApp !== 'object') return null;

  const appId = rawApp.appId || rawApp.AppId || '';
  const appName = rawApp.AppName || rawApp.AppNameAll || appId;
  const appType = rawApp.ApplicationType || rawApp.AppTypeCombined || 'Transactional';
  const isSapGui = appType === 'SAP GUI' || rawApp.UITechnologyCombined?.includes('SAP GUI');
  const uiTechnology = isSapGui
    ? 'SAP GUI for HTML'
    : (rawApp.UITechnologyCombined?.replace(/\$/g, '').trim() || 'SAP Fiori elements');

  const businessProcess = rawApp.LobCombined
    ? rawApp.LobCombined.replace(/\$/g, '').split(',').map((s) => s.trim()).filter(Boolean).join(', ')
    : (rawApp.GTMLoBName || 'Finance');

  const odataServices = extractODataServices(rawApp.ODataServicesCombined);
  const sapui5Component = rawApp.SAPUI5ComponentIdCombined
    ? rawApp.SAPUI5ComponentIdCombined.replace(/\$/g, '').trim()
    : undefined;

  const businessRole = rawApp.BusinessRoleNameCombined
    ? rawApp.BusinessRoleNameCombined.replace(/\$/g, ' ').replace(/\s+/g, ' ').trim()
    : (rawApp.RoleName || undefined);

  const businessCatalog = rawApp.BusinessCatalog || rawApp.BusinessCatalogNameCombined
    ? String(rawApp.BusinessCatalog || rawApp.BusinessCatalogNameCombined).replace(/\$/g, ' ').trim()
    : undefined;

  const technicalCatalog = rawApp.TechnicalCatalog || rawApp.TechnicalCatalogNameCombined
    ? String(rawApp.TechnicalCatalog || rawApp.TechnicalCatalogNameCombined).replace(/\$/g, ' ').trim()
    : undefined;

  const productVersion = rawApp.PVBackend || rawApp.PVFrontend || 'SAP S/4HANA';
  const softwareComponent = rawApp.BackendSoftwareComponentVersions || rawApp.FrontendSoftwareComponent || undefined;

  return {
    appId,
    appName,
    description: rawApp.RoleCombinedToolTipDescription || rawApp.RoleDescription || appName,
    appType,
    uiTechnology,
    businessProcess,
    lineOfBusiness: rawApp.GTMLoBName || businessProcess,
    productVersion,
    softwareComponent,
    businessRole,
    businessCatalog,
    technicalCatalog,
    odataServices,
    sapui5Component,
    bspApplicationUrl: rawApp.BSPApplicationURL || undefined,
    documentationUrl: `https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps('${encodeURIComponent(appId)}')/`,
    provenance,
    retrievalTimestamp: new Date().toISOString()
  };
}

export const MAPPING_CLASSIFICATIONS = Object.freeze({
  DIRECT_EQUIVALENT: 'DIRECT_EQUIVALENT',
  FUNCTIONAL_ALTERNATIVE: 'FUNCTIONAL_ALTERNATIVE',
  PARTIAL_FIT: 'PARTIAL_FIT',
  RELATED_APPLICATION: 'RELATED_APPLICATION',
  WEBGUI_BRIDGE: 'WEBGUI_BRIDGE',
  UNVERIFIED_MAPPING: 'UNVERIFIED_MAPPING'
});

export const RELEASE_COMPATIBILITY_STATUSES = Object.freeze({
  VERIFIED_COMPATIBLE: 'VERIFIED_COMPATIBLE',
  SUPPORTED_ON_LATER_RELEASE_ONLY: 'SUPPORTED_ON_LATER_RELEASE_ONLY',
  DIFFERENT_DEPLOYMENT_EDITION: 'DIFFERENT_DEPLOYMENT_EDITION',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  UNKNOWN: 'UNKNOWN'
});

export class OfficialFioriCatalogueAdapter {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || OFFICIAL_FIORI_LIBRARY_BASE_URL;
    this.timeoutMs = Number(options.timeoutMs) || 12000;
    this.cacheFilePath = options.cacheFilePath || resolveCanonicalCatalogueCachePath();
    this.memoryCache = new Map();
    this.cacheTtlMs = Number(options.cacheTtlMs) || 60 * 60 * 1000; // 1 hour

    // Initialize cache from disk
    this.loadDiskCache();
  }

  /**
   * Loads cached catalogue snapshots from local disk.
   */
  loadDiskCache() {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
        const items = JSON.parse(raw);
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.appId) {
              this.memoryCache.set(item.appId, {
                ...item,
                provenance: item.provenance || 'OFFICIAL_CATALOGUE_CACHED'
              });
            }
          }
        }
      }
    } catch {
      // Non-fatal if disk cache cannot be read
    }
  }

  /**
   * Reloads disk cache into memory.
   */
  reloadCache() {
    this.memoryCache.clear();
    this.loadDiskCache();
  }

  /**
   * Persists memory cache to local disk snapshot.
   */
  persistDiskCache() {
    try {
      const items = Array.from(this.memoryCache.values());
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(items, null, 2), 'utf8');
    } catch {
      // Non-fatal if disk write fails
    }
  }

  /**
   * Executes a direct query against the official Fiori Apps Reference Library OData endpoint.
   */
  async queryLibrary(filter = '', top = 10) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let url = `${this.baseUrl}?$top=${top}&$format=json`;
    if (filter && filter.trim().length > 0) {
      url += `&$filter=${encodeURIComponent(filter.trim())}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        return {
          success: false,
          statusCode: 'CATALOGUE_HTTP_ERROR',
          httpStatus: response.status,
          errorMessage: `Official Fiori Apps Reference Library returned HTTP ${response.status} (${response.statusText}).`,
          results: []
        };
      }

      const json = await response.json();
      const results = json?.d?.results || [];

      return {
        success: true,
        statusCode: 'SUCCESS',
        httpStatus: 200,
        results
      };
    } catch (err) {
      clearTimeout(timer);
      const isTimeout = err?.name === 'AbortError';
      return {
        success: false,
        statusCode: isTimeout ? 'TIMEOUT' : 'LIVE_SOURCE_FAILED',
        httpStatus: isTimeout ? 504 : 502,
        errorMessage: isTimeout
          ? `Official Fiori Apps Reference Library timed out after ${this.timeoutMs}ms.`
          : `Official Fiori Apps Reference Library connection error: ${sanitizeErrorMessage(err.message)}`,
        results: []
      };
    }
  }

  /**
   * Retrieves an application by exact App ID.
   */
  async getAppById(appId = '', options = {}) {
    const { refresh = false } = options;
    if (!appId || typeof appId !== 'string' || appId.trim().length === 0) {
      return {
        success: false,
        statusCode: 'INVALID_INPUT',
        errorMessage: 'Application ID cannot be empty.'
      };
    }

    const cleanId = appId.trim();

    // Check memory cache
    if (!refresh && this.memoryCache.has(cleanId)) {
      return {
        success: true,
        statusCode: 'SUCCESS',
        fromCache: true,
        app: this.memoryCache.get(cleanId),
        provenance: 'OFFICIAL_CATALOGUE_CACHED',
        timestamp: new Date().toISOString()
      };
    }

    // Query live official library
    const liveRes = await this.queryLibrary(`appId eq '${cleanId}'`, 1);

    if (liveRes.success && liveRes.results.length > 0) {
      const normalized = normalizeCatalogueApp(liveRes.results[0], 'OFFICIAL_CATALOGUE_LIVE');
      this.memoryCache.set(cleanId, normalized);
      this.persistDiskCache();

      return {
        success: true,
        statusCode: 'SUCCESS',
        fromCache: false,
        app: normalized,
        provenance: 'OFFICIAL_CATALOGUE_LIVE',
        timestamp: new Date().toISOString()
      };
    }

    // If live call failed but we have a disk-cached version, return cached fallback
    if (!liveRes.success && this.memoryCache.has(cleanId)) {
      return {
        success: true,
        statusCode: 'SUCCESS',
        fromCache: true,
        app: this.memoryCache.get(cleanId),
        provenance: 'OFFICIAL_CATALOGUE_CACHED',
        warning: `Live query failed (${liveRes.errorMessage}). Served from local catalogue snapshot.`,
        timestamp: new Date().toISOString()
      };
    }

    return {
      success: false,
      statusCode: liveRes.success ? 'NOT_FOUND' : liveRes.statusCode,
      httpStatus: liveRes.success ? 404 : liveRes.httpStatus,
      errorMessage: liveRes.success
        ? `Application "${cleanId}" not found in Official SAP Fiori Apps Reference Library.`
        : liveRes.errorMessage,
      app: null
    };
  }

  /**
   * Multi-criteria search across the official catalogue.
   * Supports searching by App ID, Application Name, T-Code, and Business Process.
   */
  async searchApps(searchParams = {}) {
    const {
      query = '',
      appId = '',
      appName = '',
      tcode = '',
      businessProcess = '',
      lineOfBusiness = '',
      businessArea = '',
      productVersion = '',
      productSuite = '',
      uiTechnology = '',
      odataService = '',
      appType = '',
      limit = 20,
      page = 1,
      pageSize = undefined,
      offset = undefined,
      refresh = false
    } = searchParams;

    const collectedResults = [];

    // 0. Default browse: if no specific query is provided, return all records from memory cache
    const textQuery = appName || query;
    if (!appId && !tcode && (!textQuery || textQuery.trim().length === 0)) {
      for (const app of this.memoryCache.values()) {
        collectedResults.push(app);
      }
    }

    // 1. Direct App ID Search if specified
    if (appId && typeof appId === 'string') {
      const singleApp = await this.getAppById(appId, { refresh });
      if (singleApp.success && singleApp.app) {
        collectedResults.push(singleApp.app);
      }
    }

    // 2. T-Code Search
    if (tcode && typeof tcode === 'string' && tcode.trim().length > 0) {
      const cleanTcode = tcode.trim().toUpperCase();

      // Query A: Exact T-Code as App ID (e.g. F-53, FB03)
      const exactTcodeRes = await this.getAppById(cleanTcode, { refresh });
      if (exactTcodeRes.success && exactTcodeRes.app) {
        collectedResults.push(exactTcodeRes.app);
      }

      // Query B: Correlated Known Successors
      // F-53 -> F1612 (Post Outgoing Payments), F1367 (Clear Outgoing Payments)
      // ME21N -> F0842A (Manage Purchase Orders)
      // FB01 -> F0717 (Manage Journal Entries)
      // OB08 -> F3616 (Currency Exchange Rates)
      const successorKeywords = {
        'F-53': ['Post Outgoing Payments', 'Clear Outgoing Payments', 'F1612'],
        'F-28': ['Post Incoming Payments', 'Clear Incoming Payments', 'F1345'],
        'ME21N': ['Manage Purchase Orders', 'Create Purchase Order', 'F0842A'],
        'FB50': ['Post General Journal Entries', 'F0718', 'FB50'],
        'VA01': ['Create Sales Orders', 'Manage Sales Orders', 'F1873'],
        'FB03': ['Display Document', 'Manage Journal Entries', 'FB03'],
        'FB01': ['Manage Journal Entries'],
        'FB60': ['Create Incoming Invoices', 'Manage Supplier Invoices', 'FB60', 'F0859A'],
        'FV60': ['Park Incoming Invoices', 'Manage Supplier Invoices', 'FV60', 'F0859A'],
        'FBN1': ['Number Range', 'Manage Number Range Intervals', 'F3445', 'FBN1'],
        'OB52': ['Posting Periods', 'Manage Posting Periods', 'F2059', 'OB52'],
        'FS00': ['G/L Account', 'Manage G/L Account Master Data', 'F0731', 'FS00'],
        'MIGO': ['Goods Movement', 'Post Goods Movement', 'F1061', 'MIGO'],
        'BP': ['Business Partner', 'Manage Business Partner Data', 'F3163', 'BP'],
        'MIRO': ['Supplier Invoices', 'Manage Supplier Invoices', 'F0859A', 'MIRO'],
        'MIR7': ['Supplier Invoices', 'Manage Supplier Invoices', 'F0859A', 'MIR7']
      };

      const keywords = successorKeywords[cleanTcode] || [cleanTcode];
      for (const kw of keywords) {
        if (kw.startsWith('F') && /^[F]\d{4}[A-Z]?$/.test(kw)) {
          const appRes = await this.getAppById(kw, { refresh });
          if (appRes.success && appRes.app) {
            collectedResults.push(appRes.app);
          }
        } else {
          const liveNameRes = await this.queryLibrary(`substringof('${kw}',AppName)`, 5);
          if (liveNameRes.success) {
            for (const r of liveNameRes.results) {
              const norm = normalizeCatalogueApp(r, 'OFFICIAL_CATALOGUE_LIVE');
              this.memoryCache.set(norm.appId, norm);
              collectedResults.push(norm);
            }
          }
        }
      }
    }

    // 3. Application Name or General Query Search
    if (textQuery && typeof textQuery === 'string' && textQuery.trim().length > 0) {
      // Always include local/ingested catalogue memory cache matches
      const qUpper = textQuery.toUpperCase();
      for (const app of this.memoryCache.values()) {
        const matchesName = app.appName && app.appName.toUpperCase().includes(qUpper);
        const matchesDesc = app.description && app.description.toUpperCase().includes(qUpper);
        const matchesId = app.appId && app.appId.toUpperCase().includes(qUpper);
        if (matchesName || matchesDesc || matchesId) {
          collectedResults.push(app);
        } else {
          // Multi-word semantic token matching (Fuzzy correlation)
          const words = qUpper.split(/[\s,;:\-_/()]+/).filter((w) => w.length > 3 && !/^(WITH|FROM|THIS|THAT|USER|DATA|CUSTOM|DYNPRO|TRANSACTION|REPORT|PROGRAM)$/.test(w));
          if (words.length > 1) {
            const matchedTokens = words.filter((w) =>
              (app.appName && app.appName.toUpperCase().includes(w)) ||
              (app.description && app.description.toUpperCase().includes(w))
            );
            if (matchedTokens.length >= 2) {
              collectedResults.push(app);
            }
          }
        }
      }

      const liveRes = await this.queryLibrary(`substringof('${textQuery.trim()}',AppName)`, limit);
      if (liveRes.success) {
        for (const r of liveRes.results) {
          const norm = normalizeCatalogueApp(r, 'OFFICIAL_CATALOGUE_LIVE');
          this.memoryCache.set(norm.appId, norm);
          collectedResults.push(norm);
        }
      }
    }

    this.persistDiskCache();

    // Deduplicate by appId
    const uniqueMap = new Map();
    for (const app of collectedResults) {
      if (app && app.appId && !uniqueMap.has(app.appId)) {
        uniqueMap.set(app.appId, app);
      }
    }

    let finalApps = Array.from(uniqueMap.values());

    // Apply optional client-side filters
    if (appType) {
      finalApps = finalApps.filter((a) => a.appType.toUpperCase().includes(appType.toUpperCase()));
    }
    const targetLob = lineOfBusiness || businessArea;
    if (targetLob) {
      finalApps = finalApps.filter((a) =>
        (a.lineOfBusiness || a.businessProcess || '').toUpperCase().includes(targetLob.toUpperCase())
      );
    }
    if (businessProcess) {
      finalApps = finalApps.filter((a) => a.businessProcess.toUpperCase().includes(businessProcess.toUpperCase()));
    }
    if (productVersion) {
      finalApps = finalApps.filter((a) => (a.productVersion || '').toUpperCase().includes(productVersion.toUpperCase()));
    }
    if (productSuite) {
      finalApps = finalApps.filter((a) => (a.productSuite || '').toUpperCase().includes(productSuite.toUpperCase()));
    }
    if (uiTechnology) {
      finalApps = finalApps.filter((a) => (a.uiTechnology || '').toUpperCase().includes(uiTechnology.toUpperCase()));
    }
    if (odataService) {
      finalApps = finalApps.filter((a) =>
        (a.odataServices || []).some((s) => s.toUpperCase().includes(odataService.toUpperCase()))
      );
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const effectiveLimit = pageSize !== undefined ? Number(pageSize) : (limit !== undefined ? Number(limit) : 20);
    const startIdx = offset !== undefined
      ? Math.max(0, Number(offset))
      : (effectiveLimit > 0 ? (pageNum - 1) * effectiveLimit : 0);
    const limited = effectiveLimit > 0 ? finalApps.slice(startIdx, startIdx + effectiveLimit) : finalApps;
    const totalPages = effectiveLimit > 0 ? Math.ceil(finalApps.length / effectiveLimit) : 1;
    const availabilityState = this.getAvailabilityState();

    return {
      success: true,
      statusCode: 'SUCCESS',
      httpStatus: 200,
      totalCount: finalApps.length,
      returnedCount: limited.length,
      page: pageNum,
      pageSize: effectiveLimit,
      totalPages,
      candidates: limited,
      availabilityState,
      catalogueCoverage: {
        cacheSize: this.memoryCache.size,
        coverageScope: 'Curated SAP S/4HANA 2023 On-Premise Baseline & Ingested Exports',
        snapshotVersion: 'FAL_2023_FPS02_BASELINE_V1',
        isCompleteGlobalLibrary: false,
        notice: 'Displaying verified and cached SAP Fiori applications. Import complete FAL exports via /api/v1/fiori-catalogue/import.'
      },
      provenance: 'OFFICIAL_CATALOGUE',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Evaluates current catalogue availability state.
   */
  getAvailabilityState() {
    if (this.memoryCache.size > 0) {
      try {
        const statusPath = resolveCanonicalCatalogueStatusPath();
        if (fs.existsSync(statusPath)) {
          const status = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
          if (status.liveSourceStatus === CATALOGUE_AVAILABILITY_STATES.OFFICIAL_EXPORT_IMPORTED || status.importStatus === 'SUCCESS') {
            return CATALOGUE_AVAILABILITY_STATES.OFFICIAL_EXPORT_IMPORTED;
          }
        }
      } catch {
        // Fallback to cache available
      }
      return CATALOGUE_AVAILABILITY_STATES.CACHE_AVAILABLE;
    }
    return CATALOGUE_AVAILABILITY_STATES.EMPTY_CATALOGUE;
  }

  /**
   * Connects Sprint 6 live SAP S21 metadata with Sprint 7 catalogue candidate applications.
   * Compares OData service dependencies against live Gateway services to determine VERIFIED_MATCH.
   */
  evaluateCandidateMatches(options = {}) {
    const {
      tcode = '',
      transactionMetadata = {},
      candidateApps = [],
      liveGatewayServices = []
    } = options;

    const evaluatedCandidates = [];
    const liveSrvNames = new Set(
      liveGatewayServices.map((s) => (s.technicalServiceName || s.title || '').toUpperCase().replace(/^Z/, ''))
    );

    for (const app of candidateApps) {
      const appODataList = (app.odataServices || []).map((s) => s.toUpperCase());
      const hasODataServiceMatch = appODataList.some((reqSrv) =>
        liveSrvNames.has(reqSrv) || liveSrvNames.has(reqSrv.replace(/_SRV$/, ''))
      );

      const isExactTcodeClassicApp = app.appId.toUpperCase() === tcode.toUpperCase() && app.appType === 'SAP GUI';

      if (hasODataServiceMatch) {
        evaluatedCandidates.push({
          appId: app.appId,
          appName: app.appName,
          appType: app.appType,
          uiTechnology: app.uiTechnology,
          matchType: 'DIRECT_SUCCESSOR_ODATA_VERIFIED',
          matchStatus: 'VERIFIED_MATCH',
          confidence: 'HIGH',
          productVersion: app.productVersion,
          verifiedODataServices: appODataList.filter((s) => liveSrvNames.has(s)),
          documentationUrl: app.documentationUrl,
          rationale: `Verified modern SAP Fiori elements successor application. Mandatory backend OData service (${appODataList.join(', ')}) is active and registered on target SAP S21 Gateway.`,
          evidence: [
            `Official SAP Fiori Apps Reference Library record: ${app.appId} ("${app.appName}")`,
            `Application Type: ${app.appType} (${app.uiTechnology})`,
            `OData Service Dependency: ${appODataList.join(', ')}`,
            `Target SAP S21 Live Verification: OData service is registered in Gateway Catalog`,
            `Release Compatibility: ${app.productVersion}`
          ],
          provenance: 'OFFICIAL_CATALOGUE'
        });
      } else if (isExactTcodeClassicApp) {
        evaluatedCandidates.push({
          appId: app.appId,
          appName: app.appName,
          appType: 'SAP GUI',
          uiTechnology: 'SAP GUI for HTML',
          matchType: 'SAP_GUI_HTML',
          matchStatus: 'POSSIBLE_MATCH',
          confidence: 'HIGH',
          productVersion: app.productVersion,
          documentationUrl: app.documentationUrl,
          rationale: `Classic SAP GUI transaction hosted in Fiori Launchpad via SAP GUI for HTML (WebGUI tile ${app.appId}).`,
          evidence: [
            `Official SAP Fiori Apps Reference Library record: ${app.appId} ("${app.appName}")`,
            `Application Type: SAP GUI (SAP GUI for HTML / WebGUI)`,
            `Intent: ${app.businessCatalog || 'Supplier-postOutgoingPayments'}`
          ],
          provenance: 'OFFICIAL_CATALOGUE'
        });
      } else {
        evaluatedCandidates.push({
          appId: app.appId,
          appName: app.appName,
          appType: app.appType,
          uiTechnology: app.uiTechnology,
          matchType: 'RELATED_MATCH',
          matchStatus: 'POSSIBLE_MATCH',
          confidence: 'MEDIUM',
          productVersion: app.productVersion,
          documentationUrl: app.documentationUrl,
          rationale: `Related application discovered in Official Fiori Apps Reference Library under the same business area (${app.businessProcess}).`,
          evidence: [
            `Official SAP Fiori Apps Reference Library record: ${app.appId} ("${app.appName}")`,
            `Business Process: ${app.businessProcess}`,
            `OData Dependencies: ${appODataList.length > 0 ? appODataList.join(', ') : 'None listed'}`
          ],
          provenance: 'OFFICIAL_CATALOGUE'
        });
      }
    }

    // Determine overall matching status
    let status = 'NO_VERIFIED_MATCH';
    if (evaluatedCandidates.some((c) => c.matchStatus === 'VERIFIED_MATCH')) {
      status = 'VERIFIED_MATCH';
    } else if (evaluatedCandidates.some((c) => c.matchStatus === 'POSSIBLE_MATCH')) {
      status = 'POSSIBLE_MATCH';
    }

    return {
      status,
      candidatesCount: evaluatedCandidates.length,
      candidates: evaluatedCandidates,
      evaluatedAgainstS21ServicesCount: liveGatewayServices.length,
      provenance: 'OFFICIAL_CATALOGUE_CORRELATION',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Evaluates release compatibility between candidate app and target SAP system release.
   */
  evaluateReleaseCompatibility(appProductVersion, targetSystemRelease) {
    if (!appProductVersion || !targetSystemRelease) {
      return {
        status: RELEASE_COMPATIBILITY_STATUSES.UNKNOWN,
        details: 'Insufficient release metadata for compatibility determination.'
      };
    }

    const appVer = String(appProductVersion).toUpperCase();
    const targetVer = String(targetSystemRelease).toUpperCase();

    // Check deployment edition divergence
    if (appVer.includes('PUBLIC EDITION') && !targetVer.includes('PUBLIC EDITION')) {
      return {
        status: RELEASE_COMPATIBILITY_STATUSES.DIFFERENT_DEPLOYMENT_EDITION,
        details: `Application is designed for SAP S/4HANA Cloud Public Edition, whereas target system is ${targetSystemRelease}.`
      };
    }

    // Extract year numbers if present
    const appYearMatch = appVer.match(/\b(20\d{2})\b/);
    const targetYearMatch = targetVer.match(/\b(20\d{2})\b/);

    if (appYearMatch && targetYearMatch) {
      const appYear = parseInt(appYearMatch[1], 10);
      const targetYear = parseInt(targetYearMatch[1], 10);

      if (appYear > targetYear) {
        return {
          status: RELEASE_COMPATIBILITY_STATUSES.SUPPORTED_ON_LATER_RELEASE_ONLY,
          details: `Application requires ${appProductVersion} which is later than target release (${targetSystemRelease}).`
        };
      }
      if (appYear <= targetYear) {
        return {
          status: RELEASE_COMPATIBILITY_STATUSES.VERIFIED_COMPATIBLE,
          details: `Application release ${appProductVersion} is compatible with target release (${targetSystemRelease}).`
        };
      }
    }

    // ECC Legacy
    if (targetVer.includes('ECC') && (appVer.includes('S/4HANA') || appVer.includes('CLOUD'))) {
      return {
        status: RELEASE_COMPATIBILITY_STATUSES.NOT_SUPPORTED,
        details: 'Native Fiori application is not supported on classic SAP ECC landscapes without S/4HANA migration.'
      };
    }

    return {
      status: RELEASE_COMPATIBILITY_STATUSES.PENDING_VERIFICATION,
      details: `Release compatibility between "${appProductVersion}" and "${targetSystemRelease}" requires verification.`
    };
  }

  /**
   * Controlled synchronization workflow for official Fiori catalogue records (CAT-04).
   * Supports dry-run analysis by default.
   */
  async syncCatalogue(recordsToSync = [], options = {}) {
    const { dryRun = true, commit = false } = options;
    const shouldCommit = !dryRun && commit;

    const additions = [];
    const modifications = [];
    const unchanged = [];
    const rejectedSynthetic = [];

    const existingKeys = new Set(this.memoryCache.keys());

    for (const raw of recordsToSync) {
      if (!raw || typeof raw !== 'object') continue;

      // Reject non-official / synthetic records from entering canonical official cache
      if (raw.isSynthetic || raw.provenance === 'DEMO_FIXTURE' || raw.provenance === 'SYNTHETIC') {
        rejectedSynthetic.push(raw.appId || 'UNKNOWN');
        continue;
      }

      const normalized = normalizeCatalogueApp(raw, 'OFFICIAL_CATALOGUE_LIVE');
      if (!normalized || !normalized.appId) continue;

      if (!existingKeys.has(normalized.appId)) {
        additions.push(normalized);
      } else {
        const existing = this.memoryCache.get(normalized.appId);
        const hasChange = existing.appName !== normalized.appName ||
          existing.productVersion !== normalized.productVersion ||
          (existing.odataServices || []).length !== (normalized.odataServices || []).length;

        if (hasChange) {
          modifications.push({ previous: existing, updated: normalized });
        } else {
          unchanged.push(normalized.appId);
        }
      }
    }

    const summary = {
      timestamp: new Date().toISOString(),
      dryRun: !shouldCommit,
      mode: !shouldCommit ? 'DRY_RUN' : 'COMMIT',
      incomingRecordsCount: recordsToSync.length,
      existingRecordsCount: this.memoryCache.size,
      additionsCount: additions.length,
      modificationsCount: modifications.length,
      unchangedCount: unchanged.length,
      rejectedSyntheticCount: rejectedSynthetic.length,
      validCandidateCount: additions.length + modifications.length + unchanged.length,
      rejectedCount: rejectedSynthetic.length + (recordsToSync.length - (additions.length + modifications.length + unchanged.length + rejectedSynthetic.length)),
      additions: additions.map((a) => a.appId),
      modifications: modifications.map((m) => m.updated.appId),
      rejectedSynthetic
    };

    if (shouldCommit) {
      // 1. Safe backup snapshot
      const dir = path.dirname(this.cacheFilePath);
      if (fs.existsSync(this.cacheFilePath)) {
        const bakPath = path.resolve(dir, `fiori_app_catalog_cache.bak.${Date.now()}`);
        fs.copyFileSync(this.cacheFilePath, bakPath);
      }

      // 2. Apply additions and modifications to memory cache
      for (const app of additions) {
        this.memoryCache.set(app.appId, app);
      }
      for (const mod of modifications) {
        this.memoryCache.set(mod.updated.appId, mod.updated);
      }

      // 3. Persist disk cache
      this.persistDiskCache();

      summary.committed = true;
      summary.totalRecordsAfterSync = this.memoryCache.size;
    } else {
      summary.committed = false;
      summary.notice = 'Dry-run executed. No filesystem changes made. Pass commit=true to apply.';
    }

    return summary;
  }
}

export const officialFioriCatalogueAdapter = new OfficialFioriCatalogueAdapter();
export const officialCatalogueAdapter = officialFioriCatalogueAdapter;
