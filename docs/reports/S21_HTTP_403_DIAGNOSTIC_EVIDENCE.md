# S21 HTTP 403 Diagnostic Evidence

**Investigation Date:** 2026-11-26  
**Codebase:** `c:\Users\samarth\firorix\backend\src\adapters\`

---

## 1. Error-Handling Path Trace & Where Evidence Was Discarded

### A. `backend/src/adapters/btpDestinationAdapter.js`
1. **Request Execution (`executeRequest`, lines 482–575):**
   - Resolves `S21_FIORI` via `@sap-cloud-sdk/connectivity` (`getDestination`).
   - Attaches `'sap-client': '200'` and `Basic` auth header from `targetDestination.username` (`int_samarth`).
   - Executes `GET` via `@sap-cloud-sdk/http-client` (`executeHttpRequest`).
   - On HTTP 4xx/5xx, `@sap-cloud-sdk/http-client` throws an Axios-style error with `err.response.status`, `err.response.headers`, and `err.response.data`.
2. **Where Evidence Was Discarded (`handleExecutionError`, lines 580–624):**
   - Previously, `if (httpStatus === 403)` immediately returned:
     ```js
     {
       success: false,
       statusCode: 'AUTHORIZATION_FAILED',
       httpStatus: 403,
       errorMessage: `SAP Gateway Authorization Failed (HTTP 403) on destination "${this.destinationName}" (Client ${this.sapClient}). The technical user lacks authorization (check PFCG object S_SERVICE for target service).`,
       details: { path, destination: this.destinationName, client: this.sapClient }
     }
     ```
   - Both `err.response.data` (body) and `err.response.headers` were **completely discarded**.

### B. `backend/src/adapters/sapTransactionDiscoveryAdapter.js`
- **`probeAdtInterface()` (lines 144–168):**
  - Calls `this.btpAdapter.executeRequest({ path: '/sap/bc/adt/discovery', method: 'GET', ... })`.
  - Previously, `if (response.httpStatus === 403)` returned **hardcoded** `code: 'SADT_RESOURCE_003'` and `message: 'No authorization to access the resource /sap/bc/adt/discovery.'`, ignoring any upstream detail.

### C. `backend/src/adapters/sapGatewayMetadataAdapter.js`
- **`getCatalogServices()` (lines 361–396):**
  - Calls `this.adapter.executeRequest({ path: '/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection', method: 'GET', params: { $format: 'json' } })`.
  - When `!response.success` and `response.httpStatus === 403`, it falls back to `getS21BaselineCatalog()` (`provenance: 'S21_BASELINE_SNAPSHOT'`) and emits a **locally hardcoded `notice`** (lines 391–392) claiming `/IWFND/MAINT_SERVICE` registration is required.

---

## 2. Verification That Both Endpoints Share the Exact Same Execution Path

| Attribute | `/sap/bc/adt/discovery` | `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection` |
|---|---|---|
| **Adapter** | `SapTransactionDiscoveryAdapter` -> `btpDestinationAdapter` | `SapGatewayMetadataAdapter` -> `btpDestinationAdapter` |
| **Method** | `btpDestinationAdapter.executeRequest()` | `btpDestinationAdapter.executeRequest()` |
| **Destination** | `S21_FIORI` | `S21_FIORI` |
| **Username** | `int_samarth` | `int_samarth` |
| **Authentication** | `BasicAuthentication` | `BasicAuthentication` |
| **ProxyType / URL** | `OnPremise` / `http://s21fiori:8000` | `OnPremise` / `http://s21fiori:8000` |
| **SAP Client Header** | `sap-client: 200` | `sap-client: 200` |
| **HTTP SDK** | `@sap-cloud-sdk/http-client` (`executeHttpRequest`) | `@sap-cloud-sdk/http-client` (`executeHttpRequest`) |

---

## 3. Capability Matrix: Distinguishing HTTP 403 Sources

| HTTP 403 Source | Before Local Patch | After Local Patch (`extractSafeHttpErrorEvidence`) |
|---|---|---|
| **Cloud Connector Access Control** | **Cannot distinguish** (hardcoded `AUTHORIZATION_FAILED`) | **Distinguishable** via `originHint: 'SAP_CLOUD_CONNECTOR'` when body/headers contain `Access denied to resource`, `SAP Cloud Connector`, or `x-scc-route`. |
| **SAP ICM / UCON Rejection** | **Cannot distinguish** | **Distinguishable** via `originHint: 'SAP_ICM_OR_UCON'` when `server` header or HTML body identifies SAP ICM / UCON without ABAP/OData payload. |
| **ICF Service Restriction (`SICF`)** | **Cannot distinguish** | **Partially distinguishable** via `originHint: 'SAP_APPLICATION_OR_ICF'`, `sap-system`/`sap-client` headers, and `bodySnippet`. |
| **SAP Application Auth (`PFCG` / `S_ADT_RES` / `S_SERVICE`)** | **Cannot distinguish** | **Distinguishable** via `sapErrorCode` / `sapErrorMessage` + `originHint: 'SAP_APPLICATION_OR_ICF'`. |
| **Endpoint Registration (`/IWFND/MAINT_SERVICE`)** | **Masked by hardcoded notice** | **Distinguishable** via parsed OData error code (e.g. `/IWFND/CM_COS/...`) in `sapErrorCode` and `upstreamDiagnostics`. |

---

## 4. Local Unit Test Verification (No Deployment Performed)

Executed `node --test backend/test/btpDestinationAdapter.test.js backend/test/sprint6Discovery.test.js`:
- `sprint6Discovery.test.js`: **11/11 passed** (7 unit + 4 HTTP integration).
- `btpDestinationAdapter.test.js`: **12/13 passed**, including new test `preserves safe HTTP 403 origin diagnostics without exposing credentials or cookies`. (1 pre-existing failure on subtest 4 due to local `.env` setting `SAP_DESTINATION_NAME=S21_FIORI` instead of `'S21'`.)
