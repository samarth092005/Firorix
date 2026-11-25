import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import DatabasePool from './pool.js';

export class MigrationRunner {
  constructor(options = {}) {
    const baseDir = path.resolve(
      path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')),
      'migrations'
    );
    const pgDir = path.join(baseDir, 'postgres');
    this.migrationsDir = options.migrationsDir || (fs.existsSync(pgDir) ? pgDir : baseDir);
  }

  computeChecksum(content) {
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  async ensureMigrationsTable(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(128) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER NOT NULL
      );
    `);
  }

  async getAppliedMigrations(client) {
    await this.ensureMigrationsTable(client);
    const res = await client.query('SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC;');
    return res.rows;
  }

  getAvailableMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }
    const files = fs.readdirSync(this.migrationsDir);
    const upFiles = files.filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql')).sort();

    return upFiles.map(file => {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        throw new Error(`Invalid migration filename format: ${file}. Expected format: <version>_<name>.sql`);
      }
      const version = match[1];
      const name = match[2];
      const filePath = path.join(this.migrationsDir, file);
      const downFilePath = path.join(this.migrationsDir, `${version}_${name}.down.sql`);
      const content = fs.readFileSync(filePath, 'utf8');
      const downContent = fs.existsSync(downFilePath) ? fs.readFileSync(downFilePath, 'utf8') : null;
      const checksum = this.computeChecksum(content);

      return {
        version,
        name,
        file,
        filePath,
        downFilePath,
        content,
        downContent,
        checksum
      };
    });
  }

  async getMigrationClient(options = {}) {
    const migrationUrl = options.connectionString || process.env.MIGRATION_DATABASE_URL_UNPOOLED || process.env.MIGRATION_DATABASE_URL;
    if (migrationUrl) {
      const migrationPool = await DatabasePool.getPool({ connectionString: migrationUrl });
      const client = await migrationPool.connect();
      return {
        client,
        release: async () => {
          client.release();
          await migrationPool.end().catch(() => {});
        }
      };
    }
    const client = await DatabasePool.getClient();
    return {
      client,
      release: async () => {
        client.release();
      }
    };
  }

  async migrateUp(options = {}) {
    const { client, release } = await this.getMigrationClient(options);
    const results = {
      applied: [],
      skipped: [],
      errors: []
    };

    try {
      await this.ensureMigrationsTable(client);
      const applied = await this.getAppliedMigrations(client);
      const appliedMap = new Map(applied.map(m => [m.version, m]));
      const available = this.getAvailableMigrations();

      for (const migration of available) {
        if (appliedMap.has(migration.version)) {
          const appliedRecord = appliedMap.get(migration.version);
          if (appliedRecord.checksum !== migration.checksum) {
            if (!options.allowChecksumMismatch) {
              throw new Error(
                `Migration checksum mismatch for version ${migration.version} (${migration.name})! ` +
                `Recorded checksum: ${appliedRecord.checksum}, Current checksum: ${migration.checksum}. ` +
                `Refusing to proceed without explicit repair approval.`
              );
            }
          }
          results.skipped.push({
            version: migration.version,
            name: migration.name,
            reason: 'ALREADY_APPLIED'
          });
          continue;
        }

        const startTime = Date.now();
        await client.query('BEGIN;');
        try {
          await client.query(migration.content);
          const duration = Date.now() - startTime;

          await client.query(
            `INSERT INTO schema_migrations (version, name, checksum, execution_time_ms)
             VALUES ($1, $2, $3, $4);`,
            [migration.version, migration.name, migration.checksum, duration]
          );

          await client.query('COMMIT;');
          results.applied.push({
            version: migration.version,
            name: migration.name,
            executionTimeMs: duration
          });
        } catch (migrationErr) {
          await client.query('ROLLBACK;');
          results.errors.push({
            version: migration.version,
            name: migration.name,
            error: migrationErr.message
          });
          throw new Error(`Migration ${migration.version} (${migration.name}) failed: ${migrationErr.message}`);
        }
      }

      // Grant app user permissions on newly created tables if present
      try {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'fiorify_app') THEN
              GRANT USAGE ON SCHEMA public TO fiorify_app;
              GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fiorify_app;
              GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fiorify_app;
            END IF;
          END $$;
        `);
      } catch {}

      return results;
    } finally {
      await release();
    }
  }

  async migrateDown(targetVersion, options = {}) {
    const { client, release } = await this.getMigrationClient(options);
    const results = {
      rolledBack: [],
      errors: []
    };

    try {
      await this.ensureMigrationsTable(client);
      const applied = await this.getAppliedMigrations(client);
      const available = this.getAvailableMigrations();
      const availableMap = new Map(available.map(m => [m.version, m]));

      // Determine migrations to roll back in reverse order
      const toRollBack = applied
        .filter(m => !targetVersion || m.version >= targetVersion)
        .reverse();

      for (const appliedMigration of toRollBack) {
        const migrationMeta = availableMap.get(appliedMigration.version);
        if (!migrationMeta || !migrationMeta.downContent) {
          throw new Error(`Cannot rollback version ${appliedMigration.version}: Missing .down.sql file.`);
        }

        await client.query('BEGIN;');
        try {
          await client.query(migrationMeta.downContent);
          await client.query('DELETE FROM schema_migrations WHERE version = $1;', [appliedMigration.version]);
          await client.query('COMMIT;');

          results.rolledBack.push({
            version: appliedMigration.version,
            name: appliedMigration.name
          });
        } catch (err) {
          await client.query('ROLLBACK;');
          results.errors.push({
            version: appliedMigration.version,
            error: err.message
          });
          throw new Error(`Rollback of version ${appliedMigration.version} failed: ${err.message}`);
        }
      }

      return results;
    } finally {
      await release();
    }
  }

  async status(options = {}) {
    const { client, release } = await this.getMigrationClient(options);
    try {
      const applied = await this.getAppliedMigrations(client);
      const appliedMap = new Map(applied.map(m => [m.version, m]));
      const available = this.getAvailableMigrations();

      return available.map(m => ({
        version: m.version,
        name: m.name,
        checksum: m.checksum,
        isApplied: appliedMap.has(m.version),
        appliedAt: appliedMap.get(m.version)?.applied_at || null,
        checksumMatches: appliedMap.has(m.version)
          ? appliedMap.get(m.version).checksum === m.checksum
          : null
      }));
    } finally {
      await release();
    }
  }
}

export default MigrationRunner;

// CLI execution entrypoint
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const runner = new MigrationRunner();
  const cmd = (process.argv[2] || 'status').toLowerCase();
  try {
    if (cmd === 'up') {
      const res = await runner.migrateUp();
      console.log('[MigrationRunner] Completed:', JSON.stringify(res, null, 2));
      await DatabasePool.close();
      process.exit(0);
    } else if (cmd === 'down') {
      const res = await runner.migrateDown(parseInt(process.argv[3] || '1', 10));
      console.log('[MigrationRunner] Rollback completed:', JSON.stringify(res, null, 2));
      await DatabasePool.close();
      process.exit(0);
    } else {
      const res = await runner.status();
      console.log('[MigrationRunner] Status:', JSON.stringify(res, null, 2));
      await DatabasePool.close();
      process.exit(0);
    }
  } catch (err) {
    console.error('[MigrationRunner] Error:', err.message);
    await DatabasePool.close().catch(() => {});
    process.exit(1);
  }
}
