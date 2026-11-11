# API & CAP Service Contracts
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. Protocol Architecture & Conventions

FioriX adopts a **hybrid protocol architecture**:
1. **OData V4 Core Protocol:** Used for all domain entity queries, filtering, sorting, pagination, and transactional CRUD operations across the 7 CAP services.
2. **OData V4 Actions & Functions:** Used for imperative business workflows (such as requirement confirmation, running fit-gap, and triggering draft generation).
3. **Asynchronous Job Contracts:** Long-running discovery and where-used scans return `202 Accepted` with a `JobReference` (`jobId`), with status polled asynchronously.

---

## 2. Core Service Contracts

### 2.1 `LandscapeService` (`/odata/v4/landscape`)
- **Query Systems:** `GET /odata/v4/landscape/Systems?$expand=Releases,Capabilities`
- **Register System:** `POST /odata/v4/landscape/Systems`
  ```json
  {
    "alias": "S4H_DEV_100",
    "environment": "DEVELOPMENT",
    "destinationName": "S4H_DEV_ONPREM_DEST",
    "host": "s4h-dev.corp.internal",
    "client": "100",
    "adtBaseUri": "https://s4h-dev.corp.internal:44300/sap/bc/adt"
  }
  ```
- **Simulate Ping Action:** `POST /odata/v4/landscape/testConnection`
  - Body: `{"systemId": "c4b8e210-9f12-4a0b-8d54-1b9a8c7e2210"}`
  - Response:
    ```json
    {
      "status": "CONNECTED",
      "latencyMs": 35,
      "capabilities": ["ADT_REST_SERVICES_ACTIVE", "ODATA_CATALOG_V4_READY", "SU24_METADATA_READABLE"]
    }
    ```

### 2.2 `DiscoveryService` (`/odata/v4/discovery`)
- **Query Transactions:** `GET /odata/v4/discovery/Transactions?$filter=module eq 'SD'`
- **Schedule Discovery Scan:** `POST /odata/v4/discovery/scheduleScan`
  - Body:
    ```json
    {
      "systemId": "c4b8e210-9f12-4a0b-8d54-1b9a8c7e2210",
      "tcode": "ME21N",
      "scope": {
        "inspectStructure": true,
        "extractSU24Authorizations": true,
        "traverseWhereUsed": false
      }
    }
    ```
  - Response (`202 Accepted`):
    ```json
    {
      "jobId": "8f92b104-e21a-4d78-9b0c-123456789abc",
      "status": "QUEUED",
      "estimatedDurationSec": 45
    }
    ```
- **Poll Scan Status:** `GET /odata/v4/discovery/ScanJobs(8f92b104-e21a-4d78-9b0c-123456789abc)`

### 2.3 `AssessmentService` (`/odata/v4/assessment`)
- **Query Assessments:** `GET /odata/v4/assessment/Assessments?$expand=Requirements,Recommendation`
- **Create Assessment:** `POST /odata/v4/assessment/Assessments`
- **Confirm Requirement:** `POST /odata/v4/assessment/confirmRequirement`
  - Body: `{"reqId": "...", "rationale": "Verified against functional specification FS-O2C-101."}`

### 2.4 `CatalogueService` (`/odata/v4/catalogue`)
- **Search Catalogue:** `GET /odata/v4/catalogue/FioriApps?$filter=contains(appName, 'Sales')&$expand=Prerequisites,Releases`

### 2.5 `FitGapService` (`/odata/v4/fitgap`)
- **Execute Fit-Gap Run:** `POST /odata/v4/fitgap/calculateFitGap`
  - Body: `{"assessmentId": "..."}`
- **Record Recommendation:** `POST /odata/v4/fitgap/recordRecommendation`
  - Body: `{"assessmentId": "...", "outcome": "BUILD", "rationale": "Material custom rules verified."}`

### 2.6 `GenerationService` (`/odata/v4/generation`)
- **Trigger Draft Generation:** `POST /odata/v4/generation/generateDraft`
  - Gated: Rejects with `403 Forbidden` unless assessment recommendation is `BUILD` and `approvalStatus == 'APPROVED'`.
- **Export ZIP Archive:** `GET /odata/v4/generation/exportZip(projectId=...)`

### 2.7 `GovernanceService` (`/odata/v4/governance`)
- **Execute Validation Suite:** `POST /odata/v4/governance/runValidation`
- **Record Stakeholder Sign-Off:** `POST /odata/v4/governance/recordApproval`
  - Body: `{"assessmentId": "...", "stage": "BUILD_DECISION_SIGNOFF", "decision": "APPROVED", "rationale": "..."}`
- **Query Audit Ledger:** `GET /odata/v4/governance/AuditEvents?$orderby=timestamp desc&$top=50`
