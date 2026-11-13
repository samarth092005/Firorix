# Fiorify — DATABASE AND CATALOGUE ARCHITECTURE AUDIT
**Document ID:** AUDIT-DATA-CAT-2026-001  
**Status:** COMPLETE  
**Date:** 2026-11-08  
**Scope:** Data Persistence, CDS Schema, FAL Ingestion, Catalogue Search, Working Directory Normalization  

---

## 1. Executive Summary

This audit evaluates the database and catalogue layer of Fiorify, encompassing:
1. The JSON file-backed persistence store (`backend/data/assessments.json` and `assessmentStore.js`).
2. The SAP Cloud Application Programming Model (CAP) Core Data Services (CDS) models (`backend/db/schema.cds` and `backend/srv/discovery-service.cds`).
3. The official SAP Fiori Apps Reference Library (FAL) cache and ingestion engine (`backend/src/adapters/officialFioriCatalogueAdapter.js` and `backend/src/tools/ingestFAL.js`).
4. Working directory resolution discrepancies across deployment modes.
5. Catalogue availability state modeling and coverage reality.

---

## 2. JSON Persistence Store Audit (`assessmentStore.js`)

### 2.1 Current Implementation Analysis
`assessmentStore.js` provides a hardened, atomic JSON persistence layer:
- **Concurrency & Atomic Writes:** Uses atomic temporary file writes (`${path}.tmp.${random}`) followed by rename (`fs.renameSync`), serialized with a mutex queue (`_writeLock`).
- **Cryptographic Audit Chaining:** Implements SHA-256 hash chaining for audit events:
  $$\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} \parallel \text{eventId} \parallel \text{timestamp} \parallel \text{action} \parallel \text{actor} \parallel \dots)$$
- **Server-Authoritative Enforcement:** Strips client tampering on fields (`id`, `createdAt`, `createdBy`, `fitGapScore`, `dimensionResults`, `scoringBreakdown`).
- **Governance Gate Transitions:** Enforces `ALLOWED_TRANSITIONS` preventing illegal state jumps (e.g. `RECOMMENDATION_COMPLETED` cannot jump directly to `APPROVED` without passing `PENDING_REVIEW`).
- **Separation of Duties:** Enforces that the creator cannot approve their own assessment (`SEPARATION_OF_DUTIES_VIOLATION`).

### 2.2 Defects & Weaknesses Identified
1. **Frontend Disconnection:** As identified in FIND-03, `frontend/src/services/assessmentService.ts` called client-side `demoDataProvider` instead of the backend's `/api/v1/assessments` routes. The hardened backend store was never exercised by standard UI workflows!
2. **Missing Relational Foreign Keys:** The JSON format stores embedded arrays. Relational integrity between `Assessment -> Candidates -> Evidence -> AuditEvents` is enforced purely through application code rather than database constraints.
3. **Storage Path Resolution:** While `assessmentStore.js` implements `resolveDefaultStoragePath()`, it relies on `path.basename(process.cwd()) === 'backend'`. If executed in any other directory structure, it risks path mismatch.

---

## 3. CDS Data Models Audit (`schema.cds` & `discovery-service.cds`)

### 3.1 Schema Analysis
- `db/schema.cds` defines four entities:
  - `Systems`: Managed SAP system registry (`systemId`, `client`, `release`, `mode`, etc.).
  - `Transactions`: SAP transaction DDIC metadata (`tcode`, `exists`, `classification`, `program`, `packageName`, etc.).
  - `FioriApps`: Normalized Fiori application entity (`appId`, `appName`, `uiTechnology`, `productVersion`, etc.).
  - `TCodeMappings`: Association linking T-Codes to Fiori apps (`matchType`, `releaseCompatibility`, `rationale`).
- `srv/discovery-service.cds` defines projections on these four entities and an action `searchTransaction`.

