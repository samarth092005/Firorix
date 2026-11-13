# Fiorify — Complete API and Frontend Dependency Map (Phase S0)

**Document Version:** 1.0  
**Phase:** S0 — Audit & Architecture Baseline  
**Scope:** Exhaustive catalog of all backend REST API endpoints registered in `backend/src/server.js` and their corresponding frontend callers across `frontend/src/`.  
**Date:** November 2026

---

## 1. Overview

Communication between the React Vite frontend and the Node.js native HTTP backend occurs exclusively over HTTP/REST using JSON payloads. All endpoints are prefixed with `/api/v1/`.

---

## 2. API Endpoints and Frontend Callers Catalog

### 2.1 System & Environment Management

| HTTP Method & Path | Backend Handler | Frontend Service Caller | UI Component | Description |
|---|---|---|---|---|
| `GET /api/v1/system/profiles` | `SystemRegistry.getAllProfiles()` | `frontend/src/services/api/apiClient.ts` | `TargetSystemSelector.tsx`, `StudioHeader.tsx` | Returns available SAP systems (`S21-200`, `S21-100`, etc.) |
| `GET /api/v1/system/profiles/active` | `SystemRegistry.getActiveProfile()` | `apiClient.ts` | Header banner | Returns current target SAP system context |
| `POST /api/v1/system/profiles/active` | `SystemRegistry.setActiveProfile()` | `apiClient.ts` | System selector dropdown | Changes active target SAP system |
| `GET /api/v1/system/health` | `server.js:handleSystemHealth` | `apiClient.ts` | Status indicator | Checks connectivity to SAP and backend stores |

### 2.2 Transaction Discovery & Search

| HTTP Method & Path | Backend Handler | Frontend Service Caller | UI Component | Description |
|---|---|---|---|---|
| `POST /api/v1/tcode-search` | `TransactionMasterIndex.search()` | `frontend/src/features/transaction-checker/services/transactionSearchService.ts` | `TransactionSearchInput.tsx` | Prefix and keyword search over S/4HANA T-Codes |
| `POST /api/v1/discovery/transaction` | `TransactionDiscoveryEngine.discover()` | `frontend/src/features/transaction-discovery/services/discoveryService.ts` | `TransactionDiscoveryView.tsx` | Retrieves full technical metadata, screens, exits, and complexity |
| `POST /api/v1/discovery/match` | `server.js:handleUnifiedDiscoveryMatch` | `discoveryService.ts` | `TransactionChecker.tsx` | Unified end-to-end pipeline: discovery + matching |

### 2.3 Fiori Matching & Catalogue

| HTTP Method & Path | Backend Handler | Frontend Service Caller | UI Component | Description |
|---|---|---|---|---|
| `POST /api/v1/matching/fiori-apps` | `FioriMatchingEngine.matchTransaction()` | `frontend/src/services/api/apiClient.ts` | `CandidateAppList.tsx` | Matches T-Code against standard Fiori Apps with ranking |
| `GET /api/v1/catalogue/apps` | `OfficialFioriCatalogueAdapter.getAllApps()` | `frontend/src/features/catalogue/services/catalogueService.ts` | `CatalogueView.tsx` | Filtered list of standard SAP Fiori applications |
| `GET /api/v1/catalogue/apps/:id` | `OfficialFioriCatalogueAdapter.getAppById()` | `catalogueService.ts` | `AppDetailModal.tsx` | Detailed metadata for a single standard Fiori App |
| `GET /api/v1/catalogue/stats` | `OfficialFioriCatalogueAdapter.getStats()` | `catalogueService.ts` | `CatalogueStatsCard.tsx` | Total apps count, release version, and last updated |
| `POST /api/v1/catalogue/sync` | `OfficialFioriCatalogueAdapter.sync()` | `catalogueService.ts` (Admin only) | Settings dialog | Triggers synchronization with SAP FAL |

### 2.4 Fit-Gap Assessments & Lifecycle

| HTTP Method & Path | Backend Handler | Frontend Service Caller | UI Component | Description |
|---|---|---|---|---|
| `GET /api/v1/assessments` | `AssessmentStore.list()` | `frontend/src/services/api/apiClient.ts` | `AssessmentListView.tsx`, `AssessmentHistory.tsx` | Lists all saved assessments with status filtering |
| `POST /api/v1/assessments` | `AssessmentStore.create()` | `apiClient.ts` | `FitGapAssessmentWorkspace.tsx` | Creates a new assessment record with initial audit entry |
| `GET /api/v1/assessments/:id` | `AssessmentStore.getById()` | `apiClient.ts` | `AssessmentDetailView.tsx` | Retrieves full assessment record including 8 dimensions |
| `PUT /api/v1/assessments/:id` | `AssessmentStore.update()` | `apiClient.ts` | `FitGapAssessmentWorkspace.tsx` | Updates assessment scores, comments, or lifecycle state |
| `POST /api/v1/assessments/:id/archive` | `AssessmentStore.archive()` | `apiClient.ts` | `AssessmentRowActions.tsx` | Moves assessment to `ARCHIVED` status |
| `GET /api/v1/assessments/:id/audit` | `AssessmentStore.getAuditTrail()` | `apiClient.ts` | `AuditTrailModal.tsx` | Returns cryptographic audit trail for the assessment |
| `POST /api/v1/assessments/:id/action` | `AssessmentStore.recordModernizationAction()` | `apiClient.ts` | `ModernizationWorkspace.tsx` | Records decision (e.g. `EXTEND`, `REPLACE`, `BUILD`) |

