# Frontend Page-to-API Traceability Matrix & Interactive Audit

**Document Reference**: `docs/audit/FRONTEND_PAGE_API_TRACEABILITY.md`  
**Audit Baseline**: Commit `4c7f9a3` (Branch `test-01`)  
**Scope**: Complete React/TypeScript frontend page routes, interactive actions, data sources, and backend API contracts.

---

## 1. Page-to-API Traceability Matrix

| Page / Route | Primary Purpose | User Roles | Backend API Endpoints | Backend Services | Data Source Classification | Integration Verdict |
|---|---|---|---|---|---|---|
| **`/` / `/landing`** (`LandingPage.tsx`) | Public marketing & platform overview | Anonymous / All | None (Static landing content) | None | Static Content | **LIVE (STATIC BY DESIGN)** |
| **`/login`** (`LoginPage.tsx`) | Role-based authentication & session start | Anonymous | `POST /api/v1/auth/login` | `AuthService.login()` | Live PostgreSQL / User Store | **LIVE** |
| **`/overview`** (`OverviewPage.tsx`) | Modernization portfolio KPIs, system health, recent runs | All Authenticated | `GET /api/v1/health`<br>`GET /api/v1/systems`<br>`GET /api/v1/assessments/metrics/overview` | `EnterpriseService`<br>`SystemRegistry`<br>`AssessmentRepository` | Live PostgreSQL + In-Memory System Profiles | **LIVE** |
| **`/transaction-discovery`** (`TransactionDiscoveryPage.tsx`) | Live T-Code discovery, evidence inspection, matching & fit-gap trigger | SAP_CONSULTANT<br>LEAD_ARCHITECT<br>ADMIN | `POST /api/v1/discovery/transaction`<br>`POST /api/v1/matching/fiori-apps`<br>`POST /api/v1/fit-gap/assess`<br>`POST /api/v1/assessments` | `TransactionDiscoveryEngine`<br>`FioriMatchingEngine`<br>`FitGapAssessmentEngine`<br>`AssessmentStore` | Live SAP S21 via Gateway/ADT or Mock S21-200-DEMO | **LIVE** |
| **`/assessment-results/:id`** (`AssessmentResultsPage.tsx`) | 6-tab modernization assessment workspace & governance review | All Roles (Scoped) | `GET /api/v1/assessments/:id`<br>`PUT /api/v1/assessments/:id`<br>`GET /api/v1/assessments/:id/audit`<br>`POST /api/v1/generation/handoffs` | `AssessmentRepository`<br>`RecommendationEngine`<br>`GenerationHandoffStore` | Live PostgreSQL (`assessments`, `fit_gap_dimensions`, `audit_events`) | **LIVE** |
| **`/assessment-history`** (`AssessmentHistoryPage.tsx`) | Searchable tabular audit trail of all historical assessments | All Roles | `GET /api/v1/assessments`<br>`GET /api/v1/assessments/:id/audit` | `AssessmentRepository`<br>`SecurityAuditLogger` | Live PostgreSQL (`assessments`) | **LIVE** |
| **`/system-configuration`** (`SystemConfigurationPage.tsx`) | SAP system landscape management & diagnostic connection tests | ADMIN<br>SAP_CONSULTANT | `GET /api/v1/systems`<br>`POST /api/v1/systems/:id/diagnostics`<br>`POST /api/v1/systems` | `SystemRegistry`<br>`SapConnectionHealthService` | Live PostgreSQL (`sap_system_profiles`, `diagnostic_history`) | **LIVE** |
| **`/system-configuration/mcp`** (`McpManagementPage.tsx`) | SAP Fiori MCP Client connection lifecycle and tool inventory | ADMIN | `GET /api/v1/mcp/status`<br>`GET /api/v1/mcp/tools`<br>`POST /api/v1/mcp/connect`<br>`POST /api/v1/mcp/disconnect` | `McpService`<br>`McpToolRegistry` | Live Process Telemetry (`@sap-ux/fiori-mcp-server`) | **LIVE** |
| **`/catalogue`** (`CataloguePage.tsx`) | Search & browse canonical SAP Fiori Apps Reference Library | All Roles | `GET /api/v1/fiori-catalogue/apps`<br>`GET /api/v1/fiori-catalogue/status` | `OfficialFioriCatalogueAdapter`<br>`CatalogueRepository` | Cached Canonical Dataset (`fiori_app_catalog_cache.json` & DB) | **LIVE** |
| **`/catalogue/:id`** (`AppDetailPage.tsx`) | Single Fiori App technical specifications & OData dependencies | All Roles | `GET /api/v1/fiori-catalogue/apps/:id` | `OfficialFioriCatalogueAdapter` | Live / Cached Catalogue Record | **LIVE** |
| **`/generation-studio`** (`GenerationStudioPage.tsx`) | 10-phase Clean Core application workbench (RAP CDS & UI) | LEAD_ARCHITECT<br>ADMIN | `GET /api/v1/generation/projects`<br>`POST /api/v1/generation/projects`<br>`POST /api/v1/generation/projects/:id/artifacts`<br>`POST /api/v1/generation/projects/:id/preview/start`<br>`POST /api/v1/generation/projects/:id/export` | `GenerationProjectService`<br>`AbapGeneratorEngine`<br>`PreviewManager`<br>`ExportManager` | Live PostgreSQL (`generation_projects`, `artifacts`) & FS | **LIVE** |
| **`/generation/artifacts`** (`GeneratedArtifactsPage.tsx`) | Filterable index of generated RAP CDS and UI artifacts | All Authenticated | `GET /api/v1/generation/projects/:id/artifacts` | `ArtifactRegistry`<br>`GenerationProjectStore` | Live PostgreSQL (`generation_artifacts`) | **LIVE** |
| **`/systems/:id`** (`SystemDetailPage.tsx`) | Detailed diagnostic view for a specific SAP system | ADMIN<br>SAP_CONSULTANT | `GET /api/v1/systems/:id`<br>`POST /api/v1/systems/:id/diagnostics` | `SystemRegistry` | Live PostgreSQL + In-Memory Fallback | **LIVE** |
| **`/explorer`** (`ExplorerPage.tsx`) | Legacy transaction catalog explorer | VIEWER / All | `localStore.getTransactions()` | None (Local in-browser store) | Mock / Local Fixtures (`localStore`) | **PARTIALLY LIVE** |
| **`/explorer/:tcode`** (`TCodeDetailPage.tsx`) | Legacy single transaction detail explorer | VIEWER / All | `localStore.getTransaction(tcode)` | None | Mock / Local Fixtures (`localStore`) | **PARTIALLY LIVE** |
| **`/jobs`** (`JobsPage.tsx`) | Background discovery batch executions | ADMIN | `GET /api/v1/discovery/executions` | `TransactionDiscoveryService` | Live PostgreSQL (`discovery_executions`) | **LIVE** |
| **`/assessments/:id`** (`AssessmentWorkspacePage.tsx`) | Legacy interactive assessment workspace | SAP_CONSULTANT | `localStore.getAssessment(id)` | None (Bypassed by modern `/assessment-results/:id`) | Mock / Local Fixtures (`localStore`) | **PARTIALLY LIVE** |
| **`AuditPage.tsx`** (Routed via `/audit` redirect) | Administrative audit log viewer | ADMIN | None (Consumes `localStore.getAuditEvents()`) | None | Mock / Static Fixtures (`localStore`) | **DISCONNECTED** |
| **`/settings`** (`SettingsPage.tsx`) | User profile & environment settings | All Authenticated | Local browser settings & session token | None | Browser LocalStorage | **LIVE (CLIENT SIDE)** |

