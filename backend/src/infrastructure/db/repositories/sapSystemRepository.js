/**
 * Fiorify — SAP System Profile & Diagnostic Repository
 *
 * Implements PostgreSQL persistence for SAP system profiles,
 * connectivity attributes, and immutable diagnostic run history.
 */

import DatabasePool from '../pool.js';

export class SapSystemRepository {
  constructor(pool = null) {
    this.pool = pool;
  }

  async _getPool() {
    return this.pool || (await DatabasePool.getPool());
  }

  /**
   * Retrieves a system profile by ID (scoped by tenant).
   */
  async getById(id, tenantId = 'DEFAULT-TENANT-S21') {
    const pool = await this._getPool();
    const query = `
      SELECT
        id, tenant_id, system_id, client, release, description,
        destination_name, is_active, deployment_type, connection_mode,
        base_url, gateway_catalog_path, adt_discovery_path, auth_type,
        auth_secret_ref, tls_config, is_read_only, connection_state,
        last_diagnostic_at, last_successful_connection_at, last_error,
        diagnostics, created_at, updated_at
      FROM sap_system_profiles
      WHERE id = $1 AND tenant_id = $2;
    `;
    const res = await pool.query(query, [id, tenantId]);
    return res.rows[0] ? this._mapRow(res.rows[0]) : null;
  }

  /**
   * Lists system profiles for a tenant.
   */
  async list(filter = {}, tenantId = 'DEFAULT-TENANT-S21') {
    const pool = await this._getPool();
    let query = `
      SELECT
        id, tenant_id, system_id, client, release, description,
        destination_name, is_active, deployment_type, connection_mode,
        base_url, gateway_catalog_path, adt_discovery_path, auth_type,
        auth_secret_ref, tls_config, is_read_only, connection_state,
        last_diagnostic_at, last_successful_connection_at, last_error,
        diagnostics, created_at, updated_at
      FROM sap_system_profiles
      WHERE tenant_id = $1
    `;
    const params = [tenantId];

    if (filter.isActive !== undefined) {
      params.push(Boolean(filter.isActive));
      query += ` AND is_active = $${params.length}`;
    }
    if (filter.systemId) {
      params.push(filter.systemId);
      query += ` AND system_id = $${params.length}`;
    }

    query += ` ORDER BY created_at ASC;`;
    const res = await pool.query(query, params);
    return res.rows.map((row) => this._mapRow(row));
  }

