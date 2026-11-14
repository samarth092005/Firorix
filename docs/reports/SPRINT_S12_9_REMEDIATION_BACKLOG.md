# FIORIFY — SPRINT 12.9 REMEDIATION BACKLOG
## Prioritized Action Plan, Security Hardening & Artifact Remediation Specifications

**Product:** Fiorify  
**Repository:** `https://github.com/samarth092005/Firorix`  
**Working Branch:** `test-01`  
**Baseline HEAD Commit:** `718e71d59f74d4305dc0cd8e2d7dfcd35ff5b45f`  
**Lead Auditor:** Principal Software Architect, Senior Security Auditor & Lead QA Engineer  
**Date:** 2026-11-14  
**Audit Status:** Baseline Established (`PASS WITH LIMITATIONS`)

---

# 1. REMEDIATION BACKLOG OVERVIEW

This document outlines the engineering remediation backlog established by the independent audit conducted in Sprint 12.9. These items represent technical debt, security vulnerabilities, and artifact generation limitations that must be addressed during Sprint 13 hardening prior to commercial enterprise deployment.

### Priority & Severity Matrix

| Task ID | Item Title | Category | Severity | Sprint Target | Status |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **REM-SEC-01** | Enforce Admin-Only Authorization for Separation of Duties Override | Security / RBAC | **HIGH** | Sprint 13.1 | **Ready** |
| **REM-SEC-02** | Default to Strict Auth & Principle of Least Privilege in Server Fallback | Security / Auth | **HIGH** | Sprint 13.1 | **Ready** |
| **REM-SEC-03** | Transition SAP Technical User from `SAP_ALL` to Dedicated RFC/HTTP Role | SAP Security | **HIGH** | Sprint 13.1 | **Ready** |
| **REM-SEC-04** | Implement HMAC-SHA256 / KMS Keyed Digital Signatures for Approvals | Cryptography | **MEDIUM** | Sprint 13.2 | **Ready** |
| **REM-SEC-05** | Enforce Path Canonicalization in SAP HTTP Client Allowlist | Security / SSRF | **MEDIUM** | Sprint 13.2 | **Ready** |
| **REM-ART-01** | Automated Scaffold & Manual Handover Workflow for Behavior Implementation Classes | RAP Generation | **HIGH** | Sprint 13.3 | **Ready** |
| **REM-ART-02** | Native ADT REST XML Generator for Activatable Service Binding Creation | RAP Generation | **HIGH** | Sprint 13.3 | **Ready** |
| **REM-ART-03** | Domain-Specific Authorization Object Generation in DCL Access Controls | CDS Generation | **MEDIUM** | Sprint 13.3 | **Ready** |
| **REM-UI-01** | Mock Preview Control Bar Polish & Top Navigation Button Alignment | UI / UX | **LOW** | Sprint 13.4 | **Ready** |

---

# 2. DETAILED REMEDIATION ITEM SPECIFICATIONS

---

### Task ID: REM-SEC-01
#### Enforce Admin-Only Authorization for Separation of Duties Override
- **Category:** Security / Authorization (RBAC)
- **Severity:** `HIGH`
- **Target Files:**
  - `backend/src/services/assessmentStore.js` (Lines 931–938, 1012–1019)
  - `backend/src/routes/assessmentRoutes.js` (Line 421)
- **Root Cause & Vulnerability Description:**
  In `assessmentStore.js`, an assessment creator is forbidden from approving their own assessment unless `updates.isOverride === true`. However, neither `assessmentRoutes.js` nor `assessmentStore.js` validates whether the calling user possesses the `ADMIN` role before honoring `isOverride`. Any unprivileged caller sending `{ "isOverride": true }` in the POST body bypasses the separation of duties check.
- **Technical Implementation Plan:**
  1. In `assessmentRoutes.js`, inspect `req.user.role`. If `req.body.isOverride === true`, assert `req.user.role === USER_ROLES.ADMIN`. If not, return HTTP `403 Forbidden` (`ADMIN_OVERRIDE_REQUIRED`).
  2. In `assessmentStore.js`, accept `userContext` as an explicit parameter in `approveAssessment()`. Verify `userContext.role === USER_ROLES.ADMIN` whenever `updates.isOverride === true`.
  3. Emit an immutable audit event whenever an administrative override is exercised: `AUDIT_EVENT_TYPES.ASSESSMENT_OVERRIDE_APPROVAL`.
