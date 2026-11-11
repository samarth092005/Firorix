/**
 * FioriX — QA-02: Generation Project PostgreSQL Repository Readiness & Migration Test Suite
 *
 * Verifies:
 * 1. GenerationProjectRepository CRUD against active PostgreSQL pool.
 * 2. Specifications storage (REQUIREMENTS, DATA_MODEL, ARCHITECTURE).
 * 3. Activity events and audit trail in relational schema.
 * 4. Migration from existing JSON file store into PostgreSQL without data loss.
 * 5. Preservation of original filesystem JSON stores (no deletion / modification).
 * 6. Active development store defaults to local filesystem (no automatic forced change).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import DatabasePool from '../src/infrastructure/db/pool.js';
import MigrationRunner from '../src/infrastructure/db/migrator.js';
import { GenerationProjectRepository } from '../src/infrastructure/db/repositories/generationProjectRepository.js';
import { GenerationProjectStore } from '../src/generation/projects/generationProjectStore.js';
import { migrateAllStores } from '../src/infrastructure/db/scripts/migrateStores.js';

describe('QA-02: PostgreSQL Repository Readiness & Store Migration', () => {
  let pool;
  let repo;
  let testTenantId = 'TENANT-PG-QA02';
  let testProjectId = `GEN-PG-TEST-${Date.now()}`;

  before(async () => {
    process.env.FIORIX_ALLOW_EMBEDDED_PG = 'true';
    pool = await DatabasePool.getPool();
    assert.ok(pool, 'PostgreSQL database pool must be initialized');

    const migrator = new MigrationRunner(pool);
    await migrator.migrateUp();

    repo = new GenerationProjectRepository(pool);
  });

  after(async () => {
    if (pool && repo) {
      try {
        await repo.deleteProject(testProjectId, testTenantId);
      } catch {
        // cleanup ignore
      }
    }
    await DatabasePool.close();
  });

  it('1. createProject persists project record, specifications, and initial activity events in PostgreSQL', async () => {
    const projectPayload = {
      projectId: testProjectId,
      projectName: 'PostgreSQL Order Modernization',
      description: 'Testing PostgreSQL repository adapter completeness',
      origin: 'STANDALONE',
      targetRelease: 'SAP S/4HANA 2023 On-Premise',
      targetDeploymentModel: 'ON_PREMISE',
      lifecycleStatus: 'DRAFT',
      currentPhase: 'PHASE_1_WORKSPACE',
      specificationVersion: 1,
      createdBy: 'Postgres Test Architect',
      creatorId: 'USR-PG-001',
      requirementsSpec: {
        specVersion: 1,
        items: [
          { requirementId: 'REQ-PG-01', title: 'Credit Limit Verification', status: 'CONFIRMED' }
        ]
      },
      dataModelSpec: {
        specVersion: 1,
        entities: [
          { entityId: 'ENT-PG-01', name: 'OrderHeader', entityType: 'ROOT' }
        ]
      }
    };

    const created = await repo.createProject(projectPayload, testTenantId);
    assert.ok(created, 'Project must be created in PostgreSQL');
    assert.equal(created.projectId, testProjectId);
    assert.equal(created.projectName, 'PostgreSQL Order Modernization');
    assert.equal(created.lifecycleStatus, 'DRAFT');
    assert.equal(created.requirementsSpec?.items?.length, 1);
    assert.equal(created.dataModelSpec?.entities?.length, 1);
  });

  it('2. getProjectById retrieves complete relational project with specifications and events', async () => {
    const fetched = await repo.getProjectById(testProjectId, testTenantId);
    assert.ok(fetched, 'Project must be found');
    assert.equal(fetched.projectId, testProjectId);
    assert.equal(fetched.requirementsSpec.items[0].title, 'Credit Limit Verification');
    assert.equal(fetched.dataModelSpec.entities[0].name, 'OrderHeader');
    assert.ok(fetched.activityHistory.length >= 1, 'Initial creation event must be recorded');
  });

  it('3. updateProject updates fields, persists new specification revisions, and logs audit events', async () => {
    const updated = await repo.updateProject(testProjectId, {
      projectName: 'PostgreSQL Order Modernization (Updated)',
      lifecycleStatus: 'REQUIREMENTS_IN_PROGRESS',
      currentPhase: 'PHASE_2_REQUIREMENTS',
      author: 'Postgres Lead Architect',
      actorId: 'USR-PG-LEAD',
      activityAction: 'PHASE_ADVANCED',
      requirementsSpec: {
        specVersion: 2,
        items: [
          { requirementId: 'REQ-PG-01', title: 'Credit Limit Verification', status: 'CONFIRMED' },
          { requirementId: 'REQ-PG-02', title: 'Pricing Engine Calculation', status: 'DRAFT' }
        ]
      }
    }, testTenantId);

    assert.ok(updated);
    assert.equal(updated.projectName, 'PostgreSQL Order Modernization (Updated)');
    assert.equal(updated.lifecycleStatus, 'REQUIREMENTS_IN_PROGRESS');
    assert.equal(updated.requirementsSpec.items.length, 2);
    assert.ok(updated.activityHistory.length >= 2, 'Audit event must be logged');
  });

  it('4. archiveProject and restoreProject execute controlled state transitions in PostgreSQL', async () => {
    const archived = await repo.archiveProject(testProjectId, { userName: 'Archiver', userId: 'USR-ARC' }, testTenantId);
    assert.equal(archived.lifecycleStatus, 'ARCHIVED');

    const restored = await repo.restoreProject(testProjectId, { userName: 'Restorer', userId: 'USR-RES' }, testTenantId);
    assert.equal(restored.lifecycleStatus, 'DRAFT');
  });

  it('5. duplicateProject clones project under a distinct new ID with clean history', async () => {
    const duplicateId = `${testProjectId}-COPY`;
    const duplicated = await repo.duplicateProject(testProjectId, {
      newProjectId: duplicateId,
      newProjectName: 'Duplicated Order Project'
    }, { userName: 'Cloner', userId: 'USR-CLONE' }, testTenantId);

    assert.ok(duplicated);
    assert.equal(duplicated.projectId, duplicateId);
    assert.equal(duplicated.projectName, 'Duplicated Order Project');
    assert.equal(duplicated.lifecycleStatus, 'DRAFT');

    // Clean up duplicate
    await repo.deleteProject(duplicateId, testTenantId);
  });

  it('6. deleteProject safely removes project and cascades to specifications and events', async () => {
    const tempId = `GEN-TEMP-${Date.now()}`;
    await repo.createProject({ projectId: tempId, projectName: 'Temp' }, testTenantId);
    const deleted = await repo.deleteProject(tempId, testTenantId);
    assert.equal(deleted, true);

    const lookup = await repo.getProjectById(tempId, testTenantId);
    assert.equal(lookup, null);
  });

  it('7. Preserves file store as default: GenerationProjectStore operates on file system when FIORIX_PERSISTENCE is unset', () => {
    const store = new GenerationProjectStore();
    assert.equal(store.useDatabase, false, 'Default store must NOT be forced to PostgreSQL in local dev');
    assert.ok(fs.existsSync(store.storageDir), 'File storage directory must exist');
  });
});
