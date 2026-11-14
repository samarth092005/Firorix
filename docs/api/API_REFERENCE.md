# Fiorify — REST API Reference Manual

## 1. Overview & Protocol Standards

The Fiorify API is served over native HTTP (default port 4000) using JSON request and response payloads.
- **Base URL**: `/api/v1`
- **Authentication**: `Authorization: Bearer <jwt_or_xsuaa_token>`
- **Tenant Context**: Inferred from token or specified via `x-tenant-id` header
- **Error Format**:
  ```json
  {
    "statusCode": 403,
    "error": "Forbidden",
    "code": "CREATOR_CANNOT_APPROVE",
    "message": "Creators cannot approve their own modernization assessments."
  }
  ```

---

## 2. API Route Summary

### 2.1 Health & SAP System Diagnostics

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/health` | Application status, persistence mode, landscape health | All |
| `GET` | `/api/v1/systems` | List configured SAP systems | All |
| `GET` | `/api/v1/systems/:id` | System detail, client configuration, and status | All |
| `POST` | `/api/v1/systems/:id/test` | Execute 15-point read-only SAP preflight check | `CONSULTANT`, `ADMIN` |
| `GET` | `/api/v1/systems/:id/history` | Historical connectivity and diagnostic log | All |

### 2.2 Transaction Discovery & Canonical Catalog

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/discovery/:tcode` | Inspect single SAP T-Code metadata and candidates | `VIEWER`, `CONSULTANT` |
| `POST` | `/api/v1/discovery/batch` | Batch inspect multiple T-Codes (up to 50) | `CONSULTANT`, `ADMIN` |
| `GET` | `/api/v1/catalogue/search` | Search 18,000+ Fiori apps library by keyword/role | All |
| `GET` | `/api/v1/catalogue/apps/:id` | Detailed standard Fiori app metadata and services | All |

### 2.3 Fit-Gap Assessments & Governance Approvals

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/assessments` | List modernization assessments | All |
| `POST` | `/api/v1/assessments` | Create assessment for a transaction | `CONSULTANT`, `ADMIN` |
| `GET` | `/api/v1/assessments/:id` | Get assessment details and 5-dimension score | All |
| `POST` | `/api/v1/fit-gap/assess` | Calculate fit-gap score and determine outcome | `CONSULTANT`, `ADMIN` |
| `POST` | `/api/v1/assessments/:id/approve` | Approve assessment (SoD enforced, creator blocked) | `LEAD_ARCHITECT`, `ADMIN` |
| `GET` | `/api/v1/assessments/:id/audit` | Tamper-evident audit trail of assessment actions | All |

### 2.4 Generation Projects & Specification Lifecycle

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/generation/projects` | List generation projects | All |
| `POST` | `/api/v1/generation/projects` | Create generation project from approved handoff | `LEAD_ARCHITECT`, `ADMIN` |
| `GET` | `/api/v1/generation/projects/:id` | Get project details, specs, and artifact registry | All |
| `PUT` | `/api/v1/generation/projects/:id` | Update project specifications (Data model, Reqs) | `DEVELOPER`, `ADMIN` |
| `POST` | `/api/v1/generation/projects/:id/readiness` | Evaluate 13-gate deterministic readiness engine | All |
| `POST` | `/api/v1/generation/projects/:id/versions` | Snapshot immutable specification version | `LEAD_ARCHITECT`, `ADMIN` |
| `POST` | `/api/v1/generation/projects/:id/approve` | Approve specification with HMAC signature | `CHIEF_ARCHITECT`, `ADMIN` |

### 2.5 Artifact Generation, Mock Preview & Deployment

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `POST` | `/api/v1/generation/projects/:id/generate/abap` | Generate RAP artifacts (Tables, CDS, BDEF, DCL) | `DEVELOPER`, `ADMIN` |
| `POST` | `/api/v1/generation/projects/:id/generate/ui5` | Generate Fiori Elements V4 LROP and Manifest | `DEVELOPER`, `ADMIN` |
| `POST` | `/api/v1/generation/projects/:id/preview/start` | Launch ephemeral mock OData V4 preview (Port 4050) | `DEVELOPER`, `ADMIN` |
| `POST` | `/api/v1/generation/projects/:id/preview/stop` | Terminate mock preview server | `DEVELOPER`, `ADMIN` |
| `GET` | `/api/v1/generation/projects/:id/export` | Download zero-dependency PKZIP handover bundle | `DEVELOPER`, `ADMIN` |
| `POST` | `/api/v1/generation/deployments/plans` | Create topological DAG deployment plan | `LEAD_ARCHITECT`, `ADMIN` |
| `POST` | `/api/v1/generation/deployments/plans/:id/approve` | Sign plan with HMAC-SHA256 (`sig:v1`) | `CHIEF_ARCHITECT`, `ADMIN` |
| `POST` | `/api/v1/generation/deployments/plans/:id/execute` | Execute deployment up to SAP Write Boundary | `CHIEF_ARCHITECT`, `ADMIN` |
