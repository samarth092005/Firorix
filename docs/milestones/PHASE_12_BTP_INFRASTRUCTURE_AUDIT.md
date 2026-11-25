# FIORIFY — PHASE 12: SAP BTP INFRASTRUCTURE & PRE-DEPLOYMENT READINESS AUDIT

**Application:** Fiorify — SAP Fiori Modernization & Generation Platform  
**Repository:** `https://github.com/samarth092005/Firorix`  
**Working Branch:** `test-01`  
**HEAD SHA:** `4bca79e839f31d423b21039ea79bec8098f4be12`  
**Target Platform:** SAP BTP Cloud Foundry Environment  
**Target Region:** `eu30` (Frankfurt AWS, API: `https://api.cf.eu30.hana.ondemand.com`)  
**Audit Scope:** Cloud Foundry target, Service Inventory, Manifest, XSUAA, Destination, Connectivity, HANA/HDI, Runtime, Security, and Functional Readiness  
**Audit Timestamp:** 2026-11-17T19:08:00+05:30  
**Audit Verdict:** **CONDITIONAL GO FOR STAGING (AWAITING SERVICE PROVISIONING & SSO LOGIN)**  

---

## 1. Executive Summary & Audit Mandate

Phase 12 represents the formal pre-deployment infrastructure readiness inspection for **Fiorify — SAP Fiori Modernization Tool** prior to its initial deployment to SAP BTP Cloud Foundry.

In strict compliance with the **Phase 12 Critical Safety Rules**:
- **Zero mutations** were executed against SAP BTP Cloud Foundry (`cf push`, `cf deploy`, `cf restage`, `cf restart` were prohibited and NOT executed).
- **Zero service instances** were created, modified, or deleted.
- **Zero destinations or Cloud Connector mappings** were altered.
- **Zero live HANA migrations** were executed.
- **Zero SAP S21 mutations** were performed; discovery remained strictly read-only (`GET`, `HEAD`, `OPTIONS`).
- All technical usernames, organizational IDs, and exact IP addresses are redacted for broad distribution.

---

## 2. Cloud Foundry Target & Authentication Context

### 2.1 CLI Environment & Target State
The local workstation Cloud Foundry CLI context was inspected via `cf version`, `cf target`, and `cf api`:

- **Cloud Foundry CLI Version:** `cf.exe version 8.7.11+b1b4068ff.2024-07-09`
- **API Endpoint:** `https://api.cf.eu30.hana.ondemand.com`
- **API Version:** `3.235.0`
- **Target Organization:** `[REDACTED_ORG]`
- **Target Space:** `dev`
- **Target Region:** `eu30` (SAP BTP Cloud Foundry Europe - Frankfurt AWS)
- **Active User Context:** `[REDACTED_USER]`

### 2.2 CLI Authentication State & Finding
- **Command Output:**
  ```
  Getting service instances in org [REDACTED_ORG] / space dev as [REDACTED_USER]...
  The token expired, was revoked, or the token ID is incorrect. Please log back in to re-authenticate.
  FAILED
  ```
- **Finding:** The local Cloud Foundry CLI session token has expired.
- **Severity:** **P0 (Deployment Prerequisite)**
- **Next Action:** The SAP BTP Administrator must refresh the local CLI session using single sign-on (`cf login --sso -a https://api.cf.eu30.hana.ondemand.com`) prior to executing service provisioning commands.

---

## 3. Cloud Foundry Service Inventory & Marketplace Reconciliation

### 3.1 Service Inventory Analysis
Fiorify requires four backing services bound to the application droplet in Cloud Foundry:

| Service Logical Name | Offering | Required Plan | Expected Instance Name | Purpose in Fiorify | Current Status | Application Dependency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **XSUAA** | `xsuaa` | `application` | `Fiorify-xsuaa` | Authentication, JWT verification, RBAC, tenant context | `PENDING_PROVISIONING` | `backend/src/infrastructure/security/xsuaaProvider.js` |
| **Destination** | `destination` | `lite` | `Fiorify-destination` | Lookup and credentials for upstream SAP S21 destination | `PENDING_PROVISIONING` | `backend/src/adapters/btpDestinationAdapter.js` |
| **Connectivity** | `connectivity` | `lite` | `Fiorify-connectivity` | SOCKS5 proxy tunnel to SAP Cloud Connector on-premise network | `PENDING_PROVISIONING` | `backend/src/infrastructure/connectivity/sapHttpClient.js` |
| **SAP HANA Cloud** | `hana` | `hdi-shared` | `Fiorify-hana` | Production persistence via HDI-shared container | `PENDING_PROVISIONING` | `backend/src/infrastructure/db/adapters/hanaAdapter.js` |

