-- Migration: 001_initial_schema.down.sql
-- Description: Rollback core schema in reverse dependency order

DROP TABLE IF EXISTS generation_activity_events CASCADE;
DROP TABLE IF EXISTS generation_artifacts CASCADE;
DROP TABLE IF EXISTS generation_specifications CASCADE;
DROP TABLE IF EXISTS generation_projects CASCADE;
DROP TABLE IF EXISTS assessment_audit_events CASCADE;
DROP TABLE IF EXISTS assessment_evidence CASCADE;
DROP TABLE IF EXISTS fit_gap_dimensions CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS transaction_master_records CASCADE;
DROP TABLE IF EXISTS transaction_master_snapshots CASCADE;
DROP TABLE IF EXISTS fiori_catalog_tcode_mappings CASCADE;
DROP TABLE IF EXISTS fiori_catalog_services CASCADE;
DROP TABLE IF EXISTS fiori_catalog_apps CASCADE;
DROP TABLE IF EXISTS fiori_catalog_sources CASCADE;
DROP TABLE IF EXISTS sap_system_profiles CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
