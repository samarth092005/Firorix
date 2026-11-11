# FIORIX — BTP ENVIRONMENT DISCOVERY REPORT (READ-ONLY)
**Document ID:** REP-BTP-DISCOVERY-2026-01  
**Project:** FioriX — SAP Modernization Platform  
**Target Landscape:** SAP BTP (Europe / Frankfurt - eu30) & SAP S/4HANA 2023 (S21 Client 200)  
**Date:** November 11, 2026  
**Status:** COMPLETE READ-ONLY AUDIT — ZERO CREDENTIALS EXPOSED — ZERO RESOURCES MUTATED  
**Auditor:** Principal Enterprise Solution Architect & Cloud Infrastructure Lead  

---

## 1. Executive Summary & Status Scorecard

A non-intrusive, read-only discovery of the SAP Business Technology Platform (BTP) environment was conducted using the local environment configuration and authorized command-line interfaces. 

No credentials (passwords, tokens, client secrets, or private keys) were logged, copied, or exposed. No BTP resources were created, modified, or deleted.

```
+---------------------------------------------------------------------------------------------------------+
|                                FIORIX SAP BTP DISCOVERY SCORECARD                                       |
+------------------------------------+----------------+---------------------------------------------------+
| Discovery Domain                   | Status         | Summary Finding                                   |
+------------------------------------+----------------+---------------------------------------------------+
| 1. Local Credential Inventory      | PASS           | Complete Destination Service & BTP User variables |
| 2. CLI Toolchain Availability      | PASS (CF)      | Cloud Foundry CLI v8 active; BTP CLI not on PATH  |
| 3. Cloud Foundry Authentication    | PASS           | Authenticated as varad.k@abhiyantatech.com        |
| 4. BTP Subaccount & Org Context    | PASS           | Org: Abhiyanta_India Solutions... (Sub: d0a7p7v8) |
| 5. Space & Service Inventory       | PASS           | Space 'dev' active; 18 apps, 42+ service instances|
| 6. BTP Destination Service Access  | PASS           | OAuth token acquired; 33 destinations discovered  |
| 7. Destination S21 Definition      | PASS           | Configured as OnPremise (http://kbl_fiori:8000)   |
| 8. Cloud Connector Connectivity    | NOT VERIFIED   | No connectivity service instance in space         |
| 9. S21 HTTP Endpoint Response      | FAIL / BLOCKED | Local IP override timed out; virtual host unrouted|
| 10. SAP Authentication / Metadata  | NOT VERIFIED   | Blocked by lack of Cloud Connector tunnel         |
| 11. PostgreSQL Service Offering    | NOT AVAILABLE  | Not present in this CF marketplace (HANA only)    |
+------------------------------------+----------------+---------------------------------------------------+
```

---

## 2. Phase 1 — Credential Inventory

Inspection of `backend/.env` was performed to identify variable names and evaluate completeness for specific authentication flows without exposing secret values.

| Variable Name | Classification | Populated | Completeness for Target Flow |
| :--- | :--- | :---: | :--- |
| `BTP_USER` | BTP User Authentication | **YES** | Complete for interactive/non-interactive BTP & CF user auth. |
| `BTP_PASSWORD` | BTP User Authentication | **YES** | Complete for user authentication flow. |
| `BTP_DESTINATION_CLIENT_ID` | Destination Service Credentials | **YES** | Complete for OAuth2 Client Credentials grant flow. |
| `BTP_DESTINATION_CLIENT_SECRET` | Destination Service Credentials | **YES** | Complete for OAuth2 Client Credentials grant flow. |
| `BTP_DESTINATION_URL` | Destination Service Credentials | **YES** | Complete (`https://destination-configuration.cfapps.eu30.hana.ondemand.com`). |
| `BTP_DESTINATION_TOKEN_URL` | Destination Service Credentials | **YES** | Complete (`https://sap-btp-ais-d0a7p7v8.authentication.eu30.hana.ondemand.com/oauth/token`). |
| `LOCAL_CONNECTIVITY_PROXY` | Connectivity Proxy (Local) | **YES** | Populated local proxy URL (`http://localhost:...`). |
| `SAP_DESTINATION_NAME` | SAP S/4HANA Context | **YES** | Set to `S21`. |
| `SAP_CLIENT` | SAP S/4HANA Context | **YES** | Set to `200`. |
| `SAP_URL_OVERRIDE` | SAP S/4HANA Direct Override | **YES** | Direct private IP override (`http://192.168.1.55:8000`). |
| `SAP_USER` | SAP S/4HANA Basic Auth | **YES** | SAP system technical user. |
| `SAP_PASSWORD` | SAP S/4HANA Basic Auth | **YES** | SAP system password. |
| `FIORIX_ADMIN_SECRET` | Internal Security | **YES** | Local API protection key. |
| `MCP_*` | MCP Subsystem Configuration | **YES** | Server package, timeout, and reconnect policies. |