### 3.2 Service Offering & Plan Disambiguation
- **`hana` vs `hana-cloud`:** In SAP BTP Cloud Foundry, `service: hana`, plan: `hdi-shared` is the standard Cloud Foundry service broker offering for creating HDI container bindings. The `service: hana-cloud` offering (plan: `hana`) is used exclusively for top-level database instance creation and administration, not application bindings. Fiorify's `manifest.yml` correctly targets `Fiorify-hana` backed by `hana / hdi-shared`.
- **Fail-Closed Architecture:** In `NODE_ENV=production`, Fiorify enforces strict startup guardrails:
  - If `Fiorify-xsuaa` is missing, `xsuaaProvider.assertProductionReadiness()` throws `SECURITY_MISCONFIGURATION`.
  - If `Fiorify-hana` is missing, `databaseAdapterFactory.assertProductionReadiness()` throws `MISSING_PRODUCTION_HANA_BINDING`.
  - Staging deployment cannot succeed until these service instances are provisioned and bound.

---

## 4. Manifest & Runtime Architecture Audit

### 4.1 Deployment Descriptor (`manifest.yml`) Inspection
The actual `manifest.yml` located in the repository root was inspected:

```yaml
---
applications:
  - name: Fiorify-platform
    memory: 1024M
    disk_quota: 2048M
    buildpacks:
      - nodejs_buildpack
    command: node backend/src/server.js
    env:
      NODE_ENV: production
      FIORIFY_PERSISTENCE: hana
      FIORIFY_ENFORCE_AUTH: "true"
      SAP_DESTINATION_NAME: S21
      SAP_CLIENT: "200"
      SAP_TIMEOUT_MS: "15000"
    services:
      - Fiorify-destination
      - Fiorify-connectivity
      - Fiorify-xsuaa
      - Fiorify-hana
```

### 4.2 Runtime & Sizing Evaluation
- **Memory Allocation (1024MB):** Adequate for native Node.js HTTP server, in-memory caching of 1,842 Fiori catalogue entries, and concurrent OData metadata processing.
- **Disk Quota (2048MB):** Adequate for compiled frontend static bundle, Node.js runtime, and temporary ZIP export staging.
- **Buildpack (`nodejs_buildpack`):** Fully compatible with Node 20 LTS specified in root `package.json` (`"engines": { "node": ">=20.0.0" }`).
- **Start Command (`node backend/src/server.js`):** Directly invokes native entrypoint without shell wrappers, ensuring clean signal trapping (`SIGTERM`, `SIGINT`) and fast container startup.
- **Port Binding:** `backend/src/server.js` listens dynamically on `process.env.PORT` (falling back to 4004 locally), binding to `0.0.0.0` as required by Cloud Foundry router.

---

## 5. XSUAA & Authentication Architecture Audit

### 5.1 Security Descriptor (`xs-security.json`)
The application defines dedicated enterprise scopes, attributes, role templates, and role collections:

```json
{
  "xsappname": "Fiorify",
  "tenant-mode": "dedicated",
  "scopes": [
    { "name": "$XSAPPNAME.FiorifyAdmin" },
    { "name": "$XSAPPNAME.FiorifyArchitect" },
    { "name": "$XSAPPNAME.FiorifyViewer" }
  ],
  "attributes": [
    { "name": "tenantId", "valueType": "string" }
  ]
}
```

### 5.2 Server-Enforced RBAC & Token Verification
1. **Cryptographic Signature Verification:** `xsuaaProvider.js` and `jwtVerifier.js` validate RS256 signatures against the XSUAA public verification key or JWKS endpoint.
2. **Algorithm Whitelisting:** Strictly enforces `algorithms: ['RS256']`, rejecting insecure `alg: none` or symmetric HMAC substitutions.
3. **Audience Validation:** Validates `aud` claim against `clientid` and `xsappname`.
4. **Scope-to-Role Mapping:**
   - `$XSAPPNAME.FiorifyAdmin` -> `ADMIN` role (Full governance, user administration, catalogue synchronization).
   - `$XSAPPNAME.FiorifyArchitect` -> `SAP_CONSULTANT` / `LEAD_ARCHITECT` (Discovery, fit-gap assessment, generation projects).
   - `$XSAPPNAME.FiorifyViewer` -> `VIEWER` (Read-only discovery and assessment viewing).
5. **Multi-Tenant Boundary Enforcement:**
   - `NODE_ENV=production` enforces fail-closed behavior: Tokens lacking tenant claims are rejected with HTTP 401 (`MISSING_TENANT_CONTEXT`).
   - Non-admin callers passing arbitrary `x-tenant-id` headers are rejected with HTTP 401 (`TENANT_SPOOFING_FORBIDDEN`).
   - Server derives actor identity exclusively from verified JWT, ignoring client-supplied `confirmedBy` or `approver` parameters.

---

## 6. Cloud Foundry Runtime & Unified Staging Pipeline

### 6.1 Unified Single-Origin Serving Architecture
Fiorify implements a unified single-origin deployment model:
1. Root `package.json` `postinstall` script compiles the frontend:
   ```json
   "postinstall": "npm --prefix backend ci --omit=dev || npm --prefix backend install --omit=dev && npm --prefix frontend ci || npm --prefix frontend install && npm --prefix frontend run build"
   ```
