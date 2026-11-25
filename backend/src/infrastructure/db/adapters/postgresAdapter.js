/**
 * Fiorify — PostgreSQL Database Adapter (DB-002, DB-003)
 *
 * Implements the DatabaseAdapter contract for PostgreSQL.
 * Used for local development, CI testing, and embedded fallback environments.
 */

import { DatabaseAdapter } from './databaseAdapter.js';
import DatabasePool from '../pool.js';

export class PostgresAdapter extends DatabaseAdapter {
  constructor(options = {}) {
    super(options);
    this.pool = options.pool || DatabasePool;
  }

  getDialect() {
    return 'postgres';
  }

  async connect() {
    await this.pool.getPool(this.options);
  }

  async query(text, params = []) {
    const res = await this.pool.query(text, params);
    return {
      rows: res.rows || [],
      rowCount: res.rowCount !== undefined ? res.rowCount : (res.rows ? res.rows.length : 0)
    };
  }

  async getClient() {
    const client = await this.pool.getClient();
    return {
      rawClient: client,
      query: (t, p = []) => client.query(t, p),
      release: () => client.release()
    };
  }

  async withTenantClient(tenantId, fn) {
    return await this.pool.withTenantClient(tenantId, async (client) => {
      const wrappedClient = {
        rawClient: client,
        query: (t, p = []) => client.query(t, p)
      };
      return await fn(wrappedClient);
    });
  }

  async healthCheck() {
    const start = Date.now();
    try {
      const hc = await this.pool.healthCheck();
      const latencyMs = Date.now() - start;
      return {
        healthy: hc.healthy,
        dialect: 'postgres',
        version: hc.version,
        latencyMs,
        config: hc.config,
        error: hc.error
      };
    } catch (err) {
      return {
        healthy: false,
        dialect: 'postgres',
        latencyMs: Date.now() - start,
        error: err.message
      };
    }
  }

  async close() {
    await this.pool.close();
  }
}

export default PostgresAdapter;
