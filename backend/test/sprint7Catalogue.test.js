import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import {
  OfficialFioriCatalogueAdapter,
  extractODataServices,
  normalizeCatalogueApp
} from '../src/adapters/officialFioriCatalogueAdapter.js';
import { createServer } from '../src/server.js';

describe('FioriX Sprint 7 — Official SAP Fiori Apps Reference Library Unit Tests', () => {
  it('extractODataServices cleanly parses raw delimiter strings and deduplicates tokens', () => {
    assert.deepStrictEqual(extractODataServices(''), []);
    assert.deepStrictEqual(extractODataServices(null), []);
    assert.deepStrictEqual(extractODataServices('$,$FAP_PAYMENT_POST_SRV$'), ['FAP_PAYMENT_POST_SRV']);
    assert.deepStrictEqual(
      extractODataServices('$$; FAP_PAYMENT_POST_SRV , FAR_PAYMENT_POST_SRV | FAP_PAYMENT_POST_SRV'),
      ['FAP_PAYMENT_POST_SRV', 'FAR_PAYMENT_POST_SRV']
    );
  });

  it('normalizeCatalogueApp normalizes raw OData responses into the FioriX catalogue data model', () => {
    const rawF1612 = {
      appId: 'F1612',
      AppName: 'Post Outgoing Payments',
      ApplicationType: 'Transactional',
      UITechnologyCombined: '$SAP Fiori (SAPUI5)$',
      SAPUI5ComponentIdCombined: '$fin.ap.payment.post$',
      LobCombined: '$Finance, Accounts Payable$',
      GTMLoBName: 'Finance',
      ODataServicesCombined: '$$,$FAP_PAYMENT_POST_SRV$',
      BusinessRoleNameCombined: '$Accounts Payable Accountant$',
      BusinessCatalogNameCombined: '$SAP_SFIN_BC_AP_PAYMENTS$',
      TechnicalCatalogNameCombined: '$SAP_TC_FIN_AP_COMMON$',
      PVBackend: 'SAP S/4HANA 2023',
      FrontendSoftwareComponent: 'UIAPFI70 900'
    };

    const norm = normalizeCatalogueApp(rawF1612, 'OFFICIAL_CATALOGUE_LIVE');
    assert.strictEqual(norm.appId, 'F1612');
    assert.strictEqual(norm.appName, 'Post Outgoing Payments');
    assert.strictEqual(norm.appType, 'Transactional');
    assert.strictEqual(norm.uiTechnology, 'SAP Fiori (SAPUI5)');
    assert.strictEqual(norm.businessProcess, 'Finance, Accounts Payable');
    assert.deepStrictEqual(norm.odataServices, ['FAP_PAYMENT_POST_SRV']);
    assert.strictEqual(norm.sapui5Component, 'fin.ap.payment.post');
    assert.strictEqual(norm.businessRole, 'Accounts Payable Accountant');
    assert.strictEqual(norm.businessCatalog, 'SAP_SFIN_BC_AP_PAYMENTS');
    assert.strictEqual(norm.provenance, 'OFFICIAL_CATALOGUE_LIVE');
    assert.ok(norm.documentationUrl.includes('F1612'));
  });

  it('OfficialFioriCatalogueAdapter retrieves an app by ID and caches to memory and disk', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorix-cat-test-'));
    const cacheFilePath = path.join(tempDir, 'catalog_cache.json');

    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        d: {
          results: [
            {
              appId: 'F1612',
              AppName: 'Post Outgoing Payments',
              ApplicationType: 'Transactional',
              UITechnologyCombined: '$SAP Fiori (SAPUI5)$',
              ODataServicesCombined: '$$,$FAP_PAYMENT_POST_SRV$'
            }
          ]
        }
      })
    });

    const origFetch = global.fetch;
    global.fetch = mockFetch;

    try {
      const adapter = new OfficialFioriCatalogueAdapter({ cacheFilePath });

      // First call (live)
      const res1 = await adapter.getAppById('F1612');
      assert.strictEqual(res1.success, true);
      assert.strictEqual(res1.fromCache, false);
      assert.strictEqual(res1.app.appId, 'F1612');

      // Second call (served from memory cache)
      const res2 = await adapter.getAppById('F1612');
      assert.strictEqual(res2.success, true);
      assert.strictEqual(res2.fromCache, true);

      // Verify file was written to disk
      assert.strictEqual(fs.existsSync(cacheFilePath), true);
    } finally {
      global.fetch = origFetch;
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it('OfficialFioriCatalogueAdapter falls back to disk cache when live query fails', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorix-cat-fallback-'));
    const cacheFilePath = path.join(tempDir, 'catalog_cache.json');

    const cachedSnapshot = [
      {
        appId: 'F1612',
        appName: 'Post Outgoing Payments (Cached)',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori (SAPUI5)',
        businessProcess: 'Finance',
        odataServices: ['FAP_PAYMENT_POST_SRV'],
        productVersion: 'SAP S/4HANA',
        documentationUrl: 'https://fioriappslibrary.hana.ondemand.com/#/detail/Apps(\'F1612\')/'
      }
    ];

    fs.writeFileSync(cacheFilePath, JSON.stringify(cachedSnapshot), 'utf8');

    // Simulate network error on fetch
    const mockFetch = async () => {
      throw new Error('ETIMEDOUT: Connection to fioriappslibrary failed');
    };

    const origFetch = global.fetch;
    global.fetch = mockFetch;

    try {
      const adapter = new OfficialFioriCatalogueAdapter({ cacheFilePath });

      // Call with refresh: true to force live query which fails and falls back to cached snapshot with warning
      const res = await adapter.getAppById('F1612', { refresh: true });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.fromCache, true);
      assert.strictEqual(res.provenance, 'OFFICIAL_CATALOGUE_CACHED');
      assert.strictEqual(res.app.appId, 'F1612');
      assert.ok(res.warning.includes('ETIMEDOUT'));
    } finally {
      global.fetch = origFetch;
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it('OfficialFioriCatalogueAdapter evaluates candidates against live S21 Gateway services yielding VERIFIED_MATCH for F1612', () => {
    const adapter = new OfficialFioriCatalogueAdapter();

    const candidateApps = [
      {
        appId: 'F1612',
        appName: 'Post Outgoing Payments',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori (SAPUI5)',
        businessProcess: 'Finance',
        productVersion: 'SAP S/4HANA 2023',
        odataServices: ['FAP_PAYMENT_POST_SRV'],
        documentationUrl: 'https://fioriappslibrary.hana.ondemand.com/#/detail/Apps(\'F1612\')/'
      },
      {
        appId: 'F-53',
        appName: 'Post Outgoing Payments - For Suppliers',
        appType: 'SAP GUI',
        uiTechnology: 'SAP GUI for HTML',
        businessProcess: 'Finance',
        productVersion: 'SAP S/4HANA 2023',
        odataServices: [],
        documentationUrl: 'https://fioriappslibrary.hana.ondemand.com/#/detail/Apps(\'F-53\')/'
      },
      {
        appId: 'F9999',
        appName: 'Unrelated App',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        businessProcess: 'Sales',
        productVersion: 'SAP S/4HANA 2023',
        odataServices: ['ZUNREGISTERED_SRV'],
        documentationUrl: 'https://fioriappslibrary.hana.ondemand.com/#/detail/Apps(\'F9999\')/'
      }
    ];

    const liveGatewayServices = [
      {
        technicalServiceName: 'ZFAP_PAYMENT_POST_SRV',
        description: 'Post Outgoing Supplier Payment'
      },
      {
        technicalServiceName: 'ZFAP_MANUAL_CLEARING_SRV',
        description: 'Manual Clearing'
      }
    ];

    const evalResult = adapter.evaluateCandidateMatches({
      tcode: 'F-53',
      candidateApps,
      liveGatewayServices
    });

    assert.strictEqual(evalResult.status, 'VERIFIED_MATCH');
    assert.strictEqual(evalResult.candidatesCount, 3);

    // F1612 should be VERIFIED_MATCH because FAP_PAYMENT_POST_SRV is active on S21
    const f1612 = evalResult.candidates.find((c) => c.appId === 'F1612');
    assert.ok(f1612);
    assert.strictEqual(f1612.matchStatus, 'VERIFIED_MATCH');
    assert.strictEqual(f1612.matchType, 'DIRECT_SUCCESSOR_ODATA_VERIFIED');
    assert.strictEqual(f1612.confidence, 'HIGH');
    assert.deepStrictEqual(f1612.verifiedODataServices, ['FAP_PAYMENT_POST_SRV']);

    // F-53 should be POSSIBLE_MATCH (classic SAP GUI tile)
    const f53 = evalResult.candidates.find((c) => c.appId === 'F-53');
    assert.ok(f53);
    assert.strictEqual(f53.matchStatus, 'POSSIBLE_MATCH');
    assert.strictEqual(f53.matchType, 'SAP_GUI_HTML');

    // F9999 should be POSSIBLE_MATCH / RELATED_MATCH
    const f9999 = evalResult.candidates.find((c) => c.appId === 'F9999');
    assert.ok(f9999);
    assert.strictEqual(f9999.matchStatus, 'POSSIBLE_MATCH');
    assert.strictEqual(f9999.matchType, 'RELATED_MATCH');
  });
});

