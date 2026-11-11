# FioriX — Four-Store Ownership and Dependency Audit (Phase S0)

**Document Version:** 1.0  
**Phase:** S0 — Audit & Architecture Baseline  
**Scope:** Exhaustive audit of all four backend persistence stores, their schemas, write mechanisms, lock patterns, corruption mitigations, readers, and writers.  
**Date:** November 2026

---

## 1. Overview of Persistence Stores

FioriX currently operates on four discrete file-backed persistence stores in `backend/data/`. None of these stores rely on external databases or CAP/Express abstractions. Each store was implemented to fulfill a specific domain boundary:

1. **Store 1: Assessment Store** (`backend/data/assessments.json`)
2. **Store 2: Official Fiori Catalogue Cache** (`backend/data/fiori_app_catalog_cache.json` & `status.json`)
3. **Store 3: Transaction Master Index Store** (`backend/data/transaction_master_snapshot.json`)
4. **Store 4: Generation Project Store** (`backend/data/generation-projects/<projectId>/project.json` + `generationHandoffs.json`)

---

## 2. Store 1: Assessment Store

### 2.1 Implementation & Ownership
- **Primary Service:** `backend/src/services/assessmentStore.js` (`AssessmentStore` class).
- **Physical Location:** `backend/data/assessments.json` (backup at `backend/data/assessments.json.bak`).
- **Domain:** Fit-Gap analysis results, 8-dimension scoring, modernizations actions, and audit trail.

### 2.2 Data Schema
A JSON array of assessment records:
```json
[
  {
    "id": "ASM-ME21N-001",
    "transactionCode": "ME21N",
    "description": "Create Purchase Order",
    "businessArea": "Procurement",
    "systemContext": { "systemId": "S21", "client": "200" },
    "candidateApp": {
      "appId": "F0842A",
      "appName": "Manage Purchase Orders",
      "fioriId": "F0842A",
      "matchScore": 88
    },
    "fitGapDimensions": {
      "functionalFit": { "score": 85, "gaps": [] },
      "uiFit": { "score": 90, "gaps": [] },
      "processFlow": { "score": 80, "gaps": [] },
      "dataModel": { "score": 95, "gaps": [] },
      "extensibility": { "score": 75, "gaps": [] },
      "integration": { "score": 85, "gaps": [] },
      "security": { "score": 90, "gaps": [] },
      "performance": { "score": 85, "gaps": [] }
    },
    "recommendation": {
      "action": "BUILD",
      "confidence": "HIGH",
      "justification": "Significant custom user exit logic requires bespoke UI"
    },
    "lifecycleStatus": "APPROVED",
    "auditEvents": [
      {
        "timestamp": "2026-11-10T08:00:00Z",
        "actor": "admin",
        "action": "CREATE",
        "details": "Assessment created",
        "integrityHash": "abc123sha256...",
        "previousHash": "GENESIS"
      }
    ],
    "createdAt": "2026-11-10T08:00:00Z",
    "updatedAt": "2026-11-10T09:30:00Z"
  }
]
```

### 2.3 Concurrency, Locking & Corruption Mitigation
- **In-Memory Write Lock:** Private promise-chain mutex `_withWriteLock(operation)` ensures sequential atomic writes within the Node.js process.
- **Atomic Two-Phase Flush:** Writes to temporary file (`assessments.json.tmp`), syncs to disk, updates `.bak` backup file, and renames `.tmp` to `assessments.json`.
- **Corruption Recovery:** If `assessments.json` fails JSON parsing on initialization or read, `AssessmentStore` logs a warning, attempts recovery from `assessments.json.bak`, and fails safely with HTTP 500 without wiping the file.

### 2.4 Readers & Writers Trace
- **Writers:**
  - `AssessmentStore.create(assessment)`
  - `AssessmentStore.update(id, updates)`
  - `AssessmentStore.recordModernizationAction(id, action)`
  - `AssessmentStore.archive(id)`
  - Exposed via HTTP routes in `server.js`:
    - `POST /api/v1/assessments`
    - `PUT /api/v1/assessments/:id`
    - `POST /api/v1/assessments/:id/archive`
    - `POST /api/v1/assessments/:id/action`
- **Readers:**
  - `server.js` (`GET /api/v1/assessments`, `GET /api/v1/assessments/:id`, `GET /api/v1/assessments/:id/audit`)
  - `backend/src/services/enterpriseService.js` (Metrics aggregation, portfolio health, status counts)
  - `backend/src/generation/projects/generationProjectService.js` (Handoff intake: verifies assessment exists and has approved BUILD recommendation)
  - `backend/src/services/generationHandoffStore.js` (Legacy bridge verification)

---

## 3. Store 2: Official Fiori Catalogue Cache

