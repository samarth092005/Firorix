# Fiorify Database Testing Strategy & Quality Assurance Plan (DB-010)
**Document Version:** 1.0.0  
**Harness:** Node.js LTS Test Runner (`node:test`)  
**Scope:** Persistence Abstraction, Multi-Database Adapters, Migrations & Recovery

---

## 1. Test Architecture & Coverage Matrix

| Area | Test Suite | File | Invariants Verified |
| :--- | :--- | :--- | :--- |
| **Adapter Abstraction** | DB Adapter & Probes | `backend/test/databaseAdapterAndMigrations.test.js` | Interface contracts, dialect resolution, query execution, connection lifecycle. |
| **Production Fail-Closed** | DB Adapter & Probes | `backend/test/databaseAdapterAndMigrations.test.js` | Strict rejection of PostgreSQL in `NODE_ENV=production`; required HANA binding. |
| **Cloud Foundry Binding** | DB Adapter & Probes | `backend/test/databaseAdapterAndMigrations.test.js` | Parsing of `VCAP_SERVICES` credentials and parameter mapping. |
| **Dialect Migrations** | DB Adapter & Probes | `backend/test/databaseAdapterAndMigrations.test.js` | Postgres & HANA migration discovery, SHA-256 checksums, status checks. |
| **Health Probes** | DB Adapter & Probes | `backend/test/databaseAdapterAndMigrations.test.js` | `/api/v1/health/liveness` (200 UP) and `/api/v1/health/readiness` (200/503). |
| **Persistence Foundation** | S1 Persistence Suite | `backend/test/s1PersistenceFoundation.test.js` | Schema creation, rollback/upgrade, concurrent writes, artifact storage. |
| **Assessment Store** | PERSIST-01 & PERSIST-02 | `backend/test/assessmentPersistence.test.js` | End-to-end CRUD, restart survival, 8-dimension integrity. |

---

## 2. Test Execution Command Guide

```bash
# Run database adapter, fail-closed, and migration test suite
node --test backend/test/databaseAdapterAndMigrations.test.js

# Run full persistence foundation integration suite
node --test backend/test/s1PersistenceFoundation.test.js

# Run assessment persistence suite
node --test backend/test/assessmentPersistence.test.js
```

---

## 3. Production Release Gate Criteria

1. **Zero Mutating Calls to SAP S21:** Verified via audit inspection.
2. **HANA Cloud Invariant:** Production deployment requires `@sap/hana-client` and `VCAP_SERVICES` binding.
3. **100% Migration Status:** `/api/v1/health/readiness` confirms `UP_TO_DATE` migration status.
4. **All Database Tests Passing:** Zero failures across all persistence test suites.
