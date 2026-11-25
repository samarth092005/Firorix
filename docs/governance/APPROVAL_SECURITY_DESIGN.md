# Fiorify — Cryptographic Approval Security Design
**Document Version:** 1.0.0  
**Scope:** Cryptographic Signatures, Separation of Duties, Role Hierarchies, and Boundary Protection (GOV-003, GOV-004, GOV-005)

---

## 1. Architectural Threat Model

In an enterprise modernization tool:
1. **Threat 1 (Forged Approval):** A developer crafts an HTTP PUT request injecting `leadArchitectApproval: { approved: true }` to commission custom code generation without oversight.
2. **Threat 2 (Self-Approval Escalation):** An author creates an assessment recommending an expensive custom RAP application and approves their own work.
3. **Threat 3 (Tampering Post-Approval):** After a Lead Architect approves an `ADD_AND_CONFIGURE` scope, the payload is modified in transit or in the database to commission custom code generation (`BUILD`).
4. **Threat 4 (Stale Approval Replay):** An old approval signature from months ago is replayed against a modified version of the assessment.

---

## 2. Cryptographically Bound Approval Signatures (GOV-004)

Fiorify counters these threats using keyed `HMAC-SHA256` signatures produced by `CryptographicSignatureService`.

### 2.1 Canonical Signature Payload
The signature is computed over a normalized, canonical representation of the assessment's state:

```typescript
const canonicalPayload = {
  assessmentId: assessment.id,
  tenantId: assessment.tenantId,
  version: assessment.version || 1,
  manifestHash: computeManifestHash(assessment),
  targetSystem: assessment.systemId,
  sapClient: assessment.client,
  approverId: approver.id,
  approvalScope: options.approvalScope, // 'BUILD' | 'ADD_AND_CONFIGURE'
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};
```

### 2.2 Signature Generation & Verification
- **Signing Algorithm:** `HMAC-SHA256` using the application signing key (`FIORIFY_SIGNING_KEY` / `FIORIX_APPROVAL_SECRET`).
- **Signature Format:** `v2.<hex_digest>`
- **Constant-Time Verification:** Verification extracts the canonical fields, recomputes the HMAC digest, and validates it against the stored signature using `crypto.timingSafeEqual()`, completely preventing timing attacks.
- **Fail-Closed Guarantees:**
  - If any property in `canonicalPayload` (e.g. `version`, `manifestHash`, `targetSystem`, `approvalScope`) is altered, the HMAC check fails.
  - If `Date.now() > expiresAt`, verification fails with `DEPLOYMENT_APPROVAL_EXPIRED`.
  - In production mode (`NODE_ENV=production`), if no signing secret is configured, the service fails closed with `SIGNATURE_KEY_UNAVAILABLE`.

---

## 3. Strict Separation of Duties (GOV-003)

Fiorify enforces strict separation between assessment authoring and formal approval:

```javascript
if (isCreator) {
  const err = new Error('Separation of duties policy violation: Assessment creator cannot approve their own assessment.');
  err.code = 'SEPARATION_OF_DUTIES_VIOLATION';
  throw err;
}
```

### Non-Bypassable Rule
Even users with administrative privileges (`ADMIN`) are barred from approving assessments they created. If an Admin creates an assessment, a peer with Lead Architect or Approver privileges must review and sign it.

---

## 4. Boundary Revalidation (GOV-005)

Approval is not a one-time check at the UI level. It is revalidated at every downstream engineering boundary:
1. **Handoff Boundary (`GenerationHandoffStore.createHandoff`):**
   - Verifies the cryptographic signature of the source assessment.
   - Recomputes the manifest hash. If `materialRequirementsChanged` is true or properties changed, handoff creation is blocked.
2. **Generation Boundary (`GenerationProjectService.createProject`):**
   - Validates that the assessment has a valid, non-expired signature before creating any project workspace, CDS view files, or UI5 components.
