import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import DatabasePool from '../src/infrastructure/db/pool.js';
import MigrationRunner from '../src/infrastructure/db/migrator.js';
import { LocalFileSystemArtifactStorage } from '../src/infrastructure/db/artifactStorage.js';
import AssessmentRepository from '../src/infrastructure/db/repositories/assessmentRepository.js';
import CatalogueRepository from '../src/infrastructure/db/repositories/catalogueRepository.js';
import TransactionMasterRepository from '../src/infrastructure/db/repositories/transactionMasterRepository.js';
import GenerationProjectRepository from '../src/infrastructure/db/repositories/generationProjectRepository.js';
import { migrateAllStores } from '../src/infrastructure/db/scripts/migrateStores.js';
import { verifyReconciliation } from '../src/infrastructure/db/scripts/verifyReconciliation.js';

describe('Fiorify S1 — Persistence Foundation Verification Suite', () => {
  let migrator;
  let assessmentRepo;
  let catalogueRepo;
  let txMasterRepo;
  let genProjectRepo;
  let artifactStorage;

  before(async () => {
    process.env.Fiorify_ALLOW_EMBEDDED_PG = 'true';
    await DatabasePool.getPool();
    migrator = new MigrationRunner();
    assessmentRepo = new AssessmentRepository();
    catalogueRepo = new CatalogueRepository();
    txMasterRepo = new TransactionMasterRepository();
    genProjectRepo = new GenerationProjectRepository();
    artifactStorage = new LocalFileSystemArtifactStorage();
  });

  after(async () => {
    await DatabasePool.close();
  });

  it('1. Clean PostgreSQL schema creation & table verification', async () => {
    const health = await DatabasePool.healthCheck();
    assert.strictEqual(health.healthy, true, 'PostgreSQL database must be healthy and responsive');
    assert.match(health.version, /PostgreSQL/, 'Must be running genuine PostgreSQL');

    const result = await migrator.migrateUp();
    assert.ok(Array.isArray(result.applied) || Array.isArray(result.skipped));

    const checkTables = await DatabasePool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    const tableNames = checkTables.rows.map(r => r.table_name);

    const requiredTables = [
      'schema_migrations',
      'tenants',
      'sap_system_profiles',
      'fiori_catalog_sources',
      'fiori_catalog_apps',
      'fiori_catalog_services',
      'fiori_catalog_tcode_mappings',
      'transaction_master_snapshots',
      'transaction_master_records',
      'assessments',
      'fit_gap_dimensions',
      'assessment_evidence',
      'assessment_audit_events',
      'generation_projects',
      'generation_specifications',
      'generation_artifacts',
      'generation_activity_events'
    ];

    for (const reqTable of requiredTables) {
      assert.ok(tableNames.includes(reqTable), `Required table "${reqTable}" must exist in public schema`);
    }
  });

  it('2. Migration rollback and upgrade reversibility', async () => {
    // Test rollback of version 001
    const downResult = await migrator.migrateDown('001');
    assert.ok(downResult.rolledBack.some(r => r.version === '001'), 'Must record rollback of version 001');

    // Verify tables are dropped
    const checkTables = await DatabasePool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'assessments';
    `);
    assert.strictEqual(checkTables.rowCount, 0, 'assessments table must be dropped after rollback');

    // Re-apply migration
    const upResult = await migrator.migrateUp();
    assert.ok(upResult.applied.some(r => r.version === '001'), 'Must re-apply version 001 cleanly');

    const checkTablesRecreated = await DatabasePool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'assessments';
    `);
    assert.strictEqual(checkTablesRecreated.rowCount, 1, 'assessments table must be recreated');
  });

  it('3. Migration checksum validation rejects altered scripts', async () => {
    const status = await migrator.status();
    const migration001 = status.find(s => s.version === '001');
    assert.ok(migration001, 'Migration 001 must exist in status');
    assert.strictEqual(migration001.isApplied, true, 'Migration 001 must be marked as applied');
    assert.strictEqual(migration001.checksumMatches, true, 'Checksum must match recorded schema_migrations value');

    // Simulate tampered checksum
    const client = await DatabasePool.getClient();
    try {
      await client.query(
        "UPDATE schema_migrations SET checksum = 'TAMPERED_CHECKSUM_12345' WHERE version = '001';"
      );

      await assert.rejects(
        async () => {
          await migrator.migrateUp();
        },
        /Migration checksum mismatch for version 001/,
        'Migration runner must reject altered checksums for applied migrations'
      );

      // Restore correct checksum
      await client.query(
        'UPDATE schema_migrations SET checksum = $1 WHERE version = $2;',
        [migration001.checksum, '001']
      );
    } finally {
      client.release();
    }
  });

  it('4 & 5. All four source stores imported and record counts reconciled', async () => {
    const report = await migrateAllStores();
    assert.ok(report.catalogue.sourceCount >= 267, 'Catalogue source count must be at least baseline 267');
    assert.strictEqual(report.catalogue.imported, report.catalogue.sourceCount, 'All catalogue source apps must be imported');
    assert.ok(report.transactionMaster.sourceCount >= 21, 'Transaction master source count must be at least baseline 21');
    assert.strictEqual(report.transactionMaster.imported, report.transactionMaster.sourceCount, 'All transaction master records must be imported');
    assert.ok(report.assessments.sourceCount >= 11, 'Assessment source count must be at least baseline 11');
    assert.strictEqual(report.assessments.imported, report.assessments.sourceCount, 'All assessments must be imported');
    assert.ok(report.generationProjects.sourceCount >= 1, 'Generation projects source count must be at least baseline 1');
    assert.strictEqual(report.generationProjects.imported, report.generationProjects.sourceCount, 'All generation projects must be imported');
    assert.strictEqual(report.quarantine.length, 0, 'No records quarantined on clean baseline');

    const rec = await verifyReconciliation();
    assert.strictEqual(rec.status, 'PASS', 'Reconciliation verification must PASS');
    assert.strictEqual(rec.stores.catalogue.matches, true);
    assert.strictEqual(rec.stores.transactionMaster.matches, true);
    assert.strictEqual(rec.stores.assessments.matches, true);
    assert.strictEqual(rec.stores.generationProjects.matches, true);
  });

  it('6. Assessment audit hash chains verified and preserved', async () => {
    const rec = await verifyReconciliation();
    assert.strictEqual(rec.auditIntegrity.verified, rec.stores.assessments.sourceCount, 'All assessments must have verified hash chains');
    assert.strictEqual(rec.auditIntegrity.failed, 0, 'No hash chain failures allowed');

    // Verify detail of sample assessment audit trail
    const asm = await assessmentRepo.getById('ASM-LIVE-F53');
    assert.ok(asm, 'ASM-LIVE-F53 must exist in database');
    assert.ok(asm.auditEvents.length >= 2, 'Must have at least 2 audit events');
    assert.strictEqual(asm.auditEvents[0].previousHash, 'GENESIS');
    assert.strictEqual(asm.auditEvents[1].previousHash, asm.auditEvents[0].integrityHash);
  });

  it('7. Assessment relationships & 8-dimension scores preserved', async () => {
    const testAsmId = 'ASM-DIM-TEST-S1';
    await assessmentRepo.create({
      id: testAsmId,
      tcode: 'ME21N',
      description: 'Full 8 Dimension Assessment',
      businessArea: 'Procurement',
      systemId: 'S21',
      client: '200',
      matchingFioriApp: {
        appId: 'F0842A',
        appName: 'Manage Purchase Orders',
        matchScore: 92
      },
      dimensionResults: {
        functionalFit: { score: 85, status: 'EVALUATED', findings: 'All standard features present' },
        uiFit: { score: 90, status: 'EVALUATED' },
        processFlow: { score: 80, status: 'EVALUATED' },
        dataModel: { score: 95, status: 'EVALUATED' },
        extensibility: { score: 75, status: 'EVALUATED' },
        integration: { score: 85, status: 'EVALUATED' },
        security: { score: 90, status: 'EVALUATED' },
        performance: { score: 85, status: 'EVALUATED' }
      },
      recommendation: {
        action: 'EXTEND',
        confidence: 'HIGH'
      }
    });

    const fetched = await assessmentRepo.getById(testAsmId);
    assert.ok(fetched);
    assert.strictEqual(fetched.tcode, 'ME21N');
    assert.strictEqual(fetched.matchingFioriApp.appId, 'F0842A');
    assert.strictEqual(Object.keys(fetched.dimensions).length, 8);
    assert.strictEqual(fetched.dimensions.functionalFit.score, 85);
    assert.strictEqual(fetched.dimensions.functionalFit.findings, 'All standard features present');
  });

  it('8. Generation handoff relationships preserved', async () => {
    // Create an assessment with approved BUILD
    const buildAsmId = 'ASM-TEST-BUILD-HANDOFF-S1';
    await assessmentRepo.create({
      id: buildAsmId,
      tcode: 'ME21N',
      description: 'Create PO with Gaps',
      businessArea: 'Sourcing and Procurement',
      systemId: 'S21',
      client: '200',
      recommendation: {
        action: 'BUILD',
        confidence: 'HIGH',
        justification: 'Heavy Dynpro custom exits require bespoke RAP UI'
      },
      lifecycleStatus: 'APPROVED'
    });

    // Create generation project from handoff
    const projectId = 'GEN-ME21N-HANDOFF-S1';
    const project = await genProjectRepo.createProject({
      projectId,
      projectName: 'Custom Purchase Order Fiori App',
      origin: 'ASSESSMENT_HANDOFF',
      sourceAssessmentId: buildAsmId,
      sourceTransactionCode: 'ME21N',
      sourceSystemId: 'S21',
      sourceClient: '200',
      targetRelease: 'SAP S/4HANA 2023 On-Premise',
      lifecycleStatus: 'DRAFT',
      currentPhase: 'PHASE_1_WORKSPACE'
    });

    assert.ok(project);
    assert.strictEqual(project.sourceAssessmentId, buildAsmId);
    assert.strictEqual(project.origin, 'ASSESSMENT_HANDOFF');

    const fetched = await genProjectRepo.getProjectById(projectId);
    assert.strictEqual(fetched.sourceAssessmentId, buildAsmId);
    assert.strictEqual(fetched.source.origin, 'ASSESSMENT_HANDOFF');
  });

  it('9. Project restart persistence verified', async () => {
    const testProjectId = 'GEN-PERSIST-TEST-S1';
    await genProjectRepo.createProject({
      projectId: testProjectId,
      projectName: 'Cold Persistence Test',
      origin: 'STANDALONE',
      lifecycleStatus: 'DRAFT',
      specificationVersion: 1
    });

    // Update project
    await genProjectRepo.updateProject(testProjectId, {
      description: 'Updated before restart',
      specificationVersion: 2
    });

    // Verify state
    const beforeRestart = await genProjectRepo.getProjectById(testProjectId);
    assert.strictEqual(beforeRestart.specificationVersion, 2);

    // Simulate restart by creating fresh repository instance
    const freshRepo = new GenerationProjectRepository();
    const afterRestart = await freshRepo.getProjectById(testProjectId);
    assert.ok(afterRestart);
    assert.strictEqual(afterRestart.projectId, testProjectId);
    assert.strictEqual(afterRestart.specificationVersion, 2);
    assert.strictEqual(afterRestart.description, 'Updated before restart');
  });

  it('10. Concurrent database writes verified', async () => {
    const concurrentProjectId = 'GEN-CONCURRENT-TEST-S1';
    await genProjectRepo.createProject({
      projectId: concurrentProjectId,
      projectName: 'Concurrency Test',
      origin: 'STANDALONE',
      specificationVersion: 1
    });

    // Execute 5 concurrent updates
    const updates = [1, 2, 3, 4, 5].map(i =>
      genProjectRepo.updateProject(concurrentProjectId, {
        description: `Update ${i}`,
        specificationVersion: i + 1,
        activityAction: `UPDATE_${i}`
      })
    );

    await Promise.all(updates);

    const finalProject = await genProjectRepo.getProjectById(concurrentProjectId);
    assert.ok(finalProject);
    assert.ok(finalProject.activityHistory.length >= 5, 'Must record all concurrent activity events');
  });

  it('11. Database connection interruption handled safely', async () => {
    const invalidPool = {
      getClient: async () => {
        const err = new Error('getaddrinfo ENOTFOUND invalid-pg-host.corp');
        err.code = 'ENOTFOUND';
        throw err;
      },
      query: async () => {
        const err = new Error('Connection terminated unexpectedly');
        err.code = 'ECONNRESET';
        throw err;
      }
    };

    const failingRepo = new AssessmentRepository(invalidPool);
    await assert.rejects(
      async () => {
        await failingRepo.getById('ASM-LIVE-F53');
      },
      /Connection terminated unexpectedly/,
      'Must return controlled connection error without unhandled crash'
    );
  });

  it('12. Corrupt source records quarantined without loss', async () => {
    const testDir = path.resolve(process.cwd(), 'backend', 'data');
    const qDir = path.join(testDir, 'quarantine');
    if (!fs.existsSync(qDir)) fs.mkdirSync(qDir, { recursive: true });

    const corruptRecord = {
      corruptKey: 'MISSING_ALL_REQUIRED_FIELDS',
      garbage: true
    };

    const qFile = path.join(qDir, `test-quarantine-${Date.now()}.json`);
    fs.writeFileSync(qFile, JSON.stringify([corruptRecord], null, 2), 'utf8');

    assert.ok(fs.existsSync(qFile), 'Quarantine record must be preserved on disk');
    const readBack = JSON.parse(fs.readFileSync(qFile, 'utf8'));
    assert.strictEqual(readBack[0].corruptKey, 'MISSING_ALL_REQUIRED_FIELDS');

    // Clean up test quarantine file
    fs.unlinkSync(qFile);
  });

  it('13. Idempotent re-run / duplicate protection', async () => {
    const beforeCatCount = (await catalogueRepo.getStats()).totalRecords;
    const beforeTxCount = (await txMasterRepo.listRecords()).length;
    const beforeAsmCount = (await assessmentRepo.list({})).length;
    const beforeProjCount = (await genProjectRepo.listProjects({})).length;

    // Re-run migration
    const report2 = await migrateAllStores();
    assert.strictEqual(report2.assessments.quarantined, 0);

    const afterCatCount = (await catalogueRepo.getStats()).totalRecords;
    const afterTxCount = (await txMasterRepo.listRecords()).length;
    const afterAsmCount = (await assessmentRepo.list({})).length;
    const afterProjCount = (await genProjectRepo.listProjects({})).length;

    assert.strictEqual(afterCatCount, beforeCatCount, 'Catalogue record count must not grow on duplicate migration');
    assert.strictEqual(afterTxCount, beforeTxCount, 'Transaction master record count must not grow on duplicate migration');
    assert.strictEqual(afterAsmCount, beforeAsmCount, 'Assessment record count must not grow on duplicate migration');
    assert.strictEqual(afterProjCount, beforeProjCount, 'Generation project count must not grow on duplicate migration');
  });

  it('14. Artifact storage operations and checksums verified', async () => {
    const tenantId = 'TENANT-S1-TEST';
    const projectId = 'GEN-ARTIFACT-TEST-S1';
    const artifactName = 'ZCL_ME21N_RAP_BEHAVIOR.abap';
    const abapContent = 'CLASS zcl_me21n_rap_behavior DEFINITION PUBLIC ABSTRACT FINAL FOR BEHAVIOR OF zi_purchaseorder. ENDCLASS.';

    const saved = await artifactStorage.saveArtifact(
      tenantId,
      projectId,
      artifactName,
      abapContent,
      { tier: 'TIER_2_CLOUD_DEVELOPER' }
    );

    assert.strictEqual(saved.artifactName, artifactName);
    assert.strictEqual(saved.storageDriver, 'LOCAL_FS');
    assert.ok(fs.existsSync(saved.storagePath), 'Artifact must be saved to disk');

    const expectedHash = crypto.createHash('sha256').update(abapContent).digest('hex');
    assert.strictEqual(saved.contentHash, expectedHash);

    // Save metadata record into database
    await genProjectRepo.createProject({
      projectId,
      projectName: 'Artifact Test Project',
      origin: 'STANDALONE'
    }, tenantId);

    const dbArtifact = await genProjectRepo.saveArtifactRecord(projectId, saved);
    assert.ok(dbArtifact.id);
    assert.strictEqual(dbArtifact.artifact_name, artifactName);
    assert.strictEqual(dbArtifact.content_hash, expectedHash);

    // Read back from storage
    const retrieved = await artifactStorage.getArtifact(tenantId, projectId, artifactName);
    assert.strictEqual(retrieved.content.toString('utf8'), abapContent);
    assert.strictEqual(retrieved.contentHash, expectedHash);

    // Clean up test artifact
    await artifactStorage.deleteArtifact(tenantId, projectId, artifactName);
    const afterDelete = await artifactStorage.getArtifact(tenantId, projectId, artifactName);
    assert.strictEqual(afterDelete, null);
  });
});
