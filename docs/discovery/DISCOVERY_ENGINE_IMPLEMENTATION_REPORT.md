# Fiorify — Discovery Engine Implementation Report (Phase 6)
**Document Version:** 1.0.0  
**Phase:** Phase 6 — Discovery (DISC-001 through DISC-008)  
**Target Landscape:** Local PostgreSQL / Production SAP HANA Cloud / Read-Only Upstream S/4HANA 2023 System S21 (Client 200)  
**Execution Status:** Complete & Verified (42/42 Master Discovery Tests Passing)

---

## 1. Executive Summary

Phase 6 implements the complete Discovery Layer for Fiorify. Previous implementations relied on synthetic heuristics (such as hardcoded tcode arrays or prefix string guessing) to infer transaction existence and catalogue matches. This phase eliminates all heuristic fabrications, replacing them with authentic, multi-source SAP discovery, end-to-end catalogue completeness tracking, deterministic multi-candidate matching, secret-scrubbed technical evidence provenance, and structured UI contracts.

### Key Architectural Outcomes:
1. **Zero Synthetic Heuristics (`DISC-001`)**: Transaction existence is confirmed solely via verified live SAP DDIC inspection (TSTC table) or authoritative S21 baseline snapshots. Unindexed codes fail closed to `PENDING_VERIFICATION`. Network timeouts return `BACKEND_UNAVAILABLE` (with `exists: null`), and ADT 403 authorization failures return `AUTHORIZATION_BLOCKED` (with `exists: null`), never false negatives.
2. **Catalogue Completeness Tracking (`DISC-002`)**: Official SAP Fiori Apps Reference Library sync tracks catalogue status (`COMPLETE`, `INCOMPLETE`, `STALE`, `FAILED_SYNC`, `UNKNOWN`). Absence of a matching Fiori app when the catalogue is partial yields `NO_MATCH_PENDING`, preventing erroneous conclusions.
3. **Standard-First Match Classification (`DISC-003`)**: Standardized 6-tier classification (`VERIFIED_SUCCESSOR`, `POTENTIAL_ALTERNATIVE`, `WEAK_CANDIDATE`, `NO_MATCH_CONFIRMED`, `NO_MATCH_PENDING`, `DISCOVERY_BLOCKED`).
4. **Scoring & Explainability Separation (`DISC-004`)**: Decouples composite scores into separate mathematical components: overallScore, matchScore, evidenceStrength, and confidence level with human-readable rationale.
5. **Technical Evidence & Sanitization (`DISC-005`)**: Collects deep ABAP technical evidence (TSTC, TADIR, TFDIR, USOBX_C, SU24 auth objects, screen numbers) with automated secret scrubbing and tenant isolation.
6. **18 Golden Regression Scenarios (`DISC-006`)**: Verified 18 reference test scenarios in `backend/test/discoveryMasterSuite.test.js` with 100% pass rate.
7. **Catalogue Freshness & Deduplication (`DISC-007`)**: Synchronizes deduplicated official Fiori catalogue metadata with cached timestamps.
8. **UI Provenance Contracts (`DISC-008`)**: Standardized labels and badge styling for frontend discovery components.

---

## 2. Ticket-by-Ticket Implementation Details

### DISC-001: Live T-Code Existence Verification
- **Implementation File:** `backend/src/services/transactionDiscoveryProviders.js`
- **Capabilities Delivered:**
  - Distinct verification states: `CONFIRMED_EXISTING`, `CONFIRMED_NON_EXISTENT`, `PARTIALLY_AVAILABLE`, `PENDING_VERIFICATION`, `AUTHORIZATION_BLOCKED`, `BACKEND_UNAVAILABLE`, `SYNTAX_INVALID`.
  - For live ADT, when an HTTP 403 is received due to missing `S_ADT_RES` activity 03 authorization, the state transitions to `AUTHORIZATION_BLOCKED` and `exists` is set to `null` (never `false`).
  - Network timeouts (e.g. ICM 504) produce `BACKEND_UNAVAILABLE` with `exists: null`.
  - Removed all hardcoded synthetic heuristics (e.g. `['VA01', 'ME21N'].includes(tcode)`). In production mode, any unindexed non-mock transaction returns `PENDING_VERIFICATION`.

### DISC-002: Catalogue Completeness Metadata End-to-End
- **Implementation File:** `backend/src/adapters/officialFioriCatalogueAdapter.js`
- **Capabilities Delivered:**
  - Exported canonical completeness states: `COMPLETE`, `INCOMPLETE`, `STALE`, `FAILED_SYNC`, `UNKNOWN`.
  - Tracks total catalogue items versus imported apps count.
  - End-to-end propagation through `searchApps` and `getAllApps`, ensuring the caller receives metadata containing total items, imported items, and completeness status.

