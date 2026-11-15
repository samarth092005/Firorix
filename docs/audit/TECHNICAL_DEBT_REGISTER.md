# Technical Debt Register: Prioritized Engineering Catalog

**Document Reference**: `docs/audit/TECHNICAL_DEBT_REGISTER.md`  
**Audit Baseline**: Commit `4c7f9a3` (Branch `test-01`)  
**Scope**: Full repository technical debt catalog cross-referenced by unique identifier, severity, and architectural category.

---

## 1. Technical Debt Register Overview

| Severity Tier | Definition | Total Count |
|---|---|---|
| **P0 — Critical Blocker** | Production blockers, severe security vulnerabilities, or deployment halting defects. | **3** |
| **P1 — High Priority** | Major functional gaps, test suite failures, or disconnected workflows. | **4** |
| **P2 — Important Improvement** | Architectural coupling, performance bottlenecks, or code smell. | **6** |
| **P3 — Optimization** | Cosmetic refinements, future enhancements, and minor documentation debt. | **5** |
| **Total Registered Items** | — | **18** |

---

## 2. Complete Technical Debt Item Register

### 2.1 Critical Production Blockers (P0)

#### `DEBT-DEP-01` (Finding ID: `DEP-01`)
- **Severity**: **P0 — Critical Blocker**
- **Category**: Deployment & Cloud Infrastructure
- **Location**: Repository Root (`/`)
- **Evidence**: `manifest.yml` defines `command: node backend/src/server.js` and `buildpacks: - nodejs_buildpack`, but no root `package.json` exists in the repository.
- **Impact**: Cloud Foundry staging fails immediately during `cf push`; production container cannot compile.
- **Recommended Action**: Author root `package.json` with monorepo orchestration scripts (`postinstall`, `start`).
- **Dependencies**: None.
- **Effort**: **Small (S)** (0.5 developer days).
- **Acceptance Criteria**: Running `cf push` from root triggers buildpack staging, installs dependencies, builds frontend, and launches container cleanly.

---

#### `DEBT-SEC-01` (Finding ID: `SEC-01`)
- **Severity**: **P0 — Critical Blocker**
- **Category**: Security & Authentication
- **Location**: `backend/src/services/authService.js:205-207`
- **Code Evidence**:
  ```javascript
  export function hashPassword(password) {
    return crypto.createHash('sha256').update(String(password).trim()).digest('hex');
  }
  ```
- **Impact**: Violates OWASP ASVS 5.0 V2.4.1. Un-salted SHA-256 allows instant offline credential cracking via rainbow tables if user store is compromised.
- **Recommended Action**: Refactor `hashPassword` to use `node:crypto.scrypt` (or `argon2id`) with unique 16-byte cryptographically random salt per record.
- **Dependencies**: None.
- **Effort**: **Small (S)** (1 developer day).
- **Acceptance Criteria**: User passwords stored with salted scrypt hashes; backward-compatible migration verifies old hashes on login and re-hashes with scrypt.

---

#### `DEBT-SEC-02` (Finding ID: `SEC-02`)
- **Severity**: **P0 — Critical Blocker**
- **Category**: Security & Governance
- **Location**: `backend/src/generation/deployment/deploymentOrchestrationService.js:338-356`
- **Code Evidence**:
  ```javascript
  level: sigVerification.isLegacy ? 'WARN' : 'INFO',
  message: sigVerification.isLegacy
    ? `Cryptographic approval verified with legacy unauthenticated digest...`
    : `Cryptographic approval verified...`
  ```
- **Impact**: Violates enterprise integrity mandate. Deployment plans signed with unauthenticated legacy SHA-256 digests are permitted to execute with only a warning log.
- **Recommended Action**: Enforce fail-closed check: if `sigVerification.isLegacy === true`, throw `LEGACY_APPROVAL_UNAUTHORIZED` and block execution.
- **Dependencies**: None.
- **Effort**: **Small (S)** (0.5 developer days).
- **Acceptance Criteria**: Executing a deployment plan with an unkeyed SHA-256 approval throws HTTP 403; execution proceeds strictly with valid `HMAC_SHA256_KEYED` signatures.

