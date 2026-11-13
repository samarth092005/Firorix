# Fiorify — SAP S/4HANA 2023 COMPATIBILITY BASELINE (SPRINT S0)

**Document Identifier:** BASELINE-S4H-2023-S0  
**Target Environment:** SAP S/4HANA 2023 On-Premise (Private Cloud Edition / On-Premise)  
**ABAP Platform Baseline:** ABAP Platform 2023 (SAP_BASIS 7.58, ABAP Kernel 7.93)  
**Authoritative Reference:** Official SAP Help Portal Documentation & SAP Notes  
**Status:** COMPLETE ARCHITECTURAL SPECIFICATION & CAPABILITY BASELINE  
**Sprint:** SPRINT S0 (Audit and Design Baseline)  

---

## 1. Executive Summary & Baseline Objectives

This document establishes the official technical baseline for the Fiorify Modernization Platform when targeting **SAP S/4HANA 2023 On-Premise and Private Cloud Edition**.

Fiorify delivers automated discovery, matching, fit-gap assessment, and governed recommendations for migrating legacy SAP GUI and Dynpro transactions into modern, clean-core SAP Fiori applications. Before Fiorify generates any backend ABAP CDS, RAP business object behaviors, OData service bindings, or SAP Fiori Elements frontend projects (commencing in GEN-02), the target runtime capabilities of SAP S/4HANA 2023 must be rigorously documented from official SAP authorities and distinguished from live connected-system verifications.

### Non-Negotiable Governance Principles
1. **Repository Evidence Over Marketing Claims:** Compatibility is never inferred from general marketing brochures. Every supported feature must be verified against official SAP release documentation and subsequently validated on the connected landscape.
2. **Documented vs. Connected System Distinction:** Official documentation proves what the SAP release is *capable* of supporting. It does **not** prove that the connected SAP system (e.g. S21 Client 200) has the requisite Feature Package Stack (FPS), Support Package Stack (SPS), software components, ICF nodes, or PFCG user authorizations activated.
3. **Clean Core & Tiered Extensibility:** All generation designs adhere to SAP's Clean Core methodology:
   - **Tier 1 (ABAP Cloud / Developer Extensibility):** Preferred for greenfield applications using released CDS view entities, RAP managed business objects, and OData V4.
   - **Tier 2 (Cloud-Ready Classic Wrappers):** Applied when custom logic must bridge unreleased standard tables or classic BAPIs.
   - **Tier 3 (Classic Extensibility):** Strictly audited and isolated; never used as a default generation pattern.
4. **Zero Unverified Writes:** Sprint S0 performs no writes, creates no repository objects, activates no bindings, and releases no transport requests.

---

## 2. Official SAP Documentation & Authorities Consulted

The following official SAP documentation assets represent the authoritative foundation for this baseline:

| Document / Asset Title | SAP Authority / URL Reference | Target Release Scope | Canonical Version |
| :--- | :--- | :--- | :--- |
| **SAP S/4HANA 2023 Product Documentation** | SAP Help Portal (`help.sap.com/docs/SAP_S4HANA_ON-PREMISE/`) | S/4HANA 2023 Initial, FPS01, FPS02, SPS03 | 2023 Latest |
| **ABAP Platform 2023 Documentation** | SAP Help Portal (`help.sap.com/docs/ABAP_PLATFORM_2023/`) | ABAP Platform 2023 (SAP_BASIS 7.58) | 7.58 |
| **ABAP RESTful Application Programming Model (RAP)** | SAP Help Portal (`help.sap.com/docs/abap-cloud/abap-rap/`) | ABAP Platform 2023 / ABAP Cloud | 2023 / Cloud |
| **ABAP CDS in Release 7.58** | SAP Help Portal (`help.sap.com/docs/ABAP_PLATFORM_2023/cds`) | ABAP CDS View Entities & DCL | 7.58 |
| **SAP Gateway Foundation for OData V4** | SAP Help Portal (`help.sap.com/docs/ABAP_PLATFORM_2023/gateway`) | SAP_GWFND 7.58 / OData V4 Publishing | 7.58 |
| **SAP Fiori Elements Floorplans (V4)** | SAP Help Portal (`help.sap.com/docs/SAPUI5/`) | SAPUI5 1.120 (Bundled with S/4HANA 2023) | 1.120 LTS |
| **SAP Note 3349949** | SAP Launchpad / Me.sap.com | Release Strategy for SAP S/4HANA 2023 | Initial |
| **SAP Note 3388836** | SAP Launchpad / Me.sap.com | SAP S/4HANA 2023: Feature Package Stack 00 / 01 / 02 | FPS00–FPS02 |
| **SAP Note 2918860** | SAP Launchpad / Me.sap.com | ABAP Test Cockpit (ATC) for ABAP Cloud Readiness | S/4HANA 2023 |
| **SAP Note 3227863** | SAP Launchpad / Me.sap.com | ABAP Cloud: Released Objects and C1 Release Contract | 2023 Platform |

