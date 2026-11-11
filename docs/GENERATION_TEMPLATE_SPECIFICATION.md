# FIORIX — GENERATION TEMPLATE & DATA MODEL SPECIFICATION

**Document ID:** SPEC-GEN-2026-01  
**Project:** FioriX — SAP Modernization Platform  
**Target Architecture:** SAP S/4HANA & SAP BTP ABAP Environment  
**Pattern:** SAP Fiori Elements List Report + Object Page (OData V4)  
**Clean Core Standard:** Tier 1 Developer Extensibility (Cloud-Ready RAP)  
**Status:** SPECIFICATION APPROVED — IMPLEMENTATION TEMPLATE  

---

## 1. Supported Template Scope & Architecture Pattern

The initial release of FioriX Generation Studio focuses on the most prevalent, robust, and clean-core-compliant enterprise pattern:

> **SAP Fiori Elements List Report and Object Page using OData V4**  
> Backed by a **Managed RAP Business Object with Draft Capabilities**.

### Generated Project Output Hierarchy
```
generated-project/
├── abap/
│   ├── cds/
│   │   ├── Z_I_{Entity}Root.cds        # Data Model: CDS Root View Entity
│   │   ├── Z_I_{Entity}Item.cds        # Data Model: CDS Child Composition View Entity
│   │   └── Z_C_{Entity}Manage.cds      # Projection: CDS Consumption View Entity (UI Annotations)
│   ├── behavior/
│   │   ├── Z_I_{Entity}Root.bdef       # RAP Behavior Definition (Managed with Draft, strict(2))
│   │   └── Z_C_{Entity}Manage.bdef     # RAP Projection Behavior Definition (use draft, use etag)
│   ├── dcl/
│   │   ├── Z_I_{Entity}Root.dcl        # Access Control: Row-level security for Root Entity
│   │   └── Z_C_{Entity}Manage.dcl      # Access Control: Row-level security for Projection View
│   ├── srvd/
│   │   └── ZSD_{Entity}.srvd           # RAP Service Definition exposing projection views
│   └── srvb/
│       └── ZSB_{Entity}_V4.srvb.json   # Service Binding configuration proposal (OData V4 - UI)
├── ui5/
│   ├── ui5.yaml                        # SAP UI5 Tooling configuration
│   └── webapp/
│       ├── manifest.json               # Modern Fiori Elements OData V4 Application Descriptor
│       ├── Component.js                # Fiori Elements Component extension
│       └── i18n/
│           └── i18n.properties         # Translatable UI labels, facet titles, and action texts
├── generation-manifest.json            # SHA-256 cryptographic provenance & artifact inventory
└── validation-report.md                # Static compliance & Clean Core audit report
```

### Classification of Generated Deliverables
To avoid misleading developers into believing that FioriX executes automated activation, all artifacts are explicitly categorized:
1. **Source Code Files (Ready for ADT / abapGit import):** `.cds`, `.bdef`, `.dcl`, `.srvd`, `manifest.json`, `Component.js`, `i18n.properties`.
2. **Configuration Proposals (Reviewable metadata templates):** `.srvb.json` (Service Binding proposal; requires manual activation in ADT), `ui5.yaml`.
3. **Audit & Governance Manifests (Read-only records):** `generation-manifest.json`, `validation-report.md`.

---

## 2. SAP Technical Validity & Syntax Specification

All ABAP artifacts adhere strictly to **ABAP Cloud Language Version 5** (`#ABAP_FOR_CLOUD_DEVELOPMENT`) or **Standard ABAP** with Clean Core Tier 1 constraints.

