# FIORIFY — PHASE 12 SAP HANA CLOUD HDI READINESS & SCHEMA AUDIT

**Document Identifier:** `FIORIFY-PHASE-12-HANA-HDI-READINESS`  
**Application:** Fiorify — SAP Fiori Modernization Platform  
**Target Platform:** SAP BTP Cloud Foundry (`eu30`)  
**Production Database:** SAP HANA Cloud — HDI-Shared Container  
**Local Development Database:** PostgreSQL (16.x)  
**Execution Date:** November 17, 2026  
**Auditor:** Principal SAP BTP Database Architect  
**Classification:** Internal Deployment Engineering Report  

---

## 1. EXECUTIVE SUMMARY & DATABASE ARCHITECTURE

Fiorify utilizes an enterprise dual-dialect persistence tier:
- **Local Development & CI**: PostgreSQL via `PostgresAdapter` and embedded PostgreSQL runner.
- **Production (SAP BTP)**: SAP HANA Cloud HDI Container via `HanaAdapter` and official `@sap/hana-client` driver.

In production on SAP BTP Cloud Foundry, Fiorify runs within a dedicated, isolated SAP HANA HDI container, ensuring strict tenant data isolation, encrypted data at rest and in transit, and separation from ERP operational data.

```
========================================================================================================
PRODUCTION FIORIFY PERSISTENCE ARCHITECTURE
========================================================================================================
[ Fiorify Application (Cloud Foundry Node.js Runtime) ]
      │
      ├── Dialect: 'hana'
      ├── HanaAdapter (backend/src/infrastructure/db/adapters/hanaAdapter.js)
      │     └── Parameter Adapter ($1, $2 -> ?)
      │     └── SSL/TLS Enforcer (encrypt: true, sslValidateCertificate: true)
      │
      ├── Cloud Foundry Service Binding: Fiorify-hana (service: hana, plan: hdi-shared)
      │     └── VCAP_SERVICES['hana'][0].credentials
      │           ├── host: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.hana.ondemand.com
      │           ├── port: 443
      │           ├── user: [CONTAINER_GENERATED_USER]
      │           ├── password: [CONTAINER_GENERATED_PASSWORD]
      │           └── schema: [CONTAINER_SCHEMA_NAME]
      │
      ▼
[ SAP HANA Cloud Database Instance ]
      └── [ Dedicated HDI Container Schema ]
            ├── schema_migrations (Audit & Checksum ledger)
            ├── 22 Production Relational Tables
            └── Encrypted Storage Volumes (AES-256)
```

---

## 2. BTP SERVICE OFFERING RECONCILIATION (`hana` vs `hana-cloud`)

To prevent deployment failures, Fiorify's service dependencies are reconciled against SAP BTP Cloud Foundry marketplace offerings:

| Offering Name | Service Plan | Usage in SAP BTP | Fiorify Utilization |
| :--- | :--- | :--- | :--- |
| **`hana`** | **`hdi-shared`** | Provisions a dedicated schema/container within an existing SAP HANA Cloud instance for application persistence. | **PRIMARY RUNTIME SERVICE** (`Fiorify-hana`). Bound to `manifest.yml`. |
| **`hana-cloud`** | `hana` / `admin` | Administrative service for provisioning whole SAP HANA Cloud database instances. | Not bound directly to application containers. Managed at subaccount infrastructure tier. |

### Configuration Alignment in `manifest.yml`
```yaml
services:
  - Fiorify-xsuaa
  - Fiorify-destination
  - Fiorify-connectivity
  - Fiorify-hana
```
`Fiorify-hana` must be created in BTP Space `dev` using:
```bash
cf create-service hana hdi-shared Fiorify-hana
```

---

## 3. HANA DDL MIGRATION INVENTORY

Fiorify includes 7 production-grade HANA DDL migrations located in `backend/src/infrastructure/db/migrations/hana/`. All scripts have matching `.down.sql` rollback companions.

