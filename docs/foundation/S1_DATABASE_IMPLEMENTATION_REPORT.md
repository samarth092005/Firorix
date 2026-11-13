# Fiorify — PHASE S1 DATABASE IMPLEMENTATION REPORT
**Persistence Foundation: PostgreSQL 15+ Architecture & Repositories**

**Date:** 2026-11-11  
**Target Database:** PostgreSQL 15+ (Verified with PostgreSQL 18.6 MSVC x64 binary)  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Executive Summary

Phase S1 establishes a durable, transactional relational persistence layer for Fiorify, replacing the legacy file-based JSON stores (`data/assessments.json`, `data/fiori_app_catalog_cache.json`, `data/transaction_master.json`, and `data/generation/projects/`). 

All database operations are implemented using native Node.js (`pg` / `node-postgres`) connection pooling with parameterized SQL, ensuring strict prevention of SQL injection, full ACID compliance, and zero dependency on heavy ORMs (no Prisma, TypeORM, or SAP CAP).

---

## 2. PostgreSQL Connection Pooling Architecture

### 2.1 Connection Pool Specification
Implemented in `backend/src/infrastructure/db/pool.js`:
- **Driver:** `pg.Pool` (node-postgres v8.12.0)
- **Pool Sizing:**
  - `max`: 20 connections max per Node.js process
  - `min`: 2 idle connections kept warm
  - `idleTimeoutMillis`: 30,000 ms
  - `connectionTimeoutMillis`: 5,000 ms
- **Health Checks & Keepalive:** Configurable TLS/SSL parameters for production cloud environments (AWS RDS, Google Cloud SQL, Azure Database for PostgreSQL, or BTP Hyperledger/PostgreSQL hyperscalers) with `rejectUnauthorized` toggles.
- **Local Engine & Test Runner:** Built-in adapter supporting both external PostgreSQL connections via `DATABASE_URL` / standard `PG*` environment variables and zero-install native PostgreSQL binaries via `embedded-postgres` (PostgreSQL 18.6 MSVC 64-bit on Windows) for autonomous, fully isolated testing without Docker dependencies.

---

## 3. Implemented Database Schema (DDL v001)

Defined in `backend/src/infrastructure/db/migrations/001_initial_schema.sql`:

### 3.1 Multi-Tenant & Infrastructure Domain
- **`tenants`**: Tenant isolation foundation (`id`, `code`, `name`, `is_active`, `created_at`, `updated_at`). Defaults to tenant `default`.
- **`sap_system_profiles`**: Target system profile configurations (`id`, `tenant_id`, `system_id`, `client`, `description`, `system_role`, `target_release`, `is_active`).

### 3.2 Fiori Catalogue & Master Data Domain
- **`fiori_catalog_sources`**: Catalogue import history and provenance (`id`, `source_type`, `source_version`, `source_release`, `source_edition`, `record_count`, `checksum_sha256`, `imported_at`).
- **`fiori_catalog_apps`**: Canonical catalog of Fiori Applications (`app_id`, `app_name`, `app_type`, `ui_technology`, `semantic_object`, `action`, `line_of_business`, `application_component`, `scope_item_id`, `target_release`, `is_s4hana_standard`, `source_id`). Full text search enabled via `gin(to_tsvector('english', app_name || ' ' || app_id))`.
- **`fiori_catalog_services`**: OData/CDS service bindings (`id`, `app_id`, `service_name`, `service_type`, `service_url`).
- **`fiori_catalog_tcode_mappings`**: T-Code to Fiori App mappings (`id`, `app_id`, `transaction_code`, `is_direct_replacement`, `mapping_type`).
- **`transaction_master_snapshots`**: Batch extraction runs for transaction definitions.
- **`transaction_master_records`**: Indexed transaction codes (`transaction_code`, `snapshot_id`, `description`, `module`, `transaction_type`, `complexity_score`, `screen_count`, `table_count`, `abap_program_name`, `is_custom_namespace`).

### 3.3 Assessment & Fit-Gap Domain
- **`assessments`**: Core assessment records with recommendation safety states (`id`, `tenant_id`, `transaction_code`, `system_id`, `status`, `recommendation`, `safety_state`, `candidate_app_id`, `candidate_app_name`, `overall_fit_score`, `gap_count`, `created_by`, `created_at`, `updated_at`).
  - *Recommendation Safety State Enum:* `NO_MATCH_VERIFIED`, `CATALOGUE_UNAVAILABLE`, `CATALOGUE_INCOMPLETE`, `SAP_CONNECTIVITY_FAILED`, `SAP_AUTHORIZATION_BLOCKED`, `TRANSACTION_UNVERIFIED`, `CANDIDATE_WITH_GAPS`, `DIRECT_MATCH`.