### 3.2 Target Relational Migration Blueprint
To support enterprise scale (thousands of assessments, tens of thousands of FAL records), the target architecture must support:
- Primary key constraints (`UUID` / `cuid`).
- Foreign keys (`AssessmentRecord.candidateAppId -> FioriApps.appId`).
- Unique constraints (`UNIQUE(systemId, client, tcode)`).
- Immutable audit log table with row-level digital signatures.
- Non-destructive migration scripts preserving all existing records in `backend/data/assessments.json`.

---

## 4. Official Fiori Catalogue & Ingestion Audit

### 4.1 Working Directory Resolution Defect (FIND-02)
- **Root Cause:**
  `officialFioriCatalogueAdapter.js` lines 124:
  ```js
  this.cacheFilePath = options.cacheFilePath || path.resolve(process.cwd(), 'backend', 'data', 'fiori_app_catalog_cache.json');
  ```
  When the backend is started from `firorix/backend`, `process.cwd()` is `C:\Users\...\firorix\backend`. The code appends `backend/data/...`, creating the erroneous path `C:\Users\...\firorix\backend\backend\data\fiori_app_catalog_cache.json`.
- **Impact:**
  The server loads an empty cache. Every search query against `/api/v1/fiori-catalogue/search` returns 0 candidates. The Catalogue page appears broken or empty.
- **Resolution:**
  Use module-relative path resolution:
  ```js
  import { fileURLToPath } from 'node:url';
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  export function resolveCanonicalCatalogueCachePath() {
    return path.resolve(__dirname, '../../../backend/data/fiori_app_catalog_cache.json');
  }
  ```
  This resolves identically regardless of `process.cwd()`.

### 4.2 Catalogue Availability States
The system must explicitly model and return the following operational states:
1. `LIVE_AVAILABLE`: Live OData query to SAP Fiori Apps Reference Library succeeded.
2. `CACHE_AVAILABLE`: Live query unavailable, but valid verified local snapshot is present.
3. `LIVE_AND_CACHE_AVAILABLE`: Both live query and verified local snapshot are active.
4. `EMPTY_CATALOGUE`: No live connection and local cache file is empty or missing.
5. `SOURCE_UNAVAILABLE`: SAP official endpoint is unreachable, timeout, or DNS failure.
6. `SEARCH_INCOMPLETE`: Query interrupted, timed out, or truncated before completion.
7. `INVALID_SOURCE_RESPONSE`: Upstream endpoint returned malformed EDMX/JSON.

### 4.3 Catalogue Coverage Reality
- The current seed cache `fiori_app_catalog_cache.json` contains exactly **32 records** (sample finance and cross-functional apps: `F1612`, `F-53`, `F1367`, `F0718`, `ME21N`, `VA01`, `F0771`, etc.).
- **Rule Enforcement:** This 32-record subset must NEVER be described as "the complete global SAP Fiori catalogue". The UI and telemetry must report:
  - Cache size: 32 apps.
  - Coverage scope: Curated Baseline FPS02.
  - Snapshot date and version.
  - Notice that full catalogue ingestion is available via `/api/v1/fiori-catalogue/import`.

---

## 5. Acceptance Criteria & Verification Matrix

| Area | Requirement | Verification Method | Status |
|:---|:---|:---|:---|
| Path Resolution | Adapter & Ingestion resolve identical cache path regardless of CWD | Automated test running from repo root AND backend folder | Planned Fix |
| Availability States | Return 7 distinct status states | Backend unit tests with mocked upstream failures | Planned Fix |
| Coverage Telemetry | Expose accurate count & version; never claim full global FAL | Catalogue status endpoint validation | Planned Fix |
| Persistence Wiring | Frontend calls backend `/api/v1/assessments` | E2E browser & API test verifying disk persistence | Planned Fix |
| Audit Integrity | Audit events chained with valid SHA-256 hashes | Cryptographic verification endpoint `/verify-audit` | Verified in Test Suite |
