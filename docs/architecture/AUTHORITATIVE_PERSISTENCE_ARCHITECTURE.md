# Fiorify — Authoritative Persistence Architecture
## Sprint S0 + S1 Specification & Operational Runbook

**Status:** APPROVED & IMPLEMENTED  
**System:** Fiorify Modernization Platform  
**Target RDBMS:** PostgreSQL 15+ / AWS RDS PostgreSQL / Azure Flexible Server / Local Embedded PG 18.6  
**Persistence Driver:** `pg` (node-postgres) with connection pooling  

---

## 1. Architectural Overview

Fiorify has transitioned from ad-hoc filesystem-based JSON storage to an enterprise-grade, authoritative relational persistence architecture on PostgreSQL. The persistence layer enforces:

1. **Multi-Tenant Isolation:** Every table partitions records by `tenant_id` (foreign key to `tenants`), ensuring strict data boundaries.
2. **ACID Transactional Guarantees:** Multi-entity operations (e.g. assessment updates + audit logging + fit-gap dimension persistence) are wrapped in atomic database transactions (`BEGIN` ... `COMMIT` / `ROLLBACK`).
3. **Dual-Mode Operational Support:** The application auto-detects database connectivity (`FIORIFY_PERSISTENCE=postgres` or connection strings). In environments without external PostgreSQL, it seamlessly provisions embedded PostgreSQL or falls back safely to read-only JSON stores without data corruption.
4. **Append-Only Cryptographic Audit Chains:** Audit events record `previous_event_hash` and `event_hash` (SHA-256) verifying immutable provenance for SAP compliance.

```mermaid
graph TD
    A[Client Application / Frontend] -->|HTTPS REST| B[Node.js Express Server]
    B -->|Auth & Tenant Middleware| C[Service & Domain Layer]
    C --> D[Repository Layer]
    D -->|Connection Pool| E[(Authoritative PostgreSQL)]
    
    subgraph Data Stores
        E --> T1[tenants & sap_system_profiles]
        E --> T2[fiori_catalog_*]
        E --> T3[transaction_master_*]
        E --> T4[assessments & audit]
        E --> T5[generation_projects & artifacts]
        E --> T6[generation_handoffs & approvals]
    end
    
    subgraph Migration & Health Subsystem
        F[DatabaseMigrator] -->|DDL Migrations| E
        G[StoreMigrator] -->|JSON Ingestion & Reconciliation| E
        H[Health Monitor] -->|Pool Healthcheck| E
    end
```

---

## 2. Entity-Relationship Data Model

```mermaid
erDiagram
    tenants ||--o{ sap_system_profiles : owns
    tenants ||--o{ assessments : owns
    tenants ||--o{ generation_projects : owns
    tenants ||--o{ generation_handoffs : owns
    
    sap_system_profiles ||--o{ assessments : "evaluated against"
    sap_system_profiles ||--o{ generation_projects : "target system"
    
    fiori_catalog_apps ||--o{ fiori_catalog_tcode_map : maps
    fiori_catalog_imports ||--o{ fiori_catalog_apps : ingests
    
    transaction_master_snapshots ||--o{ transaction_master_catalog : captures
    
    assessments ||--o{ fit_gap_dimensions : details
    assessments ||--o{ assessment_audit_events : tracks
    assessments ||--o| generation_handoffs : "hands off to"
    
    generation_handoffs ||--o{ build_architect_approvals : "validated by"
    generation_handoffs ||--o| generation_projects : "instantiates"
    
    generation_projects ||--o{ generation_specifications : specifies
    generation_projects ||--o{ generation_activity_events : logs
    generation_projects ||--o{ generation_artifacts : produces

    tenants {
        varchar tenant_id PK
        varchar name
        varchar status
        jsonb settings
        timestamp created_at
    }

    sap_system_profiles {
        varchar id PK
        varchar tenant_id FK
        varchar sid
        varchar client
        varchar release
        varchar status
    }

    assessments {
        varchar id PK
        varchar tenant_id FK
        varchar tcode
        varchar system_id
        integer version
        varchar lifecycle_status
        varchar recommendation_action
        numeric fit_gap_score
        jsonb metadata
        timestamp created_at
    }

    fit_gap_dimensions {
        bigserial id PK
        varchar assessment_id FK
        varchar dimension_key
        varchar status
        numeric score
        numeric weight
    }

    assessment_audit_events {
        bigserial id PK
        varchar assessment_id FK
        varchar event_type
        varchar actor_id
        varchar previous_hash
        varchar event_hash
        timestamp created_at
    }

    generation_handoffs {
        varchar handoff_id PK
        varchar tenant_id FK
        varchar source_assessment_id FK
        varchar tcode
        varchar approval_status
        varchar current_stage
        jsonb architecture_baseline
        timestamp created_at
    }

    build_architect_approvals {
        varchar approval_id PK
        varchar handoff_id FK
        varchar assessment_id FK
        integer assessment_version
        varchar approver_id
        varchar approver_name
        varchar scope
        timestamp approved_at
        timestamp expires_at
        varchar status
    }

    generation_projects {
        varchar project_id PK
        varchar tenant_id FK
        varchar source_assessment_id
        varchar tcode
        varchar status
        varchar current_stage
        timestamp created_at
    }
```

---

## 3. Database Schema Migrations

Database migrations are tracked via table `schema_migrations` and executed sequentially:

1. **`001_initial_schema.sql`**: Core enterprise schema including `tenants`, `sap_system_profiles`, `fiori_catalog_apps`, `fiori_catalog_tcode_map`, `transaction_master_catalog`, `assessments`, `fit_gap_dimensions`, `generation_projects`, `generation_specifications`, `generation_activity_events`, and `generation_artifacts`.
2. **`002_security_audit.sql`**: Tamper-evident cryptographic audit chain tables (`assessment_audit_events`), hash chaining triggers, indexes, and immutable constraints.
3. **`003_handoffs_and_approvals.sql`**: Governance handoff registry (`generation_handoffs`) and strict architectural approval records (`build_architect_approvals`), enforcing version-bound approval tracking.

---

## 4. Operational Runbook & Commands

### Running Database Migrations
```bash
# Connect to configured database and run all outstanding migrations
node backend/src/infrastructure/db/scripts/migrateStores.js
```

### Verifying Persistence Reconciliation
```bash
# Runs full data parity check between JSON stores and PostgreSQL
node backend/src/infrastructure/db/scripts/verifyReconciliation.js
```

### Auditing & Quarantining Legacy Handoff Records
```bash
# Inspects, classifies demo fixtures, backs up with SHA-256, and quarantines invalid records
node backend/src/infrastructure/db/scripts/investigateHandoffs.js
```

### Health & Connection Pool Verification
- Health endpoint: `GET /api/v1/health`
- Database diagnostic pool verification:
```javascript
import { DatabasePool } from './backend/src/infrastructure/db/databasePool.js';
const isHealthy = await DatabasePool.healthCheck();
```
