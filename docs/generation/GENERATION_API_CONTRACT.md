# FIORIX GENERATION STUDIO — REST API SPECIFICATION
## Authoritative Endpoints for Milestones GEN-02, GEN-03 & GEN-04

**Version:** 1.0.0  
**Status:** Approved & Implemented  
**Base Path:** `/api/v1/generation`  
**Security:** Admin authorization required (`fiorix.generation.manage` via `x-fiorix-admin-secret` header or JWT session token).

---

## 1. Summary of Endpoints

| # | Method | Path | Component | Milestone | Description |
|---|---|---|---|---|---|
| 1 | `GET` | `/api/v1/generation/context/:assessmentId` | Context | GEN-02 | Evaluates BUILD assessment eligibility and returns context snapshot |
| 2 | `GET` | `/api/v1/generation/projects` | Projects | GEN-02 | Lists projects with search, filter, and pagination |
| 3 | `POST` | `/api/v1/generation/projects` | Projects | GEN-02 | Creates a new generation project with assessment provenance |
| 4 | `GET` | `/api/v1/generation/projects/:projectId` | Projects | GEN-02 | Retrieves project details and stage progress |
| 5 | `PUT` | `/api/v1/generation/projects/:projectId` | Projects | GEN-02 | Updates project metadata (name, description, package) |
| 6 | `DELETE` | `/api/v1/generation/projects/:projectId` | Projects | GEN-02 | Deletes project and its specification files |
| 7 | `GET` | `/api/v1/generation/projects/:projectId/requirements` | Requirements | GEN-03 | Lists all requirements and confirmation gate summary |
| 8 | `POST` | `/api/v1/generation/projects/:projectId/requirements` | Requirements | GEN-03 | Creates a manual requirement record |
| 9 | `POST` | `/api/v1/generation/projects/:projectId/requirements/import-assessment` | Requirements | GEN-03 | Imports fit-gap findings from source assessment |
| 10 | `PUT` | `/api/v1/generation/projects/:projectId/requirements/:reqId` | Requirements | GEN-03 | Updates requirement details |
| 11 | `POST` | `/api/v1/generation/projects/:projectId/requirements/:reqId/action` | Requirements | GEN-03 | Executes action (`CONFIRM`, `DEFER`, `REJECT`) |
| 12 | `DELETE` | `/api/v1/generation/projects/:projectId/requirements/:reqId` | Requirements | GEN-03 | Deletes a requirement record |
| 13 | `GET` | `/api/v1/generation/projects/:projectId/datamodel` | Data Model | GEN-04 | Retrieves complete data model specification |
| 14 | `POST` | `/api/v1/generation/projects/:projectId/datamodel/entities` | Data Model | GEN-04 | Creates an entity (ROOT, CHILD, REFERENCE, VALUE_HELP) |
| 15 | `PUT` | `/api/v1/generation/projects/:projectId/datamodel/entities/:entityId` | Data Model | GEN-04 | Updates entity metadata or fields |
| 16 | `DELETE` | `/api/v1/generation/projects/:projectId/datamodel/entities/:entityId` | Data Model | GEN-04 | Deletes entity and cascaded relationships |
| 17 | `POST` | `/api/v1/generation/projects/:projectId/datamodel/relationships` | Data Model | GEN-04 | Creates composition or association relationship |
| 18 | `POST` | `/api/v1/generation/projects/:projectId/datamodel/validate` | Data Model | GEN-04 | Runs multi-category validation engine |
| 19 | `GET` | `/api/v1/generation/cds-registry/search` | CDS Registry | GEN-04 | Searches standard SAP S/4HANA released C1 CDS views |

---

## 2. Milestone GEN-02: Project Foundation Endpoints

### 2.1 GET `/api/v1/generation/context/:assessmentId`
- **Purpose:** Server-authoritative assessment resolution before project creation.
- **Query / Params:** `assessmentId` (string).
- **Responses:**
  - `200 OK`: Eligible assessment context.
  - `400 Bad Request`: Ineligible assessment (e.g. non-BUILD recommendation).
  - `404 Not Found`: Assessment does not exist.
  - `401 / 403`: Unauthorized or missing admin privileges.

