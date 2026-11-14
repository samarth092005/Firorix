# FIORIFY — SPRINT 13.1 SECURITY CHANGELOG
## Technical Code-Level Modifications, Rationale & Defense Mechanisms

**Scope:** Sprint 13.1 Application Security Hardening  
**Date:** 2026-11-14  
**Auditor & Author:** Principal Application Security Engineer & Senior Node.js Architect  

---

# 1. SCOPE A: REM-SEC-01 (SEPARATION OF DUTIES & OVERRIDE AUTHORIZATION)

### 1.1 `backend/src/services/assessmentStore.js`
- **Component:** Assessment State Machine & Transition Engine
- **Added Helper:** `isAuthorizedAdmin(userContext)`
  - Evaluates `userContext.role === USER_ROLES.ADMIN || userContext.role === USER_ROLES.LEAD_ARCHITECT || userContext.role === 'CHIEF_ARCHITECT' || authService.hasPermission(userContext, PERMISSIONS.ADMIN_ACCESS) || authService.hasPermission(userContext, PERMISSIONS.USER_ADMIN)`.
  - Rejects unauthenticated callers immediately.
- **Modifications in `update()` (Database & In-Memory Branches):**
  - Added strict check: If `updates.isOverride === true`, verified that `isAuthorizedAdmin(userContext)` is true. If false, throws error with `code = 'UNAUTHORIZED_OVERRIDE'`.
  - Enforced creator-versus-approver separation: `if (isCreator && !isOverride)` throws `SEPARATION_OF_DUTIES_VIOLATION`. If `isOverride` is supplied by an unauthorized actor, the override check fails before creator bypass can occur.
  - Audit logging enhancement: When `updates.isOverride === true`, sets `auditAction = 'ADMIN_OVERRIDE_APPROVED'` and attaches `{ administrativeOverride: true, overriddenBy: actorId, overriddenByName: actorName }` into the audit event payload.
- **Modifications in `approve()`:**
  - Added upfront guard `if (isOverride && !isAuthorizedAdmin(userContext))` throwing `UNAUTHORIZED_OVERRIDE`.
  - Passed `isOverride` flag into governance review metadata.

### 1.2 `backend/src/routes/assessmentRoutes.js`
- **Component:** Assessment HTTP Endpoints
- **Route 9 (`POST /api/v1/assessments/:id/approve`):**
  - Extracted `payload.isOverride === true`.
  - Added route-level pre-flight authorization check: If `isOverride` is requested, asserts `currentUser` holds administrative roles or `ADMIN_ACCESS` permission.
  - If unauthorized, halts immediately and returns HTTP `403 Forbidden` with `{ statusCode: 'UNAUTHORIZED_OVERRIDE', errorMessage: 'Administrative override requires explicit authenticated ADMIN authorization.' }`.
  - Handled `UNAUTHORIZED_OVERRIDE` error code mapping to HTTP `403` across error handlers.
- **Route 6 (`PUT /api/v1/assessments/:id`):**
  - Updated error handling catch block to map `UNAUTHORIZED_OVERRIDE` to HTTP `403 Forbidden`.

---

# 2. SCOPE B: REM-SEC-02 (AUTHENTICATION DEFAULTS & DEV BOUNDARIES)

### 2.1 `backend/src/server.js`
- **Component:** HTTP Dispatcher & User Context Resolution (`resolveUser`)
- **Strict Production Enforcement:**
  - Changed `enforceAuth` initialization:
    ```javascript
    const isProduction = process.env.NODE_ENV === 'production';
    const enforceAuth = isProduction || options.enforceAuth === true || process.env.FIORIFY_ENFORCE_AUTH === 'true' || process.env.Fiorify_ENFORCE_AUTH === 'true';
    ```
    Guarantees that production instances unconditionally enforce authentication regardless of environment variable mistakes.
- **Elimination of Privileged Default Admin Fallback:**
  - Removed code that defaulted unauthenticated requests to `USR-ADMIN-01` on `DEFAULT-TENANT-S21`.
  - Replaced with:
    ```javascript
    return {
      id: 'USR-DEV-VIEWER',
      name: 'Development Viewer',
      email: 'dev-viewer@fiorify.corp',
      role: USER_ROLES.VIEWER,
      tenantId: req.headers['x-tenant-id'] || 'DEV-SANDBOX-TENANT',
      department: 'Development Sandbox'
    };
    ```
    Unauthenticated development requests now possess minimum read-only permissions (`VIEWER`) and operate in a isolated `DEV-SANDBOX-TENANT`.
