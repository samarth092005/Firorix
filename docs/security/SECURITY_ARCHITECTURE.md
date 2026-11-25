# Fiorify Enterprise Security Architecture (SEC-012)
**Document Version:** 1.0.0  
**Target Platform:** SAP Business Technology Platform (BTP) Cloud Foundry  
**Compliance Standard:** SAP Cloud Security Framework & OWASP Top 10 API Security

---

## 1. Executive Summary & Architecture Principles

Fiorify is designed under a **Zero-Trust, Standard-First, and Defense-in-Depth** security philosophy. The platform governs the lifecycle of SAP transaction modernization, fit-gap assessment, and ABAP RESTful Application Programming (RAP) generation while enforcing strict operational boundaries against unauthorized access, tenant data bleeding, and live SAP system corruption.

```
                      [ User / External Client ]
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │         SAP BTP Application Router        │
             │   (TLS Termination, Session Routing, WAF) │
             └─────────────────────┬─────────────────────┘
                                   │
                         JWT Bearer (RS256)
                                   ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    Fiorify Node.js LTS Engine                          │
 │                                                                        │
 │   ┌───────────────────────┐         ┌──────────────────────────────┐   │
 │   │  Auth & Token Gate    │────────▶│ Security Headers & CORS Gate │   │
 │   │ (XSUAA / Local / Demo)│         │(CSP, HSTS, X-Frame-Options)  │   │
 │   └──────────┬────────────┘         └──────────────┬───────────────┘   │
 │              │                                     │                   │
 │              ▼                                     ▼                   │
 │   ┌───────────────────────┐         ┌──────────────────────────────┐   │
 │   │ Field Sanitizer Gate  │────────▶│ RBAC & Permission Middleware │   │
 │   │(Strip Protected Field)│         │ (Deny-by-default Enforcement)│   │
 │   └──────────┬────────────┘         └──────────────┬───────────────┘   │
 │              │                                     │                   │
 │              ▼                                     ▼                   │
 │   ┌────────────────────────────────────────────────────────────┐       │
 │   │               Multi-Tenant Store Boundary                  │       │
 │   │        (Tenant ID filtering on all queries & stores)       │       │
 │   └──────────┬─────────────────────────────────────┬───────────┘       │
 │              │                                     │                   │
 └──────────────┼─────────────────────────────────────┼───────────────────┘
                │                                     │
                ▼                                     ▼
 ┌──────────────────────────────┐   ┌──────────────────────────────────────┐
 │  Local Dev / CI Persistence  │   │  Production SAP BTP Persistence      │
 │  PostgreSQL Engine (pg.Pool) │   │  SAP HANA Cloud (Tenant HDI / Schema)│
 └──────────────────────────────┘   └──────────────────────────────────────┘
```

---

## 2. Security Boundaries & Invariants

| Layer | Security Control | Invariant Enforced |
| :--- | :--- | :--- |
| **Edge / Transport** | TLS 1.3, HSTS (`max-age=31536000`), CSP | HTTP traffic strictly encrypted; frame embedding prevented (`DENY`). |
| **Identity Provider** | SAP BTP XSUAA (JWT RS256) / Local Scrypt | In production, local and demo auth providers are strictly forbidden (`fail-closed`). |
| **Token Lifecycle** | SHA-256 Hashed Token Revocation & Family Tracking | Revoked tokens invalidated cluster-wide; replay attacks trigger family revocation. |
| **API Boundary** | Request Body Size Capping (`100KB`) | Denial-of-Service (DoS) and memory exhaustion attacks rejected with HTTP 413. |
| **Parameter Sanitization** | `sanitizeProtectedFields` | Client-controlled `createdBy`, `tenantId`, `roles`, `isAdmin` stripped before handlers. |
| **Authorization** | Deny-by-default RBAC (`requireRole`, `requirePermission`) | All privileged endpoints require affirmative, authenticated permissions. |
| **Multi-Tenancy** | Strict Tenant Discriminator (`tenantId`) Filtering | Cross-tenant queries return filtered results or HTTP 403 `TenantAccessDenied`. |
| **Audit Trail** | Tamper-Evident SHA-256 Audit Chaining | Audit events cryptographically linked to previous event hashes (`GENESIS` to leaf). |
| **SAP Landscape** | Zero-Modification Read-Only Policy (`int_samarth`) | Zero DDIC/ABAP changes on SAP S21; zero mutating HTTP requests (`POST`/`PUT`/`DELETE`). |

---

## 3. Threat Model & Countermeasures (STRIDE Analysis)

1. **Spoofing Identity:**
   - *Threat:* Malicious client injects falsified user IDs, roles, or tenant IDs via request headers or JSON bodies.
   - *Countermeasure:* Server-authoritative token validation extracts `userId`, `role`, and `tenantId` exclusively from cryptographically verified JWT signatures. `sanitizeProtectedFields` strips client fields.

2. **Tampering with Data:**
   - *Threat:* Alteration of audit trails or bypassing architectural review status.
   - *Countermeasure:* Assessments use SHA-256 linked-list cryptographic chaining. Any modification to a previous event breaks the cryptographic checksum verification.

3. **Repudiation:**
   - *Threat:* Approver denies authorizing a custom RAP application development.
   - *Countermeasure:* Authoritative user context is stamped with ISO 8601 timestamp, approver ID, approver name, and digital hash signature onto both assessment and handoff records.

4. **Information Disclosure:**
   - *Threat:* Tenant A accesses assessments, handoffs, or generation projects belonging to Tenant B.
   - *Countermeasure:* Multi-tenant isolation at route and store levels. `withTenantClient` sets tenant configuration in database session; stores filter on `tenantId`.

5. **Denial of Service (DoS):**
   - *Threat:* Large payloads flood Node.js event loop or exhaust memory.
   - *Countermeasure:* Streaming body length limiter terminates connections exceeding 100KB with HTTP 413. IP rate limiting protects authentication endpoints.

6. **Elevation of Privilege:**
   - *Threat:* Consultant attempts to self-approve a custom build without Lead Architect sign-off.
   - *Countermeasure:* Separation of Duties policy (`SEPARATION_OF_DUTIES_VIOLATION`) strictly forbids assessment creator from approving their own assessment. Build approvals require explicit `BUILD_ARCHITECT_APPROVER` permission.
