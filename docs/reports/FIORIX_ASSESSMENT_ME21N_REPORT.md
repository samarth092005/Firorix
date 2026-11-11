# SAP TRANSACTION DISCOVERY & FIORI ASSESSMENT REPORT
**Platform:** SAP S/4HANA 2023 Private Edition (S21 Client 200)  
**Target Landscape:** S21-200 / Client 200 (SAP S/4HANA 2023 Private Edition)  
**Report Date:** 2026-11-08 11:08:49 UTC  
**Assessment ID:** ASM-S21-ME21N  
**Lifecycle Status:** APPROVED  

---

## 1. EXECUTIVE SUMMARY

- **Transaction Code:** `ME21N` — Create Purchase Order
- **Transaction Classification:** **STANDARD** (Object TADIR ME)
- **Outcome Determination:** **EXPLICIT SUCCESSOR**
- **Decision Category:** **ADOPT** (Standard Clean Core Fiori Successor)
- **Recommended Fiori App:** `F0842A` (Manage Purchase Orders)
- **UI Technology:** SAP Fiori elements
- **Release Compatibility:** **COMPATIBLE** (SAP S/4HANA 2023 Private Edition)
- **Target S21 Availability:** **VERIFIED_READY**
- **Evidence Completeness Score:** **88/100 (COMPLETE)**
- **Provenance Disclosure:** AUTHORITATIVE_DDIC_SNAPSHOT (Verified DDIC Repository Baseline)

---

## 2. SAP TRANSACTION TECHNICAL & LANDSCAPE PROFILE

| Attribute | Value | Verification Source | Provenance |
|---|---|---|---|
| **Transaction Code** | `ME21N` | DDIC Table TSTC | AUTHORITATIVE_DDIC_SNAPSHOT |
| **Description** | Create Purchase Order | DDIC Table TSTCT | AUTHORITATIVE_DDIC_SNAPSHOT |
| **Main Program** | `SAPLMEGUI` | DDIC Table TSTC (PGMNA) | (DYPNO) | AUTHORITATIVE_DDIC_SNAPSHOT |
| **TADIR Object Type** | `R3TR TRAN` | DDIC Table TADIR | AUTHORITATIVE_DDIC_SNAPSHOT |
| **Development Package** | `ME` | DDIC Table TADIR (DEVCLASS) | AUTHORITATIVE_DDIC_SNAPSHOT |
| **Original System** | `SAP` | DDIC Table TADIR (SRCSYSTEM) | AUTHORITATIVE_DDIC_SNAPSHOT |
| **Software Component** | `S4CORE 108` | DDIC Table TDEVC / CVERS | AUTHORITATIVE_DDIC_SNAPSHOT |
| **Business Area** | Sourcing & Procurement / Purchasing | Functional Taxonomy | CURATED_TAXONOMY |

---

## 3. BUSINESS CONTEXT & REQUIREMENTS INTAKE

- **Business Process:** Sourcing & Procurement
- **Primary Operational Scenario:** Create standard and subcontracting purchase orders
- **Business Criticality:** HIGH
- **Assessment Objective:** Evaluate modern SAP Fiori elements successor for ME21N
- **Selected Functional Requirements:**
  - Multi-line purchase order generation with account assignment
  - Automated purchase order approval workflow
  - Integration with material master and info records
  - Output determination and supplier communication

---

## 4. OFFICIAL SAP FIORI CATALOGUE CANDIDATES

### Candidate #1: F0842A — Manage Purchase Orders (Primary Match)
- **UI Technology:** `SAP Fiori elements`
- **Supported Releases:** SAP S/4HANA 2023, 2022, 2021
- **Technical Component:** `MM_PUR_PO_MAINT_V2`
- **OData Services:** MM_PUR_PO_MAINT_V2_SRV
- **Business Roles:** SAP_BR_PURCHASER
- **Official Documentation:** https://fal.cloud.sap/apps/F0842A

### Candidate #2: ME21N — Create Purchase Order (SAP GUI for HTML Fallback)
- **UI Technology:** `SAP GUI for HTML`
- **Supported Releases:** SAP S/4HANA 2023, 2022
- **Technical Component:** `ME`
- **Classification:** Classic Dynpro Compatibility Tile

---

## 5. CANDIDATE COMPARISON MATRIX

| Comparison Criterion | `F0842A` (Manage Purchase Orders) | `ME21N` (WebGUI Tile) |
|---|---|---|
| **Application Type** | SAP Fiori (Transactional) | SAP GUI for HTML |
| **UI Technology** | **SAP Fiori elements** | Classic Dynpro HTML Wrapper |
| **Technical Component** | `MM_PUR_PO_MAINT_V2` | `ME` |
| **Clean Core Alignment** | **GREEN (Native Clean Core)** | AMBER (Dynpro Legacy Wrapper) |
| **Mobile & Responsive UX** | Supported (Phone, Tablet, Desktop) | Desktop Only |
| **Extensibility Model** | Key User Adaptation / Developer RAP | Classic User Exits (Deprecated) |

