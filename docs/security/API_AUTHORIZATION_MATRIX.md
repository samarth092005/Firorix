# FIORIFY — API AUTHORIZATION & ACCESS CONTROL MATRIX

**Version:** 1.0.0  
**Status:** Canonical & Enforced  
**Audit Scope:** All REST API Endpoints in Fiorify Core Backend  
**Environments:** Local (Development/Demo) & SAP BTP Cloud Foundry (Production)

---

## 1. Principles of Access Control in Fiorify

1. **Deny-by-Default:** Any unauthenticated endpoint or action not explicitly registered as public is rejected with `401 Unauthorized`.
2. **Tenant Scoping:** All stateful operations, database records, and query filters MUST resolve and enforce `tenantId`. Cross-tenant record access is strictly forbidden.
3. **Role Normalization & Separation of Duties (SoD):**
   - `SAP_CONSULTANT`: Read/discovery, assessment authoring, generation project staging. Forbidden from self-approving assessments or triggering deployment plans.
   - `DEVELOPER`: CDS/UI5 code generation, sandbox preview, artifact editing.
   - `LEAD_ARCHITECT` / `ADMIN`: Architectural governance, approval of fit-gap assessments, catalogue sync/rollback, deployment authorization.
   - `VIEWER`: Read-only reporting and dashboard inspection.
4. **Protected Security Fields:** Client requests MUST NOT inject or mutate security metadata (`createdBy`, `creatorRole`, `tenantId`, `approvedBy`, `approvalStatus`, `approvalSignature`, `isAdmin`, `roles`).

---

## 2. Master Route Authorization Matrix

