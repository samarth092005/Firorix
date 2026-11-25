# FIORIFY — PHASE 12 S21 LIVE CONNECTIVITY & BTP INTEGRATION READINESS

**Document Identifier:** `FIORIFY-PHASE-12-S21-CONNECTIVITY-READINESS`  
**Application:** Fiorify — SAP Fiori Modernization Platform  
**Target Landscape:** SAP S/4HANA 2023 Private Edition — System `S21`, Client `200`  
**Execution Date:** November 17, 2026  
**Auditor:** Principal SAP BTP Architect & Integration Specialist  
**Classification:** Internal Deployment Engineering Report  

---

## 1. EXECUTIVE SUMMARY & TARGET SYSTEM IDENTITY

Fiorify delivers an automated **DISCOVER → EVALUATE → MODERNIZE → DELIVER** modernization pipeline for SAP GUI transactions migrating to SAP Fiori. In production, Fiorify interfaces with SAP systems exclusively in **read-only mode** to inspect Gateway catalogs, OData service definitions, and ABAP Development Tools (ADT) metadata.

### System Identity

| Property | Value | Description / Note |
| :--- | :--- | :--- |
| **System ID** | `S21` | SAP S/4HANA 2023 Private Edition |
| **Client** | `200` | Golden development & modernization target client |
| **Internal Host** | `http://192.168.x.x:8000` | *Redacted internal private network address* |
| **Virtual Host (Cloud Connector)** | `http://S21:8000` | Virtual endpoint exposed to BTP Cloud Foundry |
| **BTP Destination Name** | `S21` | Declared in BTP Destination Service |
| **Technical User** | `[REDACTED_TECH_USER]` | Read-only communication user |
| **Operational Protocol** | HTTP / OData v2 / ADT REST | Read-only inspection (`GET`, `HEAD`, `OPTIONS`) |

> [!CAUTION]
> **Strict Read-Only Enforcement**: Under no circumstances will Fiorify issue mutating HTTP operations (`POST`, `PUT`, `PATCH`, `DELETE`), request CTS Transport Requests, or trigger locks/activations in SAP system `S21`. All code generation and modernization specifications remain 100% offline local artifacts.

---

## 2. DUAL CONNECTIVITY TOPOLOGY & OPERATIONAL PATHS

Fiorify implements a dual-path decoupled connectivity architecture in `backend/src/infrastructure/connectivity/sapConnectivityProvider.js` and `backend/src/adapters/btpDestinationAdapter.js`.

```
========================================================================================================
PATH A: LOCAL WORKSTATION / VPN DEVELOPMENT (VERIFIED OPERATIONAL: LIVE_SAP_LOCAL_VPN)
========================================================================================================
[ Developer Workstation / CI Runner ]
      │
      ├── (SAP_URL_OVERRIDE=http://192.168.x.x:8000)
      │
      ▼
[ Corporate VPN Tunnel ] ──────> [ Internal Network 192.168.x.x:8000 ] ──────> [ SAP S/4HANA S21:200 ]
                                                                                   (ICM Gateway & ADT)


========================================================================================================
PATH B: CLOUD FOUNDRY PRODUCTION INTEGRATION (PENDING_EXTERNAL_VERIFICATION)
========================================================================================================
[ Fiorify Node.js Container (BTP CF) ]
      │
      ├── 1. Resolves destination "S21" via Fiorify-destination
      ├── 2. Obtains proxy auth token via Fiorify-connectivity
      │
      ▼
[ BTP Connectivity Proxy ]
      │
      ├── 3. Secure TLS reverse tunnel via Cloud Connector Location ID
      │
      ▼
[ SAP Cloud Connector (Customer DMZ) ]
      │
      ├── 4. Access control validation (Virtual S21:8000 -> Internal 192.168.x.x:8000)
      ├── 5. URL Path allowlist verification (/sap/opu/odata/*, /sap/bc/adt/*)
      │
      ▼
[ SAP S/4HANA S21 (Client 200) ]
      ├── ICM HTTP Service (Port 8000)
      ├── /sap/public/ping
      ├── /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection
      └── /sap/bc/adt/discovery
```

### Critical Separation of Evidence

- **Path A (Local VPN)**: **`LIVE_SAP_LOCAL_VPN — 100% OPERATIONAL`**. Direct HTTP connectivity to `http://192.168.x.x:8000` has been independently executed and verified in this audit cycle.
- **Path B (Cloud Foundry)**: **`PENDING_EXTERNAL_VERIFICATION`**. Live container traversal requires active BTP Destination and Cloud Connector configuration in the customer BTP tenant.

---

## 3. LIVE LOCAL VPN VERIFICATION EVIDENCE

Direct live execution against `http://192.168.x.x:8000` (Client 200) was conducted using `SapHttpClient` and recorded in `docs/milestones/S21_LIVE_CONNECTIVITY_VERIFICATION.md`.

### Verification Metrics

| Probe Target | Protocol / Path | Result Status | Response Evidence |
| :--- | :--- | :--- | :--- |
| **System Ping** | `GET /sap/public/ping` | **HTTP 200 OK** | ICM active, zero packet loss |
| **Gateway Catalog** | `GET /sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection` | **HTTP 200 OK** | **1,320** live Gateway services parsed |
| **ADT Discovery** | `GET /sap/bc/adt/discovery` | **HTTP 200 OK** | **301.8 KB** XML discovery document parsed |
| **EntitySet Schema** | `GET .../ZFAR_CUSTOMER_INVOICE_SRV/$metadata` | **HTTP 200 OK** | **17** EntitySets successfully extracted |