---

## 3. Milestone GEN-03: Requirements Designer Endpoints

### 3.1 POST `/api/v1/generation/projects/:projectId/requirements/import-assessment`
- **Purpose:** Imports Discovery fit-gap findings into requirements backlog with deduplication.
- **Request Body:**
```json
{
  "sourceAssessmentId": "ASM-BUILD-PO"
}
```
- **Responses:**
  - `200 OK`:
```json
{
  "success": true,
  "importedCount": 3,
  "skippedDuplicates": 0,
  "requirements": [...]
}
```

### 3.2 POST `/api/v1/generation/projects/:projectId/requirements/:reqId/action`
- **Purpose:** Transitions requirement lifecycle state (`CONFIRM`, `DEFER`, `REJECT`).
- **Request Body for CONFIRM:**
```json
{
  "action": "CONFIRM",
  "acceptanceCriteria": ["Verify ISO-9001 validity date against SAP table ZISO_CERT"],
  "cleanCoreTier": "TIER_1",
  "notes": "Verified against Clean Core guidance"
}
```
- **Request Body for DEFER:**
```json
{
  "action": "DEFER",
  "deferralReason": "Postponed to Phase 2 due to legacy supplier master cleanup dependency"
}
```

---

## 4. Milestone GEN-04: Data Model Designer Endpoints

### 4.1 POST `/api/v1/generation/projects/:projectId/datamodel/entities`
- **Request Body:**
```json
{
  "name": "PurchaseOrder",
  "entityType": "ROOT",
  "cdsViewName": "ZR_PurchaseOrderTP",
  "description": "Root Purchase Order transactional entity",
  "fields": [
    { "name": "PurchaseOrder", "abapType": "abap.char(10)", "isKey": true },
    { "name": "TotalAmount", "abapType": "abap.curr(15,2)", "cukyField": "CurrencyCode" },
    { "name": "CurrencyCode", "abapType": "abap.cuky(5)" }
  ]
}
```

### 4.2 POST `/api/v1/generation/projects/:projectId/datamodel/relationships`
- **Request Body:**
```json
{
  "name": "_Item",
  "relationshipType": "COMPOSITION",
  "sourceEntityId": "ENT-PO-01",
  "targetEntityId": "ENT-ITEM-01",
  "cardinality": "[0..*]"
}
```
- **Error Response on Cycle:** `400 Bad Request` with `{ "error": "Circular composition detected: PurchaseOrder -> PurchaseOrderItem -> PurchaseOrder" }`.

### 4.3 POST `/api/v1/generation/projects/:projectId/datamodel/validate`
- **Purpose:** Runs multi-category validation engine (Structural, Relationship, SAP Compatibility, Business Integrity).
- **Responses:**
  - `200 OK`:
```json
{
  "success": true,
  "validationReport": {
    "status": "VALID" | "VALID_WITH_WARNINGS" | "INVALID",
    "errorCount": 0,
    "warningCount": 1,
    "infoCount": 1,
    "blockingCount": 0,
    "findings": [
      {
        "findingId": "FND-01",
        "ruleId": "RULE_ROOT_EXISTS",
        "category": "STRUCTURAL",
        "severity": "INFO",
        "message": "Root entity PurchaseOrder identified.",
        "blocksProgression": false
      }
    ]
  }
}
```

### 4.4 GET `/api/v1/generation/cds-registry/search?q=Currency`
- **Responses:**
  - `200 OK`:
```json
{
  "success": true,
  "count": 1,
  "views": [
    {
      "technicalName": "I_Currency",
      "businessDescription": "Currency Master Data",
      "category": "MASTER_DATA",
      "releaseContract": "C1",
      "keyFields": ["Currency"]
    }
  ]
}
```