### 2.1 ABAP CDS Root View Entity (`Z_I_{Entity}Root.cds`)
* **Syntax Requirement:** Must use `define root view entity` (introduced in SAP S/4HANA 2020 / ABAP 7.55). Never generate obsolete `define view` with `@AbapCatalog.sqlViewName`.
* **Sample Template Output:**
```abap
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Sales Dispute Root Interface View'
@Metadata.allowExtensions: true
define root view entity Z_I_SalesDisputeRoot
  as select from zsales_dispute as Header
  composition [0..*] of Z_I_SalesDisputeItem as _Items
  association [0..1] to I_Customer as _Customer
    on $projection.Customer = _Customer.Customer
  association [0..1] to I_CompanyCode as _CompanyCode
    on $projection.CompanyCode = _CompanyCode.CompanyCode
{
  key Header.dispute_uuid       as DisputeUUID,
      Header.dispute_id         as DisputeID,
      Header.company_code       as CompanyCode,
      Header.customer           as Customer,
      Header.dispute_status     as DisputeStatus,
      @Semantics.amount.currencyCode: 'Currency'
      Header.disputed_amount    as DisputedAmount,
      Header.currency           as Currency,
      Header.reason_code        as ReasonCode,
      Header.priority           as Priority,
      @Semantics.systemDateTime.createdAt: true
      Header.created_at         as CreatedAt,
      @Semantics.user.createdBy: true
      Header.created_by         as CreatedBy,
      @Semantics.systemDateTime.lastChangedAt: true
      Header.last_changed_at    as LastChangedAt,
      @Semantics.systemDateTime.localInstanceLastChangedAt: true
      Header.local_last_changed_at as LocalLastChangedAt,

      // Associations
      _Items,
      _Customer,
      _CompanyCode
}
```

### 2.2 ABAP CDS Child Composition View Entity (`Z_I_{Entity}Item.cds`)
* **Syntax Requirement:** Must define `association to parent` and point back to the root entity.
* **Sample Template Output:**
```abap
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Sales Dispute Item Interface View'
define view entity Z_I_SalesDisputeItem
  as select from zdispute_item as Item
  association to parent Z_I_SalesDisputeRoot as _DisputeHeader
    on $projection.DisputeUUID = _DisputeHeader.DisputeUUID
{
  key Item.item_uuid            as ItemUUID,
      Item.dispute_uuid         as DisputeUUID,
      Item.item_position        as ItemPosition,
      Item.billing_document     as BillingDocument,
      @Semantics.amount.currencyCode: 'Currency'
      Item.item_amount          as ItemAmount,
      Item.currency             as Currency,
      Item.item_status          as ItemStatus,

      _DisputeHeader
}
```

### 2.3 ABAP CDS Projection View Entity (`Z_C_{Entity}Manage.cds`)
* **Syntax Requirement:** Must specify `provider contract transactional_query`. Projections isolate the consumption contract from the persistence model and host `@UI` annotations.
* **Sample Template Output:**
```abap
@AccessControl.authorizationCheck: #CHECK
@EndUserText.label: 'Manage Sales Disputes - Projection View'
@Metadata.allowExtensions: true
@Search.searchable: true

@UI: {
  headerInfo: {
    typeName: 'Sales Dispute',
    typeNamePlural: 'Sales Disputes',
    title: { type: #STANDARD, value: 'DisputeID' },
    description: { value: 'DisputeStatus' }
  }
}
define root view entity Z_C_SalesDisputeManage
  provider contract transactional_query
  as projection on Z_I_SalesDisputeRoot
{
  @UI.facet: [
    { id: 'DisputeHeaderFacet', purpose: #STANDARD, type: #IDENTIFICATION_REFERENCE, label: 'General Information', position: 10 },
    { id: 'DisputeItemsFacet', purpose: #STANDARD, type: #LINEITEM_REFERENCE, label: 'Line Items', position: 20, targetElement: '_Items' }
  ]

  key DisputeUUID,

  @UI: {
    lineItem: [{ position: 10, importance: #HIGH }],
    identification: [{ position: 10 }],
    selectionField: [{ position: 10 }]
  }
  @Search.defaultSearchElement: true
  DisputeID,

  @UI: {
    lineItem: [{ position: 20, importance: #HIGH }],
    identification: [{ position: 20 }],
    selectionField: [{ position: 20 }]
  }
  CompanyCode,

  @UI: {
    lineItem: [{ position: 30, importance: #HIGH }],
    identification: [{ position: 30 }],
    selectionField: [{ position: 30 }]
  }
  @Consumption.valueHelpDefinition: [{ entity: { name: 'I_Customer', element: 'Customer' } }]
  Customer,

  @UI: {
    lineItem: [{ position: 40, importance: #MEDIUM }],
    identification: [{ position: 40 }],
    selectionField: [{ position: 40 }]
  }
  DisputeStatus,

  @UI: {
    lineItem: [{ position: 50, importance: #HIGH }],
    identification: [{ position: 50 }]
  }
  DisputedAmount,

  Currency,

  @UI.identification: [{ position: 60 }]
  ReasonCode,

  @UI.lineItem: [{ position: 70, importance: #LOW }]
  CreatedAt,

  LocalLastChangedAt,

  // Compositions
  _Items : redirected to composition child Z_C_SalesDisputeItemManage,
  _Customer,
  _CompanyCode
}
```

