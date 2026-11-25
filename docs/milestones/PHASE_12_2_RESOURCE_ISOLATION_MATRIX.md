# FIORIFY — PHASE 12.2 RESOURCE ISOLATION MATRIX & SHARED SPACE PROTECTION

**Document Identifier:** `FIORIFY-PHASE-12-2-RESOURCE-ISOLATION-MATRIX`  
**Application:** Fiorify — SAP Fiori Modernization Platform  
**Target Environment:** SAP BTP Cloud Foundry (`eu30`) | Org: `[REDACTED_ORG]` | Space: `dev`  
**Execution Date:** November 17, 2026  
**Auditor:** Principal SAP BTP Architect & Release Engineering Auditor  
**Classification:** Pre-Deployment Isolation & Multi-Tenant Safeguard Specification  

---

## 1. SHARED SPACE CONTEXT & ZERO-IMPACT DIRECTIVE

The target SAP BTP Cloud Foundry environment (`eu30`, space: `dev`) is a **shared multi-project ecosystem** hosting active enterprise workloads, development microservices, and databases.

> [!CAUTION]
> **MANDATORY ZERO-INTERFERENCE DIRECTIVE:**
> Under no circumstances shall the deployment or configuration of Fiorify:
> 1. Rename, restage, restart, or modify any existing application in the space.
> 2. Bind to or reuse any database or HDI container belonging to another project (`BTPMonitorTool`, `SACC_Travel_*`, etc.).
> 3. Reuse or alter any existing XSUAA instance, role-collection, or authorization scope.
> 4. Modify, overwrite, or unmap any existing network route.
> 5. Reuse or modify existing BTP Destinations or Cloud Connector virtual host configurations.

---

## 2. INVENTORY OF EXISTING APPLICATIONS & PROTECTION DIRECTIVES

A live audit of Cloud Foundry space `dev` conducted on November 17, 2026, confirmed **19 existing applications**. Every single application is explicitly classified as **PROTECTED / ZERO-MODIFICATION**.

| # | Application Name | Requested State | Processes / Instances | Bound Route(s) | Protection Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `aamya` | `started` | web: 1/1 | `aamya-resplendent-cheetah-am...` | **PROTECTED — READ ONLY** |
| 2 | `BTPLense-approuter` | `stopped` | web: 0/1 | `...-d73105a5e.cfapps.eu30...` | **PROTECTED — READ ONLY** |
| 3 | `BTPLense-srv` | `started` | web: 1/1 | `...-d518fb711.cfapps.eu30...` | **PROTECTED — READ ONLY** |
| 4 | `BTPMonitorTool-db-deployer` | `stopped` | web: 0/1 | *(none)* | **PROTECTED — READ ONLY** |
| 5 | `BTPMonitorTool-srv` | `stopped` | web: 0/1 | `...-d5e9a67ba.cfapps.eu30...` | **PROTECTED — READ ONLY** |
| 6 | `datasphere-docs-scanner` | `started` | web: 1/1 | `datasphere-docs-scanner-comedic-fossa-sc...` | **PROTECTED — READ ONLY** |
| 7 | `hanamorph-srv` | `started` | web: 1/1 | `...-d668dc90a.cfapps.eu30...` | **PROTECTED — READ ONLY** |
| 8 | `insight-flow` | `started` | web: 1/1 | `insight-flow-turbulent-possum-yt...` | **PROTECTED — READ ONLY** |
| 9 | `podzone` | `started` | web: 1/1 | `podzone-forgiving-cheetah-ja...` | **PROTECTED — READ ONLY** |
| 10 | `podzone-srv` | `started` | web: 1/1 | `podzone-srv-sleepy-baboon-kp...` | **PROTECTED — READ ONLY** |
| 11 | `s4-relay` | `started` | web: 1/1 | `s4-relay.cfapps.eu30.hana.ondemand.com` | **PROTECTED — READ ONLY** |
| 12 | `SACC_Travel_Application-db-deployer` | `stopped` | web: 0/1 | *(none)* | **PROTECTED — READ ONLY** |
| 13 | `SACC_Travel_Application-srv` | `stopped` | web: 0/1 | `...-d0a547df6.cfapps.eu30...` | **PROTECTED — READ ONLY** |
| 14 | `SACC_Travel_Settlement_Application-db-deployer` | `stopped` | web: 0/1 | *(none)* | **PROTECTED — READ ONLY** |
| 15 | `SACC_Travel_Settlement_Application-srv` | `started` | web: 1/1 | `...-d603134ba.cfapps.eu30...` | **PROTECTED — READ ONLY** |
| 16 | `sonalika-probe` | `started` | web: 1/1 | `sonalika-probe.cfapps.eu30.hana.ondemand.com` | **PROTECTED — READ ONLY** |
| 17 | `uc14-gl-anomaly-agent` | `started` | web: 1/1 | `uc14-gl-anomaly-agent-grumpy-fossa-eb...` | **PROTECTED — READ ONLY** |
| 18 | `vendor-reconcile` | `started` | web: 1/1 | `vendor-reconcile-resplendent-wolverine-ri...` | **PROTECTED — READ ONLY** |
| 19 | `wzsess-sink` | `started` | web: 2/2 | `...-d5bfb0ef1.cfapps.eu30...` | **PROTECTED — READ ONLY** |