---

## 3. ABAP Platform 2023 Architecture & Language Versions

### 3.1 Release Hierarchy & Component Stack
SAP S/4HANA 2023 is powered by **ABAP Platform 2023**:
- **Application Server ABAP:** SAP NetWeaver AS ABAP 7.58
- **Core Software Component:** `SAP_BASIS 758`
- **Database Engine:** SAP HANA Database 2.0 (SPS 07 or higher required)
- **ABAP Kernel Version:** 7.93 (64-bit Unicode)
- **Application Core:** `S4CORE 108`

### 3.2 ABAP Language Versions in S/4HANA 2023
ABAP Platform 2023 introduces strict compiler enforcement for ABAP Language Versions:

1. **Standard ABAP (`Language Version 5`):**
   - The classic ABAP programming language.
   - Allows direct SQL access to any table in DDIC (`VBAK`, `MARA`, `BKPF`).
   - Allows calls to unreleased BAPIs, function modules, and classic Dynpro `CALL SCREEN`.
   - Permissible in Tier 2 and Tier 3 packages, but forbidden in Tier 1 Clean Core packages.

2. **ABAP for Cloud Development (`Language Version 7` / ABAP Cloud):**
   - Mandatory for Tier 1 Clean Core developer extensibility in S/4HANA 2023 on-premise.
   - **Syntax Restrictions:**
     - Obsolete statements (`MOVE`, `OCCURS`, `FORM/ENDFORM`, `CALL SCREEN`, `LEAVE TO SCREEN`, `OPEN DATASET` to local server files) are compilation errors.
     - Direct `SELECT` on non-released standard SAP database tables or views is forbidden.
     - Direct modification of standard tables (`INSERT`, `UPDATE`, `MODIFY`, `DELETE`) is completely blocked.
     - Only public released APIs (with Contract `C1 - Use in ABAP Cloud`) can be accessed.
     - Repository objects must be created within software components and packages explicitly designated with ABAP Language Version `ABAP for Cloud Development`.

### 3.3 FPS and SPS Level Dependencies
- **Initial Shipment Stack (FPS00 - Oct 2023):** Baseline RAP Managed with Draft, CDS View Entities, OData V4 Service Bindings, ADT Service Preview.
- **Feature Package Stack 01 (FPS01 - Feb 2024):** Enhanced RAP Determinations/Validations trigger points, improved ATC `ABAP_CLOUD_READINESS` check variant, expanded released CDS View Entities in `S4CORE`.
- **Feature Package Stack 02 (FPS02 - May 2024):** RAP side-effects enhancements, early numbering in draft scenarios, improved integration with SAP Fiori Tools.
- **Support Package Stack 03 (SPS03 - Feb 2025):** Maintenance and security hardening.

---

## 4. Core ABAP CDS Capabilities in S/4HANA 2023

### 4.1 CDS View Entities (`DEFINE VIEW ENTITY`)
In ABAP Platform 2023 (`SAP_BASIS 7.58`), **CDS View Entities** are the default, authoritative modeling construct:
- Replaces legacy CDS DDIC-based views (`DEFINE VIEW ... AS SELECT ...`).
- **No DDIC SQL View Generated:** Eliminates the classic 16-character `@AbapCatalog.sqlViewName` DDIC artifact.
- Built-in type safety, stricter syntax validation at activation, and native support in RAP behavior definitions.
- Legacy DDIC-based views are marked **obsolete** in ABAP Cloud and will trigger ATC warnings/errors.

### 4.2 Data Model Hierarchy (V4 / RAP Alignment)
The generated CDS architecture follows the virtual data model (VDM) layering:
1. **Root View Entity (`DEFINE ROOT VIEW ENTITY Z_I_Header`):** Represents the root node of the RAP business object composition tree. Contains persistent field selections, compositions, and transactional associations.
2. **Child Composition View Entities (`DEFINE VIEW ENTITY Z_I_Item`):** Represent dependent child entities bound via `COMPOSITION [0..*] OF Z_I_Item AS _Items` and reverse `ASSOCIATION TO PARENT Z_I_Header AS _Header`.
3. **Projection View Entities (`DEFINE ROOT VIEW ENTITY Z_C_Header AS PROJECTION ON Z_I_Header`):** Consumed directly by service definitions and UI floorplans. Implements `@Metadata.allowExtensions: true`, virtual elements, and UI annotations.

