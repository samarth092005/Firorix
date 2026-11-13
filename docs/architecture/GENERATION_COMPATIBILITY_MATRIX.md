# Fiorify — GENERATION COMPATIBILITY MATRIX & PROFILE CONTRACT (SPRINT S0)

**Document Identifier:** MATRIX-S4H-2023-S0  
**Target Architecture:** SAP S/4HANA 2023 Compatibility Profile Contract  
**Purpose:** Version-Aware Target Compatibility Model for Generation Governance  
**Sprint:** SPRINT S0 (Audit and Design Baseline)  
**Status:** ARCHITECTURALLY CONFIRMED DESIGN CONTRACT  

---

## 1. Compatibility Profile Contract Design

The Fiorify Generation Engine (commencing in GEN-02) requires a deterministic, version-aware **Compatibility Profile** for any target SAP landscape before compiling or outputting application blueprints.

Generating code against generic "S/4HANA" assumptions leads to broken syntax (e.g., using deprecated DDIC SQL views in ABAP Cloud, emitting OData V4 annotations when only V2 Gateway is configured, or relying on RAP actions that require an uninstalled FPS).

### 1.1 Canonical Profile Schema (`TargetCompatibilityProfile`)

```typescript
export type CapabilityStatus = 
  | 'VERIFIED_SUPPORTED'          // Verified on connected live system with empirical proof
  | 'DOCUMENTED_BUT_UNVERIFIED'   // Authoritatively documented by SAP, but unverified on live instance
  | 'UNSUPPORTED'                 // Documented as unsupported for this release
  | 'NOT_TESTED'                  // Check not yet executed
  | 'AUTHORIZATION_BLOCKED'       // Denied by SAP security/authorizations (e.g. 403 Forbidden)
  | 'UNKNOWN';                    // Capability cannot be determined

export interface TargetCompatibilityProfile {
  // System Identity & Landscape Coordinates
  systemId: string;                     // e.g. "S21-200"
  productName: string;                  // e.g. "SAP S/4HANA ON-PREMISE"
  productVersion: string;               // e.g. "2023"
  fpsSpsLevel: string;                  // e.g. "FPS01" or "PENDING_VERIFICATION"
  abapPlatformVersion: string;          // e.g. "2023" (SAP_BASIS 7.58, Kernel 7.93)
  installedComponents: Record<string, string>; // e.g. { S4CORE: "108", SAP_GWFND: "758", SAP_UI: "758" }
  
  // ABAP Language Governance
  abapLanguageVersions: {
    standardAbapSupported: CapabilityStatus;         // Language Version 5
    abapCloudSupported: CapabilityStatus;             // Language Version 7 (ABAP for Cloud Development)
    defaultPackageLanguageVersion: 'ABAP_CLOUD' | 'STANDARD_ABAP' | 'UNKNOWN';
  };

  // ABAP CDS Modeling Capabilities
  cdsCapabilities: {
    viewEntitiesSupported: CapabilityStatus;          // DEFINE VIEW ENTITY
    rootAndProjectionSupported: CapabilityStatus;     // DEFINE ROOT VIEW ENTITY AS PROJECTION ON
    compositionAndAssociations: CapabilityStatus;     // COMPOSITION / ASSOCIATION TO PARENT
    metadataExtensionsSupported: CapabilityStatus;    // ANNOTATE VIEW WITH
    dclAccessControlSupported: CapabilityStatus;      // DEFINE ROLE GRANT SELECT
    aggregateExpressionsSupported: CapabilityStatus;  // Native analytical expressions in View Entities
  };

  // ABAP RAP Behavioral Capabilities
  rapCapabilities: {
    managedRapSupported: CapabilityStatus;            // MANAGED IMPLEMENTATION
    unmanagedRapSupported: CapabilityStatus;          // UNMANAGED IMPLEMENTATION
    draftEnabledScenarios: CapabilityStatus;          // WITH DRAFT
    determinationsSupported: CapabilityStatus;        // DETERMINATION ON MODIFY / SAVE
    validationsSupported: CapabilityStatus;           // VALIDATION ON SAVE
    customActionsSupported: CapabilityStatus;          // ACTION ... RESULT [1] $SELF
    earlyNumberingSupported: CapabilityStatus;        // EARLY NUMBERING
    lateNumberingSupported: CapabilityStatus;         // LATE NUMBERING
    sideEffectsSupported: CapabilityStatus;           // SIDE EFFECTS ANNOTATIONS
  };

  // Service Exposure & Gateway
  odataCapabilities: {
    odataV4Supported: CapabilityStatus;               // ODATA_V4
    odataV2Supported: CapabilityStatus;               // ODATA_V2 (Fallback)
    serviceDefinitionSupported: CapabilityStatus;     // DEFINE SERVICE
    serviceBindingSupported: CapabilityStatus;        // DEFINE SERVICE BINDING
    gatewayV4PublishingActive: CapabilityStatus;      // /IWFND/V4_ADMIN Service Group published
    localServicePreviewSupported: CapabilityStatus;   // ADT Fiori Elements local preview
  };

  // SAP Fiori Elements Frontend
  fioriElementsCapabilities: {
    listReportObjectPageSupported: CapabilityStatus;  // sap.fe.templates.ListReport / ObjectPage
    analyticalListPageSupported: CapabilityStatus;    // sap.fe.templates.AnalyticalListPage
    overviewPageSupported: CapabilityStatus;          // sap.fe.templates.OverviewPage
    draftHandlingSupported: CapabilityStatus;         // Automatic UI draft orchestration
    flexibleColumnLayoutSupported: CapabilityStatus;  // FCL multi-pane layout
  };

  ui5Version: string;                                 // e.g. "1.120.12"

  // Clean Core & Released API Governance
  releasedApiRestrictions: {
    releasedEntitiesAvailable: CapabilityStatus;      // C1 contract availability in ADT
    directDdicTableAccessPermitted: boolean;          // False in Tier 1 ABAP Cloud
    tier1StrictComplianceRequired: boolean;
  };

  // Quality Assurance & ATC
  atcCapabilities: {
    atcSystemActive: CapabilityStatus;                // Active ATC master system
    abapCloudReadinessVariant: CapabilityStatus;       // ABAP_CLOUD_READINESS check variant
    automatedAtcExecutionSupported: CapabilityStatus; // ADT REST ATC run
  };

  // Transport & Lifecycle
  transportCapabilities: {
    ctsTransportRequired: boolean;                    // True for non-temporary packages
    workbenchRequestAvailable: CapabilityStatus;      // Active TRKORR assigned to developer
  };

  // Verification Metadata
  verificationStatus: 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNVERIFIED' | 'REJECTED';
  evidence: string[];                                 // Empirical log strings / proof references
  lastVerifiedAt: string;                             // ISO timestamp
}
```

