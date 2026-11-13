# Generation Studio: API & Database Persistence Audit
**Document ID:** `GEN-AUDIT-API-DB-01`  
**Audit Context:** `GEN-COMPLETE-AUDIT-01`  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (S21, Client 200)  
**Classification:** Deep Technical & Security Audit

---

## 1. REST API Surface Audit (52 Endpoints Cataloged)

Every Generation Studio endpoint is registered under `/api/v1/generation/` and requires authenticated session identity with role permission `Fiorify.generation.manage` (`PERMISSIONS.GENERATION_MANAGE`).

### 1.1 Complete Endpoint Matrix

| # | HTTP Method | Endpoint URL | Handler File / Line | Required Permission | Payload / Response |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Project Foundation (GEN-02)** | | | | | |
| 1 | `POST` | `/api/v1/generation/handoff` | `server.js:827` | `PERMISSIONS.GENERATION_MANAGE` | Assessment snapshot -> Handoff record |
| 2 | `GET` | `/api/v1/generation/handoff/:id` | `server.js:847` | `PERMISSIONS.GENERATION_MANAGE` | None -> Handoff record |
| 3 | `GET` | `/api/v1/generation/handoff` | `server.js:862` | `PERMISSIONS.GENERATION_MANAGE` | Query filters -> List of handoffs |
| 4 | `GET` | `/api/v1/generation/projects` | `server.js:879` | `PERMISSIONS.GENERATION_MANAGE` | Tenant filter -> Project summaries |
| 5 | `POST` | `/api/v1/generation/projects` | `server.js:895` | `PERMISSIONS.GENERATION_MANAGE` | Project creation spec -> New project |
| 6 | `GET` | `/api/v1/generation/projects/:id` | `server.js:968` | `PERMISSIONS.GENERATION_MANAGE` | None -> Full Project JSON model |
| 7 | `PUT/PATCH` | `/api/v1/generation/projects/:id` | `server.js:988` | `PERMISSIONS.GENERATION_MANAGE` | Project metadata patch -> Updated project |
| 8 | `DELETE` | `/api/v1/generation/projects/:id` | `server.js:1004` | `PERMISSIONS.GENERATION_MANAGE` | `{ confirmed: true }` -> Soft/Hard delete |
| 9 | `GET` | `/api/v1/generation/projects/:id/activity` | `server.js:913` | `PERMISSIONS.GENERATION_MANAGE` | None -> Audit trail events |
| 10 | `GET` | `/api/v1/generation/projects/:id/summary` | `server.js:926` | `PERMISSIONS.GENERATION_MANAGE` | None -> Aggregate project statistics |
| 11 | `POST` | `/api/v1/generation/projects/:id/duplicate`| `server.js:939` | `PERMISSIONS.GENERATION_MANAGE` | New name -> Cloned project |
| 12 | `POST` | `/api/v1/generation/projects/:id/archive` | `server.js:948` | `PERMISSIONS.GENERATION_MANAGE` | None -> Archived state |
| 13 | `POST` | `/api/v1/generation/projects/:id/restore` | `server.js:957` | `PERMISSIONS.GENERATION_MANAGE` | None -> Restored state |
| 14 | `GET` | `/api/v1/generation/projects/:id/artifacts/:artId/download` | `server.js:962` | `PERMISSIONS.ARTIFACTS_EXPORT` | Stream single source artifact |
| **Context & CDS Registry (GEN-02 / GEN-04)** | | | | | |
| 15 | `GET` | `/api/v1/generation/context/:assessmentId` | `generationRoutes.js:114` | `PERMISSIONS.GENERATION_MANAGE` | Verified BUILD assessment handoff |
| 16 | `GET` | `/api/v1/generation/cds-registry` | `generationRoutes.js:127` | `PERMISSIONS.GENERATION_MANAGE` | Query / Category -> CDS Reuse Views |
| **Requirements Engineering (GEN-03)** | | | | | |
| 17 | `POST` | `/api/v1/generation/projects/:id/requirements/import` | `generationRoutes.js:154` | `PERMISSIONS.GENERATION_MANAGE` | Assessment ID -> Imported gap items |
| 18 | `POST` | `/api/v1/generation/projects/:id/requirements/:reqId/confirm` | `generationRoutes.js:169` | `PERMISSIONS.GENERATION_MANAGE` | Action (CONFIRM/REJECT/DEFER) + Rationale |
| 19 | `GET` | `/api/v1/generation/projects/:id/requirements` | `generationRoutes.js:191` | `PERMISSIONS.GENERATION_MANAGE` | None -> All requirements |
| 20 | `POST` | `/api/v1/generation/projects/:id/requirements` | `generationRoutes.js:205` | `PERMISSIONS.GENERATION_MANAGE` | Custom requirement payload -> New Req |
| 21 | `PUT/PATCH`| `/api/v1/generation/projects/:id/requirements/:reqId` | `generationRoutes.js:219` | `PERMISSIONS.GENERATION_MANAGE` | Requirement patch -> Updated Req |
| 22 | `DELETE` | `/api/v1/generation/projects/:id/requirements/:reqId` | `generationRoutes.js:235` | `PERMISSIONS.GENERATION_MANAGE` | None -> Removed requirement |
| **Data Model Designer (GEN-04)** | | | | | |
| 23 | `POST` | `/api/v1/generation/projects/:id/data-model/validate` | `generationRoutes.js:254` | `PERMISSIONS.GENERATION_MANAGE` | Model payload -> Validation results |
| 24 | `GET` | `/api/v1/generation/projects/:id/data-model` | `generationRoutes.js:270` | `PERMISSIONS.GENERATION_MANAGE` | None -> Complete CDS data model |
| 25 | `PUT` | `/api/v1/generation/projects/:id/data-model` | `generationRoutes.js:284` | `PERMISSIONS.GENERATION_MANAGE` | Full data model replace -> Updated model |
| 26 | `POST` | `/api/v1/generation/projects/:id/data-model/entities` | `generationRoutes.js:304` | `PERMISSIONS.GENERATION_MANAGE` | Entity definition -> New CDS entity |
| 27 | `GET` | `/api/v1/generation/projects/:id/data-model/entities/:entityId` | `generationRoutes.js:321` | `PERMISSIONS.GENERATION_MANAGE` | None -> Entity detail |
| 28 | `PUT` | `/api/v1/generation/projects/:id/data-model/entities/:entityId` | `generationRoutes.js:337` | `PERMISSIONS.GENERATION_MANAGE` | Entity patch -> Updated entity |
| 29 | `DELETE` | `/api/v1/generation/projects/:id/data-model/entities/:entityId` | `generationRoutes.js:354` | `PERMISSIONS.GENERATION_MANAGE` | None -> Deleted entity & cascades |
| 30 | `POST` | `/api/v1/generation/projects/:id/data-model/entities/:entityId/fields` | `generationRoutes.js:371` | `PERMISSIONS.GENERATION_MANAGE` | Field definition -> New field |
| 31 | `PUT` | `/api/v1/generation/projects/:id/data-model/entities/:entityId/fields/:fieldId`| `generationRoutes.js:390` | `PERMISSIONS.GENERATION_MANAGE` | Field patch -> Updated field |
| 32 | `DELETE` | `/api/v1/generation/projects/:id/data-model/entities/:entityId/fields/:fieldId`| `generationRoutes.js:409` | `PERMISSIONS.GENERATION_MANAGE` | None -> Removed field |
| 33 | `POST` | `/api/v1/generation/projects/:id/data-model/relationships` | `generationRoutes.js:428` | `PERMISSIONS.GENERATION_MANAGE` | Assoc/Comp payload -> Created relation |
| 34 | `DELETE` | `/api/v1/generation/projects/:id/data-model/relationships/:relId` | `generationRoutes.js:446` | `PERMISSIONS.GENERATION_MANAGE` | None -> Removed relationship |
| **RAP Architecture & ABAP Generation (GEN-05)** | | | | | |
| 35 | `POST` | `/api/v1/generation/projects/:id/architecture/evaluate` | `generationRoutes.js:466` | `PERMISSIONS.GENERATION_MANAGE` | Overrides -> RAP Architecture profile |
| 36 | `GET` | `/api/v1/generation/projects/:id/architecture` | `generationRoutes.js:485` | `PERMISSIONS.GENERATION_MANAGE` | None -> Active architecture decision |
| 37 | `POST` | `/api/v1/generation/projects/:id/abap/generate` | `generationRoutes.js:501` | `PERMISSIONS.GENERATION_MANAGE` | Options -> Generated ABAP artifacts |
| 38 | `POST` | `/api/v1/generation/projects/:id/abap/regenerate` | `generationRoutes.js:520` | `PERMISSIONS.GENERATION_MANAGE` | Options -> Regenerated ABAP artifacts |
| 39 | `GET` | `/api/v1/generation/projects/:id/abap/artifacts` | `generationRoutes.js:540` | `PERMISSIONS.GENERATION_MANAGE` | None -> ABAP artifact list |
| 40 | `GET` | `/api/v1/generation/projects/:id/abap/artifacts/:artId` | `generationRoutes.js:556` | `PERMISSIONS.GENERATION_MANAGE` | None -> Specific ABAP artifact content |
| **Fiori Elements Application Generation (GEN-06)** | | | | | |
| 41 | `POST` | `/api/v1/generation/projects/:id/fiori/generate` | `generationRoutes.js:576` | `PERMISSIONS.GENERATION_MANAGE` | Fiori config -> Generated UI5 app files |
| 42 | `POST` | `/api/v1/generation/projects/:id/fiori/config` | `generationRoutes.js:595` | `PERMISSIONS.GENERATION_MANAGE` | Floorplan / UI params -> Saved config |
| 43 | `GET` | `/api/v1/generation/projects/:id/fiori/artifacts` | `generationRoutes.js:614` | `PERMISSIONS.GENERATION_MANAGE` | None -> Fiori artifact list |
| 44 | `GET` | `/api/v1/generation/projects/:id/fiori/artifacts/:artId` | `generationRoutes.js:630` | `PERMISSIONS.GENERATION_MANAGE` | None -> Specific Fiori artifact content |
| **Review, Preview, Export & Toolchain (GEN-07, GEN-08, GEN-09)** | | | | | |
| 45 | `GET` | `/api/v1/generation/projects/:id/artifacts` | `generationRoutes.js:650` | `PERMISSIONS.GENERATION_MANAGE` | None -> Complete unified artifact manifest |
| 46 | `POST` | `/api/v1/generation/projects/:id/validate-generation` | `generationRoutes.js:693` | `PERMISSIONS.GENERATION_MANAGE` | None -> Static Validation Report |
| 47 | `GET` | `/api/v1/generation/toolchain/status` | `generationRoutes.js:710` | `PERMISSIONS.GENERATION_MANAGE` | None -> Workstation toolchain diagnostics |
| 48 | `GET` | `/api/v1/generation/projects/:id/handover-guide` | `generationRoutes.js:725` | `PERMISSIONS.GENERATION_MANAGE` | None -> Custom Eclipse ADT setup guide |
| 49 | `POST` | `/api/v1/generation/projects/:id/preview/start` | `generationRoutes.js:744` | `PERMISSIONS.GENERATION_MANAGE` | None -> Local ephemeral mock server URL |
| 50 | `GET` | `/api/v1/generation/projects/:id/review/readiness` | `generationRoutes.js:833` | `PERMISSIONS.GENERATION_MANAGE` | None -> Governance readiness scorecard |
| 51 | `GET` | `/api/v1/generation/projects/:id/traceability-matrix`| `generationRoutes.js:849`| `PERMISSIONS.GENERATION_MANAGE` | None -> End-to-end forward/backward trace |
| 52 | `POST` | `/api/v1/generation/projects/:id/export` | `generationRoutes.js:865` | `PERMISSIONS.GENERATION_MANAGE` | Target options -> PKZIP export bundle |