- **Verification & Test Strategy:**
  - Unit test in `backend/test/sec01Security.test.js`:
    - Case A: Creator calls approve with `isOverride: false` $\rightarrow$ Throws `SEPARATION_OF_DUTIES_VIOLATION`.
    - Case B: Creator with `CONSULTANT` role calls approve with `isOverride: true` $\rightarrow$ Rejected with `403 Forbidden`.
    - Case C: Approver with `ADMIN` role calls approve with `isOverride: true` $\rightarrow$ Successfully approved with audit log record.

---

### Task ID: REM-SEC-02
#### Default to Strict Auth & Principle of Least Privilege in Server Fallback
- **Category:** Security / Authentication
- **Severity:** `HIGH`
- **Target File:**
  - `backend/src/server.js` (Lines 220–233)
- **Root Cause & Vulnerability Description:**
  When `FIORIFY_ENFORCE_AUTH !== 'true'`, unauthenticated HTTP requests are silently assigned the identity of `USR-ADMIN-01` with `USER_ROLES.ADMIN` on tenant `DEFAULT-TENANT-S21`. In non-production testing or misconfigured production instances, an unauthenticated caller inherits full platform administrative privileges.
- **Technical Implementation Plan:**
  1. Modify `enforceAuth` evaluation in `server.js`:
     ```javascript
     const isProduction = process.env.NODE_ENV === 'production';
     const enforceAuth = isProduction || process.env.FIORIFY_ENFORCE_AUTH === 'true';
     ```
  2. If `enforceAuth` is disabled (development mode only), assign `USER_ROLES.VIEWER` by default instead of `USER_ROLES.ADMIN`.
  3. Require an explicit development credential header (e.g. `x-fiorify-dev-role: ADMIN`) along with a valid development secret to simulate higher privilege levels locally.
- **Verification & Test Strategy:**
  - Unit test verifying unauthenticated requests return `401 Unauthorized` when `NODE_ENV=production`.
  - Unit test verifying development requests default to `VIEWER` permissions.

---

### Task ID: REM-SEC-03
#### Transition SAP Technical User from `SAP_ALL` to Dedicated RFC/HTTP Role
- **Category:** SAP Security & Landscape Governance
- **Severity:** `HIGH`
- **Target Environment:** SAP System S21 / Client 200 (Profile of `int_samarth`)
- **Root Cause & Risk Description:**
  The configured SAP technical communication user `int_samarth` possesses the `SAP_ALL` profile in S21. While Fiorify software rules and network proxies enforce read-only safety, an over-privileged account presents an unacceptable enterprise risk of privilege misuse or compliance audit failure.
- **Technical Implementation Plan:**
  1. Define a custom SAP Authorization Role (e.g. `Z_FIORIFY_COMMUNICATION_RO`) in transaction `PFCG`.
  2. Populate the role with strictly required read-only authorizations:
     - `S_RFC`: `RFC_TYPE=FUGR`, `RFC_NAME=RFCPING,STU3,SADT_*`, `ACTVT=16` (Execute).
     - `S_SERVICE`: Gateway catalog read services (`IWFND/SG_MED_CATALOG`, `/IWBEP/CATALOG_SERVICE`).
     - `S_TABU_DIS`: `ACTVT=03` (Display) for dictionary tables `TSTC`, `TSTCT`, `TADIR`, `DD02L`, `DD03L`.
     - `S_ADT_RES`: Read-only ADT resource access (`ACTVT=03`).
  3. Reassign `int_samarth` to user type `B` (System User) and remove `SAP_ALL`.
- **Verification & Test Strategy:**
  - Run SAP Preflight suite (`node --test backend/test/s11SapPreflight.test.js`) against S21. All discovery, echo, and catalog probes must continue to return HTTP 200 OK.

---

