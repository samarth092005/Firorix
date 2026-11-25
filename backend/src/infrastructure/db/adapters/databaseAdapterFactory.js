/**
 * Fiorify — Database Adapter Factory (DB-002, DB-004, DB-005)
 *
 * Resolves the appropriate DatabaseAdapter based on environment configuration:
 * - Local / Testing: PostgresAdapter (local PostgreSQL or embedded-postgres fallback)
 * - Production on SAP BTP: HanaAdapter (SAP HANA Cloud via VCAP_SERVICES)
 *
 * Fail-Closed Production Invariant:
 * In production (NODE_ENV=production), PostgreSQL is strictly rejected as the primary database.
 * SAP HANA Cloud binding must be present; otherwise startup is aborted.
 */

import { PostgresAdapter } from './postgresAdapter.js';
import { HanaAdapter } from './hanaAdapter.js';

export class DatabaseAdapterFactory {
  /**
   * Resolves and instantiates the canonical database adapter.
   * @param {object} options
   * @returns {DatabaseAdapter}
   */
  static createAdapter(options = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    const explicitDialect = (
      options.dialect ||
      process.env.FIORIFY_DB_DIALECT ||
      process.env.FIORIFY_DATABASE_ADAPTER ||
      process.env.FIORIFY_PERSISTENCE ||
      ''
    ).toLowerCase();

    const allowPostgresProd = Boolean(
      options.allowPostgresInProduction ||
      process.env.FIORIFY_ALLOW_POSTGRES_IN_PRODUCTION === 'true' ||
      process.env.FIORIFY_STAGING_POSTGRES_OPT_IN === 'true'
    );

    // Production Invariant Check
    if (isProduction) {
      if (explicitDialect === 'postgres') {
        if (!allowPostgresProd) {
          const err = new Error(
            'FATAL CONFIGURATION ERROR: PostgreSQL is strictly forbidden as production persistence in Fiorify without explicit opt-in. ' +
            'Set FIORIFY_ALLOW_POSTGRES_IN_PRODUCTION=true to allow PostgreSQL staging mode. ' +
            'Refusing to start with invalid database configuration.'
          );
          err.code = 'FATAL_PRODUCTION_DATABASE_MISMATCH';
          throw err;
        }
        return new PostgresAdapter(options);
      }

      // In production, default dialect is SAP HANA Cloud
      return new HanaAdapter(options);
    }

    // Non-production: allow explicit HANA selection for testing, otherwise default to PostgreSQL
    if (explicitDialect === 'hana') {
      return new HanaAdapter(options);
    }

    return new PostgresAdapter(options);
  }

  /**
   * Validates production readiness for persistence configuration.
   * Fails closed if production invariants are violated.
   */
  static assertProductionReadiness(options = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      return { ready: true, environment: 'development', dialect: 'postgres' };
    }

    const allowPostgresProd = Boolean(
      options.allowPostgresInProduction ||
      process.env.FIORIFY_ALLOW_POSTGRES_IN_PRODUCTION === 'true' ||
      process.env.FIORIFY_STAGING_POSTGRES_OPT_IN === 'true'
    );
    const explicitDialect = (
      options.dialect ||
      process.env.FIORIFY_DB_DIALECT ||
      process.env.FIORIFY_DATABASE_ADAPTER ||
      process.env.FIORIFY_PERSISTENCE ||
      ''
    ).toLowerCase();

    if (explicitDialect === 'postgres' && allowPostgresProd) {
      if (!process.env.DATABASE_URL && process.env.VCAP_SERVICES) {
        try {
          const vcap = typeof process.env.VCAP_SERVICES === 'string'
            ? JSON.parse(process.env.VCAP_SERVICES)
            : process.env.VCAP_SERVICES;
          const userProvided = vcap['user-provided'] || [];
          const pgService = userProvided.find(s =>
            s.name?.toLowerCase().includes('postgres') ||
            s.name?.toLowerCase().includes('fiorify') ||
            s.credentials?.DATABASE_URL
          );
          if (pgService?.credentials?.DATABASE_URL) {
            process.env.DATABASE_URL = pgService.credentials.DATABASE_URL;
          }
        } catch {}
      }
      const hasPostgresConfig = Boolean(process.env.DATABASE_URL || process.env.PGHOST);
      if (!hasPostgresConfig && !options.mock) {
        const err = new Error(
          'Production persistence validation failed: PostgreSQL opt-in enabled but no DATABASE_URL or PGHOST found.'
        );
        err.code = 'MISSING_PRODUCTION_POSTGRES_CONFIG';
        throw err;
      }
      return {
        ready: true,
        environment: 'production',
        dialect: 'postgres',
        bindingConfigured: hasPostgresConfig
      };
    }

    const adapter = DatabaseAdapterFactory.createAdapter(options);
    if (adapter.getDialect() !== 'hana') {
      const err = new Error('Production persistence validation failed: Active database adapter is not SAP HANA Cloud.');
      err.code = 'PRODUCTION_PERSISTENCE_NOT_HANA';
      throw err;
    }

    if (!adapter.connectionParams && !options.mock) {
      const err = new Error(
        'Production persistence validation failed: No SAP HANA Cloud service binding found in VCAP_SERVICES.'
      );
      err.code = 'MISSING_PRODUCTION_HANA_BINDING';
      throw err;
    }

    return {
      ready: true,
      environment: 'production',
      dialect: 'hana',
      bindingConfigured: Boolean(adapter.connectionParams)
    };
  }
}

export const defaultDatabaseAdapter = DatabaseAdapterFactory.createAdapter();
export default DatabaseAdapterFactory;
