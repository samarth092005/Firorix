# Fiorify — Database Design & Schema Specification

## 1. Overview & Dual-Engine Persistence Architecture

Fiorify adopts a strict dual-engine database architecture governed by environment:
- **Local Development & CI:** PostgreSQL 15+ (managed locally or via `embedded-postgres` runner).
- **Production Target (SAP BTP Cloud Foundry):** SAP HANA Cloud (HDI Container) via `@sap/hana-client` driver.
- **Fail-Closed Durability:** In production, durable database persistence is strictly mandatory. Silent fallback to local JSON files or in-memory state is forbidden (`PRODUCTION_PERSISTENCE_REQUIRED`).

All migrations are engine-aware, maintained as paired forward SQL (`*.sql`) and rollback scripts (`*.down.sql`) under `backend/src/infrastructure/db/migrations/postgres/` and `backend/src/infrastructure/db/migrations/hana/`.

Connection pooling is governed via `backend/src/infrastructure/db/pool.js` and engine adapters (`PostgresAdapter` / `HanaAdapter`) with:
- Connection pool size: `max: 20`
- Connection idle timeout: `30,000 ms` (PostgreSQL) / `60,000 ms` (HANA)
- Connection lease timeout: `5,000 ms` (PostgreSQL) / `10,000 ms` (HANA)
- Mandatory multi-tenant scoping (`tenant_id` column present and indexed on every tenant-scoped table; PostgreSQL RLS policies in `008_postgresql_rls_policies.sql`).

---

## 2. Migration Registry (001 through 008)

```mermaid
flowchart LR
    M001["001: Initial Schema\n(assessments, systems, history)"] --> M002["002: Security Audit\n(security_audit_events)"]
    M002 --> M003["003: Handoffs & Approvals\n(handoffs, approvals)"]
    M003 --> M004["004: SAP System Registry\n(sap_system_registry)"]
    M004 --> M005["005: Modernization Intelligence\n(scoring, fitgap)"]
    M005 --> M006["006: Specification Lifecycle\n(versions, approvals)"]
    M006 --> M007["007: Deployment Orchestration\n(plans, executions)"]
    M007 --> M008["008: PostgreSQL RLS Policies\n(Row Level Security)"]
```

### Migration Inventory

| Migration | Up Script | Down Script | Dialect Support | Primary Tables Managed |
|---|---|---|---|---|
| **001** | `001_initial_schema.sql` | `001_initial_schema.down.sql` | PostgreSQL & SAP HANA Cloud | `assessments`, `fiori_app_catalog`, `discovered_transactions`, `systems`, `assessment_history` |
| **002** | `002_security_audit.sql` | `002_security_audit.down.sql` | PostgreSQL & SAP HANA Cloud | `security_audit_events` |
| **003** | `003_handoffs_and_approvals.sql` | `003_handoffs_and_approvals.down.sql` | PostgreSQL & SAP HANA Cloud | `modernization_handoffs`, `modernization_approvals` |
| **004** | `004_sap_system_registry.sql` | `004_sap_system_registry.down.sql` | PostgreSQL & SAP HANA Cloud | `sap_system_profiles`, `sap_system_diagnostic_history` |
| **005** | `005_modernization_intelligence.sql` | `005_modernization_intelligence.down.sql` | PostgreSQL & SAP HANA Cloud | `fiori_catalog_apps` ext, `transaction_discovery_executions`, `transaction_technical_objects` |
| **006** | `006_specification_lifecycle.sql` | `006_specification_lifecycle.down.sql` | PostgreSQL & SAP HANA Cloud | `project_specification_versions`, `project_specification_approvals`, `generation_projects` ext |
| **007** | `007_deployment_orchestration.sql` | `007_deployment_orchestration.down.sql` | PostgreSQL & SAP HANA Cloud | `deployment_plans`, `deployment_approvals`, `deployment_executions` |
| **008** | `008_postgresql_rls_policies.sql` | `008_postgresql_rls_policies.down.sql` | PostgreSQL | Row-Level Security on all tenant-scoped tables (`assessments`, `security_audit_events`, etc.) |