---

## 2. Deep Interactive Element Audit (Buttons, Forms, Modals & Triggers)

### 2.1 Transaction Discovery (`/transaction-discovery`)
- **T-Code Search Input**:
  - Behavior: Validates uppercase alphanumeric format (1–20 chars). Rejects spaces, invalid special chars, and null bytes before network dispatch.
  - Verification: **VERIFIED WORKING**.
- **System Selector Dropdown**:
  - Options: Dynamic options populated from `systemService.getSystems()`. Includes `S21-200` (Live SAP S/4HANA 2023), `S21-200-DEMO` (Zero-latency mock), and registered systems.
  - Verification: **VERIFIED WORKING**.
- **Run Discovery Button (`#btn-run-discovery`)**:
  - Action: Dispatches `POST /api/v1/discovery/transaction`. Triggers loading spinner with progress text. Disables input during execution.
  - Error Handling: Displays honest diagnostic message strips upon 502/504 connection failures without falling back silently to demo data.
  - Verification: **VERIFIED WORKING**.
- **Trigger Fit-Gap Assessment Button**:
  - Action: Automatically constructs payload from selected candidate and requirement; calls `POST /api/v1/fit-gap/assess` and seamlessly navigates to `/assessment-results/:id`.
  - Verification: **VERIFIED WORKING**.

---