- **`fit_gap_dimensions`**: The 8 architectural evaluation dimensions per assessment (`id`, `assessment_id`, `dimension_name`, `category`, `source_value`, `target_value`, `weight`, `gap_score`, `fit_status`, `notes`).
- **`assessment_evidence`**: Audit evidence collected during discovery (`id`, `assessment_id`, `evidence_type`, `evidence_source`, `payload`, `collected_at`).
- **`assessment_audit_events`**: Cryptographically chained tamper-evident event log (`id`, `assessment_id`, `event_type`, `previous_hash`, `integrity_hash`, `actor`, `details`, `timestamp`).

### 3.4 Generation Studio Domain
- **`generation_projects`**: Workspace projects handed off from assessments or created standalone (`id`, `tenant_id`, `project_name`, `source_tcode`, `source_assessment_id`, `status`, `target_system`, `target_release`, `app_type`, `created_at`, `updated_at`).
- **`generation_specifications`**: Versioned specification documents and blueprints (`id`, `project_id`, `revision_number`, `spec_type`, `content_json`, `created_at`).
- **`generation_artifacts`**: Generated code files and manifests (`id`, `project_id`, `artifact_type`, `file_path`, `storage_uri`, `checksum_sha256`, `size_bytes`, `created_at`).
- **`generation_activity_events`**: Project audit log (`id`, `project_id`, `action_type`, `actor`, `details`, `timestamp`).

---

## 4. Migration Engine (`migrator.js`)

The native migration runner guarantees transactional schema evolutions:
1. **Migration State Table:** `schema_migrations` tracks `version`, `name`, `applied_at`, `checksum_sha256`, and `execution_time_ms`.
2. **Checksum Integrity Enforcement:** Before executing any migration or rollback, the runner computes the SHA-256 hash of the migration script on disk and validates it against recorded database checksums. Any detected tampering aborts the process immediately with an `InvariantError`.
3. **Atomicity:** Every migration script runs inside `BEGIN ... COMMIT`. On syntax or execution error, the transaction automatically rolls back.
4. **Bi-directional Rollbacks:** Every migration file (`001_initial_schema.sql`) is paired with an exact reverse script (`001_initial_schema.down.sql`).

---

## 5. Repositories Implemented

All repositories are located in `backend/src/infrastructure/db/repositories/`:

| Repository | Source File | Responsibilities |
|---|---|---|
| **AssessmentRepository** | `assessmentRepository.js` | Full CRUD for assessments, fit-gap dimensions, and cryptographically chained audit events. Supports candidate foreign-key validation and safe transactions. |
| **CatalogueRepository** | `catalogueRepository.js` | Catalogue source tracking, Fiori app lookups, full text search, and idempotent upserts for 267+ apps and service mappings. |
| **TransactionMasterRepository** | `transactionMasterRepository.js` | Transaction snapshot registration, T-Code master lookups, complexity scores, and module filtering. |
| **GenerationProjectRepository** | `generationProjectRepository.js` | Generation project lifecycle, specification versioning, artifact registration, and project activity event auditing. |

---

## 6. Artifact Storage Abstraction (`artifactStorage.js`)

Implements `IArtifactStorage` contract:
- **`LocalFileSystemArtifactStorage`**:
  - Deterministic storage under configurable base directory (defaults to `data/artifacts`).
  - Automatic directory hierarchy creation.
  - Streaming file writes and reads.
  - Mandatory SHA-256 content hash calculation and size verification upon write.
  - Tamper detection on read (`verifyIntegrity`).
  - Production pluggability for S3 / Azure Blob / BTP Object Store.

---

## 7. Security & Injection Prevention

1. **Zero Raw SQL String Concatenation:** All repository queries use parameterized SQL syntax (`$1`, `$2`, `$3`, etc.).
2. **Credential Sanitization:** Connection credentials are read strictly from process environment variables, never hardcoded in repository files or committed to Git.
3. **Tenant Scoping:** All core transactional tables enforce `tenant_id` foreign keys to ensure data isolation.