---

## 2. Technical Compatibility Matrix: S/4HANA 2023 Documented vs. Connected System

Below is the definitive matrix comparing what is documented in official SAP S/4HANA 2023 specifications against what has been empirically verified on the connected repository landscape (System `S21`, Client `200`).

| Architectural Domain | Specific Capability | Official SAP S/4HANA 2023 Documentation Status | Connected System (S21-200) Audit Status | Required Verification Proof |
| :--- | :--- | :--- | :--- | :--- |
| **Platform** | S/4HANA 2023 Core | Documented (FPS00–FPS02) | `DOCUMENTED_BUT_UNVERIFIED` | System Status → S4CORE 108 in SAP GUI |
| **Platform** | ABAP Platform 2023 | Documented (SAP_BASIS 7.58) | `DOCUMENTED_BUT_UNVERIFIED` | Component list SAP_BASIS 758 |
| **Platform** | ABAP Kernel 7.93 | Documented (Kernel 7.93 64-bit) | `DOCUMENTED_BUT_UNVERIFIED` | System Status Kernel release check |
| **Platform** | SAP HANA 2.0 SPS07+ | Documented requirement | `DOCUMENTED_BUT_UNVERIFIED` | System Status DB release check |
| **Governance** | ABAP Cloud (Lang. Ver. 7) | Supported in Platform 2023 | `NOT_TESTED` | ADT Package Language Version attribute |
| **Governance** | Standard ABAP (Lang. Ver. 5)| Supported (Classic on-premise) | `DOCUMENTED_BUT_UNVERIFIED` | SE21 Package check |
| **Connectivity**| ADT REST Discovery | Documented (`/sap/bc/adt/discovery`) | **`AUTHORIZATION_BLOCKED`** | HTTP 403 on `/sap/bc/adt/discovery` (`S_ADT_RES`) |
| **CDS** | CDS View Entities | Supported (Default & Standard) | `DOCUMENTED_BUT_UNVERIFIED` | ADT syntax check of `DEFINE VIEW ENTITY` |
| **CDS** | Root & Projection Views | Supported | `DOCUMENTED_BUT_UNVERIFIED` | ADT activation of projection entity |
| **CDS** | Compositions & Associations | Supported | `DOCUMENTED_BUT_UNVERIFIED` | ADT activation of composition tree |
| **CDS** | Metadata Extensions (MDE) | Supported | `DOCUMENTED_BUT_UNVERIFIED` | ADT activation of `ANNOTATE VIEW` |
| **CDS** | Access Control (DCL) | Supported (`@AccessControl.#CHECK`) | `DOCUMENTED_BUT_UNVERIFIED` | Activation of `DEFINE ROLE` in ADT |
| **RAP** | Managed RAP | Supported | `DOCUMENTED_BUT_UNVERIFIED` | BDEF activation with `managed implementation` |
| **RAP** | Managed with Draft | Supported | `DOCUMENTED_BUT_UNVERIFIED` | BDEF activation with `with draft;` |
| **RAP** | Unmanaged RAP | Supported | `DOCUMENTED_BUT_UNVERIFIED` | BDEF activation with `unmanaged implementation` |
| **RAP** | Determinations & Validations | Supported (`on modify`, `on save`) | `DOCUMENTED_BUT_UNVERIFIED` | Local behavior handler compilation |
| **RAP** | Actions & Operations | Supported | `DOCUMENTED_BUT_UNVERIFIED` | Custom action execution via ADT preview |
| **RAP** | Locking & Concurrency | Supported (`lock master`, `etag`) | `DOCUMENTED_BUT_UNVERIFIED` | Multi-user draft lock verification |
| **Service** | Service Definition (`SRVD`)| Supported | `DOCUMENTED_BUT_UNVERIFIED` | Activation of `define service` in ADT |
| **Service** | Service Binding (`SRVB`) | Supported | `DOCUMENTED_BUT_UNVERIFIED` | Service binding generation in ADT |
| **Service** | OData V4 - UI Binding | Supported (Recommended) | `DOCUMENTED_BUT_UNVERIFIED` | Publication in `/IWFND/V4_ADMIN` |
| **Service** | OData V2 - UI Binding | Supported (Fallback) | **`VERIFIED_SUPPORTED`** | S21 Gateway V2 Catalog responded HTTP 200 |
| **Service** | Local ADT Service Preview | Supported in ADT 3.36+ | `NOT_TESTED` | Fiori Elements preview launch in Eclipse |
| **Frontend** | Fiori Elements V4 LROP | Supported (SAPUI5 1.120 LTS) | `DOCUMENTED_BUT_UNVERIFIED` | UI5 tooling build and runtime execution |
| **Quality** | ATC ABAP Cloud Readiness | Supported (`ABAP_CLOUD_READINESS`) | `PENDING_BASIS` | Transaction ATC variant execution check |
| **Transport**| CTS Workbench Transport | Supported (`TRKORR`) | `NOT_TESTED` | Transaction SE09 transport creation test |