### 2.2 Assessment Results & Workspace (`/assessment-results/:id`)
- **6-Pillar Tab Navigation**:
  - Tabs: Overview, Business Context, Technical Evidence, Fit-Gap 5/10 Dimensions, Governed Recommendation, Governance & Audit Trail.
  - Behavior: Updates URL query parameter `?tab=...` for browser bookmarkability.
  - Verification: **VERIFIED WORKING**.
- **Lifecycle Action Buttons (`Approve`, `Reject`, `Submit for Review`, `Archive`)**:
  - Role Scoping: Only `APPROVER` or `ADMIN` can click `Approve` / `Reject`. Disabled for `REQUESTER` or `VIEWER`.
  - Confirmation Modal: Prompts for mandatory review comments before status transition.
  - State Sync: Invokes `PUT /api/v1/assessments/:id` and updates local state optimistically with rollback on failure.
  - Verification: **VERIFIED WORKING**.
- **Handoff to Generation Studio Button (`#btn-handoff-generation`)**:
  - Condition: Active only when recommendation outcome is `BUILD` and assessment status is `APPROVED`.
  - Behavior: Dispatches `POST /api/v1/generation/handoffs` and navigates to `/generation-studio`.
  - Verification: **VERIFIED WORKING**.

---

### 2.3 Generation Studio (`/generation-studio`)
- **10-Phase Workflow Navigation**:
  - Views: Overview Dashboard, Requirements Designer, Architecture Designer, Data Model Designer, ABAP Generator, Fiori UI Generator, Local Preview & Validation, Deployment Workspace, Review & Packaging, Toolchain Readiness.
  - Verification: **VERIFIED WORKING**.
- **Data Model Designer Entity Editor**:
  - Capabilities: Add root entity, child composition entities, fields, keys, data types (`abap.char`, `abap.curr`, `abap.dats`), and semantic archetypes (`ORDER_HEADER`, `LINE_ITEM`).
  - Validation: Real-time validation for missing primary keys, duplicate entity names, and circular compositions.
  - Verification: **VERIFIED WORKING**.
- **Generate All Clean Core Artifacts Button**:
  - Action: Dispatches `POST /api/v1/generation/projects/:id/artifacts` with Bearer token.
  - Generation Output: Synthesizes complete ABAP RAP files and Fiori Elements manifests. Updates artifact count badge.
  - Verification: **VERIFIED WORKING**.
- **Launch Local Preview Button**:
  - Action: Dispatches `POST /api/v1/generation/projects/:id/preview/start`.
  - Display: Injects `iframe` pointing to `http://127.0.0.1:405x/webapp/index.html`. Displays live OData V4 request stream. Displays prominent `SYNTHETIC MOCK DATA` watermark.
  - Defect Found: Port contention bug if port 4050 is held by another process (**PERF-01**).
  - Verification: **PARTIALLY VERIFIED (BLOCKED BY PORT AVAILABILITY)**.
- **Export Clean Core Package Button**:
  - Action: Dispatches `POST /api/v1/generation/projects/:id/export`. Downloads `.zip` archive containing `abap/`, `fiori/`, `docs/`, and `MANIFEST.json`.
  - Verification: **VERIFIED WORKING**.

---

## 3. Disconnected & Legacy Component Findings

1. **UI-01 (AuditPage Disconnected)**:
   - File: `frontend/src/features/audit/AuditPage.tsx`
   - Problem: Directly reads `localStore.getAuditEvents()` instead of querying `GET /api/v1/security/audit` or PostgreSQL `security_audit_events`.
   - Navigation: In `router.tsx`, the `/audit` path is configured as `<Navigate to="/assessment-history" replace />`, so `AuditPage.tsx` is completely unreachable from the main sidebar.
   - Recommended Action: Connect `AuditPage.tsx` to `GET /api/v1/security/audit` with pagination and filter controls, and restore its sidebar route.

2. **UI-02 (Legacy Explorer Pages using LocalStore)**:
   - Files: `frontend/src/features/explorer/ExplorerPage.tsx`, `TCodeDetailPage.tsx`
   - Problem: Uses mock transactions from `localStore`.
   - Mitigation: These are legacy routes from Sprint 0. Users should be redirected to `/transaction-discovery`.

3. **UI-03 (Legacy AssessmentWorkspacePage Bypassed)**:
   - File: `frontend/src/features/assessments/AssessmentWorkspacePage.tsx`
   - Problem: Earlier prototype workspace using mock data.
   - Mitigation: `router.tsx` already redirects `/assessments` to `/assessment-history` and routes primary assessments to `AssessmentResultsPage.tsx`. Legacy file should be formally deprecated.
