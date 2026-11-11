# GEN-05: ABAP Artifact Contract Specification
## Formal Schema, Naming Conventions & SAP S/4HANA Compatibility

### 1. Artifact Classification & Directory Hierarchy

All generated ABAP artifacts follow a standardized directory structure within the project artifact registry:

```text
abap/
├── tables/
│   ├── z<entity>.tabl.xml         (Transparent Database Table)
│   └── z<entity>_d.tabl.xml       (Draft Staging Table)
├── cds/
│   ├── zi_<entity>.ddls.asddls    (Clean Core Interface CDS View Entity)
│   ├── zc_<entity>.ddls.asddls    (Transactional Projection View Entity)
│   └── zc_<entity>.mde.asddls     (CDS Metadata Extension)
├── behaviors/
│   ├── zi_<entity>.bdef.asbdef    (Interface Behavior Definition)
│   └── zc_<entity>.bdef.asbdef    (Projection Behavior Definition)
├── classes/
│   └── bp_i_<entity>.clas.abap    (Behavior Pool / Local Handler Class)
├── services/
│   ├── zui_<entity>_o4.srvd.asdsrv (Service Definition)
│   └── zui_<entity>_o4.srvb.json   (Service Binding Activation Proposal)
├── access/
│   └── zi_<entity>.dcls.asdcls    (DCL Data Control Language Role)
└── README_ABAP.md                 (ADT Import & Activation Guide)
```

---

### 2. Formal Artifact Specifications

#### 2.1 Transparent Database Table (`TABLE_DEFINITION`)
- **Naming Convention:** `Z<NAME>` (max 16 alphanumeric characters, uppercase in SAP DDIC).
- **File Extension:** `.tabl.xml` (or `.tabl.asddls` dictionary representation).
- **Mandatory Fields:**
  - `client`: `abap.clnt` (Key)
  - Semantic/UUID Keys: `abap.raw(16)` or typed business keys
  - Administrative Audit Block: `local_created_by`, `local_created_at`, `local_last_changed_by`, `local_last_changed_at`, `last_changed_at` (ETag master).
- **Target Release:** SAP S/4HANA 2023 On-Premise FPS00.

#### 2.2 CDS Interface View Entity (`CDS_INTERFACE_VIEW`)
- **Naming Convention:** `ZI_<EntityName>` (max 30 characters).
- **File Extension:** `.ddls.asddls`
- **Clean Core Rule:** Must use `define view entity ZI_<Name>` (NEVER `define view ... with @AbapCatalog.sqlViewName`).
- **Annotations:**
  - `@AccessControl.authorizationCheck: #CHECK`
  - `@EndUserText.label: '<Entity Description>'`
- **Compositions & Associations:**
  - `composition [0..*] of ZI_<Child> as _Items`
  - `association to parent ZI_<Parent> as _Header`

#### 2.3 CDS Projection View Entity (`CDS_PROJECTION_VIEW`)
- **Naming Convention:** `ZC_<EntityName>` (max 30 characters).
- **File Extension:** `.ddls.asddls`
- **Syntax:**
  ```sql
  @AccessControl.authorizationCheck: #CHECK
  @Metadata.allowExtensions: true
  @Search.searchable: true
  define root view entity ZC_PaymentHeader
    provider contract transactional_query
    as projection on ZI_PaymentHeader
  ```
- **Draft Action Redirects:**
  - `redirected to composition child ZC_PaymentItem`

#### 2.4 CDS Metadata Extension (`CDS_METADATA_EXTENSION`)
- **Naming Convention:** `ZC_<EntityName>.mde.asddls`
- **File Extension:** `.mde.asddls`
- **Annotations:**
  - `@Metadata.layer: #CUSTOMER`
  - `@UI.headerInfo.typeName: '<Entity>'`
  - `@UI.facet: [ ... ]`
  - `@UI.lineItem: [ { position: 10, importance: #HIGH } ]`
  - `@UI.identification: [ { position: 10 } ]`

#### 2.5 RAP Behavior Definition (`RAP_BEHAVIOR_DEFINITION`)
- **Naming Convention:** `ZI_<EntityName>` (and projection `ZC_<EntityName>`).
- **File Extension:** `.bdef.asbdef`
- **Syntax Requirements:**
  ```abap
  managed implementation in class bp_i_paymentheader unique;
  strict ( 2 );
  with draft;

  define behavior for ZI_PaymentHeader alias Header
  persistent table zpay_header
  draft table zpay_header_d
  lock master total etag LastChangedAt
  authorization master ( instance )
  etag master LocalLastChangedAt
  {
    create; update; delete;
    association _Items { create; with draft; }
    draft action Edit;
    draft action Activate optimized;
    draft action Discard;
    draft action Resume;
    draft determine action Prepare;
  }
  ```

#### 2.6 Behavior Handler Class (`BEHAVIOR_IMPLEMENTATION`)
- **Naming Convention:** `BP_I_<EntityName>` (max 30 characters).
- **File Extension:** `.clas.abap`
- **Method Length Rule:** Local method names are strictly capped at 30 characters.
- **Structure:**
  - Global declaration: `CLASS bp_i_paymentheader DEFINITION PUBLIC ABSTRACT FINAL FOR BEHAVIOR OF zi_paymentheader. ENDCLASS.`
  - Local handler: `CLASS lhc_header DEFINITION INHERITING FROM cl_abap_behavior_handler.`

#### 2.7 Service Definition (`SERVICE_DEFINITION`)
- **Naming Convention:** `ZUI_<EntityName>_O4` (max 30 characters).
- **File Extension:** `.srvd.asdsrv`
- **Syntax:**
  ```abap
  @EndUserText.label: 'Service Definition for Payment Modernization'
  define service ZUI_PaymentHeader_O4 {
    expose ZC_PaymentHeader as PaymentHeader;
    expose ZC_PaymentItem as PaymentItem;
  }
  ```

#### 2.8 Service Binding Proposal (`SERVICE_BINDING_PROPOSAL`)
- **Naming Convention:** `ZUI_<EntityName>_O4.srvb.json`
- **File Extension:** `.srvb.json`
- **Payload Schema:**
  - `bindingType`: `ODATA_V4_UI`
  - `serviceDefinition`: `ZUI_PaymentHeader_O4`
  - `systemTarget`: `S21_200`
  - `activationSteps`: Detailed ADT activation manual steps.

#### 2.9 DCL Access Control (`DCL_ACCESS_CONTROL`)
- **Naming Convention:** `ZI_<EntityName>.dcls.asdcls`
- **File Extension:** `.dcls.asdcls`
- **Syntax:**
  ```sql
  @EndUserText.label: 'Access Control for ZI_PaymentHeader'
  @MappingRole: true
  define role ZI_PaymentHeader {
    grant select on ZI_PaymentHeader
      where ( CompanyCode ) = aspect pfcg_auth( F_BKPF_BUK, BUKRS, ACTVT = '03' );
  }
  ```

---

### 3. Checksum & Manual Edit Preservation Contract

Every artifact entry in the project registry maintains:
```json
{
  "artifactId": "art-cds-zi-paymentheader",
  "filePath": "abap/cds/zi_paymentheader.ddls.asddls",
  "checksum": "a8f5b4c...",
  "templateChecksum": "a8f5b4c...",
  "manualEditStatus": "ORIGINAL",
  "version": 1
}
```
If a developer updates the code, `manualEditStatus` is updated to `MODIFIED` and `checksum` is recalculated. When `generateAbap()` is executed again, any artifact marked as `MODIFIED` is **preserved intact** and not overwritten.
