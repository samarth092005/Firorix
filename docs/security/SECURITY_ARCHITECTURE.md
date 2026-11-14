# Fiorify — Security Architecture Specification

## 1. Security Architecture Principles

Fiorify is architected with defense-in-depth security across all boundaries:
1. **Authentication by Default**: Production environments strictly reject unauthenticated traffic.
2. **Separation of Duties (SoD)**: Creators cannot approve their own assessments; administrative overrides are strictly restricted and audited.
3. **Cryptographic Integrity**: Keyed HMAC-SHA256 signatures with key versioning replace unauthenticated plain digests.
4. **Tenant Isolation**: Mandatory tenant filters on every database read/write.
5. **Zero SAP Modifications**: Hardened outbound HTTP client preventing mutating operations to live SAP landscapes.

---

## 2. Cryptographic Approval Integrity (Sprint 13.2 / REM-SEC-03)

### 2.1 Threat Model & Remediation
Prior to Sprint 13.2, approvals used unkeyed SHA-256 digests (`crypto.createHash('sha256')`). An attacker could manipulate the payload and recompute the digest.
**Sprint 13.2 Remediation**:
- Keyed HMAC-SHA256 implemented via `CryptographicSignatureService` (`backend/src/infrastructure/security/cryptographicSignatureService.js`).
- Signatures formatted as: `sig:<keyVersion>:<hmac_hex>` (e.g. `sig:v1:a8f...`).
- Active signing secret loaded from `FIORIFY_SIGNING_SECRET` or `FIORIFY_APPROVAL_SECRET`.
- Verification enforces `crypto.timingSafeEqual` to defeat timing attacks.

### 2.2 Key Rotation & Enterprise KMS Abstraction

```mermaid
flowchart TD
    subgraph KMS_Layer ["Cryptographic Provider Abstraction"]
        KMS_BASE["KmsSignatureProvider (Base Interface)"]
        LOCAL_HMAC["LocalHmacSignatureProvider\n(Key Ring: v1, v2, ...)\n[Active Provider]"]
        AWS_KMS["AwsKmsSignatureProvider\n[Extensible Plugin]"]
        AZURE_KV["AzureKeyVaultProvider\n[Extensible Plugin]"]
        GCP_KMS["GcpCloudKmsProvider\n[Extensible Plugin]"]
    end

    subgraph Service_Consumers ["Fiorify Domain Consumers"]
        DEP_ORCH["Deployment Orchestration Service\n(approveDeploymentPlan / executeDeploymentPlan)"]
        SPEC_VER["Specification Versioning Service\n(processApproval / verifyApprovalSignature)"]
    end

    KMS_BASE <|-- LOCAL_HMAC
    KMS_BASE <|-- AWS_KMS
    KMS_BASE <|-- AZURE_KV
    KMS_BASE <|-- GCP_KMS

    DEP_ORCH --> LOCAL_HMAC
    SPEC_VER --> LOCAL_HMAC
```

- **Fail-Closed in Production**: If `FIORIFY_SIGNING_SECRET` is missing in `production` mode, the application halts at initialization with `MISSING_SIGNING_SECRET`.
- **Zero-Downtime Rotation**: Multiple historical keys can be loaded via `FIORIFY_SIGNING_KEYS_JSON`. The active key is set via `FIORIFY_SIGNING_KEY_VERSION`.
- **Backward-Compatible Verification**: Historical approvals created with 64-character unkeyed SHA-256 digests are identified, validated against their canonical payload, and logged as `UNAUTHENTICATED_LEGACY_DIGEST` with a recommendation to re-sign.

---

## 3. Separation of Duties (Sprint 13.1 / REM-SEC-01)

1. **Creator-Approver Separation**:
   - `assessmentStore.approveAssessment(id, userContext)` verifies `assessment.created_by !== userContext.id`.
   - If creator attempts self-approval, throws `CREATOR_CANNOT_APPROVE` (HTTP 403).
2. **Administrative Override Gate**:
   - Setting `isOverride: true` requires authenticated `ADMIN`, `LEAD_ARCHITECT`, or `CHIEF_ARCHITECT` role.
   - Non-admin attempts with `isOverride: true` throw `UNAUTHORIZED_OVERRIDE` (HTTP 403).
   - All overrides log an immutable audit event: `ADMIN_OVERRIDE_APPROVED` in `security_audit_events`.

---

## 4. Authentication Defaults & Environment Boundaries (Sprint 13.1 / REM-SEC-02)

1. **Production Mode (`NODE_ENV=production`)**:
   - Missing or invalid `Authorization: Bearer <jwt>` returns HTTP 401.
   - Impersonation headers (`x-fiorify-role`, `x-fiorify-user`) are completely rejected.
2. **Development Mode**:
   - Unauthenticated requests default to `VIEWER` on `DEV-SANDBOX-TENANT`. Unauthenticated requests NEVER receive `ADMIN`.
   - Development impersonation requires `x-fiorify-admin-dev-secret`.

---

## 5. SAP HTTP Traversal & Read-Only Defense (Sprint 13.1 / REM-SEC-05)

- Canonicalization via `path.posix.normalize()`.
- Multi-stage decoding detects single (`%2e%2e`), double (`%252e%252e`), ambiguous separators (`%2f`, `%5c`), and null bytes (`%00`).
- Strict allowlist enforces standard SAP ICF/Gateway endpoints:
  - `/sap/opu/odata/*`
  - `/sap/opu/odata4/*`
  - `/sap/bc/adt/*`
  - `/sap/public/bc/icf/*`
- Approved host checking blocks SSRF attacks targeting unauthorized network resources.
- Read-only enforcement (`assertReadOnly`) blocks all mutating HTTP verbs (`POST`, `PUT`, `PATCH`, `DELETE`).
