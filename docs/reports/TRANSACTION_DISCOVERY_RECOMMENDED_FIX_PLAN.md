# FIORIFY — TRANSACTION DISCOVERY ENGINE
## D. Recommended Technical Fix Plan

**Audit Date:** 2026-11-26  
**Prerequisite:** Investigation Complete (`TRANSACTION_DISCOVERY_ROOT_CAUSE_REPORT.md`)

---

## Prioritized Correction Sequence

### Phase 1: Stop Misleading & False-Positive Outputs (P0 — Immediate)
1. **Fix `KO01`/`KO02`/`KO03` → `F1444` False Positive (`DISC-RC-06`):**
   * **Target:** `backend/src/services/standardTransactionKnowledge.js` (Lines 858–893).
   * **Action:** Remove incorrect `primaryFioriAppId: 'F1444'` (*Manage Profit Centers*) from `KO01`/`KO02`/`KO03` (*Internal Orders*). Audit all other entries in `STANDARD_TRANSACTION_CATALOG` against `fiori_app_catalog_cache.json` app names & components.
   * **Acceptance Criteria:** `KO01` never returns `F1444` as `VERIFIED_SUCCESSOR`.

2. **Eliminate Unindexed `CUSTOM` Misclassification & Synthetic Titles (`DISC-RC-01`, `DISC-RC-02`):**
   * **Target:** `backend/src/engine/transactionDiscoveryEngine.js` (Lines 366–404), `backend/src/services/transactionDiscoveryProviders.js` (Lines 349–353).
   * **Action:** When `masterIndex.lookup()` misses and live SAP is not queried, return `classification: 'UNKNOWN'` (unless `Z*`/`Y*`), `verificationStatus: 'UNINDEXED_PENDING_LIVE_SAP'`, and `description: null` (or `'Pending TSTCT read'`) instead of `CUSTOM` + `synthesizeTransactionTitle()`.
   * **Acceptance Criteria:** `MD07`, `MD01`, `KSB1` in offline mode return `classification: 'UNKNOWN'` and `verificationStatus: 'UNINDEXED_PENDING_LIVE_SAP'`, never `CUSTOM` or `"Production Planning & Orders (MD07)"`.

3. **Remove Frontend DDIC Masking (`DISC-RC-04`):**
   * **Target:** `frontend/src/features/transaction-discovery/components/UnifiedDiscoveryWorkspace.tsx` (Lines 248–263).
   * **Action:** Replace `'Pending DDIC Read'`, `'0100'`, and `'S4CORE 108'` client-side defaults with `null` / `'Not resolved (Pending S21 DDIC)'` and ensure `progressState` is `'PARTIAL_RESULTS'` whenever `programName` or `packageName` is missing.
   * **Acceptance Criteria:** Incomplete DDIC results never display `'0100'` or `'S4CORE 108'` as verified facts or `[COMPLETED]`.

---

### Phase 2: Repair Fiori Catalogue & Matching Engine (`MD07` Case) (P1)
4. **Restore `LeadingTransactionCodes` & `ApplicationComponent` in Catalogue Cache (`DISC-RC-05`):**
   * **Target:** `backend/src/tools/ingestFAL.js`, `backend/src/adapters/officialFioriCatalogueAdapter.js` (`normalizeCatalogueApp`).
   * **Action:** Re-ingest `SingleApp.xsodata` preserving `LeadingTransactionCodes`, `OldTransactionCodes`, `ApplicationComponent`, and `ApplicationComponentText`. Add MRP/PP capability & synonym expansion (`Material Overview` ↔ `Material Coverage` for `F2101A`, `F0247A`, `F0251A`) classified honestly as `POTENTIAL_ALTERNATIVE` (never auto-promoted to `VERIFIED_SUCCESSOR` without exact T-Code link).
   * **Acceptance Criteria:** `MD07` surfaces `F2101A`, `F0247A`, `F0251A` as `POTENTIAL_ALTERNATIVE` functional alternatives; `NO_MATCH_CONFIRMED` is only returned when both live/snapshot DDIC and a complete catalogue confirm 0 matches.

5. **Fix `mockSapAdapter` `_DEMO` Overrides & `FBL1N` Missing Package (`DISC-RC-07`, `DISC-RC-08`):**
   * **Target:** `backend/src/adapters/mockSapAdapter.js`, `backend/src/services/transactionMasterIndex.js`.
   * **Action:** Use baseline `SAPLMEGUI`/`ME` and `SAPMV45A`/`VA` instead of `SAPLMEGUI_DEMO`/`DEMO_MM_CORE`, and populate verified SAP package for `FBL1N`.

---

### Phase 3: Live SAP DDIC Inspection & Strict Error Propagation (P1/P2)
6. **Implement Real Read-Only DDIC Metadata Retrieval (`DISC-RC-03`, `DISC-RC-10`):**
   * **Target:** `backend/src/adapters/sapTransactionDiscoveryAdapter.js`, `backend/src/services/transactionDiscoveryProviders.js`.
   * **Action:** Add read-only SAP query path (via authorized ADT table/data-preview endpoint or custom read-only OData service) for `TSTC` (`PGMNA`, `DYPNO`), `TSTCT` (`TTEXT` by `SPRSL`), `TADIR` (`DEVCLASS`, `SRCSYSTEM` for both `TRAN` and `PROG`), `TDEVC` (`COMPONENT`, `DLVUNIT`), and `CVERS`. Remove hardcoded `'0100'` and `'S4CORE 108'` fallbacks.
   * **Dependencies:** SAP Basis read-only authorizations (`S_ADT_RES`, `S_DEVELOP`, `S_TABU_DIS` Act `03`) on `S21`.

7. **Strict Gateway Error Propagation (`DISC-RC-09`):**
   * **Target:** `backend/src/adapters/sapTransactionDiscoveryAdapter.js` (Lines 396–424).
   * **Action:** Do not convert live Gateway failures into `{ success: true, services: [], isOfflineFallback: true }`; surface `GATEWAY_UNAVAILABLE` explicitly in `diagnostics` and `verificationStatus`.

---

### Phase 4: Regression & Acceptance Criteria
* All 14 representative TCodes (`MD01`, `MD04`, `MD07`, `CO01`, `MM01`, `MM03`, `ME21N`, `VA01`, `VA03`, `VL01N`, `FB03`, `FBL1N`, `KO01`, `KSB1`) must pass an automated verification test validating:
  * Zero synthesized descriptions marked as `TSTCT`.
  * Zero `CUSTOM` classification for unindexed standard TCodes.
  * `MD07` resolves `F2101A` / `F0247A` / `F0251A` as `POTENTIAL_ALTERNATIVE`.
  * `KO01` does not match `F1444`.
