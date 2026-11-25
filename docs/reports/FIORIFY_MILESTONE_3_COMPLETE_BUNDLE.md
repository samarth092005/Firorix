# FIORIFY — COMPLETE MILESTONE 3 DOCUMENTATION BUNDLE
> Generated for AI context upload & single-file handoff.

## Table of Contents
1. MILESTONE_3_SEC_DB_IMPLEMENTATION_REPORT.md (docs/milestones/MILESTONE_3_SEC_DB_IMPLEMENTATION_REPORT.md)
2. MILESTONE_2_1_CLOSURE_REPORT.md (docs/security/MILESTONE_2_1_CLOSURE_REPORT.md)
3. API_AUTHORIZATION_MATRIX.md (docs/security/API_AUTHORIZATION_MATRIX.md)
4. SECURITY_ARCHITECTURE.md (docs/security/SECURITY_ARCHITECTURE.md)
5. TENANT_ISOLATION_DESIGN.md (docs/security/TENANT_ISOLATION_DESIGN.md)
6. SECURITY_TEST_STRATEGY.md (docs/security/SECURITY_TEST_STRATEGY.md)
7. PERSISTENCE_INVENTORY.md (docs/database/PERSISTENCE_INVENTORY.md)
8. DATABASE_ARCHITECTURE.md (docs/database/DATABASE_ARCHITECTURE.md)
9. POSTGRESQL_LOCAL_SETUP.md (docs/database/POSTGRESQL_LOCAL_SETUP.md)
10. HANA_CLOUD_PRODUCTION_SETUP.md (docs/database/HANA_CLOUD_PRODUCTION_SETUP.md)
11. DB_BINDING_CONFIGURATION.md (docs/database/DB_BINDING_CONFIGURATION.md)
12. DATABASE_MIGRATION_STRATEGY.md (docs/database/DATABASE_MIGRATION_STRATEGY.md)
13. BACKUP_RESTORE_RUNBOOK.md (docs/database/BACKUP_RESTORE_RUNBOOK.md)
14. DATABASE_TEST_STRATEGY.md (docs/database/DATABASE_TEST_STRATEGY.md)

---



# ========================================================
# FILE: docs/milestones/MILESTONE_3_SEC_DB_IMPLEMENTATION_REPORT.md
# ========================================================

# Fiorify — Milestone 3: Enterprise Security & Multi-Tenant Persistence Engineering Implementation Report
**Document Version:** 1.0.0  
**Repository:** `https://github.com/samarth092005/Firorix`  
**Target Branch:** `test-01`  
**Execution Scope:** Milestone 2.1 Closure Gate + SEC-001 through SEC-012 + DB-001 through DB-010  
**Target Environments:** Local Development (PostgreSQL 15+) & Production (SAP HANA Cloud on SAP BTP Cloud Foundry)

---

## 1. Executive Summary & Verification Matrix

Milestone 3 successfully establishes the enterprise security, multi-tenant data isolation, and multi-engine database persistence foundation for the Fiorify SAP Fiori Modernization Platform.

All 12 Security engineering tickets (`SEC-001` through `SEC-012`) and 10 Database engineering tickets (`DB-001` through `DB-010`) have been audited, designed, implemented, tested, and documented.

### Master Verification Matrix

| Ticket | Capability / Requirement | Target Artifact | Verification Status |
| :--- | :--- | :--- | :--- |
| **M2.1 Gate** | Milestone 2.1 Closure Verification | `docs/security/MILESTONE_2_1_CLOSURE_REPORT.md` | **VERIFIED (9/9 Gates Passed)** |
| **SEC-001** | Master API Authorization Matrix | `docs/security/API_AUTHORIZATION_MATRIX.md` | **VERIFIED (50+ Endpoints Audited)** |
| **SEC-002** | Multi-Tenant Query Isolation | `backend/src/routes/assessmentRoutes.js`, stores | **VERIFIED (Cross-tenant queries isolated)** |
| **SEC-003** | Multi-Tenant Data Leak Prevention | `backend/src/infrastructure/db/pool.js` (`withTenantClient`) | **VERIFIED (DISCARD ALL enforced)** |
| **SEC-004** | Protected Security Fields Sanitizer | `backend/src/middleware/securityFieldSanitizer.js` | **VERIFIED (Forbidden fields stripped)** |
| **SEC-005** | Separation of Duties & Overrides | `backend/src/services/assessmentStore.js` | **VERIFIED (Self-approval prevented)** |
| **SEC-006** | Auth State Machine & Fail-Closed Guard | `backend/src/infrastructure/security/authProviderFactory.js` | **VERIFIED (Production requires XSUAA)** |
| **SEC-007** | Durable Token Revocation & Family Rotation | `durableTokenRevocationStore.js`, `refreshTokenService.js` | **VERIFIED (Hashed keys, replay defense)** |
| **SEC-008** | Tamper-Evident SHA-256 Audit Chaining | `backend/src/infrastructure/security/securityAuditLogger.js` | **VERIFIED (Cryptographic integrity intact)** |
| **SEC-009** | Security Audit Action Coverage | `securityAuditLogger.js` (`SECURITY_ACTIONS`) | **VERIFIED (25 distinct actions defined)** |
| **SEC-010** | Request Size Limiting & DoS Protection | `server.js`, `assessmentRoutes.js`, `handoffRoutes.js` | **VERIFIED (100KB body limit enforced)** |
| **SEC-011** | Security Headers & Strict CORS Allowlist | `backend/src/server.js` (`setSecurityHeaders`) | **VERIFIED (CSP, HSTS, X-Frame-Options)** |
| **SEC-012** | Security Documentation & Test Suite | `SECURITY_ARCHITECTURE.md`, `secMasterRegressionSuite.test.js` | **VERIFIED (13/13 tests pass)** |
| **DB-001** | Persistence Inventory & Audit | `docs/database/PERSISTENCE_INVENTORY.md` | **VERIFIED (14 stores audited)** |
| **DB-002** | Multi-Database Persistence Architecture | `docs/database/DATABASE_ARCHITECTURE.md`, `databaseAdapter.js` | **VERIFIED (Vendor-neutral abstraction)** |
| **DB-003** | PostgreSQL Local Setup & Strategy | `docs/database/POSTGRESQL_LOCAL_SETUP.md`, `postgresAdapter.js` | **VERIFIED (Local dev & embedded support)** |
| **DB-004** | SAP HANA Cloud Production Strategy | `docs/database/HANA_CLOUD_PRODUCTION_SETUP.md`, `hanaAdapter.js` | **VERIFIED (Production target architecture)** |
| **DB-005** | Cloud Foundry Service Binding Config | `docs/database/DB_BINDING_CONFIGURATION.md` | **VERIFIED (VCAP_SERVICES parsing)** |
| **DB-006** | Dialect-Aware Schema Migrations | `dialectMigrationRunner.js`, `migrations/postgres`, `migrations/hana` | **VERIFIED (SHA-256 checksums)** |
| **DB-007** | Health, Liveness & Readiness Probes | `systemRoutes.js` (`/health/readiness`, `/health/liveness`) | **VERIFIED (Detailed component health)** |
| **DB-008** | Connection Pooling & Graceful Draining | `server.js`, `pool.js`, adapters | **VERIFIED (Drain on SIGINT/SIGTERM)** |
| **DB-009** | Backup, Restore & DR Runbook | `docs/database/BACKUP_RESTORE_RUNBOOK.md` | **VERIFIED (RPO < 15m, RTO < 1h)** |
| **DB-010** | Database Test Strategy & Verification | `DATABASE_TEST_STRATEGY.md`, `databaseAdapterAndMigrations.test.js` | **VERIFIED (13/13 tests pass)** |

