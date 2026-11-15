# FioriX — Milestone 1 Baseline Engineering Report
**Repository Quality, CI, Security & Release Control Baseline (BASE-003 to BASE-010)**

- **Target Branch**: `test-01`
- **Starting Commit SHA**: `e9a9dcff55aa4bf8d496fac77f08be668397efdd` (short: `e9a9dcf`)
- **Recovery Point**: `backup/milestone-1-baseline` (`e9a9dcff55aa4bf8d496fac77f08be668397efdd`)
- **Execution Timestamp**: 2026-11-15T17:15:00+05:30
- **Auditor Role**: Senior Staff Software Engineer, DevSecOps Engineer & Repository Quality Architect

---

## 1. Executive Summary

Milestone 1 (BASE-003 through BASE-010) establishes a reproducible, deterministic engineering baseline across the FioriX platform. All developer work has been protected, backend and frontend test baselines have been empirically measured, static quality checks have been codified, a zero-mutation GitHub Actions CI pipeline has been introduced, dependency and secret scans have been conducted, and an environment configuration matrix spanning Local, Demo, Staging, and Production has been documented.

### Milestone Status by Objective

| Requirement | Objective | Status | Summary of Evidence |
| :--- | :--- | :--- | :--- |
| **BASE-003** | Protect Developer Work | **COMPLETE** | Branch `test-01` verified at SHA `e9a9dcf`. Recovery branch `backup/milestone-1-baseline` established. Working tree clean. Zero destructive git operations. |
| **BASE-004** | Backend Test Baseline | **COMPLETE** | Full suite executed: `npm run test:backend` (69 test files, 623 subtests). 614 passing, 9 failing (8 due to port 4050 collision PERF-01; 1 existing defect in `gen05Gen06FullVerificationAudit.test.js`). 0 skipped. |
| **BASE-005** | Frontend Build & Test Baseline | **COMPLETE** | `vitest run --run`: 18 test files, 204 tests passed, 0 failed. `tsc --noEmit`: 0 errors. `vite build`: Production bundle generated in `frontend/dist/` in 11.45s. |
| **BASE-006** | Static Quality Checks | **COMPLETE** | Added deterministic `backend/scripts/check-syntax.js` (validates 197 JS files with `node --check`). Wired `npm run check` across backend and frontend. |
| **BASE-007** | Dependency & Secret Scan | **COMPLETE** | Zero private keys, zero API tokens, and zero tracked `.env` files across git index. Documented 1 high severity vulnerability in backend (`xlsx`) and 4 in frontend (`vite`/`esbuild`, `react-router-dom`). |
| **BASE-008** | GitHub Actions CI Pipeline | **COMPLETE** | Created `.github/workflows/ci.yml` with 4 decoupled stages: Security Hygiene & Static Checks, Backend Verification, Frontend Verification, and Release Gate. Zero deployment. |
| **BASE-009** | Configuration Matrix | **COMPLETE** | Audited all 54 environment variables. Created centralized configuration matrix across LOCAL, DEMO, STAGING, and PRODUCTION. Updated `.env.example` templates. |
| **BASE-010** | Baseline & Release Checkpoint | **COMPLETE** | Full diff reviewed, all checks executed, findings categorized, and baseline documentation produced. Handoff prepared for AUTH-001. |

---

## 2. Test Execution & Evidence

### 2.1 Backend Test Suite (Node.js 20 LTS Native Test Runner)
- **Command**: `npm run test:backend` (`node --test --test-concurrency=1 backend/test/`)
- **Total Test Files**: 69
- **Total Tests / Subtests**: 623
- **Total Suites**: 67
- **Passing Tests**: 614 (or 622 when port 4050 is unoccupied)
- **Failing Tests**: 9
- **Skipped / Cancelled / Todo**: 0
- **Duration**: ~221 seconds (~3.7 minutes)

#### Categorization of Backend Test Failures
1. **Environment Blocker (PERF-01) — 8 Subtests**:
   - **File**: `backend/test/gen07LocalPreviewOData.test.js` (Subtests 1 through 8).
   - **Root Cause**: The in-memory port allocator in `backend/src/generation/preview/previewSessionStore.js` tracks allocated ports in an in-memory `Set` without probing OS socket state via `net.createServer()`. When a local backend daemon process (`node backend/src/server.js`) or previous session holds port 4050, `server.listen(4050, '127.0.0.1')` throws `listen EADDRINUSE: address already in use 127.0.0.1:4050`. This causes `baseUrl` to remain undefined, cascading into `Invalid URL` in subtests 2–8.
   - **Proof of Isolation**: When port 4050 is freed, running `node --test backend/test/gen07LocalPreviewOData.test.js` yields **8 pass, 0 fail (100% passing)**.
