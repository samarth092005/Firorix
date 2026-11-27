# S21 Connectivity Status Audit

**Audit Date:** 2026-11-26  
**Target SAP System:** SAP S/4HANA 2023 Private Edition (`S21`, Client `200`)  
**Deployed BTP Application:** `fiorify-staging` (`https://fiorify-staging.cfapps.eu30.hana.ondemand.com`)  
**Scope:** Read-only live SAP BTP Cloud Foundry, Destination, Connectivity, and S21-200 integration audit. No source files, services, destinations, or SAP objects were modified.

---

## 1. Executive Summary

**Fiorify IS physically connected to live SAP `S21-200` over SAP BTP Destination (`S21_FIORI`), SAP BTP Connectivity Service, and SAP Cloud Connector.**

However, **live SAP DDIC/ABAP Transaction Discovery is currently BLOCKED by SAP authorization (HTTP 403) and incomplete adapter capabilities**, and **two diagnostic endpoints (`/api/v1/systems/S21-200/gateway/metadata` and `/api/v1/systems/S21-200/adt/reachability`) fail with 503/502** because `SapConnectivityProvider.executeQuery()` bypasses `@sap-cloud-sdk/http-client` and attempts direct HTTP calls to the Cloud Connector virtual host without the Connectivity proxy.

---

## 2. Cloud Foundry Deployment & Service Bindings

| Component | Observed State | Evidence |
|---|---|---|
| **CF Org / Space** | `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8` / `dev` | `cf target` |
| **Application** | `fiorify-staging` — `started` (`1/1`, `cflinuxfs4`, `nodejs_buildpack`, `266.7M / 512M`) | `cf app fiorify-staging` |
| **Fiorify-destination** | `destination` (`lite`) — `create succeeded`, bound to `fiorify-staging` | `cf services`, `cf env fiorify-staging` |
| **Fiorify-connectivity** | `connectivity` (`lite`) — `create succeeded`, bound to `fiorify-staging` | `cf services`, `cf env fiorify-staging` |
| **Fiorify-xsuaa** | `xsuaa` (`application`) — `create succeeded`, bound to `fiorify-staging` | `cf services`, `cf env fiorify-staging` |
| **Fiorify-postgres-ups** | `user-provided` — `create succeeded`, bound to `fiorify-staging` (`FIORIFY_PERSISTENCE=postgres`) | `cf services`, `cf env fiorify-staging` |
| **Fiorify-hana** | `hana` (`hdi-shared`) — **`create failed`**, **unbound** | `cf services` |

---

## 3. Live Read-Only Connectivity & Endpoint Test Results

All tests were executed read-only against `https://fiorify-staging.cfapps.eu30.hana.ondemand.com` on 2026-11-26:

1. **`GET /api/v1/health`** -> **HTTP 200 OK**
   - `status: "UP"`
   - `targetLandscape`: `{ sid: "S21", client: "200", release: "SAP S/4HANA 2023 Private Edition" }`
   - `btpDestinationStatus`: `{ configured: true, destinationName: "S21_FIORI", sapClient: "200", destinationBindingPresent: true, connectivityBindingPresent: true }`
2. **`POST /api/v1/discovery/match` (`tcode: "MD07", systemId: "S21-200", client: "200", useLiveSap: true, useMcp: false`)** -> **HTTP 200 OK**
   - **CF Log Evidence (`cf logs fiorify-staging --recent`):**
     - `2026-11-26T15:17:00.33+0530` & `15:17:02.20/.22`: `sap-cloud-sdk-logger` WARN `"You are connecting to an On-Premise system using basic authentication. For productive usage Principal propagation is recommended."`
     - `2026-11-26T15:17:02.34+0530`: `[S21 ADT Probe] path=/sap/bc/adt/discovery httpStatus=403 success=false`
   - **API Response Evidence:**
     - `discovery.description`: `"Production Planning & Orders (MD07)"` (synthesized fallback)
     - `discovery.programName`: `null`
     - `discovery.packageName`: `null`
     - `discovery.softwareComponent`: `"S4CORE 108"` (hardcoded default)
     - `discovery.verificationStatus`: `"PENDING_VERIFICATION"`
     - `warnings`: `"ADT interface blocked by authorization: direct CDS and ABAP object inspection unavailable."`
3. **`GET /api/v1/systems/S21-200/gateway/metadata`** -> **HTTP 503 Server Unavailable**
   - Routed through `SapConnectionHealthService.inspectGatewayMetadata()` -> `SapConnectivityProvider.executeQuery()`, which bypasses `@sap-cloud-sdk/http-client` and fails to route through the BTP Connectivity proxy.
4. **`GET /api/v1/systems/S21-200/adt/reachability`** -> **HTTP 200** with body `{ success: false, status: "NOT_RUN", httpStatus: 502 }`
   - Routed through `SapConnectionHealthService.runHealthCheck()` -> `SapConnectivityProvider.executeQuery()`, failing before the ADT check runs.
5. **`GET /api/v1/gateway-smoke-test`** -> **HTTP 401 Unauthorized**
   - Protected by `x-fiorify-admin-secret` header check in addition to Bearer authentication.

---

## 4. Connectivity Layer Breakdown

- **Network & Cloud Connector Tunnel:** **WORKING** (proven by SAP Cloud SDK reaching `OnPremise` destination `S21_FIORI` and receiving HTTP 403 directly from `S21`).
- **Authentication (`BasicAuthentication`):** **WORKING** (destination `S21_FIORI` authenticates against `S21` without HTTP 401).
- **ADT Discovery (`/sap/bc/adt/discovery`):** **BLOCKED (HTTP 403)** by missing SAP authorizations (`S_ADT_RES`, `S_DEVELOP`, `S_TABU_DIS`).
- **DDIC Inspection (`TSTC`, `TSTCT`, `TADIR`, `TDEVC`):** **BROKEN / NOT IMPLEMENTED** — no direct RFC or OData table-read provider exists; ADT fallback is blocked by HTTP 403.
- **SAP Gateway Catalog (`/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection`):** **PARTIALLY WORKING / MASKED** — `sapTransactionDiscoveryAdapter.js` (lines 396–424) silently converts non-502/504 Gateway failures into `{ success: true, services: [], isOfflineFallback: true }`, and `SapConnectivityProvider.executeQuery()` fails with 503 on `/gateway/metadata`.
