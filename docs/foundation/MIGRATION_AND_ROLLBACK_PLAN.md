# Fiorify — Data Migration and Rollback Plan (Phase S1 Corrected)

**Document Version:** 2.0  
**Phase:** S1 — Persistence Foundation  
**Scope:** Controlled, verifiable migration of all four JSON data stores into the PostgreSQL relational repository, record reconciliation, quarantine protocol, shadow reads, write-authority rules, and deterministic rollback.  
**Date:** November 2026

---

## 1. Migration Safety Invariants & Rules

1. **Zero Data Loss:** All source records are preserved in an immutable, timestamped pre-migration backup tarball (`backend/data/backups/pre-s1-snapshot-<timestamp>.tar.gz`).
2. **No Automatic File/DB Fallback:** Write fallback between file and database is strictly prohibited. If PostgreSQL is the active write authority and fails, the system returns an explicit storage error (`STORAGE_UNAVAILABLE`) rather than silently writing to legacy JSON files.
3. **Quarantine Without Fabrication:** If a legacy record cannot be mapped cleanly into the relational schema (e.g., missing system context or unresolvable foreign key), it is placed into a structured quarantine table/file (`backend/data/quarantine/`) and flagged for administrator resolution. Fabricating synthetic foreign keys or arbitrary relations is strictly prohibited.
4. **Idempotence & Safe Re-execution:** All migration scripts are idempotent (`ON CONFLICT DO UPDATE` or key existence checks) to ensure re-runs never duplicate records.
5. **No Destructive Generic Rollback:** Do not use `TRUNCATE CASCADE` as a generic rollback. Rollbacks must execute discrete versioned `.down.sql` scripts that reverse specific changes while preserving unrelated tables.

---

## 2. Seven-Stage Write-Authority Progression

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Stage 1: Immutable Pre-Migration Snapshot                               │
│ - Archive backend/data/*.json to backend/data/backups/                  │
│ - Compute SHA-256 digests of all 4 source stores                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Stage 2: Schema Migration & Checksum Validation                         │
│ - Execute migrator: 001_initial_schema.sql                              │
│ - Record migration checksum in schema_migrations table                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Stage 3: Data Ingestion & Relational Hydration                          │
│ - Ingest 267 Fiori catalog apps & OData services                        │
│ - Ingest 21 transaction master DDIC records                             │
│ - Ingest 11 assessment records & verify hash chains                     │
│ - Ingest 1 generation project & specifications                          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Stage 4: Record-Level Reconciliation & Parity Audit                     │
│ - Reconcile 100% of record counts, keys, timestamps, hashes             │
│ - Generate S1_MIGRATION_RECONCILIATION_REPORT.md                        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Stage 5: Shadow Reads (Fiorify_STORAGE_MODE=shadow)                      │
│ - Primary read from JSON, asynchronous shadow read from PostgreSQL      │
│ - Assert field-level equality and log parity anomalies                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Stage 6: Controlled PostgreSQL Read Cutover                             │
│ - Primary reads served by PostgreSQL repository                         │
│ - Verify UI dashboards and APIs across all 5 main features              │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Stage 7: PostgreSQL Write Cutover & File Store Read-Only Deprecation    │
│ - Fiorify_STORAGE_MODE=postgres                                          │
│ - All writes committed to PostgreSQL transactionally                    │
│ - Legacy JSON stores sealed as read-only historical archives            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Rollback Protocol

If PostgreSQL experiences unrecoverable errors, connection drops, or reconciliation failure during verification:
1. Revert `Fiorify_STORAGE_MODE=file`.
2. Execute down-migration: `npm --prefix backend run migrate:down`.
3. Verify file store integrity against `pre-s1-snapshot-<timestamp>.tar.gz`.
4. Re-run backend test suite (`npm --prefix backend test`).
