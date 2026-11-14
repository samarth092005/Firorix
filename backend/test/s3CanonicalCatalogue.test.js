import test from 'node:test';
import assert from 'node:assert/strict';
import DatabasePool from '../src/infrastructure/db/pool.js';
import CatalogueRepository from '../src/infrastructure/db/repositories/catalogueRepository.js';
import {
  OfficialFioriCatalogueAdapter,
  extractODataServices,
  normalizeCatalogueApp
} from '../src/adapters/officialFioriCatalogueAdapter.js';
import { createServer } from '../src/server.js';
import http from 'node:http';

test('Fiorify S3 — Canonical SAP Fiori Catalogue Foundation Test Suite', async (t) => {
  process.env.FIORIFY_ALLOW_EMBEDDED_PG = 'true';
  const pool = await DatabasePool.getPool();
  assert.ok(pool, 'PostgreSQL pool must be initialized');

  const catalogueRepo = new CatalogueRepository(pool);
  const testAppId = `F-TEST-${Date.now().toString().slice(-6)}`;

  t.after(async () => {
    try {
      await pool.query('DELETE FROM fiori_catalog_apps WHERE app_id LIKE $1;', ['F-TEST-%']);
    } catch {}
    await DatabasePool.close();
  });

  await t.test('1. extractODataServices parses and cleans delimited services', () => {
    assert.deepStrictEqual(extractODataServices(''), []);
    assert.deepStrictEqual(extractODataServices(null), []);
    assert.deepStrictEqual(
      extractODataServices('$,$FAP_PAYMENT_POST_SRV$,FAR_CUSTOMER_SRV$'),
      ['FAP_PAYMENT_POST_SRV', 'FAR_CUSTOMER_SRV']
    );
  });

  await t.test('2. normalizeCatalogueApp populates semantic object, action, and release compatibility', () => {
    const raw = {
      appId: 'F1612',
      AppName: 'Post Outgoing Payments',
      ApplicationType: 'Transactional',
      UITechnologyCombined: '$SAP Fiori elements$',
      LobCombined: '$Finance, Accounts Payable$',
      GTMLoBName: 'Finance',
      ODataServicesCombined: '$$,$FAP_PAYMENT_POST_SRV$',
      SemanticObject: 'Payment',
      SemanticAction: 'post',
      PVBackend: 'SAP S/4HANA 2023',
      BusinessRoleNameCombined: '$Accounts Payable Accountant$'
    };

    const norm = normalizeCatalogueApp(raw);
    assert.equal(norm.appId, 'F1612');
    assert.equal(norm.appName, 'Post Outgoing Payments');
    assert.equal(norm.semanticObject, 'Payment');
    assert.equal(norm.semanticAction, 'post');
    assert.equal(norm.deploymentType, 'ON_PREMISE');
    assert.ok(Array.isArray(norm.odataServices));
    assert.ok(norm.odataServices.includes('FAP_PAYMENT_POST_SRV'));
    assert.ok(norm.compatibilityMatrix);
    assert.equal(norm.compatibilityMatrix.onPremise, true);
  });

  await t.test('3. CatalogueRepository upserts and retrieves app with Migration 005 attributes', async () => {
    const appData = {
      appId: testAppId,
      appName: 'Test Payment Posting',
      description: 'Test application for automated verification',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori elements',
      businessProcess: 'Accounts Payable',
      lineOfBusiness: 'Finance',
      productVersion: 'SAP S/4HANA 2023 FPS02',
      softwareComponent: 'S4CORE 108',
      businessRole: 'AP_ACCOUNTANT',
      semanticObject: 'Payment',
      semanticAction: 'post',
      compatibilityMatrix: { onPremise: true, privateCloud: true, publicCloud: false },
      supportedCapabilities: ['TRANSACTIONAL', 'DATA_ENTRY'],
      deploymentType: 'ON_PREMISE',
      odataServices: ['Z_TEST_PAYMENT_SRV'],
      leadingTCode: 'FB05',
      relatedTCodes: ['F-53']
    };

    const inserted = await catalogueRepo.upsertApp(appData);
    assert.ok(inserted);
    assert.equal(inserted.appId, testAppId);
    assert.equal(inserted.semanticObject, 'Payment');
    assert.equal(inserted.semanticAction, 'post');
    assert.equal(inserted.deploymentType, 'ON_PREMISE');
    assert.deepStrictEqual(inserted.compatibilityMatrix, { onPremise: true, privateCloud: true, publicCloud: false });
    assert.deepStrictEqual(inserted.supportedCapabilities, ['TRANSACTIONAL', 'DATA_ENTRY']);
    assert.ok(inserted.odataServices.includes('Z_TEST_PAYMENT_SRV'));
    assert.equal(inserted.leadingTCode, 'FB05');
  });

  await t.test('4. CatalogueRepository filters apps across multi-dimensional criteria with pagination', async () => {
    const listResult = await catalogueRepo.listApps({
      semanticObject: 'Payment',
      semanticAction: 'post',
      lineOfBusiness: 'Finance',
      page: 1,
      pageSize: 10
    });

    assert.ok(Array.isArray(listResult), 'Must be an array for backwards-compatibility');
    assert.ok(listResult.length >= 1, 'Should find at least our inserted app');
    assert.ok(listResult.totalCount >= 1, 'Must include totalCount metadata');
    assert.equal(listResult.page, 1);
    assert.equal(listResult.pageSize, 10);
    assert.ok(listResult.some(a => a.appId === testAppId));
  });

  await t.test('5. CatalogueRepository getStats returns statistics with semantic object counts', async () => {
    const stats = await catalogueRepo.getStats();
    assert.ok(stats.totalRecords >= 1);
    assert.ok(stats.semanticObjectsCount >= 1);
    assert.ok(typeof stats.recordsByAppType === 'object');
  });

  await t.test('6. HTTP API /api/v1/fiori-catalogue/apps and /status respond correctly', async () => {
    const server = createServer({ useDatabase: true });
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;

    try {
      // Test search endpoint with filter
      const searchRes = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/v1/fiori-catalogue/search?semanticObject=Payment&limit=5`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }).on('error', reject);
      });

      assert.equal(searchRes.status, 200);
      assert.equal(searchRes.body.success, true);
      assert.ok(Array.isArray(searchRes.body.candidates));

      // Test status endpoint
      const statusRes = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/api/v1/fiori-catalogue/status`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }).on('error', reject);
      });

      assert.equal(statusRes.status, 200);
      assert.equal(statusRes.body.success, true);
      assert.ok(statusRes.body.status);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
});
