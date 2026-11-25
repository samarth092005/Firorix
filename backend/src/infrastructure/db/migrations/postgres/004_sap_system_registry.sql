-- Migration: 004_sap_system_registry.sql
-- Description: SAP System Registry & Connection Diagnostics History for Sprint S2

-- 1. Extend sap_system_profiles with complete enterprise connection and diagnostic attributes
ALTER TABLE sap_system_profiles
    ALTER COLUMN system_id TYPE VARCHAR(64),
    ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(64) NOT NULL DEFAULT 'Private Edition',
    ADD COLUMN IF NOT EXISTS connection_mode VARCHAR(64) NOT NULL DEFAULT 'DIRECT_HTTP',
    ADD COLUMN IF NOT EXISTS base_url VARCHAR(512),
    ADD COLUMN IF NOT EXISTS gateway_catalog_path VARCHAR(255) NOT NULL DEFAULT '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection',
    ADD COLUMN IF NOT EXISTS adt_discovery_path VARCHAR(255) NOT NULL DEFAULT '/sap/bc/adt/discovery',
    ADD COLUMN IF NOT EXISTS auth_type VARCHAR(64) NOT NULL DEFAULT 'BASIC',
    ADD COLUMN IF NOT EXISTS auth_secret_ref VARCHAR(128),
    ADD COLUMN IF NOT EXISTS tls_config JSONB NOT NULL DEFAULT '{"rejectUnauthorized": true}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_read_only BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS connection_state VARCHAR(64) NOT NULL DEFAULT 'NOT_CONFIGURED',
    ADD COLUMN IF NOT EXISTS last_diagnostic_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_successful_connection_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT,
    ADD COLUMN IF NOT EXISTS diagnostics JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Create Audit & Diagnostic History Table
CREATE TABLE IF NOT EXISTS sap_system_diagnostic_history (
    id BIGSERIAL PRIMARY KEY,
    system_profile_id VARCHAR(64) NOT NULL REFERENCES sap_system_profiles(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    connection_mode VARCHAR(64) NOT NULL,
    connection_state VARCHAR(64) NOT NULL,
    gateway_status VARCHAR(64),
    adt_status VARCHAR(64),
    response_time_ms INTEGER,
    diagnostic_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    executed_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sap_diag_sys_created ON sap_system_diagnostic_history(system_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sap_diag_tenant ON sap_system_diagnostic_history(tenant_id);
