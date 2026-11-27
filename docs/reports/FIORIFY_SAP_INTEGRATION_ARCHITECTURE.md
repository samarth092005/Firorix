# Fiorify SAP Integration Architecture

**Audit Date:** 2026-11-26  
**Codebase:** `c:\Users\samarth\firorix\backend\src\`

---

## 1. Implemented Integration Components

### A. BTP Destination & HTTP Execution (`backend/src/adapters/btpDestinationAdapter.js`)
- **SDKs Used:** `@sap-cloud-sdk/connectivity` (`getDestination`) and `@sap-cloud-sdk/http-client` (`executeHttpRequest`).
- **Capabilities:**
  - Inspects `VCAP_SERVICES` bindings for `destination`, `connectivity`, `xsuaa`, `hana`.
  - Executes **strictly read-only** `GET` requests (`executeSapGet()`) via `executeHttpRequest({ destinationName }, { method: 'GET', url, headers, timeout })`.
  - Enforces a 60-second failure cooldown (`failureCooldownMs = 60000`) and 15-second timeout (`SAP_TIMEOUT_MS = 15000`).
  - Sanitizes headers, destinations, and error messages.

### B. Transaction Discovery Adapter (`backend/src/adapters/sapTransactionDiscoveryAdapter.js`)
- **Implemented SAP Calls:**
  - `probeAdtInterface()` -> `GET /sap/bc/adt/discovery` (returns `UNAUTHORIZED` / `SADT_RESOURCE_003` on HTTP 403).
  - `fetchAdtTransactionDetails()` / `searchAdtTransaction()` -> ADT repository search & object XML fetch (`/sap/bc/adt/repository/informationsystem/search`, `/sap/bc/adt/programs/programs/...`).
  - `discoverTransaction()` -> Probes ADT first; if ADT returns 403 (`isAdtAccessible = false`), attempts Gateway Catalog (`GATEWAY_CATALOG_PATH`), **but lines 396–424 swallow non-502/504 Gateway errors** into `{ success: true, services: [], isOfflineFallback: true }`.
- **Missing Capabilities:**
  - **No RFC integration** (`RFC_READ_TABLE`, `BAPI_*`, `node-rfc` are absent).
  - **No direct DDIC table reader** for `TSTC`, `TSTCT`, `TADIR`, `TDEVC`, `TRDIR`, `DD02L`, `DD03L`.

### C. Transaction Discovery Providers (`backend/src/services/transactionDiscoveryProviders.js`)
When ADT is blocked (HTTP 403), the 6-stage provider pipeline falls back to synthetic/hardcoded values:
1. `TransactionRegistryProvider` -> marks transaction `UNVERIFIED` / `PENDING_VERIFICATION`.
2. `TransactionDescriptionProvider` -> calls `synthesizeTransactionTitle(tcode)` (e.g., `MD07` -> `"Production Planning & Orders (MD07)"`).
3. `RepositoryMetadataProvider` -> sets `programName: null`, `packageName: null`, hardcodes `softwareComponent: "S4CORE 108"`.
4. `DDICMetadataProvider` -> hardcodes `screenNumber: "0100"` when ADT is unavailable.
5. `AuthorizationEvidenceProvider` -> reports missing `S_ADT_RES` / `S_DEVELOP` / `S_TABU_DIS`.
6. `GatewayCorrelationProvider` -> searches only the Gateway services returned (empty when `isOfflineFallback: true`).

### D. Landscape Diagnostics & Gateway Metadata (`backend/src/infrastructure/connectivity/`)
- `systemRegistry.js` -> delegates `runDiagnostics()` and `inspectGatewayMetadata()` to `SapConnectionHealthService`.
- **Critical Bug in `sapConnectivityProvider.js` (lines 91–110):** `SapConnectivityProvider.executeQuery()` resolves the destination via `btpDestinationAdapter.resolveDestination()`, extracts `rawDest.url`, and calls `this.httpClient.execute(targetUrl, ...)` directly **instead of `@sap-cloud-sdk/http-client`'s `executeHttpRequest()`**. Because `OnPremise` virtual hosts are not reachable without the BTP Connectivity Service proxy, `/api/v1/systems/S21-200/gateway/metadata` fails with **HTTP 503** and `/api/v1/systems/S21-200/adt/reachability` fails with **HTTP 502 (`NOT_RUN`)**.

---

## 2. Execution Flow Summary

```text
POST /api/v1/discovery/match (MD07, useLiveSap: true)
  -> discoveryRoutes.js
  -> transactionDiscoveryEngine.js
  -> sapTransactionDiscoveryAdapter.js
  -> btpDestinationAdapter.executeSapGet()
  -> @sap-cloud-sdk/http-client (executeHttpRequest)
  -> BTP Connectivity Proxy -> Cloud Connector -> SAP S21-200
  -> /sap/bc/adt/discovery returns HTTP 403
  -> Gateway Catalog fallback (swallows non-502/504 errors)
  -> transactionDiscoveryProviders.js synthesizes "Production Planning & Orders (MD07)" + "S4CORE 108"
```
