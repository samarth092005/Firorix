# Fiorify — Assessment Lifecycle State Machine and Audit Ledger
**Document Version:** 1.0.0  
**Scope:** Lifecycle Transitions, Integrity Guards, and Immutable Hash-Chain Audit Logging (GOV-006)

---

## 1. Lifecycle State Machine

Assessments in Fiorify progress through a strictly controlled state machine. Direct state manipulation via arbitrary payload properties is barred; state transitions must follow validated pathways.

```
       ┌───────────────────────────────┐
       │             DRAFT             │ ◄──────────┐
       │ (Initial capture/evaluation)  │            │
       └──────────────┬────────────────┘            │
                      │                             │
                      ▼                             │
       ┌───────────────────────────────┐            │
       │        PENDING_REVIEW         │            │
       │ (Awaiting Architect Sign-off) │            │
       └───────┬───────────────┬───────┘            │
               │               │                    │
    Approve    │        Reject │                    │
               ▼               ▼                    │
       ┌──────────────┐ ┌──────────────┐            │
       │   APPROVED   │ │   REJECTED   │ ───────────┤
       └───────┬──────┘ └──────┬───────┘            │
               │               │                    │
       Archive │       Archive │            Archive │
               ▼               ▼                    │
       ┌───────────────────────────────┐            │
       │           ARCHIVED            │ ───────────┘
       │  (Terminal historical record) │   Re-activate to DRAFT only
       └───────────────────────────────┘
```

### Transition Integrity Rules:
- `DRAFT`: Can move to `PENDING_REVIEW` or `ARCHIVED`.
- `PENDING_REVIEW`: Can transition to `APPROVED` (with cryptographic signature), `REJECTED` (with required reason), or `ARCHIVED`.
- `APPROVED`: Once approved, cannot be reverted back to `DRAFT` or `PENDING_REVIEW`. Can only be retired to `ARCHIVED`.
- `REJECTED`: Can be resubmitted to `PENDING_REVIEW` or sent back to `DRAFT` for rework, or `ARCHIVED`.
- `ARCHIVED`: Terminal state. Re-activation is permitted **only** back to `DRAFT` to prevent unreviewed deployments.

---

## 2. Immutable Hash-Chained Audit Ledger

Every lifecycle transition, modification, or administrative action generates a cryptographically linked audit event stored in the assessment's `auditEvents` array and persisted in the audit table.

### 2.1 Event Schema
```typescript
interface AuditEvent {
  eventId: string;          // e.g. "AUD-1718000000000-01"
  timestamp: string;        // ISO 8601 UTC
  author: string;           // Display name
  actorId: string;          // Verified user identifier
  actorRole: string;        // User role
  previousState: string;    // e.g. "PENDING_REVIEW"
  newState: string;         // e.g. "APPROVED"
  action: string;           // "CREATED", "UPDATED", "APPROVED", "REJECTED", "ARCHIVED", "OVERRIDE"
  comment: string;          // Justification or transition remarks
  details: object;          // Scrubbed technical details
  previousHash: string;     // Hash of preceding event ("GENESIS" for event 0)
  integrityHash: string;    // SHA-256 digest of (event fields + previousHash)
}
```

### 2.2 Hash Chain Computation
The event's `integrityHash` is computed as follows:

$$\text{integrityHash} = \text{SHA256}(\text{eventId} + \text{timestamp} + \text{author} + \text{previousState} + \text{newState} + \text{action} + \text{comment} + \text{previousHash})$$

This creates an append-only hash chain identical to a blockchain ledger. Any alteration of past audit comments, timestamps, or state records immediately breaks the chain. The verification function `verifyAuditHashChain()` recomputes hashes from genesis to head and flags any tampering with precision.
