# FioriX — Target Database Architecture (Phase S1 Corrected & Complete)

**Document Version:** 2.0  
**Phase:** S1 — Persistence Foundation  
**Scope:** PostgreSQL relational schema design, table definitions, foreign keys, constraints, indexing strategies, repository abstractions, and recommendation safety rules.  
**Target Engine:** PostgreSQL 15+ (tested against PostgreSQL 18.6 MSVC x64)  
**Date:** November 2026

---

## 1. Architectural Principles for Phase S1 Persistence

1. **ACID Durability:** Relational transactions guarantee atomicity across multi-entity writes.
2. **Strict Referential Integrity:** Foreign keys enforce valid relationships between systems, assessments, projects, and audit events.
3. **Tenant Ownership:** All customer-owned entities (`sap_system_profiles`, `transaction_master_snapshots`, `transaction_master_records`, `assessments`, `fit_gap_dimensions`, `assessment_evidence`, `assessment_audit_events`, `generation_projects`, `generation_specifications`, `generation_artifacts`, `generation_activity_events`) require a non-nullable `tenant_id` foreign key.
4. **Global Reusability for SAP Reference Data:** The canonical SAP Fiori application catalogue (`fiori_catalog_sources`, `fiori_catalog_apps`, `fiori_catalog_services`, `fiori_catalog_tcode_mappings`) is globally shared across all tenants while preserving exact import provenance, release, and edition metadata.
5. **No CAP / No Heavy ORM:** Native `pg` (node-postgres) connection pool with parameterized SQL statements. No Prisma, TypeORM, or CAP.
6. **Recommendation Safety Invariants:** An empty candidate list must **never** automatically mean `BUILD`. Only a complete, verified discovery result with explicit validation can make a project eligible for `BUILD`.

---

## 2. Complete Relational Schema DDL Specifications

