/**
 * FioriX — Canonical Fiori Catalogue Service (CAT-02)
 *
 * Connects frontend views to the canonical backend catalogue endpoints via apiClient:
 * - GET /api/v1/fiori-catalogue/search
 * - GET /api/v1/fiori-catalogue/apps/:appId
 * - GET /api/v1/fiori-catalogue/status
 *
 * Strict Compliance:
 * - Consumes the canonical backend store (fiori_app_catalog_cache.json).
 * - Never silently falls back to static mocks when the backend fails.
 * - When explicit demo mode is toggled, labels demo fixtures with CURATED_FIXTURE.
 * - Preserves provenance (OFFICIAL_FAL_EXPORT, OFFICIAL_CATALOGUE_LIVE, OFFICIAL_CATALOGUE_CACHED, CURATED_FIXTURE).
 * - Does not invent missing technical dependencies, roles, or release compatibility.
 */

import {
  apiClient,
  ApiError,
  CatalogueAppRecord,
  CatalogueSearchParams,
  CatalogueStatusInfo
} from '../api/apiClient';
import { OFFICIAL_FIORI_CATALOGUE_BASELINE } from './catalogueMetadata';

export type { CatalogueAppRecord, CatalogueSearchParams, CatalogueStatusInfo };

export interface CatalogueSearchFilter {
  searchQuery?: string;
  appId?: string;
  appName?: string;
  tcode?: string;
  lineOfBusiness?: string;
  businessProcess?: string;
  appType?: string;
  productVersion?: string;
  limit?: number;
  isDemoMode?: boolean;
}

export interface CatalogueSearchServiceResult {
  data: CatalogueAppRecord[];
  totalCount: number;
  returnedCount: number;
  success: boolean;
  provenance: string;
  isDemo: boolean;
}

export interface CatalogueAppDetailServiceResult {
  data: CatalogueAppRecord | null;
  success: boolean;
  fromCache?: boolean;
  provenance: string;
  isDemo: boolean;
  errorMessage?: string;
}

/**
 * Maps static curated baseline fixtures to CatalogueAppRecord structure for explicit demo mode.
 */
function mapBaselineToRecord(item: (typeof OFFICIAL_FIORI_CATALOGUE_BASELINE)[0]): CatalogueAppRecord {
  return {
    appId: item.appId,
    appName: item.appName,
    description: item.description,
    appType: item.uiTechnology.includes('GUI') ? 'SAP GUI' : 'Transactional',
    uiTechnology: item.uiTechnology,
    businessProcess: 'Finance',
    lineOfBusiness: 'Finance',
    productVersion: item.supportedProductRelease,
    softwareComponent: item.technicalComponent,
    businessRole: item.businessRoles.join(', '),
    businessCatalog: item.businessCatalogues.join(', '),
    technicalCatalog: item.technicalComponent,
    odataServices: item.odataServices.map((s) => s.split(' ')[0]),
    sapui5Component: item.technicalComponent.toLowerCase(),
    leadingTransactionCodes: item.relatedTCodes,
    documentationUrl: item.officialSourceUrl,
    provenance: 'CURATED_FIXTURE',
    sourceVersion: item.importVersion,
    importVersion: item.importVersion,
    importTimestamp: item.sourceVerificationDate
  };
}

