# Fiorify — Governance & Build Approval Security Specification
## Sprint S0 + S1 Enterprise Security Directives

**Status:** ACTIVE & ENFORCED  
**Security Classification:** Clean Core & Architecture Governance  
**Impact Areas:** `AssessmentStore`, `GenerationHandoffStore`, `AssessmentRoutes`, `HandoffRoutes`  

---

## 1. Canonical Two-Outcome Modernization Governance

Fiorify strictly limits business modernization recommendations to two authoritative outcomes:

1. **`ADD_AND_CONFIGURE`** (Display: *ADD & CONFIGURE*):
   - Standard SAP Fiori application exists in the target catalogue and satisfies business requirements through supported configuration, adaptation, or key-user extensibility.
2. **`BUILD`** (Display: *BUILD*):
   - Custom development (e.g. RAP Managed / Unmanaged application on SAP BTP / S/4HANA) is justified only after establishing that no standard Fiori app satisfies the requirements and technical extensibility is insufficient.

### Non-Outcome Governance States
The following are strictly treated as **readiness and verification states**, never as business modernization outcomes:
- `REVIEW`: Further architectural analysis or approval is pending.
- `PENDING_VERIFICATION`: Missing evidence or unverified system components.
- `INSUFFICIENT_EVIDENCE`: SAP catalogue or system metadata incomplete.

> [!IMPORTANT]
> `EXTEND` is completely retired as an outcome. Historical records with legacy `EXTEND` are safely hydrated with backward-compatible rationale, requiring architectural reassessment before any new business decision can be enacted.

---

## 2. Server-Authoritative Build Approval Security

### The Problem (Historical Vulnerability)
Prior iterations permitted client requests to supply approval strings such as:
- `payload.author = "Enterprise Architect"`
- `payload.architectName = "Lead Architect"`
- `payload.approvalObj.approver = "Architect"`

Such patterns allowed unauthorized actors or client UI manipulations to bypass governance controls.

### The Enforced Security Model
Under S0/S1 security enforcement:
1. **Zero Client Trust:** All client-supplied author, approver, and architect name strings are discarded for authorization purposes.
2. **Authenticated Actor Extraction:** The actor is resolved server-side from verified JWT tokens or platform identity providers (`authService.verifyToken`).
3. **Explicit Permission Required:** The actor must possess the `BUILD_ARCHITECT_APPROVER` permission or hold the `LEAD_ARCHITECT` / `CHIEF_ARCHITECT` role.
4. **Scope & Version Binding:**
   - Approvals are explicitly scoped to `BUILD`.
   - Approvals are cryptographically bound to the assessment ID and the exact `version` of the assessment at the moment of approval.
   - Any subsequent mutation to assessment requirements or metadata increments the version and invalidates the approval, requiring re-governance.
5. **Time-To-Live (TTL):** Approvals have an explicit expiration timestamp (`expiresAt`), defaulting to 30 days. Expired approvals are rejected automatically with `APPROVAL_EXPIRED`.
6. **Immutable Audit Chaining:** Approvals trigger an audit event in `assessment_audit_events` and a formal record in `build_architect_approvals` in PostgreSQL.

---

## 3. Precondition Verification for BUILD Recommendations

A `BUILD` recommendation is strictly gated by the recommendation engine. All 9 prerequisites must be fulfilled:
1. Target SAP release identified and supported.
2. Complete catalogue search conducted (provenance verified; non-empty search executed).
3. No standard Fiori application exists OR existing candidates confirmed to have critical functional gaps.
4. SAP Clean Core extension alternatives (Key-User Extensibility, Developer Extensibility, BAdIs) evaluated.
5. Technical feasibility confirmed (RAP model and OData V4 compatibility).
6. Business justification documented.
7. Enterprise Architect approval recorded.
8. System component compatibility verified (S4CORE, SAP_BASIS, SAP_UI).
9. Authorization requirements (PFCG catalog, IAM roles) identified.

If any prerequisite fails or catalogue evidence is missing, the engine outputs `REVIEW` or `INSUFFICIENT_EVIDENCE`, never defaulting to `BUILD`.