### Observations on Missing Credentials
- **Connectivity Service Binding Missing:** No `BTP_CONNECTIVITY_CLIENT_ID` or `BTP_CONNECTIVITY_CLIENT_SECRET` exists in `.env`.
- **XSUAA Service Binding Missing:** No application-specific XSUAA service key exists in `.env` for user token exchange.

---

## 3. Phase 2 — CLI Toolchain Availability

| Tool | Target Version | Detected Status | Location | Login State |
| :--- | :--- | :---: | :--- | :---: |
| **BTP CLI (`btp`)** | >= 2.0.0 | **MISSING** | Not found on system PATH | `BLOCKED` (CLI not installed) |
| **Cloud Foundry CLI (`cf`)**| >= 8.0.0 | **PASS** | `cf.exe version 8.7.11` | `PASS` (Authenticated) |

### Cloud Foundry Authentication Verification
- Initial check of `cf target` reported expired session token.
- Secure non-interactive authentication was executed using `cf auth` powered by `CF_USERNAME` and `CF_PASSWORD` environment variables without exposing password in shell arguments or command history.
- **Identity preserved:** Logged in strictly as `varad.k@abhiyantatech.com` (no identity switching).

---

## 4. Phase 3 & 4 — BTP Global Account & Cloud Foundry Inspection

### 4.1 BTP & Cloud Foundry Target Context
- **Cloud Foundry API Endpoint:** `https://api.cf.eu30.hana.ondemand.com` (API version `3.233.0`)
- **BTP Region:** Europe (Frankfurt) — `eu30`
- **Subaccount Subdomain / Tenant:** `sap-btp-ais-d0a7p7v8`
- **Cloud Foundry Organization:** `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8` (GUID: `7db1e60b-e8b4-4e9c-86ca-e6eb3a9c0e81`)
- **Space:** `dev`
- **Organization Quota:** `PPU_QUOTA` (Pay-Per-Use / CPEA)
  - Total Memory Limit: `204,800 MB` (200 GB)
  - Max Service Instances: `20,000`
  - Paid Services Allowed: `True`

### 4.2 Role & Permission Audit for `varad.k@abhiyantatech.com`
- **Org Level:** Org Member (Not Org Manager).
- **Space Level (`dev`):** **Space Developer**.
  - *Implication:* User has full permission within space `dev` to create service instances, create service keys, bind services to applications, and deploy applications. User cannot create new orgs, assign subaccount quotas, or manage BTP subaccount entitlements.

### 4.3 Existing Cloud Foundry Applications (18 Detected)

| Application Name | State | Instances | Routes |
| :--- | :---: | :---: | :--- |
| `aamya` | started | 1/1 | `aamya-resplendent-cheetah-am.cfapps.eu30.hana.ondemand.com` |
| `BTPLense-srv` | started | 1/1 | `...-d518fb711.cfapps.eu30.hana.ondemand.com` |
| `BTPLense-approuter` | stopped | 0/1 | `...-d73105a5e.cfapps.eu30.hana.ondemand.com` |
| `BTPMonitorTool-srv` | stopped | 0/1 | `...-d5e9a67ba.cfapps.eu30.hana.ondemand.com` |
| `datasphere-docs-scanner` | started | 1/1 | `datasphere-docs-scanner-comedic-fossa-sc...` |
| `hanamorph-srv` | started | 1/1 | `...-d668dc90a.cfapps.eu30.hana.ondemand.com` |
| `insight-flow` | started | 1/1 | `insight-flow-turbulent-possum-yt...` |
| `podzone` / `podzone-srv` | started | 1/1 | `podzone-...` |
| `SACC_Travel_Application-srv` | started | 0/1 | `...-d0a547df6.cfapps.eu30.hana.ondemand.com` |
| `SACC_Travel_Settlement_Application-srv` | started | 1/1 | `...-d603134ba.cfapps.eu30.hana.ondemand.com` |
| `sonalika-probe` | started | 1/1 | `sonalika-probe.cfapps.eu30.hana.ondemand.com` |
| `uc14-gl-anomaly-agent` | started | 1/1 | `uc14-gl-anomaly-agent-...` |
| `vendor-reconcile` | started | 1/1 | `vendor-reconcile-...` |
| `wzsess-sink` | started | 2/2 | `...-d5bfb0ef1.cfapps.eu30.hana.ondemand.com` |