```sql
-- ============================================================================
-- EXTENSIONS & CORE TENANCY
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sap_system_profiles (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    system_id VARCHAR(16) NOT NULL,            -- e.g. 'S21'
    client VARCHAR(8) NOT NULL,               -- e.g. '200'
    release VARCHAR(64) NOT NULL,              -- e.g. 'SAP S/4HANA 2023 On-Premise'
    description VARCHAR(255),
    destination_name VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_system_client UNIQUE (tenant_id, system_id, client)
);
CREATE INDEX IF NOT EXISTS idx_sap_system_tenant ON sap_system_profiles(tenant_id);

-- ============================================================================
-- CANONICAL FIORI CATALOGUE (GLOBAL REFERENCE DATA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS fiori_catalog_sources (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(128) NOT NULL,
    source_type VARCHAR(64) NOT NULL,         -- 'OFFICIAL_FAL_EXPORT', 'OFFICIAL_CATALOGUE_LIVE'
    source_version VARCHAR(128) NOT NULL,
    target_release VARCHAR(64) NOT NULL DEFAULT 'SAP S/4HANA 2023 On-Premise',
    record_count INTEGER NOT NULL DEFAULT 0,
    content_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    summary JSONB DEFAULT '{}'::jsonb,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fiori_catalog_apps (
    app_id VARCHAR(64) PRIMARY KEY,           -- e.g. 'F1612', 'F0842A'
    app_name VARCHAR(255) NOT NULL,
    description TEXT,
    app_type VARCHAR(64) NOT NULL,
    ui_technology VARCHAR(64) NOT NULL,
    business_process TEXT,
    line_of_business TEXT,
    product_version VARCHAR(128),
    software_component VARCHAR(128),
    business_role TEXT,
    business_catalog TEXT,
    technical_catalog TEXT,
    sapui5_component VARCHAR(255),
    bsp_application_url VARCHAR(512),
    documentation_url VARCHAR(512),
    provenance VARCHAR(64) NOT NULL DEFAULT 'OFFICIAL_CATALOGUE_LIVE',
    retrieval_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_fiori_cat_app_type ON fiori_catalog_apps(app_type);
CREATE INDEX IF NOT EXISTS idx_fiori_cat_ui_tech ON fiori_catalog_apps(ui_technology);
CREATE INDEX IF NOT EXISTS idx_fiori_cat_app_name_trgm ON fiori_catalog_apps USING gin (app_name gin_trgm_ops);

CREATE TABLE IF NOT EXISTS fiori_catalog_services (
    id SERIAL PRIMARY KEY,
    app_id VARCHAR(64) NOT NULL REFERENCES fiori_catalog_apps(app_id) ON DELETE CASCADE,
    service_name VARCHAR(128) NOT NULL,
    service_type VARCHAR(32) NOT NULL DEFAULT 'ODATA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fiori_service UNIQUE (app_id, service_name)
);
CREATE INDEX IF NOT EXISTS idx_fiori_services_app_id ON fiori_catalog_services(app_id);

CREATE TABLE IF NOT EXISTS fiori_catalog_tcode_mappings (
    id SERIAL PRIMARY KEY,
    app_id VARCHAR(64) NOT NULL REFERENCES fiori_catalog_apps(app_id) ON DELETE CASCADE,
    tcode VARCHAR(32) NOT NULL,
    is_leading BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_fiori_tcode UNIQUE (app_id, tcode)
);
CREATE INDEX IF NOT EXISTS idx_fiori_mappings_tcode ON fiori_catalog_tcode_mappings(tcode);

-- ============================================================================
-- TRANSACTION MASTER INDEX (TENANT / SYSTEM-SCOPED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transaction_master_snapshots (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    system_profile_id VARCHAR(64) NOT NULL REFERENCES sap_system_profiles(id) ON DELETE CASCADE,
    snapshot_version VARCHAR(64) NOT NULL,
    provenance VARCHAR(64) NOT NULL DEFAULT 'AUTHORITATIVE_DDIC_SNAPSHOT',
    source_tables TEXT[],
    total_transactions INTEGER NOT NULL DEFAULT 0,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transaction_master_records (
    id SERIAL PRIMARY KEY,
    snapshot_id INTEGER NOT NULL REFERENCES transaction_master_snapshots(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    system_profile_id VARCHAR(64) NOT NULL REFERENCES sap_system_profiles(id) ON DELETE CASCADE,
    tcode VARCHAR(32) NOT NULL,
    description VARCHAR(255),
    program VARCHAR(128),
    screen_number VARCHAR(16),
    package_name VARCHAR(64),
    original_system VARCHAR(32),
    software_component VARCHAR(64),
    classification VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    system_id VARCHAR(16) NOT NULL,
    client VARCHAR(8) NOT NULL,
    language VARCHAR(8) NOT NULL DEFAULT 'EN',
    complexity VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    has_user_exits BOOLEAN NOT NULL DEFAULT FALSE,
    badi_count INTEGER NOT NULL DEFAULT 0,
    screen_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_system_tcode UNIQUE (tenant_id, system_profile_id, tcode)
);
CREATE INDEX IF NOT EXISTS idx_tx_master_tcode ON transaction_master_records(tcode);
CREATE INDEX IF NOT EXISTS idx_tx_master_tenant ON transaction_master_records(tenant_id);

-- ============================================================================
-- ASSESSMENTS & FIT-GAP SUBSYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(64) PRIMARY KEY,               -- e.g. 'ASM-LIVE-F53'
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    request_id VARCHAR(64),
    transaction_code VARCHAR(32) NOT NULL,
    description VARCHAR(255),
    business_area VARCHAR(128),
    system_profile_id VARCHAR(64) REFERENCES sap_system_profiles(id),
    system_id VARCHAR(16),
    client VARCHAR(8),
    target_release VARCHAR(64) NOT NULL DEFAULT 'SAP S/4HANA 2023 On-Premise',
    candidate_app_id VARCHAR(64) REFERENCES fiori_catalog_apps(app_id),
    candidate_app_name VARCHAR(255),
    match_score NUMERIC(5,2),
    recommendation_action VARCHAR(32) NOT NULL,   -- 'ADOPT', 'EXTEND', 'BUILD', 'REPLACE', 'UNVERIFIED', 'MANUAL_REVIEW'
    recommendation_confidence VARCHAR(32) NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW', 'BLOCKED'
    recommendation_justification TEXT,
    verification_status VARCHAR(64) NOT NULL DEFAULT 'VERIFIED_COMPLETE', -- Safety status
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED'
    fit_gap_score NUMERIC(5,2),
    score_coverage NUMERIC(5,2),
    gaps_count INTEGER NOT NULL DEFAULT 0,
    evidence_confidence VARCHAR(32) NOT NULL DEFAULT 'MEDIUM',
    provenance VARCHAR(64) NOT NULL DEFAULT 'ASSESSMENT_ENGINE',
    created_by VARCHAR(128) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_assessments_tenant ON assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assessments_tcode ON assessments(transaction_code);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(lifecycle_status);

CREATE TABLE IF NOT EXISTS fit_gap_dimensions (
    id SERIAL PRIMARY KEY,
    assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    dimension_name VARCHAR(64) NOT NULL,      -- 'functionalFit', 'uiFit', etc.
    score NUMERIC(5,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'EVALUATED',
    findings TEXT,
    gaps JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assessment_dimension UNIQUE (assessment_id, dimension_name)
);
CREATE INDEX IF NOT EXISTS idx_dimensions_assessment_id ON fit_gap_dimensions(assessment_id);

CREATE TABLE IF NOT EXISTS assessment_evidence (
    id SERIAL PRIMARY KEY,
    assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,            -- 'SCREENS', 'DATA_MODEL', 'EXITS', etc.
    evidence_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence VARCHAR(32) NOT NULL DEFAULT 'HIGH',
    source VARCHAR(64) NOT NULL DEFAULT 'DDIC',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_evidence_assessment_id ON assessment_evidence(assessment_id);

CREATE TABLE IF NOT EXISTS assessment_audit_events (
    id SERIAL PRIMARY KEY,
    assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    event_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(128) NOT NULL,
    action VARCHAR(64) NOT NULL,
    details TEXT,
    previous_hash VARCHAR(128) NOT NULL,
    integrity_hash VARCHAR(128) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_assessment_audit_id ON assessment_audit_events(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_audit_time ON assessment_audit_events(timestamp);

-- ============================================================================
-- GENERATION STUDIO PROJECTS & SPECIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS generation_projects (
    project_id VARCHAR(64) PRIMARY KEY,       -- e.g. 'GEN-STANDALONE-AA785D'
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    origin VARCHAR(32) NOT NULL DEFAULT 'STANDALONE', -- 'ASSESSMENT_HANDOFF', 'STANDALONE'
    source_assessment_id VARCHAR(64) REFERENCES assessments(id) ON DELETE SET NULL,
    source_transaction_code VARCHAR(32),
    source_system_id VARCHAR(16),
    source_client VARCHAR(8),
    target_product VARCHAR(64) NOT NULL DEFAULT 'SAP S/4HANA',
    target_release VARCHAR(64) NOT NULL DEFAULT 'SAP S/4HANA 2023 On-Premise',
    target_deployment_model VARCHAR(32) NOT NULL DEFAULT 'ON_PREMISE',
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'ACTIVE', 'ARCHIVED'
    current_phase VARCHAR(64) NOT NULL DEFAULT 'PHASE_1_WORKSPACE',
    specification_version INTEGER NOT NULL DEFAULT 1,
    created_by VARCHAR(128) NOT NULL DEFAULT 'Lead SAP Architect',
    creator_id VARCHAR(64) NOT NULL DEFAULT 'USR-CONS-01',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gen_projects_tenant ON generation_projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gen_projects_assessment ON generation_projects(source_assessment_id);

CREATE TABLE IF NOT EXISTS generation_specifications (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES generation_projects(project_id) ON DELETE CASCADE,
    spec_type VARCHAR(64) NOT NULL,           -- 'REQUIREMENTS', 'DATA_MODEL', 'ARCHITECTURE'
    spec_version INTEGER NOT NULL DEFAULT 1,
    spec_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_spec_type UNIQUE (project_id, spec_type)
);
CREATE INDEX IF NOT EXISTS idx_gen_specs_project ON generation_specifications(project_id);

CREATE TABLE IF NOT EXISTS generation_artifacts (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES generation_projects(project_id) ON DELETE CASCADE,
    artifact_name VARCHAR(255) NOT NULL,
    artifact_type VARCHAR(64) NOT NULL,       -- 'ABAP_CDS', 'ABAP_BEHAVIOR', 'UI5_VIEW', 'MANIFEST'
    storage_driver VARCHAR(32) NOT NULL DEFAULT 'LOCAL_FS', -- 'LOCAL_FS', 'S3', 'BTP_OBJECT_STORE'
    storage_path VARCHAR(512) NOT NULL,
    content_hash VARCHAR(128) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gen_artifacts_project ON generation_artifacts(project_id);

CREATE TABLE IF NOT EXISTS generation_activity_events (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES generation_projects(project_id) ON DELETE CASCADE,
    event_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    author VARCHAR(128) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_status VARCHAR(32),
    new_status VARCHAR(32)
);
CREATE INDEX IF NOT EXISTS idx_gen_activity_project ON generation_activity_events(project_id);
```

