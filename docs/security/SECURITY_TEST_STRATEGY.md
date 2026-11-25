# Fiorify Security Test Strategy & Quality Assurance Plan (SEC-012)
**Document Version:** 1.0.0  
**Test Harness:** Node.js LTS Native Test Runner (`node:test`)  
**Scope:** Automated Security Regression, RBAC, Multi-Tenancy, Token Lifecycles & Audit Logging

---

## 1. Test Suite Architecture

The security verification framework consists of dedicated, non-overlapping test suites designed for local execution, CI/CD verification, and production release gates:

| Suite Name | Test File | Scope & Invariants Verified |
| :--- | :--- | :--- |
| **Milestone 2 Auth Integration** | `backend/test/authIntegrationSuite.test.js` | Provider factory, RS256 token verification, local scrypt, demo sandbox, RBAC hierarchy, token revocation. |
| **Milestone 2.1 Hardening** | `backend/test/milestone2_1HardeningSuite.test.js` | Token hash indexing, refresh token family rotation, replay attack defense, secret redaction, audit chain verification. |
| **Security Master Regression** | `backend/test/secMasterRegressionSuite.test.js` | Protected field sanitization (SEC-004), multi-tenant isolation (SEC-002), separation of duties (SEC-005), 100KB body limit (SEC-010), security headers (SEC-011). |
| **Database Adapter & Probes** | `backend/test/databaseAdapterAndMigrations.test.js` | DatabaseAdapter abstraction, production fail-closed enforcement, VCAP_SERVICES binding, dialect migrations, readiness probe. |

---

## 2. Test Execution Commands

```bash
# 1. Syntax Verification across all backend files
node backend/scripts/check-syntax.js

# 2. Execute Security Master Regression Suite
node --test backend/test/secMasterRegressionSuite.test.js

# 3. Execute Milestone 2.1 Hardening Suite
node --test backend/test/milestone2_1HardeningSuite.test.js

# 4. Execute Authentication Integration Suite
node --test backend/test/authIntegrationSuite.test.js

# 5. Execute Database Engineering & Readiness Suite
node --test backend/test/databaseAdapterAndMigrations.test.js
```

---

## 3. Mandatory Security Verification Checkpoints

1. **Deny-by-Default Authorization:** Every route outside the explicit public allowlist (`/`, `/health`, `/health/liveness`, `/health/readiness`, `/auth/login`, `/auth/provider-info`) requires a valid token.
2. **Client Field Tampering Prevention:** Forbidden fields (`tenantId`, `createdBy`, `roles`, `isAdmin`, `approvalStatus`) are stripped from request bodies.
3. **Separation of Duties:** Assessment creators cannot approve their own assessments; administrative overrides require explicit `isOverride: true` and admin privileges.
4. **Token Family Replay Invalidation:** Using an already-consumed refresh token immediately invalidates the entire token family.
5. **Fail-Closed Production Invariant:** If `NODE_ENV === 'production'`, non-XSUAA providers and non-HANA database adapters abort server startup.
