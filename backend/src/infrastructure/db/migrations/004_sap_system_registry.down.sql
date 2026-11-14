-- Down Migration: 004_sap_system_registry.down.sql

DROP TABLE IF EXISTS sap_system_diagnostic_history;

ALTER TABLE sap_system_profiles
    DROP COLUMN IF EXISTS deployment_type,
    DROP COLUMN IF EXISTS connection_mode,
    DROP COLUMN IF EXISTS base_url,
    DROP COLUMN IF EXISTS gateway_catalog_path,
    DROP COLUMN IF EXISTS adt_discovery_path,
    DROP COLUMN IF EXISTS auth_type,
    DROP COLUMN IF EXISTS auth_secret_ref,
    DROP COLUMN IF EXISTS tls_config,
    DROP COLUMN IF EXISTS is_read_only,
    DROP COLUMN IF EXISTS connection_state,
    DROP COLUMN IF EXISTS last_diagnostic_at,
    DROP COLUMN IF EXISTS last_successful_connection_at,
    DROP COLUMN IF EXISTS last_error,
    DROP COLUMN IF EXISTS diagnostics;
