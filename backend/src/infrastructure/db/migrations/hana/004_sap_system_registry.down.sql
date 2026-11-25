-- Migration: 004_sap_system_registry.down.sql (SAP HANA Cloud Dialect)

DROP TABLE sap_system_diagnostic_history;

ALTER TABLE sap_system_profiles DROP (
    deployment_type,
    connection_mode,
    base_url,
    gateway_catalog_path,
    adt_discovery_path,
    auth_type,
    auth_secret_ref,
    tls_config,
    is_read_only,
    connection_state,
    last_diagnostic_at,
    last_successful_connection_at,
    last_error,
    diagnostics
);
