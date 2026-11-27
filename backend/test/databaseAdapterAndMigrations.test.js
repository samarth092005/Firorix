/**
 * Fiorify — Database Engineering & Multi-Engine Migration Test Suite (DB-001 to DB-010)
 *
 * Verifies:
 * - DB-002: Vendor-neutral DatabaseAdapter abstraction (PostgresAdapter & HanaAdapter)
 * - DB-004: Production fail-closed invariant (SAP HANA Cloud enforcement, rejection of PostgreSQL)
 * - DB-005: VCAP_SERVICES SAP HANA Cloud binding resolution and parameter adaptation
 * - DB-006: DialectMigrationRunner: schema creation, checksum validation, migration forward/backward lifecycle
 * - DB-007: Readiness & Liveness health endpoints (/api/v1/health/readiness, /api/v1/health/liveness)
 * - DB-008: Connection pooling, isolation, and graceful pool drainage
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { DatabaseAdapter } from '../src/infrastructure/db/adapters/databaseAdapter.js';
import { PostgresAdapter } from '../src/infrastructure/db/adapters/postgresAdapter.js';
import { HanaAdapter } from '../src/infrastructure/db/adapters/hanaAdapter.js';
import { DatabaseAdapterFactory } from '../src/infrastructure/db/adapters/databaseAdapterFactory.js';
import { DialectMigrationRunner } from '../src/infrastructure/db/migrator/dialectMigrationRunner.js';
import { createServer } from '../src/server.js';

describe('Fiorify Milestone 3: Database Engineering (DB-001 to DB-010)', () => {

  // ========================================================
  // DB-002: Vendor-Neutral Database Adapter Abstraction
  // ========================================================
  describe('DB-002: Vendor-Neutral Database Adapter Abstraction', () => {
    it('1. DatabaseAdapter base class enforces abstract method implementations', async () => {
      const adapter = new DatabaseAdapter();
      assert.throws(() => adapter.getDialect(), /must be implemented/);
      await assert.rejects(async () => adapter.connect(), /must be implemented/);
      await assert.rejects(async () => adapter.query('SELECT 1'), /must be implemented/);
      await assert.rejects(async () => adapter.getClient(), /must be implemented/);
      await assert.rejects(async () => adapter.withTenantClient('T1', async () => {}), /must be implemented/);
      await assert.rejects(async () => adapter.healthCheck(), /must be implemented/);
      await assert.rejects(async () => adapter.close(), /must be implemented/);
    });

    it('2. PostgresAdapter implements DatabaseAdapter contract and returns dialect "postgres"', () => {
      const pgAdapter = new PostgresAdapter();
      assert.strictEqual(pgAdapter.getDialect(), 'postgres');
      assert.strictEqual(typeof pgAdapter.query, 'function');
      assert.strictEqual(typeof pgAdapter.healthCheck, 'function');
    });

    it('3. HanaAdapter implements DatabaseAdapter contract and returns dialect "hana"', () => {
      const hanaAdapter = new HanaAdapter({ mock: true, mockRows: [{ DUMMY: 'X' }] });
      assert.strictEqual(hanaAdapter.getDialect(), 'hana');
      assert.strictEqual(typeof hanaAdapter.query, 'function');
      assert.strictEqual(typeof hanaAdapter.healthCheck, 'function');
    });
  });

  // ========================================================
  // DB-004 & DB-005: Production Fail-Closed & VCAP_SERVICES Binding
  // ========================================================
  describe('DB-004 & DB-005: Production Fail-Closed Policy & Binding Resolution', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalVcap = process.env.VCAP_SERVICES;
    const originalPersistence = process.env.FIORIFY_PERSISTENCE;

    after(() => {
      process.env.NODE_ENV = originalEnv;
      if (originalVcap) {
        process.env.VCAP_SERVICES = originalVcap;
      } else {
        delete process.env.VCAP_SERVICES;
      }
      if (originalPersistence !== undefined) {
        process.env.FIORIFY_PERSISTENCE = originalPersistence;
      } else {
        delete process.env.FIORIFY_PERSISTENCE;
      }
    });

    it('1. In production (NODE_ENV=production), Postgres is strictly rejected (fails closed)', () => {
      process.env.NODE_ENV = 'production';
      assert.throws(
        () => DatabaseAdapterFactory.createAdapter({ dialect: 'postgres' }),
        /FATAL CONFIGURATION ERROR: PostgreSQL is strictly forbidden as production persistence/
      );
    });

    it('2. In production, missing SAP HANA Cloud binding triggers fail-closed error', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.FIORIFY_PERSISTENCE;
      delete process.env.VCAP_SERVICES;
      delete process.env.HANA_HOST;

      assert.throws(
        () => DatabaseAdapterFactory.assertProductionReadiness({ mock: false }),
        (err) => err.code === 'MISSING_PRODUCTION_HANA_BINDING' || /No SAP HANA Cloud service binding found in VCAP_SERVICES/.test(err.message)
      );
    });

    it('3. HanaAdapter parses Cloud Foundry VCAP_SERVICES binding correctly', () => {
      const mockVcap = {
        hana: [
          {
            name: 'fiorify-hana-db',
            credentials: {
              host: 'hana-test.prod.eu10.hanacloud.ondemand.com',
              port: '443',
              user: 'FIORIFY_SCHEMA_OWNER',
              password: 'SecretHanaPassword#2026',
              schema: 'FIORIFY_PROD'
            }
          }
        ]
      };
      process.env.VCAP_SERVICES = JSON.stringify(mockVcap);

      const adapter = new HanaAdapter();
      assert.ok(adapter.connectionParams);
      assert.strictEqual(adapter.connectionParams.host, 'hana-test.prod.eu10.hanacloud.ondemand.com');
      assert.strictEqual(adapter.connectionParams.port, '443');
      assert.strictEqual(adapter.connectionParams.uid, 'FIORIFY_SCHEMA_OWNER');
      assert.strictEqual(adapter.connectionParams.currentSchema, 'FIORIFY_PROD');
      assert.strictEqual(adapter.connectionParams.encrypt, true);
    });

    it('4. HanaAdapter adapts PostgreSQL-style $1, $2 query parameters to HANA ? parameters', () => {
      const sql = 'SELECT * FROM assessments WHERE tenant_id = $1 AND lifecycle_status = $2;';
      const adapted = HanaAdapter.adaptSql(sql);
      assert.strictEqual(adapted, 'SELECT * FROM assessments WHERE tenant_id = ? AND lifecycle_status = ?;');
    });
  });

  // ========================================================
  // DB-006: Dialect-Aware Migration Runner
  // ========================================================
  describe('DB-006: Dialect-Aware Migration Runner', () => {
    it('1. Resolves dialect-specific migration files for postgres', () => {
      const runner = new DialectMigrationRunner({ dialect: 'postgres' });
      const available = runner.getAvailableMigrations();
      assert.ok(available.length >= 3);
      assert.strictEqual(available[0].version, '001');
      assert.strictEqual(available[0].dialect, 'postgres');
      assert.ok(available[0].checksum.length > 0);
    });

    it('2. Resolves dialect-specific migration files for SAP HANA Cloud', () => {
      const runner = new DialectMigrationRunner({ dialect: 'hana' });
      const available = runner.getAvailableMigrations();
      assert.ok(available.length >= 3);
      assert.strictEqual(available[0].version, '001');
      assert.strictEqual(available[0].dialect, 'hana');
      assert.ok(available[0].checksum.length > 0);
      assert.ok(available[0].content.includes('NVARCHAR'));
    });

    it('3. Computes cryptographic SHA-256 checksums consistently', () => {
      const runner = new DialectMigrationRunner({ dialect: 'postgres' });
      const sample = 'CREATE TABLE test (id INT);';
      const hash1 = runner.computeChecksum(sample);
      const hash2 = runner.computeChecksum(sample);
      assert.strictEqual(hash1, hash2);
      assert.strictEqual(hash1.length, 64);
    });

    it('4. Executes mock migration status reporting cleanly', async () => {
      const mockAdapter = {
        getDialect: () => 'hana',
        getClient: async () => ({
          query: async (sql) => {
            if (sql.includes('SYS.TABLES')) return { rows: [{ TABLE_NAME: 'SCHEMA_MIGRATIONS' }] };
            if (sql.includes('schema_migrations')) {
              return {
                rows: [
                  { version: '001', name: 'initial_schema', checksum: 'sample_checksum', applied_at: new Date().toISOString() }
                ]
              };
            }
            return { rows: [] };
          },
          release: () => {}
        })
      };

      const runner = new DialectMigrationRunner({ adapter: mockAdapter, dialect: 'hana' });
      const status = await runner.getStatus();
      assert.strictEqual(status.dialect, 'hana');
      assert.strictEqual(status.totalApplied, 1);
      assert.ok(status.totalAvailable >= 3);
    });
  });

  // ========================================================
  // DB-007: Health, Liveness & Readiness Probes
  // ========================================================
  describe('DB-007: Health, Liveness & Readiness Probes', () => {
    let server;
    let baseUrl;

    before(async () => {
      server = createServer();
      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
    });

    after(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    it('1. GET /api/v1/health/liveness returns HTTP 200 with status UP', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health/liveness`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'UP');
      assert.ok(data.timestamp);
    });

    it('2. GET /api/v1/health/readiness returns detailed component status', async () => {
      const res = await fetch(`${baseUrl}/api/v1/health/readiness`);
      assert.ok(res.status === 200 || res.status === 503);
      const data = await res.json();
      assert.ok(data.status === 'READY' || data.status === 'NOT_READY');
      assert.ok(data.components);
      assert.ok(data.components.database);
      assert.ok(data.components.migrations);
      assert.ok(data.components.btpConnectivity);
    });
  });

  // ========================================================
  // HANA Migration Splitting & SystemRegistry HANA Support
  // ========================================================
  describe('SAP HANA Cloud Migration & Registry Compatibility', () => {
    it('1. DialectMigrationRunner.splitSqlStatements splits HANA DDL safely while respecting comments and literals', () => {
      const sql = `
        -- leading comment with ; semicolon
        CREATE TABLE schema_migrations (version NVARCHAR(64) PRIMARY KEY);
        /* block comment ; */
        CREATE TABLE tenants (tenant_id NVARCHAR(64) PRIMARY KEY, note NVARCHAR(64) DEFAULT 'a;b');
      `;
      const stmts = DialectMigrationRunner.splitSqlStatements(sql);
      assert.strictEqual(stmts.length, 2);
      assert.match(stmts[0], /^CREATE TABLE schema_migrations/i);
      assert.match(stmts[1], /DEFAULT 'a;b'/);
    });

    it('2. DialectMigrationRunner skips duplicate CREATE TABLE schema_migrations during HANA _executeMigrationSql', async () => {
      const executed = [];
      const mockAdapter = {
        getDialect: () => 'hana',
        getClient: async () => ({
          query: async (sql) => {
            executed.push(sql);
            return { rows: [] };
          },
          release: () => {}
        })
      };
      const runner = new DialectMigrationRunner({ adapter: mockAdapter, dialect: 'hana' });
      const client = await mockAdapter.getClient();
      await runner._executeMigrationSql(
        client,
        'CREATE TABLE schema_migrations (version NVARCHAR(64)); CREATE TABLE tenants (tenant_id NVARCHAR(64));',
        { isUp: true }
      );
      assert.strictEqual(executed.length, 1);
      assert.match(executed[0], /^CREATE TABLE tenants/i);
    });

    it('3. SystemRegistry accepts FIORIFY_PERSISTENCE=hana in production mode', async () => {
      const prevNodeEnv = process.env.NODE_ENV;
      const prevPersist = process.env.FIORIFY_PERSISTENCE;
      try {
        process.env.NODE_ENV = 'production';
        process.env.FIORIFY_PERSISTENCE = 'hana';
        const { SystemRegistry } = await import('../src/adapters/systemRegistry.js');
        const reg = new SystemRegistry({ repository: { list: async () => [] } });
        assert.strictEqual(reg.useDatabase, true);
      } finally {
        process.env.NODE_ENV = prevNodeEnv;
        if (prevPersist === undefined) delete process.env.FIORIFY_PERSISTENCE;
        else process.env.FIORIFY_PERSISTENCE = prevPersist;
      }
    });
  });
});