2. **Existing Defect — 1 Subtest**:
   - **File**: `backend/test/gen05Gen06FullVerificationAudit.test.js` (Subtest 5, Line 206).
   - **Assertion**: `assert.ok(handler.content.includes('/* TODO: Modify entity fields via EML'))`.
   - **Root Cause**: `backend/src/generation/abap/behaviorClassGenerator.js` emits determination scaffolding as `/* Read entity buffer using EML (ENTITY ${rootInterfaceName}) */` and does not output the specific TODO string `'/* TODO: Modify entity fields via EML'`. Per Rule 11, business logic was not modified merely to make the test green.

### 2.2 Frontend Test Suite (Vitest 4.1.12)
- **Command**: `npm --prefix frontend test -- --run`
- **Test Files**: 18 passed (18 total)
- **Tests**: 204 passed (204 total)
- **Skipped / Failed**: 0
- **Duration**: 13.95 seconds
- **Key Suites Verified**:
  - `discoveryWorkflow.test.ts` (8 tests): T-Code discovery, DDIC metadata, FAL matching for F-53, F-28, FS00, regression scenarios.
  - `assessmentFinalization.test.ts` (16 tests): Fit-gap evaluation, Clean Core tiers, standard-first routing.
  - `transactionChecker.test.ts` (38 tests): Discovery matching master engine.
  - `apiIntegration.test.ts` (10 tests): Backend connectivity, error isolation, domain mapping.
  - `generationStudioMilestone2To4.test.ts`, `gen05Gen06Studio.test.ts`, `gen07Gen09Studio.test.ts`: RAP generation, preview telemetry, handover packages.

### 2.3 Frontend Production Build & TypeScript Verification
- **TypeScript Command**: `npm --prefix frontend run typecheck` (`tsc --noEmit`)
  - **Result**: Exit code 0, zero errors.
- **Production Build Command**: `npm --prefix frontend run build` (`tsc && vite build`)
  - **Result**: Built in 11.45s, exit code 0.
  - **Output Directory**: `frontend/dist/`
  - **Primary Chunks**:
    - `dist/index.html` (0.74 kB)
    - `dist/assets/vendor-react-*.js` (207.06 kB)
    - `dist/assets/GenerationStudioPage-*.js` (226.24 kB)
    - `dist/assets/AssessmentResultsPage-*.js` (130.25 kB)
    - `dist/assets/vendor-pdf-*.js` (391.00 kB)
    - `dist/assets/LandingPage-*.css` (26.87 kB)

---

## 3. Static Quality & Consistency Results

| Check | Tool / Mechanism | Scope | Result |
| :--- | :--- | :--- | :--- |
| **Backend Syntax** | `node --check` via `backend/scripts/check-syntax.js` | 197 JavaScript files (`backend/src/`, `backend/test/`) | **197 passed, 0 errors** |
| **Frontend Types** | `tsc --noEmit` | `frontend/src/` | **Passed, 0 errors** |
| **Frontend Bundler** | `vite build` | Full React/TypeScript tree | **Passed, 0 errors** |
| **Unified Check** | `npm run check` | Root cross-project quality gate | **Exit code 0** |

---

## 4. Security Findings & Dependency Audit

### 4.1 Secret & Credential Leakage Scan
- **Tracked `.env` Files**: 0 tracked (Only `.env.example` templates exist in source control).
- **Private Key Scan (`BEGIN PRIVATE KEY`)**: 0 occurrences in tracked files.
- **High-Entropy Cloud Tokens (AWS, GitHub, Slack)**: 0 occurrences in tracked files.
- **Git Ignore Hygiene**: `.gitignore` and `.cfignore` strictly exclude `.env`, `.env.*`, `node_modules/`, database files (`*.sqlite`, `*.db`, `backend/data/pg_data/`), and build outputs (`dist/`, `build/`).

