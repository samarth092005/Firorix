# FIORIX — SAP S21 CONNECTIVITY & LANDSCAPE ARCHITECTURE AUDIT
**Document ID:** AUDIT-SAP-CONN-2026-001  
**Status:** COMPLETE  
**Date:** 2026-11-08  
**Scope:** BTP Destination Service, Cloud Connector, Local Dev Tunnel, Gateway Catalog, ADT Probing, Multi-System Registry  

---

## 1. Executive Summary

This audit examines the connectivity path between FioriX and target SAP S/4HANA systems, focusing on **SAP S/4HANA 2023 Private Edition (System: S21, Client: 200)**:
- BTP Destination Service authentication and token exchange.
- SAP Cloud Connector reverse proxy mapping.
- SAP Gateway OData Catalog reachability (`/sap/opu/odata/IWFND/CATALOGSERVICE;v=2`).
- ABAP Development Tools (ADT) discovery interface (`/sap/bc/adt/discovery`).
- Separation between Cloud Foundry and Local Developer runtimes.
- Elimination of false connectivity claims and optimistic timestamps.

---

## 2. Landscape Architecture & Separation of Runtimes

FioriX supports two strictly separated operational runtime profiles:

### 2.1 Local Developer Runtime
- **Target:** Developer workstation connecting to S21 via approved VPN, local forward proxy, or explicit tunnel.
- **Configuration:**
  - `SAP_URL_OVERRIDE` (e.g., `http://127.0.0.1:8000` or corporate VPN endpoint).
  - Basic Authentication via `SAP_USER` and `SAP_PASSWORD` (handled exclusively in backend; never sent to frontend).
  - Explicit local connectivity proxy: `LOCAL_CONNECTIVITY_PROXY`.
- **Constraint:** Never assume corporate laptop VPN routes are automatically reachable by Cloud Foundry applications.

### 2.2 Cloud Foundry (BTP) Runtime
- **Target:** Production deployment on SAP Business Technology Platform.
- **Configuration:**
  - `VCAP_SERVICES` service bindings for `destination` and `connectivity`.
  - `@sap-cloud-sdk/connectivity` resolves BTP destination `S21`.
  - OnPremise proxy routes through SAP Cloud Connector to internal system host (e.g. `http://kbl_fiori:8000`).
  - XSUAA token exchange via `@sap-cloud-sdk/connectivity`.

---

## 3. End-to-End Connection Path Validation

```mermaid
sequenceDiagram
    participant FE as Frontend (React)
    participant BE as Backend (Node 20)
    participant BTP as BTP Destination Service
    participant CC as SAP Cloud Connector
    participant S21 as SAP S21-200 (Gateway / ADT)

    Note over FE,BE: Phase 2 Canonical Request
    FE->>BE: POST /api/v1/discovery/match { tcode: "F-53", systemId: "S21-200" }
    
    alt Local Dev Runtime
        BE->>S21: HTTP GET /sap/opu/odata/IWFND/CATALOGSERVICE;v=2 (via Local Proxy/VPN)
    else BTP Cloud Foundry Runtime
        BE->>BTP: Fetch Destination "S21" (Client Credentials)
        BTP-->>BE: Destination metadata & Auth Token
        BE->>CC: HTTP Request via Connectivity Proxy
        CC->>S21: Target: http://kbl_fiori:8000
    end

    alt S21 Reachable & Authorized
        S21-->>BE: Gateway Catalog / ADT Discovery response
        BE-->>FE: HTTP 200 { success: true, mode: "LIVE_SAP", ... }
    else S21 Unreachable / Auth Failure
        S21--xBE: HTTP 502 / 504 / 401 / 403
        BE-->>FE: HTTP 502/403 { success: false, statusCode: "CONNECTIVITY_FAILED", ... }
        Note over BE,FE: Strict Rule: Never fall back to mock data silently!
    end
```

---

## 4. Connectivity Audit Findings & Corrections

### 4.1 Finding: Pre-Filled Optimistic Connectivity Status (FIND-05)
- **Defect:** `systemRegistry.js` pre-initialized `DEFAULT_SAP_SYSTEMS` with:
  - `connectivityStatus: CONNECTIVITY_STATUSES.PARTIAL_CONNECTIVITY`
  - `evidenceProvenance: EVIDENCE_PROVENANCE.LIVE_SAP_VERIFIED`
  - `lastSuccessfulCheck: new Date().toISOString()`
- **Impact:** Misled operators into believing S21 was live-tested even when the backend had just started on an offline machine.
- **Resolution:**
  1. Default initial state must be `CONNECTIVITY_STATUSES.UNKNOWN`.
  2. `lastSuccessfulCheck` must be `null` until an actual diagnostic run succeeds.
  3. `systemRegistry.runDiagnostics(systemId)` executes live probes and records authentic timestamps.

### 4.2 Finding: Silent Mock Data Fallback on Connection Drop (FIND-12)
- **Defect:** `frontend/src/services/sap/sapDiscoveryAdapter.ts` lines 70-76 automatically substituted mock data (`S21-200-DEMO`) when live S21 queries failed.
- **Impact:** Masked actual network failures and gave false confidence that live SAP data was being analyzed.
- **Resolution:** Completely remove the silent mock fallback. Propagate `CONNECTIVITY_FAILED` with the real error message and provide an explicit retry action.

### 4.3 Finding: Gateway Service Existence Conflated with T-Code Existence
- **Defect:** Previous implementations inferred that if Gateway service `FAP_PAYMENT_POST_SRV` was active, then `F-53` exists in the system.
- **Rule:** Gateway service presence is evidence of an OData service, NOT proof that a specific transaction exists in DDIC. T-Code existence must be confirmed through TSTC/TSTCT records or authoritative master data.

---

## 5. System Registry Resolution Chain

The system registry must resolve dynamically according to the contract:
$$\text{systemId} \longrightarrow \text{destination} \longrightarrow \text{SAP client} \longrightarrow \text{release} \longrightarrow \text{deployment edition} \longrightarrow \text{connectivity profile}$$

| System ID | Destination | Client | Release | Deployment Edition | Profile |
|:---|:---|:---:|:---|:---|:---|
| `S21-200` | `S21` | `200` | SAP S/4HANA 2023 | Private Edition | Live BTP / Local Tunnel |
| `S21-200-DEV` | `S21_DEV` | `200` | SAP S/4HANA 2023 | Private Edition | Mock DDIC Fixtures |
| `S21-200-QAS` | `S21_QAS` | `200` | SAP S/4HANA 2023 | Private Edition | Mock DDIC Fixtures |
| `S4H-DEV-200` | `S4H_DEV` | `200` | SAP S/4HANA 2022 | Cloud Edition | Mock DDIC Fixtures |

Every request passing through `TransactionDiscoveryEngine` and `FioriMatchingEngine` must honor the caller's selected `systemId` and `client` rather than reverting to hardcoded defaults.