---

### 2.2 High-Priority Functional & Reliability Blockers (P1)

#### `DEBT-PERF-01` (Finding ID: `PERF-01`)
- **Severity**: **P1 — High Priority**
- **Category**: Reliability & Developer Experience
- **Location**: `backend/src/generation/preview/previewSessionStore.js:23-33`
- **Code Evidence**: `allocatePort()` iterates 4050–4099 checking only in-memory `Set`, ignoring OS socket state.
- **Impact**: Port contention crashes local preview server with `EADDRINUSE: 4050`, causing **8 backend test failures**.
- **Recommended Action**: Implement asynchronous socket binding probe (`net.createServer`) before port return.
- **Dependencies**: None.
- **Effort**: **Small (S)** (1 developer day).
- **Acceptance Criteria**: `PreviewSessionStore.allocatePort()` automatically skips ports already held by OS listeners; all 8 preview unit tests pass 100%.

---

#### `DEBT-UI-01` (Finding ID: `UI-01`)
- **Severity**: **P1 — High Priority**
- **Category**: Frontend & UI/UX Traceability
- **Location**: `frontend/src/features/audit/AuditPage.tsx`, `frontend/src/app/router.tsx:229`
- **Evidence**: `AuditPage.tsx` consumes mock fixtures from `localStore.getAuditEvents()`, and `router.tsx` redirects `/audit` to `/assessment-history`.
- **Impact**: Dedicated enterprise security audit log view is completely unreachable and disconnected from PostgreSQL `security_audit_events`.
- **Recommended Action**: Connect `AuditPage.tsx` to `GET /api/v1/security/audit` with search/filter controls, and restore `/audit` route in the navigation sidebar.
- **Dependencies**: Backend audit API.
- **Effort**: **Medium (M)** (2 developer days).
- **Acceptance Criteria**: Navigating to `/audit` displays live, paginated security audit events from PostgreSQL.

---

#### `DEBT-SAP-01` (Finding ID: `SAP-01`)
- **Severity**: **P1 — High Priority**
- **Category**: SAP Integration & Governance
- **Location**: Target SAP S/4HANA System `S21` (Landscape Configuration)
- **Evidence**: Service user `int_samarth` possesses unrestricted `SAP_ALL` administrative authorizations.
- **Impact**: High residual risk. If the backend process is compromised, application-side read-only boundaries could be bypassed.
- **Recommended Action**: Configure Cloud Connector resource mapping for S21 with `Read-Only` access policy on all exposed ICF paths, and plan dedicated display-only service user (`FIORIFY_SVC`).
- **Dependencies**: SAP Basis / Security team cooperation.
- **Effort**: **Medium (M)** (2 developer days).
- **Acceptance Criteria**: Cloud Connector blocks mutating HTTP requests at the network perimeter regardless of backend user role.

---

#### `DEBT-API-01` (Finding ID: `API-01`)
- **Severity**: **P1 — High Priority**
- **Category**: Backend API Architecture
- **Location**: `backend/src/routes/assessmentRoutes.js`, `backend/src/routes/systemRoutes.js`
- **Evidence**: Endpoints return full collections without enforcing maximum page limits (`LIMIT / OFFSET`).
- **Impact**: Memory exhaustion and slow response times as database records grow into tens of thousands.
- **Recommended Action**: Enforce default pagination (`limit=50, max=200`) across all collection listing APIs.
- **Dependencies**: Repositories.
- **Effort**: **Small (S)** (1 developer day).
- **Acceptance Criteria**: All collection GET endpoints enforce cursor or limit-offset pagination.

---

### 2.3 Important Engineering Improvements (P2)

