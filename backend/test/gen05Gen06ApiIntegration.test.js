/**
 * FioriX — GEN-05 & GEN-06 API Integration Test Suite
 *
 * Verifies the complete HTTP API contracts for Architecture Designer,
 * ABAP Generator, Fiori Elements Generator, Artifact Registry, and Static Validation.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handleGenerationRoutes } from '../src/generation/routes/generationRoutes.js';
import { defaultGenerationProjectStore } from '../src/generation/projects/generationProjectStore.js';
import { defaultGenerationProjectService } from '../src/generation/projects/generationProjectService.js';

describe('GEN-05 & GEN-06 REST API Integration', () => {
  let server;
  let port;
  let baseUrl;
  let testProjectId = `GEN-API-${Date.now()}`;
  const adminSecret = 'fiorix-admin-dev-secret';

  before(async () => {
    // Create an initial test project with entities and requirements
    await defaultGenerationProjectService.createProject({
      projectId: testProjectId,
      projectName: 'API Generation Test Project',
      origin: 'STANDALONE',
      targetRelease: 'SAP S/4HANA 2023 On-Premise',
      targetPackage: 'ZTEST_API'
    });

    await defaultGenerationProjectStore.updateProject(testProjectId, {
      requirementsSpec: {
        specVersion: 1,
        items: [
          { requirementId: 'REQ-API-01', title: 'Validate Material Status', category: 'VALIDATION', status: 'CONFIRMED' }
        ]
      },
      dataModelSpec: {
        specVersion: 1,
        entities: [
          {
            entityId: 'E-MAT-01',
            name: 'ZMaterialMaster',
            businessName: 'Material Master',
            entityType: 'ROOT',
            isRoot: true,
            tableName: 'ZMAT_HEADER',
            fields: [
              { name: 'MaterialID', isKey: true, isMandatory: true, type: 'abap.char', length: 18, semanticRole: 'DOCUMENT_NUMBER' },
              { name: 'MaterialType', isKey: false, isMandatory: true, type: 'abap.char', length: 4, semanticRole: 'CODE' }
            ]
          }
        ],
        relationships: []
      }
    });

    server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const currentUser = { id: 'USR-ADMIN', name: 'Lead Architect', tenantId: 'DEFAULT-TENANT-S21' };

      const handled = await handleGenerationRoutes(req, res, url, {
        currentUser,
        requirePermission: () => true
      });

      if (!handled) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    try {
      await defaultGenerationProjectStore.deleteProject(testProjectId, true);
    } catch {
      // ignore
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('1. POST /api/v1/generation/projects/:id/architecture/evaluate calculates architecture profile', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/architecture/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.architecture.selectedProfile);
    assert.ok(data.architecture.rootEntity);
  });

  it('2. GET /api/v1/generation/projects/:id/architecture retrieves evaluated architecture', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/architecture`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.architecture.selectedProfile);
  });

  it('3. POST /api/v1/generation/projects/:id/abap/generate synthesizes ABAP artifacts', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/abap/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.totalGenerated >= 7);
    assert.ok(data.artifacts.some((a) => a.objectName === 'ZI_ZMaterialMaster'));
    assert.ok(data.artifacts.some((a) => a.objectName === 'ZC_ZMaterialMaster'));
    assert.ok(data.artifacts.some((a) => a.objectName === 'ZUI_ZMATERIALMASTER'));
  });

  it('4. POST /api/v1/generation/projects/:id/fiori/generate synthesizes Fiori Elements UI application', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/fiori/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appId: 'com.fiorix.mat.manage' })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.totalGenerated >= 6);
    assert.ok(data.artifacts.some((a) => a.filePath === 'webapp/manifest.json'));
    assert.ok(data.artifacts.some((a) => a.filePath === 'webapp/annotations/annotations.xml'));
  });

  it('5. GET /api/v1/generation/projects/:id/artifacts lists all generated artifacts with checksums', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/artifacts`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.count >= 13);
    assert.ok(data.artifacts.every((a) => a.checksum && a.checksum.length === 64));
  });

  it('6. PATCH /api/v1/generation/projects/:id/artifacts/:artifactId allows manual developer editing', async () => {
    const listRes = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/artifacts`);
    const listData = await listRes.json();
    const art = listData.artifacts[0];

    const editRes = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/artifacts/${art.artifactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: art.content + '\n/* Manual developer edit via API */' })
    });

    assert.equal(editRes.status, 200);
    const editData = await editRes.json();
    assert.equal(editData.manualEditStatus, 'MODIFIED');
  });

  it('7. POST /api/v1/generation/projects/:id/validate-generation runs static validation engine', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/validate-generation`, {
      method: 'POST'
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.validationReport);
    assert.equal(typeof data.validationReport.errorsCount, 'number');
  });

  it('8. GET /api/v1/generation/projects/:id/traceability returns requirements traceability matrix', async () => {
    const res = await fetch(`${baseUrl}/api/v1/generation/projects/${testProjectId}/traceability`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.traceabilityMatrix.length >= 1);
    assert.equal(data.traceabilityMatrix[0].requirementId, 'REQ-API-01');
  });
});