---

## 3. Evaluation of Connected Landscapes in Fiorify Repository

The Fiorify repository contains configuration for three distinct landscape identifiers across `backend/src/adapters/systemRegistry.js` and `data/systems.csv`:

### 3.1 Landscape 1: `S21-200` (Primary Live SAP Target)
- **Declared Configuration:** SAP S/4HANA 2023 Private Edition, Client 200, Virtual Host `http://kbl_fiori:8000`.
- **Connectivity Status:** Configured via BTP Destination `S21` with OnPremise proxy.
- **Empirical Audit Findings in Sprint S0:**
  1. **Gateway OData V2 Catalog:** Service Collection `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection` was successfully reached in previous discovery runs, confirming Gateway V2 is present and accessible.
  2. **ADT Probing:** HTTP request to `/sap/bc/adt/discovery` responded with `HTTP 403 Forbidden` (`SADT_RESOURCE_003: No authorization to access the resource`).
  3. **Object Creation & Activation:** Zero repository objects have been created, activated, or tested on S21 in this sprint.
- **Compatibility Verdict:** **`PARTIALLY_VERIFIED`** (Discovery read-only accessible; ADT and generation write capabilities are `AUTHORIZATION_BLOCKED`).

### 3.2 Landscape 2: `S4H-DEV-200` (Offline Mock Benchmark)
- **Declared Configuration:** Mock S/4HANA 2023 Development sandbox.
- **Compatibility Verdict:** **`NOT_TESTED` (Mock Only)**. Used exclusively for local offline testing and demo unit suites. Does not constitute live SAP evidence.

### 3.3 Landscape 3: `S21-200-DEMO` (Offline Fallback Landscape)
- **Declared Configuration:** In-memory demonstration sandbox.
- **Compatibility Verdict:** **`NOT_TESTED` (Mock Only)**.

---

## 4. Generation Gate Rules Enforced by Compatibility Profile

Before the GEN-02 Generation Engine may create a generation project or compile an application blueprint, the following gate rules must evaluate to `TRUE`:

```
RULE GEN-GATE-01: No Generation Without Verified Profile
IF targetProfile.verificationStatus == 'REJECTED' OR targetProfile.verificationStatus == 'UNVERIFIED'
  THEN REJECT Generation Request with HTTP 412 (Precondition Failed: Target Landscape Unverified).

RULE GEN-GATE-02: OData V4 vs V2 Protocol Routing
IF targetProfile.odataCapabilities.odataV4Supported == 'VERIFIED_SUPPORTED'
  THEN Select Protocol: ODATA_V4
ELSE IF targetProfile.odataCapabilities.odataV2Supported == 'VERIFIED_SUPPORTED'
  THEN Select Protocol: ODATA_V2_FALLBACK
ELSE
  THEN REJECT Generation Request (No verified Gateway protocol available).

RULE GEN-GATE-03: ABAP Cloud Syntax Enforcement
IF targetProfile.abapLanguageVersions.defaultPackageLanguageVersion == 'ABAP_CLOUD'
  THEN ENFORCE:
    - Zero DDIC SQL view names (@AbapCatalog.sqlViewName forbidden)
    - Metadata extensions mandatory for UI annotations
    - Only released CDS entities in associations (e.g. I_Currency, I_Customer)
    - Zero direct access to unreleased standard tables (VBAK, EKKO, BKPF)
```
