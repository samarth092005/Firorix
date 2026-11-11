# FIORIX — SAP SYSTEM VERIFICATION CHECKLIST (SPRINT S0)

**Document Identifier:** CHK-S4H-2023-S0  
**Target Environment:** SAP S/4HANA 2023 On-Premise / Private Cloud (e.g. System S21, Client 200)  
**Execution Context:** Pre-Flight Verification for FioriX Generation Baseline  
**Tools Required:** SAP GUI for Windows / Java and ABAP Development Tools (ADT / Eclipse)  
**Security Invariant:** Zero credentials, passwords, private keys, or tokens requested or recorded.  
**Governance Invariant:** No unexecuted check may be marked as PASS. Checks requiring SAP Administrator or Basis intervention are explicitly flagged.

---

## 1. Overview and Verification Methodology

Before the FioriX Generation Studio can output production-grade ABAP Core Data Services (CDS), RESTful Application Programming Model (RAP) definitions, and SAP Fiori Elements projects, the real physical capabilities of the connected target SAP landscape must be verified.

This checklist provides step-by-step instructions for SAP Basis administrators, security leads, and ABAP developers to collect, verify, and attest the 17 essential architectural parameters of the target landscape.

### Verification Status Codes:
- **`PASS`**: Check executed and verified on target system with empirical proof attached.
- **`FAIL`**: Check executed and capability is definitively unsupported or missing.
- **`BLOCKED_AUTH`**: Check attempted but denied due to missing PFCG authorization.
- **`PENDING_BASIS`**: Requires Basis / System Administrator intervention to inspect or configure.
- **`NOT_TESTED`**: Check has not yet been executed in this sprint.

---

## 2. Structured Verification Checklist

| # | Inspection Parameter | Target Expected Baseline | Primary Tool | Administrator Role Required | Current Status in Sprint S0 |
| :- | :--- | :--- | :--- | :--- | :--- |
| **01** | S/4HANA Product Release | SAP S/4HANA 2023 | SAP GUI | Developer / Basis | `PENDING_BASIS` |
| **02** | FPS / SPS Level | FPS00, FPS01, or FPS02 | SAP GUI | Basis Administrator | `PENDING_BASIS` |
| **03** | SAP_BASIS & ABAP Platform | `SAP_BASIS 758` / Platform 2023 | SAP GUI | Developer / Basis | `PENDING_BASIS` |
| **04** | Installed Software Components | `S4CORE 108`, `SAP_GWFND 758`, `SAP_UI 758` | SAP GUI | Basis Administrator | `PENDING_BASIS` |
| **05** | Database Platform | SAP HANA Database 2.0 (SPS07+) | SAP GUI / DBA | Basis / HANA DBA | `PENDING_BASIS` |
| **06** | ADT Connection & Discovery | `/sap/bc/adt/discovery` HTTP 200 | ADT / HTTP | Security Admin (S_ADT_RES) | **`BLOCKED_AUTH`** (HTTP 403 on S21) |
| **07** | ABAP Language Version | `ABAP for Cloud Development` (Tier 1) | ADT / SE21 | ABAP Lead / Basis | `NOT_TESTED` |
| **08** | Package Creation Permissions | Authorized in `Z*` or `/FIORIX/` | ADT / SE21 | Security Admin (S_DEVELOP) | `NOT_TESTED` |
| **09** | Namespace Availability | `Z*` / `Y*` or registered prefix | SAP GUI / SE03 | Basis / Development Lead | `NOT_TESTED` |
| **10** | Object Creation & Activation | `DDLS, BDEF, SRVD, SRVB, CLAS` | ADT | Security Admin (S_DEVELOP) | `NOT_TESTED` |
| **11** | Transport Organizer (CTS) | Workbench Request (`K9*`) | SAP GUI / SE09 | Basis Administrator | `NOT_TESTED` |
| **12** | OData V2 Gateway Availability | Active catalog services | SAP GUI / HTTP | Basis Administrator | **`PASS`** (Corroborated on S21 V2 Catalog) |
| **13** | OData V4 Service Binding Capability | Active `/IWFND/V4_ADMIN` | SAP GUI / ADT | Basis Administrator | `PENDING_BASIS` |
| **14** | Gateway Deployment Architecture | Embedded vs Central Hub | SAP GUI | Basis Administrator | `PENDING_BASIS` |
| **15** | ATC Infrastructure & Master System | Active ATC check system | SAP GUI / ATC | Quality Lead / Basis | `PENDING_BASIS` |
| **16** | ATC Check Variant Permissions | `ABAP_CLOUD_READINESS` execution | SAP GUI / ADT | Security Admin (S_QAC_EXEC) | `NOT_TESTED` |
| **17** | Released API & Extension Points | C1 Released CDS Entities & BAPIs | ADT / SRELEASE | ABAP Lead / Architect | `NOT_TESTED` |

---

## 3. Step-by-Step Inspection Instructions

