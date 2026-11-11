# FioriX Generation Studio — Project API Reference (Phase 1)

**Module:** Generation Studio  
**Target:** SAP S/4HANA 2023 On-Premise (Clean Core Tier 2)  
**Schema Version:** 1.0.0  
**Transport:** HTTP/1.1 REST (JSON)  
**Authentication & Permissions:** Session-aware, Role-based (Admin, Enterprise Architect, Approver, Consultant, Developer)

---

## 1. Overview

The Generation Studio Project API manages the complete lifecycle of custom Fiori modernization projects derived from approved Discovery assessments or initiated as standalone local workspaces. All project records are stored in canonical directories under `backend/data/generation-projects/<projectId>/project.json` with write serialization, atomic updates, corruption detection, and automatic `.bak` recovery.

---

## 2. Endpoints Summary

| Method | Path | Description | Access / Role |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/generation/projects` | List projects with search, filtering, and pagination | All authenticated |
| `POST` | `/api/v1/generation/projects` | Create a new project (Standalone or Discovery Handoff) | All / Architect for Handoff |
| `GET` | `/api/v1/generation/projects/:id` | Retrieve single project record by ID | All authenticated |
| `PATCH` | `/api/v1/generation/projects/:id` | Update project metadata or specifications | Project Owner / Architect |
| `POST` | `/api/v1/generation/projects/:id/duplicate` | Duplicate an existing project under a new ID | All authenticated |
| `POST` | `/api/v1/generation/projects/:id/archive` | Archive a project (makes project read-only) | Project Owner / Architect |
| `POST` | `/api/v1/generation/projects/:id/restore` | Restore an archived project back to DRAFT | Project Owner / Architect |
| `DELETE` | `/api/v1/generation/projects/:id` | Permanently delete a project (requires `confirmed=true`) | Project Owner / Admin |
| `GET` | `/api/v1/generation/projects/:id/activity` | Retrieve chronological audit trail and activity events | All authenticated |
| `GET` | `/api/v1/generation/projects/:id/summary` | Retrieve data-driven completed phase progress | All authenticated |

---

## 3. Endpoint Specifications

### 3.1 List Generation Projects
`GET /api/v1/generation/projects`

#### Query Parameters:
- `search` (string, optional): Substring search across `projectId`, `projectName`, `sourceTransactionCode`, and `sourceAssessmentId`.
- `lifecycleStatus` (string, optional): Filter by lifecycle state (`DRAFT`, `REQUIREMENTS_IN_PROGRESS`, `ARCHIVED`, etc.). Default `ALL`.
- `origin` (string, optional): Filter by origin (`DISCOVERY_BUILD`, `STANDALONE`, `TEMPLATE`). Default `ALL`.
- `page` (integer, optional): Page number (1-based). Default `1`.
- `pageSize` (integer, optional): Items per page. Default `50`.
- `sortOrder` (string, optional): `'asc'` or `'desc'` by `updatedAt`. Default `'desc'`.

#### Response: `200 OK`
```json
{
  "success": true,
  "total": 3,
  "count": 3,
  "page": 1,
  "pageSize": 50,
  "projects": [
    {
      "projectId": "GEN-ME21N-A1B2C3",
      "schemaVersion": "1.0.0",
      "projectName": "ME21N — Create Purchase Order Modernization",
      "origin": "DISCOVERY_BUILD",
      "sourceAssessmentId": "ASM-2026-ME21N",
      "sourceTransactionCode": "ME21N",
      "sourceSystemId": "S21",
      "sourceClient": "200",
      "targetProduct": "SAP S/4HANA",
      "targetRelease": "SAP S/4HANA 2023 On-Premise",
      "targetDeploymentModel": "ON_PREMISE",
      "lifecycleStatus": "DRAFT",
      "currentPhase": "PHASE_1_WORKSPACE",
      "specificationVersion": 1,
      "createdAt": "2026-11-10T12:00:00.000Z",
      "updatedAt": "2026-11-10T12:00:00.000Z"
    }
  ]
}
```

---

### 3.2 Create Generation Project
`POST /api/v1/generation/projects`

#### Request Body (Standalone Project):
```json
{
  "projectName": "Vendor Quality Certificate Registry",
  "description": "Standalone custom Fiori Elements application for vendor certificate tracking",
  "origin": "STANDALONE",
  "targetRelease": "SAP S/4HANA 2023 On-Premise",
  "targetDeploymentModel": "ON_PREMISE",
  "targetPackage": "ZVENDOR_CORE"
}
```

#### Request Body (Discovery BUILD Handoff):
```json
{
  "sourceAssessmentId": "ASM-2026-ME21N",
  "origin": "DISCOVERY_BUILD",
  "targetRelease": "SAP S/4HANA 2023 On-Premise"
}
```

#### Response: `201 Created`
```json
{
  "success": true,
  "statusCode": "CREATED",
  "alreadyExists": false,
  "project": {
    "projectId": "GEN-ME21N-CB96C5",
    "schemaVersion": "1.0.0",
    "projectName": "ME21N — Create Purchase Order Modernization",
    "origin": "DISCOVERY_BUILD",
    "sourceAssessmentId": "ASM-2026-ME21N",
    "sourceTransactionCode": "ME21N",
    "targetRelease": "SAP S/4HANA 2023 On-Premise",
    "targetDeploymentModel": "ON_PREMISE",
    "lifecycleStatus": "DRAFT",
    "currentPhase": "PHASE_1_WORKSPACE",
    "assessmentContext": {
      "businessDomain": "Sourcing and Procurement",
      "programName": "SAPMM06E",
      "packageName": "ME",
      "softwareComponent": "S4CORE 108",
      "identifiedGaps": [
        "Subcontracting dynpro screen variant",
        "Clean Core Tier 2 compliance"
      ],
      "approvalProvenance": {
        "approvedAt": "2026-11-10T12:00:00.000Z",
        "approver": "Dr. Marcus Weber",
        "justification": "Approved custom RAP application due to proprietary purchasing extensions."
      }
    }
  }
}
```

#### Idempotent Handoff Response: `200 OK`
If a project already exists for the provided assessment, the existing project is returned with `alreadyExists: true`:
```json
{
  "success": true,
  "statusCode": "OK",
  "alreadyExists": true,
  "message": "Existing Generation Studio project \"GEN-ME21N-CB96C5\" found for assessment \"ASM-2026-ME21N\".",
  "project": { ... }
}
```

#### Error Responses:
- `400 Bad Request`: Payload validation failed or assessment outcome is not BUILD.
- `403 Forbidden`: Assessment has not completed Lead Architect approval under Clean Core governance.
- `404 Not Found`: Source assessment does not exist.
- `409 Conflict`: Project with specified ID already exists.

---

### 3.3 Retrieve Project by ID
`GET /api/v1/generation/projects/:projectId`

#### Response: `200 OK`
```json
{
  "success": true,
  "project": {
    "projectId": "GEN-ME21N-CB96C5",
    "projectName": "ME21N — Create Purchase Order Modernization",
    "lifecycleStatus": "DRAFT",
    "specificationVersion": 1
  }
}
```

#### Error Responses:
- `400 Bad Request`: Invalid project ID format or directory traversal characters detected.
- `404 Not Found`: Project not found on disk.

---

### 3.4 Update Project
`PATCH /api/v1/generation/projects/:projectId`

#### Request Body:
```json
{
  "description": "Updated project description with subcontracting determination details",
  "targetRelease": "SAP S/4HANA 2023 FP01"
}
```

#### Response: `200 OK`
```json
{
  "success": true,
  "project": {
    "projectId": "GEN-ME21N-CB96C5",
    "description": "Updated project description with subcontracting determination details",
    "targetRelease": "SAP S/4HANA 2023 FP01",
    "specificationVersion": 2,
    "updatedAt": "2026-11-11T03:30:00.000Z"
  }
}
```

#### Error Responses:
- `400 Bad Request`: Attempting to modify immutable fields (`projectId`, `createdAt`, `origin`, etc.) or invalid lifecycle transition.
- `404 Not Found`: Project does not exist.
- `409 Conflict`: Project is archived and must be restored before modification.

---

### 3.5 Duplicate Project
`POST /api/v1/generation/projects/:projectId/duplicate`

#### Request Body (Optional):
```json
{
  "newProjectName": "ME21N — Variant for Subcontracting",
  "newProjectId": "GEN-ME21N-SUBCON"
}
```

#### Response: `201 Created`
```json
{
  "success": true,
  "statusCode": "CREATED",
  "project": {
    "projectId": "GEN-ME21N-SUBCON",
    "projectName": "ME21N — Variant for Subcontracting",
    "lifecycleStatus": "DRAFT",
    "specificationVersion": 1
  }
}
```

---

### 3.6 Archive Project
`POST /api/v1/generation/projects/:projectId/archive`

#### Response: `200 OK`
```json
{
  "success": true,
  "project": {
    "projectId": "GEN-ME21N-CB96C5",
    "lifecycleStatus": "ARCHIVED"
  }
}
```

---

### 3.7 Restore Project
`POST /api/v1/generation/projects/:projectId/restore`

#### Response: `200 OK`
```json
{
  "success": true,
  "project": {
    "projectId": "GEN-ME21N-CB96C5",
    "lifecycleStatus": "DRAFT"
  }
}
```

---

### 3.8 Delete Project
`DELETE /api/v1/generation/projects/:projectId?confirmed=true`

#### Query Parameters:
- `confirmed` (boolean): Required when project has artifacts or was exported.

#### Response: `200 OK`
```json
{
  "success": true,
  "deletedProjectId": "GEN-ME21N-CB96C5"
}
```

---

### 3.9 Project Activity History
`GET /api/v1/generation/projects/:projectId/activity`

#### Response: `200 OK`
```json
{
  "success": true,
  "projectId": "GEN-ME21N-CB96C5",
  "count": 3,
  "activityHistory": [
    {
      "eventId": "EVT-1794350000000-A1B2C3",
      "timestamp": "2026-11-10T12:00:00.000Z",
      "author": "Dr. Marcus Weber",
      "action": "PROJECT_CREATED",
      "details": { "origin": "DISCOVERY_BUILD", "status": "DRAFT" },
      "previousStatus": null,
      "newStatus": "DRAFT"
    }
  ]
}
```

---

### 3.10 Data-Driven Summary
`GET /api/v1/generation/projects/:projectId/summary`

#### Response: `200 OK`
```json
{
  "success": true,
  "summary": {
    "projectId": "GEN-ME21N-CB96C5",
    "projectName": "ME21N — Create Purchase Order Modernization",
    "origin": "DISCOVERY_BUILD",
    "lifecycleStatus": "DRAFT",
    "targetRelease": "SAP S/4HANA 2023 On-Premise",
    "targetDeploymentModel": "ON_PREMISE",
    "completedPhaseCount": 1,
    "totalPhaseCount": 8,
    "progressPercentage": 13,
    "phases": [
      {
        "id": "PHASE_1_WORKSPACE",
        "name": "Workspace Foundation & Setup",
        "isCompleted": true,
        "notes": "Workspace and persistence initialized",
        "requiredForGeneration": true
      },
      {
        "id": "PHASE_2_REQUIREMENTS",
        "name": "Requirements & Scope",
        "isCompleted": false,
        "notes": "Pending Phase 2 requirements definition",
        "requiredForGeneration": true
      }
    ]
  }
}
```
