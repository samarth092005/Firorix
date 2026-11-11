# FIORIX — S1 DATABASE SCHEMA VERIFICATION
**PostgreSQL Live Schema, Tables, Extensions, Foreign Keys & Migration Verification**

**Date:** 2026-11-11  
**Database Engine:** PostgreSQL 18.6 on x86_64-windows (MSVC-19.44.35228, 64-bit)  
**Database:** `fiorix` | **Schema:** `public`  
**Status:** VERIFIED LIVE AGAINST DATABASE ENGINE  

---

## 1. Resolution of the 14 vs. 16 Entity Discrepancy

During Phase S0/S1 review, a documentation discrepancy existed between 14 tables cited in summary prose and 16 entity definitions listed in design notes.

**Live Database Inspection Result:**
The PostgreSQL database contains exactly **17 tables** in the `public` schema:
- **16 Domain Entity Tables:**
  1. `tenants` (Multi-tenant isolation)
  2. `sap_system_profiles` (System connections & releases)
  3. `fiori_catalog_sources` (Catalogue provenance & import history)
  4. `fiori_catalog_apps` (Canonical Fiori application catalogue)
  5. `fiori_catalog_services` (OData/CDS service bindings)
  6. `fiori_catalog_tcode_mappings` (T-Code to Fiori application relationships)
  7. `transaction_master_snapshots` (Batch extraction metadata)
  8. `transaction_master_records` (Authoritative transaction dictionary)
  9. `assessments` (Fit-gap assessments & recommendation safety states)
  10. `fit_gap_dimensions` (The 8 architectural evaluation dimensions)
  11. `assessment_evidence` (Normalized discovery evidence)
  12. `assessment_audit_events` (Cryptographic SHA-256 chained audit trail)
  13. `generation_projects` (Generation Studio workspaces)
  14. `generation_specifications` (Versioned blueprints & specifications)
  15. `generation_artifacts` (Generated code metadata & storage checksums)
  16. `generation_activity_events` (Project activity audit trail)
- **1 Migration Metadata Table:**
  17. `schema_migrations` (Version, name, execution time, and SHA-256 script checksum)

The discrepancy is formally resolved: There are 16 domain entity tables and 1 migration state table, totaling 17 tables.

---

## 2. Extensions Verification

Queried via `SELECT extname, extversion FROM pg_extension;`:
- **`plpgsql`** (Version 1.0): Procedural language extension.
- **`pg_trgm`** (Version 1.6): Trigram index extension. Active on `fiori_catalog_apps(app_name)` via `idx_fiori_cat_app_name_trgm USING gin (app_name gin_trgm_ops)`.

---

## 3. Foreign Keys & Referential Integrity (19 Verified)

All 19 foreign key constraints reference existing tables and columns:

| Dependent Table | Column | Referenced Table | Referenced Column | On Delete Action |
|---|---|---|---|---|
| `sap_system_profiles` | `tenant_id` | `tenants` | `tenant_id` | CASCADE |
| `fiori_catalog_services` | `app_id` | `fiori_catalog_apps` | `app_id` | CASCADE |
| `fiori_catalog_tcode_mappings` | `app_id` | `fiori_catalog_apps` | `app_id` | CASCADE |
| `transaction_master_snapshots` | `tenant_id` | `tenants` | `tenant_id` | CASCADE |
| `transaction_master_snapshots` | `system_profile_id` | `sap_system_profiles` | `id` | CASCADE |
| `transaction_master_records` | `snapshot_id` | `transaction_master_snapshots` | `id` | CASCADE |
| `transaction_master_records` | `tenant_id` | `tenants` | `tenant_id` | CASCADE |
| `transaction_master_records` | `system_profile_id` | `sap_system_profiles` | `id` | CASCADE |
| `assessments` | `tenant_id` | `tenants` | `tenant_id` | CASCADE |
| `assessments` | `system_profile_id` | `sap_system_profiles` | `id` | NO ACTION |
| `assessments` | `candidate_app_id` | `fiori_catalog_apps` | `app_id` | NO ACTION |
| `fit_gap_dimensions` | `assessment_id` | `assessments` | `id` | CASCADE |
| `assessment_evidence` | `assessment_id` | `assessments` | `id` | CASCADE |
| `assessment_audit_events` | `assessment_id` | `assessments` | `id` | CASCADE |
| `generation_projects` | `tenant_id` | `tenants` | `tenant_id` | CASCADE |
| `generation_projects` | `source_assessment_id` | `assessments` | `id` | SET NULL |
| `generation_specifications` | `project_id` | `generation_projects` | `project_id` | CASCADE |
| `generation_artifacts` | `project_id` | `generation_projects` | `project_id` | CASCADE |
| `generation_activity_events` | `project_id` | `generation_projects` | `project_id` | CASCADE |

---

## 4. Migration History & Checksums

Table `schema_migrations`:
- **Version:** `001`
- **Migration Name:** `initial_schema`
- **Checksum:** `16c2d1d5d514c3dfa2d1da4a1434b14be3573d83f7874d121e7764849c54d2b5`
- **Checksum Tamper Test:** Verified in Test 3 of `s1PersistenceFoundation.test.js`: Altering 1 byte in the migration file raises `InvariantError` and terminates migration execution.

---

## 5. Connection Pool Lifecycle & Performance

- **Engine:** `DatabasePool` (`pg.Pool`)
- **Pool Sizing:** Maximum 20 connections, idle timeout 30,000 ms, acquisition timeout 5,000 ms.
- **Embedded Engine Integration:** Auto-detects existing postmaster lock files on port 54334, verifies port connectivity, and reuses warm connections safely without process collision.
