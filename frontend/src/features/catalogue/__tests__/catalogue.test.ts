import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  catalogueService,
  CatalogueAppRecord,
  CatalogueStatusInfo
} from '../../../services/catalogue/catalogueService';
import { apiClient, ApiError } from '../../../services/api/apiClient';

describe('Fiorify CAT-02 — Frontend Canonical Catalogue Integration Tests', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // 1. Successful catalogue search
  it('1. successfully searches and retrieves canonical catalogue applications from backend API', async () => {
    const mockApps: CatalogueAppRecord[] = [
      {
        appId: 'F1612',
        appName: 'Post Outgoing Payments',
        description: 'Post outgoing payments with cash discount and invoice clearing',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori (SAPUI5)',
        businessProcess: 'Finance',
        lineOfBusiness: 'Finance',
        productVersion: 'SAP S/4HANA Cloud Private Edition 2025',
        softwareComponent: 'S4CORE 109',
        businessRole: 'SAP_BR_AP_ACCOUNTANT',
        businessCatalog: 'SAP_SFIN_BC_AP_PAY_PROC',
        technicalCatalog: 'SAP_TC_FIN_FO_COMMON',
        odataServices: ['FAP_PAYMENT_POST_SRV'],
        sapui5Component: 'fin.ap.payment.post',
        bspApplicationUrl: '/sap/bc/ui5_ui5/sap/fin_ap_postpaym',
        documentationUrl: 'https://fioriappslibrary.hana.ondemand.com/sap/fix/externalViewer/#/detail/Apps(\'F1612\')/',
        provenance: 'OFFICIAL_CATALOGUE_LIVE'
      }
    ];

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          totalCount: 1,
          returnedCount: 1,
          candidates: mockApps,
          provenance: 'OFFICIAL_CATALOGUE',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await catalogueService.searchCatalogue({ searchQuery: 'Outgoing' });
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.data[0].appId).toBe('F1612');
    expect(res.data[0].appName).toBe('Post Outgoing Payments');
    expect(res.isDemo).toBe(false);

    const [calledUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toContain('/api/v1/fiori-catalogue/search');
    expect(calledUrl).toContain('query=Outgoing');
  });

  // 2. Search filtering
  it('2. filters catalogue search by Line of Business and App ID parameters', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          totalCount: 1,
          returnedCount: 1,
          candidates: [],
          provenance: 'OFFICIAL_CATALOGUE',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await catalogueService.searchCatalogue({
      appId: 'F1612',
      lineOfBusiness: 'Finance',
      limit: 25
    });

    const [calledUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toContain('appId=F1612');
    expect(calledUrl).toContain('lineOfBusiness=Finance');
    expect(calledUrl).toContain('limit=25');
  });

  // 3. Successful application detail retrieval
  it('3. successfully retrieves single application details by ID with complete canonical metadata', async () => {
    const mockAppDetail: CatalogueAppRecord = {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      description: 'Full description of F1612',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori (SAPUI5)',
      businessProcess: 'Finance',
      lineOfBusiness: 'Finance',
      productVersion: 'SAP S/4HANA 2025',
      softwareComponent: 'S4CORE 109',
      businessRole: 'SAP_BR_AP_ACCOUNTANT',
      odataServices: ['FAP_PAYMENT_POST_SRV'],
      sapui5Component: 'fin.ap.payment.post',
      documentationUrl: 'https://fal.cloud.sap/apps/F1612',
      provenance: 'OFFICIAL_CATALOGUE_LIVE'
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          fromCache: true,
          app: mockAppDetail,
          provenance: 'OFFICIAL_CATALOGUE_CACHED',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await catalogueService.getAppById('F1612');
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.appId).toBe('F1612');
    expect(res.data?.odataServices).toContain('FAP_PAYMENT_POST_SRV');
    expect(res.fromCache).toBe(true);

    const [calledUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/fiori-catalogue/apps/F1612');
  });

  // 4. Unknown application ID
  it('4. returns controlled not found state when application ID does not exist in catalogue', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          statusCode: 'NOT_FOUND',
          errorMessage: 'Application "UNKNOWN_999" not found in Official SAP Fiori Apps Reference Library.',
          app: null
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await catalogueService.getAppById('UNKNOWN_999');
    expect(res.success).toBe(false);
    expect(res.data).toBeNull();
    expect(res.errorMessage).toContain('not found');
  });

  // 5. Loading state handling
  it('5. handles asynchronous request lifecycle properly without blocking', async () => {
    let resolvePromise: (value: any) => void;
    const slowPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    globalThis.fetch = vi.fn().mockReturnValue(slowPromise);

    const searchPromise = catalogueService.searchCatalogue({ searchQuery: 'SlowQuery' });
    expect(searchPromise).toBeInstanceOf(Promise);

    // Resolve after checking promise status
    resolvePromise!(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          candidates: []
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await searchPromise;
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
  });

  // 6. Empty catalogue handling
  it('6. safely returns empty result set when catalogue search yields zero candidates', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          totalCount: 0,
          returnedCount: 0,
          candidates: [],
          provenance: 'OFFICIAL_CATALOGUE'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await catalogueService.searchCatalogue({ searchQuery: 'NonExistentXYZ' });
    expect(res.success).toBe(true);
    expect(res.data).toEqual([]);
    expect(res.totalCount).toBe(0);
  });

  // 7. Backend offline state
  it('7. throws structured ApiError on network connection failure without silently defaulting to mock data', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(catalogueService.searchCatalogue()).rejects.toThrow();

    try {
      await catalogueService.searchCatalogue();
      expect.unreachable('Should have thrown ApiError on backend offline');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.isNetworkError).toBe(true);
    }
  });

  // 8. API errors handling
  it('8. propagates backend HTTP 500 error cleanly without swallowing failure', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          statusCode: 'INTERNAL_ERROR',
          errorMessage: 'Backend disk cache reading failure.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await expect(catalogueService.searchCatalogue()).rejects.toThrow(ApiError);
  });

  // 9. Provenance rendering
  it('9. preserves and distinguishes various catalogue record provenance values', async () => {
    const recordsWithDivergentProvenance: CatalogueAppRecord[] = [
      {
        appId: 'F1612',
        appName: 'Post Outgoing Payments',
        description: 'Live SAP app',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori',
        businessProcess: 'Finance',
        lineOfBusiness: 'Finance',
        productVersion: 'S/4HANA 2025',
        businessRole: 'Accountant',
        odataServices: ['FAP_PAYMENT_POST_SRV'],
        provenance: 'OFFICIAL_CATALOGUE_LIVE'
      },
      {
        appId: 'F0859',
        appName: 'Manage Purchase Orders',
        description: 'FAL batch export',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        businessProcess: 'Sourcing and Procurement',
        lineOfBusiness: 'Sourcing and Procurement',
        productVersion: 'S/4HANA 2023',
        businessRole: 'Purchaser',
        odataServices: [],
        provenance: 'OFFICIAL_FAL_EXPORT'
      },
      {
        appId: 'DEMO_01',
        appName: 'Sample Demo App',
        description: 'Static fixture',
        appType: 'Transactional',
        uiTechnology: 'SAPUI5',
        businessProcess: 'Finance',
        lineOfBusiness: 'Finance',
        productVersion: 'Demo Baseline',
        businessRole: 'Clerk',
        odataServices: [],
        provenance: 'CURATED_FIXTURE'
      }
    ];

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          totalCount: 3,
          returnedCount: 3,
          candidates: recordsWithDivergentProvenance,
          provenance: 'OFFICIAL_CATALOGUE'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const res = await catalogueService.searchCatalogue();
    expect(res.data[0].provenance).toBe('OFFICIAL_CATALOGUE_LIVE');
    expect(res.data[1].provenance).toBe('OFFICIAL_FAL_EXPORT');
    expect(res.data[2].provenance).toBe('CURATED_FIXTURE');
  });

  // 10. No administrative secret sent by browser requests
  it('10. verifies that browser catalogue search and detail requests do not send X-Fiorify-Admin-Secret', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          candidates: []
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await catalogueService.searchCatalogue({ searchQuery: 'Test' });
    const [, searchInit] = (globalThis.fetch as any).mock.calls[0];
    expect(searchInit.headers['X-Fiorify-Admin-Secret']).toBeUndefined();
    expect(searchInit.headers['Authorization']).toBeUndefined();

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          app: { appId: 'F1612', appName: 'Test', provenance: 'OFFICIAL_CATALOGUE_CACHED' }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await catalogueService.getAppById('F1612');
    const [, detailInit] = (globalThis.fetch as any).mock.calls[0];
    expect(detailInit.headers['X-Fiorify-Admin-Secret']).toBeUndefined();
    expect(detailInit.headers['Authorization']).toBeUndefined();
  });

  // 11. Catalogue status rendering
  it('11. retrieves catalogue status telemetry (record count, source distribution, import status)', async () => {
    const mockStatus: CatalogueStatusInfo = {
      totalRecords: 3,
      sourceDistribution: {
        OFFICIAL_CATALOGUE_LIVE: 3
      },
      lastSuccessfulImport: '2026-11-05T05:59:56.401Z',
      sourceVersion: 'SAP S/4HANA Reference Library',
      importStatus: 'IDLE',
      lastImportSummary: null
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          status: mockStatus
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const status = await catalogueService.getCatalogueStatus();
    expect(status.totalRecords).toBe(3);
    expect(status.sourceVersion).toBe('SAP S/4HANA Reference Library');
    expect(status.importStatus).toBe('IDLE');
    expect(status.sourceDistribution['OFFICIAL_CATALOGUE_LIVE']).toBe(3);

    const [calledUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toBe('http://localhost:4004/api/v1/fiori-catalogue/status');
  });

  // 12. Explicit demo mode behaviour
  it('12. explicitly tags demo records as CURATED_FIXTURE when demo mode is active without calling backend', async () => {
    globalThis.fetch = vi.fn();

    const res = await catalogueService.searchCatalogue({ isDemoMode: true });
    expect(res.isDemo).toBe(true);
    expect(res.provenance).toBe('CURATED_FIXTURE');
    expect(res.data.length).toBeGreaterThan(0);
    expect(res.data.every((a) => a.provenance === 'CURATED_FIXTURE')).toBe(true);

    // Verify fetch was NOT called for demo mode
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // Verify getAppById with isDemoMode
    const demoApp = await catalogueService.getAppById('F0773', { isDemoMode: true });
    expect(demoApp.isDemo).toBe(true);
    expect(demoApp.provenance).toBe('CURATED_FIXTURE');
    expect(demoApp.data?.appId).toBe('F0773');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  // 13. Enhanced catalogue status with subset coverage and appType distribution
  it('13. correctly handles enhanced catalogue status with subset coverage and appType distribution', async () => {
    const mockStatus: CatalogueStatusInfo = {
      totalRecords: 31,
      uniqueApplicationIds: 31,
      duplicateRecordsCount: 0,
      sourceDistribution: {
        OFFICIAL_CATALOGUE_LIVE: 31
      },
      recordsByProvenance: {
        OFFICIAL_CATALOGUE_LIVE: 31
      },
      recordsByAppType: {
        Transactional: 15,
        'SAP GUI': 15,
        'Fact sheet': 1
      },
      recordsByRelease: {
        'SAP S/4HANA Cloud Private Edition 2025': 31
      },
      recordsWithMissingCriticalMetadata: {
        totalRecordsAnalyzed: 31,
        missingOData: 1,
        missingBusinessRole: 0,
        missingDescription: 0
      },
      lastSuccessfulImport: '2026-11-07T06:04:03.407Z',
      sourceVersion: 'SAP S/4HANA Reference Library',
      sourceCoverage: {
        isSubset: true,
        scopeDescription: 'Verified subset of official SAP Fiori Apps Reference Library',
        localRecordCount: 31,
        globalReferenceCount: 17049,
        coveragePercent: 0.18
      },
      catalogueFreshness: 'CURRENT',
      importStatus: 'IDLE'
    };

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          status: mockStatus
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const status = await catalogueService.getCatalogueStatus();
    expect(status.totalRecords).toBe(31);
    expect(status.sourceCoverage?.isSubset).toBe(true);
    expect(status.sourceCoverage?.coveragePercent).toBe(0.18);
    expect(status.recordsByAppType?.['Transactional']).toBe(15);
    expect(status.recordsByAppType?.['SAP GUI']).toBe(15);
    expect(status.duplicateRecordsCount).toBe(0);
  });

  // 14. Search with appType filter parameter
  it('14. passes appType filter parameter to backend API when searching catalogue', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          statusCode: 'SUCCESS',
          totalCount: 15,
          returnedCount: 15,
          candidates: [],
          provenance: 'OFFICIAL_CATALOGUE',
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    await catalogueService.searchCatalogue({
      appType: 'Transactional',
      limit: 50
    });

    const [calledUrl] = (globalThis.fetch as any).mock.calls[0];
    expect(calledUrl).toContain('appType=Transactional');
    expect(calledUrl).toContain('limit=50');
  });
});