---

## 5. Phase 5 — Service Inventory & Connectivity Infrastructure

### 5.1 Service Instance Inventory in Space `dev`

| Service Offering | Instance Name | Plan | Bound Applications | Status |
| :--- | :--- | :--- | :--- | :---: |
| **destination** | `BTPLense-destination-service` | `lite` | Unbound | Operational |
| **destination** | `BTPMonitorTool-destination-service`| `lite` | Unbound | Operational |
| **destination** | `SACC_Travel_Application-dest` | `lite` | `SACC_Travel_Application-srv` | Operational (Keys present) |
| **destination** | `SACC_Travel_Approval-destination-service` | `lite` | Unbound | Operational |
| **destination** | `SACC_Travel_Settlement_Dest` | `lite` | `SACC_Travel_Settlement_Application-srv` | Operational (Keys present) |
| **destination** | `wzsess-destination` | `lite` | Unbound | Operational |
| **xsuaa** | `BTPLense-auth` | `application`| `BTPLense-srv`, `BTPLense-approuter` | Update failed |
| **xsuaa** | `SACC_Travel_Application_auth` | `application`| `SACC_Travel_Application-srv` | Operational |
| **xsuaa** | `SACC_Travel_Settlement_auth` | `application`| `SACC_Travel_Settlement_Application-srv` | Operational |
| **xsuaa** | `vendor_reconcile-auth` | `application`| `vendor-reconcile` | Operational |
| **xsuaa** | `wzsess-auth` | `application`| `wzsess-sink` | Operational |
| **hana** | `BTPMonitorTool-db` | `hdi-shared` | `BTPMonitorTool-srv` | Operational |
| **hana** | `SACC_Travel_Application_hdi` | `hdi-shared` | `SACC_Travel_Application-srv` | Operational |
| **hana** | `SACC_Travel_Settlement_hdi` | `hdi-shared` | `SACC_Travel_Settlement_Application-srv` | Operational |
| **connectivity**| *None* | — | — | **MISSING IN SPACE** |
| **postgresql** | *None* | — | — | **NOT IN MARKETPLACE**|

### 5.2 Marketplace Evaluation for Missing Services
- **`connectivity` Service:** Available in CF marketplace under broker `sm-connectivity-582e1036-a618-4925-b969-c817bb6b8005`. Supported plans: `lite` (standard Cloud Connector pairing) and `connectivity_proxy`.
- **`postgresql` Service:** **NOT available** in this marketplace. The only relational database offering is SAP HANA (`hdi-shared`, `sbss`, `schema`, `securestore`).

---

## 6. Phase 6 — S21 Destination & Connectivity Verification

### 6.1 Subaccount Destination Inventory (33 Total)
Direct API access via BTP Destination Service REST endpoint (`/destination-configuration/v1/subaccountDestinations`) confirmed 33 destinations. Key on-premise SAP destinations identified:

| Destination Name | Type | URL / Target | ProxyType | Authentication | Location ID |
| :--- | :---: | :--- | :---: | :---: | :---: |
| **`S21`** | **HTTP** | `http://kbl_fiori:8000` | **OnPremise** | **BasicAuthentication** | **None** |
| `run-time-destination-s21` | HTTP | `http://aissapsrv.abhiyantatech.com:44300` | OnPremise | PrincipalPropagation | None |
| `design-time-destination-s21` | HTTP | `http://aissapsrv.abhiyantatech.com:44300` | OnPremise | PrincipalPropagation | None |
| `S21_Principle` | HTTP | `http://aissapsrv.abhiyantatech.com:44300` | OnPremise | PrincipalPropagation | None |
| `AIS` | HTTP | `http://58.84.63.125:44300` | OnPremise | BasicAuthentication | None |
| `SAP_Backend_Joule` | HTTP | `http://ais-21:8000` | OnPremise | BasicAuthentication | None |