#### `DEBT-GEN-01` (Finding ID: `GEN-01`)
- **Severity**: **P2 — Important Improvement**
- **Category**: Generation Studio & ABAP RAP
- **Location**: `backend/src/generation/abap/behaviorClassGenerator.js:101-105`
- **Code Evidence**: `get_instance_authorizations` scaffold hardcodes `%update = auth-allowed` and `%delete = auth-allowed`.
- **Impact**: Developer must remember to replace placeholder with real PFCG checks; potential security hole if deployed without completion.
- **Recommended Action**: Generate defensive `AUTHORITY-CHECK` template code targeting mapped domain authorization objects (`M_BEST_EKO`, `V_VBAK_VKO`).
- **Effort**: **Medium (M)** (1.5 developer days).

---

#### `DEBT-API-02` (Finding ID: `API-02`)
- **Severity**: **P2 — Important Improvement**
- **Category**: Security & Infrastructure
- **Location**: `backend/src/server.js` (Route Registration)
- **Evidence**: No rate limiting middleware configured on `/api/v1/auth/login` or discovery endpoints.
- **Impact**: Susceptible to brute-force credential stuffing or discovery denial of service.
- **Recommended Action**: Add lightweight in-memory / Redis token-bucket rate limiting middleware.
- **Effort**: **Small (S)** (1 developer day).

---

#### `DEBT-DB-01` (Finding ID: `DB-01`)
- **Severity**: **P2 — Important Improvement**
- **Category**: Database Architecture
- **Location**: `backend/src/infrastructure/db/migrations/001_initial_schema.sql`
- **Evidence**: Deletions use hard `ON DELETE CASCADE`. No soft deletion (`deleted_at`) implemented on critical audit entities.
- **Impact**: Accidental tenant or project deletion permanently purges historical compliance records.
- **Recommended Action**: Add `deleted_at TIMESTAMPTZ` and soft-delete filtering to `assessments` and `generation_projects`.
- **Effort**: **Medium (M)** (2 developer days).

---

#### `DEBT-GEN-02` (Finding ID: `GEN-02`)
- **Severity**: **P2 — Important Improvement**
- **Category**: Generation Studio
- **Location**: `backend/src/generation/export/zipArchiver.js`
- **Evidence**: Project export compression executes synchronously on the event loop.
- **Impact**: Large projects (50+ artifacts) block event loop for 300–800ms during export.
- **Recommended Action**: Offload zip packaging to Node.js `worker_threads` or stream directly to HTTP response.
- **Effort**: **Medium (M)** (2 developer days).

---

#### `DEBT-UI-02` (Finding ID: `UI-02`)
- **Severity**: **P2 — Important Improvement**
- **Category**: Frontend Architecture
- **Location**: `frontend/src/features/explorer/ExplorerPage.tsx`
- **Evidence**: Legacy Sprint 0 explorer page remains active in bundle using `localStore`.
- **Impact**: Dead code bloat (~12 kB).
- **Recommended Action**: Formally deprecate and replace with redirect to `/transaction-discovery`.
- **Effort**: **Small (S)** (0.5 developer days).

---

#### `DEBT-DOC-01` (Finding ID: `DOC-01`)
- **Severity**: **P2 — Important Improvement**
- **Category**: Documentation
- **Location**: `docs/08-sap-integration.md`, `manifest.yml`
- **Evidence**: References to legacy "S20" system occasionally linger in older sprint documentation.
- **Impact**: Onboarding confusion for new engineers.
- **Recommended Action**: Standardize all documentation exclusively on `S21` (Client `200`).
- **Effort**: **Small (S)** (0.5 developer days).

---

### 2.4 Optimization & Future Enhancements (P3)

- `DEBT-CAT-01` (P3 / CAT): Upgrade Fiori keyword matching to vector embedding semantic search.
- `DEBT-SEC-03` (P3 / SEC): Support external enterprise KMS providers (AWS KMS, Azure Key Vault).
- `DEBT-UI-03` (P3 / UI): Enhance mobile responsiveness for complex 10-dimension fit-gap radar charts.
- `DEBT-PERF-02` (P3 / PERF): Implement Redis distributed cache for multi-instance Cloud Foundry scaling.
- `DEBT-TEST-01` (P3 / QA): Add automated end-to-end Cypress/Playwright integration tests in CI pipeline.
