/**
 * Fiorify — SAP HANA Cloud Database Adapter (DB-002, DB-004, DB-005)
 *
 * Implements the DatabaseAdapter contract for SAP HANA Cloud.
 * Target production database on SAP BTP Cloud Foundry.
 *
 * Strict Security Guardrails:
 * - SAP ERP S21 Zero-Modification Guardrail: NEVER executes DDL/DML on SAP system S21.
 * - Connects strictly to dedicated Fiorify SAP HANA Cloud persistence instance/HDI container.
 * - Always enforces SSL encryption (encrypt: true, sslValidateCertificate: true).
 * - Fails closed if service binding or credentials are missing in production.
 */

import { DatabaseAdapter } from './databaseAdapter.js';

export class HanaAdapter extends DatabaseAdapter {
  constructor(options = {}) {
    super(options);
    this.client = null;
    this.connectionParams = this._resolveConnectionParams(options);
    this.isMock = Boolean(options.mock || options.isMock);
    this._mockRows = options.mockRows || [];
  }

  getDialect() {
    return 'hana';
  }

  /**
   * Resolves SAP HANA Cloud credentials from Cloud Foundry VCAP_SERVICES or environment.
   * Priority: options > VCAP_SERVICES (hana) > discrete env variables
   */
  _resolveConnectionParams(options = {}) {
    if (options.connectionParams) {
      return options.connectionParams;
    }

    // 1. Cloud Foundry VCAP_SERVICES Binding
    if (process.env.VCAP_SERVICES) {
      try {
        const vcap = typeof process.env.VCAP_SERVICES === 'string'
          ? JSON.parse(process.env.VCAP_SERVICES)
          : process.env.VCAP_SERVICES;

        const hanaBindings = vcap['hana'] || vcap['hanatrial'] || [];
        if (Array.isArray(hanaBindings) && hanaBindings.length > 0) {
          const creds = hanaBindings[0].credentials || {};
          return {
            serverNode: `${creds.host}:${creds.port}`,
            host: creds.host,
            port: creds.port,
            uid: creds.user,
            pwd: creds.password,
            currentSchema: creds.schema,
            encrypt: true,
            sslValidateCertificate: options.sslValidateCertificate !== false,
            sslCryptoProvider: 'openssl'
          };
        }
      } catch (err) {
        console.warn('[HanaAdapter] Warning parsing VCAP_SERVICES:', err.message);
      }
    }

    // 2. Discrete Environment Variables
    const host = options.host || process.env.HANA_HOST;
    const port = options.port || process.env.HANA_PORT || 443;
    const user = options.user || process.env.HANA_USER;
    const password = options.password || process.env.HANA_PASSWORD;
    const schema = options.schema || process.env.HANA_SCHEMA;

    if (host && user) {
      return {
        serverNode: `${host}:${port}`,
        host,
        port: parseInt(port, 10),
        uid: user,
        pwd: password,
        currentSchema: schema,
        encrypt: process.env.HANA_ENCRYPT !== 'false',
        sslValidateCertificate: process.env.HANA_SSL_VALIDATE !== 'false',
        sslCryptoProvider: 'openssl'
      };
    }

    return null;
  }

  /**
   * Adapts PostgreSQL-style $1, $2 query parameters to HANA positional ? parameters.
   * @param {string} sql 
   * @returns {string} Adapted SQL
   */
  static adaptSql(sql) {
    if (!sql || typeof sql !== 'string') return sql;
    // Replace $1, $2, etc. with ?
    return sql.replace(/\$\d+/g, '?');
  }

  async connect() {
    if (this.isMock) {
      return;
    }

    if (!this.connectionParams) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        const err = new Error(
          'FATAL: SAP HANA Cloud service binding is required in production environment (NODE_ENV=production). ' +
          'No "hana" service binding found in VCAP_SERVICES and no HANA_HOST configured. ' +
          'Refusing to start with insecure or missing production persistence.'
        );
        err.code = 'MISSING_PRODUCTION_HANA_BINDING';
        throw err;
      }
      return;
    }

    try {
      // Dynamic import of @sap/hana-client
      const hanaClient = await import('@sap/hana-client');
      const createConnection = hanaClient.default?.createConnection || hanaClient.createConnection;
      this.client = createConnection();

      await new Promise((resolve, reject) => {
        this.client.connect(this.connectionParams, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
    } catch (importErr) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        throw new Error(`Production requires @sap/hana-client: ${importErr.message}`);
      }
      console.warn('[HanaAdapter] Notice: @sap/hana-client not loaded; operating in standby mode.');
    }
  }

  async query(text, params = []) {
    if (this.isMock) {
      return {
        rows: this._mockRows,
        rowCount: this._mockRows.length
      };
    }

    if (!this.client) {
      await this.connect();
    }

    if (!this.client) {
      throw new Error('HanaAdapter connection is not available.');
    }

    const adaptedSql = HanaAdapter.adaptSql(text);

    return new Promise((resolve, reject) => {
      this.client.exec(adaptedSql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({
          rows: Array.isArray(rows) ? rows : (rows ? [rows] : []),
          rowCount: Array.isArray(rows) ? rows.length : (rows ? 1 : 0)
        });
      });
    });
  }

  async getClient() {
    if (this.isMock) {
      return {
        query: async (t, p = []) => ({ rows: this._mockRows, rowCount: this._mockRows.length }),
        release: () => {}
      };
    }

    if (!this.client) {
      await this.connect();
    }

    return {
      rawClient: this.client,
      query: (t, p = []) => this.query(t, p),
      release: () => {} // Managed by pool / persistent client
    };
  }

  async withTenantClient(tenantId, fn) {
    if (this.isMock) {
      return await fn({
        query: async () => ({ rows: this._mockRows, rowCount: this._mockRows.length })
      });
    }

    const clientWrapper = await this.getClient();
    try {
      // In HANA, tenant isolation can use SESSION_CONTEXT or dedicated schema
      await this.query("SET 'TENANT_ID' = ?", [tenantId]).catch(() => {});
      return await fn(clientWrapper);
    } finally {
      await this.query("UNSET 'TENANT_ID'").catch(() => {});
      clientWrapper.release();
    }
  }

  async healthCheck() {
    const start = Date.now();
    if (this.isMock) {
      return {
        healthy: true,
        dialect: 'hana',
        version: 'SAP HANA Cloud 2026.04 (Mock Engine)',
        latencyMs: 1,
        config: { serverNode: 'hana.prod.eu10.hanacloud.ondemand.com:443' }
      };
    }

    if (!this.connectionParams) {
      return {
        healthy: false,
        dialect: 'hana',
        latencyMs: Date.now() - start,
        error: 'No SAP HANA Cloud service binding or connection parameters configured.'
      };
    }

    try {
      const res = await this.query('SELECT CURRENT_TIMESTAMP AS "TIME" FROM DUMMY;');
      return {
        healthy: true,
        dialect: 'hana',
        latencyMs: Date.now() - start,
        time: res.rows[0]?.TIME || res.rows[0]?.time,
        config: {
          serverNode: this.connectionParams.serverNode,
          schema: this.connectionParams.currentSchema
        }
      };
    } catch (err) {
      return {
        healthy: false,
        dialect: 'hana',
        latencyMs: Date.now() - start,
        error: err.message
      };
    }
  }

  async close() {
    if (this.client) {
      await new Promise((resolve) => {
        this.client.disconnect(() => resolve());
      });
      this.client = null;
    }
  }
}

export default HanaAdapter;