---

## 3. Recommendation Safety Rules & Guardrails

An empty candidate list must **never** automatically mean `BUILD`. The database schema and domain services enforce the following explicit taxonomy:

| Scenario / Condition | Recommendation Action | Confidence | Verification Status | BUILD Eligible? |
|---|---|---|---|---|
| **Verified Discovery & No Matching App** | `BUILD` | `HIGH` | `NO_MATCH_VERIFIED` | **YES** (Only after verified completeness >= 85%) |
| **Catalogue Service Down / Unreachable** | `MANUAL_REVIEW` | `BLOCKED` | `CATALOGUE_UNAVAILABLE` | **NO** |
| **Catalogue Incomplete / Metadata Missing** | `MANUAL_REVIEW` | `LOW` | `CATALOGUE_INCOMPLETE` | **NO** |
| **SAP System Network Failure / Timeout** | `MANUAL_REVIEW` | `BLOCKED` | `SAP_CONNECTIVITY_FAILED` | **NO** |
| **SAP ICF / RFC Authorization 403 Blocked** | `MANUAL_REVIEW` | `BLOCKED` | `SAP_AUTHORIZATION_BLOCKED` | **NO** |
| **T-Code Not Verified in DDIC Snapshot** | `UNVERIFIED` | `LOW` | `TRANSACTION_UNVERIFIED` | **NO** |
| **Standard App Exists with Gaps** | `EXTEND` or `REPLACE` | `HIGH` | `CANDIDATE_WITH_GAPS` | **CONDITIONAL** (Gated on approved exception) |

Only records where `recommendation_action = 'BUILD'`, `verification_status = 'NO_MATCH_VERIFIED'`, and `lifecycle_status = 'APPROVED'` may be handed off to Generation Studio.