### Verified Application Collision Status
- Application named `Fiorify` exists? **NO**.
- Application named `fiorify-staging` exists? **NO**.
- **Conclusion**: Deploying `fiorify-staging` creates a completely isolated new container process and poses **zero collision risk** to existing applications.

---

## 3. INVENTORY OF EXISTING ROUTES & COLLISION ANALYSIS

Live inspection of `cf routes` confirms **18 routes** registered under domain `cfapps.eu30.hana.ondemand.com`:

| Hostname | Domain | Bound Application | Collision Check |
| :--- | :--- | :--- | :--- |
| `abhiyanta-india-solutions-private-limited-sap-btp-ais-d0a547df6` | `cfapps.eu30.hana.ondemand.com` | `SACC_Travel_Application-srv` | No collision |
| `abhiyanta-india-solutions-private-limited-sap-btp-ais-d603134ba` | `cfapps.eu30.hana.ondemand.com` | `SACC_Travel_Settlement_Application-srv` | No collision |
| `abhiyanta-india-solutions-private-limited-sap-btp-ais-d5e9a67ba` | `cfapps.eu30.hana.ondemand.com` | `BTPMonitorTool-srv` | No collision |
| `abhiyanta-india-solutions-private-limited-sap-btp-ais-d518fb711` | `cfapps.eu30.hana.ondemand.com` | `BTPLense-srv` | No collision |
| `uc1-route-agent_V2` | `cfapps.eu30.hana.ondemand.com` | *(unbound)* | No collision |
| `sonalika-probe` | `cfapps.eu30.hana.ondemand.com` | `sonalika-probe` | No collision |
| `datasphere-docs-scanner-comedic-fossa-sc` | `cfapps.eu30.hana.ondemand.com` | `datasphere-docs-scanner` | No collision |
| `uc14-gl-anomaly-agent-grumpy-fossa-eb` | `cfapps.eu30.hana.ondemand.com` | `uc14-gl-anomaly-agent` | No collision |
| `podzone-srv-sleepy-baboon-kp` | `cfapps.eu30.hana.ondemand.com` | `podzone-srv` | No collision |
| `podzone-forgiving-cheetah-ja` | `cfapps.eu30.hana.ondemand.com` | `podzone` | No collision |
| `vendor-reconcile-resplendent-wolverine-ri` | `cfapps.eu30.hana.ondemand.com` | `vendor-reconcile` | No collision |
| `insight-flow-turbulent-possum-yt` | `cfapps.eu30.hana.ondemand.com` | `insight-flow` | No collision |
| `abhiyanta-india-solutions-private-limited-sap-btp-ais-d73105a5e` | `cfapps.eu30.hana.ondemand.com` | `BTPLense-approuter` | No collision |
| `abhiyanta-india-solutions-private-limited-sap-btp-ais-d668dc90a` | `cfapps.eu30.hana.ondemand.com` | `hanamorph-srv` | No collision |
| `abhiyanta-india-solutions-private-limited-sap-btp-ais-d5bfb0ef1` | `cfapps.eu30.hana.ondemand.com` | `wzsess-sink` | No collision |
| `aamya-resplendent-cheetah-am` | `cfapps.eu30.hana.ondemand.com` | `aamya` | No collision |
| `s4-relay` | `cfapps.eu30.hana.ondemand.com` | `s4-relay` | No collision |

### Proposed Staging Route Verification
- **Proposed Route**: `fiorify-staging.cfapps.eu30.hana.ondemand.com`
- **Collision Assessment**: **ZERO COLLISION**. Neither `fiorify-staging` nor any prefix/suffix variation exists in the space route table.

---

## 4. INVENTORY OF EXISTING SERVICE INSTANCES & DATABASE ISOLATION

Live inspection of `cf services` confirms **28 service instances** present in space `dev`:

### 4.1 Existing Database (HDI) Instances (Strictly Isolated & Protected)
| Service Instance | Offering / Plan | Bound Applications | Protection Status |
| :--- | :--- | :--- | :--- |
| `BTPMonitorTool-db` | `hana` / `hdi-shared` | `BTPMonitorTool-db-deployer`, `BTPMonitorTool-srv` | **STRICTLY PROTECTED — NEVER BIND OR MIGRATE** |
| `SACC_Travel_Application_hdi` | `hana` / `hdi-shared` | `SACC_Travel_Application-srv`, `SACC_Travel_Application-db-deployer` | **STRICTLY PROTECTED — NEVER BIND OR MIGRATE** |
| `SACC_Travel_Settlement_hdi` | `hana` / `hdi-shared` | `SACC_Travel_Settlement_Application-db-deployer`, `SACC_Travel_Settlement_Application-srv` | **STRICTLY PROTECTED — NEVER BIND OR MIGRATE** |

> [!IMPORTANT]
> **Database Isolation Guarantee**: Fiorify requires its own dedicated HDI container instance: **`Fiorify-hana`**. Fiorify shall **NEVER** bind to `BTPMonitorTool-db`, `SACC_Travel_Application_hdi`, `SACC_Travel_Settlement_hdi`, or any other container.

### 4.2 Existing Destination Service Instances (Strictly Isolated & Protected)
- `BTPLense-destination-service`
- `BTPMonitorTool-destination-service`
- `jouledashboard-destination-service`
- `s4-destination` (bound to `s4-relay`)
- `SAACTravelSettlementAprovalApp-destination-service`
- `SACC_Travel_Application-dest` (bound to `SACC_Travel_Application-srv`)
- `SACC_Travel_Approval-destination-service`
- `SACC_Travel_Settlement_Dest` (bound to `SACC_Travel_Settlement_Application-srv`)
- `wzsess-destination`

*Policy*: Fiorify requires dedicated instance **`Fiorify-destination`** and shall not reuse or modify any project-specific destination instance.

### 4.3 Existing Connectivity Service Instances (Strictly Isolated & Protected)
- `s4-connectivity` (bound to `s4-relay`)

*Policy*: Fiorify requires dedicated instance **`Fiorify-connectivity`**.

### 4.4 Existing XSUAA Service Instances (Strictly Isolated & Protected)
- `BTPLense-auth`
- `BTPMonitorTool-xsuaa-service`
- `jouledashboard-uaa`
- `SAACTravelSettlementAprovalApp-xsuaa-service`
- `SACC_Travel_Application_auth`
- `sacc_travel_approval_auth`
- `SACC_Travel_Settlement_auth`
- `vendor_reconcile-auth`
- `wzsess-auth`

*Policy*: Fiorify requires dedicated instance **`Fiorify-xsuaa`** configured exclusively with `xs-security.json`.

---

## 5. DEDICATED FIORIFY STAGING RESOURCE SPECIFICATION

All resources required for Fiorify staging are isolated and dedicated:

```
+----------------------------------------------------------------------------------------------------+
|                                    FIORIFY DEDICATED STAGING POD                                   |
|                                                                                                    |
|  [ Application: fiorify-staging ]                                                                  |
|    - Hostname: fiorify-staging.cfapps.eu30.hana.ondemand.com                                       |
|    - Manifest: manifest.fiorify-staging.yml                                                        |
|    - Process: Node 20 LTS (backend/src/server.js)                                                  |
|                                                                                                    |
|  [ Dedicated Service Instances ]                                                                   |
|    ├── Fiorify-xsuaa          (xsuaa / application - xs-security.json)                             |
|    ├── Fiorify-destination    (destination / lite)                                                |
|    ├── Fiorify-connectivity   (connectivity / lite)                                                |
|    └── Fiorify-hana           (hana / hdi-shared - Dedicated Container)                            |
+----------------------------------------------------------------------------------------------------+
```

---

## 6. PRE-DEPLOYMENT ISOLATION CHECKLIST

- [x] Confirmed zero application name collision (`fiorify-staging` is available).
- [x] Confirmed zero route collision (`fiorify-staging.cfapps.eu30.hana.ondemand.com` is available).
- [x] Confirmed zero dedicated service instances exist (`Fiorify-*` instances must be provisioned fresh).
- [x] Confirmed all 19 existing applications are identified and marked READ-ONLY / PROTECTED.
- [x] Confirmed all 3 existing HDI containers are identified and marked NEVER-TOUCH.
- [x] Prepared isolated staging manifest (`manifest.fiorify-staging.yml`) without modifying `manifest.yml`.
- [x] Reconciled service offerings and plans against live `cf marketplace`.