### 6.2 Destination `S21` Detailed Configuration
- **Name:** `S21`
- **Target URL:** `http://kbl_fiori:8000` (Virtual host configured in SAP Cloud Connector)
- **Proxy Type:** `OnPremise`
- **Authentication:** `BasicAuthentication` (Configured with technical user `AIS***` and password)
- **Cloud Connector Location ID:** None (routes to default Cloud Connector instance)
- **Additional Properties:** `WebIDEEnabled: "true"`, `WebIDEUsage: "odata_abap"`, `HTML5.DynamicDestination: "true"`, `HTML5.Timeout: "60000"`

---

### 6.3 Six-Level Connectivity Verification Breakdown

| Verification Level | Target Check | Result | Evidence & Technical Rationale |
| :---: | :--- | :---: | :--- |
| **Level 1** | **Destination Exists** | **PASS** | `GET /destination-configuration/v1/subaccountDestinations/S21` returned `HTTP 200` with complete properties. |
| **Level 2** | **Destination Credentials Work** | **PASS** | BTP OAuth2 token endpoint returned `HTTP 200` with access token (`expires_in: 43199`) using `BTP_DESTINATION_CLIENT_ID/SECRET`. |
| **Level 3** | **Cloud Connector Connected** | **NOT VERIFIED** | No `connectivity` service instance exists in the `dev` space, and no Cloud Connector management API is bound to verify the live tunnel state. *Policy: Do not claim connected without evidence.* |
| **Level 4** | **S21 HTTP Endpoint Responds** | **FAIL / BLOCKED** | Local IP override `http://192.168.1.55:8000` timed out after `15,000ms`. Virtual host `http://kbl_fiori:8000` cannot be resolved locally without an active Connectivity Proxy tunnel. |
| **Level 5** | **SAP Authentication Succeeds** | **NOT VERIFIED** | Blocked by Level 4. Cannot verify SAP Gateway user authentication (`HTTP 200` vs `HTTP 401`) until the TCP/HTTP connection is established. |
| **Level 6** | **Required SAP Metadata Accessible** | **NOT VERIFIED** | Blocked by Level 4. `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2` and `/sap/opu/odata/sap/Z_FIORIX_DISCOVERY_SRV` unreachable. |

---

## 7. Exact Next Actions Required from Administrator

To achieve full live end-to-end S3 connectivity from local and BTP runtimes to S21 Client 200:

1. **Verify Cloud Connector Tunnel Status:**
   - Log into the SAP Cloud Connector administration UI (connected to subaccount `sap-btp-ais-d0a7p7v8`).
   - Confirm the tunnel status is **Connected** (Green).
   - Verify that virtual host `kbl_fiori:8000` is mapped to internal host and port of S21 (e.g. `192.168.1.55:8000` or internal SAP application server).
   - Confirm accessible resources include `/sap/opu/odata` (Path and all sub-paths).

2. **Create Connectivity Service Instance in Space `dev`:**
   - As Space Developer in `dev`, execute:
     ```bash
     cf create-service connectivity lite fiorix-connectivity-service
     cf create-service-key fiorix-connectivity-service fiorix-connectivity-key
     ```
   - Extract `clientid`, `clientsecret`, `url`, and `token_service_url` to enable Cloud SDK local tunnel simulation.

3. **Establish Local Connectivity Tunnel (for Local Development):**
   - If developing outside Cloud Foundry on the local Windows machine, either:
     - **Option A:** Connect developer machine to corporate VPN where `192.168.1.55:8000` is directly routable.
     - **Option B:** Run SAP Connectivity Proxy locally paired with the BTP Connectivity Service instance.

4. **Install SAP BTP CLI (`btp`):**
   - Download the official `btp` CLI tool from [SAP Development Tools](https://tools.hana.ondemand.com/#cloud) and add to system PATH.