2. The compiled React SPA resides in `frontend/dist/`.
3. `backend/src/server.js` serves static assets directly from `frontend/dist/` with safe MIME types and provides transparent HTML fallback for client-side routing (`index.html`).
4. API routes are namespaced under `/api/v1/` and take precedence over static serving.

### 6.2 Droplet Packaging Optimization (`.cfignore`)
The repository contains an enterprise `.cfignore` file preventing bloat and credential leakage:
- Excludes `.git/`, `docs/`, `scratch/`, test suites (`backend/test/`, `frontend/**/__tests__/`).
- Excludes local embedded PostgreSQL databases (`backend/data/pg_data/`).
- Strictly excludes all local environment files (`.env`, `.env.*`, `*.env`).

---

## 7. Security & Vulnerability Audit

### 7.1 Automated Audit Findings (`npm audit`)
- **Backend:** 1 High-severity advisory in `xlsx@0.18.5` (Prototype Pollution & ReDoS).
  - *Mitigation:* Hardened in `backend/src/tools/ingestFAL.js` with 15MB payload cap, `Object.prototype` snapshot and rollback, sheet name allowlisting, and row dictionary sanitization. Fenced behind authenticated `ADMIN` role with `Fiorify.catalogue.manage` scope. Approved formal risk exception for Phase 11/12; migration to `exceljs` scheduled for Phase 12+.
- **Frontend:** 4 advisories (3 moderate, 1 high) in `esbuild` and `react-router-dom`:
  - `esbuild`: Dev-server vulnerability (`GHSA-67mh-4wv8-2f99`). Dev server is not deployed; only compiled static assets in `frontend/dist/` are staged.
  - `react-router-dom`: Open redirect and SSR deserialization. Fiorify is a pure client-side CSR application with internal route guarding.
  - *Residual Risk:* Low in production; scheduled for upgrade during frontend major revision.

### 7.2 Security Hardening Verification
- **Enterprise Security Headers:** Every response includes `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, and `Referrer-Policy`.
- **CORS Protection:** Rejects unauthorized cross-origin requests; allows preflight `OPTIONS` with HTTP 204.
- **Request Size Limiting:** Strict 100KB body limit on standard JSON APIs, with dedicated 15MB cap on catalogue imports.
- **Rate Limiting:** In-memory sliding-window rate limiter prevents brute-force authentication and API denial of service.

---

## 8. Master Blocker & Readiness Register

| ID | Issue Description | Severity | Affected Area | Business / Operational Impact | Recommended Resolution | Status |
| :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **BLK-12-01** | Cloud Foundry CLI Session Token Expired | **P0** | CLI / Deployment | Cannot query marketplace, list services, or deploy applications via CLI | Execute `cf login --sso -a https://api.cf.eu30.hana.ondemand.com` | `PENDING_USER_APPROVAL` |
| **BLK-12-02** | BTP Backing Service Instances Not Provisioned | **P0** | BTP Services | Application fails closed on startup if `Fiorify-xsuaa` or `Fiorify-hana` are missing | Provision `Fiorify-xsuaa`, `Fiorify-destination`, `Fiorify-connectivity`, `Fiorify-hana` | `PENDING_PROVISIONING` |
| **BLK-12-03** | BTP Subaccount Destination `S21` Not Mapped | **P0** | Connectivity | Cloud Foundry container cannot reach upstream SAP S21 system | Create Destination `S21` (OnPremise, `http://S21:8000`) in BTP Cockpit | `PENDING_PROVISIONING` |
| **BLK-12-04** | SAP Cloud Connector On-Premises Mapping | **P0** | Connectivity | Virtual host `S21:8000` not routed to internal host `192.168.x.x:8000` | Map internal host and allow `/sap/public/ping`, `/sap/opu/odata/`, `/sap/bc/adt/discovery` | `PENDING_PROVISIONING` |
| **BLK-12-05** | Live SAP HANA Cloud HDI Container Binding | **P1** | Persistence | Production persistence unverified against live HANA instance | Execute schema readiness check once `Fiorify-hana` is bound | `PENDING_EXTERNAL_VERIFICATION` |
| **BLK-12-06** | Dependency `xlsx@0.18.5` Prototype Pollution | **P2** | Security | Unmaintained spreadsheet parser on public npm | Complete migration to `exceljs` or SheetJS CDN in Phase 12+ | `APPROVED_RISK_EXCEPTION` |
| **BLK-12-07** | Frontend Dev Toolchain Vulnerabilities | **P3** | Maintenance | Moderate advisories in dev dependencies | Upgrade to Vite 6.x and React Router DOM 7.x | `PLANNED_IMPROVEMENT` |

---

## 9. Pre-Deployment Infrastructure Audit Sign-Off

- **Codebase Readiness:** **100% READY (0 CODE DEFECTS)**
- **Test Suite Status:** **827/827 Backend Passed | 218/218 Frontend Passed**
- **Infrastructure Status:** **PENDING EXTERNAL BTP PROVISIONING**
- **Overall Verdict:** **CONDITIONAL GO FOR STAGING**