### Check 01: S/4HANA Product Release
- **Objective:** Verify the official product release version installed.
- **SAP GUI Navigation:**
  1. Log on to target SAP system (e.g. S21) via SAP GUI.
  2. In the menu bar, navigate to: `System` → `Status...`
  3. Under the **SAP System Data** section, click the magnifying glass icon next to **Product Version**.
  4. In the *Installed Product Versions* tab, locate `SAP S/4HANA ON-PREMISE`.
  5. Record the release value (Expected: `2023`).
- **Support Needed:** Developer access to SAP GUI.

---

### Check 02: FPS/SPS Level
- **Objective:** Determine the Feature Package Stack or Support Package Stack.
- **SAP GUI Navigation:**
  1. In the `System Status` dialog from Check 01, click the **Installed Software Component Versions** button (or launch Transaction `SPAM`).
  2. Locate component `S4CORE`.
  3. Note the *Release* and *Level* (e.g. `Release 108, Level 0000` = FPS00; `Level 0001` = FPS01; `Level 0002` = FPS02).
- **Support Needed:** Basis Administrator support required for `SPAM`.

---

### Check 03: SAP_BASIS & ABAP Platform Version
- **Objective:** Confirm ABAP Platform 2023 (`SAP_BASIS 758`).
- **SAP GUI Navigation:**
  1. In the Component list from Check 02, locate software component `SAP_BASIS`.
  2. Verify:
     - Component: `SAP_BASIS`
     - Release: `758`
     - Support Package: `SAPK-75801INSAPBASIS` (or higher)
  3. In `System Status`, verify Kernel Release: `793` Unicode.
- **Support Needed:** Developer access.

---

### Check 04: Installed Software Components
- **Objective:** Confirm presence of Gateway and UI foundation layers.
- **SAP GUI Navigation:**
  1. In the Component list, inspect the following critical components:
     - `SAP_GWFND`: Release `758` (Gateway Foundation)
     - `SAP_UI`: Release `758` (User Interface Technology)
     - `S4CORE`: Release `108` (S/4HANA Core)
     - `SAP_ABA`: Release `758` (Application Basis)
- **Support Needed:** Basis Administrator.

---

### Check 05: Database Platform
- **Objective:** Verify underlying database is SAP HANA 2.0.
- **SAP GUI Navigation:**
  1. Navigate to: `System` → `Status...`
  2. Under **Database Data**:
     - Database System: `HDB` (SAP HANA)
     - Release: `2.00.070.xx` (HANA 2.0 SPS07 or higher)
- **Support Needed:** Developer or Basis Administrator.

---

### Check 06: ADT Connection & Discovery
- **Objective:** Verify remote ABAP Development Tools REST connectivity.
- **ADT / HTTP Inspection:**
  1. In Eclipse ADT, create a new ABAP Cloud Project pointing to the S21 system.
  2. Alternatively, perform an HTTP GET request to:
     `http(s)://<sap_host>:<port>/sap/bc/adt/discovery`
     Header: `Accept: application/xml, text/xml`
  3. **Empirical Evidence from FioriX Sprint S0:**
     - Endpoint responded with: `HTTP 403 Forbidden`
     - Response Body: `SADT_RESOURCE_003: No authorization to access the resource /sap/bc/adt/discovery`
  4. **Remediation Action Required from Security Administrator:**
     - Assign PFCG role containing authorization object `S_ADT_RES` with `ACTVT = 03` (Display) and `02` (Change).
     - Assign `S_DEVELOP` for object types `DDLS`, `BDEF`, `SRVD`, `SRVB`, `CLAS`.

---

### Check 07: ABAP Language Version Setting
- **Objective:** Verify ABAP Cloud development governance on the package level.
- **ADT / SAP GUI Navigation:**
  1. In Eclipse ADT, right-click on the development package → `Properties` → `ABAP Development`.
  2. Check the **ABAP Language Version** field:
     - Value `ABAP for Cloud Development` indicates Tier 1 compliance.
     - Value `Standard ABAP` indicates classic on-premise development.
  3. In SAP GUI: Transaction `SE21`, display package attributes, check *Language Version*.
- **Support Needed:** ABAP Development Lead.

---

### Check 08: Package Creation Permissions
- **Objective:** Confirm permissions to create development packages.
- **SAP GUI Navigation:**
  1. Execute Transaction `SE21` or open ADT Package Explorer.
  2. Attempt to create a test development package (e.g. `$TMP_TEST` or `ZFIORIX_TEST`).
  3. Check authorization for `S_DEVELOP` with `DEVCLASS` and `OBJTYPE = DEVC`.
- **Support Needed:** Security Administrator.

---

### Check 09: Namespace Availability
- **Objective:** Confirm available customer naming prefixes (`Z*`, `Y*`, or registered `/NAMESP/`).
- **SAP GUI Navigation:**
  1. Execute Transaction `SE03` → `Administration` → `Display/Change Namespaces`.
  2. Verify that namespace `/` (standard customer `Z*`/`Y*`) has status *Role: C (Customer)* and *Changeable*.
