# S21 Connectivity Gap Analysis

**Audit Date:** 2026-11-26  
**Target System:** `S21-200` (`SAP S/4HANA 2023 Private Edition`)

---

## 1. Root Causes of Inaccurate Transaction Discovery

| Gap ID | Layer | Observed Problem | Root Cause |
|---|---|---|---|
| **GAP-01** | **SAP Authorization (`S21`)** | `/sap/bc/adt/discovery` returns **HTTP 403** (`SADT_RESOURCE_003`). | Technical user configured in `S21_FIORI` lacks SAP ADT & repository display authorizations (`S_ADT_RES`, `S_DEVELOP`, `S_TABU_DIS`). |
| **GAP-02** | **DDIC Metadata Pipeline** | `programName: null`, `packageName: null`, `MD07` title synthesized as `"Production Planning & Orders (MD07)"`. | No direct `TSTC`/`TSTCT`/`TADIR`/`TDEVC` read capability exists (no RFC or OData table service); code relies solely on ADT, then falls back to `synthesizeTransactionTitle()` and hardcoded `S4CORE 108`. |
| **GAP-03** | **Connectivity Provider Bug** | `GET /api/v1/systems/S21-200/gateway/metadata` returns **503**; `GET /api/v1/systems/S21-200/adt/reachability` returns **`NOT_RUN` (502)**. | `SapConnectivityProvider.executeQuery()` (`sapConnectivityProvider.js:91-110`) bypasses `@sap-cloud-sdk/http-client` and makes raw HTTP calls to the Cloud Connector virtual URL without the BTP Connectivity proxy. |
| **GAP-04** | **Silent Gateway Error Masking** | Gateway Catalog failures are hidden during `discovery/match`. | `sapTransactionDiscoveryAdapter.js:396-424` converts non-502/504 Gateway errors into `{ success: true, services: [], isOfflineFallback: true }`. |
| **GAP-05** | **Authentication Best Practice** | `sap-cloud-sdk-logger` warns on every call. | Destination `S21_FIORI` uses `BasicAuthentication` instead of `PrincipalPropagation` for On-Premise access. |
| **GAP-06** | **Unused / Failed HANA Service** | `Fiorify-hana` (`hdi-shared`) is in `create failed` state. | `fiorify-staging` uses `Fiorify-postgres-ups` (`FIORIFY_PERSISTENCE: postgres`), leaving `Fiorify-hana` orphaned. |

---

## 2. Recommended Remediation Roadmap (For Separate Implementation Phase)

1. **SAP Basis (`S21`):** Grant read-only ADT and repository display authorizations (`S_ADT_RES`, `S_DEVELOP` activity `03`, `S_TABU_DIS` / `S_TABU_NAM` for `TSTC`, `TSTCT`, `TADIR`, `TDEVC`, `TRDIR`) to the destination technical user, and verify `/sap/bc/adt/*` and `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/*` are allowed in Cloud Connector Access Control.
2. **Backend (`sapConnectivityProvider.js`):** Route `BTP_DESTINATION` queries in `SapConnectivityProvider.executeQuery()` through `btpDestinationAdapter.executeSapGet()` (`@sap-cloud-sdk/http-client`) instead of raw `this.httpClient.execute(targetUrl)`.
3. **Backend (`sapTransactionDiscoveryAdapter.js`):** Remove silent error swallowing (`isOfflineFallback: true`) when `useLiveSap: true`, and surface exact HTTP status codes from Gateway Catalog.
4. **DDIC Completeness:** Implement a read-only SAP table/metadata query (via an authorized OData/ADT/RFC read-only endpoint) for `TSTC`, `TSTCT`, `TADIR`, `TDEVC`, and `TRDIR` instead of synthesizing titles or hardcoding `S4CORE 108` / screen `0100`.
5. **BTP Cleanup:** Remove or reprovision the failed `Fiorify-hana` service instance if PostgreSQL (`Fiorify-postgres-ups`) is the intended persistence store.
