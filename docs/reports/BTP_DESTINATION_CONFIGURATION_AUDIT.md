# BTP Destination Configuration Audit

**Audit Date:** 2026-11-26  
**Deployed App:** `fiorify-staging`  
**Destination Name:** `S21_FIORI`

---

## 1. Configuration Files Inspected

| File | Key Settings |
|---|---|
| `manifest.yml` | App `Fiorify-platform`, `FIORIFY_PERSISTENCE: hana`, `SAP_DESTINATION_NAME: S21_FIORI`, `SAP_CLIENT: "200"`, services: `Fiorify-destination`, `Fiorify-connectivity`, `Fiorify-xsuaa`, `Fiorify-hana`. |
| `manifest.fiorify-staging.yml` | App `fiorify-staging`, `FIORIFY_PERSISTENCE: postgres`, `FIORIFY_ENFORCE_AUTH: "true"`, `FIORIFY_ALLOW_DEMO_AUTH: "true"`, `SAP_DESTINATION_NAME: S21_FIORI`, `SAP_CLIENT: "200"`, `SAP_TIMEOUT_MS: "15000"`, `MCP_ENABLED: "true"`, services: `Fiorify-destination`, `Fiorify-connectivity`, `Fiorify-xsuaa`, `Fiorify-postgres-ups`. |
| `xs-security.json` | `xsappname: "Fiorify"`, `tenant-mode: "dedicated"`, scopes: `FiorifyAdmin`, `FiorifyArchitect`, `FiorifyViewer`, attribute `tenantId`. |
| `mta.yaml` / `xs-app.json` | **Not present** in the repository. |

---

## 2. Cloud Foundry Service Bindings (`cf env fiorify-staging`)

- **Destination Service (`Fiorify-destination`, plan `lite`):** Bound in `VCAP_SERVICES` (`destination`).
- **Connectivity Service (`Fiorify-connectivity`, plan `lite`):** Bound in `VCAP_SERVICES` (`connectivity`).
- **XSUAA Service (`Fiorify-xsuaa`, plan `application`):** Bound in `VCAP_SERVICES` (`xsuaa`).
- **PostgreSQL (`Fiorify-postgres-ups`, `user-provided`):** Bound in `VCAP_SERVICES` (`user-provided`).
- **HANA (`Fiorify-hana`, `hdi-shared`):** Status `create failed`, **not bound** to `fiorify-staging`.

---

## 3. Destination `S21_FIORI` Runtime Resolution Evidence

No destination export JSON or BTP Cockpit API credential is stored in the repository; however, live execution of `fiorify-staging` with `@sap-cloud-sdk/connectivity` and `@sap-cloud-sdk/http-client` produced the following verified runtime facts:

| Attribute | Verified Value / Status | Evidence Source |
|---|---|---|
| **Destination Name** | `S21_FIORI` | `cf env fiorify-staging`, `GET /api/v1/health` |
| **SAP Client** | `200` | `cf env fiorify-staging`, `GET /api/v1/health` |
| **Proxy Type** | `OnPremise` | `sap-cloud-sdk-logger`: *"You are connecting to an On-Premise system using basic authentication."* |
| **Authentication Type** | `BasicAuthentication` | `sap-cloud-sdk-logger`: *"using basic authentication"* |
| **Connectivity Service Association** | Bound (`Fiorify-connectivity`) and actively used by `@sap-cloud-sdk/http-client` | `cf env fiorify-staging`, CF logs |
| **Target URL / Virtual Host** | **NOT DIRECTLY VERIFIED** (not printed in logs or `/health` due to sanitization) | Sanitized by `sanitizeDestination()` in `btpDestinationAdapter.js` |
| **Cloud Connector Location ID** | **NOT VERIFIED** (requires BTP Destination Cockpit / API inspection) | Not exposed in app logs |

---

## 4. Security & Secret Handling

- `backend/src/adapters/btpDestinationAdapter.js` implements `sanitizeHeaders()`, `sanitizeErrorMessage()`, and `sanitizeDestination()` to strip `Authorization`, `Proxy-Authorization`, `x-csrf-token`, `cookie`, and password/token fields from logs and API responses.
- No passwords, client secrets, or OAuth tokens were exposed during this audit.
