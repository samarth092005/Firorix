# FioriX Generation Studio — End-to-End Operational Guide

**Platform:** FioriX — SAP Modernization Platform  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (System S21, Client 200)  
**Baseline:** SAP_BASIS 7.58, SAP_UI 7.58, SAPUI5 1.120.0 (FPS01 LTS) / 1.114.0 (FPS00)  
**Access Model:** Authenticated FioriX Administrator  
**Deployment Policy:** STRICTLY OFFLINE — Zero Remote Repository Writes, Zero CTS Transports  

---

## 1. Introduction

FioriX Generation Studio is an enterprise workbench that transforms confirmed SAP business requirements and discovery assessments into clean, production-grade ABAP RESTful Application Programming Model (RAP) backend code and SAP Fiori Elements (OData V4) user interfaces.

The Studio operates entirely local-first. All generated artifacts are preserved as reviewable drafts in the canonical project repository, verified via in-process local mock preview, audited via an end-to-end Traceability Matrix, and packaged into standard PKZIP archives for developer review in Eclipse ADT.

---

## 2. End-to-End User Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       FIORIX GENERATION STUDIO LIFECYCLE                     │
│                                                                             │
│  Phase 1: Project Foundation (GEN-02)                                       │
│  Create Project from BUILD Assessment ───► Canonical Persistence Store      │
│                                                                             │
│  Phase 2: Requirements Designer (GEN-03)                                    │
│  Import Assessment Scope ───► Review & Confirm Requirements                 │
│                                                                             │
│  Phase 3: Data Model Designer (GEN-04)                                      │
│  Define Entities, Fields & Associations ───► CDS Data Model Validation      │
│                                                                             │
│  Phase 4: Architecture Designer (GEN-05)                                    │
│  Evaluate RAP Scenario Profile (Managed with Draft vs Read-Only Query)      │
│                                                                             │
│  Phase 5: ABAP Generator (GEN-05)                                           │
│  Synthesize Tables, CDS Entities, BDEF, Behavior Pool & Service Definition  │
│                                                                             │
│  Phase 6: Fiori UI Generator (GEN-06)                                       │
│  Synthesize List Report / Object Page Manifest, Annotations & Mock Data     │
│                                                                             │
│  Phase 7: Local Preview (GEN-07)                                            │
│  In-Process Mock Server (Ports 4050-4099) ───► Interactive IFrame Preview   │
│                                                                             │
│  Phase 8: Review & Export (GEN-08)                                          │
│  Governance Validation ───► Traceability Matrix ───► PKZIP Archive Download │
│                                                                             │
│  Toolchain & Readiness (GEN-09)                                             │
│  Workstation Diagnostics ───► Step-by-Step Eclipse ADT Handover Guide       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Phase Instructions

### Phase 1: Project Foundation (GEN-02)
1. Open **Generation Studio** from the primary navigation bar.
2. Click **Create Project**.
3. Select an approved BUILD assessment (e.g. Finance Pilot: F-53, F-28, or Purchasing) or choose Standalone mode.
4. Specify Project Name, Description, Target System (`S21`), and Client (`200`).
5. Click **Create Project Workspace**. The project is initialized in the canonical directory `backend/data/generation-projects/<projectId>/`.

### Phase 2: Requirements Designer (GEN-03)
1. Navigate to the **Requirements Designer** tab.
2. Review imported functional requirements and gap items.
3. Categorize requirements by type (`FUNCTIONAL`, `UI_FIELD`, `ACTION`, `VALIDATION`).
4. Click **Confirm Scope**. Only confirmed requirements are consumed by the downstream architecture and generation engines.

### Phase 3: Data Model Designer (GEN-04)
1. Navigate to the **Data Model Designer** tab.
2. Define Root entities and Child composition entities.
3. Configure field names, business descriptions, ABAP Dictionary data types (`abap.char`, `abap.dec`, `abap.dats`, etc.), and key indicators.
4. Establish compositions (`1..*`) and associations to released SAP views.
5. Click **Validate Data Model** to ensure syntax and structural integrity.

