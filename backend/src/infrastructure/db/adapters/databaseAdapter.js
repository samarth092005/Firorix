/**
 * Fiorify — Database Adapter Interface (DB-002)
 *
 * Defines the vendor-neutral database contract implemented by PostgresAdapter and HanaAdapter.
 * Enforces unified parameter binding, tenant isolation, health check semantics, and connection lifecycle.
 */

export class DatabaseAdapter {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Returns the canonical database dialect identifier: 'postgres' | 'hana'
   * @returns {string}
   */
  getDialect() {
    throw new Error('getDialect() must be implemented by concrete database adapter.');
  }

  /**
   * Initializes connections or connection pool to the underlying database engine.
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('connect() must be implemented by concrete database adapter.');
  }

  /**
   * Executes a parameterized query against the database engine.
   * Parameter notation:
   * - PostgreSQL: $1, $2, ...
   * - SAP HANA Cloud: ?, ?, ... or named parameters
   * Concrete adapters adapt or execute accordingly.
   *
   * @param {string} text - SQL statement
   * @param {any[]} params - Parameter values
   * @returns {Promise<{ rows: any[], rowCount: number }>}
   */
  async query(text, params = []) {
    throw new Error('query() must be implemented by concrete database adapter.');
  }

  /**
   * Acquires a dedicated client/connection from the pool.
   * Must be released via client.release().
   * @returns {Promise<object>} Client instance
   */
  async getClient() {
    throw new Error('getClient() must be implemented by concrete database adapter.');
  }

  /**
   * Executes an operation inside an isolated tenant session context.
   * Enforces session reset (e.g. DISCARD ALL in Postgres, or connection reset in HANA) upon completion.
   *
   * @param {string} tenantId
   * @param {(client: object) => Promise<any>} fn
   * @returns {Promise<any>}
   */
  async withTenantClient(tenantId, fn) {
    throw new Error('withTenantClient() must be implemented by concrete database adapter.');
  }

  /**
   * Verifies database connectivity and returns engine metadata, latency, and status.
   * @returns {Promise<{ healthy: boolean, version?: string, latencyMs?: number, dialect: string, error?: string }>}
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by concrete database adapter.');
  }

  /**
   * Closes all active connections and shuts down the connection pool cleanly.
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('close() must be implemented by concrete database adapter.');
  }
}

export default DatabaseAdapter;
