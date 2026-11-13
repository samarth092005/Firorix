import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { defaultPreviewManager } from '../src/generation/preview/previewManager.js';
import { defaultPreviewSessionStore } from '../src/generation/preview/previewSessionStore.js';
import { defaultGenerationProjectStore } from '../src/generation/projects/generationProjectStore.js';
import { defaultArchitectureDecisionEngine } from '../src/generation/architecture/architectureDecisionEngine.js';
import { generatePersistenceTables } from '../src/generation/abap/persistenceTableGenerator.js';
import { generateCdsEntities } from '../src/generation/abap/cdsViewEntityGenerator.js';
import { generateBehaviorDefinition } from '../src/generation/abap/rapBehaviorGenerator.js';
import { generateServiceDefinition } from '../src/generation/abap/serviceDefinitionGenerator.js';
import { generateFioriManifest } from '../src/generation/fiori/manifestGenerator.js';
import { generateFioriAnnotationsXml } from '../src/generation/fiori/fioriAnnotationGenerator.js';
import { generateFioriProjectScaffolding } from '../src/generation/fiori/fioriProjectStructureGenerator.js';
import { ArtifactRegistry } from '../src/generation/artifacts/artifactRegistry.js';
import { RAP_PROFILES } from '../src/generation/architecture/architectureContract.js';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('GEN-07: Local Preview & Mock OData V4 Runtime', () => {
  const adminUser = { id: 'USR-LOCAL', role: 'ADMIN', name: 'Lead Architect' };
  const testProjectId = 'PRJ-PREVIEW-TEST';

  let testProject;
  let previewUrl;
  let servicePrefix;

  before(async () => {
    // Ensure clean state if previously created
    const projectDir = path.resolve(defaultGenerationProjectStore.storageDir, testProjectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    // 1. Create a full project
    testProject = await defaultGenerationProjectStore.createProject({
      projectId: testProjectId,
      projectName: 'Preview Test PO System',
      description: 'GEN-07 Verification Project'
    }, adminUser);

    testProject.dataModelSpec = {
      entities: [
        {
          entityId: 'ENT-PO-01',
          name: 'PurchaseOrder',
          businessName: 'Purchase Order',
          tableName: 'ZPURCH_ORDER',
          entityType: 'ROOT',
          isRoot: true,
          fields: [
            { name: 'PurchaseOrderNumber', type: 'abap.char', length: 10, isKey: true, semanticRole: 'DOCUMENT_NUMBER' },
            { name: 'CompanyCode', type: 'abap.char', length: 4, isMandatory: true },
            { name: 'Supplier', type: 'abap.char', length: 10, isMandatory: true },
            { name: 'TotalNetAmount', type: 'abap.curr', precision: 15, scale: 2, semanticRole: 'AMOUNT' },
            { name: 'DocumentCurrency', type: 'abap.cuky' }
          ]
        },
        {
          entityId: 'ENT-PO-02',
          name: 'PurchaseOrderItem',
          businessName: 'PO Line Item',
          tableName: 'ZPURCH_ITEM',
          entityType: 'CHILD',
          isRoot: false,
          fields: [
            { name: 'PurchaseOrderNumber', type: 'abap.char', length: 10, isKey: true, semanticRole: 'PARENT_KEY' },
            { name: 'ItemNumber', type: 'abap.numc', length: 4, isKey: true },
            { name: 'Material', type: 'abap.char', length: 40 },
            { name: 'NetPriceAmount', type: 'abap.curr', precision: 15, scale: 2, semanticRole: 'AMOUNT' }
          ]
        }
      ],
      relationships: [
        {
          relationshipId: 'REL-01',
          name: '_Items',
          sourceEntityId: 'ENT-PO-01',
          targetEntityId: 'ENT-PO-02',
          relationshipType: 'COMPOSITION',
          cardinality: '[0..*]'
        }
      ]
    };

    testProject.requirementsSpec = {
      items: [
        {
          requirementId: 'REQ-01',
          title: 'Create PO Record',
          category: 'DATA_CREATE',
          status: 'CONFIRMED'
        }
      ]
    };

    const arch = defaultArchitectureDecisionEngine.evaluate(testProject);
    testProject.architectureSpec = arch;

    // Generate complete artifact suite and commit to registry
    const artifacts = [
      ...generatePersistenceTables(testProject, arch),
      ...generateCdsEntities(testProject, arch),
      ...generateBehaviorDefinition(testProject, arch),
      ...generateServiceDefinition(testProject, arch),
      generateFioriManifest(testProject, arch),
      generateFioriAnnotationsXml(testProject, arch),
      ...generateFioriProjectScaffolding(testProject, arch)
    ];

    ArtifactRegistry.commitArtifacts(testProject, artifacts);
    await defaultGenerationProjectStore.updateProject(testProjectId, {
      dataModelSpec: testProject.dataModelSpec,
      requirementsSpec: testProject.requirementsSpec,
      architectureSpec: testProject.architectureSpec,
      artifactRegistry: testProject.artifactRegistry
    }, adminUser);

    servicePrefix = '/sap/opu/odata4/sap/zui_purchaseorder/srvd/sap/zui_purchaseorder/0001';
  });

  after(async () => {
    try {
      await defaultPreviewManager.stopPreview(testProjectId, adminUser);
    } catch (e) {
      // ignore
    }
    const projectDir = path.resolve(defaultGenerationProjectStore.storageDir, testProjectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test('1. Starts preview server, binds strictly to 127.0.0.1, allocates port in 4050-4099', async () => {
    const startResult = await defaultPreviewManager.startPreview(testProjectId, {}, adminUser);
    assert.equal(startResult.success, true);
    assert.equal(startResult.session.status, 'RUNNING');
    assert.ok(startResult.session.port >= 4050 && startResult.session.port <= 4099);
    previewUrl = startResult.session.url;
    assert.ok(previewUrl.startsWith('http://127.0.0.1:'));
  });

  test('2. Serves OData V4 Service Document and $metadata with valid EDMX XML', async () => {
    // Service Document
    const docRes = await makeRequest(`${previewUrl}${servicePrefix}/`);
    assert.equal(docRes.statusCode, 200);
    assert.ok(docRes.json.value.some((e) => e.name === 'PurchaseOrder'));
    assert.ok(docRes.json.value.some((e) => e.name === 'PurchaseOrderItem'));

    // $metadata
    const metaRes = await makeRequest(`${previewUrl}${servicePrefix}/$metadata`);
    assert.equal(metaRes.statusCode, 200);
    assert.ok(metaRes.headers['content-type'].includes('application/xml'));
    assert.ok(metaRes.data.includes('<edmx:Edmx Version="4.0"'));
    assert.ok(metaRes.data.includes('<EntityType Name="PurchaseOrder">'));
    assert.ok(metaRes.data.includes('<Property Name="PurchaseOrderNumber"'));
  });

  test('3. Entity collection read ($top, $skip, $select, $filter, $count)', async () => {
    // Basic collection
    const colRes = await makeRequest(`${previewUrl}${servicePrefix}/PurchaseOrder`);
    assert.equal(colRes.statusCode, 200);
    assert.equal(colRes.json.value.length, 5);
    assert.ok(colRes.json.value[0].PurchaseOrderNumber.startsWith('MOCK-'));

    // $count=true and $top=2
    const topRes = await makeRequest(`${previewUrl}${servicePrefix}/PurchaseOrder?$top=2&$count=true`);
    assert.equal(topRes.statusCode, 200);
    assert.equal(topRes.json.value.length, 2);
    assert.equal(topRes.json['@odata.count'], 5);

    // $select
    const selectRes = await makeRequest(`${previewUrl}${servicePrefix}/PurchaseOrder?$select=PurchaseOrderNumber,Supplier`);
    assert.equal(selectRes.statusCode, 200);
    assert.ok(selectRes.json.value[0].PurchaseOrderNumber);
    assert.ok(selectRes.json.value[0].Supplier);
    assert.equal(selectRes.json.value[0].TotalNetAmount, undefined, 'TotalNetAmount must be omitted by $select');

    // $filter
    const filterRes = await makeRequest(`${previewUrl}${servicePrefix}/PurchaseOrder?$filter=CompanyCode eq '1000'`);
    assert.equal(filterRes.statusCode, 200);
    assert.ok(filterRes.json.value.length > 0);
  });

  test('4. Single entity read by key and child navigation read', async () => {
    // Single instance read
    const singleRes = await makeRequest(`${previewUrl}${servicePrefix}/PurchaseOrder('MOCK-1001')`);
    assert.equal(singleRes.statusCode, 200);
    assert.equal(singleRes.json.PurchaseOrderNumber, 'MOCK-1001');

    // Child navigation read
    const navRes = await makeRequest(`${previewUrl}${servicePrefix}/PurchaseOrder('MOCK-1001')/_Items`);
    assert.equal(navRes.statusCode, 200);
    assert.ok(Array.isArray(navRes.json.value));
    assert.ok(navRes.json.value.every((item) => item.PurchaseOrderNumber === 'MOCK-1001'));
  });

  test('5. Mutation support: POST create creates record with MOCK key on writable profile', async () => {
    const newPo = {
      CompanyCode: '1000',
      Supplier: 'MOCK-SUPP-99',
      TotalNetAmount: 9999.00,
      DocumentCurrency: 'EUR'
    };

    const createRes = await makeRequest(`${previewUrl}${servicePrefix}/PurchaseOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: newPo
    });

    assert.equal(createRes.statusCode, 201);
    assert.ok(createRes.json.PurchaseOrderNumber.startsWith('MOCK-'));
    assert.equal(createRes.json.Supplier, 'MOCK-SUPP-99');
  });

  test('6. Read-Only profile enforcement: READ_ONLY_QUERY profile rejects CUD mutations with 405', async () => {
    const readOnlyArch = { selectedProfile: RAP_PROFILES.READ_ONLY_QUERY };
    const session = defaultPreviewSessionStore.getSession(testProjectId);
    
    // Temporarily test mutation module with read-only profile
    const roProject = JSON.parse(JSON.stringify(testProject));
    roProject.architectureSpec = readOnlyArch;

    // Direct mutation check
    const { executeCreate } = await import('../src/generation/preview/mockODataMutation.js');
    assert.throws(
      () => executeCreate(testProject.dataModelSpec.entities[0], { CompanyCode: '1000' }, session.syntheticStore, readOnlyArch),
      (err) => err.statusCode === 405 && err.code === 'PROFILE_READ_ONLY'
    );
  });

  test('7. Serves generated static webapp files and injects mandatory permanent watermark', async () => {
    // index.html
    const htmlRes = await makeRequest(`${previewUrl}/webapp/index.html`);
    assert.equal(htmlRes.statusCode, 200);
    assert.ok(htmlRes.headers['content-type'].includes('text/html'));
    assert.ok(htmlRes.data.includes('id="Fiorify-preview-banner"'), 'Mandatory watermark banner must be injected');
    assert.ok(htmlRes.data.includes('LOCAL MOCK PREVIEW — SYNTHETIC DATA ONLY — NOT CONNECTED TO SAP S21'));

    // manifest.json
    const manifestRes = await makeRequest(`${previewUrl}/webapp/manifest.json`);
    assert.equal(manifestRes.statusCode, 200);
    assert.ok(manifestRes.json['sap.app']);
  });

  test('8. Telemetry logging and session reset', async () => {
    const status = await defaultPreviewManager.getPreviewStatus(testProjectId, adminUser);
    assert.equal(status.status, 'RUNNING');
    assert.ok(status.totalRequests > 5);

    const resetRes = await defaultPreviewManager.resetSyntheticData(testProjectId, adminUser);
    assert.equal(resetRes.success, true);
    assert.equal(resetRes.recordCounts.PurchaseOrder, 5);
  });
});
