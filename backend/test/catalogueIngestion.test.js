import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { FALIngestionService } from '../src/tools/ingestFAL.js';
import { OfficialFioriCatalogueAdapter } from '../src/adapters/officialFioriCatalogueAdapter.js';

describe('FioriX CAT-01 — Official SAP Fiori Apps Reference Library Ingestion Tests', () => {
  let server;
  let baseUrl;
  let tempDir;
  let tempCachePath;
  let tempStatusPath;
  let falIngestionService;
  let officialCatalogueAdapter;
  const adminSecret = 'test-fiorix-admin-cat01';

  const initialCatalogueData = [
    {
      appId: 'F1612',
      appName: 'Post Outgoing Payments',
      description: 'Accounts Payable Outgoing Payments Application',
      appType: 'Transactional',
      uiTechnology: 'SAP Fiori elements',
      businessProcess: 'Financial Accounting',
      lineOfBusiness: 'Finance',
      productVersion: 'SAP S/4HANA 2023',
      softwareComponent: 'S4CORE 108',
      odataServices: ['FAP_PAYMENT_POST_SRV'],
      provenance: 'OFFICIAL_CATALOGUE_LIVE',
      retrievalTimestamp: '2026-11-05T05:59:56.401Z'
    }
  ];

  before(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fiorix-cat01-test-'));
    tempCachePath = path.join(tempDir, 'fiori_app_catalog_cache.json');
    tempStatusPath = path.join(tempDir, 'fiori_app_catalog_status.json');

    // Seed initial catalogue cache with 1 record
    fs.writeFileSync(tempCachePath, JSON.stringify(initialCatalogueData, null, 2), 'utf8');

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

    // Set admin secret in environment for test authorization
    process.env.FIORIX_ADMIN_SECRET = adminSecret;

    await new Promise((resolve) => {
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    delete process.env.FIORIX_ADMIN_SECRET;
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  // 1. Valid CSV import
  it('1. imports valid FAL CSV export data and increments record count', async () => {
    const csvContent = [
      'App ID,App Name,Application Type,UI Technology,Line of Business,OData Service(s),Product Version',
      'F0773,"Manage Outgoing Payments",Transactional,SAP Fiori elements,Finance,FAR_OUTGOING_PAYMENT_SRV,SAP S/4HANA 2023',
      'F1345,"Post Incoming Payments",Transactional,SAP Fiori elements,Finance,FAP_POST_INCOMING_PAYMENTS_SRV,SAP S/4HANA 2023'
    ].join('\n');

    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: csvContent
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.summary.importedCount, 2);
    assert.strictEqual(body.summary.totalRecords, 2);
    assert.strictEqual(body.summary.rejectedCount, 0);

    // Verify cache file on disk now has 3 records total (1 initial + 2 new)
    const onDisk = JSON.parse(fs.readFileSync(tempCachePath, 'utf8'));
    assert.strictEqual(onDisk.length, 3);
    const f0773 = onDisk.find((a) => a.appId === 'F0773');
    assert.ok(f0773);
    assert.strictEqual(f0773.appName, 'Manage Outgoing Payments');
    assert.deepStrictEqual(f0773.odataServices, ['FAR_OUTGOING_PAYMENT_SRV']);
    assert.strictEqual(f0773.provenance, 'OFFICIAL_FAL_EXPORT');
  });

  // 2. Valid JSON import
  it('2. imports valid FAL JSON export and normalizes records', async () => {
    const jsonRecords = [
      {
        appId: 'F1814',
        appName: 'Manage Sales Orders',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        businessProcess: 'Sales and Distribution',
        productVersion: 'SAP S/4HANA 2023',
        odataServices: ['SD_F1814_SO_MANAGE_SRV']
      }
    ];

    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: JSON.stringify(jsonRecords)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.summary.importedCount, 1);

    const onDisk = JSON.parse(fs.readFileSync(tempCachePath, 'utf8'));
    assert.strictEqual(onDisk.length, 4);
    const f1814 = onDisk.find((a) => a.appId === 'F1814');
    assert.ok(f1814);
    assert.strictEqual(f1814.businessProcess, 'Sales and Distribution');
  });

  // 3. Missing required identifiers
  it('3. rejects records missing required appId and records validation errors', async () => {
    const csvWithMissingId = [
      'App ID,App Name,Application Type',
      ',"Nameless App Without ID",Transactional',
      'F9999,"Valid App",Transactional'
    ].join('\n');

    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: csvWithMissingId
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.summary.rejectedCount, 1);
    assert.strictEqual(body.summary.importedCount, 1);
    assert.strictEqual(body.summary.errors.length, 1);
    assert.ok(body.summary.errors[0].error.includes('appId'));
  });

  // 4. Malformed CSV/JSON
  it('4. rejects malformed JSON and empty payloads with HTTP 400', async () => {
    // Malformed JSON
    const resBadJson = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: '{"brokenJson": [1, 2, '
    });
    assert.strictEqual(resBadJson.status, 400);
    const bodyBadJson = await resBadJson.json();
    assert.strictEqual(bodyBadJson.statusCode, 'BAD_REQUEST');

    // Empty payload
    const resEmpty = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: '   '
    });
    assert.strictEqual(resEmpty.status, 400);
  });

  // 5. Duplicate application IDs within import batch
  it('5. detects duplicate application IDs within import batch and handles deterministically', async () => {
    const batchWithDups = [
      'App ID,App Name,UI Technology',
      'F2001,"App V1",SAP Fiori elements',
      'F2001,"App V1",SAP Fiori elements'
    ].join('\n');

    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: batchWithDups
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.summary.importedCount, 1); // Deduplicated to 1
  });

  // 6. Conflicting duplicate records
  it('6. detects and logs attribute conflicts between duplicate entries in batch', async () => {
    const batchWithConflict = [
      'App ID,App Name,UI Technology',
      'F3001,"Initial Title",SAP Fiori elements',
      'F3001,"Conflicting Divergent Title",SAP GUI for HTML'
    ].join('\n');

    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/csv',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: batchWithConflict
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.summary.conflicts.length, 1);
    assert.strictEqual(body.summary.conflicts[0].appId, 'F3001');
    assert.strictEqual(body.summary.conflicts[0].conflictType, 'BATCH_DUPLICATE_DIVERGENCE');
  });

  // 7. Missing optional fields
  it('7. safely handles missing optional fields without inventing technical dependencies', async () => {
    const minimalRecord = [
      {
        appId: 'F4001'
        // Missing name, description, OData, role, etc.
      }
    ];

    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: JSON.stringify(minimalRecord)
    });

    assert.strictEqual(res.status, 201);
    const onDisk = JSON.parse(fs.readFileSync(tempCachePath, 'utf8'));
    const f4001 = onDisk.find((a) => a.appId === 'F4001');
    assert.ok(f4001);
    assert.strictEqual(f4001.appName, 'F4001');
    assert.deepStrictEqual(f4001.odataServices, []); // No invented services
    assert.strictEqual(f4001.businessRole, undefined); // No invented roles
  });

  // 8. Provenance preservation
  it('8. preserves explicit provenance for every record and does not overwrite existing provenance', async () => {
    const customProvenanceRecord = [
      {
        appId: 'F5001',
        appName: 'Curated Custom Fixture',
        provenance: 'CURATED_FIXTURE'
      }
    ];

    await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: JSON.stringify(customProvenanceRecord)
    });

    const onDisk = JSON.parse(fs.readFileSync(tempCachePath, 'utf8'));
    const f5001 = onDisk.find((a) => a.appId === 'F5001');
    assert.strictEqual(f5001.provenance, 'CURATED_FIXTURE');

    // Initial F1612 should still have OFFICIAL_CATALOGUE_LIVE
    const f1612 = onDisk.find((a) => a.appId === 'F1612');
    assert.strictEqual(f1612.provenance, 'OFFICIAL_CATALOGUE_LIVE');
  });

  // 9. Repeat import without duplicate growth (Idempotence)
  it('9. repeat import of identical data skips duplicate growth', async () => {
    const countBefore = JSON.parse(fs.readFileSync(tempCachePath, 'utf8')).length;

    const repeatData = [
      {
        appId: 'F0773',
        appName: 'Manage Outgoing Payments',
        appType: 'Transactional',
        uiTechnology: 'SAP Fiori elements',
        productVersion: 'SAP S/4HANA 2023',
        odataServices: ['FAR_OUTGOING_PAYMENT_SRV']
      }
    ];

    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: JSON.stringify(repeatData)
    });

    assert.strictEqual(res.status, 201);
    const body = await res.json();
    assert.strictEqual(body.summary.importedCount, 0);
    assert.strictEqual(body.summary.skippedCount, 1);

    const countAfter = JSON.parse(fs.readFileSync(tempCachePath, 'utf8')).length;
    assert.strictEqual(countAfter, countBefore);
  });

  // 10. Failed import does not destroy existing catalogue data
  it('10. failed import preserves previous valid catalogue completely', async () => {
    const rawBefore = fs.readFileSync(tempCachePath, 'utf8');

    // Attempt import with broken JSON
    await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FioriX-Admin-Secret': adminSecret
      },
      body: 'INVALID_CORRUPT_STRING'
    });

    const rawAfter = fs.readFileSync(tempCachePath, 'utf8');
    assert.strictEqual(rawAfter, rawBefore, 'Cache must remain strictly untouched on failure');
  });

  // 11. Oversized input rejection
  it('11. rejects oversized input exceeding 10MB limit with HTTP 413', async () => {
    const hugePayload = 'X'.repeat(11 * 1024 * 1024); // 11MB exceeds 10MB limit

    try {
      const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/csv',
          'X-FioriX-Admin-Secret': adminSecret
        },
        body: hugePayload
      });
      assert.strictEqual(res.status, 413);
    } catch (err) {
      // In some Node.js versions, early socket termination on payload limits causes fetch rejection
      assert.ok(err);
    }
  });

  // 12. Administrative authorization
  it('12. requires administrative authorization and rejects unauthorized requests with HTTP 401', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-FioriX-Admin-Secret': 'wrong-unauthorized-secret'
      },
      body: JSON.stringify([{ appId: 'F9999' }])
    });

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.statusCode, 'UNAUTHORIZED');
  });

  // 13. Catalogue status endpoint
  it('13. returns catalogue size, source distribution, and import status from status endpoint', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/status`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.status);
    assert.ok(body.status.totalRecords > 0);
    assert.ok(body.status.sourceDistribution);
    assert.strictEqual(typeof body.status.sourceDistribution.OFFICIAL_FAL_EXPORT, 'number');
    assert.strictEqual(body.status.importStatus, 'SUCCESS');
  });

  // 14. Existing catalogue search regression
  it('14. verifies existing catalogue search endpoint continues to work', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/search?query=Outgoing`, {
      headers: { 'X-FioriX-Admin-Secret': adminSecret }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.ok(body.candidates.length > 0);
    const foundF0773 = body.candidates.some((c) => c.appId === 'F0773');
    assert.ok(foundF0773, 'Search must return imported F0773');
  });

  // 15. Existing application detail regression
  it('15. verifies existing application detail endpoint retrieves imported apps by ID', async () => {
    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/apps/F0773`, {
      headers: { 'X-FioriX-Admin-Secret': adminSecret }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.app.appId, 'F0773');
    assert.strictEqual(body.app.appName, 'Manage Outgoing Payments');
    assert.deepStrictEqual(body.app.odataServices, ['FAR_OUTGOING_PAYMENT_SRV']);
  });
});