### Task ID: REM-SEC-04
#### Implement HMAC-SHA256 / KMS Keyed Digital Signatures for Approvals
- **Category:** Cryptography
- **Severity:** `MEDIUM`
- **Target Files:**
  - `backend/src/generation/deployment/deploymentOrchestrationService.js` (Lines 239–241)
  - `backend/src/generation/projects/specificationVersioningService.js` (Lines 145–155)
- **Root Cause & Risk Description:**
  The current approval signature is an unsalted SHA-256 digest of plaintext metadata (`${plan.id}:${plan.planHash}:${plan.artifactManifestHash}:...`). Because there is no secret cryptographic key involved, an entity with database write access could forge approved deployment plans or specifications.
- **Technical Implementation Plan:**
  1. Introduce `crypto.createHmac('sha256', process.env.FIORIFY_SIGNING_KEY)` for signature generation.
  2. For enterprise deployments, integrate with SAP BTP Destination KeyStore or Cloud KMS to support RSA-PSS / ECDSA asymmetric signatures.
  3. Add signature verification logic: `verifySignature(payload, signature, publicKeyOrSecret)`.
- **Verification & Test Strategy:**
  - Test signature verification against tampered payloads.
  - Test rejection of signatures computed with mismatched keys.

---

### Task ID: REM-SEC-05
#### Enforce Path Canonicalization in SAP HTTP Client Allowlist
- **Category:** Security / SSRF Prevention
- **Severity:** `MEDIUM`
- **Target File:**
  - `backend/src/infrastructure/connectivity/sapHttpClient.js` (Lines 66–75)
- **Root Cause & Risk Description:**
  Allowed paths are validated using string prefix matching (`this.allowedPrefixes.some(prefix => endpoint.startsWith(prefix))`). Relative path traversal sequences (e.g. `/sap/bc/adt/../../admin`) or query parameters could theoretically bypass prefix checks if not strictly normalized.
- **Technical Implementation Plan:**
  1. Parse the request URL using `new URL(endpoint, 'http://localhost')`.
  2. Normalize the pathname using `path.posix.normalize(parsedUrl.pathname)`.
  3. Verify that `normalizedPath` matches an allowlisted prefix and contains no `..` path traversal segments.
- **Verification & Test Strategy:**
  - Unit tests attempting traversal sequences (`/sap/bc/adt/../something_forbidden`) must throw `ENDPOINT_NOT_ALLOWED`.

---

### Task ID: REM-ART-01
#### Automated Scaffold & Manual Handover Workflow for Behavior Implementation Classes
- **Category:** ABAP RAP Generation
- **Severity:** `HIGH`
- **Target File:**
  - `backend/src/generation/generators/behaviorClassGenerator.js`
- **Root Cause & Risk Description:**
  Generated behavior implementation classes (`BP_*.clas.abap`) contain `TODO` comments for business logic validations (e.g. `validateCustomer`, `validateDates`). If imported into an SAP development system without developer handover, the business entity will compile but perform zero business logic or validation checks.
- **Technical Implementation Plan:**
  1. Add an artifact metadata flag: `requiresDeveloperImplementation: true`.
  2. Generate concrete sample ABAP validation blocks (e.g., checking if customer number is non-initial, validating start date precedes end date) rather than empty `TODO` comments.
  3. In the Export package, include a dedicated developer guide: `DEVELOPER_HANDOVER_GUIDE.md` detailing every method that requires custom ABAP code before transport release.
- **Verification & Test Strategy:**
  - Generator unit test asserting generated ABAP classes include functional defensive validation logic.
  - Verification that the Export ZIP includes the developer guide.

---

### Task ID: REM-ART-02
#### Native ADT REST XML Generator for Activatable Service Binding Creation
- **Category:** ABAP RAP Generation
- **Severity:** `HIGH`
- **Target File:**
  - `backend/src/generation/generators/serviceBindingProposalGenerator.js`
- **Root Cause & Risk Description:**
  The generated `.srvb.json` is a JSON planning document. SAP S/4HANA ADT requires service bindings to be created as TADIR objects (`R3TR SRVB`) via ADT or Eclipse. Users currently have to manually re-enter binding parameters in ADT.