export const catalogueService = {
  /**
   * Searches or browses the canonical Fiori Catalogue.
   */
  async searchCatalogue(filter?: CatalogueSearchFilter): Promise<CatalogueSearchServiceResult> {
    // 1. Explicit demo mode requested
    if (filter?.isDemoMode) {
      let fixtureRecords = OFFICIAL_FIORI_CATALOGUE_BASELINE.map(mapBaselineToRecord);
      const q = (filter.searchQuery || filter.appName || '').toLowerCase().trim();
      const idFilter = (filter.appId || '').toLowerCase().trim();
      const lobFilter = (filter.lineOfBusiness || filter.businessProcess || '').toLowerCase().trim();

      if (idFilter) {
        fixtureRecords = fixtureRecords.filter((a) => a.appId.toLowerCase().includes(idFilter));
      }
      if (q) {
        fixtureRecords = fixtureRecords.filter(
          (a) =>
            a.appId.toLowerCase().includes(q) ||
            a.appName.toLowerCase().includes(q) ||
            a.description.toLowerCase().includes(q) ||
            a.businessRole.toLowerCase().includes(q)
        );
      }
      if (lobFilter) {
        fixtureRecords = fixtureRecords.filter(
          (a) =>
            a.lineOfBusiness.toLowerCase().includes(lobFilter) ||
            a.businessProcess.toLowerCase().includes(lobFilter)
        );
      }

      return {
        data: fixtureRecords,
        totalCount: fixtureRecords.length,
        returnedCount: fixtureRecords.length,
        success: true,
        provenance: 'CURATED_FIXTURE',
        isDemo: true
      };
    }

    // 2. Canonical backend call via centralized API client
    const rawQuery = (filter?.searchQuery || '').trim();
    const isPotentialTcode = rawQuery.length > 0 && /^[A-Z0-9_\-\/]{1,20}$/i.test(rawQuery);

    const params: CatalogueSearchParams = {
      query: filter?.searchQuery,
      appId: filter?.appId,
      appName: filter?.appName,
      tcode: filter?.tcode || (isPotentialTcode ? rawQuery.toUpperCase() : undefined),
      lineOfBusiness: filter?.lineOfBusiness,
      businessProcess: filter?.businessProcess,
      appType: filter?.appType,
      productVersion: filter?.productVersion,
      limit: filter?.limit ?? 50
    };

    const res = await apiClient.searchCatalogue(params);
    return {
      data: res.candidates || [],
      totalCount: res.totalCount || (res.candidates ? res.candidates.length : 0),
      returnedCount: res.returnedCount || (res.candidates ? res.candidates.length : 0),
      success: res.success,
      provenance: res.provenance || 'OFFICIAL_CATALOGUE',
      isDemo: false
    };
  },

  /**
   * Retrieves a single application detail record from the canonical backend store.
   */
  async getAppById(
    appId: string,
    options?: { isDemoMode?: boolean }
  ): Promise<CatalogueAppDetailServiceResult> {
    const cleanId = (appId || '').trim();

    // 1. Explicit demo mode requested
    if (options?.isDemoMode) {
      const match = OFFICIAL_FIORI_CATALOGUE_BASELINE.find(
        (a) => a.appId.toUpperCase() === cleanId.toUpperCase()
      );
      if (match) {
        return {
          data: mapBaselineToRecord(match),
          success: true,
          fromCache: true,
          provenance: 'CURATED_FIXTURE',
          isDemo: true
        };
      }
      return {
        data: null,
        success: false,
        provenance: 'CURATED_FIXTURE',
        isDemo: true,
        errorMessage: `Demo fixture "${cleanId}" not found in curated baseline.`
      };
    }

    // 2. Canonical backend call via centralized API client
    try {
      const res = await apiClient.getCatalogueAppById(cleanId);
      return {
        data: res.app,
        success: res.success && !!res.app,
        fromCache: res.fromCache,
        provenance: res.app?.provenance || res.provenance || 'OFFICIAL_CATALOGUE_CACHED',
        isDemo: false,
        errorMessage: res.errorMessage
      };
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 404) {
        return {
          data: null,
          success: false,
          provenance: 'OFFICIAL_CATALOGUE',
          isDemo: false,
          errorMessage: err.message || `Application "${cleanId}" not found in canonical catalogue.`
        };
      }
      throw err;
    }
  },

  /**
   * Retrieves catalogue ingestion status and metrics from the backend.
   */
  async getCatalogueStatus(): Promise<CatalogueStatusInfo> {
    const res = await apiClient.getCatalogueStatus();
    return res.status;
  }
};