### 4.3 Metadata Extensions (MDE) & Annotations
- **Metadata Extension Separation:** To enforce Clean Core and maintain separation between data modeling and UI presentation, UI annotations (`@UI.lineItem`, `@UI.identification`, `@UI.facet`, `@UI.selectionField`) must reside in dedicated Metadata Extensions (`ANNOTATE VIEW Z_C_Header WITH ...`).
- **Authorization Annotations & DCL:**
  - `@AccessControl.authorizationCheck: #CHECK` is mandatory on all View Entities.
  - Paired with Data Control Language (DCL) access rules: `DEFINE ROLE Z_R_Header { GRANT SELECT ON Z_I_Header WHERE (CompanyCode) = ASPECT pfcg_auth(F_BKPF_BUK, BUKRS, ACTVT = '03'); }`.

---

## 5. ABAP RESTful Application Programming Model (RAP) Capabilities

### 5.1 Managed vs. Unmanaged RAP
| RAP Implementation Pattern | S/4HANA 2023 Support | Application Scenario | Clean Core Assessment |
| :--- | :--- | :--- | :--- |
| **Managed RAP with Draft** | Supported (Default) | Standard transactional applications with standard CRUD, draft staging tables, determinations, and validations. Standard buffer and database commit handled automatically by the RAP runtime. | **Tier 1 (Clean Core Compatible)** |
| **Managed RAP (Without Draft)** | Supported | Lightweight transactional apps where draft intermediate state is not desired. | **Tier 1 (Clean Core Compatible)** |
| **Unmanaged RAP** | Supported | Complex legacy scenarios where data updates must flow through existing legacy APIs (e.g. BAPIs like `BAPI_PO_CREATE1`) or custom update function modules. Developer implements all create/update/delete operations in local saver classes. | **Tier 2 (Cloud-Ready Wrapper)** |
| **Read-Only RAP (Query Only)** | Supported | Analytical dashboards, reporting tools, and read-only List Reports. No behavior definition (`BDEF`) required; CDS View Entity exposed directly via Service Definition. | **Tier 1 (Clean Core Compatible)** |

### 5.2 RAP Behavior Definition Scope
In S/4HANA 2023, Behavior Definitions (`BDEF`) support the full spectrum of enterprise transactional semantics:
- **Draft Enablement:** `with draft; draft table ztb_hdr_d;` manages draft life cycles (New, Active, Edit, Discard, Resume, Prepare).
- **Standard Operations:** `create; update; delete;` with field-level controls (`field (readonly) DocumentNumber;`, `field (mandatory) CompanyCode;`).
- **Determinations:** Triggered `on modify` or `on save` for field calculation, default values, or status transitions.
- **Validations:** Triggered `on save` for business rule enforcement (`validateDates`, `validateSupplier`), returning errors to the RAP message container (`REPORTED` and `FAILED` structures).
- **Actions:** Custom operations (`action approveDocument result [1] $self;`, `factory action duplicateOrder [1] $self;`).
- **Locking & Concurrency:** Pessimistic locking via `lock master` on root and `lock dependent by _Header` on child nodes. Optimistic locking via `etag master ChangeTimestamp`.

---

## 6. Service Exposure & SAP Gateway Integration

### 6.1 Service Definition (`SRVD`)
- Encapsulates the CDS projection entities exposed to a specific consumer:
  ```abap
  @EndUserText.label: 'Service Definition for Custom Purchase Management'
  define service ZSD_PURCHASE_MANAGE {
    expose Z_C_PurchaseOrder as PurchaseOrder;
    expose Z_C_PurchaseOrderItem as PurchaseOrderItem;
    expose I_Currency as Currency;
  }
  ```

### 6.2 Service Binding (`SRVB`)
- Binds a Service Definition to a specific transport protocol and scenario:
  - **`OData V4 - UI` (Recommended):** Native protocol for SAP Fiori Elements in S/4HANA 2023. Higher payload efficiency, batch processing, and integrated draft handling.
  - **`OData V4 - Web API`:** For headless integrations, background jobs, and external API consumption.
  - **`OData V2 - UI`:** Legacy fallback when consuming tools or third-party gateways do not support OData V4.
- **Local Service Preview:** ADT in S/4HANA 2023 provides direct Fiori Elements preview without deploying to Launchpad.

### 6.3 Gateway Publishing & ICF Architecture
- **OData V4 Service Publishing:** Managed via Transaction `/IWFND/V4_ADMIN` (Publish Service Groups). The published endpoint path follows:
  `/sap/opu/odata4/sap/<service_binding_name>/srvd/sap/<service_definition_name>/0001/`
