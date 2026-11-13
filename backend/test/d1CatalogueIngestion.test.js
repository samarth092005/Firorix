import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import {
  FALIngestionService,
  PRODUCT_SUITES,
  CATALOGUE_SOURCE_STATES,
  classifyProductSuite,
  normalizeRelease,
  parseXlsx
} from '../src/tools/ingestFAL.js';
import { OfficialFioriCatalogueAdapter, CATALOGUE_AVAILABILITY_STATES } from '../src/adapters/officialFioriCatalogueAdapter.js';

describe('Workstream D1 — Official Fiori Catalogue Extraction & Release Specificity Tests', () => {
  let server;
  let baseUrl;
  let tempDir;
  let tempCachePath;
  let tempStatusPath;
  let falIngestionService;
  let officialCatalogueAdapter;
  const adminSecret = 'test-Fiorify-d1-admin';

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'Fiorify-d1-cat-test-'));
    tempCachePath = path.join(tempDir, 'fiori_app_catalog_cache.json');
    tempStatusPath = path.join(tempDir, 'fiori_app_catalog_status.json');

    // Initial baseline with 2 apps
    const initialApps = [
      {
        appId: 'F1612',
        appName: 'Post Outgoing Payments',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        productSuite: PRODUCT_SUITES.SAP_S4HANA_ON_PREMISE,
        productVersion: 'SAP S/4HANA 2023',
        release: 'SAP S/4HANA 2023',
        odataServices: ['FAP_PAYMENT_POST_SRV'],
        provenance: 'OFFICIAL_FAL_EXPORT',
        businessProcess: 'Financial Accounting',
        lineOfBusiness: 'Finance'
      },
      {
        appId: 'F0842A',
        appName: 'Manage Purchase Orders',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        productSuite: PRODUCT_SUITES.SAP_S4HANA_ON_PREMISE,
        productVersion: 'SAP S/4HANA 2023',
        release: 'SAP S/4HANA 2023',
        odataServices: ['MM_PUR_PO_MAINT_V2_SRV'],
        provenance: 'OFFICIAL_FAL_EXPORT',
        businessProcess: 'Sourcing and Procurement',
        lineOfBusiness: 'Sourcing and Procurement'
      }
    ];

    fs.writeFileSync(tempCachePath, JSON.stringify(initialApps, null, 2), 'utf8');

    officialCatalogueAdapter = new OfficialFioriCatalogueAdapter({
      cacheFilePath: tempCachePath
    });

    falIngestionService = new FALIngestionService({
      cacheFilePath: tempCachePath,
      statusFilePath: tempStatusPath,
      adapter: officialCatalogueAdapter
    });

    const mockBtpAdapter = {
      verifyAdminSecret: (secret) => secret === adminSecret,
      validateConfiguration: () => ({ isValid: true, configuration: {}, destinationBinding: {}, connectivityBinding: {} })
    };

    server = createServer({
      btpAdapter: mockBtpAdapter,
      officialCatalogueAdapter,
      falIngestionService
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('D1.1: Product Suite Classification & Release Normalization', () => {
    it('accurately classifies S/4HANA On-Premise releases', () => {
      assert.strictEqual(classifyProductSuite('SAP S/4HANA 2023'), PRODUCT_SUITES.SAP_S4HANA_ON_PREMISE);
      assert.strictEqual(classifyProductSuite('SAP S/4HANA 2022 FPS01'), PRODUCT_SUITES.SAP_S4HANA_ON_PREMISE);
      assert.strictEqual(classifyProductSuite('SAP S/4HANA 1909'), PRODUCT_SUITES.SAP_S4HANA_ON_PREMISE);
    });

    it('accurately classifies S/4HANA Cloud Private Edition releases', () => {
      assert.strictEqual(classifyProductSuite('SAP S/4HANA Cloud Private Edition 2025'), PRODUCT_SUITES.SAP_S4HANA_CLOUD_PRIVATE);
      assert.strictEqual(classifyProductSuite('S/4HANA Cloud, private edition'), PRODUCT_SUITES.SAP_S4HANA_CLOUD_PRIVATE);
    });

    it('accurately classifies S/4HANA Cloud Public Edition releases', () => {
      assert.strictEqual(classifyProductSuite('SAP S/4HANA Cloud Public Edition 2608'), PRODUCT_SUITES.SAP_S4HANA_CLOUD_PUBLIC);
      assert.strictEqual(classifyProductSuite('SAP S/4HANA Cloud 2408'), PRODUCT_SUITES.SAP_S4HANA_CLOUD_PUBLIC);
    });

    it('accurately classifies SAP Business Suite / ERP 6.0 releases', () => {
      assert.strictEqual(classifyProductSuite('SAP ERP 6.0 EHP8'), PRODUCT_SUITES.SAP_BUSINESS_SUITE);
      assert.strictEqual(classifyProductSuite('SAP enhancement package 7 for SAP ERP 6.0'), PRODUCT_SUITES.SAP_BUSINESS_SUITE);
    });

    it('normalizes releases cleanly', () => {
      assert.strictEqual(normalizeRelease('SAP S/4HANA 2023 FPS02'), '2023');
      assert.strictEqual(normalizeRelease('SAP S/4HANA Cloud Private Edition 2025 FPS00'), '2025');
      assert.strictEqual(normalizeRelease(''), 'UNKNOWN');
    });
  });

  describe('D1.2: XLSX Ingestion and Validation', () => {
    it('correctly ingests from official S/4HANA 2023 XLSX export', async () => {
      const candidates = [
        path.resolve(process.cwd(), 'data/s4hana_2023_official_fal_export.xlsx'),
        path.resolve(process.cwd(), '../data/s4hana_2023_official_fal_export.xlsx')
      ];
      const xlsxPath = candidates.find((p) => fs.existsSync(p));
      assert.ok(xlsxPath && fs.existsSync(xlsxPath), 'Official export XLSX must exist');

      const buf = fs.readFileSync(xlsxPath);
      const parsedRows = await parseXlsx(buf);
      assert.ok(Array.isArray(parsedRows) && parsedRows.length >= 25, 'Should parse at least 25 rows from XLSX');

      const ingestResult = await falIngestionService.ingest(buf, {
        format: 'xlsx',
        dryRun: false,
        sourceVersion: 'S4HANA_2023_FPS02_UNIT_TEST'
      });

      assert.strictEqual(ingestResult.success, true);
      assert.ok(ingestResult.totalRecords >= 25);
      assert.strictEqual(ingestResult.dryRun, false);
      assert.strictEqual(ingestResult.provenance, 'OFFICIAL_FAL_EXPORT');
    });
  });

  describe('D1.3: Adapter Filtering & Pagination', () => {
    it('supports pagination with page and pageSize', async () => {
      const res = await officialCatalogueAdapter.searchApps({
        page: 1,
        pageSize: 5
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.page, 1);
      assert.strictEqual(res.pageSize, 5);
      assert.strictEqual(res.candidates.length, 5);
      assert.ok(res.totalCount >= 25);
      assert.ok(res.totalPages >= 5);
    });

    it('filters accurately by productSuite', async () => {
      const res = await officialCatalogueAdapter.searchApps({
        productSuite: PRODUCT_SUITES.SAP_S4HANA_ON_PREMISE
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.candidates.length > 0);
      for (const app of res.candidates) {
        assert.ok(
          (app.productSuite || '').toUpperCase().includes('ON_PREMISE') ||
          (app.productVersion || '').includes('2023')
        );
      }
    });

    it('filters accurately by uiTechnology', async () => {
      const res = await officialCatalogueAdapter.searchApps({
        uiTechnology: 'SAP Fiori elements'
      });

      assert.strictEqual(res.success, true);
      assert.ok(res.candidates.length > 0);
      for (const app of res.candidates) {
        assert.ok((app.uiTechnology || '').includes('SAP Fiori elements'));
      }
    });

    it('filters accurately by odataService', async () => {
      const res = await officialCatalogueAdapter.searchApps({
        odataService: 'MM_PUR_PO_MAINT_V2_SRV'
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.candidates.length, 1);
      assert.strictEqual(res.candidates[0].appId, 'F0842A');
    });
  });

  describe('D1.4: Status Reporting & Rollback', () => {
    it('reports honest catalogue status with targetRelease and liveSourceStatus', async () => {
      const status = await falIngestionService.getStatus();
      assert.strictEqual(status.targetRelease, 'SAP S/4HANA 2023 On-Premise');
      assert.strictEqual(status.liveSourceStatus, CATALOGUE_SOURCE_STATES.OFFICIAL_EXPORT_IMPORTED);
      assert.ok(status.recordsByProductSuite);
      assert.ok(status.recordsByUiTechnology);
      assert.ok(status.totalRecords >= 25);
    });

    it('safely rolls back to prior snapshot via API endpoint', async () => {
      // 1. Ingest dummy single-record to create a backup
      const dummyCsv = 'AppId,AppName,UITechnologyCombined\nF9999,Dummy Rollback App,SAP Fiori elements';
      const ingestRes = await falIngestionService.ingest(dummyCsv, {
        format: 'csv',
        dryRun: false,
        sourceVersion: 'ROLLBACK_TEST'
      });
      assert.strictEqual(ingestRes.success, true);

      // Verify F9999 is now in catalogue
      const checkBefore = await officialCatalogueAdapter.getAppById('F9999');
      assert.strictEqual(checkBefore.success, true);

      // 2. Perform rollback via HTTP endpoint
      const rollbackResponse = await fetch(`${baseUrl}/api/v1/fiori-catalogue/rollback`, {
        method: 'POST',
        headers: {
          'X-Fiorify-Admin-Secret': adminSecret,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(rollbackResponse.status, 200);
      const rollbackJson = await rollbackResponse.json();
      assert.strictEqual(rollbackJson.success, true);

      // Verify F9999 is gone after rollback
      const checkAfter = await officialCatalogueAdapter.getAppById('F9999');
      assert.strictEqual(checkAfter.success, false);
    });

    it('rejects rollback when unauthorized', async () => {
      const rollbackResponse = await fetch(`${baseUrl}/api/v1/fiori-catalogue/rollback`, {
        method: 'POST',
        headers: {
          'X-Fiorify-Admin-Secret': 'wrong-secret',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      assert.strictEqual(rollbackResponse.status, 401);
    });
  });
});
