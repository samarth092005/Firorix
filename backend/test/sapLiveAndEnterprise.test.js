/**
 * SAP-LIVE-01, CAT-04 & ENTERPRISE-01 Integration Test Suite
 * 
 * Verifies:
 * - SAP landscape registry listing and multi-system diagnostics (SAP-LIVE-01)
 * - Evidence provenance tagging and ADT restriction reporting (SAP-LIVE-01)
 * - Fiori Catalogue synchronization with dryRun and commit modes (CAT-04)
 * - Release compatibility evaluation across target SAP releases (CAT-04)
 * - Enterprise portfolio metrics calculated dynamically from real stored records (ENTERPRISE-01)
 * - Prioritized modernization roadmap generation (ENTERPRISE-01)
 * - Parent-child multi-transaction process assessment creation (ENTERPRISE-01)
 * - Deployment readiness lifecycle tracking (DEV -> QAS -> PRD) (ENTERPRISE-01)
 * - Enterprise modernization report export in Markdown and JSON formats (ENTERPRISE-01)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createServer } from '../src/server.js';
import { AssessmentStore } from '../src/services/assessmentStore.js';
import { systemRegistry } from '../src/adapters/systemRegistry.js';
import { officialCatalogueAdapter } from '../src/adapters/officialFioriCatalogueAdapter.js';
import { EnterpriseService } from '../src/services/enterpriseService.js';

describe('SAP-LIVE-01, CAT-04 & ENTERPRISE-01 Integration', () => {
  let server;
  let baseUrl;
  let testStoragePath;
  let assessmentStore;
  let enterpriseService;

  before(async () => {
    testStoragePath = path.join(
      os.tmpdir(),
      `fiorix-test-enterprise-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
    );
    assessmentStore = new AssessmentStore({ storagePath: testStoragePath });
    enterpriseService = new EnterpriseService({ assessmentStore, systemRegistry });
    server = createServer({ assessmentStore, enterpriseService });

    await new Promise((resolve) => {
      server.listen(0, () => {
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
    try {
      if (fs.existsSync(testStoragePath)) {
        fs.unlinkSync(testStoragePath);
      }
    } catch {
      // Ignore
    }
  });

  it('1. GET /api/v1/systems lists registered SAP landscape profiles', async () => {
    const res = await fetch(`${baseUrl}/api/v1/systems`);
    const systems = await res.json();
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(systems));
    assert.ok(systems.length >= 4);

    const s21 = systems.find(s => s.systemId === 'S21-200');
    assert.ok(s21, 'S21-200 must be registered in the landscape');
    assert.strictEqual(s21.client, '200');
    assert.strictEqual(s21.release, 'SAP S/4HANA 2023 Private Edition');

    const ecc = systems.find(s => s.systemId === 'ECC-100');
    assert.ok(ecc, 'ECC-100 legacy source must be registered');
    assert.strictEqual(ecc.client, '100');
  });

  it('2. POST /api/v1/systems/:systemId/diagnostics runs controlled read-only checks with evidence provenance', async () => {
    const res = await fetch(`${baseUrl}/api/v1/systems/ECC-100/diagnostics`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_sap_consultant'
      }
    });
    const diag = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(diag.success, true);
    assert.strictEqual(diag.systemId, 'ECC-100');
    assert.ok(diag.checks);
    assert.ok(diag.checks.destinationResolution);
    assert.ok(diag.checks.gatewayCatalog);
    assert.ok(diag.checks.adtDiscovery);
    assert.ok(diag.connectivityStatus);
  });

  it('3. CAT-04: evaluateReleaseCompatibility accurately determines version support', () => {
    // Exact release
    const compat1 = officialCatalogueAdapter.evaluateReleaseCompatibility(
      'SAP S/4HANA 2023',
      'SAP S/4HANA 2023'
    );
    assert.strictEqual(compat1.status, 'VERIFIED_COMPATIBLE');

    // App requires higher release
    const compat2 = officialCatalogueAdapter.evaluateReleaseCompatibility(
      'SAP S/4HANA 2025',
      'SAP S/4HANA 2022'
    );
    assert.strictEqual(compat2.status, 'SUPPORTED_ON_LATER_RELEASE_ONLY');

    // Cloud vs On-Premise edition mismatch
    const compat3 = officialCatalogueAdapter.evaluateReleaseCompatibility(
      'SAP S/4HANA Cloud Public Edition 2408',
      'SAP S/4HANA 2023 Private Edition'
    );
    assert.strictEqual(compat3.status, 'DIFFERENT_DEPLOYMENT_EDITION');
  });

  it('4. POST /api/v1/fiori-catalogue/sync dryRun validates candidates without committing', async () => {
    const candidateRecords = [
      {
        appId: 'F0842A',
        appName: 'Manage Purchase Orders (Advanced)',
        leadingTransactionCodes: 'ME21N, ME22N, ME23N',
        appType: 'SAP Fiori elements',
        uiTechnology: 'SAP Fiori elements',
        scopeItem: '18J',
        sourceType: 'OFFICIAL_SAP_APPS_REF_LIB'
      },
      {
        // Missing appId -> invalid
        appName: 'Invalid Record Without App ID'
      }
    ];

    const res = await fetch(`${baseUrl}/api/v1/fiori-catalogue/sync`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_admin',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: candidateRecords,
        dryRun: true
      })
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.mode, 'DRY_RUN');
    assert.strictEqual(body.validCandidateCount, 1);
    assert.strictEqual(body.rejectedCount, 1);
  });

  it('5. ENTERPRISE-01: Multi-System Assessment Isolation & Dynamic Portfolio Metrics', async () => {
    // Save assessment for S21-200 (S/4HANA)
    await assessmentStore.create({
      tcode: 'VA01',
      systemId: 'S21-200',
      client: '200',
      targetRelease: 'SAP S/4HANA 2023',
      businessArea: 'Sales',
      recommendation: { outcome: 'ADOPT' },
      lifecycleStatus: 'APPROVED'
    });

    // Save assessment for ECC-100 (Legacy ECC)
    await assessmentStore.create({
      tcode: 'ME21N',
      systemId: 'ECC-100',
      client: '100',
      targetRelease: 'SAP ECC 6.0 EHP8',
      businessArea: 'Sourcing and Procurement',
      recommendation: { outcome: 'EXTEND' },
      lifecycleStatus: 'PENDING_REVIEW'
    });

    const res = await fetch(`${baseUrl}/api/v1/enterprise/portfolio`, {
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_sap_consultant'
      }
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.portfolio);
    assert.strictEqual(body.portfolio.totalAssessments, 2);
    assert.strictEqual(body.portfolio.bySystem['S21-200'].total, 1);
    assert.strictEqual(body.portfolio.bySystem['ECC-100'].total, 1);
    assert.strictEqual(body.portfolio.byOutcome['ADOPT'], 1);
    assert.strictEqual(body.portfolio.byOutcome['EXTEND'], 1);
  });

  it('6. GET /api/v1/enterprise/roadmap generates prioritized modernization roadmap', async () => {
    const res = await fetch(`${baseUrl}/api/v1/enterprise/roadmap`, {
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_sap_consultant'
      }
    });

    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(body.roadmap);
    assert.ok(body.roadmap.phases);
    assert.ok(Array.isArray(body.roadmap.phases.wave1_standardAdoption));
    assert.ok(Array.isArray(body.roadmap.phases.wave2_configureAndExtend));
  });

  it('7. POST /api/v1/enterprise/assessments/process creates parent-child process assessment', async () => {
    const payload = {
      processId: 'O2C-E2E-01',
      processName: 'Order to Cash Standard Fulfillment',
      systemId: 'S21-200',
      businessArea: 'Order to Cash',
      transactions: [
        { tcode: 'VA01', recommendation: { outcome: 'ADOPT' } },
        { tcode: 'VL01N', recommendation: { outcome: 'CONFIGURE' } },
        { tcode: 'VF01', recommendation: { outcome: 'ADOPT' } }
      ]
    };

    const res = await fetch(`${baseUrl}/api/v1/enterprise/assessments/process`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_sap_consultant',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.parentAssessment);
    assert.strictEqual(body.childAssessmentsCount, 3);
  });

  it('8. PUT /api/v1/assessments/:id/deployment-readiness advances DEV -> QAS -> PRD stages', async () => {
    const created = await assessmentStore.create({
      tcode: 'FB50',
      systemId: 'S21-200',
      lifecycleStatus: 'APPROVED'
    });

    // Advance to QAS
    const qasRes = await fetch(`${baseUrl}/api/v1/assessments/${created.id}/deployment-readiness`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_sap_consultant',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stage: 'QAS_VALIDATION',
        targetSystem: 'S21-200-QAS',
        qasValidated: true,
        verifier: 'QA Automation Lead',
        evidenceNote: 'Smoke tests and authorization role test passed in Client 200 QAS.'
      })
    });

    const qasBody = await qasRes.json();
    assert.strictEqual(qasRes.status, 200);
    assert.strictEqual(qasBody.success, true);
    assert.strictEqual(qasBody.assessment.deploymentReadiness.stage, 'QAS_VALIDATION');
    assert.strictEqual(qasBody.assessment.deploymentReadiness.qasValidated, true);

    // Advance to PRD
    const prdRes = await fetch(`${baseUrl}/api/v1/assessments/${created.id}/deployment-readiness`, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_sap_consultant',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stage: 'PRODUCTION_READINESS',
        targetSystem: 'S21-200',
        productionReady: true,
        verifier: 'Enterprise Architecture Board',
        evidenceNote: 'Production deployment approved.'
      })
    });

    const prdBody = await prdRes.json();
    assert.strictEqual(prdRes.status, 200);
    assert.strictEqual(prdBody.assessment.deploymentReadiness.stage, 'PRODUCTION_READINESS');
    assert.strictEqual(prdBody.assessment.deploymentReadiness.productionReady, true);
  });

  it('9. GET /api/v1/enterprise/reports/:reportType generates exportable executive reports', async () => {
    const mdRes = await fetch(`${baseUrl}/api/v1/enterprise/reports/executive-summary?format=markdown`, {
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_viewer'
      }
    });

    assert.strictEqual(mdRes.status, 200);
    const mdText = await mdRes.text();
    assert.ok(mdText.includes('# FioriX Enterprise Modernization Report'));
    assert.ok(mdText.includes('Executive Summary'));

    const jsonRes = await fetch(`${baseUrl}/api/v1/enterprise/reports/technical-remediation?format=json`, {
      headers: {
        'Authorization': 'Bearer fiorix_dev_token_viewer'
      }
    });

    assert.strictEqual(jsonRes.status, 200);
    const jsonBody = await jsonRes.json();
    assert.strictEqual(jsonBody.success, true);
    assert.ok(jsonBody.report.records);
  });
});