- **Technical Implementation Plan:**
  1. Generate the native ADT XML payload format for service bindings:
     - Root tag `<asx:abap xmlns:asx="http://www.sap.com/abapxml">`
     - ADT Service Binding representation containing `bindingType: "ODATA_V4"` and `serviceDefinitionName: "Z_SD_CUSTOM"`.
  2. Include an ADT CLI script (`create_srvb.ps1` / `create_srvb.sh`) in the export bundle to automate service binding registration via ADT REST API.
- **Verification & Test Strategy:**
  - Unit test verifying generated XML structure matches SAP S/4HANA 2023 ADT schema.

---

### Task ID: REM-ART-03
#### Domain-Specific Authorization Object Generation in DCL Access Controls
- **Category:** CDS Generation & Security
- **Severity:** `MEDIUM`
- **Target File:**
  - `backend/src/generation/generators/dclAccessControlGenerator.js`
- **Root Cause & Risk Description:**
  Generated DCL access control rules check generic table authorization object `S_TABU_DIS` with default authorization group `&NC&`. For business transactions such as Sales Orders (`VA01`), access control should check domain-specific authorization objects (e.g. `V_VBAK_VKO` for Sales Organization).
- **Technical Implementation Plan:**
  1. Enhance `dclAccessControlGenerator.js` to inspect transaction domain metadata.
  2. Map standard transaction domains to corresponding authorization objects:
     - Sales (`VA01`): `V_VBAK_VKO` (Sales Organization), `V_VBAK_AAT` (Sales Document Type)
     - Purchasing (`ME21N`): `M_BEST_EKO` (Purchasing Organization)
     - Materials (`MM01`): `M_MATE_WRK` (Plant)
  3. Generate DCL rules incorporating the relevant organizational fields.
- **Verification & Test Strategy:**
  - Test verifying VA01 generates DCL checking `V_VBAK_VKO`.

---

### Task ID: REM-UI-01
#### Mock Preview Control Bar Polish & Top Navigation Button Alignment
- **Category:** UI / UX Enhancement
- **Severity:** `LOW`
- **Target File:**
  - `frontend/src/features/preview/FioriMockPreviewView.tsx`
- **Root Cause & Description:**
  In the Fiori Mock Preview header, the button group (`Restart`, `Reset Data`, `Open Tab`, `Stop Preview`) and the primary action button (`Next: Review & Export`) display slight flexbox alignment and padding inconsistencies when rendered at compact browser widths.
- **Technical Implementation Plan:**
  1. Align all action buttons inside a unified `flex items-center gap-2` container.
  2. Ensure consistent button heights (`h-9`), typography, and border radius.
  3. Add responsive wrapping so buttons gracefully adapt to tablet and smaller laptop viewports.
- **Verification & Test Strategy:**
  - Visual regression inspection and Vitest component test for `FioriMockPreviewView.test.tsx`.

---

# 3. IMPLEMENTATION ROADMAP & SPRINT PLANNING

```
Sprint 13.1 (Security Hardening):
  ├── REM-SEC-01: Admin RBAC on SoD Override
  ├── REM-SEC-02: Strict Auth & Principle of Least Privilege in Server
  └── REM-SEC-03: Transition SAP int_samarth from SAP_ALL to Z_FIORIFY_COMMUNICATION_RO

Sprint 13.2 (Cryptographic & Network Hardening):
  ├── REM-SEC-04: HMAC-SHA256 Keyed Signatures for Approvals
  └── REM-SEC-05: Path Canonicalization in SapHttpClient

Sprint 13.3 (RAP & CDS Artifact Completion):
  ├── REM-ART-01: Scaffold & Handover Workflow for Behavior Classes
  ├── REM-ART-02: Native ADT REST XML for Service Bindings
  └── REM-ART-03: Domain Authorization Objects in DCL

Sprint 13.4 (UI Polish & Pilot Rollout):
  └── REM-UI-01: Preview Bar Layout Alignment
```

---

# 4. REMEDIATION GOVERNANCE & ACCEPTANCE CRITERIA

1. **Zero SAP Modifications:** Remediations must NOT introduce any automated write operations into SAP S21.
2. **Preservation of Existing Tests:** The 247 verified passing tests must remain green with zero regressions.
3. **Audit Trail Completeness:** All security-relevant actions must continue emitting structured audit logs to the Workflow Audit feature.