### 3.1 Implementation & Ownership
- **Primary Services:**
  - `backend/src/adapters/officialFioriCatalogueAdapter.js` (`OfficialFioriCatalogueAdapter`).
  - `backend/src/tools/ingestFAL.js` (`FALIngestionService`).
- **Physical Locations:**
  - `backend/data/fiori_app_catalog_cache.json` (size: ~562 KB, 12,000+ app mappings).
  - `backend/data/fiori_app_catalog_status.json` (metadata, last sync date, total apps count, hash).
- **Domain:** Reference catalog of standard SAP Fiori Apps sourced from SAP Fiori Apps Reference Library (FAL).

### 3.2 Data Schema
Indexed key-value map and app array:
```json
{
  "lastUpdated": "2026-11-08T12:00:00Z",
  "version": "S/4HANA 2023",
  "totalApps": 12850,
  "apps": [
    {
      "fioriId": "F0842A",
      "appName": "Manage Purchase Orders",
      "appType": "Transactional (SAP Fiori elements)",
      "leadingTCode": "ME21N",
      "relatedTCodes": ["ME22N", "ME23N"],
      "businessArea": "Sourcing and Procurement",
      "lineOfBusiness": "Sourcing and Procurement",
      "odataServices": ["C_PURCHASEORDER_FS_SRV"],
      "uiTechnology": "SAP Fiori elements",
      "scopeItem": "1JI",
      "formFactor": ["Desktop", "Tablet", "Phone"]
    }
  ]
}
```

### 3.3 Concurrency, Locking & Corruption Mitigation
- **Read-Heavy Pattern:** Loaded into an in-memory Map (`this.appsByTCode`, `this.appsById`) on backend start.
- **Safe Write Mechanism:** Updates only occur through offline ingestion tool (`ingestFAL.js`) or admin sync endpoint (`POST /api/v1/catalogue/sync`). Write uses atomic rename (`.tmp` -> target file).

### 3.4 Readers & Writers Trace
- **Writers:**
  - `FALIngestionService.importCSV()` / `importOData()`
  - `OfficialFioriCatalogueAdapter.saveToCache()`
  - Exposed via HTTP route: `POST /api/v1/catalogue/sync`
- **Readers:**
  - `backend/src/engine/fioriMatchingEngine.js` (Matches SAP T-Codes to Fiori apps)
  - `backend/src/adapters/catalogueAdapter.js` (Standard catalogue search)
  - `backend/src/server.js` (`GET /api/v1/catalogue/apps`, `GET /api/v1/catalogue/apps/:id`, `GET /api/v1/catalogue/stats`)
  - `frontend/src/features/catalogue/services/catalogueService.ts`

---

## 4. Store 3: Transaction Master Index Store

### 3.1 Implementation & Ownership
- **Primary Service:** `backend/src/services/transactionMasterIndex.js` (`TransactionMasterIndex` class).
- **Physical Location:** `backend/data/transaction_master_snapshot.json`.
- **Domain:** Dictionary of SAP S/4HANA transactions, Dynpro screens, ABAP programs, packages, and technical complexity attributes across known system profiles (e.g. `S21-200`, `S21-100`).

### 4.2 Data Schema
```json
{
  "systemId": "S21",
  "client": "200",
  "release": "758",
  "snapshotTimestamp": "2026-11-09T00:00:00Z",
  "transactions": {
    "ME21N": {
      "tcode": "ME21N",
      "program": "SAPLMEGUI",
      "screen": "0014",
      "description": "Create Purchase Order",
      "package": "ME",
      "applComponent": "MM-PUR-PO",
      "complexity": "HIGH",
      "hasUserExits": true,
      "badiCount": 14,
      "screenCount": 42
    }
  }
}
```

### 4.3 Concurrency, Locking & Corruption Mitigation
- Loaded once on service startup with in-memory Trie/hash-map index for fast prefix lookup.
- Persisted via `TransactionMasterIndex.saveSnapshot()` using `.tmp` and `.bak` rename pattern.

### 4.4 Readers & Writers Trace
- **Writers:**
  - `TransactionMasterIndex.syncFromSAP(systemProfile)`
  - `TransactionMasterIndex.saveSnapshot()`
- **Readers:**
  - `backend/src/services/transactionDiscoveryProviders.js` (Resolves T-Code metadata)
  - `backend/src/engine/transactionDiscoveryEngine.js` (Calculates screen complexity)
  - `backend/src/server.js` (`POST /api/v1/tcode-search`, `POST /api/v1/discovery/transaction`)
  - `frontend/src/features/transaction-checker/services/transactionSearchService.ts`

---

## 5. Store 4: Generation Project Store

