import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';

const { Pool } = pg;

let globalPool = null;
let embeddedInstance = null;
let activeConfig = null;

export class DatabasePool {
  static async getPool(customConfig = {}) {
    if (globalPool) {
      return globalPool;
    }

    const connectionString = customConfig.connectionString || process.env.DATABASE_URL;
    let config = {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ...customConfig
    };

    if (connectionString) {
      config.connectionString = connectionString;
    } else {
      config.host = customConfig.host || process.env.PGHOST || '127.0.0.1';
      config.port = customConfig.port || (process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : (process.env.FIORIX_ALLOW_EMBEDDED_PG === 'true' ? 54334 : 5432));
      config.user = customConfig.user || process.env.PGUSER || 'postgres';
      config.password = customConfig.password || process.env.PGPASSWORD || 'password';
      config.database = customConfig.database || process.env.PGDATABASE || (process.env.FIORIX_ALLOW_EMBEDDED_PG === 'true' ? 'postgres' : 'fiorix');
    }

    // Attempt direct connection to configured PostgreSQL
    let pool = new Pool(config);
    try {
      const client = await pool.connect();
      await client.query('SELECT 1;');
      client.release();
      globalPool = pool;
      activeConfig = config;
      return globalPool;
    } catch (directConnErr) {
      // If direct connection failed and local embedded auto-start is permitted (e.g. tests or local dev)
      if (process.env.FIORIX_ALLOW_EMBEDDED_PG === 'true' || process.env.NODE_ENV === 'test') {
        pool.end().catch(() => {});
        return await DatabasePool.initEmbedded(customConfig);
      }
      throw directConnErr;
    }
  }

  static async initEmbedded(options = {}) {
    if (globalPool) return globalPool;

    try {
      const { default: EmbeddedPostgres } = await import('embedded-postgres');
      const port = options.port || (process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 54334);
      const dataDir = path.resolve(process.cwd(), 'data', 'db');
      
      embeddedInstance = new EmbeddedPostgres({
        port,
        user: options.user || 'postgres',
        password: options.password || 'password',
        database: 'postgres',
        persistent: true
      });

      // First check if already listening on port
      const pingPool = new Pool({
        host: '127.0.0.1',
        port,
        user: options.user || 'postgres',
        password: options.password || 'password',
        database: 'postgres',
        connectionTimeoutMillis: 1500
      });
      let alreadyRunning = false;
      try {
        const cl = await pingPool.connect();
        await cl.query('SELECT 1;');
        cl.release();
        alreadyRunning = true;
      } catch {
        alreadyRunning = false;
      } finally {
        await pingPool.end().catch(() => {});
      }

      if (!alreadyRunning) {
        const pidPath = path.join(dataDir, 'postmaster.pid');
        if (fs.existsSync(pidPath)) {
          try { fs.unlinkSync(pidPath); } catch {}
        }
        if (!fs.existsSync(dataDir)) {
          await embeddedInstance.initialise();
        }
        await embeddedInstance.start();
      }

      const config = {
        host: '127.0.0.1',
        port,
        user: options.user || 'postgres',
        password: options.password || 'password',
        database: 'postgres',
        max: 10
      };

      globalPool = new Pool(config);
      activeConfig = config;

      // Ensure target database exists
      const targetDb = options.database || process.env.PGDATABASE || 'fiorix';
      if (targetDb !== 'postgres') {
        const adminClient = await globalPool.connect();
        const checkDb = await adminClient.query(
          'SELECT 1 FROM pg_database WHERE datname = $1;',
          [targetDb]
        );
        if (checkDb.rowCount === 0) {
          await adminClient.query(`CREATE DATABASE ${targetDb};`);
        }
        adminClient.release();
        await globalPool.end();

        config.database = targetDb;
        globalPool = new Pool(config);
        activeConfig = config;
      }

      return globalPool;
    } catch (err) {
      throw new Error(`Failed to initialize embedded PostgreSQL: ${err.message}`);
    }
  }

  static async query(text, params = []) {
    const pool = await DatabasePool.getPool();
    return await pool.query(text, params);
  }

  static async getClient() {
    const pool = await DatabasePool.getPool();
    return await pool.connect();
  }

  /**
   * Executes a callback within an isolated tenant session context, guaranteeing DISCARD ALL
   * cleanup upon release so no session context leaks across tenants in the pool.
   */
  static async withTenantClient(tenantId, fn) {
    const pool = await DatabasePool.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN;');
      await client.query('SET LOCAL app.current_tenant = $1;', [tenantId]);
      const result = await fn(client);
      await client.query('COMMIT;');
      return result;
    } catch (err) {
      await client.query('ROLLBACK;').catch(() => {});
      throw err;
    } finally {
      await client.query('DISCARD ALL;').catch(() => {});
      client.release();
    }
  }

  static async healthCheck() {
    try {
      const pool = await DatabasePool.getPool();
      const res = await pool.query('SELECT version(), CURRENT_TIMESTAMP as time;');
      return {
        healthy: true,
        version: res.rows[0].version,
        timestamp: res.rows[0].time,
        config: {
          host: activeConfig?.host || 'remote',
          port: activeConfig?.port,
          database: activeConfig?.database
        }
      };
    } catch (err) {
      return {
        healthy: false,
        error: err.message
      };
    }
  }

  static async close() {
    if (globalPool) {
      await globalPool.end();
      globalPool = null;
    }
    if (embeddedInstance) {
      try {
        await embeddedInstance.stop();
      } catch (e) {
        // ignore shutdown error
      }
      embeddedInstance = null;
    }
    activeConfig = null;
  }
}

export default DatabasePool;
