# Fiorify Multi-Tenant Isolation & Boundary Enforcement Design (SEC-002, SEC-003)
**Document Version:** 1.0.0  
**Scope:** Architecture, Data Storage, Connection Pooling & API Isolation

---

## 1. Architectural Strategy

Fiorify supports multi-tenancy across heterogeneous deployment topologies, ranging from dedicated enterprise customer instances to multi-tenant Software-as-a-Service (SaaS) environments deployed on SAP BTP Cloud Foundry.

```
                  Client Request: GET /api/v1/assessments
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ Header: Authorization: Bearer <JWT>   │
                 │ Verified claims: { tenantId: 'T-42' } │
                 └───────────────────┬───────────────────┘
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │    Auth Context Resolver    │
                      │  currentUser.tenantId='T-42'│
                      └──────────────┬──────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         │                                                       │
         ▼                                                       ▼
 ┌───────────────────────────────┐               ┌───────────────────────────────┐
 │     In-Memory / File Store    │               │  Database Persistence Layer   │
 │                               │               │                               │
 │ records.filter(r =>           │               │ withTenantClient('T-42', cl)  │
 │   r.tenantId === 'T-42'       │               │   SET CONFIG 'app.tenant'     │
 │ )                             │               │   SELECT * FROM assessments   │
 │                               │               │   WHERE tenant_id = 'T-42'    │
 │ Rejects cross-tenant access   │               │   DISCARD ALL on release      │
 └───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. Multi-Tenant Layers of Defense

### Layer 1: Cryptographic Identity & Token Binding
- Tenant identity is derived from verified SAP BTP XSUAA token claims (`zdn` / `tenantId`).
- Forged client request headers (e.g. `X-Tenant-Id`) submitted by non-administrative users are rejected immediately with HTTP 401 `TENANT_SPOOFING_FORBIDDEN`.
- Administrative cross-tenant access is permitted ONLY for authenticated users holding explicit `Fiorify.admin.access` or `Fiorify.tenants.manage` scopes.

### Layer 2: API & Route-Level Guardrails
- Single-entity lookups (`/api/v1/assessments/:id`, `/api/v1/generation/handoff/:id`, `/api/v1/generation/projects/:id`) inspect the entity's stored `tenantId`.
- If the entity's tenant does not match `currentUser.tenantId`, the request is denied with HTTP 403 `TenantAccessDenied`, and a `TENANT_ACCESS_VIOLATION` event is logged to the tamper-evident security audit log.
- Collection queries (`/api/v1/assessments`, `/api/v1/generation/handoff`, `/api/v1/generation/projects`) derive tenant identity **strictly from verified authentication context** (`currentUser.tenantId`). Client query parameters are strictly forbidden from overriding the tenant boundary; non-matching client tenant parameters return HTTP 403 `TenantAccessDenied`.

### Layer 3: Store & Repository Enforcement
- All 14 persistent stores (`AssessmentStore`, `GenerationHandoffStore`, `GenerationProjectStore`, etc.) inject `tenantId` as a mandatory filter in `list()`, `getById()`, `update()`, and `delete()`.
- Records created through stores are stamped with `tenantId` resolved from `currentUser.tenantId`.

### Layer 4: Connection Pool Isolation & Row Level Security (`withTenantClient` & RLS)
- In PostgreSQL, multi-tenant database sessions execute within `withTenantClient(tenantId, fn)`:
  1. `BEGIN;`
  2. `SELECT set_config('app.current_tenant', $1, true);`
  3. Execute queries with Row-Level Security (RLS) policies (`008_postgresql_rls_policies.sql`) enforced at the database engine level.
  4. `COMMIT;`
  5. **`DISCARD ALL;`** in the `finally` block before connection release back to the pool to prevent session contamination.
- In SAP HANA Cloud, tenant isolation is maintained via dedicated HDI container schemas, parameterised tenant filters, and session context unsetting.

---

## 3. Verified Security Tests

1. `secMasterRegressionSuite.test.js`:
   - Tenant Alpha creates assessment `VA01`; Tenant Beta creates assessment `ME21N`.
   - Query as Tenant Alpha yields ONLY `VA01`.
   - Query as Tenant Beta yields ONLY `ME21N`.
   - Cross-tenant access attempt returns zero records or HTTP 403 `TenantAccessDenied`.
2. `authIntegrationSuite.test.js`:
   - Non-admin tenant spoofing rejected with HTTP 401 `TENANT_SPOOFING_FORBIDDEN`.
   - Authenticated Admin user cross-tenant management verified.