### 2.4 RAP Behavior Definition (`Z_I_{Entity}Root.bdef`)
* **Syntax Requirement:** Must declare `managed implementation in class zbp_i_{entity}root unique; with draft; strict(2);`. `strict(2)` enforces full Clean Core strictness (available on S/4HANA 2022+ / Cloud).
* **Sample Template Output:**
```abap
managed implementation in class zbp_i_salesdisputeroot unique;
strict ( 2 );
with draft;

define behavior for Z_I_SalesDisputeRoot alias DisputeHeader
persistent table zsales_dispute
draft table zsales_dispute_d
lock master
total etag LastChangedAt
authorization master ( instance )
etag master LocalLastChangedAt
{
  create;
  update;
  delete;
  association _Items { create; with draft; }

  draft action Edit;
  draft action Activate optimized;
  draft action Discard;
  draft action Resume;
  draft determine action Prepare {
    validation validateDates;
    validation validateCustomer;
  }

  field ( numbering : managed, readonly ) DisputeUUID;
  field ( readonly ) DisputeID, CreatedAt, CreatedBy, LastChangedAt;
  field ( mandatory ) CompanyCode, Customer, DisputedAmount, Currency;

  action ( features : instance ) resolveDispute result [1] $self;
  action ( features : instance ) escalateDispute result [1] $self;

  validation validateCustomer on save { field Customer; create; }
  validation validateDates on save { create; update; }

  mapping for zsales_dispute
  {
    DisputeUUID = dispute_uuid;
    DisputeID = dispute_id;
    CompanyCode = company_code;
    Customer = customer;
    DisputeStatus = dispute_status;
    DisputedAmount = disputed_amount;
    Currency = currency;
    ReasonCode = reason_code;
    Priority = priority;
    CreatedAt = created_at;
    CreatedBy = created_by;
    LastChangedAt = last_changed_at;
    LocalLastChangedAt = local_last_changed_at;
  }
}

define behavior for Z_I_SalesDisputeItem alias DisputeItem
persistent table zdispute_item
draft table zdispute_item_d
lock dependent by _DisputeHeader
authorization dependent by _DisputeHeader
etag master ItemUUID
{
  update;
  delete;
  association _DisputeHeader { with draft; }

  field ( numbering : managed, readonly ) ItemUUID;
  field ( readonly ) DisputeUUID;
  field ( mandatory ) BillingDocument, ItemAmount, Currency;

  mapping for zdispute_item
  {
    ItemUUID = item_uuid;
    DisputeUUID = dispute_uuid;
    ItemPosition = item_position;
    BillingDocument = billing_document;
    ItemAmount = item_amount;
    Currency = currency;
    ItemStatus = item_status;
  }
}
```

