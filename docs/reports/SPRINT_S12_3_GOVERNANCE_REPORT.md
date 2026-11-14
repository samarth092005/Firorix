# FIORIFY — SPRINT 12.3 RBAC & GOVERNANCE REPORT
## Two-Outcome Modernization Governance, Separation of Duties & Cryptographic Approvals

**Architecture Rule:** Exactly two active modernization business outcomes: `ADD_AND_CONFIGURE` and `BUILD`.  
**Approval Model:** Server-side separation of duties; self-approval prohibited; cryptographic signatures.  
**Classification:** ENTERPRISE CLEAN CORE GOVERNANCE  

---

# 1. TWO-OUTCOME MODERNIZATION GOVERNANCE

Fiorify enforces Clean Core discipline by eliminating ambiguous modernization decisions:

```
               [Discovered SAP Transaction (e.g. VA01 / F-53)]
                                     │
                                     ▼
                    [Official SAP Fiori Apps Library Search]
                                     │
             ┌───────────────────────┴───────────────────────┐
             ▼                                               ▼
   Standard Candidate Found                        No Viable Standard App
       (Fit Score >= 70%)                          (Documented Capability Gaps)
             │                                               │
             ▼                                               ▼
   ┌───────────────────┐                           ┌───────────────────┐
   │ ADD & CONFIGURE   │                           │       BUILD       │
   │ (Standard Fiori)  │                           │   (Clean Core)    │
   └───────────────────┘                           └───────────────────┘
     Standard Catalog                              Lead Architect Approval
     Adoption & IAM                                13-Gate Readiness Validation
     No Custom ABAP                                Custom RAP Backend + UI5
```

### Critical Governance Directives:
- **`REVIEW` / `PENDING_VERIFICATION` / `INSUFFICIENT_EVIDENCE`:** These are transient workflow/readiness states, NEVER final business outcomes.
- **Legacy `EXTEND` Records:** Preserved for audit integrity, but never presented as an active selectable outcome.
- **BUILD Guardrails:** Cannot be triggered without documented candidate evaluations and Lead Enterprise Architect authorization.

---

# 2. ROLE-BASED ACCESS CONTROL (RBAC) MATRIX

| Capability | VIEWER | REQUESTER | SAP_CONSULTANT | LEAD_ARCHITECT | APPROVER | ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **View Dashboards & Reports** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Run Transaction Discovery** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Evaluate Fit-Gap & Recommendations** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Submit Assessment for Review** | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Approve Assessment (Separation of Duties)** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Sign-Off BUILD Modernization Decision** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Create Generation Project** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Edit Data Model & Architecture** | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| **Sign-Off Specification Version** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Approve Deployment Plan** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Execute Deployment Staging Guard** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Sync Canonical Catalogue** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

# 3. SEPARATION OF DUTIES VERIFICATION

1. **Creator-Approver Separation:** The user who author/submits an assessment or deployment plan cannot act as its approver (`assertStrictSeparationOfDuties()`).
2. **Immutable Audit Trail:** All approval, rejection, and decision changes write immutable records with SHA-256 signatures to `security_audit_logs`.

---

# 4. CONCLUSION & CHECKPOINT 8 SIGN-OFF

The governance model strictly prevents architectural degradation and unapproved custom development.
Proceeding to **SPRINT 12.4: Auditability and Observability**.