### 4.2 Dependency Vulnerability Audit
#### Backend (`npm audit --prefix backend`)
- **Total Vulnerabilities**: 1 (High)
- **Direct Vulnerability**: `xlsx` (version `^0.18.5`)
  - Advisory: GHSA-4r6h-8v6p-xvw6 (Prototype Pollution) & GHSA-5pgg-2g8v-p4x9 (ReDoS).
  - Status: Direct dependency. No official patch published to the standard public npm registry by SheetJS.
  - Action Taken: Retained without `npm audit fix --force` to avoid breaking Excel ingestion workflows. Scheduled for migration to an alternative library (e.g. `exceljs`) in a future sprint.

#### Frontend (`npm audit --prefix frontend`)
- **Total Vulnerabilities**: 4 (3 Moderate, 1 High)
- **Vulnerabilities**:
  - `esbuild <= 0.24.2` / `vite <= 6.4.3`: Moderate (GHSA-67mh-4wv8-2f99). Fix requires breaking major upgrade to Vite 6.
  - `react-router` / `react-router-dom`: Moderate (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg). Fix requires breaking major upgrade to React Router 7.
  - Action Taken: Retained without `--force`. No breaking framework upgrades were applied in this baseline milestone.

---

## 5. GitHub Actions CI Pipeline

