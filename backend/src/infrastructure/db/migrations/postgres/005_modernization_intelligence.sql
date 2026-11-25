-- Migration: 005_modernization_intelligence.sql
-- Description: Modernization Intelligence - S3 Canonical Fiori Catalogue & S4 Transaction Technical Objects & S5 Assessment Models

-- 1. Extend fiori_catalog_apps with release-aware metadata, semantic object/action, and technical capabilities
ALTER TABLE fiori_catalog_apps
    ADD COLUMN IF NOT EXISTS semantic_object VARCHAR(64),
    ADD COLUMN IF NOT EXISTS semantic_action VARCHAR(64),
    ADD COLUMN IF NOT EXISTS compatibility_matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS supported_capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS deployment_type VARCHAR(64) NOT NULL DEFAULT 'ON_PREMISE';

CREATE INDEX IF NOT EXISTS idx_fiori_cat_sem_obj ON fiori_catalog_apps(semantic_object);
CREATE INDEX IF NOT EXISTS idx_fiori_cat_sem_act ON fiori_catalog_apps(semantic_action);
CREATE INDEX IF NOT EXISTS idx_fiori_cat_bus_proc ON fiori_catalog_apps(business_process);
CREATE INDEX IF NOT EXISTS idx_fiori_cat_lob ON fiori_catalog_apps(line_of_business);

-- 2. Extend assessments, transaction_master_records and generation_projects column lengths / fields
ALTER TABLE assessments
    ALTER COLUMN system_id TYPE VARCHAR(64),
    ADD COLUMN IF NOT EXISTS readiness_state VARCHAR(64) NOT NULL DEFAULT 'REVIEW',
    ADD COLUMN IF NOT EXISTS scoring_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE transaction_master_records
    ALTER COLUMN system_id TYPE VARCHAR(64);

ALTER TABLE generation_projects
    ALTER COLUMN source_system_id TYPE VARCHAR(64);

-- 3. Create Transaction Discovery Executions Table (Sprint S4)
CREATE TABLE IF NOT EXISTS transaction_discovery_executions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    system_profile_id VARCHAR(64) NOT NULL REFERENCES sap_system_profiles(id) ON DELETE CASCADE,
    execution_scope VARCHAR(64) NOT NULL DEFAULT 'ALL',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    attempted_sources TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    successful_sources TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    discovered_tx_count INTEGER NOT NULL DEFAULT 0,
    discovered_obj_count INTEGER NOT NULL DEFAULT 0,
    duplicate_count INTEGER NOT NULL DEFAULT 0,
    error_summary TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tx_disc_exec_tenant ON transaction_discovery_executions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tx_disc_exec_sys ON transaction_discovery_executions(system_profile_id);
CREATE INDEX IF NOT EXISTS idx_tx_disc_exec_status ON transaction_discovery_executions(status);
CREATE INDEX IF NOT EXISTS idx_tx_disc_exec_created ON transaction_discovery_executions(created_at DESC);

-- 4. Create Transaction Technical Objects Table (Sprint S4)
CREATE TABLE IF NOT EXISTS transaction_technical_objects (
    id BIGSERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    transaction_id INTEGER REFERENCES transaction_master_records(id) ON DELETE CASCADE,
    tcode VARCHAR(32) NOT NULL,
    system_profile_id VARCHAR(64) NOT NULL REFERENCES sap_system_profiles(id) ON DELETE CASCADE,
    object_type VARCHAR(64) NOT NULL,
    object_name VARCHAR(128) NOT NULL,
    relationship_type VARCHAR(64) NOT NULL DEFAULT 'DEPENDENCY',
    provenance VARCHAR(64) NOT NULL DEFAULT 'DISCOVERY_ENGINE',
    confidence NUMERIC(3,2) NOT NULL DEFAULT 1.00,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tx_tech_obj UNIQUE (tenant_id, system_profile_id, tcode, object_type, object_name)
);

CREATE INDEX IF NOT EXISTS idx_tx_tech_obj_tcode ON transaction_technical_objects(tcode);
CREATE INDEX IF NOT EXISTS idx_tx_tech_obj_type ON transaction_technical_objects(object_type);
CREATE INDEX IF NOT EXISTS idx_tx_tech_obj_name ON transaction_technical_objects(object_name);
CREATE INDEX IF NOT EXISTS idx_tx_tech_obj_tenant ON transaction_technical_objects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tx_tech_obj_sys ON transaction_technical_objects(system_profile_id);
