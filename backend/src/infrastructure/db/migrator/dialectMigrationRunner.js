/**
 * Fiorify — Dialect-Aware Database Migration Runner (DB-006)
 *
 * Provides database engine-agnostic schema migrations for:
 * - PostgreSQL (Local development & testing)
 * - SAP HANA Cloud (Production deployment on SAP BTP Cloud Foundry)
 *
 * Capabilities:
 * - Engine-specific migration discovery (migrations/postgres vs migrations/hana)
 * - Cryptographic SHA-256 migration checksum validation
 * - Atomic transactional migration execution
 * - Full migration status reporting and forward/rollback lifecycle management
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defaultDatabaseAdapter } from '../adapters/databaseAdapterFactory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DialectMigrationRunner {
  constructor(options = {}) {
    this.adapter = options.adapter || defaultDatabaseAdapter;
    this.dialect = options.dialect || (this.adapter ? this.adapter.getDialect() : 'postgres');
    
    // Resolve migration directory based on dialect
    const baseMigrationsDir = path.resolve(__dirname, '..', 'migrations');
    const dialectDir = path.join(baseMigrationsDir, this.dialect);
    
    if (fs.existsSync(dialectDir)) {
      this.migrationsDir = dialectDir;
    } else {
      this.migrationsDir = baseMigrationsDir;
    }

    if (options.migrationsDir) {
      this.migrationsDir = path.resolve(options.migrationsDir);
    }
  }

  computeChecksum(content) {
    if (!content) return '';
    return crypto.createHash('sha256').update(content.trim()).digest('hex');
  }

  /**
   * Splits a multi-statement SQL script into individual statements for drivers
   * (such as @sap/hana-client) that execute one SQL statement per call.
   * Respects single-quoted string literals and `--` / `/* * /` comments.
   */
  static splitSqlStatements(sql) {
    if (!sql || typeof sql !== 'string') return [];
    const statements = [];
    let current = '';
    let inSingleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      const next = sql[i + 1];

      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          inBlockComment = false;
          i++;
        }
        continue;
      }
      if (!inSingleQuote && ch === '-' && next === '-') {
        inLineComment = true;
        i++;
        continue;
      }
      if (!inSingleQuote && ch === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
      }
      if (ch === "'") {
        current += ch;
        if (inSingleQuote && next === "'") {
          current += next;
          i++;
        } else {
          inSingleQuote = !inSingleQuote;
        }
        continue;
      }
      if (!inSingleQuote && ch === ';') {
        const trimmed = current.trim();
        if (trimmed) statements.push(trimmed);
        current = '';
        continue;
      }
      current += ch;
    }

    const trailing = current.trim();
    if (trailing) statements.push(trailing);
    return statements;
  }

  async _executeMigrationSql(client, sqlContent, { isUp = true } = {}) {
    if (this.dialect !== 'hana') {
      await client.query(sqlContent);
      return;
    }

    const statements = DialectMigrationRunner.splitSqlStatements(sqlContent);
    for (const stmt of statements) {
      if (isUp && /^\s*CREATE\s+TABLE\s+(?:"?schema_migrations"?)\b/i.test(stmt)) {
        // ensureMigrationsTable() already created schema_migrations prior to running 001_initial_schema.sql
        continue;
      }
      await client.query(stmt);
    }
  }

  async ensureMigrationsTable(client) {
    if (this.dialect === 'hana') {
      const checkSql = `
        SELECT TABLE_NAME FROM SYS.TABLES 
        WHERE TABLE_NAME = 'SCHEMA_MIGRATIONS'
      `;
      try {
        const res = await client.query(checkSql);
        if (res.rows && res.rows.length > 0) return;
      } catch {
        // Table does not exist
      }
      await client.query(`
        CREATE TABLE schema_migrations (
          version NVARCHAR(64) PRIMARY KEY,
          name NVARCHAR(255) NOT NULL,
          checksum NVARCHAR(128) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          execution_time_ms INTEGER NOT NULL
        )
      `);
    } else {
      // PostgreSQL: Check if schema_migrations exists first to avoid unnecessary DDL from unprivileged runtime roles
      try {
        const checkSql = `
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'schema_migrations';
        `;
        const res = await client.query(checkSql);
        if (res.rows && res.rows.length > 0) return;
      } catch {
        // Fall through
      }
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            checksum VARCHAR(128) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            execution_time_ms INTEGER NOT NULL
          );
        `);
      } catch {
        // Unprivileged runtime user cannot run DDL; table existence checked above
      }
    }
  }

  async getAppliedMigrations(client) {
    await this.ensureMigrationsTable(client);
    const sql = this.dialect === 'hana'
      ? 'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC'
      : 'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC;';
    const res = await client.query(sql);
    return res.rows || [];
  }

  getAvailableMigrations() {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }
    const files = fs.readdirSync(this.migrationsDir);
    const upFiles = files.filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql')).sort();

    return upFiles.map((file) => {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) {
        throw new Error(`Invalid migration filename format: ${file}. Expected: <version>_<name>.sql`);
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
        checksum,
        dialect: this.dialect
      };
    });
  }

  async migrateUp(options = {}) {
    const client = await this.adapter.getClient();
    const results = {
      dialect: this.dialect,
      applied: [],
      skipped: [],
      errors: []
    };

    try {
      await this.ensureMigrationsTable(client);
      const applied = await this.getAppliedMigrations(client);
      const appliedMap = new Map(applied.map((m) => [m.version, m]));
      const available = this.getAvailableMigrations();

      for (const migration of available) {
        if (appliedMap.has(migration.version)) {
          const appliedRecord = appliedMap.get(migration.version);
          if (appliedRecord.checksum !== migration.checksum && !options.allowChecksumMismatch) {
            throw new Error(
              `Migration checksum mismatch for version ${migration.version} (${migration.name}) on dialect ${this.dialect}! ` +
              `Recorded checksum: ${appliedRecord.checksum}, Current checksum: ${migration.checksum}. ` +
              `Refusing to proceed without repair.`
            );
          }
          results.skipped.push({
            version: migration.version,
            name: migration.name,
            reason: 'ALREADY_APPLIED'
          });
          continue;
        }

        const startTime = Date.now();
        if (this.dialect === 'postgres') {
          await client.query('BEGIN;');
        }

        try {
          // Execute migration DDL
          await this._executeMigrationSql(client, migration.content, { isUp: true });

          const durationMs = Date.now() - startTime;
          const insertSql = this.dialect === 'hana'
            ? 'INSERT INTO schema_migrations (version, name, checksum, execution_time_ms) VALUES (?, ?, ?, ?)'
            : 'INSERT INTO schema_migrations (version, name, checksum, execution_time_ms) VALUES ($1, $2, $3, $4);';

          await client.query(insertSql, [
            migration.version,
            migration.name,
            migration.checksum,
            durationMs
          ]);

          if (this.dialect === 'postgres') {
            await client.query('COMMIT;');
          }

          results.applied.push({
            version: migration.version,
            name: migration.name,
            durationMs
          });
        } catch (migErr) {
          if (this.dialect === 'postgres') {
            await client.query('ROLLBACK;').catch(() => {});
          }
          results.errors.push({
            version: migration.version,
            name: migration.name,
            error: migErr.message
          });
          throw migErr;
        }
      }

      return results;
    } finally {
      if (typeof client.release === 'function') {
        client.release();
      }
    }
  }

  async migrateDown(targetVersion, options = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      if (!targetVersion) {
        const err = new Error(
          'PRODUCTION_MIGRATION_SAFETY_VIOLATION: Unconstrained full database rollback is strictly prohibited in production. ' +
          'A specific targetVersion must be designated.'
        );
        err.code = 'PRODUCTION_MIGRATION_SAFETY_VIOLATION';
        throw err;
      }
      if (!options.force) {
        const err = new Error(
          'PRODUCTION_MIGRATION_SAFETY_VIOLATION: Rollback in production requires explicit confirmation { force: true }.'
        );
        err.code = 'PRODUCTION_MIGRATION_SAFETY_VIOLATION';
        throw err;
      }
    }

    const client = await this.adapter.getClient();
    const results = {
      dialect: this.dialect,
      rolledBack: [],
      errors: []
    };

    try {
      await this.ensureMigrationsTable(client);
      const applied = await this.getAppliedMigrations(client);
      if (applied.length === 0) {
        return results;
      }

      const available = this.getAvailableMigrations();
      const availableMap = new Map(available.map((m) => [m.version, m]));

      // Roll back in reverse version order
      const sortedApplied = [...applied].sort((a, b) => b.version.localeCompare(a.version));

      for (const record of sortedApplied) {
        if (targetVersion && record.version <= targetVersion) {
          break;
        }

        const migration = availableMap.get(record.version);
        if (!migration || !migration.downContent) {
          throw new Error(`Rollback script not found for version ${record.version} (${record.name}) on dialect ${this.dialect}.`);
        }

        if (this.dialect === 'postgres') {
          await client.query('BEGIN;');
        }

        try {
          await this._executeMigrationSql(client, migration.downContent, { isUp: false });
          const deleteSql = this.dialect === 'hana'
            ? 'DELETE FROM schema_migrations WHERE version = ?'
            : 'DELETE FROM schema_migrations WHERE version = $1;';
          await client.query(deleteSql, [record.version]);

          if (this.dialect === 'postgres') {
            await client.query('COMMIT;');
          }

          results.rolledBack.push({
            version: record.version,
            name: record.name
          });
        } catch (rbErr) {
          if (this.dialect === 'postgres') {
            await client.query('ROLLBACK;').catch(() => {});
          }
          results.errors.push({
            version: record.version,
            error: rbErr.message
          });
          throw rbErr;
        }
      }

      return results;
    } finally {
      if (typeof client.release === 'function') {
        client.release();
      }
    }
  }

  async getStatus() {
    const client = await this.adapter.getClient();
    try {
      const applied = await this.getAppliedMigrations(client);
      const available = this.getAvailableMigrations();
      const appliedMap = new Map(applied.map((m) => [m.version, m]));

      const statusList = available.map((m) => {
        const isApplied = appliedMap.has(m.version);
        const record = appliedMap.get(m.version);
        const checksumMatch = isApplied ? record.checksum === m.checksum : true;
        return {
          version: m.version,
          name: m.name,
          applied: isApplied,
          appliedAt: record ? record.applied_at : null,
          checksumMatch,
          dialect: this.dialect
        };
      });

      return {
        dialect: this.dialect,
        totalAvailable: available.length,
        totalApplied: applied.length,
        isFullyMigrated: available.length > 0 && available.length === applied.length,
        migrations: statusList
      };
    } finally {
      if (typeof client.release === 'function') {
        client.release();
      }
    }
  }
}

export default DialectMigrationRunner;