- **Support Needed:** Basis Administrator.

---

### Check 10: Repository Object Creation & Activation Permissions
- **Objective:** Confirm authorization to create and activate CDS, RAP, and Service artifacts.
- **Required Authorization Objects:**
  - `S_DEVELOP`:
    - `ACTVT`: `01` (Create), `02` (Change), `03` (Display), `07` (Activate)
    - `OBJTYPE`: `DDLS` (CDS View Entity), `BDEF` (Behavior Definition), `SRVD` (Service Definition), `SRVB` (Service Binding), `DDLX` (Metadata Extension), `CLAS` (ABAP Class)
- **Support Needed:** Security Administrator.

---

### Check 11: Transport Organizer Configuration
- **Objective:** Confirm ability to create and record changes in CTS Workbench requests.
- **SAP GUI Navigation:**
  1. Execute Transaction `SE09` or `SE10`.
  2. Verify user can create a **Workbench Request** under target development system.
  3. Note transport target (e.g. `QAS`).
- **Support Needed:** Basis Administrator.

---

### Check 12: OData V2 Gateway Availability
- **Objective:** Verify active OData V2 Gateway catalog.
- **Empirical Evidence from FioriX Sprint S0:**
  - Endpoint `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection` responded with HTTP 200 on connected S21.
  - Successfully retrieved 1,300+ registered services.
  - Status: **`PASS`**.

---

### Check 13: OData V4 Service Binding Capability
- **Objective:** Confirm OData V4 publishing infrastructure is operational.
- **SAP GUI Navigation:**
  1. Execute Transaction `/IWFND/V4_ADMIN` (Service Groups Administration).
  2. Check if published Service Groups exist and ICF nodes under `/sap/opu/odata4/` are active in Transaction `SICF`.
- **Support Needed:** Basis Administrator.

---

### Check 14: Gateway Deployment Architecture
- **Objective:** Identify whether Gateway is Embedded or Central Hub.
- **SAP GUI Navigation:**
  1. Execute Transaction `/IWFND/VIEW_RFC` and `/IWFND/CONFIG`.
  2. If system RFC destination is `NONE` or `LOCAL`, deployment is **Embedded** (recommended for S/4HANA 2023 RAP).
- **Support Needed:** Basis Administrator.

---

### Check 15: ATC Infrastructure & Master System
- **Objective:** Confirm ABAP Test Cockpit is configured for automated quality checks.
- **SAP GUI Navigation:**
  1. Execute Transaction `ATC`.
  2. Check `ATC Administration` → `System Configuration`.
  3. Verify master system RFC destination and scheduled check runs.
- **Support Needed:** Basis Administrator / Quality Lead.

---

### Check 16: ATC Check Variant Permissions
- **Objective:** Verify check variant `ABAP_CLOUD_READINESS` is accessible.
- **SAP GUI Navigation:**
  1. In Transaction `ATC`, inspect configured check variants.
  2. Verify variant `ABAP_CLOUD_READINESS` exists.
  3. Verify user authorization object `S_QAC_EXEC`.
- **Support Needed:** Security Administrator.

---

### Check 17: Released API & Extension Point Verification
- **Objective:** Verify access to released SAP CDS View Entities and ABAP APIs.
- **ADT Navigation:**
  1. In Eclipse ADT, open **Released Objects** tree in Project Explorer.
  2. Verify availability of core CDS view entities:
     - `I_JournalEntry` / `I_JournalEntryItem`
     - `I_PurchaseOrderAPI01`
     - `I_SalesOrderTP`
     - `I_Currency`, `I_Country`, `I_Customer`
- **Support Needed:** ABAP Development Lead / Clean Core Architect.

---

## 4. Administrator Support Action Request Form

When escalating to SAP Basis or Security Administrators, provide the following specific authorization and configuration request:

```
To: SAP Basis & Security Administration Team
Subject: Authorization & Configuration Request for FioriX S/4HANA 2023 Baseline

Landscape: SAP S/4HANA 2023 (System S21, Client 200)

1. Authorization Object S_ADT_RES:
   Assign PFCG role with S_ADT_RES (Activity 03 - Display, Activity 02 - Change)
   to resolve SADT_RESOURCE_003 403 Forbidden on /sap/bc/adt/discovery.

2. Authorization Object S_DEVELOP:
   Assign S_DEVELOP with ACTVT 01, 02, 03, 07 for Object Types:
   - DDLS (CDS View Entity)
   - BDEF (RAP Behavior Definition)
   - SRVD (Service Definition)
   - SRVB (Service Binding)
   - DDLX (Metadata Extension)
   - CLAS (ABAP Classes)
   Within Package Range: Z* or /FIORIX/*

3. ICF Service Activation:
   Confirm active status of:
   - /sap/bc/adt/
   - /sap/opu/odata4/

4. Transaction /IWFND/V4_ADMIN:
   Verify authorization to publish Service Groups for OData V4 Service Bindings.
```