---

## 2. Milestone 2.1 Closure Verification

All 9 acceptance gates from Milestone 2.1 have been confirmed closed:
1. `AuthProviderFactory` fail-closed production validation.
2. Cryptographic token revocation store with SHA-256 token hash indexing.
3. Refresh token family rotation with automatic replay attack invalidation.
4. Comprehensive secret redaction on audit details.
5. Insecure fallback elimination (hardcoded dev tokens strictly blocked in production).
6. Cross-tenant spoofing prevention (`X-Tenant-Id` rejected for non-admin users).
7. Deny-by-default route authorization.
8. RS256 JWT signature verification for SAP BTP XSUAA.
9. Comprehensive test suite (`milestone2_1HardeningSuite.test.js`) passing 100%.

Refer to [MILESTONE_2_1_CLOSURE_REPORT.md](file:///c:/Users/samarth/firorix/docs/security/MILESTONE_2_1_CLOSURE_REPORT.md) for full audit evidence.

---

## 3. Security Implementation Highlights (SEC-001 to SEC-012)

- **Client-Controlled Security Field Sanitization (`securityFieldSanitizer.js`):** Intercepts client payloads across assessment, handoff, and generation project routes, stripping `createdBy`, `tenantId`, `roles`, `isAdmin`, `approvalStatus`, and `architectApproved`.
- **Separation of Duties:** Enforces that an assessment creator cannot approve their own assessment (`SEPARATION_OF_DUTIES_VIOLATION`). Administrative overrides require explicit authenticated admin privileges.
- **Enterprise Security Headers (`server.js`):** Injected into every HTTP response:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'; ...`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (in production / HTTPS)
- **100KB Request Body Limit:** Streaming length guard aborts malicious oversized payloads with HTTP 413 `PAYLOAD_TOO_LARGE`.

---

## 4. Database Architecture & Multi-Engine Implementation (DB-001 to DB-010)

- **Vendor-Neutral Database Adapter Layer (`DatabaseAdapter`):**
  - `PostgresAdapter`: Manages PostgreSQL connections, parameter binding (`$1, $2`), and `withTenantClient` session context.
  - `HanaAdapter`: Manages SAP HANA Cloud connections, parses `VCAP_SERVICES`, enforces SSL (`encrypt: true`, `sslValidateCertificate: true`), and adapts query placeholders to HANA positional parameters (`?`).
  - `DatabaseAdapterFactory`: Dispatches adapters based on environment. **In production (`NODE_ENV=production`), PostgreSQL is strictly forbidden (`FATAL_PRODUCTION_DATABASE_MISMATCH`) and SAP HANA Cloud is required.**
- **Dialect-Aware Migration Runner (`DialectMigrationRunner`):** Discovers dialect-specific migrations (`migrations/postgres` vs `migrations/hana`), validates SHA-256 checksums, and manages forward/rollback transactions.
- **Health & Readiness Probes (`/api/v1/health/readiness`, `/api/v1/health/liveness`):** Evaluates database connection latency, migration completion status (`UP_TO_DATE`), and BTP destination configuration.
- **Graceful Shutdown:** Drains connection pools on `SIGTERM` / `SIGINT`.

---

## 5. SAP ERP S21 Safety Verification

> [!IMPORTANT]
> **Read-Only Verification:**
> - SAP S21 user `int_samarth` possesses administrative privileges on SAP system S21.
> - Fiorify's database engine connects strictly to an isolated SAP HANA Cloud HDI container or schema.
> - Zero tables, views, or DDIC objects were created, modified, or deleted in S21.
> - Zero mutating HTTP calls (`POST`, `PUT`, `DELETE`) were dispatched to S21. All interactions are strictly read-only catalog inspections via the BTP Destination service.

---

## 6. Test Suite Execution Summary

```
================================================================================
Test Suite Execution Results
================================================================================
1. backend/scripts/check-syntax.js
   Result: [PASSED] All 206 backend JavaScript files passed syntax verification.

2. backend/test/secMasterRegressionSuite.test.js
   Result: 13 / 13 tests passed (100%)

3. backend/test/databaseAdapterAndMigrations.test.js
   Result: 13 / 13 tests passed (100%)

4. backend/test/milestone2_1HardeningSuite.test.js
   Result: 14 / 14 tests passed (100%)

5. backend/test/authIntegrationSuite.test.js
   Result: 26 / 26 tests passed (100%)

6. backend/test/assessmentLifecycle.test.js
   Result: 8 / 8 tests passed (100%)

7. backend/test/assessmentPersistence.test.js
   Result: 13 / 13 tests passed (100%)

8. backend/test/s1PersistenceFoundation.test.js
   Result: 13 / 13 tests passed (100%)
================================================================================
TOTAL VERIFIED TESTS: 100 / 100 passed (100% Success Rate)
================================================================================
```

---

## 7. Sign-Off & Next Steps

Milestone 2.1 Closure Gate and Milestone 3 (SEC-001 through SEC-012 and DB-001 through DB-010) are formally complete. The persistence, multi-tenancy, and security foundation is hardened and ready for Milestone 4 (SAP BTP Cloud Foundry Deployment & Live Verification).




# ========================================================
# FILE: docs/security/MILESTONE_2_1_CLOSURE_REPORT.md
# ========================================================

# FIORIFY — MILESTONE 2.1 CLOSURE VERIFICATION REPORT

**Repository:** `https://github.com/samarth092005/Firorix`  
**Product:** Fiorify — SAP Fiori Modernization Tool  
**Target Branch:** `test-01`  
**Verification Date:** November 15, 2026  
**Auditor:** Principal Software Architect & Enterprise Application Security Architect  

---

## 1. Executive Summary

Milestone 2.1 focuses on security hardening, authentication lifecycle completion, fail-closed production guarantees, and separation of duties enforcement across Fiorify. All requirements from Milestone 2 and Milestone 2.1 have been audited, implemented, and verified against rigorous automated test suites.

Zero production fallbacks to local/in-memory security primitives are permitted. Production deployments strictly require SAP BTP XSUAA authentication and fail closed when tenant claims or identity assertions are missing.

---

## 2. Milestone 2.1 Closure Gate Checklist

| Item | Requirement | Verification Method | Status | Notes |
|------|-------------|---------------------|--------|-------|
| **1** | Token Revocation Store (`TokenRevocationStore`) | `backend/src/infrastructure/security/tokenRevocationStore.js`, tested via `authIntegrationSuite.test.js` & `milestone2_1HardeningSuite.test.js` | **VERIFIED** | SHA-256 token hashing, TTL tracking, automatic expired entry pruning. |
| **2** | Refresh Token Rotation & Replay Defense | `backend/src/infrastructure/security/refreshTokenService.js`, tested via `milestone2_1HardeningSuite.test.js` | **VERIFIED** | 256-bit cryptographic entropy, token family linkage, full-family revocation on reuse attempt. |
| **3** | Production Fail-Closed Auth Provider Factory | `backend/src/infrastructure/security/authProviderFactory.js`, tested via `milestone2_1HardeningSuite.test.js` | **VERIFIED** | Throws `SecurityConfigurationError` when `NODE_ENV === 'production'` and provider is not `SAP_BTP_XSUAA`. |
| **4** | Role Normalization & Separation of Duties | `backend/src/middleware/authMiddleware.js`, tested via `s13SecurityHardening.test.js` | **VERIFIED** | `LEAD_ARCHITECT` normalized to governance persona (`ADMIN`), preventing consultants from approving their own generation requests. |
| **5** | Production Tenant Context Enforcement | `backend/src/middleware/authMiddleware.js`, tested via `s13SecurityHardening.test.js` | **VERIFIED** | Strictly rejects requests missing tenant context with 401 `MISSING_TENANT_CONTEXT` in production; prevents cross-tenant fallback. |
| **6** | Redaction of Sensitive Material | `backend/src/services/authService.js`, tested via `sec01Security.test.js` | **VERIFIED** | Broadened regex covers refresh tokens, private keys, certificates, bearer tokens, API secrets, and cookies. |
| **7** | Security Audit Action Taxonomy | `backend/src/infrastructure/security/securityAuditLogger.js` | **VERIFIED** | Full 25-action taxonomy supported, HMAC-SHA256 tampering detection, strict correlation IDs. |
| **8** | Frontend Brand Normalization | `frontend/src/features/landing/LandingPage.tsx` | **VERIFIED** | All user-facing strings standardized to canonical **Fiorify**. |
| **9** | Automated Verification & Syntax Checks | `check-syntax.js`, Node test runner, Vitest, Vite build | **VERIFIED** | 205 backend files syntax checked (100%), 76 backend security tests passed (100%), 214 frontend tests passed (100%), 0 TypeScript errors. |

---

## 3. Formal Gate Decision

**Verdict: CLOSED & APPROVED FOR MILESTONE 3**

The security and identity foundation is verified, robust, and meets all enterprise compliance criteria for SAP BTP Cloud Foundry deployment.




# ========================================================
# FILE: docs/security/API_AUTHORIZATION_MATRIX.md
# ========================================================

# FIORIFY — API AUTHORIZATION & ACCESS CONTROL MATRIX

**Version:** 1.0.0  
**Status:** Canonical & Enforced  
**Audit Scope:** All REST API Endpoints in Fiorify Core Backend  
**Environments:** Local (Development/Demo) & SAP BTP Cloud Foundry (Production)

---

## 1. Principles of Access Control in Fiorify

1. **Deny-by-Default:** Any unauthenticated endpoint or action not explicitly registered as public is rejected with `401 Unauthorized`.
2. **Tenant Scoping:** All stateful operations, database records, and query filters MUST resolve and enforce `tenantId`. Cross-tenant record access is strictly forbidden.
3. **Role Normalization & Separation of Duties (SoD):**
   - `SAP_CONSULTANT`: Read/discovery, assessment authoring, generation project staging. Forbidden from self-approving assessments or triggering deployment plans.
   - `DEVELOPER`: CDS/UI5 code generation, sandbox preview, artifact editing.
   - `LEAD_ARCHITECT` / `ADMIN`: Architectural governance, approval of fit-gap assessments, catalogue sync/rollback, deployment authorization.
   - `VIEWER`: Read-only reporting and dashboard inspection.
4. **Protected Security Fields:** Client requests MUST NOT inject or mutate security metadata (`createdBy`, `creatorRole`, `tenantId`, `approvedBy`, `approvalStatus`, `approvalSignature`, `isAdmin`, `roles`).

---

## 2. Master Route Authorization Matrix

| Method | Endpoint | Required Authentication | Roles / Personas | Required Permission | Tenant Scope | Sensitive Data | State Mutating |
|---|---|---|---|---|---|---|---|
| **GET** | `/api/v1/health` | Public | Any | None | Global | No | No |
| **POST** | `/api/v1/auth/login` | Public | Any | None | Contextual | Auth tokens | Yes (Session) |
| **POST** | `/api/v1/auth/logout` | Authenticated | Any authenticated | None | Tenant-bound | Refresh token | Yes (Revocation) |
| **GET** | `/api/v1/auth/provider-info` | Public | Any | None | Global | No | No |
| **GET** | `/api/v1/auth/me` | Authenticated | Any authenticated | None | User profile | User details | No |
| **POST** | `/api/v1/system/reset-demo` | Authenticated | `ADMIN` | None | Tenant / Demo | System state | Yes |
| **GET** | `/api/v1/security/audit` | Authenticated | `ADMIN`, `LEAD_ARCHITECT` | `Fiorify.audit.read` | Tenant-scoped | Audit trail | No |
| **GET** | `/api/v1/systems` | Authenticated | Any authenticated | None | Tenant-scoped | SAP Config | No |
| **POST** | `/api/v1/systems` | Authenticated | `SAP_CONSULTANT`, `ADMIN`, `LEAD_ARCHITECT` | None | Tenant-scoped | Connection info | Yes |
| **GET** | `/api/v1/systems/:id` | Authenticated | Any authenticated | None | Tenant-scoped | System info | No |
| **POST** | `/api/v1/systems/:id/diagnostics` | Authenticated | `SAP_CONSULTANT`, `ADMIN`, `LEAD_ARCHITECT` | None | Tenant-scoped | Diagnostic logs | Yes |
| **GET** | `/api/v1/gateway-smoke-test` | Authenticated | `ADMIN` / Admin Secret | None | Global / S21 | SAP Catalog | No (Read-only) |
| **GET** | `/api/v1/gateway/services` | Authenticated | `ADMIN` / Admin Secret | None | Global / S21 | OData Catalog | No |
| **GET** | `/api/v1/gateway/services/:id/metadata` | Authenticated | `ADMIN` / Admin Secret | None | Global / S21 | EDMX Metadata | No |
| **GET** | `/api/v1/fiori-catalogue/apps/:appId` | Authenticated | Any authenticated | None | Global / Catalogue | Catalogue data | No |
| **GET** | `/api/v1/fiori-catalogue/search` | Authenticated | Any authenticated | None | Global / Catalogue | Catalogue data | No |
| **POST** | `/api/v1/fiori-catalogue/import` | Authenticated | `ADMIN` / Admin Secret | None | Global | File upload | Yes |
| **POST** | `/api/v1/fiori-catalogue/sync` | Authenticated | `ADMIN` | None | Global | Catalogue sync | Yes |
| **POST** | `/api/v1/fiori-catalogue/rollback` | Authenticated | `ADMIN` / Admin Secret | None | Global | Catalogue state | Yes |
| **GET** | `/api/v1/fiori-catalogue/status` | Authenticated | Any authenticated | None | Global | Metrics | No |
| **POST** | `/api/v1/discovery/transaction` | Authenticated | Any authenticated | None | Tenant-scoped | Transaction data | Yes (Search) |
| **POST** | `/api/v1/discovery/executions` | Authenticated | `SAP_CONSULTANT`, `DEVELOPER`, `ADMIN` | None | Tenant-scoped | Discovery state | Yes |
| **GET** | `/api/v1/discovery/executions` | Authenticated | Any authenticated | None | Tenant-scoped | Discovery state | No |
| **GET** | `/api/v1/discovery/executions/:id` | Authenticated | Any authenticated | None | Tenant-scoped | Discovery detail | No |
| **POST** | `/api/v1/discovery/match` | Authenticated | Any authenticated | None | Tenant-scoped | Matching results | Yes |
| **POST** | `/api/v1/discovery/mcp-assisted` | Authenticated | Any authenticated | None | Tenant-scoped | MCP evidence | Yes |
| **POST** | `/api/v1/fitgap/assess` | Authenticated | Any authenticated | None | Tenant-scoped | Fit-gap analysis | Yes |
| **POST** | `/api/v1/recommendations/generate` | Authenticated | Any authenticated | None | Tenant-scoped | Recommendations | Yes |
| **POST** | `/api/v1/assessments` | Authenticated | `SAP_CONSULTANT`, `DEVELOPER`, `ADMIN` | None | Tenant-scoped | Governance record | Yes |
| **GET** | `/api/v1/assessments` | Authenticated | Any authenticated | None | Tenant-scoped | Assessments list | No |
| **GET** | `/api/v1/assessments/summary` | Authenticated | Any authenticated | None | Tenant-scoped | Dashboard KPIs | No |
| **GET** | `/api/v1/assessments/:id` | Authenticated | Any authenticated | None | Tenant-scoped | Assessment detail | No |
| **PUT** | `/api/v1/assessments/:id` | Authenticated | `SAP_CONSULTANT`, `ADMIN`, `LEAD_ARCHITECT` | Role-governed | Tenant-scoped | Governance state | Yes |
| **POST** | `/api/v1/assessments/:id/archive` | Authenticated | `ADMIN`, `LEAD_ARCHITECT` | None | Tenant-scoped | Assessment state | Yes |
| **GET** | `/api/v1/assessments/:id/audit` | Authenticated | Any authenticated | None | Tenant-scoped | Audit entries | No |
| **POST** | `/api/v1/handoffs` | Authenticated | `SAP_CONSULTANT`, `DEVELOPER`, `ADMIN` | None | Tenant-scoped | Handoff bundle | Yes |
| **GET** | `/api/v1/handoffs` | Authenticated | Any authenticated | None | Tenant-scoped | Handoffs list | No |
| **GET** | `/api/v1/handoffs/:id` | Authenticated | Any authenticated | None | Tenant-scoped | Handoff detail | No |
| **POST** | `/api/v1/generation/projects` | Authenticated | `DEVELOPER`, `ADMIN`, `LEAD_ARCHITECT` | `generation.manage` | Tenant-scoped | Project metadata | Yes |
| **GET** | `/api/v1/generation/projects` | Authenticated | Any authenticated | `generation.manage` | Tenant-scoped | Project metadata | No |
| **GET** | `/api/v1/generation/projects/:id` | Authenticated | Any authenticated | `generation.manage` | Tenant-scoped | Project code | No |
| **POST** | `/api/v1/generation/projects/:id/synthesis` | Authenticated | `DEVELOPER`, `ADMIN`, `LEAD_ARCHITECT` | `generation.manage` | Tenant-scoped | Generated code | Yes |
| **POST** | `/api/v1/generation/projects/:id/deployment-plans` | Authenticated | `ADMIN`, `LEAD_ARCHITECT` | `generation.manage` | Tenant-scoped | Deployment plan | Yes |
| **POST** | `/api/v1/generation/projects/:id/deployment-plans/:planId/approve` | Authenticated | `ADMIN`, `LEAD_ARCHITECT` | `generation.manage` | Tenant-scoped | Approval signature | Yes |
| **POST** | `/api/v1/mcp/connect` | Authenticated | `ADMIN` / Admin Secret | None | Global | MCP subprocess | Yes |
| **POST** | `/api/v1/mcp/disconnect` | Authenticated | `ADMIN` / Admin Secret | None | Global | MCP subprocess | Yes |
| **POST** | `/api/v1/mcp/tools/:tool/execute` | Authenticated | `ADMIN` / Admin Secret | None | Global | Tool execution | Yes |
| **GET** | `/api/v1/mcp/status` | Authenticated | Any authenticated | None | Global | Diagnostics | No |
| **GET** | `/api/v1/mcp/tools` | Authenticated | Any authenticated | None | Global | Tool inventory | No |
| **GET** | `/api/v1/mcp/health` | Authenticated | Any authenticated | None | Global | Health status | No |

---

## 3. Separation of Duties Enforcements

- **Assessment Approval:** Only users with `ADMIN` or `LEAD_ARCHITECT` roles can transition an assessment from `PENDING_REVIEW` to `APPROVED`. The assessment creator CANNOT approve their own assessment regardless of elevated role.
- **Generation Initiation:** Requires an approved assessment reference or authorized development initiative.
- **Deployment Plan Approval:** Strictly reserved for `ADMIN` and `LEAD_ARCHITECT`.




# ========================================================
# FILE: docs/security/SECURITY_ARCHITECTURE.md
# ========================================================

# Fiorify Enterprise Security Architecture (SEC-012)
**Document Version:** 1.0.0  
**Target Platform:** SAP Business Technology Platform (BTP) Cloud Foundry  
**Compliance Standard:** SAP Cloud Security Framework & OWASP Top 10 API Security

---

## 1. Executive Summary & Architecture Principles

Fiorify is designed under a **Zero-Trust, Standard-First, and Defense-in-Depth** security philosophy. The platform governs the lifecycle of SAP transaction modernization, fit-gap assessment, and ABAP RESTful Application Programming (RAP) generation while enforcing strict operational boundaries against unauthorized access, tenant data bleeding, and live SAP system corruption.

```
                      [ User / External Client ]
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │         SAP BTP Application Router        │
             │   (TLS Termination, Session Routing, WAF) │
             └─────────────────────┬─────────────────────┘
                                   │
                         JWT Bearer (RS256)
                                   ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    Fiorify Node.js LTS Engine                          │
 │                                                                        │
 │   ┌───────────────────────┐         ┌──────────────────────────────┐   │
 │   │  Auth & Token Gate    │────────▶│ Security Headers & CORS Gate │   │
 │   │ (XSUAA / Local / Demo)│         │(CSP, HSTS, X-Frame-Options)  │   │
 │   └──────────┬────────────┘         └──────────────┬───────────────┘   │
 │              │                                     │                   │
 │              ▼                                     ▼                   │
 │   ┌───────────────────────┐         ┌──────────────────────────────┐   │
 │   │ Field Sanitizer Gate  │────────▶│ RBAC & Permission Middleware │   │
 │   │(Strip Protected Field)│         │ (Deny-by-default Enforcement)│   │
 │   └──────────┬────────────┘         └──────────────┬───────────────┘   │
 │              │                                     │                   │
 │              ▼                                     ▼                   │
 │   ┌────────────────────────────────────────────────────────────┐       │
 │   │               Multi-Tenant Store Boundary                  │       │
 │   │        (Tenant ID filtering on all queries & stores)       │       │
 │   └──────────┬─────────────────────────────────────┬───────────┘       │
 │              │                                     │                   │
 └──────────────┼─────────────────────────────────────┼───────────────────┘
                │                                     │
                ▼                                     ▼
 ┌──────────────────────────────┐   ┌──────────────────────────────────────┐
 │  Local Dev / CI Persistence  │   │  Production SAP BTP Persistence      │
 │  PostgreSQL Engine (pg.Pool) │   │  SAP HANA Cloud (Tenant HDI / Schema)│
 └──────────────────────────────┘   └──────────────────────────────────────┘
```

---

## 2. Security Boundaries & Invariants

| Layer | Security Control | Invariant Enforced |
| :--- | :--- | :--- |
| **Edge / Transport** | TLS 1.3, HSTS (`max-age=31536000`), CSP | HTTP traffic strictly encrypted; frame embedding prevented (`DENY`). |
| **Identity Provider** | SAP BTP XSUAA (JWT RS256) / Local Scrypt | In production, local and demo auth providers are strictly forbidden (`fail-closed`). |
| **Token Lifecycle** | SHA-256 Hashed Token Revocation & Family Tracking | Revoked tokens invalidated cluster-wide; replay attacks trigger family revocation. |
| **API Boundary** | Request Body Size Capping (`100KB`) | Denial-of-Service (DoS) and memory exhaustion attacks rejected with HTTP 413. |
| **Parameter Sanitization** | `sanitizeProtectedFields` | Client-controlled `createdBy`, `tenantId`, `roles`, `isAdmin` stripped before handlers. |
| **Authorization** | Deny-by-default RBAC (`requireRole`, `requirePermission`) | All privileged endpoints require affirmative, authenticated permissions. |
| **Multi-Tenancy** | Strict Tenant Discriminator (`tenantId`) Filtering | Cross-tenant queries return filtered results or HTTP 403 `TenantAccessDenied`. |
| **Audit Trail** | Tamper-Evident SHA-256 Audit Chaining | Audit events cryptographically linked to previous event hashes (`GENESIS` to leaf). |
| **SAP Landscape** | Zero-Modification Read-Only Policy (`int_samarth`) | Zero DDIC/ABAP changes on SAP S21; zero mutating HTTP requests (`POST`/`PUT`/`DELETE`). |

---

## 3. Threat Model & Countermeasures (STRIDE Analysis)

1. **Spoofing Identity:**
   - *Threat:* Malicious client injects falsified user IDs, roles, or tenant IDs via request headers or JSON bodies.
   - *Countermeasure:* Server-authoritative token validation extracts `userId`, `role`, and `tenantId` exclusively from cryptographically verified JWT signatures. `sanitizeProtectedFields` strips client fields.

2. **Tampering with Data:**
   - *Threat:* Alteration of audit trails or bypassing architectural review status.
   - *Countermeasure:* Assessments use SHA-256 linked-list cryptographic chaining. Any modification to a previous event breaks the cryptographic checksum verification.

3. **Repudiation:**
   - *Threat:* Approver denies authorizing a custom RAP application development.
   - *Countermeasure:* Authoritative user context is stamped with ISO 8601 timestamp, approver ID, approver name, and digital hash signature onto both assessment and handoff records.

4. **Information Disclosure:**
   - *Threat:* Tenant A accesses assessments, handoffs, or generation projects belonging to Tenant B.
   - *Countermeasure:* Multi-tenant isolation at route and store levels. `withTenantClient` sets tenant configuration in database session; stores filter on `tenantId`.

5. **Denial of Service (DoS):**
   - *Threat:* Large payloads flood Node.js event loop or exhaust memory.
   - *Countermeasure:* Streaming body length limiter terminates connections exceeding 100KB with HTTP 413. IP rate limiting protects authentication endpoints.

6. **Elevation of Privilege:**
   - *Threat:* Consultant attempts to self-approve a custom build without Lead Architect sign-off.
   - *Countermeasure:* Separation of Duties policy (`SEPARATION_OF_DUTIES_VIOLATION`) strictly forbids assessment creator from approving their own assessment. Build approvals require explicit `BUILD_ARCHITECT_APPROVER` permission.




# ========================================================
# FILE: docs/security/TENANT_ISOLATION_DESIGN.md
# ========================================================

# Fiorify Multi-Tenant Isolation & Boundary Enforcement Design (SEC-002, SEC-003)
**Document Version:** 1.0.0  
**Scope:** Architecture, Data Storage, Connection Pooling & API Isolation

---

## 1. Architectural Strategy

Fiorify supports multi-tenancy across heterogeneous deployment topologies, ranging from dedicated enterprise customer instances to multi-tenant Software-as-a-Service (SaaS) environments deployed on SAP BTP Cloud Foundry.

```
                  Client Request: GET /api/v1/assessments
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ Header: Authorization: Bearer <JWT>   │
                 │ Verified claims: { tenantId: 'T-42' } │
                 └───────────────────┬───────────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │    Auth Context Resolver    │
                      │  currentUser.tenantId='T-42'│
                      └──────────────┬──────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         │                                                       │
         ▼                                                       ▼
 ┌───────────────────────────────┐               ┌───────────────────────────────┐
 │     In-Memory / File Store    │               │  Database Persistence Layer   │
 │                               │               │                               │
 │ records.filter(r =>           │               │ withTenantClient('T-42', cl)  │
 │   r.tenantId === 'T-42'       │               │   SET CONFIG 'app.tenant'     │
 │ )                             │               │   SELECT * FROM assessments   │
 │                               │               │   WHERE tenant_id = 'T-42'    │
 │ Rejects cross-tenant access   │               │   DISCARD ALL on release      │
 └───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. Multi-Tenant Layers of Defense

### Layer 1: Cryptographic Identity & Token Binding
- Tenant identity is derived from verified SAP BTP XSUAA token claims (`zdn` / `tenantId`).
- Forged client request headers (e.g. `X-Tenant-Id`) submitted by non-administrative users are rejected immediately with HTTP 401 `TENANT_SPOOFING_FORBIDDEN`.
- Administrative cross-tenant access is permitted ONLY for authenticated users holding explicit `Fiorify.admin.access` or `Fiorify.tenants.manage` scopes.

### Layer 2: API & Route-Level Guardrails
- Single-entity lookups (`/api/v1/assessments/:id`, `/api/v1/generation/handoff/:id`, `/api/v1/generation/projects/:id`) inspect the entity's stored `tenantId`.
- If the entity's tenant does not match `currentUser.tenantId`, the request is denied with HTTP 403 `TenantAccessDenied`, and a `TENANT_ACCESS_VIOLATION` event is logged to the tamper-evident security audit log.
- Collection queries (`/api/v1/assessments`, `/api/v1/generation/handoff`, `/api/v1/generation/projects`) mandate `tenantId` query parameter scoping.

### Layer 3: Store & Repository Enforcement
- All 14 persistent stores (`AssessmentStore`, `GenerationHandoffStore`, `GenerationProjectStore`, etc.) inject `tenantId` as a mandatory filter in `list()`, `getById()`, `update()`, and `delete()`.
- Records created through stores are stamped with `tenantId` resolved from `currentUser.tenantId`.

### Layer 4: Connection Pool Isolation (`withTenantClient`)
- In PostgreSQL, multi-tenant database sessions execute within `withTenantClient(tenantId, fn)`:
  1. `BEGIN;`
  2. `SELECT set_config('app.current_tenant', $1, true);`
  3. Execute queries with Row-Level Security (RLS) policies.
  4. `COMMIT;`
  5. **`DISCARD ALL;`** in the `finally` block before connection release back to the pool.
- In SAP HANA Cloud, tenant isolation is maintained via dedicated HDI container schemas or parameterised tenant filters with session variable resets.

---

## 3. Verified Security Tests

1. `secMasterRegressionSuite.test.js`:
   - Tenant Alpha creates assessment `VA01`; Tenant Beta creates assessment `ME21N`.
   - Query as Tenant Alpha yields ONLY `VA01`.
   - Query as Tenant Beta yields ONLY `ME21N`.
   - Cross-tenant access attempt returns zero records or HTTP 403 `TenantAccessDenied`.
2. `authIntegrationSuite.test.js`:
   - Non-admin tenant spoofing rejected with HTTP 401 `TENANT_SPOOFING_FORBIDDEN`.
   - Authenticated Admin user cross-tenant management verified.




# ========================================================
# FILE: docs/security/SECURITY_TEST_STRATEGY.md
# ========================================================

# Fiorify Security Test Strategy & Quality Assurance Plan (SEC-012)
**Document Version:** 1.0.0  
**Test Harness:** Node.js LTS Native Test Runner (`node:test`)  
**Scope:** Automated Security Regression, RBAC, Multi-Tenancy, Token Lifecycles & Audit Logging

---

## 1. Test Suite Architecture

The security verification framework consists of dedicated, non-overlapping test suites designed for local execution, CI/CD verification, and production release gates:

| Suite Name | Test File | Scope & Invariants Verified |
| :--- | :--- | :--- |
| **Milestone 2 Auth Integration** | `backend/test/authIntegrationSuite.test.js` | Provider factory, RS256 token verification, local scrypt, demo sandbox, RBAC hierarchy, token revocation. |
| **Milestone 2.1 Hardening** | `backend/test/milestone2_1HardeningSuite.test.js` | Token hash indexing, refresh token family rotation, replay attack defense, secret redaction, audit chain verification. |
| **Security Master Regression** | `backend/test/secMasterRegressionSuite.test.js` | Protected field sanitization (SEC-004), multi-tenant isolation (SEC-002), separation of duties (SEC-005), 100KB body limit (SEC-010), security headers (SEC-011). |
| **Database Adapter & Probes** | `backend/test/databaseAdapterAndMigrations.test.js` | DatabaseAdapter abstraction, production fail-closed enforcement, VCAP_SERVICES binding, dialect migrations, readiness probe. |

---

## 2. Test Execution Commands

```bash
# 1. Syntax Verification across all backend files
node backend/scripts/check-syntax.js

# 2. Execute Security Master Regression Suite
node --test backend/test/secMasterRegressionSuite.test.js

# 3. Execute Milestone 2.1 Hardening Suite
node --test backend/test/milestone2_1HardeningSuite.test.js

# 4. Execute Authentication Integration Suite
node --test backend/test/authIntegrationSuite.test.js

# 5. Execute Database Engineering & Readiness Suite
node --test backend/test/databaseAdapterAndMigrations.test.js
```

---

## 3. Mandatory Security Verification Checkpoints

1. **Deny-by-Default Authorization:** Every route outside the explicit public allowlist (`/`, `/health`, `/health/liveness`, `/health/readiness`, `/auth/login`, `/auth/provider-info`) requires a valid token.
2. **Client Field Tampering Prevention:** Forbidden fields (`tenantId`, `createdBy`, `roles`, `isAdmin`, `approvalStatus`) are stripped from request bodies.
3. **Separation of Duties:** Assessment creators cannot approve their own assessments; administrative overrides require explicit `isOverride: true` and admin privileges.
4. **Token Family Replay Invalidation:** Using an already-consumed refresh token immediately invalidates the entire token family.
5. **Fail-Closed Production Invariant:** If `NODE_ENV === 'production'`, non-XSUAA providers and non-HANA database adapters abort server startup.




# ========================================================
# FILE: docs/database/PERSISTENCE_INVENTORY.md
# ========================================================

# Fiorify Persistence Inventory & Storage Audit (DB-001)
**Document Version:** 1.0.0  
**Audit Scope:** 14 State & Persistence Stores across Fiorify Backend

---

## 1. Master Persistence Inventory Matrix

| # | Store Name | Primary Entity | Storage Location / Table | Key Structure | Tenant Isolation | Lifecycle & Durability |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `AssessmentStore` | Fit-Gap Assessments | `assessments` (table) / `data/assessments.json` | `id` (e.g. `ASM-VA01-001`) | Filter by `tenant_id` column; session context | Persistent; atomic temp file or DB row; SHA-256 audit chained |
| **2** | `GenerationHandoffStore` | Studio Handoffs | `generation_handoffs` (table) / `data/generationHandoffs.json` | `handoff_id` (UUID/slug) | Stored `tenantId`; filtered in `get`/`list` | Persistent; synchronized with Assessment approval state |
| **3** | `GenerationProjectStore` | Generation Projects | `generation_projects` (table) / `data/generation-projects/<id>/project.json` | `projectId` (e.g. `GEN-VA01-XXXX`) | Canonical folder per project; `tenantId` checked | Persistent; multi-file canonical project store with .bak recovery |
| **4** | `OfficialFioriCatalogueAdapter` | Standard Fiori Apps | `fiori_catalog_apps` (table) / memory catalog cache | `app_id` (e.g. `F0859`) | Shared system catalogue; cross-tenant read-only | Seeded from SAP Fiori Apps Reference Library (FAL) |
| **5** | `SapTransactionDiscoveryAdapter` | S21 T-Code Metadata | `transaction_profiles` (table) / cache | `(tcode, tenant_id, system_id)` | Tenant and SAP system scoped | Read-only SAP S21 metadata inspection; local cache |
| **6** | `SystemRegistry` | SAP Landscape Profiles | `sap_system_profiles` (table) / memory | `id` (e.g. `SYS-S21-200`) | Filtered by `tenant_id` | Persistent; BTP destination references; connection metadata |
| **7** | `SecurityAuditLogger` | Tamper-Evident Audit | `security_audit_events` (table) / memory fallback | `event_id` (e.g. `SEC-AUD-...`) | Stored `tenant_id`; filtered per tenant | Append-only; cryptographic SHA-256 hash chaining |
| **8** | `TokenRevocationStore` | Revoked JWT Hashes | `token_revocations` (table) / memory cache | `token_hash` (SHA-256 hex) | Indexed by hash; stores `tenantId` & `userId` | Expired records purged periodically; cluster-wide distributed |
| **9** | `RefreshTokenService` | Refresh Token Families | `refresh_tokens` (table) / memory cache | `token_hash` (SHA-256 hex) | Family scoped to `(userId, tenantId)` | One-time use rotation; replay detection revokes family |
| **10** | `SpecificationVersioningService` | Spec Snapshots | `generation_projects.project_data` / files | `version` (integer sequence) | Scoped to parent `projectId` | Versioned immutable snapshots with diff comparison |
| **11** | `DataModelService` | CDS Model Drafts | `generation_projects.project_data.dataModel` | `projectId` / `cdsEntity` | Scoped to parent `projectId` | Clean Core Tier-1/Tier-2 compliant CDS entity drafts |
| **12** | `RequirementsService` | Business Requirements | `generation_projects.project_data.requirements` | `projectId` | Scoped to parent `projectId` | User story and acceptance criteria structured models |
| **13** | `DeploymentRepository` | Cloud Foundry Logs | `deployment_records` (table) / files | `deployment_id` | Scoped to `tenantId` and `projectId` | Deployment manifest and execution telemetry tracking |
| **14** | `ArtifactStorage` | Generated Code Files | `project_artifacts` (table) / file system | `artifact_id` (SHA-256 checksum) | Scoped to `(projectId, tenantId)` | Content-addressed storage for ABAP CDS, UI5, manifests |

---

## 2. Store Migration & Storage Engine Summary

- **Local Development Mode:** Stores operate with local PostgreSQL or embedded fallback (`embedded-postgres`), with atomic JSON file persistence backups.
- **Production Mode (SAP BTP Cloud Foundry):** All stateful tables (`assessments`, `generation_handoffs`, `generation_projects`, `security_audit_events`, `token_revocations`, `refresh_tokens`, `project_artifacts`) reside in **SAP HANA Cloud**.




# ========================================================
# FILE: docs/database/DATABASE_ARCHITECTURE.md
# ========================================================

# Fiorify Multi-Database Persistence Architecture (DB-002)
**Document Version:** 1.0.0  
**Supported Engines:** Local Development: PostgreSQL 15+ | Production Target: SAP HANA Cloud

---

## 1. Architectural Strategy & Abstraction

Fiorify adopts a vendor-neutral database abstraction layer (`DatabaseAdapter`) to bridge local development agility with enterprise SAP BTP compliance.

```
                      [ Fiorify Repositories & Stores ]
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │    DatabaseAdapterFactory   │
                      │  (Environment Resolution)   │
                      └──────────────┬──────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         │                                                       │
         ▼                                                       ▼
 ┌───────────────────────────────┐               ┌───────────────────────────────┐
 │        PostgresAdapter        │               │          HanaAdapter          │
 │                               │               │                               │
 │ • Local development / CI      │               │ • Production on SAP BTP       │
 │ • Driver: pg (Pool)           │               │ • Driver: @sap/hana-client    │
 │ • Dialect: postgres           │               │ • Dialect: hana               │
 │ • Placeholder: $1, $2, ...    │               │ • Parameter: ?, ?, ...        │
 │ • Session: set_config +       │               │ • Session: Schema / Context   │
 │   DISCARD ALL on release      │               │ • Encryption: TLS Enforced    │
 └───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. Fail-Closed Production Invariant

> [!CAUTION]
> In production environments (`NODE_ENV=production`), Fiorify strictly rejects PostgreSQL as the persistence engine.
> The platform MUST be bound to **SAP HANA Cloud** via Cloud Foundry `VCAP_SERVICES`.
> If no HANA service binding exists, the application server aborts startup immediately (`MISSING_PRODUCTION_HANA_BINDING`).

---

## 3. Zero-Modification Policy on SAP System S21

> [!IMPORTANT]
> The SAP ERP system **`S21`** (Client 200) contains productive and baseline SAP objects accessed by administrative user `int_samarth`.
> 
> **NON-NEGOTIABLE SAFETY DIRECTIVE:**
> - Fiorify's database connection to SAP HANA Cloud connects to a **dedicated application HDI container / schema** separate from S21.
> - **NEVER** create database tables, views, or DDIC objects in S21.
> - All Fiorify tables (`assessments`, `generation_handoffs`, `generation_projects`, `security_audit_events`, `token_revocations`, `refresh_tokens`) are isolated to Fiorify's managed database container.

---

## 4. Connection Pooling & Resource Management

| Feature | PostgreSQL (`PostgresAdapter`) | SAP HANA Cloud (`HanaAdapter`) |
| :--- | :--- | :--- |
| **Connection Pool** | `pg.Pool` (Max 20 connections) | `@sap/hana-client` Connection Pooling |
| **Idle Timeout** | 30,000 ms | 60,000 ms |
| **Connection Timeout** | 5,000 ms | 10,000 ms |
| **Encryption** | TLS optional for local, required for remote | TLS strictly enforced (`encrypt: true`, `sslValidateCertificate: true`) |
| **Tenant Session Cleanup** | `DISCARD ALL;` executed in `finally` | Session variables unset on connection release |
| **Drainage on Shutdown** | Pool drained on `SIGTERM` / `SIGINT` | Client disconnected cleanly on process termination |




# ========================================================
# FILE: docs/database/POSTGRESQL_LOCAL_SETUP.md
# ========================================================

# Fiorify PostgreSQL Local Setup & Development Strategy (DB-003)
**Document Version:** 1.0.0  
**Target Environment:** Local Workstations, Developer Sandboxes & CI Workflows

---

## 1. Overview

For rapid local development, unit testing, and continuous integration pipelines where an active SAP BTP account is unavailable, Fiorify provides first-class support for **PostgreSQL 15+**.

---

## 2. Configuration Options

### Option A: Local Docker Container (Recommended)
```bash
# Start local PostgreSQL container with persistent volume
docker run --name fiorify-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=fiorify \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### Option B: Native Host Installation
Install PostgreSQL 15 or 16 on your local machine and create the application databases:
```sql
CREATE DATABASE fiorify;
CREATE DATABASE fiorify_test;
```

### Option C: Embedded-Postgres Fallback (Automated)
If no local PostgreSQL instance is running on port 5432, Fiorify's `DatabasePool` automatically initialises a localized embedded PostgreSQL instance on port `54334` stored under `backend/data/db/` when `FIORIFY_ALLOW_EMBEDDED_PG=true` or in test mode.

---

## 3. Environment Variables Configuration (`backend/.env`)

```ini
# Persistence engine mode
FIORIFY_PERSISTENCE=postgres

# PostgreSQL Connection String (takes precedence if defined)
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/fiorify

# Discrete parameters (fallback if DATABASE_URL is not set)
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=fiorify

# Embedded fallback toggle
FIORIFY_ALLOW_EMBEDDED_PG=true
```

---

## 4. Running Migrations & Verification

```bash
# 1. Check syntax
node backend/scripts/check-syntax.js

# 2. Run schema migrations
node -e "import('./src/infrastructure/db/migrator/dialectMigrationRunner.js').then(m => new m.DialectMigrationRunner({ dialect: 'postgres' }).migrateUp()).then(console.log)"

# 3. Verify health & readiness probe
curl http://localhost:4004/api/v1/health/readiness
```




# ========================================================
# FILE: docs/database/HANA_CLOUD_PRODUCTION_SETUP.md
# ========================================================

# Fiorify SAP HANA Cloud Production Architecture & Setup (DB-004)
**Document Version:** 1.0.0  
**Target Environment:** SAP BTP Cloud Foundry Production Landscape  
**Database Engine:** SAP HANA Cloud (QRC 2026+)

---

## 1. Production Architecture Overview

In productive SAP BTP deployments, Fiorify uses **SAP HANA Cloud** as its exclusive, authoritative data store.

```
                      ┌──────────────────────────────────────────┐
                      │    SAP BTP Cloud Foundry Environment     │
                      │                                          │
                      │   ┌──────────────────────────────────┐   │
                      │   │       Fiorify Node.js App        │   │
                      │   │         (App Execution)          │   │
                      │   └─────────────────┬────────────────┘   │
                      └─────────────────────┼────────────────────┘
                                            │
                          VCAP_SERVICES Service Binding
                          TLS Encrypted (Port 443)
                                            │
                                            ▼
                      ┌──────────────────────────────────────────┐
                      │           SAP HANA Cloud Tenant          │
                      │                                          │
                      │   ┌──────────────────────────────────┐   │
                      │   │  Fiorify Dedicated HDI Schema    │   │
                      │   │                                  │   │
                      │   │ • assessments                    │   │
                      │   │ • generation_handoffs            │   │
                      │   │ • generation_projects            │   │
                      │   │ • security_audit_events          │   │
                      │   │ • token_revocations              │   │
                      │   │ • refresh_tokens                 │   │
                      │   │ • schema_migrations              │   │
                      │   └──────────────────────────────────┘   │
                      │                                          │
                      │   ┌──────────────────────────────────┐   │
                      │   │   SAP S21 Live Landscape Schema  │   │
                      │   │        [ STRICT READ-ONLY ]      │   │
                      │   │   Zero DDL / Zero Mutating DML   │   │
                      │   └──────────────────────────────────┘   │
                      └──────────────────────────────────────────┘
```

---

## 2. SAP S21 Zero-Modification Invariant

> [!CAUTION]
> Under no circumstances does Fiorify mutate the SAP system S21.
> Fiorify's production tables are deployed into a dedicated SAP HANA Cloud database schema (or HDI Container) isolated from any S/4HANA application tables.
> The SAP user `int_samarth` possesses administrative privileges on S21; all operations targeting S21 are strictly limited to HTTP GET read-only catalog inspections via the BTP Destination service.

---

## 3. Cloud Foundry Provisioning & Service Binding (`mta.yaml`)

```yaml
resources:
  # SAP HANA Cloud HDI Container / Database Instance
  - name: fiorify-hana-db
    type: com.sap.xs.hdi-container
    parameters:
      service: hana
      service-plan: hdi-shared
    properties:
      hdi-container-name: ${service-name}

  # XSUAA Security Service
  - name: fiorify-xsuaa-auth
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
      path: ./xs-security.json
```

---

## 4. Production Connection Properties & Security

- **Encryption:** Mandatory (`encrypt: true`, `sslValidateCertificate: true`).
- **Cryptographic Provider:** OpenSSL (`sslCryptoProvider: 'openssl'`).
- **Connection Port:** Port 443 with TLS 1.3.
- **Fail-Closed Startup Guard:** If the application boots with `NODE_ENV=production` and does not detect the `hana` binding, it terminates with code 1 (`MISSING_PRODUCTION_HANA_BINDING`).




# ========================================================
# FILE: docs/database/DB_BINDING_CONFIGURATION.md
# ========================================================

# Fiorify Cloud Foundry Database Service Binding Configuration (DB-005)
**Document Version:** 1.0.0  
**Target Environment:** SAP BTP Cloud Foundry Runtime

---

## 1. Cloud Foundry VCAP_SERVICES Binding Resolution

In SAP BTP Cloud Foundry, service credentials are injected by the runtime via the `VCAP_SERVICES` environment variable.

Fiorify's `HanaAdapter` and `DatabaseAdapterFactory` parse `VCAP_SERVICES` automatically:

```json
{
  "hana": [
    {
      "label": "hana",
      "name": "fiorify-hana-db",
      "plan": "hdi-shared",
      "credentials": {
        "host": "c33b285f-hana.prod.eu10.hanacloud.ondemand.com",
        "port": "443",
        "user": "FIORIFY_HDI_OWNER",
        "password": "****************",
        "schema": "FIORIFY_PROD_SCHEMA",
        "url": "jdbc:sap://c33b285f-hana.prod.eu10.hanacloud.ondemand.com:443?encrypt=true&validateCertificate=true",
        "certificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
      }
    }
  ]
}
```

---

## 2. Binding Extraction Priority Hierarchy

1. **Explicit Options Object:** Configured directly in application code or integration test fixture (`options.connectionParams`).
2. **Cloud Foundry VCAP_SERVICES:** First binding matching label `'hana'` or `'hanatrial'`.
3. **Discrete Environment Variables:**
   - `HANA_HOST`
   - `HANA_PORT` (Default: 443)
   - `HANA_USER`
   - `HANA_PASSWORD`
   - `HANA_SCHEMA`
   - `HANA_ENCRYPT` (Default: true)
   - `HANA_SSL_VALIDATE` (Default: true)

---

## 3. Validation Errors & Diagnostics

| Error Condition | Error Code | Action / Remediation |
| :--- | :--- | :--- |
| `NODE_ENV=production` with `dialect=postgres` | `FATAL_PRODUCTION_DATABASE_MISMATCH` | Change configuration to SAP HANA Cloud; PostgreSQL is strictly prohibited in production. |
| `NODE_ENV=production` with missing `VCAP_SERVICES` | `MISSING_PRODUCTION_HANA_BINDING` | Bind the `fiorify-hana-db` service instance to the application in BTP cockpit or `mta.yaml`. |
| Connection timeout or network partition | `DATABASE_CONNECTION_TIMEOUT` | Verify BTP egress network security groups and Cloud Connector availability. |




# ========================================================
# FILE: docs/database/DATABASE_MIGRATION_STRATEGY.md
# ========================================================

# Fiorify Database Schema Migration Strategy (DB-006)
**Document Version:** 1.0.0  
**Supported Engines:** PostgreSQL 15+ (Local/CI) and SAP HANA Cloud (Production)

---

## 1. Migration Architecture Principles

Fiorify implements an engine-specific, dialect-aware schema migration runner (`DialectMigrationRunner`):

1. **Dialect Separation:** Migrations are organized into engine-specific directories:
   - `backend/src/infrastructure/db/migrations/postgres/`
   - `backend/src/infrastructure/db/migrations/hana/`
2. **Cryptographic Checksum Validation:** Each migration script's contents are hashed with SHA-256 upon execution. If an applied migration script is modified after being run, the runner refuses to proceed without explicit operator repair.
3. **Transactional Execution:** Each migration runs inside a dedicated database transaction (`BEGIN ... COMMIT`), rolling back immediately on syntax or constraint errors.
4. **Idempotence & Reversibility:** Every forward migration (`<version>_<name>.sql`) is paired with an equivalent rollback script (`<version>_<name>.down.sql`).

---

## 2. Directory Structure

```
backend/src/infrastructure/db/migrations/
├── postgres/
│   ├── 001_initial_schema.sql
│   ├── 001_initial_schema.down.sql
│   ├── 002_security_audit.sql
│   ├── 002_security_audit.down.sql
│   ├── 003_handoffs_and_approvals.sql
│   ├── 003_handoffs_and_approvals.down.sql
│   ├── ...
├── hana/
│   ├── 001_initial_schema.sql
│   ├── 001_initial_schema.down.sql
│   ├── 002_security_audit.sql
│   ├── 002_security_audit.down.sql
│   ├── 003_handoffs_and_approvals.sql
│   └── 003_handoffs_and_approvals.down.sql
```

---

## 3. Migration Tracking Schema (`schema_migrations`)

```sql
CREATE TABLE schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    checksum VARCHAR(128) NOT NULL,
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

# Roll back all migrations
node -e "import('./backend/src/infrastructure/db/migrator/dialectMigrationRunner.js').then(m => new m.DialectMigrationRunner().migrateDown()).then(console.log)"
```




# ========================================================
# FILE: docs/database/BACKUP_RESTORE_RUNBOOK.md
# ========================================================

# Fiorify Database Backup, Restore & Disaster Recovery Runbook (DB-009)
**Document Version:** 1.0.0  
**Target Environments:** Local PostgreSQL & SAP HANA Cloud (BTP)  
**Recovery Objectives:** RPO < 15 Minutes | RTO < 1 Hour

---

## 1. Disaster Recovery Objectives (RPO / RTO)

- **Recovery Point Objective (RPO):** Maximum acceptable data loss window is **15 minutes**.
- **Recovery Time Objective (RTO):** Maximum acceptable duration to restore service availability is **60 minutes**.

---

## 2. SAP HANA Cloud Production Backup & Restore Procedures

### 2.1 Automated Cloud Backups
SAP HANA Cloud instances on SAP BTP execute:
- **Full Data Backup:** Daily automated snapshot retained for 14 days.
- **Log Backups:** Continuous log segment backup every 15 minutes to object storage.

### 2.2 Point-in-Time Recovery (PITR) Execution
To restore an SAP HANA Cloud instance to a specific timestamp in SAP BTP Cockpit:
1. Navigate to **SAP BTP Cockpit** → **Subaccount** → **SAP HANA Cloud**.
2. Select the target instance `fiorify-hana-db`.
3. Choose **Actions** → **Restore**.
4. Select **Point-in-Time Recovery** and enter the target timestamp (UTC).
5. Confirm restore operation.
6. Verify service health via Fiorify `/api/v1/health/readiness`.

---

## 3. Local Development PostgreSQL Backup & Restore

### 3.1 Pre-Migration Backup Script
Fiorify provides an automated pre-migration backup utility:
```bash
node backend/src/infrastructure/db/scripts/createPreMigrationBackup.js
```

### 3.2 Manual Backup via `pg_dump`
```bash
# Create compressed logical backup
pg_dump -h 127.0.0.1 -p 5432 -U postgres -F c -b -v -f ./fiorify_backup_$(date +%Y%m%d_%H%M%S).dump fiorify
```

### 3.3 Restore via `pg_restore`
```bash
# Drop and recreate clean target database
dropdb -h 127.0.0.1 -p 5432 -U postgres fiorify
createdb -h 127.0.0.1 -p 5432 -U postgres fiorify

# Restore from dump
pg_restore -h 127.0.0.1 -p 5432 -U postgres -d fiorify -v ./fiorify_backup_<timestamp>.dump
```

---

## 4. Verification Checklists Post-Recovery

1. Run readiness probe: `curl -s http://localhost:4004/api/v1/health/readiness | jq .`
2. Verify migration consistency: `isFullyMigrated === true`
3. Audit trail verification: `GET /api/v1/assessments/:id/verify-audit` returns `valid: true`




# ========================================================
# FILE: docs/database/DATABASE_TEST_STRATEGY.md
# ========================================================

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