| Method | Endpoint | Required Authentication | Roles / Personas | Required Permission | Tenant Scope | Sensitive Data | State Mutating |
|---|---|---|---|---|---|---|---|
| **GET** | `/api/v1/health` | Public | Any | None | Global | No | No |
| **POST** | `/api/v1/auth/login` | Public | Any | None | Contextual | Auth tokens | Yes (Session) |
| **POST** | `/api/v1/auth/logout` | Authenticated | Any authenticated | None | Tenant-bound | Refresh token | Yes (Revocation) |
| **GET** | `/api/v1/auth/provider-info` | Public | Any | None | Global | No | No |
| **GET** | `/api/v1/auth/me` | Authenticated | Any authenticated | None | User profile | User details | No |
| **POST** | `/api/v1/system/reset-demo` | Authenticated | `ADMIN` | None | Tenant / Demo | System state | Yes |
| **GET** | `/api/v1/security/audit` | Authenticated | `ADMIN`, `LEAD_ARCHITECT` | `Fiorify.audit.read` | Tenant-scoped | Audit trail | No |
| **GET** | `/api/v1/systems` | Authenticated | Any authenticated | None | Tenant-scoped | SAP Config | No |
| **POST** | `/api/v1/systems` | Authenticated | `SAP_CONSULTANT`, `ADMIN`, `LEAD_ARCHITECT` | None | Tenant-scoped | Connection info | Yes |
| **GET** | `/api/v1/systems/:id` | Authenticated | Any authenticated | None | Tenant-scoped | System info | No |
| **POST** | `/api/v1/systems/:id/diagnostics` | Authenticated | `SAP_CONSULTANT`, `ADMIN`, `LEAD_ARCHITECT` | None | Tenant-scoped | Diagnostic logs | Yes |
| **GET** | `/api/v1/gateway-smoke-test` | Authenticated | `ADMIN` / Admin Secret | None | Global / S21 | SAP Catalog | No (Read-only) |
| **GET** | `/api/v1/gateway/services` | Authenticated | `ADMIN` / Admin Secret | None | Global / S21 | OData Catalog | No |
| **GET** | `/api/v1/gateway/services/:id/metadata` | Authenticated | `ADMIN` / Admin Secret | None | Global / S21 | EDMX Metadata | No |
| **GET** | `/api/v1/fiori-catalogue/apps/:appId` | Authenticated | Any authenticated | None | Global / Catalogue | Catalogue data | No |
| **GET** | `/api/v1/fiori-catalogue/search` | Authenticated | Any authenticated | None | Global / Catalogue | Catalogue data | No |
| **POST** | `/api/v1/fiori-catalogue/import` | Authenticated | `ADMIN` / Admin Secret | None | Global | File upload | Yes |
| **POST** | `/api/v1/fiori-catalogue/sync` | Authenticated | `ADMIN` | None | Global | Catalogue sync | Yes |
| **POST** | `/api/v1/fiori-catalogue/rollback` | Authenticated | `ADMIN` / Admin Secret | None | Global | Catalogue state | Yes |
| **GET** | `/api/v1/fiori-catalogue/status` | Authenticated | Any authenticated | None | Global | Metrics | No |
| **POST** | `/api/v1/discovery/transaction` | Authenticated | Any authenticated | None | Tenant-scoped | Transaction data | Yes (Search) |
| **POST** | `/api/v1/discovery/executions` | Authenticated | `SAP_CONSULTANT`, `DEVELOPER`, `ADMIN` | None | Tenant-scoped | Discovery state | Yes |
| **GET** | `/api/v1/discovery/executions` | Authenticated | Any authenticated | None | Tenant-scoped | Discovery state | No |
| **GET** | `/api/v1/discovery/executions/:id` | Authenticated | Any authenticated | None | Tenant-scoped | Discovery detail | No |
| **POST** | `/api/v1/discovery/match` | Authenticated | Any authenticated | None | Tenant-scoped | Matching results | Yes |
| **POST** | `/api/v1/discovery/mcp-assisted` | Authenticated | Any authenticated | None | Tenant-scoped | MCP evidence | Yes |
| **POST** | `/api/v1/fitgap/assess` | Authenticated | Any authenticated | None | Tenant-scoped | Fit-gap analysis | Yes |
| **POST** | `/api/v1/recommendations/generate` | Authenticated | Any authenticated | None | Tenant-scoped | Recommendations | Yes |
| **POST** | `/api/v1/assessments` | Authenticated | `SAP_CONSULTANT`, `DEVELOPER`, `ADMIN` | None | Tenant-scoped | Governance record | Yes |
| **GET** | `/api/v1/assessments` | Authenticated | Any authenticated | None | Tenant-scoped | Assessments list | No |
| **GET** | `/api/v1/assessments/summary` | Authenticated | Any authenticated | None | Tenant-scoped | Dashboard KPIs | No |
| **GET** | `/api/v1/assessments/:id` | Authenticated | Any authenticated | None | Tenant-scoped | Assessment detail | No |
| **PUT** | `/api/v1/assessments/:id` | Authenticated | `SAP_CONSULTANT`, `ADMIN`, `LEAD_ARCHITECT` | Role-governed | Tenant-scoped | Governance state | Yes |
| **POST** | `/api/v1/assessments/:id/archive` | Authenticated | `ADMIN`, `LEAD_ARCHITECT` | None | Tenant-scoped | Assessment state | Yes |
| **GET** | `/api/v1/assessments/:id/audit` | Authenticated | Any authenticated | None | Tenant-scoped | Audit entries | No |
| **POST** | `/api/v1/handoffs` | Authenticated | `SAP_CONSULTANT`, `DEVELOPER`, `ADMIN` | None | Tenant-scoped | Handoff bundle | Yes |
| **GET** | `/api/v1/handoffs` | Authenticated | Any authenticated | None | Tenant-scoped | Handoffs list | No |
| **GET** | `/api/v1/handoffs/:id` | Authenticated | Any authenticated | None | Tenant-scoped | Handoff detail | No |
| **POST** | `/api/v1/generation/projects` | Authenticated | `DEVELOPER`, `ADMIN`, `LEAD_ARCHITECT` | `generation.manage` | Tenant-scoped | Project metadata | Yes |
| **GET** | `/api/v1/generation/projects` | Authenticated | Any authenticated | `generation.manage` | Tenant-scoped | Project metadata | No |
| **GET** | `/api/v1/generation/projects/:id` | Authenticated | Any authenticated | `generation.manage` | Tenant-scoped | Project code | No |
| **POST** | `/api/v1/generation/projects/:id/synthesis` | Authenticated | `DEVELOPER`, `ADMIN`, `LEAD_ARCHITECT` | `generation.manage` | Tenant-scoped | Generated code | Yes |
| **POST** | `/api/v1/generation/projects/:id/deployment-plans` | Authenticated | `ADMIN`, `LEAD_ARCHITECT` | `generation.manage` | Tenant-scoped | Deployment plan | Yes |
| **POST** | `/api/v1/generation/projects/:id/deployment-plans/:planId/approve` | Authenticated | `ADMIN`, `LEAD_ARCHITECT` | `generation.manage` | Tenant-scoped | Approval signature | Yes |
| **POST** | `/api/v1/mcp/connect` | Authenticated | `ADMIN` / Admin Secret | None | Global | MCP subprocess | Yes |
| **POST** | `/api/v1/mcp/disconnect` | Authenticated | `ADMIN` / Admin Secret | None | Global | MCP subprocess | Yes |
| **POST** | `/api/v1/mcp/tools/:tool/execute` | Authenticated | `ADMIN` / Admin Secret | None | Global | Tool execution | Yes |
| **GET** | `/api/v1/mcp/status` | Authenticated | Any authenticated | None | Global | Diagnostics | No |
| **GET** | `/api/v1/mcp/tools` | Authenticated | Any authenticated | None | Global | Tool inventory | No |
| **GET** | `/api/v1/mcp/health` | Authenticated | Any authenticated | None | Global | Health status | No |

---

## 3. Separation of Duties Enforcements

- **Assessment Approval:** Only users with `ADMIN` or `LEAD_ARCHITECT` roles can transition an assessment from `PENDING_REVIEW` to `APPROVED`. The assessment creator CANNOT approve their own assessment regardless of elevated role.
- **Generation Initiation:** Requires an approved assessment reference or authorized development initiative.
- **Deployment Plan Approval:** Strictly reserved for `ADMIN` and `LEAD_ARCHITECT`.
