# Fiorify Database Schema Migration Strategy (DB-006)
**Document Version:** 1.1.0  
**Supported Engines:** PostgreSQL 15+ (Local/CI) and SAP HANA Cloud (Production)

---

## 1. Migration Architecture Principles

Fiorify implements an engine-specific, dialect-aware schema migration runner (`DialectMigrationRunner`):

1. **Dialect Separation:** Migrations are organized into engine-specific directories:
   - `backend/src/infrastructure/db/migrations/postgres/`
   - `backend/src/infrastructure/db/migrations/hana/`
2. **Cryptographic Checksum Validation:** Each migration script's contents are hashed with SHA-256 upon execution. If an applied migration script is modified after being run, the runner refuses to proceed without explicit operator repair.
3. **Provider-Specific DDL Transaction Semantics:**
   - **PostgreSQL:** Migrations execute within an atomic transaction (`BEGIN ... COMMIT`), with full rollback upon any DDL syntax or constraint error.
   - **SAP HANA Cloud:** SAP HANA executes DDL statements with **implicit commits**. Multi-statement DDL migrations in HANA cannot be rolled back atomically if a statement fails halfway. Consequently, pre-migration snapshots and idempotency are mandatory prior to running migrations against SAP HANA Cloud.
4. **Idempotence & Reversibility:** Every forward migration (`<version>_<name>.sql`) is paired with an equivalent rollback script (`<version>_<name>.down.sql`).
5. **Production Rollback Safety Lock:** `migrateDown()` strictly refuses unconstrained full database wipes in production (`NODE_ENV=production`). A designated target version and explicit confirmation (`{ force: true }`) are mandatory.

---

## 2. Directory Structure

```
backend/src/infrastructure/db/migrations/
├── postgres/
│   ├── 001_initial_schema.sql / .down.sql
│   ├── 002_security_audit.sql / .down.sql
│   ├── 003_handoffs_and_approvals.sql / .down.sql
│   ├── 004_sap_system_registry.sql / .down.sql
│   ├── 005_modernization_intelligence.sql / .down.sql
│   ├── 006_specification_lifecycle.sql / .down.sql
│   ├── 007_deployment_orchestration.sql / .down.sql
│   └── 008_postgresql_rls_policies.sql / .down.sql
├── hana/
│   ├── 001_initial_schema.sql / .down.sql
│   ├── 002_security_audit.sql / .down.sql
│   ├── 003_handoffs_and_approvals.sql / .down.sql
│   ├── 004_sap_system_registry.sql / .down.sql
│   ├── 005_modernization_intelligence.sql / .down.sql
│   ├── 006_specification_lifecycle.sql / .down.sql
│   └── 007_deployment_orchestration.sql / .down.sql
```

---

## 3. Migration Tracking Schema (`schema_migrations`)

```sql
-- PostgreSQL
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    checksum VARCHAR(128) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER NOT NULL
);

-- SAP HANA Cloud
CREATE TABLE schema_migrations (
    version NVARCHAR(64) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    checksum NVARCHAR(128) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    execution_time_ms INTEGER NOT NULL
);
```

---

## 4. Execution Commands

```bash
# Check current migration status
node -e "import('./backend/src/infrastructure/db/migrator/dialectMigrationRunner.js').then(m => new m.DialectMigrationRunner().getStatus()).then(console.log)"

# Apply pending migrations
node -e "import('./backend/src/infrastructure/db/migrator/dialectMigrationRunner.js').then(m => new m.DialectMigrationRunner().migrateUp()).then(console.log)"

# Roll back in development to specific version
node -e "import('./backend/src/infrastructure/db/migrator/dialectMigrationRunner.js').then(m => new m.DialectMigrationRunner().migrateDown('005')).then(console.log)"

# Note: In production (NODE_ENV=production), full unconstrained rollback is strictly blocked.
```