---

## 4. SAP CLOUD CONNECTOR CONFIGURATION SPECIFICATION

To enable Path B from SAP BTP Cloud Foundry to the on-premise/private S21 system, the SAP Cloud Connector administrator must configure the following mapping:

### 4.1 Subaccount Linkage
- **Cloud Foundry Region**: `eu30` (`https://api.cf.eu30.hana.ondemand.com`)
- **Subaccount ID**: `[REDACTED_ORG]`
- **Location ID**: *(Leave empty for default location, or set to e.g. `S21-DEV` and match in BTP Destination)*

### 4.2 System Mapping

| Mapping Field | Value | Justification |
| :--- | :--- | :--- |
| **Back-end Type** | `ABAP System` | Target system is SAP S/4HANA 2023 |
| **Protocol** | `HTTP` | Internal ICM listener protocol |
| **Internal Host** | `192.168.x.x` | Actual internal IP of S21 application server |
| **Internal Port** | `8000` | Internal HTTP port for Client 200 |
| **Virtual Host** | `S21` | Hostname exposed to BTP applications |
| **Virtual Port** | `8000` | Port exposed to BTP applications |
| **Principal Type** | `None` | Authentication handled via BasicAuth in Destination |

### 4.3 Accessible Resource Allowlist

Under the mapped system `S21:8000`, the following URL paths must be added with **`Path and all sub-paths`**:

```
1. URL Path: /sap/public/ping
   Access Mode: Path and all sub-paths
   Description: Basic ICM health check and ping probe

2. URL Path: /sap/opu/odata/IWFND/CATALOGSERVICE;v=2
   Access Mode: Path and all sub-paths
   Description: Standard SAP Gateway service catalog inspection

3. URL Path: /sap/opu/odata/
   Access Mode: Path and all sub-paths
   Description: Metadata ($metadata) inspection for candidate Fiori services

4. URL Path: /sap/bc/adt/discovery
   Access Mode: Path and all sub-paths
   Description: ADT core capability discovery

5. URL Path: /sap/bc/adt/
   Access Mode: Path and all sub-paths
   Description: Read-only ADT repository exploration and source inspection
```

> [!WARNING]
> Do NOT expose transaction execution nodes (`/sap/bc/gui/*`) or mutating RFC endpoints. Restrict access strictly to read-only OData and ADT pathways.

---

## 5. BTP DESTINATION SERVICE CONFIGURATION SPECIFICATION

The BTP Administrator must declare the `S21` destination in the SAP BTP Subaccount (`[REDACTED_ORG]`) or Space (`dev`) Destination Service.

### Destination Definition

```properties
Name=S21
Type=HTTP
URL=http\://S21\:8000
ProxyType=OnPremise
Authentication=BasicAuthentication
User=[REDACTED_TECH_USER]
Password=********

# Additional Mandatory Properties
sap-client=200
WebIDEEnabled=true
WebIDESystem=S21
WebIDEUsage=odata_gen
HTML5.DynamicDestination=true
TrustAll=true
```

### Destination Verification Command
Once provisioned and bound, connectivity can be validated via the BTP Cockpit **Check Connection** button, returning:
`Connection to "S21" established. Status code: 200 OK`.

---

## 6. READ-ONLY SECURITY GUARDRAILS & AUDITING

Fiorify strictly enforces non-destructive SAP interaction across all code layers:

1. **HTTP Verb Filtering**: `SapHttpClient.js` enforces `method: 'GET'` or `method: 'HEAD'`. Attempted mutating calls fail with `FORBIDDEN_SAP_MUTATION`.
2. **Credential Sanitization**: `btpDestinationAdapter.js` strips authorization headers, passwords, cookies, and tokens from all error messages and diagnostics before emitting logs.
3. **Local Generation Sandbox**: Generated RAP artifacts (`CDS View Entities`, `BDEF`, `ABAP Behavior Classes`) are written strictly to the local workspace and never transmitted to `/sap/bc/adt/*`.
4. **Zero Transport Creation**: Fiorify never requests CTS Transport Requests (`TRKORR`) or task assignments in S21.

---

## 7. ADMINISTRATOR STEP-BY-STEP CHECKLIST

Prior to staging deployment, the SAP Basis / BTP Administrator must execute:

- [ ] **Step 1: Cloud Connector Setup**
  - Verify Cloud Connector is connected to Subaccount `[REDACTED_ORG]`.
  - Add System Mapping for `192.168.x.x:8000` -> Virtual `S21:8000`.
  - Add the 5 accessible URL paths listed in Section 4.3.
- [ ] **Step 2: Technical User Authorization**
  - Verify user `[REDACTED_TECH_USER]` in S21 Client 200 has authorization for:
    - S_SERVICE (Hash authorizations for `/IWFND/CATALOGSERVICE;v=2`)
    - S_ADT_RES (ADT read-only discovery and metadata)
    - S_RFC (Read authorization for RFC-enabled inspection functions)
- [ ] **Step 3: BTP Destination Creation**
  - Create Destination `S21` with properties detailed in Section 5.
  - Execute "Check Connection" in BTP Cockpit to confirm 200 OK.
- [ ] **Step 4: Cloud Foundry Service Bindings**
  - Ensure `Fiorify-destination` and `Fiorify-connectivity` service instances are created in space `dev` and declared in `manifest.yml`.