### Phase 4: RAP Architecture Designer (GEN-05)
1. Navigate to the **Architecture Designer** tab.
2. The Architecture Decision Engine deterministically analyzes the confirmed requirements and data model to propose the appropriate RAP profile:
   - `MANAGED_RAP_WITH_DRAFT`: For transactional multi-step editing.
   - `MANAGED_RAP_DIRECT`: For direct immediate transactional commits.
   - `UNMANAGED_RAP`: For wrapping legacy BAPIs or external persistence.
   - `READ_ONLY_QUERY`: For analytical dashboards and report lists.
3. Review draft table recommendations, lock strategy, ETag fields, and authorization strategy.
4. Confirm the architecture baseline.

### Phase 5: ABAP Generator (GEN-05)
1. Navigate to the **ABAP Generator** tab.
2. Click **Generate ABAP Cloud Artifacts**.
3. Inspect generated definitions:
   - Database Tables (`abap/tables/*.tabl.sql`)
   - CDS Interface Views (`abap/cds/ZI_*.ddls.asddls`)
   - CDS Consumption Views (`abap/cds/ZC_*.ddls.asddls`)
   - Behavior Definitions (`abap/behavior/ZR_*.bdef.asbdef`)
   - Behavior Implementation Pools (`abap/behavior_classes/ZBP_*.clas.abap`)
   - Service Definitions (`abap/services/ZUI_*.srvd.srvdsrv`)
4. Any manual code edits made in the code viewer are preserved across regeneration runs via SHA-256 fingerprint tracking.

### Phase 6: Fiori UI Generator (GEN-06)
1. Navigate to the **Fiori UI Generator** tab.
2. Select target SAPUI5 baseline:
   - `1.120.0` (Recommended: SAP S/4HANA 2023 FPS01 LTS)
   - `1.114.0` (SAP S/4HANA 2023 FPS00 Initial Shipment)
3. Click **Generate Fiori Elements Application**.
4. Review generated `manifest.json`, `Component.js`, UI metadata extensions (`.ddlx`), and local mock data sets.

### Phase 7: Local Preview & Mock OData V4 (GEN-07)
1. Navigate to the **Preview & Validation** tab.
2. Click **Launch Local Preview Server**.
3. An in-process Node.js HTTP server starts on loopback `127.0.0.1` (using a port between 4050 and 4099).
4. Interact with the live Fiori Elements application inside the embedded frame:
   - Test table sorting, column filtering, search, and navigation to the Object Page.
   - Verify that the mandatory red watermark is visible at the top:
     `LOCAL MOCK PREVIEW — SYNTHETIC DATA ONLY — NOT CONNECTED TO SAP S21`
5. Inspect the live request telemetry log at the bottom to verify OData V4 URLs and response statuses.
6. Click **Reset Data** at any time to restore the synthetic in-memory store.

### Phase 8: Review & Export Packaging (GEN-08)
1. Navigate to the **Review & Export** tab.
2. Inspect the **Pre-Export Governance & Static Validation Gates**:
   - Zero blocking errors must be present.
   - Any non-blocking warnings must be explicitly acknowledged via the acknowledgment checkbox.
3. Review the **Traceability Matrix**:
   - Verify requirement-to-code mapping and coverage percentages.
   - Confirm the composite Traceability Index.
4. Click **Package & Download Project ZIP**.
5. The system deterministically packages all ABAP, Fiori, and documentation files into `FioriX_<projectId>_<timestamp>.zip` along with `fiorix-export-manifest.json` containing SHA-256 checksums.

### Developer Handover & Workstation Toolchain (GEN-09)
1. Navigate to the **Environment & Toolchain** tab.
2. Review the workstation inventory (Node.js, Java JDK, Eclipse IDE, ADT plugin, SAP GUI).
3. Follow the 8-step **ABAP Developer Handover Guide** to import the generated tables, CDS views, behavior definitions, and service definitions into Eclipse ADT pointing to `S21`, Client `200`.
4. Follow the 4-step **Fiori Developer Handover Guide** to run the local UI5 preview and deploy the application via standard SAP tools.