### DISC-003: Match Classifications & Standard-First Decisioning
- **Implementation File:** `backend/src/engine/fioriMatchingEngine.js`
- **Capabilities Delivered:**
  - Enforces standard-first rule: If an official SAP successor exists with compatible release, it is classified as `VERIFIED_SUCCESSOR`.
  - Multiple candidates or partial match results in `POTENTIAL_ALTERNATIVE` or `WEAK_CANDIDATE`.
  - If zero candidates exist and the catalogue is `INCOMPLETE`, returns `NO_MATCH_PENDING` (never `NO_MATCH_CONFIRMED`).
  - Only when catalogue is verified `COMPLETE` can zero matches produce `NO_MATCH_CONFIRMED`.
  - Upstream connectivity blocks yield `DISCOVERY_BLOCKED`.

### DISC-004: Scoring Weights, Evidence Thresholds & Confidence
- **Implementation File:** `backend/src/engine/fioriMatchingEngine.js`
- **Capabilities Delivered:**
  - Separation of scores:
    - `overallScore`: Weighted composite assessment.
    - `matchScore`: Degree of alignment between legacy transaction and Fiori app metadata.
    - `evidenceStrength`: Volume and authenticity of corroborating technical evidence.
    - `confidence`: Confidence bucket (`HIGH`, `MEDIUM`, `LOW`).
    - `matchClassification`: Discrete categorical classification.
  - Detailed explainability notes attached to each candidate.

### DISC-005: Technical Evidence Linkage & Secret Scrubbing
- **Implementation File:** `backend/src/engine/technicalEvidenceEngine.js`
- **Capabilities Delivered:**
  - Traceable provenance objects: `{ sourceName, evidenceType, sourceRecordId, timestamp, tenantId, systemId, client }`.
  - Gathers evidence across ABAP layers: Transaction code (TSTC), Repository package (TADIR), Function modules (TFDIR), Screen numbers, DDIC tables, SU24 authorization objects (USOBX_C).
  - Sanitizes evidence payloads: scrubs passwords, bearer tokens, basic auth credentials, session cookies, and private tokens.
  - Enforces strict tenant separation on technical evidence records.

### DISC-006: 18 Golden Discovery Regression Scenarios
- **Implementation File:** `backend/test/discoveryMasterSuite.test.js`
- **18 Scenarios Verified:**
  1. `VA01` $\rightarrow$ Standard Sales Order Fiori candidate (`VERIFIED_SUCCESSOR`).
  2. `FB03` $\rightarrow$ Standard Financial Document Fiori candidate (`VERIFIED_SUCCESSOR`).
  3. `ME23N` $\rightarrow$ Standard PO Display Fiori candidate (`VERIFIED_SUCCESSOR`).
  4. Custom Z-Report with incomplete catalogue $\rightarrow$ `NO_MATCH_PENDING`.
  5. Custom Z-Table Maintenance with complete catalogue $\rightarrow$ `NO_MATCH_CONFIRMED`.
  6. Legacy Dynpro transaction $\rightarrow$ WebGUI fallback candidate.
  7. ADT 403 Authorization Failure $\rightarrow$ `AUTHORIZATION_BLOCKED` (`exists: null`).
  8. ICM 504 Network Timeout $\rightarrow$ `BACKEND_UNAVAILABLE` (`exists: null`).
  9. Incomplete catalogue search returns `NO_MATCH_PENDING`.
  10. Stale catalogue metadata tracking.
  11. Obsolete transaction with standard successor.
  12. SU24 authorization object evidence collection.
  13. Multiple candidate apps $\rightarrow$ `POTENTIAL_ALTERNATIVE`.
  14. Single verified successor $\rightarrow$ `VERIFIED_SUCCESSOR`.
  15. Secret scrubbing in evidence payloads.
  16. Cross-tenant isolation in technical evidence.
  17. Malformed transaction code returns `SYNTAX_INVALID`.
  18. End-to-end discovery response contract with structured provenance.

### DISC-007: Catalogue Freshness, Deduplication & Ingestion
- **Implementation File:** `backend/src/adapters/officialFioriCatalogueAdapter.js`
- **Capabilities Delivered:**
  - Deduplicates incoming apps by canonical Fiori `appId` (e.g. `F0842A`).
  - Records synchronization timestamp, version, and item count.
  - Provides offline fallback cached in local JSON fixtures when remote connectivity is absent.

### DISC-008: Discovery UI Provenance & Label Contracts
- **Implementation Files:** `backend/src/adapters/sapTransactionDiscoveryAdapter.js`, `frontend/src/features/transaction-checker/`
- **Capabilities Delivered:**
  - Formats human-readable provenance labels: `"Official SAP Fiori Apps Reference Library"`, `"Verified SAP S21 Live Gateway"`, `"Authoritative S21 DDIC Snapshot"`.
  - Exposes metadata to frontend components without technical schema leakage.

---

## 3. Automated Test Evidence

Running `node --test backend/test/discoveryMasterSuite.test.js`:
- Total Subtests: 42
- Passed: 42
- Failed: 0
- Execution Time: ~7.8s
- Pass Rate: **100%**