### 2.5 Recommendations & Portfolio Analytics

| HTTP Method & Path | Backend Handler | Frontend Service Caller | UI Component | Description |
|---|---|---|---|---|
| `POST /api/v1/recommendations/generate` | `RecommendationEngine.generate()` | `frontend/src/services/api/apiClient.ts` | `RecommendationPanel.tsx` | Generates governed recommendation from Fit-Gap scores |
| `GET /api/v1/enterprise/metrics` | `EnterpriseService.getMetrics()` | `frontend/src/features/overview/services/overviewService.ts` | `OverviewDashboard.tsx` | Returns portfolio-wide KPIs, counts, and readiness index |

### 2.6 Model Context Protocol (MCP)

| HTTP Method & Path | Backend Handler | Frontend Service Caller | UI Component | Description |
|---|---|---|---|---|
| `GET /api/v1/mcp/status` | `McpRoutes.getStatus()` | `frontend/src/features/mcp/services/mcpClient.ts` | `McpStatusBar.tsx` | Returns connection state of MCP servers |
| `POST /api/v1/mcp/connect` | `McpRoutes.connect()` | `mcpClient.ts` | MCP configuration panel | Establishes connection to MCP server |
| `POST /api/v1/mcp/tools/execute` | `McpRoutes.executeTool()` | `mcpClient.ts` | MCP discovery runners | Invokes an MCP tool with validated arguments |

### 2.7 Generation Studio (Phase 1 Endpoints)

| HTTP Method & Path | Backend Handler | Frontend Service Caller | UI Component | Description |
|---|---|---|---|---|
| `GET /api/v1/generation/projects` | `GenerationProjectService.listProjects()` | `frontend/src/features/generation/services/generationProjectService.ts` | `ProjectsDashboardView.tsx` | Lists generation projects with filtering and search |
| `POST /api/v1/generation/projects` | `GenerationProjectService.createStandaloneProject()` | `generationProjectService.ts` | `CreateProjectModal.tsx` | Creates a new standalone project |
| `POST /api/v1/generation/handoff` | `GenerationProjectService.createFromHandoff()` | `generationProjectService.ts` | `AssessmentResultsView.tsx` | Creates generation project from approved BUILD assessment |
| `GET /api/v1/generation/handoff/status/:assessmentId` | `GenerationProjectService.getHandoffStatus()` | `generationProjectService.ts` | `AssessmentHandoffCard.tsx` | Checks whether assessment already has an active project |
| `GET /api/v1/generation/projects/:id` | `GenerationProjectService.getProjectById()` | `generationProjectService.ts` | `GenerationStudioWorkspace.tsx` | Retrieves full project definition, phases, and spec |
| `PATCH /api/v1/generation/projects/:id` | `GenerationProjectService.updateProject()` | `generationProjectService.ts` | Workspace header & settings | Updates project metadata or specification details |
| `POST /api/v1/generation/projects/:id/archive` | `GenerationProjectService.archiveProject()` | `generationProjectService.ts` | Project action menu | Sets project status to `ARCHIVED` |
| `POST /api/v1/generation/projects/:id/restore` | `GenerationProjectService.restoreProject()` | `generationProjectService.ts` | Project action menu | Restores archived project to `ACTIVE` |
| `POST /api/v1/generation/projects/:id/duplicate` | `GenerationProjectService.duplicateProject()` | `generationProjectService.ts` | Project action menu | Duplicates existing project and specification |
| `DELETE /api/v1/generation/projects/:id` | `GenerationProjectService.deleteProject()` | `generationProjectService.ts` | Project action menu | Permanently removes project and its directory |

---

## 3. Findings & Security Observations

1. **Authentication:**
   - Write endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) currently enforce timing-safe admin secret comparison using `X-Fiorify-Admin-Secret` header or fall back to local dev allowances.
   - Read endpoints are currently unauthenticated.
2. **Multi-Tenancy:**
   - None of the endpoints currently accept or enforce a `tenantId` query parameter or header. All data operations operate on a flat global namespace.
3. **Payload Sanitization:**
   - Generation Studio routes strictly validate request payloads through `generationProjectValidator.js`.
   - MCP routes validate tool inputs via `mcpArgumentValidator.js`.
   - Other routes rely on manual null-checks in handlers.