- **Development Impersonation Lockdown:**
  - In production (`isProduction === true`), if `x-fiorify-admin-secret`, `x-fiorify-admin-user`, or `x-fiorify-dev-role` is detected, `resolveUser()` returns `{ isUnauthenticated: true, authError: 'DEV_IMPERSONATION_FORBIDDEN_IN_PRODUCTION' }` $\rightarrow$ HTTP `401 Unauthorized`.
  - In non-production, if impersonation headers are supplied without `x-fiorify-admin-secret`, `resolveUser()` returns `{ isUnauthenticated: true, authError: 'DEV_IMPERSONATION_REQUIRES_SECRET' }` $\rightarrow$ HTTP `401 Unauthorized`.
- **Missing Tenant Context Defense:**
  - In production, if an authenticated token lacks a tenant identifier and the request omits `x-tenant-id`, `resolveUser()` returns `{ isUnauthenticated: true, authError: 'MISSING_TENANT_CONTEXT' }` $\rightarrow$ HTTP `401 Unauthorized`.
- **401 Response Standardization:**
  - Standardized the 401 response payload to include `code: currentUser.authError || 'UNAUTHORIZED'` for client diagnostics.

### 2.2 `backend/src/services/authService.js`
- **Component:** Token Generation & Verification Service
- **Modifications in `generateToken()`:**
  - Avoided defaulting `tenantId` to `'DEFAULT-TENANT-S21'` when in production if none is supplied.
- **Modifications in `verifyToken()`:**
  - In production mode, if `payload.tenantId` is missing, returns `null` for tenantId rather than silently substituting `DEFAULT-TENANT-S21`.

---

# 3. SCOPE C: REM-SEC-05 (SAP HTTP ENDPOINT CANONICALIZATION & SSRF DEFENSE)

### 3.1 `backend/src/infrastructure/connectivity/sapHttpClient.js`
- **Component:** Resilient Read-Only SAP HTTP Client
- **Import:** Added `import path from 'node:path';`
- **Approved Host Pattern Definition (`DEFAULT_ALLOWED_HOST_PATTERNS`):**
  - Added strict regex patterns allowing:
    - Loopback interfaces: `localhost(:port)?`, `127.0.0.1(:port)?`
    - RFC 1918 Private Subnets (SAP On-Premise LAN):
      - `192.168.x.x`
      - `10.x.x.x`
      - `172.16.x.x` – `172.31.x.x`
    - Enterprise internal domains: `*.corp.internal`, `*.internal`, `*.sap`, `s21`, `sap-s21.internal`
    - BTP Cloud domain: `*.ondemand.com`
  - Added support for custom host overrides via `options.allowedHosts` or `process.env.ALLOWED_SAP_HOSTS`.
- **Method `isHostAllowed(host)`:**
  - Validates destination host and port against approved host patterns.
- **Method `assertAllowedEndpoint(targetUrl)` Overhaul:**
  1. Input Validation: Asserts non-empty string; checks for null bytes (`\0`, `%00`) and backslashes (`\`, `%5c`).
  2. Ambiguous Separator Defense: Rejects encoded slashes (`%2f`, `%2F`) within path segments to defeat proxy desynchronization attacks.
  3. Protocol-Relative URL Defense: Rejects URLs starting with `//` to prevent scheme-relative host poisoning.
  4. Multi-Level URL Decoding: Tests raw, single-decoded, and double-decoded strings for directory traversal sequences (`..`, `%2e%2e`, `%252e%252e`).
  5. URL Parsing & Protocol Verification: Parses absolute URLs and rejects non-HTTP protocols (e.g. `ftp:`, `javascript:`, `file:`).
  6. Host Validation: Evaluates parsed host against `isHostAllowed()`. Unapproved hosts throw `DISALLOWED_SAP_ENDPOINT` (`AUTHORIZATION_BLOCKED`).
  7. POSIX Path Normalization: Uses `path.posix.normalize()` on the parsed pathname. Rejects paths that resolve with `..` or do not begin with `/`.
  8. Diagnostic Prefix Matching: Validates that the normalized canonical path strictly matches approved prefixes:
     - `/sap/opu/odata/`
     - `/sap/opu/odata4/`
     - `/sap/bc/adt/`
     - `/sap/bc/echo`
     - `/sap/public/bc/`
- **Preservation of Mutation Boundary:**
  - `assertReadOnly(method)` continues to enforce strict rejection of `POST`, `PUT`, `DELETE`, and `PATCH`.

---

# 4. VERIFICATION EVIDENCE SUMMARY

- All new defense mechanisms are covered by automated unit and integration tests in `backend/test/s13SecurityHardening.test.js` (17 tests, 100% pass).
- Zero regressions were introduced across the 7 baseline backend suites (47 test items, 100% pass) and the 18 frontend suites (204 tests, 100% pass).
- Frontend production bundle built cleanly in 9.35s.