  /**
   * Creates or updates an SAP system profile.
   * Enforces that plaintext passwords are never saved.
   */
  async upsert(profile, tenantId = 'DEFAULT-TENANT-S21') {
    const pool = await this._getPool();
    const id = profile.id || profile.systemId || `${tenantId}-${profile.system_id || 'S21'}-${profile.client || '200'}`;
    const systemId = profile.system_id || profile.systemId || 'S21';
    const client = profile.client || '200';
    const release = profile.release || 'SAP S/4HANA 2023 Private Edition';
    const description = profile.description || profile.displayName || `SAP S/4HANA ${systemId} (Client ${client})`;
    const destinationName = profile.destination_name || profile.destinationName || systemId;
    const isActive = profile.is_active !== undefined ? profile.is_active : (profile.active !== undefined ? profile.active : true);
    const deploymentType = profile.deployment_type || profile.deploymentType || 'Private Edition';
    const connectionMode = profile.connection_mode || profile.connectionMode || 'DIRECT_HTTP';
    const baseUrl = profile.base_url || profile.baseUrl || null;
    const gatewayCatalogPath = profile.gateway_catalog_path || profile.gatewayCatalogService || '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection';
    const adtDiscoveryPath = profile.adt_discovery_path || profile.adtDiscoveryEndpoint || '/sap/bc/adt/discovery';
    const authType = profile.auth_type || profile.authType || 'BASIC';
    const authSecretRef = profile.auth_secret_ref || profile.authSecretRef || null;
    const tlsConfig = profile.tls_config || profile.tlsConfig || { rejectUnauthorized: true };
    const isReadOnly = true; // Non-negotiable security invariant: always read-only
    const connectionState = profile.connection_state || profile.connectivityStatus || 'CONFIGURED';
    const diagnostics = profile.diagnostics || {};

    const query = `
      INSERT INTO sap_system_profiles (
        id, tenant_id, system_id, client, release, description,
        destination_name, is_active, deployment_type, connection_mode,
        base_url, gateway_catalog_path, adt_discovery_path, auth_type,
        auth_secret_ref, tls_config, is_read_only, connection_state,
        diagnostics, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP
      )
      ON CONFLICT (tenant_id, system_id, client)
      DO UPDATE SET
        release = EXCLUDED.release,
        description = EXCLUDED.description,
        destination_name = EXCLUDED.destination_name,
        is_active = EXCLUDED.is_active,
        deployment_type = EXCLUDED.deployment_type,
        connection_mode = EXCLUDED.connection_mode,
        base_url = COALESCE(EXCLUDED.base_url, sap_system_profiles.base_url),
        gateway_catalog_path = EXCLUDED.gateway_catalog_path,
        adt_discovery_path = EXCLUDED.adt_discovery_path,
        auth_type = EXCLUDED.auth_type,
        auth_secret_ref = COALESCE(EXCLUDED.auth_secret_ref, sap_system_profiles.auth_secret_ref),
        tls_config = EXCLUDED.tls_config,
        is_read_only = TRUE,
        connection_state = EXCLUDED.connection_state,
        diagnostics = EXCLUDED.diagnostics,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const res = await pool.query(query, [
      id, tenantId, systemId, client, release, description,
      destinationName, isActive, deploymentType, connectionMode,
      baseUrl, gatewayCatalogPath, adtDiscoveryPath, authType,
      authSecretRef, JSON.stringify(tlsConfig), isReadOnly,
      connectionState, JSON.stringify(diagnostics)
    ]);

    return this._mapRow(res.rows[0]);
  }

  /**
   * Updates diagnostic outcome on a system profile.
   */
  async updateDiagnostics(id, diagnosticOutcome, tenantId = 'DEFAULT-TENANT-S21') {
    const pool = await this._getPool();
    const isSuccess = Boolean(diagnosticOutcome.success);
    const connectionState = diagnosticOutcome.connectionState || (isSuccess ? 'CONNECTED' : 'UNREACHABLE');
    const lastError = diagnosticOutcome.errorMessage || null;

    const query = `
      UPDATE sap_system_profiles
      SET
        connection_state = $1,
        last_diagnostic_at = CURRENT_TIMESTAMP,
        last_successful_connection_at = CASE WHEN $2 THEN CURRENT_TIMESTAMP ELSE last_successful_connection_at END,
        last_error = $3,
        diagnostics = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND tenant_id = $6
      RETURNING *;
    `;

    const res = await pool.query(query, [
      connectionState,
      isSuccess,
      lastError,
      JSON.stringify(diagnosticOutcome),
      id,
      tenantId
    ]);

    return res.rows[0] ? this._mapRow(res.rows[0]) : null;
  }

  /**
   * Records an immutable entry into the diagnostic history table.
   */
  async recordDiagnosticHistory(entry, tenantId = 'DEFAULT-TENANT-S21') {
    const pool = await this._getPool();
    const query = `
      INSERT INTO sap_system_diagnostic_history (
        system_profile_id, tenant_id, connection_mode, connection_state,
        gateway_status, adt_status, response_time_ms, diagnostic_details,
        error_message, executed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const res = await pool.query(query, [
      entry.systemProfileId,
      tenantId,
      entry.connectionMode || 'DIRECT_HTTP',
      entry.connectionState || 'UNKNOWN',
      entry.gatewayStatus || null,
      entry.adtStatus || null,
      entry.responseTimeMs || 0,
      JSON.stringify(entry.diagnosticDetails || {}),
      entry.errorMessage || null,
      entry.executedBy || 'SYSTEM'
    ]);

    return res.rows[0];
  }

  /**
   * Retrieves diagnostic history for a system profile.
   */
  async getDiagnosticHistory(systemProfileId, tenantId = 'DEFAULT-TENANT-S21', limit = 20) {
    const pool = await this._getPool();
    const query = `
      SELECT
        id, system_profile_id, tenant_id, connection_mode, connection_state,
        gateway_status, adt_status, response_time_ms, diagnostic_details,
        error_message, executed_by, created_at
      FROM sap_system_diagnostic_history
      WHERE system_profile_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT $3;
    `;
    const res = await pool.query(query, [systemProfileId, tenantId, Math.min(limit, 100)]);
    return res.rows;
  }

  _mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      systemId: row.system_id,
      tenantId: row.tenant_id,
      client: row.client,
      release: row.release,
      description: row.description,
      destinationName: row.destination_name,
      isActive: row.is_active,
      deploymentType: row.deployment_type,
      connectionMode: row.connection_mode,
      baseUrl: row.base_url,
      gatewayCatalogPath: row.gateway_catalog_path,
      adtDiscoveryPath: row.adt_discovery_path,
      authType: row.auth_type,
      authSecretRef: row.auth_secret_ref,
      tlsConfig: typeof row.tls_config === 'string' ? JSON.parse(row.tls_config) : row.tls_config,
      isReadOnly: row.is_read_only,
      connectionState: row.connection_state,
      lastDiagnosticAt: row.last_diagnostic_at,
      lastSuccessfulConnectionAt: row.last_successful_connection_at,
      lastError: row.last_error,
      diagnostics: typeof row.diagnostics === 'string' ? JSON.parse(row.diagnostics) : row.diagnostics,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default SapSystemRepository;