---

## 3. Core Table Schemas

### 3.1 `assessments`
Stores the modernization assessment evaluation and recommended outcome:
- `id` (VARCHAR PK): Unique assessment identifier (e.g. `ASSESS-VA01-20261114`).
- `tenant_id` (VARCHAR NOT NULL): Tenant isolation key.
- `transaction_code` (VARCHAR NOT NULL): Evaluated SAP T-Code (e.g. `VA01`, `ME21N`).
- `recommended_outcome` (VARCHAR NOT NULL): `ADD_AND_CONFIGURE` or `BUILD`.
- `status` (VARCHAR NOT NULL): `DRAFT`, `PENDING_REVIEW`, `APPROVED`.
- `scoring_breakdown` (JSONB): 5-dimension score breakdown.
- `created_by`, `created_at`, `updated_at`.

### 3.2 `security_audit_events`
Immutable, append-only security log for compliance and tamper verification:
- `event_id` (BIGSERIAL PK).
- `tenant_id` (VARCHAR NOT NULL).
- `actor` (VARCHAR NOT NULL): Identity of user or service principal.
- `action` (VARCHAR NOT NULL): e.g. `ADMIN_OVERRIDE_APPROVED`, `DEPLOYMENT_PLAN_APPROVED`.
- `resource` (VARCHAR NOT NULL): Affected resource identifier.
- `outcome` (VARCHAR NOT NULL): `SUCCESS`, `DENIED`, `STOPPED_AT_WRITE_BOUNDARY`.
- `details` (JSONB): Signatures, expiration, hashes, and context.
- `timestamp` (TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP).

### 3.3 `deployment_plans` & `deployment_approvals`
Tracks topological deployment packages and cryptographic authorizations:
- `deployment_plans`:
  - `id` (VARCHAR PK): `DEP-PLAN-*`.
  - `project_id` (VARCHAR NOT NULL).
  - `tenant_id` (VARCHAR NOT NULL).
  - `status` (VARCHAR NOT NULL): `DEPLOYMENT_PLANNED`, `APPROVED`, etc.
  - `plan_hash` (VARCHAR(64) NOT NULL): SHA-256 hash of DAG operations.
  - `artifact_manifest_hash` (VARCHAR(64) NOT NULL): SHA-256 hash of all generated files.
  - `plan_details` (JSONB): Ordered artifact execution sequence.
- `deployment_approvals`:
  - `id` (BIGSERIAL PK).
  - `plan_id` (VARCHAR NOT NULL REFERENCES deployment_plans(id)).
  - `tenant_id` (VARCHAR NOT NULL).
  - `decision` (VARCHAR NOT NULL): `APPROVED`, `REJECTED`.
  - `approver` (VARCHAR NOT NULL).
  - `approver_role` (VARCHAR NOT NULL).
  - `signature_hash` (VARCHAR NOT NULL): `sig:v1:<hmac_hex>` or legacy 64-char hex digest.
  - `approved_at`, `expires_at` (TIMESTAMP WITH TIME ZONE).

---

## 4. Multi-Tenant Scoping & Indexing Strategy

1. **Mandatory Tenant Predicates**:
   All database queries generated by repository classes explicitly bind `tenant_id`:
   ```sql
   SELECT * FROM assessments WHERE id = $1 AND tenant_id = $2;
   ```
2. **Compound Indexes**:
   - `idx_assessments_tenant_tcode`: `(tenant_id, transaction_code)`
   - `idx_projects_tenant_lifecycle`: `(tenant_id, lifecycle_status)`
   - `idx_deployment_plans_tenant`: `(tenant_id, status)`
   - `idx_audit_tenant_timestamp`: `(tenant_id, timestamp DESC)`
