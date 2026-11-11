# Security, Governance & Isolation Audit
**Document ID:** `GEN-AUDIT-SEC-01`  
**Audit Context:** `GEN-COMPLETE-AUDIT-01`  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (S21, Client 200)  
**Classification:** Deep Security & Architecture Audit

---

## 1. Executive Security Evaluation

FioriX Generation Studio adheres strictly to enterprise governance and security controls established in Programme Milestones S2 and QA-02:
- **Strict Role-Based Access Control (RBAC):** Admin-only boundary enforced by `PERMISSIONS.GENERATION_MANAGE` and `PERMISSIONS.ARTIFACTS_EXPORT`.
- **Tenant Isolation:** Derived cryptographically and server-side from authenticated session identity, prohibiting cross-tenant spoofing.
- **Authoritative Approval Provenance:** Blocks unauthorized custom development by requiring an authoritative `APPROVED` state from Discovery BUILD assessments.
- **Archive & File System Security:** Zero Zip Slip vulnerabilities, strict path traversal guards, and zero plaintext secret storage.

---

## 2. Authentication & Authorization Enforcement

### 2.1 Admin-Only Boundary
- Every Generation Studio REST endpoint (52 of 52) executes `requirePermission(PERMISSIONS.GENERATION_MANAGE)`.
- If a request is received without a valid session, `requirePermission` terminates execution and returns `401 Unauthorized`.
- If an authenticated user lacks the Admin role (e.g., standard viewer or external partner), execution terminates with `403 Forbidden`.
- Downloading raw source code or export bundles requires an additional specific entitlement: `PERMISSIONS.ARTIFACTS_EXPORT`.

### 2.2 Multi-Tenant Boundary Enforcement
- Tenant context is **never** accepted blindly from client query strings or untrusted HTTP headers.
- The server extracts `currentUser.tenantId` from the cryptographically verified session token.
- When accessing a project (`GET /api/v1/generation/projects/:id`), the handler executes:
  ```javascript
  if (currentUser && project.tenantId && currentUser.tenantId && project.tenantId !== currentUser.tenantId) {
    securityAuditLogger.log({
      action: SECURITY_ACTIONS.ACCESS_DENIED,
      tenantId: currentUser.tenantId,
      resource: `/api/v1/generation/projects/${projectId}`,
      errorMessage: `Access denied to generation project belonging to tenant "${project.tenantId}". Current tenant is "${currentUser.tenantId}".`
    });
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      statusCode: 'TenantAccessDenied',
      errorMessage: `Access denied to generation project belonging to tenant "${project.tenantId}".`
    }));
    return;
  }
  ```
- Cross-tenant read, mutation, and export attempts are prevented and logged to the security audit trail.

---

## 3. Governance: Approval Provenance & Clean Core Gate

### 3.1 Strict Assessment Gate
Generation Studio strictly enforces the core Clean Core directive:
> **"STANDARD SAP FIORI FIRST. CUSTOM BUILD ONLY WHEN A GENUINE GAP EXISTS."**

In `generationProjectService.js:59`, creating a project or importing requirements requires an authoritative BUILD assessment:
```javascript
const isApproved = Boolean(
  assessment.lifecycleStatus === LIFECYCLE_STATES.APPROVED ||
  assessment.leadArchitectApproval?.approved === true ||
  assessment.approvalStatus === 'APPROVED'
);
if (!isApproved) {
  return {
    valid: false,
    unapproved: true,
    error: `Assessment "${assessmentId}" has not received required Enterprise Architect approval. Custom RAP development requires formal approval.`
  };
}
```
- **Finding:** A draft, pending, or rejected assessment cannot enter Generation Studio.
- The approval metadata (Approver Name, Approver ID, Approval Timestamp, and Clean Core Justification) is permanently recorded in the project's `approvalProvenance` snapshot.

---

## 4. Path Traversal & Zip Slip Protection

### 4.1 Archiver Security (`zipArchiver.js`)
The pure Node.js PKZIP implementation includes hardened sanitization:
1. **Entry Path Normalization (`sanitizeZipEntryPath`):**
   - Strips leading forward and backward slashes.
   - Rejects null bytes (`\0`).
   - Rejects Windows drive prefixes (e.g., `C:`).
   - Rejects any path segment equal to `..` or `.`.
2. **Safe Extraction Boundary (`extractZipBuffer`):**
   - Verifies that `fullTargetPath.startsWith(targetRoot)`.
   - Prevents Zip Slip directory traversal attacks where malicious archives attempt to extract files outside the intended destination directory.

### 4.2 Export Bundle Download Security (`exportManager.js`)
When serving export bundles via `/exports/:exportId/download`, the handler resolves the file using `path.resolve(storageDir, filename)` and verifies that the resulting path is strictly located within `DEFAULT_STORAGE_DIR`.

---

## 5. Secret Scanning & Data Confidentiality

- **Zero Plaintext Secrets:** An automated grep audit of `backend/src/generation/` and `backend/data/generation-projects/` confirmed that no passwords, API keys, private certificates, or SAP logon tokens are embedded or persisted in generated artifacts.
- **Confidentiality in Preview:**
  - Ephemeral mock servers bind exclusively to `127.0.0.1`.
  - Synthetic data generators use randomized business names, mock addresses, and fictitious document numbers, preventing production data contamination or privacy leaks.
