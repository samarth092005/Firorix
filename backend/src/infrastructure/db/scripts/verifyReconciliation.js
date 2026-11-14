import fs from 'node:fs';
import path from 'node:path';
import DatabasePool from '../pool.js';
import AssessmentRepository from '../repositories/assessmentRepository.js';
import CatalogueRepository from '../repositories/catalogueRepository.js';
import TransactionMasterRepository from '../repositories/transactionMasterRepository.js';
import GenerationProjectRepository from '../repositories/generationProjectRepository.js';
import GenerationHandoffRepository from '../repositories/generationHandoffRepository.js';

import { resolveDataDir } from './createPreMigrationBackup.js';

export async function verifyReconciliation(options = {}) {
  const dataDir = resolveDataDir(options.dataDir);
  const tenantId = options.tenantId || 'DEFAULT-TENANT-S21';

  const assessmentRepo = new AssessmentRepository();
  const catalogueRepo = new CatalogueRepository();
  const txMasterRepo = new TransactionMasterRepository();
  const genProjectRepo = new GenerationProjectRepository();
  const handoffRepo = new GenerationHandoffRepository();

  const reconciliation = {
    timestamp: new Date().toISOString(),
    status: 'PASS',
    stores: {},
    auditIntegrity: { verified: 0, failed: 0, failures: [] },
    anomalies: []
  };

  // 1. Catalogue Verification
  const cachePath = path.join(dataDir, 'fiori_app_catalog_cache.json');
  if (fs.existsSync(cachePath)) {
    const rawCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const sourceApps = Array.isArray(rawCache) ? rawCache : (rawCache.apps || []);
    const dbStats = await catalogueRepo.getStats();

    const catMatches = sourceApps.length === dbStats.totalRecords;
    if (!catMatches) reconciliation.status = 'FAIL';

    reconciliation.stores.catalogue = {
      sourceCount: sourceApps.length,
      dbCount: dbStats.totalRecords,
      matches: catMatches,
      recordsByAppType: dbStats.recordsByAppType
    };
  }

  // 2. Transaction Master Verification
  const txPath = path.join(dataDir, 'transaction_master_snapshot.json');
  if (fs.existsSync(txPath)) {
    const txData = JSON.parse(fs.readFileSync(txPath, 'utf8'));
    const sourceRecords = txData.records || (txData.transactions ? Object.values(txData.transactions) : []);
    const dbRecords = await txMasterRepo.listRecords(tenantId);

    const txMatches = sourceRecords.length === dbRecords.length;
    if (!txMatches) reconciliation.status = 'FAIL';

    reconciliation.stores.transactionMaster = {
      sourceCount: sourceRecords.length,
      dbCount: dbRecords.length,
      matches: txMatches
    };
  }

  // 3. Assessment Verification
  const asmPath = path.join(dataDir, 'assessments.json');
  if (fs.existsSync(asmPath)) {
    const sourceAsms = JSON.parse(fs.readFileSync(asmPath, 'utf8'));
    const dbAsms = await assessmentRepo.list({}, tenantId);

    const asmMatches = sourceAsms.length === dbAsms.length;
    if (!asmMatches) reconciliation.status = 'FAIL';

    // Verify hash integrity for each assessment in DB
    for (const asm of dbAsms) {
      let prevHash = 'GENESIS';
      let asmIntegrityOk = true;

      for (const evt of asm.auditEvents) {
        if (evt.previousHash !== prevHash) {
          asmIntegrityOk = false;
          reconciliation.auditIntegrity.failures.push({
            assessmentId: asm.id,
            eventId: evt.eventId,
            expectedPrevHash: prevHash,
            actualPrevHash: evt.previousHash
          });
        }
        prevHash = evt.integrityHash;
      }

      if (asmIntegrityOk) {
        reconciliation.auditIntegrity.verified++;
      } else {
        reconciliation.auditIntegrity.failed++;
        reconciliation.status = 'FAIL';
      }
    }

    reconciliation.stores.assessments = {
      sourceCount: sourceAsms.length,
      dbCount: dbAsms.length,
      matches: asmMatches
    };
  }

  // 4. Generation Projects Verification
  const genDir = path.join(dataDir, 'generation-projects');
  if (fs.existsSync(genDir)) {
    const projectDirs = fs.readdirSync(genDir).filter(d => fs.existsSync(path.join(genDir, d, 'project.json')));
    const dbProjects = await genProjectRepo.listProjects({}, tenantId);

    const genMatches = projectDirs.length === dbProjects.length;
    if (!genMatches) reconciliation.status = 'FAIL';

    reconciliation.stores.generationProjects = {
      sourceCount: projectDirs.length,
      dbCount: dbProjects.length,
      matches: genMatches
    };
  }

  // 5. Generation Handoffs Verification
  const hndPath = path.join(dataDir, 'generationHandoffs.json');
  if (fs.existsSync(hndPath)) {
    const rawHandoffs = JSON.parse(fs.readFileSync(hndPath, 'utf8'));
    const dbHandoffs = await handoffRepo.listHandoffs({}, tenantId);

    const hndMatches = rawHandoffs.length === dbHandoffs.length;
    if (!hndMatches) reconciliation.status = 'FAIL';

    reconciliation.stores.generationHandoffs = {
      sourceCount: rawHandoffs.length,
      dbCount: dbHandoffs.length,
      matches: hndMatches
    };
  }

  return reconciliation;
}

if (process.argv[1] && process.argv[1].endsWith('verifyReconciliation.js')) {
  try {
    const rec = await verifyReconciliation();
    console.log('=== S1 RECONCILIATION VERIFICATION REPORT ===');
    console.log(JSON.stringify(rec, null, 2));
    await DatabasePool.close();
  } catch (err) {
    console.error('Reconciliation check failed:', err);
    await DatabasePool.close();
    process.exit(1);
  }
}

export default verifyReconciliation;
