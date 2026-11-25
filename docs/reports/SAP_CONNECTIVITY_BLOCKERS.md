# FIORIFY — SAP BTP CONNECTIVITY BLOCKERS & BASIS PREREQUISITES
## Formal Landscape Blockers Register (SAP-003, SAP-011)

**Product:** Fiorify — SAP Fiori Modernization & Assessment Platform  
**Target Landscape:** SAP BTP Cloud Foundry Production  
**Target Upstream System:** SAP S/4HANA 2023 System `S21` (Client `200`)  
**Document ID:** `SAP-BLOCKER-20261116`  
**Current Production Deployment Status:** **BLOCKED** (Pending Infrastructure Configurations)  
**Local Development Status:** **UNBLOCKED** (Operating via Local Office LAN Route)  

---

## 1. Executive Summary

Fiorify application logic, security controls, and read-only SAP integration adapters are 100% verified and functional. However, live operation from the **SAP BTP Cloud Foundry runtime** into SAP system **S21** requires external SAP Basis and BTP Administrator actions that cannot be performed from application code.

Until the two blocking conditions detailed below are resolved by the infrastructure team, any Cloud Foundry deployment of Fiorify will report `BLOCKED: PENDING_INFRASTRUCTURE_CONFIGURATION` for upstream SAP discovery.

---

## 2. Active Blocker Register

### Blocker 1: Cloud Connector Virtual Host Mapping (`kbl_fiori:8000`)
- **Severity:** HIGH / DEPLOYMENT BLOCKER
- **Affected Tickets:** `SAP-003`, `SAP-011`
- **Root Cause:**
  - When running locally on the office workstation network, Fiorify can reach SAP S21 directly at `http://192.168.1.55:8000` via LAN routing.
  - When deployed as a containerized application in SAP BTP Cloud Foundry, the container has no route to the internal office subnet `192.168.1.0/24`. Outbound traffic MUST traverse the **SAP BTP Connectivity Service** and an **on-premise SAP Cloud Connector (SCC)**.
  - The destination configuration in BTP specifies virtual host `kbl_fiori:8000`.
  - Unless the Cloud Connector instance paired with the BTP subaccount explicitly maps `kbl_fiori:8000` to internal address `192.168.1.55:8000`, the Connectivity proxy will return HTTP 502 with `CLOUD_CONNECTOR_UNAVAILABLE` or `VIRTUAL_HOST_NOT_MAPPED`.
- **Exact Basis Remediation Steps Required:**
  1. Open SAP Cloud Connector Administration Console.
  2. Navigate to **Cloud To On-Premise** for the target BTP Subaccount.
  3. Add System Mapping:
     - **Back-end Type:** `ABAP System`
     - **Protocol:** `HTTP`
     - **Internal Host:** `192.168.1.55` | **Internal Port:** `8000`
     - **Virtual Host:** `kbl_fiori` | **Virtual Port:** `8000`
     - **Principal Type:** `None`
  4. Under **Accessible Resources**, add URL paths:
     - Path: `/sap/opu/odata` (Path and all sub-paths)
     - Path: `/sap/public/bc` (Path and all sub-paths)
     - Path: `/sap/bc/adt` (Path and all sub-paths)
  5. Verify that the tunnel status indicators in SAP BTP Subaccount Cockpit show **Connected** with 1 Exposed System.

---

### Blocker 2: ABAP Development Tools (ADT) Authorization for `int_samarth`
- **Severity:** MEDIUM / FEATURE LIMITATION
- **Affected Tickets:** `SAP-007`, `SAP-011`
- **Root Cause:**
  - Live probe against endpoint `/sap/bc/adt/discovery` returned **HTTP 403 Forbidden**.
  - Technical user `int_samarth` is configured on S21 Client 200, but lacks authorization object `S_ADT_RES` required for ADT repository metadata search and CDS discovery.
  - While OData Gateway catalog discovery (`/sap/opu/odata/IWFND/CATALOGSERVICE`) succeeds with HTTP 200, advanced deep repository inspection remains restricted.
- **Exact Basis Remediation Steps Required:**
  1. Log in to SAP S21 GUI (Client 200) as a security administrator.
  2. Execute transaction `PFCG`.
  3. Create or update a technical role (e.g., `Z_FIORIFY_READONLY_DISCOVERY`).
  4. Add authorization object **`S_ADT_RES`**:
     - `ACTVT`: `03` (Display)
     - `URI`: `/sap/bc/adt/*`
  5. Add authorization object **`S_SERVICE`**:
     - `SRV_NAME`: `IWFND/CATALOGSERVICE`, `ZFAR_MANAGE_PAYMENT_ADVICES_SRV`
     - `SRV_TYPE`: `HT`
  6. Assign the role to technical user `int_samarth` in transaction `SU01`.
  7. Run user comparison (`PFCG` > User Tab > User Comparison).

---

## 3. Unblocked Capabilities & Safe Offline Operation

While the above external prerequisites are pending:
1. **Local Development & Assessment:** 100% operational using local PostgreSQL and direct LAN IP override (`SAP_URL_OVERRIDE=http://192.168.1.55:8000`).
2. **Official Fiori App Ingestion:** Fully functional via `ingestFAL.js` and local Fiori Apps Reference Library offline catalogs.
3. **Fit-Gap Assessment & Recommendation Engine:** Fully functional; evaluates transactions (e.g., `F-53`, `F-28`, `FS00`, `ME21N`), maps Fiori successor apps, and generates SAP Build / RAP handoff artifacts.
4. **Safety Enforcement:** Fiorify's central read-only policy guarantees that zero mutating requests will ever reach S21 under any circumstances.