### 2.5 RAP Projection Behavior Definition (`Z_C_{Entity}Manage.bdef`)
* **Syntax Requirement:** Uses `projection; strict(2); use draft;`.
* **Sample Template Output:**
```abap
projection;
strict ( 2 );
use draft;

define behavior for Z_C_SalesDisputeManage alias DisputeHeader
{
  use create;
  use update;
  use delete;

  use action Edit;
  use action Activate;
  use action Discard;
  use action Resume;
  use action Prepare;

  use action resolveDispute;
  use action escalateDispute;

  use association _Items { create; with draft; }
}

define behavior for Z_C_SalesDisputeItemManage alias DisputeItem
{
  use update;
  use delete;

  use association _DisputeHeader { with draft; }
}
```

### 2.6 ABAP Access Control DCL (`Z_I_{Entity}Root.dcl`)
* **Syntax Requirement:** Must use `define role` and map PFCG authorization objects via `aspect pfcg_auth`.
* **Sample Template Output:**
```abap
@EndUserText.label: 'Access Control for Sales Dispute'
@MappingRole: true
define role Z_I_SalesDisputeRoot {
  grant select on Z_I_SalesDisputeRoot
  where ( CompanyCode ) = aspect pfcg_auth( F_BKPF_BUK, BUKRS, ACTVT = '03' );
}
```

### 2.7 RAP Service Definition (`ZSD_{Entity}.srvd`)
* **Syntax Requirement:** Must declare `define service` exposing the projection entities and relevant C1 value helps.
* **Sample Template Output:**
```abap
@EndUserText.label: 'Service Definition for Manage Sales Disputes'
define service ZSD_SALES_DISPUTE {
  expose Z_C_SalesDisputeManage as DisputeHeader;
  expose Z_C_SalesDisputeItemManage as DisputeItem;
  expose I_Customer as CustomerVH;
  expose I_CompanyCode as CompanyCodeVH;
}
```

### 2.8 UI5 Fiori Elements Application Descriptor (`webapp/manifest.json`)
* **Syntax Requirement:** Modern UI5 descriptor for OData V4 (`settings.odataVersion: "4.0"`), referencing `sap.fe.templates.ListReport` and `sap.fe.templates.ObjectPage`.
* **Sample Template Output:**
```json
{
  "_version": "1.49.0",
  "sap.app": {
    "id": "zcustom.salesdispute.manage",
    "type": "application",
    "i18n": "i18n/i18n.properties",
    "applicationVersion": { "version": "1.0.0" },
    "title": "{{appTitle}}",
    "description": "{{appDescription}}",
    "dataSources": {
      "mainService": {
        "uri": "/sap/opu/odata4/sap/zsb_sales_dispute_v4/srvd/sap/zsd_sales_dispute/0001/",
        "type": "OData",
        "settings": {
          "annotations": [],
          "odataVersion": "4.0",
          "localAnnotations": []
        }
      }
    }
  },
  "sap.ui5": {
    "dependencies": {
      "minUI5Version": "1.108.0",
      "libs": {
        "sap.m": {},
        "sap.ui.core": {},
        "sap.fe.templates": {}
      }
    },
    "routing": {
      "routes": [
        {
          "name": "DisputeListReport",
          "pattern": ":?query:",
          "target": "DisputeListReportTarget"
        },
        {
          "name": "DisputeObjectPage",
          "pattern": "DisputeHeader({key}):?query:",
          "target": "DisputeObjectPageTarget"
        }
      ],
      "targets": {
        "DisputeListReportTarget": {
          "type": "Component",
          "id": "DisputeListReportComponent",
          "name": "sap.fe.templates.ListReport",
          "options": {
            "settings": {
              "contextPath": "/DisputeHeader",
              "variantManagement": "Page"
            }
          }
        },
        "DisputeObjectPageTarget": {
          "type": "Component",
          "id": "DisputeObjectPageComponent",
          "name": "sap.fe.templates.ObjectPage",
          "options": {
            "settings": {
              "contextPath": "/DisputeHeader"
            }
          }
        }
      }
    }
  }
}
```