A new continuous integration pipeline has been established at [`.github/workflows/ci.yml`](file:///c:/Users/samarth/firorix/.github/workflows/ci.yml).

### Pipeline Architecture
- **Triggers**: Push and Pull Request on `main` and `test-01`.
- **Permissions**: `contents: read` (principle of least privilege).
- **Concurrency**: Grouped by workflow and ref with `cancel-in-progress: true`.
- **Stages**:
  1. `security-and-static-analysis`: Verifies secret hygiene, validates lockfile existence, runs `tsc --noEmit` and `node backend/scripts/check-syntax.js`.
  2. `backend-verification`: Deterministic `npm ci`, runs `npm run test:backend` with mock environment variables (`FIORIFY_SYSTEM_MODE=DEMO`), runs non-blocking dependency audit.
  3. `frontend-verification`: Deterministic `npm ci`, runs `npm --prefix frontend test -- --run`, runs `npm --prefix frontend run build`, verifies presence and integrity of `frontend/dist/index.html`.
  4. `release-validation`: Verifies `createServer` export via server dry-run import. Enforces release quality gate.
- **Safety Invariant**: Zero Cloud Foundry deployment steps (`cf push` is strictly absent). Zero dependence on live SAP or BTP credentials.

---

## 6. Environment and Configuration Matrix

The FioriX platform enforces strict configuration boundaries across 4 operational environments:

| Environment | Purpose | Database Engine | SAP Connectivity Mode | Auth Enforcement | Secrets & Keys |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LOCAL** | Developer Workstation | Embedded PG / Local PG | `MOCK` or `DIRECT_HTTP` | `FIORIFY_ENFORCE_AUTH=false` | Local mock secrets in untracked `.env` |
| **DEMO** | Guided Client Showcases | Embedded / In-Memory | `MOCK` (Synthetic Catalog) | `FIORIFY_ENFORCE_AUTH=false` | Demonstration placeholders |
| **STAGING** | BTP Validation & Integration | BTP Hypercaler PG | `BTP_DESTINATION` | `FIORIFY_ENFORCE_AUTH=true` | Injected via BTP Service Bindings (`VCAP_SERVICES`) |
| **PRODUCTION** | Live Enterprise Modernization | Managed PostgreSQL | `BTP_DESTINATION` + Cloud Connector | `FIORIFY_ENFORCE_AUTH=true` (XSUAA OAuth2) | Hardware / Vault managed HMAC keys |

### Centralized Variable Inventory

| Variable | Type / Format | Sensitive | Environment | Default Behavior | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PORT` | Integer (`4004`) | No | All | `4004` | Backend HTTP listening port. |
| `NODE_ENV` | String | No | All | `development` | Node runtime mode (`development`, `test`, `production`). |
| `DATABASE_URL` | URI (`postgres://...`) | Yes | Staging / Prod | `null` | PostgreSQL connection string. |
| `FIORIFY_PERSISTENCE` | String | No | All | `postgres` | Persistence engine (`postgres`, `embedded`, `memory`). |
| `FIORIFY_ALLOW_EMBEDDED_PG` | Boolean | No | Local / Demo | `false` | Permits embedded PostgreSQL fallback in non-prod. |
| `FIORIFY_ADMIN_SECRET` | String (>= 32 chars) | Yes | All | Set in `.env` | Master administrative bearer authentication token. |
| `FIORIFY_SIGNING_SECRET` | String (>= 32 chars) | Yes | Staging / Prod | Set in `.env` | HMAC-SHA256 secret for artifact and deployment approval. |
| `FIORIFY_SIGNING_KEYS_JSON` | JSON Object | Yes | Staging / Prod | `null` | Versioned signing keys dictionary for zero-downtime rotation. |
| `FIORIFY_SIGNING_KEY_VERSION`| String (`v1`) | No | Staging / Prod | `v1` | Identifier of active key for outgoing signatures. |
| `FIORIFY_ENFORCE_AUTH` | Boolean | No | All | `false` (dev), `true` (prod) | Strictly enforces JWT / Bearer token validation. |
| `SAP_SYSTEM_ID` | String (`S21`) | No | All | `S21` | Target SAP S/4HANA System ID. |
| `SAP_CLIENT` | String (`200`) | No | All | `200` | Target SAP Client number. |
| `SAP_CONNECTIVITY_MODE` | String | No | All | `DIRECT_HTTP` | Outbound mode: `DIRECT_HTTP`, `BTP_DESTINATION`, `MOCK`. |
| `SAP_BASE_URL` | URL | No | Local / Staging | `http://127.0.0.1:8000` | Target SAP Gateway / ADT endpoint. |
| `SAP_READ_ONLY_ENFORCED` | Boolean | No | All | `true` | **Zero-mutation safety guardrail**: strictly blocks POST/PUT/DELETE to SAP. |
| `SAP_TLS_REJECT_UNAUTHORIZED`| Boolean | No | Staging / Prod | `true` | Strict TLS verification (never false in production). |
| `ALLOWED_SAP_HOSTS` | Comma-separated | No | All | Allowlist | SSRF protection: restricts outbound HTTP to verified hosts. |
| `VITE_APP_ENV` | String | No | Frontend | `LOCAL_DEMO` | Frontend environment mode (`LOCAL_DEMO`, `STAGING`, `PRODUCTION`). |
| `VITE_API_BASE_URL` | URL | No | Frontend | Blank (proxy) | Backend API endpoint URL. |

---

## 7. File Change Register

| File | Change Type | Purpose & Justification |
| :--- | :--- | :--- |
| `package.json` | Modified | Added unified root quality scripts: `check:backend`, `check:frontend`, `typecheck`, and `check`. |
| `backend/package.json` | Modified | Added `syntax:check` (`node scripts/check-syntax.js`) and `check` scripts. |
| `frontend/package.json` | Modified | Added `check` script (`npm run typecheck && npm run build`). |
| `backend/scripts/check-syntax.js` | Created | Deterministic Node.js syntax verification script checking 197 JS files. |
| `backend/.env.example` | Modified | Comprehensive backend environment template covering all runtime, DB, security, and SAP variables. |
| `frontend/.env.example` | Modified | Comprehensive frontend environment template covering workspace and default SAP landscape values. |
| `.github/workflows/ci.yml` | Created | GitHub Actions CI workflow covering static quality, backend/frontend test baselines, and release validation. |
| `docs/BASELINE_ENGINEERING_REPORT.md` | Created | Complete Milestone 1 engineering baseline report and audit record. |

---

## 8. Handoff to Milestone 2 (AUTH-001 through AUTH-015)

The repository baseline is fully stabilized and documented. The codebase is ready for **Milestone 2: Enterprise Authentication, XSUAA & Security Architecture (AUTH-001 to AUTH-015)**.

### Immediate Recommendations for Milestone 2:
1. **AUTH-001 (XSUAA Strategy)**: Implement dual-mode authentication: XSUAA JWT validation in BTP environments with seamless fallback to secure local session tokens in development.
2. **AUTH-002 (RBAC Consolidation)**: Formalize role taxonomy (`ADMIN`, `APPROVER`, `CONSULTANT`, `VIEWER`) across all API routes and UI views.
3. **AUTH-003 (Token Security)**: Implement token expiration, refresh rotation, and automated cryptographic session validation.
4. **PERF-01 Remediation**: Update `previewSessionStore.js` to probe OS socket binding (`net.createServer`) before allocating preview ports, resolving the 8 port contention test failures.
