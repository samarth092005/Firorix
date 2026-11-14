import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import DatabasePool from '../pool.js';
import MigrationRunner from '../migrator.js';
import AssessmentRepository from '../repositories/assessmentRepository.js';
import CatalogueRepository from '../repositories/catalogueRepository.js';
import TransactionMasterRepository from '../repositories/transactionMasterRepository.js';
import GenerationProjectRepository from '../repositories/generationProjectRepository.js';
import GenerationHandoffRepository from '../repositories/generationHandoffRepository.js';
import { createPreMigrationBackup, resolveDataDir } from './createPreMigrationBackup.js';

export async function migrateAllStores(options = {}) {
  const dataDir = resolveDataDir(options.dataDir);
  const tenantId = options.tenantId || 'DEFAULT-TENANT-S21';
  const systemProfileId = options.systemProfileId || `${tenantId}-S21-200`;

  // 1. Create Pre-Migration Immutable Backup
  const backupResult = createPreMigrationBackup(dataDir);

  // 2. Run Database Migrations
  const migrator = new MigrationRunner();
  const migrationResult = await migrator.migrateUp();

  // 3. Initialize Repositories
  const assessmentRepo = new AssessmentRepository();
  const catalogueRepo = new CatalogueRepository();
  const txMasterRepo = new TransactionMasterRepository();
  const genProjectRepo = new GenerationProjectRepository();

  const report = {
    timestamp: new Date().toISOString(),
    backup: {
      snapshotFolder: backupResult.snapshotFolder,
      totalFiles: backupResult.totalFiles
    },
    migrations: migrationResult,
    catalogue: { sourceCount: 0, imported: 0, updated: 0, skipped: 0, errors: [] },
    transactionMaster: { sourceCount: 0, imported: 0, errors: [] },
    assessments: { sourceCount: 0, imported: 0, quarantined: 0, errors: [] },
    generationProjects: { sourceCount: 0, imported: 0, quarantined: 0, errors: [] },
    generationHandoffs: { sourceCount: 0, imported: 0, quarantined: 0, errors: [] },
    quarantine: []
  };

  // 4. Ingest Official Fiori Catalogue
  const cachePath = path.join(dataDir, 'fiori_app_catalog_cache.json');
  const statusPath = path.join(dataDir, 'fiori_app_catalog_status.json');

  if (fs.existsSync(cachePath)) {
    const rawCache = fs.readFileSync(cachePath);
    const contentHash = crypto.createHash('sha256').update(rawCache).digest('hex');
    const apps = JSON.parse(rawCache.toString('utf8'));
    const appList = Array.isArray(apps) ? apps : (apps.apps || []);
    report.catalogue.sourceCount = appList.length;

    let statusData = {};
    if (fs.existsSync(statusPath)) {
      statusData = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    }

    await catalogueRepo.recordSourceImport({
      sourceName: 'SAP_FAL_BASELINE_CACHE',
      sourceType: statusData.liveSourceStatus || 'OFFICIAL_CATALOGUE_LIVE',
      sourceVersion: statusData.sourceVersion || 'S4HANA_2023_FPS02_OFFICIAL',
      targetRelease: statusData.targetRelease || 'SAP S/4HANA 2023 On-Premise',
      recordCount: appList.length,
      contentHash,
      status: 'SUCCESS',
      summary: statusData
    });

    for (const app of appList) {
      try {
        await catalogueRepo.upsertApp(app);
        report.catalogue.imported++;
      } catch (err) {
        report.catalogue.errors.push({ id: app.appId || app.fioriId, error: err.message });
      }
    }
  }

  // 5. Ingest Transaction Master Index
  const txPath = path.join(dataDir, 'transaction_master_snapshot.json');
  if (fs.existsSync(txPath)) {
    const txRaw = fs.readFileSync(txPath, 'utf8');
    const txData = JSON.parse(txRaw);
    const records = txData.records || (txData.transactions ? Object.values(txData.transactions) : []);
    report.transactionMaster.sourceCount = records.length;

    try {
      const snapResult = await txMasterRepo.saveSnapshot(txData, tenantId, systemProfileId);
      report.transactionMaster.imported = snapResult.totalRecords;
    } catch (err) {
      report.transactionMaster.errors.push({ error: err.message });
    }
  }

  // 6. Ingest Assessments
  const asmPath = path.join(dataDir, 'assessments.json');
  if (fs.existsSync(asmPath)) {
    const asmRaw = fs.readFileSync(asmPath, 'utf8');
    const assessments = JSON.parse(asmRaw);
    report.assessments.sourceCount = assessments.length;

    for (const asm of assessments) {
      try {
        // Validate required fields
        if (!asm.id || (!asm.tcode && !asm.transactionCode)) {
          report.assessments.quarantined++;
          report.quarantine.push({
            type: 'ASSESSMENT',
            id: asm.id || 'UNKNOWN',
            reason: 'Missing required ID or T-Code',
            payload: asm
          });
          continue;
        }

        await assessmentRepo.create(asm, tenantId);
        report.assessments.imported++;
      } catch (err) {
        report.assessments.errors.push({ id: asm.id, error: err.message });
      }
    }
  }

  // 7. Ingest Generation Projects
  const genDir = path.join(dataDir, 'generation-projects');
  if (fs.existsSync(genDir)) {
    const projectDirs = fs.readdirSync(genDir);
    report.generationProjects.sourceCount = projectDirs.length;

    for (const dir of projectDirs) {
      const pPath = path.join(genDir, dir, 'project.json');
      if (!fs.existsSync(pPath)) continue;

      try {
        const pData = JSON.parse(fs.readFileSync(pPath, 'utf8'));
        if (!pData.projectId && !pData.id) {
          report.generationProjects.quarantined++;
          report.quarantine.push({
            type: 'GENERATION_PROJECT',
            id: dir,
            reason: 'Missing project ID in project.json',
            payload: pData
          });
          continue;
        }

        await genProjectRepo.createProject(pData, tenantId);
        report.generationProjects.imported++;
      } catch (err) {
        report.generationProjects.errors.push({ id: dir, error: err.message });
      }
    }
  }

  // 8. Ingest Generation Handoffs
  const handoffRepo = new GenerationHandoffRepository();
  const hndPath = path.join(dataDir, 'generationHandoffs.json');

  if (fs.existsSync(hndPath)) {
    const hndRaw = fs.readFileSync(hndPath, 'utf8');
    const handoffs = JSON.parse(hndRaw);
    report.generationHandoffs.sourceCount = handoffs.length;

    for (const hnd of handoffs) {
      try {
        if (!hnd.handoffId || !hnd.tcode) {
          report.generationHandoffs.quarantined++;
          report.quarantine.push({
            type: 'GENERATION_HANDOFF',
            id: hnd.handoffId || 'UNKNOWN',
            reason: 'Missing handoff ID or T-Code',
            payload: hnd
          });
          continue;
        }

        await handoffRepo.createHandoff(hnd, tenantId);
        report.generationHandoffs.imported++;
      } catch (err) {
        report.generationHandoffs.errors.push({ id: hnd.handoffId, error: err.message });
      }
    }
  }

  // Write quarantine file if any records were quarantined
  if (report.quarantine.length > 0) {
    const qDir = path.join(dataDir, 'quarantine');
    if (!fs.existsSync(qDir)) fs.mkdirSync(qDir, { recursive: true });
    const qFile = path.join(qDir, `quarantine-${Date.now()}.json`);
    fs.writeFileSync(qFile, JSON.stringify(report.quarantine, null, 2), 'utf8');
    report.quarantineFile = qFile;
  }

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('migrateStores.js')) {
  try {
    const report = await migrateAllStores();
    console.log('=== S1 DATA MIGRATION REPORT ===');
    console.log(JSON.stringify(report, null, 2));
    await DatabasePool.close();
  } catch (err) {
    console.error('Migration failed:', err);
    await DatabasePool.close();
    process.exit(1);
  }
}

export default migrateAllStores;