---

## 2. Persistence Layer Architecture & Concurrency

### 2.1 Canonical Filesystem JSON Architecture
Generation Studio persists project states under:
`backend/data/generation-projects/<projectId>/project.json`

**Mechanisms in `generationProjectStore.js`:**
1. **Advisory File Locking:**
   - A lock file (`project.json.lock`) is acquired before any mutation.
   - Lock timeout is configured to 5,000ms with retry intervals of 50ms.
   - Stale locks older than 10,000ms are automatically broken and reacquired with an audit warning.
2. **Atomic Writes via Temp Swap:**
   - Writes are performed to `project.json.tmp.<pid>.<timestamp>` and synced via `fs.fsyncSync`.
   - Atomic rename (`fs.renameSync`) replaces the active `project.json`.
3. **Automatic Backup (`.bak`):**
   - Prior to replacing `project.json`, the previous state is copied to `project.json.bak`.
   - On startup or load, if `project.json` is corrupted or truncated, the store automatically falls back to `project.json.bak` and emits a recovery alert.

### 2.2 PostgreSQL vs. JSON Split (Architectural Discrepancy)
- **The Finding:** Fiorify S1 established a persistence foundation requiring PostgreSQL (`backend/src/infrastructure/repositories/generationProjectRepository.js`). However, Generation Studio (GEN-02 through GEN-09) writes canonically to filesystem JSON (`backend/data/generation-projects/`).
- **Impact:** In local development mode on Windows, the JSON store provides instant zero-dependency execution. However, in a horizontally scaled BTP Cloud Foundry container environment, ephemeral container filesystems will lose state upon container restarts unless mapped to a persistent volume or synchronized back to PostgreSQL.
- **Audit Verdict:** The JSON persistence is production-grade for single-instance local developer execution, but a PostgreSQL synchronization adapter is required before multi-instance BTP deployment.
