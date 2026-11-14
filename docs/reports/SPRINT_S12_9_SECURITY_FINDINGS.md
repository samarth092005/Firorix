# FIORIFY — SPRINT 12.9 CRITICAL SECURITY FINDINGS REPORT
## In-Depth Vulnerability Assessment, Threat Modeling & Remediation Specifications

**Scope:** Application Security, Authentication, Cryptography, Authorization, SAP Communication  
**Date:** 2026-11-14  
**Auditor:** Enterprise Security Architect & Principal Software Engineer  

---

# 1. EXECUTIVE SECURITY AUDIT MATRIX

| Finding ID | Severity | Category | Vulnerable Component | Description |
| :--- | :---: | :--- | :--- | :--- |
| **SEC-01** | **MEDIUM** | Cryptography | `deploymentOrchestrationService.js`<br>`specificationVersioningService.js` | Plain Unsalted SHA-256 Digest Used in Place of Keyed Digital Signatures |
| **SEC-02** | **HIGH** | Authorization | `assessmentStore.js` (L931-938)<br>`assessmentRoutes.js` (L421) | Separation of Duties Bypass via Unverified `isOverride` Payload Property |
| **SEC-03** | **HIGH** | Authentication | `server.js` (L220-233) | Permissive Development Default Admin User Fallback When Auth is Unenforced |
| **SEC-04** | **HIGH** | SAP Security | `sapConnectivityProvider.js`<br>`S21 Technical Configuration` | Technical User `int_samarth` Configured with Over-Privileged `SAP_ALL` Role |
| **SEC-05** | **MEDIUM** | Network / SSRF | `sapHttpClient.js` (L66-75) | Endpoint Allowlist Checked by Prefix Matching Rather than Exact Canonicalization |

---

# 2. DETAILED VULNERABILITY ASSESSMENTS

### Finding SEC-01: Plain Unsalted SHA-256 Digest Used for Cryptographic Signatures
- **Severity:** `MEDIUM`
- **Location:** `backend/src/generation/deployment/deploymentOrchestrationService.js` (`approveDeploymentPlan`, L239-241) and `backend/src/generation/projects/specificationVersioningService.js` (`approveVersion`, L145-155)
- **Evidence:**
  ```javascript
  const signaturePayload = `${plan.id}:${plan.planHash}:${plan.artifactManifestHash}:${userContext.id || 'chief-architect'}:${approvedAt}`;
  const signatureHash = this.computeHash(signaturePayload); // crypto.createHash('sha256').update(raw).digest('hex')
  ```
- **Technical & Business Impact:**
  A plain SHA-256 digest contains no private cryptographic secret (no HMAC key, RSA private key, or ECDSA keypair). Anyone who knows the metadata string can recalculate the exact hash. If an attacker gains write access to PostgreSQL, they can forge approvals without holding authorized private credentials.
- **Recommended Remediation:**
  Use an HMAC-SHA256 with a server-side secret key (`FIORIFY_SIGNING_SECRET`) or asymmetric digital signing (ED25519 or RSA-PSS with private key held in SAP BTP KeyStore or Cloud KMS).
- **Test Required to Prove Fix:**
  A unit test attempting to verify a signature computed with a different key or plain SHA-256 must reject the approval with `INVALID_SIGNATURE_KEY`.

---

### Finding SEC-02: Separation of Duties Bypass via Unverified `isOverride` Flag
- **Severity:** `HIGH`
- **Location:** `backend/src/services/assessmentStore.js` (L931-938, L1012-1019) and `backend/src/routes/assessmentRoutes.js` (L421)
- **Evidence:**
  ```javascript
  // In assessmentStore.js:
  const isCreator = existing.createdBy && existing.createdBy === actorId;
  const isOverride = updates.isOverride === true;

  if (isCreator && !isOverride) {
    const err = new Error('Separation of duties policy violation: Assessment creator cannot approve their own assessment.');
    err.code = 'SEPARATION_OF_DUTIES_VIOLATION';
    throw err;
  }
  ```
- **Technical & Business Impact:**
  Any client sending `POST /api/v1/assessments/:id/approve` with `{ "isOverride": true }` in the JSON request body completely bypasses the creator-approver separation check! A developer or consultant can approve their own modernization decision without administrative authorization.
