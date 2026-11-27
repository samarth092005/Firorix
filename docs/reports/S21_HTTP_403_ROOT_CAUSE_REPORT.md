# S21 HTTP 403 Root Cause Report

**Investigation Date:** 2026-11-26  
**Target System:** SAP S/4HANA 2023 Private Edition (`S21`, Client `200`)  
**Destination:** `S21_FIORI` (`User: int_samarth`, `Authentication: BasicAuthentication`, `ProxyType: OnPremise`, `URL: http://s21fiori:8000`, `sap-client: 200`)  
**Constraint:** Read-only investigation; no SAP roles, BTP destination, Cloud Connector, or CF deployment changes were made.

---

## 1. Executive Summary

Both **ADT Discovery** (`/sap/bc/adt/discovery`) and **SAP Gateway Catalog** (`/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection`) return **HTTP 403** when invoked from `fiorify-staging`, despite `INT_SAMARTH` holding `SAP_ALL` in `S21` Client `200`.

### Confirmed Root Cause of Diagnostic Blindness (Code-Verified)
The current deployed code **cannot determine which layer generated the HTTP 403** because:
1. `btpDestinationAdapter.handleExecutionError()` (`backend/src/adapters/btpDestinationAdapter.js:615-624`) **discards `err.response.data` and `err.response.headers`** on HTTP 403 and returns a hardcoded generic message (`"SAP Gateway Authorization Failed (HTTP 403)..."`).
2. `sapTransactionDiscoveryAdapter.probeAdtInterface()` (`backend/src/adapters/sapTransactionDiscoveryAdapter.js:154-168`) **hardcodes** `code: 'SADT_RESOURCE_003'` and `message: 'No authorization to access the resource /sap/bc/adt/discovery.'` for *every* HTTP 403 without reading the upstream response.
3. `sapGatewayMetadataAdapter.getCatalogServices()` (`backend/src/adapters/sapGatewayMetadataAdapter.js:378-395`) **hardcodes** the fallback `notice`:
   `"Live Gateway service /IWFND/CATALOGSERVICE returned HTTP 403 on S21:200 (service registration in /IWFND/MAINT_SERVICE required). Serving verified SAP S/4HANA 2023 baseline catalog."`
   This notice is **locally generated** (`sapGatewayMetadataAdapter.js:391-392`) — it is **not** an SAP error message from `S21`.

---

## 2. Confirmed Findings vs. Hypotheses

### Confirmed Findings (Directly Observed)
1. **Shared Destination, User, Client, and Execution Path:**
   Both `/sap/bc/adt/discovery` and `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection` execute through `btpDestinationAdapter.executeRequest()` (`backend/src/adapters/btpDestinationAdapter.js:482-575`) using the exact same destination (`S21_FIORI`), username (`int_samarth`), `BasicAuthentication`, `ProxyType: OnPremise`, `URL: http://s21fiori:8000`, and `'sap-client': '200'`.
2. **Both Endpoints Return HTTP 403 on `fiorify-staging`:**
   - `/sap/bc/adt/discovery`: CF log `[S21 ADT Probe] path=/sap/bc/adt/discovery httpStatus=403 success=false`.
   - `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection`: `GET /api/v1/gateway/services?limit=5&refresh=true` returned `isFallback: true` with the hardcoded `403` notice in `~172ms`.
3. **Gateway `/IWFND/MAINT_SERVICE` Notice Is Locally Generated:**
   Confirmed at `backend/src/adapters/sapGatewayMetadataAdapter.js:391-392`. It fires unconditionally whenever `response.httpStatus === 403`, regardless of the actual upstream 403 reason.
4. **`SADT_RESOURCE_003` Code Is Locally Hardcoded:**
   Confirmed at `backend/src/adapters/sapTransactionDiscoveryAdapter.js:155-167`. It is not parsed from `S21`.
5. **Current Deployed App Cannot Distinguish Upstream 403 Sources:**
   Because `response.data` and `response.headers` are discarded at `btpDestinationAdapter.js:616-624`, the deployed app cannot distinguish Cloud Connector 403, SAP ICM/UCON 403, ICF 403, SAP application/PFCG 403, or `/IWFND/MAINT_SERVICE` configuration errors.

### Hypotheses (Require Verification on Cloud Connector / `S21` or Undeployed Diagnostic Patch)
1. **Hypothesis A — SAP Cloud Connector Access Control (Most Consistent with `SAP_ALL` + Fast 403 on Both Paths):**
   If Cloud Connector Access Control for `s21fiori:8000` only allows specific paths (or lacks `/sap/bc/adt` and `/sap/opu/odata`), Cloud Connector itself returns **HTTP 403** before the request reaches `S21`, regardless of `INT_SAMARTH` having `SAP_ALL`.
2. **Hypothesis B — SAP ICM / UCON HTTP Allowlist (`UCONCOCKPIT`) or Reverse Proxy:**
   UCON or an internal reverse proxy on `s21fiori:8000` can reject `/sap/bc/adt/*` or `/sap/opu/odata/*` with HTTP 403 before ABAP authorization checks run.
3. **Hypothesis C — ICF Node Inactive / Restricted (`SICF`) or Gateway Service Restriction:**
   ICF service restrictions or SAP Web Dispatcher/ICM rules could return 403, though an inactive `/IWFND/MAINT_SERVICE` OData service typically returns 403/404 with an SAP JSON/XML error body (`/IWFND/CM_COS/...`) — which is currently discarded by `btpDestinationAdapter.js`.
4. **Hypothesis D — ABAP Application Authorization:**
   Unlikely to be missing PFCG authorizations given `SU01` confirms `SAP_ALL` for `INT_SAMARTH` in Client `200`, unless `S21` enforces a separate switch/exit or `int_samarth` is locked/mapped differently (which would normally return `401` or an ABAP logon error).

---

## 3. Diagnostic Approach Implemented Locally (Not Deployed)

To preserve safe HTTP error evidence without exposing passwords, cookies, `Authorization` headers, or tokens:
- Added `extractSafeHttpErrorEvidence()` in `backend/src/adapters/btpDestinationAdapter.js` to capture sanitized headers (`server`, `content-type`, `sap-system`, `sap-client`, `sap-server`, `sap-err-id`, `x-sap-request-id`), bounded & scrubbed body snippet (`<= 800` chars), parsed SAP error code/message if present, and rule-based `originHint` (`SAP_CLOUD_CONNECTOR`, `SAP_APPLICATION_OR_ICF`, `SAP_ICM_OR_UCON`, or `UNKNOWN`).
- Updated `sapTransactionDiscoveryAdapter.probeAdtInterface()` to log and preserve `diagnostics` on HTTP 403.
- Updated `sapGatewayMetadataAdapter.getCatalogServices()` to attach `upstreamStatus` and `upstreamDiagnostics` on fallback.