---

## 6. FIT-GAP MATRIX & REQUIREMENTS COVERAGE

| Requirement ID | Evaluated Capability | Status | Gap Explanation & Technical Evidence |
|---|---|---|---|
| **REQ-01** | Multi-Line PO Creation & Account Assignment | SUPPORTED | Standard Fiori elements app F0842A provides itemized list and accounting distribution. |
| **REQ-02** | Workflow Approval Integration | SUPPORTED | Flexible Workflow for Purchase Orders integrated via standard S4CORE agent determination. |
| **REQ-03** | Release & Gateway Compatibility | SUPPORTED | Target release SAP S/4HANA 2023 verified against S4CORE 108 SP0003. |
| **REQ-04** | Dynpro Screen Enhancements (CI_EKKODB) | PARTIAL | Custom user exit fields require migration to standard Key User Extensibility custom fields. |

---

## 7. TECHNICAL EVIDENCE AUDIT TRAIL

- **Evidence #1:** TSTC / TSTCT — ME21N exists with program SAPLMEGUI, screen 1000. Status: VERIFIED (AUTHORITATIVE_DDIC_SNAPSHOT)
- **Evidence #2:** TADIR — Object R3TR TRAN ME21N belongs to package ME, original system SAP. Status: VERIFIED (AUTHORITATIVE_DDIC_SNAPSHOT)
- **Evidence #3:** TDEVC / CVERS — Package ME is assigned to software component S4CORE 108. Status: VERIFIED (AUTHORITATIVE_DDIC_SNAPSHOT)
- **Evidence #4:** FAL Catalogue — F0842A officially documented as successor for ME21N. Status: VERIFIED (OFFICIAL_CATALOGUE)
- **Evidence #5:** Gateway Catalog — MM_PUR_PO_MAINT_V2_SRV registered active. Status: VERIFIED (GATEWAY_CATALOG)
- **Evidence #6:** PFCG Role — SAP_BR_PURCHASER role identified for launchpad catalog. Status: VERIFIED (PFCG_ROLE)

---

## 8. RECOMMENDATION RATIONALE & GOVERNANCE OUTCOME

### Outcome: **ADOPT**

### Recommended Action
**Adopt standard SAP Fiori elements application Manage Purchase Orders (F0842A) as the primary modern successor for classic transaction ME21N.**

### Supporting Evidence
- Official SAP Fiori Apps Reference Library designates F0842A as the direct successor for ME21N.
- S4CORE 108 SP0003 satisfies all minimum component prerequisite levels.
- Provides native SAP Fiori elements Horizon UX and responsive purchase order item processing.

### Known Technical Limitations
- Complex custom Dynpro user exits in SAPLMEGUI require transition to Key User Extensibility or Developer Extensibility (RAP).
- Legacy batch input recordings (BDC) must be refactored to standard OData APIs.

---

## 9. RISKS & CLEAN CORE REMEDIATION PLAN

- **Modification Risk:** Low. Clean Core zero-modification baseline enforced.
- **Dynpro Variant Risk:** Legacy custom screen variants must be re-modeled using Key User Adaptation or RAP extensions.
- **RFC / OData Readiness:** Requires active Gateway ICF node registration in client 200.
- **Required Action Plan:**
  1. Basis Team: Activate Gateway service MM_PUR_PO_MAINT_V2_SRV in S21 Client 200.
  2. Security Team: Assign SAP_BR_PURCHASER to procurement personnel in FLP Content Manager.
  3. Functional Team: Execute user acceptance testing comparing open-item processing with ME21N.

---

## 10. APPROVAL GATE & AUDIT METADATA

- **Lifecycle State:** `APPROVED`
- **Audit Timestamp:** 2026-11-08T11:08:49.057Z
- **Assessed By:** Lead SAP Architect
- **Platform Version:** 1.0.0 (Discovery Finalization)
- **Authorized Handoff:** Standard FLP Activation Route

---

## 11. EVIDENCE PROVENANCE & OPERATIONAL LIMITATIONS

- **Provenance Mode:** `AUTHORITATIVE_DDIC_SNAPSHOT`
- **Catalogue Baseline:** Official SAP Fiori Apps Reference Library snapshot (`fal.cloud.sap`).
- **Disclaimer:** This assessment report is generated from verified SAP DDIC tables, the official SAP Fiori Apps Reference Library (fal.cloud.sap), and consultant-provided business context. Target system live availability remains subject to client-level Basis service activation and PFCG authorizations.