- **ICF Node Tree:** Requires active ICF service nodes under `/sap/opu/odata4/` and `/sap/bc/adt/`.

---

## 7. SAP Fiori Elements Frontend Capabilities

### 7.1 Supported Floorplans (OData V4)
- **List Report & Object Page (LROP):** Primary template for transactional search and detail maintenance.
- **Analytical List Page (ALP):** For multidimensional analytics combined with table inspection.
- **Overview Page (OVP):** For dashboard cards and operational summaries.
- **Worklist:** Simplified single-table task processing.

### 7.2 Tooling and UI5 Version Compatibility
- **Bundled SAPUI5 Version:** SAPUI5 1.120 LTS is the primary bundled library in S/4HANA 2023.
- **Theme:** Horizon (`sap_horizon`, `sap_horizon_dark`) is the official visual theme.
- **Fiori Tools Project Generation:** Generated projects utilize `@sap/ux-ui5-tooling` with `manifest.json` schema `1.49.0` or higher, consuming RAP OData V4 annotations.

---

## 8. Quality Assurance, ATC & Governance

### 8.1 ABAP Test Cockpit (ATC)
- **Primary Check Variant:** `ABAP_CLOUD_READINESS` evaluates compliance with ABAP Cloud restrictions.
- **Checks Executed:**
  - Usage of unreleased APIs and database tables.
  - Syntax compliance with Language Version 7.
  - Direct SQL updates on standard tables.
  - Security vulnerability scanning (`SLIN_SEC`).
  - Unit test coverage via ABAP Unit (`AUNIT`).

### 8.2 Transport & Activation Lifecycle
- **Object Types Created in RAP Lifecycle:**
  - `DDLS` (Data Definition - CDS View Entity)
  - `BDEF` (Behavior Definition)
  - `CLAS` (ABAP Class - Behavior Implementation)
  - `SRVD` (Service Definition)
  - `SRVB` (Service Binding)
  - `DDLX` (Metadata Extension)
  - `DCLS` (Access Control / DCL)
- **CTS Transport:** All objects must be assigned to an active Workbench Transport Request (`TRKORR`) assigned to the authorized developer.

---

## 9. Comprehensive Capability Evaluation Records

Below is the definitive capability catalog for SAP S/4HANA 2023, recording documented status, prerequisites, connected system verification status, and restrictions.

```
Status Values:
- VERIFIED_SUPPORTED: Documented and verified on connected live system.
- DOCUMENTED_BUT_UNVERIFIED: Authoritatively documented in S/4HANA 2023, but not yet verified on live connected instance.
- UNSUPPORTED: Documented as not supported in S/4HANA 2023.
- NOT_TESTED: Check has not been executed.
- AUTHORIZATION_BLOCKED: Connection or execution attempted, but rejected by SAP authorization (e.g. 403 Forbidden).
- UNKNOWN: Capability status cannot be determined.
```

### Record 1: CDS View Entities (`DEFINE VIEW ENTITY`)
- **Capability Name:** ABAP CDS View Entities (Replacement of DDIC-based views)
- **Official SAP Source:** ABAP Platform 2023 Documentation (`help.sap.com/docs/ABAP_PLATFORM_2023/cds`)
- **Documentation Release:** SAP_BASIS 7.58
- **Supported Status in Documentation:** `SUPPORTED`
- **Exact Release Prerequisite:** SAP S/4HANA 2020+ (Default & mandatory in 2023)
- **Connected System Verified:** `DOCUMENTED_BUT_UNVERIFIED` (ADT write/activation not executed)
- **Evidence Required to Verify:** Successful activation of a test view entity `Z_I_TEST_ENTITY` in Eclipse ADT without DDIC SQL view artifact.
- **Restrictions & Notes:** No `@AbapCatalog.sqlViewName` allowed. Obsolete DDIC views trigger ATC warnings.

### Record 2: RAP Managed with Draft (`WITH DRAFT`)
- **Capability Name:** RAP Managed Business Object with Draft Table Enablement
- **Official SAP Source:** ABAP RAP Guide 2023 (`help.sap.com/docs/abap-cloud/abap-rap/`)
- **Documentation Release:** ABAP Platform 2023 / S/4HANA 2023 FPS00
- **Supported Status in Documentation:** `SUPPORTED`
- **Exact Release Prerequisite:** SAP S/4HANA 2020+ (Enhanced in 2023 with early numbering and side effects)
- **Connected System Verified:** `DOCUMENTED_BUT_UNVERIFIED`
- **Evidence Required to Verify:** Creation and activation of a draft table and `BDEF` with `with draft;`, followed by ADT preview testing draft creation.
- **Restrictions & Notes:** Requires dedicated draft table schema; total ETag required for optimistic lock checks.

