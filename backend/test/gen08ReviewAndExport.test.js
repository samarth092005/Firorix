import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { createZipArchive, readZipArchive, extractZipArchive, sanitizeZipEntryPath } from '../src/generation/export/zipArchiver.js';
import { buildTraceabilityMatrix, renderTraceabilityMarkdown } from '../src/generation/export/traceabilityEngine.js';
import { defaultExportManager } from '../src/generation/export/exportManager.js';
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

describe('GEN-08: Review, Governance, Packaging and Export Suite', () => {
  const adminUser = { id: 'USR-ADMIN', role: 'ADMIN', name: 'Lead Architect' };
  const testProjectId = 'PRJ-EXPORT-TEST';
  let testProject;

  before(async () => {
    const projectDir = path.resolve(defaultGenerationProjectStore.storageDir, testProjectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }

    testProject = await defaultGenerationProjectStore.createProject({
      projectId: testProjectId,
      projectName: 'Export Test PO System',
      description: 'GEN-08 Verification Project'
    }, adminUser);

    testProject.dataModelSpec = {
      entities: [
        {
          entityId: 'ENT-PO-01',
          name: 'PurchaseOrder',
          businessName: 'Purchase Order',
          entityType: 'ROOT',
          isRoot: true,
          fields: [
            { fieldId: 'F-1', name: 'PurchaseOrder', type: 'String', length: 10, isKey: true },
            { fieldId: 'F-2', name: 'CompanyCode', type: 'String', length: 4 },
            { fieldId: 'F-3', name: 'TotalAmount', type: 'Decimal', length: 15, decimals: 2 }
          ]
        }
      ],
      relationships: []
    };

    testProject.requirementsSpec = {
      requirements: [
        { requirementId: 'REQ-01', title: 'Manage Purchase Orders', category: 'FUNCTIONAL', status: 'CONFIRMED' },
        { requirementId: 'REQ-02', title: 'Filter by Company Code', category: 'UI_FIELD', status: 'CONFIRMED' }
      ]
    };

    const arch = defaultArchitectureDecisionEngine.evaluate(testProject);
    testProject.architectureSpec = arch;

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
  });

  after(async () => {
    const projectDir = path.resolve(defaultGenerationProjectStore.storageDir, testProjectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  test('1. Pure Node.js zipArchiver creates valid PKZIP and readZipArchive decompresses matching content', () => {
    const testFiles = [
      { path: 'test.txt', content: 'Hello Fiorify Archiver!' },
      { path: 'sub/nested.json', content: JSON.stringify({ ok: true, count: 42 }) }
    ];

    const zipBuf = createZipArchive(testFiles);
    assert.ok(Buffer.isBuffer(zipBuf));
    assert.ok(zipBuf.length > 50);

    const extracted = readZipArchive(zipBuf);
    assert.equal(extracted.length, 2);
    assert.equal(extracted[0].path, 'test.txt');
    assert.equal(extracted[0].content.toString('utf-8'), 'Hello Fiorify Archiver!');
    assert.equal(extracted[1].path, 'sub/nested.json');
    assert.deepEqual(JSON.parse(extracted[1].content.toString('utf-8')), { ok: true, count: 42 });
  });

  test('2. Path traversal attack rejection in sanitizeZipEntryPath and extraction', () => {
    assert.throws(() => sanitizeZipEntryPath('../outside.txt'), /Path traversal/);
    assert.throws(() => sanitizeZipEntryPath('sub/../../evil.sh'), /Path traversal/);
    assert.throws(() => sanitizeZipEntryPath('C:\\Windows\\system32'), /Windows drive/);

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'Fiorify-test-'));
    try {
      const validZip = createZipArchive([{ path: 'safe.txt', content: 'Safe content' }]);
      const extracted = extractZipArchive(validZip, tempDir);
      assert.deepEqual(extracted, ['safe.txt']);
      assert.equal(fs.readFileSync(path.join(tempDir, 'safe.txt'), 'utf-8'), 'Safe content');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('3. buildTraceabilityMatrix computes strict coverage percentages and generates markdown', () => {
    const report = buildTraceabilityMatrix(testProject);
    assert.equal(report.projectId, testProjectId);
    assert.ok(report.metrics.requirementCoveragePct >= 50);
    assert.ok(report.metrics.entityCoveragePct >= 80);
    assert.ok(report.metrics.traceabilityIndex >= 60);
    assert.equal(report.requirementMappings.length, 2);

    const md = renderTraceabilityMarkdown(report);
    assert.ok(md.includes('# Fiorify Traceability Matrix'));
    assert.ok(md.includes('Requirement-to-Artifact Traceability Chain'));
  });

  test('4. validateExportReadiness enforces admin role and checks validation gates', async () => {
    const nonAdmin = { id: 'USR-2', role: 'VIEWER' };
    await assert.rejects(
      async () => defaultExportManager.validateExportReadiness(testProjectId, nonAdmin),
      /Only authenticated Fiorify Administrators/
    );

    // Initial check without warning acknowledgment
    const initialGate = await defaultExportManager.validateExportReadiness(testProjectId, adminUser);
    assert.equal(initialGate.canExport, false);
    assert.equal(initialGate.reason, 'UNACKNOWLEDGED_WARNINGS');

    // Passing with acknowledged warnings
    const gateResult = await defaultExportManager.validateExportReadiness(testProjectId, adminUser, { acknowledgedWarnings: true });
    assert.equal(gateResult.canExport, true);
    assert.ok(gateResult.traceabilityMetrics);
  });

  test('5. packageExport produces valid zip package with complete ABAP, Fiori, Docs, and SHA-256 manifest', async () => {
    const exportResult = await defaultExportManager.packageExport(testProjectId, adminUser, { acknowledgedWarnings: true });
    assert.ok(exportResult.exportId.startsWith('EXP-'));
    assert.ok(exportResult.zipBuffer.length > 500);
    assert.ok(exportResult.manifest);
    assert.equal(exportResult.manifest.project.projectId, testProjectId);
    assert.equal(exportResult.manifest.confidentialityNotice.containsSecrets, false);

    // Verify ZIP contains expected directories
    const tempExtractDir = fs.mkdtempSync(path.join(os.tmpdir(), 'Fiorify-export-verify-'));
    try {
      const extractedFiles = extractZipArchive(exportResult.zipBuffer, tempExtractDir);

      // Check key files exist in extracted package
      assert.ok(extractedFiles.includes('Fiorify-export-manifest.json'));
      assert.ok(extractedFiles.includes('README.md'));
      assert.ok(extractedFiles.includes('docs/TRACEABILITY.md'));
      assert.ok(extractedFiles.includes('docs/ARCHITECTURE.md'));
      assert.ok(extractedFiles.some((f) => f.startsWith('abap/cds/')));
      assert.ok(extractedFiles.some((f) => f.startsWith('fiori/webapp/manifest.json')));

      // Check SHA-256 integrity against manifest
      for (const item of exportResult.manifest.artifacts) {
        assert.ok(extractedFiles.includes(item.exportPath), `Exported file ${item.exportPath} must exist`);
        const fileContent = fs.readFileSync(path.join(tempExtractDir, item.exportPath));
        const actualHash = crypto.createHash('sha256').update(fileContent).digest('hex');
        assert.equal(actualHash, item.sha256, `SHA-256 checksum for ${item.exportPath} must match manifest`);
      }
    } finally {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
  });
});