---

## 3. SAP Release Compatibility Matrix

The template compiler enforces syntax variations based on the target release:

| S/4HANA Release | ABAP Version | CDS View Entity | Strict Syntax Mode | OData V4 UI Binding | Provider Contract |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **S/4HANA 2020** | ABAP 7.55 | Supported (`define root view entity`) | `strict` | Supported | `provider contract transactional_query` |
| **S/4HANA 2021** | ABAP 7.56 | Supported | `strict` | Supported | `provider contract transactional_query` |
| **S/4HANA 2022** | ABAP 7.57 | Supported | `strict ( 2 )` | Supported | `provider contract transactional_query` |
| **S/4HANA 2023** | ABAP 7.58 | Supported | `strict ( 2 )` | Supported | `provider contract transactional_query` |
| **SAP BTP ABAP** | Steampunk | Supported | `strict ( 2 )` | Supported | `provider contract transactional_query` |

---

## 4. Structured Data Model Schema for Interactive Editing

Prior to generating code, the user reviews and edits the data model in the Generation Studio UX. The interactive model adheres to this schema:

```typescript
export interface DataModelFieldDefinition {
  fieldName: string;            // e.g. "DisputedAmount"
  abapFieldName: string;        // e.g. "disputed_amount"
  abapDataType: 'CHAR' | 'NUMC' | 'DEC' | 'DATS' | 'TIMS' | 'CUKY' | 'RAW' | 'UUID';
  length?: number;
  decimals?: number;
  isKey: boolean;
  isMandatory: boolean;
  isReadOnly: boolean;
  currencyOrUnitField?: string; // For @Semantics.amount.currencyCode
  label: string;
  uiPosition?: {
    lineItem?: number;
    selectionField?: number;
    facetGroup?: string;
    facetPosition?: number;
  };
  valueHelpEntity?: string;     // e.g. "I_Customer"
  valueHelpElement?: string;    // e.g. "Customer"
  isVerifiedInTargetSystem: boolean; // Flagged true only if verified in target SAP system
}

export interface BusinessEntityDefinition {
  entityName: string;           // e.g. "Z_I_SalesDisputeRoot"
  aliasName: string;            // e.g. "DisputeHeader"
  description: string;
  isRoot: boolean;
  parentEntityName?: string;
  underlyingTable: string;      // e.g. "zsales_dispute" (Marked as proposed)
  draftTable: string;           // e.g. "zsales_dispute_d"
  primaryKeys: string[];
  fields: DataModelFieldDefinition[];
  associations: {
    targetEntity: string;
    cardinality: '[0..1]' | '[1..1]' | '[0..*]' | '[1..*]';
    joinCondition: string;
    isC1Released: boolean;
  }[];
  compositions: {
    childEntity: string;
    cardinality: '[0..*]' | '[1..*]';
    alias: string;
  }[];
  validations: {
    validationName: string;
    triggerFields: string[];
    description: string;
  }[];
  determinations: {
    determinationName: string;
    triggerFields: string[];
    timing: 'ON_MODIFY' | 'ON_SAVE';
    description: string;
  }[];
  actions: {
    actionName: string;
    isInstance: boolean;
    resultCardinality: '[1]' | '[0..1]' | '[0..*]';
    description: string;
  }[];
  authorizationRules: {
    authorizationObject: string;
    fieldMappings: Record<string, string>;
    activity: string;
  }[];
}
```

### Verification Safeguard for Unknown Source Objects
- When the legacy transaction references database tables or structures that are not in the verified Master Index or SAP released C1 dictionary, the field/entity is flagged with `isVerifiedInTargetSystem: false`.
- The Generation Studio displays a warning chip: **`Requires Target Sandbox Verification`**.
- FioriX never invents fictitious table names or pretends an unreleased table is Clean Core compliant.