### Record 3: OData V4 Service Binding (`OData V4 - UI`)
- **Capability Name:** RAP OData V4 Service Exposure & Local Fiori Elements Preview
- **Official SAP Source:** SAP Gateway Foundation 2023 (`help.sap.com/docs/ABAP_PLATFORM_2023/gateway`)
- **Documentation Release:** SAP_GWFND 7.58
- **Supported Status in Documentation:** `SUPPORTED`
- **Exact Release Prerequisite:** SAP S/4HANA 2020+
- **Connected System Verified:** `DOCUMENTED_BUT_UNVERIFIED` (Live S21 Gateway Catalog currently exposes OData V2 catalog services; `/IWFND/V4_ADMIN` group publishing has not been verified)
- **Evidence Required to Verify:** Publish Service Group in `/IWFND/V4_ADMIN` and execute successful HTTP GET on service metadata via `/sap/opu/odata4/`.
- **Restrictions & Notes:** Web Dispatcher / ICM routing for `/sap/opu/odata4/` must be enabled.

### Record 4: ADT REST Discovery Interface (`/sap/bc/adt/discovery`)
- **Capability Name:** ABAP Development Tools HTTP Discovery Interface
- **Official SAP Source:** SAP NetWeaver ADT Configuration Guide
- **Documentation Release:** SAP_BASIS 7.58
- **Supported Status in Documentation:** `SUPPORTED`
- **Exact Release Prerequisite:** SAP NetWeaver 7.31+
- **Connected System Verified:** `AUTHORIZATION_BLOCKED`
- **Evidence Required to Verify:** Live probe to `http://kbl_fiori:8000/sap/bc/adt/discovery` returned HTTP 403 Forbidden (`SADT_RESOURCE_003: No authorization`).
- **Restrictions & Notes:** Requires user assignment of PFCG authorization object `S_ADT_RES` (Activity 03) and `S_DEVELOP`.

### Record 5: ATC Check Variant `ABAP_CLOUD_READINESS`
- **Capability Name:** ABAP Test Cockpit Clean Core & ABAP Cloud Validation
- **Official SAP Source:** SAP Note 2918860 / ABAP Platform 2023 ATC Documentation
- **Documentation Release:** S/4HANA 2023
- **Supported Status in Documentation:** `SUPPORTED`
- **Exact Release Prerequisite:** S/4HANA 2022+ (Expanded in 2023)
- **Connected System Verified:** `DOCUMENTED_BUT_UNVERIFIED`
- **Evidence Required to Verify:** Execution of `ATC` transaction in SAP GUI with variant `ABAP_CLOUD_READINESS` or remote ADT run via `/sap/bc/adt/atc/runs`.
- **Restrictions & Notes:** Requires Basis configuration of ATC master system and authorization `S_QAC_EXEC`.

### Record 6: SAP Fiori Elements for OData V4 (Floorplan LROP)
- **Capability Name:** SAP Fiori Elements List Report & Object Page consuming RAP OData V4
- **Official SAP Source:** SAPUI5 Documentation (Release 1.120 LTS)
- **Documentation Release:** SAPUI5 1.120
- **Supported Status in Documentation:** `SUPPORTED`
- **Exact Release Prerequisite:** SAPUI5 1.84+ (Maturity reached in 1.108+, LTS in 1.120)
- **Connected System Verified:** `DOCUMENTED_BUT_UNVERIFIED`
- **Evidence Required to Verify:** Fiori Tools project build and preview against RAP OData V4 service.
- **Restrictions & Notes:** UI5 tooling versions must align with 1.120.x libraries.

---

## 10. Summary of Restrictions & Unresolved Questions

1. **Live ADT Access on S21:** The connected development system `S21-200` has ADT installed, but the service user is blocked with HTTP 403 (`S_ADT_RES`). Without Basis role assignment, Fiorify cannot perform automated remote discovery or template deployment via ADT REST APIs.
2. **OData V4 Gateway Publication:** It is unverified whether the on-premise system `S21-200` has published service groups for OData V4 or if Web Dispatcher reverse proxy permits traffic on `/sap/opu/odata4/`.
3. **ABAP Cloud Package Configuration:** It is unverified whether customer package `/Fiorify/` or `ZFiorify` has been created with ABAP Language Version set to `ABAP for Cloud Development` or `Standard ABAP`.
4. **Transport Request Allocation:** Fiorify generation engine will require a designated transport request (`TRKORR`) and package (`DEVCLASS`) when manual import or ADT deployment is initiated.