### 5.1 Implementation & Ownership
- **Primary Service:** `backend/src/generation/projects/generationProjectStore.js` (`GenerationProjectStore`).
- **Physical Location:**
  - Projects root: `backend/data/generation-projects/`
  - Per-project file: `backend/data/generation-projects/<projectId>/project.json` (backup at `project.json.bak`).
  - Handoff registry: `backend/data/generationHandoffs.json` (managed by `generationHandoffStore.js`).
- **Domain:** Custom Fiori application generation projects, specifications, architectural decisions, and generation phase tracking.

### 5.2 Data Schema
Canonical project contract defined in `backend/src/generation/contracts/generationProjectContract.js`:
```json
{
  "projectId": "GEN-ME21N-2CD721",
  "name": "Custom Fiori App - ME21N",
  "description": "Generated custom Fiori application for Create Purchase Order",
  "source": {
    "origin": "ASSESSMENT_HANDOFF",
    "assessmentId": "ASM-ME21N-001",
    "tcode": "ME21N",
    "systemContext": {
      "systemId": "S21",
      "client": "200",
      "systemProfile": "S21-200",
      "targetRelease": "SAP S/4HANA 2023 On-Premise"
    }
  },
  "lifecycleStatus": "DRAFT",
  "currentPhase": "PHASE_1_WORKSPACE",
  "phases": {
    "requirements": { "status": "NOT_STARTED", "completedPhases": 0 },
    "dataModel": { "status": "NOT_STARTED" },
    "architecture": { "status": "NOT_STARTED" },
    "abapCore": { "status": "NOT_STARTED" },
    "fioriUi": { "status": "NOT_STARTED" },
    "validation": { "status": "NOT_STARTED" },
    "export": { "status": "NOT_STARTED" }
  },
  "specification": {
    "revision": "v1",
    "appName": "Custom Purchase Order App",
    "appNamespace": "com.fiorix.me21n",
    "targetODataVersion": "v4",
    "rapModel": "UNMANAGED"
  },
  "createdAt": "2026-11-10T10:00:00Z",
  "updatedAt": "2026-11-10T10:00:00Z"
}
```

### 5.3 Concurrency, Locking & Corruption Mitigation
- **Per-Project Mutex Lock:** `_withProjectLock(projectId, operation)` queues asynchronous writes per project ID, preventing race conditions during concurrent updates.
- **Directory Isolation:** Each project is persisted in its own directory, avoiding file-lock contention between separate projects.
- **Atomic Two-Phase Flush:** Writes to `project.json.tmp`, creates `project.json.bak`, and renames `.tmp` to `project.json`.

### 5.4 Readers & Writers Trace
- **Writers:**
  - `GenerationProjectStore.createProject(projectData)`
  - `GenerationProjectStore.updateProject(projectId, updates)`
  - `GenerationProjectStore.archiveProject(projectId)`
  - `GenerationProjectStore.restoreProject(projectId)`
  - `GenerationProjectStore.deleteProject(projectId)`
  - `GenerationProjectStore.duplicateProject(projectId, newName)`
  - Exposed via HTTP routes in `server.js`:
    - `POST /api/v1/generation/projects`
    - `POST /api/v1/generation/handoff`
    - `PATCH /api/v1/generation/projects/:id`
    - `POST /api/v1/generation/projects/:id/archive`
    - `POST /api/v1/generation/projects/:id/restore`
    - `POST /api/v1/generation/projects/:id/duplicate`
    - `DELETE /api/v1/generation/projects/:id`
- **Readers:**
  - `server.js` (`GET /api/v1/generation/projects`, `GET /api/v1/generation/projects/:id`, `GET /api/v1/generation/handoff/status/:assessmentId`)
  - `backend/src/generation/projects/generationProjectService.js`
  - `frontend/src/features/generation/services/generationProjectService.ts`

---

## 6. S1 Migration Plan Matrix for the Four Stores

| Store | Current File Path | Size / Count | Target Relational Entity (S1) | Preservation Strategy |
|---|---|---|---|---|
| **Store 1** | `backend/data/assessments.json` | Active assessments | `assessments`, `fit_gap_dimensions`, `audit_events` | Retain JSON file alongside PostgreSQL during S1 dual-read verification |
| **Store 2** | `backend/data/fiori_app_catalog_cache.json` | ~562 KB, ~12.8k apps | `fiori_catalog_apps`, `fiori_catalog_services` | Database seed migration script `002_seed_fiori_catalog.sql` |
| **Store 3** | `backend/data/transaction_master_snapshot.json` | ~1.5 MB snapshot | `transaction_master_index`, `transaction_metrics` | Database seed migration script `003_seed_transaction_master.sql` |
| **Store 4** | `backend/data/generation-projects/` | Per-project directories | `generation_projects`, `generation_phases`, `generation_specifications` | Migrate JSON definitions into relational tables with artifact directory links |
