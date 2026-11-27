# SAP Cloud Connector Audit

**Audit Date:** 2026-11-26  
**Target SAP System:** `S21` (Client `200`)  
**BTP Subaccount / App:** `fiorify-staging` (`cfapps.eu30.hana.ondemand.com`)

---

## 1. Architecture & Runtime Evidence

Direct administrative access to the on-premise SAP Cloud Connector UI/API (`localhost:8443`) was not available from this environment. However, live runtime telemetry from `fiorify-staging` proves the Cloud Connector tunnel is **active and forwarding traffic to `S21`**:

1. `Fiorify-connectivity` (`connectivity`, `lite`) and `Fiorify-destination` (`destination`, `lite`) are bound to `fiorify-staging`.
2. During `POST /api/v1/discovery/match` (`useLiveSap: true`), `@sap-cloud-sdk/http-client` resolved `S21_FIORI` as an `OnPremise` destination (`sap-cloud-sdk-logger`: *"You are connecting to an On-Premise system using basic authentication"*).
3. The request traversed the BTP Connectivity proxy and Cloud Connector tunnel to `S21`, which returned **`HTTP 403`** on `/sap/bc/adt/discovery` (`[S21 ADT Probe] path=/sap/bc/adt/discovery httpStatus=403 success=false`).

---

## 2. Cloud Connector Verification Matrix

| Item | Status | Notes |
|---|---|---|
| **Cloud Connector Tunnel Active** | **VERIFIED (Indirectly)** | Live `S21` HTTP 403 response reached `fiorify-staging` via `OnPremise` destination `S21_FIORI`. |
| **S21 Backend Mapping** | **VERIFIED (Indirectly)** | `S21` responded to `/sap/bc/adt/discovery`. |
| **Virtual Host & Port** | **NOT VERIFIED** | Not exposed in CF env or sanitized logs; requires BTP Cockpit / Cloud Connector UI. |
| **Internal Host & Port** | **NOT VERIFIED** | Requires Cloud Connector admin UI access. |
| **Location ID** | **NOT VERIFIED** | Requires BTP Destination / Cloud Connector admin UI access. |
| **Accessible URL Path Mappings (`/sap/bc/adt/`, `/sap/opu/odata/`)** | **PARTIALLY VERIFIED** | `/sap/bc/adt/discovery` reached `S21` (HTTP 403 from SAP authorization, not a Cloud Connector 403/503 tunnel block). `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/` path mapping status in Cloud Connector is **NOT VERIFIED** independently due to `SapConnectivityProvider` bypassing the proxy on `/gateway/metadata` and `sapTransactionDiscoveryAdapter` swallowing non-502/504 Gateway errors. |
| **RFC / WebSocket / Cloud-to-On-Premise RFC Mapping** | **NOT CONFIGURED / NOT VERIFIED** | No RFC SDK (`node-rfc`) is integrated in Fiorify backend; only HTTP destinations are used. |