- **Recommended Remediation:**
  Require explicit administrative authorization (`authService.hasPermission(userContext, PERMISSIONS.ADMIN_ACCESS)`) before honoring `isOverride: true`. If `updates.isOverride` is provided by a non-admin, throw `FORBIDDEN_OVERRIDE_ATTEMPT` and log a security audit violation.
- **Test Required to Prove Fix:**
  A test where an assessment creator calls `approve()` passing `{ isOverride: true }` without `ADMIN` role must be rejected with `403 Forbidden`.

---

### Finding SEC-03: Permissive Development Default Admin User Fallback
- **Severity:** `HIGH`
- **Location:** `backend/src/server.js` (L220-233)
- **Evidence:**
  ```javascript
  if (enforceAuth) {
    return { isUnauthenticated: true, authError: 'MISSING_TOKEN' };
  }

  return {
    id: 'USR-ADMIN-01',
    name: 'Admin',
    email: 'admin@Fiorify.corp',
    role: USER_ROLES.ADMIN,
    tenantId: defaultTenantId,
    department: 'SAP Architecture & Platform Governance'
  };
  ```
- **Technical & Business Impact:**
  If the platform is started in an environment where `FIORIFY_ENFORCE_AUTH` is not explicitly set to `'true'`, every unauthenticated HTTP request is automatically granted full `ADMIN` authorization. An unauthenticated attacker could view all tenant data, generate projects, and stage deployment plans.
- **Recommended Remediation:**
  Enforce authentication by default (`enforceAuth = process.env.NODE_ENV === 'production' || process.env.FIORIFY_ENFORCE_AUTH === 'true'`). In development, assign `VIEWER` role by default rather than `ADMIN` unless an explicit `x-fiorify-dev-admin` header is passed.
- **Test Required to Prove Fix:**
  An unauthenticated request with `NODE_ENV=production` must return HTTP `401 Unauthorized`.

---

### Finding SEC-04: Technical User `int_samarth` Configured with `SAP_ALL`
- **Severity:** `HIGH`
- **Location:** SAP Connection Configuration (`backend/src/infrastructure/connectivity/sapConnectivityProvider.js` / S21 landscape)
- **Evidence:**
  User profile in S21 Client 200 holds profile `SAP_ALL`.
- **Technical & Business Impact:**
  Because the backend holds credentials with unrestricted authorization on the entire SAP S/4HANA instance, any software vulnerability or accidental bypass in the node client could result in unintended changes to live SAP DDIC, transactions, or user master records.
- **Recommended Remediation:**
  In S21, create a dedicated technical communication user (`B` - System User) with a custom PFCG role containing strictly:
  - `S_RFC` (`ACTVT 16`, `RFC_NAME /IWFND/*, /BDL/*`)
  - `S_SERVICE` (`ACTVT 03`, `SRV_NAME /IWFND/SG_MED_CATALOG`)
  - `S_TABU_DIS` (`ACTVT 03`)
  - `S_ADT_RES` (`ACTVT 03, 16`)
  - Explicitly remove `SAP_ALL` and `SAP_NEW` from this account.
- **Test Required to Prove Fix:**
  Verify that the read-only preflight diagnostic suite passes completely with the restricted user, while any mutating request executed in SE38/SE16 is rejected with authorization failure in SAP system traces (`ST01`/`STAUTHTRACE`).

---

### Finding SEC-05: Endpoint Allowlist Checked by Prefix Matching
- **Severity:** `MEDIUM`
- **Location:** `backend/src/infrastructure/connectivity/sapHttpClient.js` (L66-75)
- **Evidence:**
  ```javascript
  const isAllowed = ALLOWED_SAP_ENDPOINT_PREFIXES.some(prefix => pathname.startsWith(prefix));
  ```
- **Technical & Business Impact:**
  While `ALLOWED_SAP_ENDPOINT_PREFIXES` restricts paths to `/sap/opu/odata/`, `/sap/opu/odata4/`, `/sap/bc/adt/`, etc., path traversal tricks (`/sap/bc/adt/../../sicf/delete`) or sub-services under `/sap/public/bc/` might be accessible if URLs are not fully canonicalized before prefix evaluation.
- **Recommended Remediation:**
  Normalize the URL path with `path.posix.normalize()` before checking against allowlisted prefixes, and explicitly reject any path segment containing `..` or `%2e%2e`.
- **Test Required to Prove Fix:**
  A test passing `/sap/bc/adt/../something_else` must throw `DISALLOWED_SAP_ENDPOINT`.