| Migration Version & Name | Tables Created | Key Constraints & Characteristics |
| :--- | :--- | :--- |
| **`001_initial_schema.sql`** | `schema_migrations`<br>`tenants`<br>`sap_system_profiles`<br>`fiori_catalog_sources`<br>`fiori_catalog_apps`<br>`transaction_profiles`<br>`assessments`<br>`assessment_audit_events` | Core domain schema. Foreign keys to `tenants(id)`. Case-insensitive alphanumeric keys (`NVARCHAR`). Indexes on `tenant_id`, `app_id`, `tcode`. |
| **`002_security_audit.sql`** | `security_audit_events`<br>`token_revocations`<br>`refresh_tokens` | Enterprise security and audit ledger. Revocation tracking, SHA-256 token hashing, event categorization. |
| **`003_handoffs_and_approvals.sql`** | `generation_handoffs`<br>`generation_projects`<br>`project_artifacts` | Modernization lifecycle tracking from assessment to RAP generation project. Status states: `DRAFT`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`. |
| **`004_sap_system_registry.sql`** | `sap_system_diagnostic_history` | Historical SAP system health, response times, Gateway availability logs, and diagnostic event trails. |
| **`005_modernization_intelligence.sql`** | `transaction_discovery_executions`<br>`transaction_technical_objects` | Deep metadata inspection records (tcode call chains, tables accessed, user-exits, BAPIs, BAdIs). |
| **`006_specification_lifecycle.sql`** | `project_specification_versions`<br>`project_specification_approvals` | Versioned RAP specifications (CDS entity designs, behavior definitions, UI annotations) and multi-signature approvals. |
| **`007_deployment_orchestration.sql`** | `deployment_plans`<br>`deployment_approvals`<br>`deployment_executions` | Four-eyes deployment governance, pre-flight verification records, and local deployment artifact tracking. |

**Total Production Tables**: 22 tables.

---

## 4. SQL DIALECT & DRIVER ADAPTATION ANALYSIS

The persistence abstraction layer in `backend/src/infrastructure/db/` resolves key dialect differences between PostgreSQL and SAP HANA Cloud:

### 4.1 Data Type Mapping

| Generic Type | PostgreSQL Representation | SAP HANA Cloud Representation | Implementation Status |
| :--- | :--- | :--- | :--- |
| **UUID / Identifier** | `VARCHAR(64)` / `UUID` | `NVARCHAR(64)` | Verified in DDL |
| **Long Text / JSON** | `JSONB` / `TEXT` | `NCLOB` | Verified in DDL |
| **Timestamp with Zone** | `TIMESTAMPTZ` | `TIMESTAMP` | Verified in DDL |
| **Auto-Increment Key** | `SERIAL` / `BIGSERIAL` | `BIGINT GENERATED BY DEFAULT AS IDENTITY` | Verified in DDL |
| **Boolean Flag** | `BOOLEAN` | `BOOLEAN` (HANA 2.0 SPS03+) | Verified in DDL |

### 4.2 Positional Parameter Translation
PostgreSQL uses `$1, $2, ...` syntax, whereas SAP HANA Cloud ODBC/Node.js client uses `?` positional parameters.
`HanaAdapter.adaptSql(sql)` converts all numbered parameters dynamically:
```javascript
static adaptSql(sql) {
  if (!sql || typeof sql !== 'string') return sql;
  return sql.replace(/\$\d+/g, '?');
}
```

### 4.3 Connection Security & Encryption
`HanaAdapter` forces SSL/TLS validation when communicating with HANA Cloud:
```javascript
{
  serverNode: `${host}:${port}`,
  encrypt: true,
  sslValidateCertificate: true,
  sslCryptoProvider: 'openssl'
}
```

---

## 5. PRODUCTION STARTUP & FAIL-CLOSED INTEGRITY

When running in production (`NODE_ENV=production`), `backend/src/server.js` executes strict dependency assertions:

1. **VCAP_SERVICES Validation**: Checks for bound services (`hana` and `xsuaa`).
2. **Database Connectivity Assertion**: Attempts ping query `SELECT 1 FROM DUMMY;`.
3. **Fail-Closed Policy**: If the `Fiorify-hana` service is not bound or fails authentication, the server **terminates immediately** with exit code 1 to prevent operating in an unpersisted or corrupted state.

---

## 6. READINESS ASSESSMENT & SEPARATION OF EVIDENCE

### Readiness Status: `PENDING_EXTERNAL_VERIFICATION`

- **Static & Code Verification**: **`PASS_VERIFIED`**.
  - All 7 HANA DDL migrations syntax-checked against SAP HANA Cloud SQL Reference.
  - Parameter mapping logic verified.
  - Connection parsing for Cloud Foundry `VCAP_SERVICES` verified.
- **Dynamic Live Verification**: **`PENDING_EXTERNAL_VERIFICATION`**.
  - Local CI and test suites run against embedded PostgreSQL (`postgres` dialect: 827/827 tests passed).
  - Physical execution against a live SAP HANA Cloud database requires active HDI container provisioning in SAP BTP Subaccount `[REDACTED_ORG]`.

---

## 7. ADMINISTRATOR STEP-BY-STEP PROVISIONING GUIDE

To establish the production persistence layer on SAP BTP Cloud Foundry:

- [ ] **Step 1: Check SAP HANA Cloud Instance**
  - Verify that an SAP HANA Cloud instance is running in Subaccount `[REDACTED_ORG]`.
- [ ] **Step 2: Create HDI Container Service Instance**
  ```bash
  cf target -o "[REDACTED_ORG]" -s dev
  cf create-service hana hdi-shared Fiorify-hana
  ```
  *(Wait for instance status to show `create succeeded` via `cf service Fiorify-hana`)*.
- [ ] **Step 3: Bind Application or Run Migrations via One-Off Task**
  Once bound, trigger the initial migration run:
  ```bash
  cf run-task Fiorify --command "node backend/src/infrastructure/db/migrator.js up" --name fiorify-migrate
  ```
- [ ] **Step 4: Verify Migration Ledger**
  Inspect task logs via `cf logs Fiorify --recent` to ensure all 7 migrations (`001` through `007`) applied with zero errors.