describe('FioriX Sprint 7 — HTTP Server Official Catalogue Endpoints Integration', () => {
  const TEST_ADMIN_SECRET = 'sprint-7-test-secret-xyz';

  const mockOfficialCatalogueAdapter = {
    getAppById: async (appId) => {
      if (appId === 'F1612') {
        return {
          success: true,
          statusCode: 'SUCCESS',
          httpStatus: 200,
          fromCache: false,
          app: {
            appId: 'F1612',
            appName: 'Post Outgoing Payments',
            appType: 'Transactional',
            uiTechnology: 'SAP Fiori (SAPUI5)',
            businessProcess: 'Finance',
            odataServices: ['FAP_PAYMENT_POST_SRV'],
            productVersion: 'SAP S/4HANA 2023',
            documentationUrl: 'https://fioriappslibrary.hana.ondemand.com/#/detail/Apps(\'F1612\')/'
          }
        };
      }
      return {
        success: false,
        statusCode: 'NOT_FOUND',
        httpStatus: 404,
        errorMessage: `Application "${appId}" not found in Official SAP Fiori Apps Reference Library.`,
        app: null
      };
    },
    searchApps: async (params) => {
      if (params.tcode === 'F-53' || params.query === 'Payments') {
        return {
          success: true,
          statusCode: 'SUCCESS',
          httpStatus: 200,
          totalCount: 2,
          returnedCount: 2,
          candidates: [
            {
              appId: 'F1612',
              appName: 'Post Outgoing Payments',
              appType: 'Transactional',
              uiTechnology: 'SAP Fiori (SAPUI5)',
              businessProcess: 'Finance',
              odataServices: ['FAP_PAYMENT_POST_SRV'],
              productVersion: 'SAP S/4HANA 2023',
              documentationUrl: 'https://fioriappslibrary.hana.ondemand.com/#/detail/Apps(\'F1612\')/'
            },
            {
              appId: 'F-53',
              appName: 'Post Outgoing Payments - For Suppliers',
              appType: 'SAP GUI',
              uiTechnology: 'SAP GUI for HTML',
              businessProcess: 'Finance',
              odataServices: [],
              productVersion: 'SAP S/4HANA 2023',
              documentationUrl: 'https://fioriappslibrary.hana.ondemand.com/#/detail/Apps(\'F-53\')/'
            }
          ]
        };
      }
      return {
        success: true,
        statusCode: 'SUCCESS',
        httpStatus: 200,
        totalCount: 0,
        returnedCount: 0,
        candidates: []
      };
    },
    evaluateCandidateMatches: ({ candidateApps }) => {
      return {
        status: 'VERIFIED_MATCH',
        candidatesCount: candidateApps.length,
        candidates: candidateApps.map((c) => ({
          ...c,
          matchStatus: c.appId === 'F1612' ? 'VERIFIED_MATCH' : 'POSSIBLE_MATCH',
          matchType: c.appId === 'F1612' ? 'DIRECT_SUCCESSOR_ODATA_VERIFIED' : 'SAP_GUI_HTML',
          confidence: 'HIGH',
          verifiedODataServices: c.odataServices,
          rationale: `Verified candidate ${c.appId}`,
          evidence: [`Record: ${c.appId}`]
        }))
      };
    }
  };

  const mockGatewayAdapter = {
    getCatalogServices: async () => ({
      success: true,
      httpStatus: 200,
      totalCount: 1,
      returnedCount: 1,
      services: [
        {
          technicalServiceName: 'ZFAP_PAYMENT_POST_SRV',
          description: 'Post Outgoing Supplier Payment'
        }
      ]
    })
  };

  const mockTransactionAdapter = {
    discoverTransaction: async (tcode) => ({
      success: true,
      httpStatus: 200,
      verificationStatus: 'PARTIALLY_AVAILABLE',
      transaction: {
        tcode,
        description: 'Post Outgoing Payments',
        program: 'SAPMF05A',
        package: 'FBAS'
      },
      evidence: ['Live Gateway discovery']
    })
  };

  const mockBtpAdapter = {
    verifyAdminSecret: (secret) => secret === TEST_ADMIN_SECRET,
    validateConfiguration: () => ({ isValid: true, configuration: {}, destinationBinding: {}, connectivityBinding: {} })
  };

  it('protects GET /api/v1/fiori-catalogue/apps/:appId with ?refresh=true and returns 401 when unauthorized, but allows public cached read', async () => {
    const origSecret = process.env.FIORIX_ADMIN_SECRET;
    process.env.FIORIX_ADMIN_SECRET = TEST_ADMIN_SECRET;

    const server = createServer({
      btpAdapter: mockBtpAdapter,
      officialCatalogueAdapter: mockOfficialCatalogueAdapter
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // 1. refresh=true requires admin authorization
      const resRefresh = await fetch(`http://localhost:${port}/api/v1/fiori-catalogue/apps/F1612?refresh=true`);
      assert.strictEqual(resRefresh.status, 401);
      const dataRefresh = await resRefresh.json();
      assert.strictEqual(dataRefresh.statusCode, 'UNAUTHORIZED');

      // 2. Public read-only access succeeds without admin secret
      const resPublic = await fetch(`http://localhost:${port}/api/v1/fiori-catalogue/apps/F1612`);
      assert.strictEqual(resPublic.status, 200);
      const dataPublic = await resPublic.json();
      assert.strictEqual(dataPublic.success, true);
      assert.strictEqual(dataPublic.app.appId, 'F1612');
    } finally {
      server.close();
      process.env.FIORIX_ADMIN_SECRET = origSecret;
    }
  });

  it('allows GET /api/v1/fiori-catalogue/apps/F1612 with 200 when authorized and 404 for unknown app', async () => {
    const origSecret = process.env.FIORIX_ADMIN_SECRET;
    process.env.FIORIX_ADMIN_SECRET = TEST_ADMIN_SECRET;

    const server = createServer({
      btpAdapter: mockBtpAdapter,
      officialCatalogueAdapter: mockOfficialCatalogueAdapter
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // 1. Success for F1612
      const resF1612 = await fetch(`http://localhost:${port}/api/v1/fiori-catalogue/apps/F1612`, {
        headers: { 'X-FioriX-Admin-Secret': TEST_ADMIN_SECRET }
      });
      assert.strictEqual(resF1612.status, 200);
      const dataF1612 = await resF1612.json();
      assert.strictEqual(dataF1612.success, true);
      assert.strictEqual(dataF1612.app.appId, 'F1612');

      // 2. 404 for unknown app
      const res404 = await fetch(`http://localhost:${port}/api/v1/fiori-catalogue/apps/UNKNOWN_APP`, {
        headers: { 'X-FioriX-Admin-Secret': TEST_ADMIN_SECRET }
      });
      assert.strictEqual(res404.status, 404);
      const data404 = await res404.json();
      assert.strictEqual(data404.success, false);
      assert.strictEqual(data404.statusCode, 'NOT_FOUND');
    } finally {
      server.close();
      process.env.FIORIX_ADMIN_SECRET = origSecret;
    }
  });

  it('allows GET /api/v1/fiori-catalogue/search with 200 and evaluates matches when evaluateLive=true', async () => {
    const origSecret = process.env.FIORIX_ADMIN_SECRET;
    process.env.FIORIX_ADMIN_SECRET = TEST_ADMIN_SECRET;

    const server = createServer({
      btpAdapter: mockBtpAdapter,
      gatewayAdapter: mockGatewayAdapter,
      officialCatalogueAdapter: mockOfficialCatalogueAdapter
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      const res = await fetch(`http://localhost:${port}/api/v1/fiori-catalogue/search?tcode=F-53&evaluateLive=true`, {
        headers: { 'X-FioriX-Admin-Secret': TEST_ADMIN_SECRET }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.candidates.length, 2);
      assert.ok(data.evaluatedMatches);
      assert.strictEqual(data.evaluatedMatches.status, 'VERIFIED_MATCH');
    } finally {
      server.close();
      process.env.FIORIX_ADMIN_SECRET = origSecret;
    }
  });
});
