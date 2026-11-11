# FIORIX GENERATION STUDIO — MILESTONE GEN-02 SPECIFICATION
## Project Foundation, Assessment Context & Lifecycle Gating

**Version:** 1.0.0  
**Status:** Approved & Implemented  
**Classification:** Core Architectural Specification  
**Component:** Generation Studio Foundation (`backend/src/generation/projects/`, `frontend/src/features/generation/`)

---

## 1. Executive Summary

Milestone **GEN-02 (Project Foundation)** establishes the server-authoritative bridge between Discovery/Assessment phases and Generation Studio. It transforms an evaluated and approved Discovery `BUILD` assessment into an immutable, versioned Modernization Project workspace.

In accordance with Clean Core principles and strict enterprise governance:
1. **No synthetic project creation:** Generation projects cannot be initiated without an authoritative, server-verified Discovery assessment with `BUILD` recommendation.
2. **Authoritative Context Resolution:** The backend exposes `GET /api/v1/generation/context/:assessmentId` to inspect eligibility, fit-gap findings, technical evidence, and recommendation provenance before workspace creation.
3. **Immutable Snapshotting:** Key assessment artifacts (tcode, program, package, findings, score) are snapshotted into the project contract, guaranteeing that subsequent changes to assessment stores never corrupt in-flight generation projects.
4. **Lifecycle State Machine:** Projects follow a deterministic lifecycle (`DRAFT` → `REQUIREMENTS_IN_PROGRESS` → `REQUIREMENTS_CONFIRMED` → `DATA_MODEL_IN_PROGRESS` → `DATA_MODEL_VALIDATED` → `READY_FOR_ARCHITECTURE`).

---

## 2. Server-Authoritative Assessment Context Resolution

### 2.1 Eligibility Criteria
An assessment is strictly eligible for Generation Project instantiation if and only if:
- The assessment record exists in the authoritative store.
- The recommended action is `BUILD` (Custom Fiori/RAP application development).
- Assessments with `NO_ACTION`, `STANDARD_FIORI`, `EXTEND_FIORI`, or `REFACTOR` are rejected with explicit, user-friendly explanations.

### 2.2 Endpoint Specification
- **Method:** `GET`
- **Route:** `/api/v1/generation/context/:assessmentId`
- **Security:** Requires `fiorix.generation.manage` permission (`x-fiorix-admin-secret` or authenticated admin session).
- **Payload Schema:**
```json
{
  "assessmentId": "ASM-BUILD-PO",
  "tcode": "ME21N",
  "recommendation": "BUILD",
  "confidenceScore": 88,
  "fitGapSummary": {
    "gapCount": 4,
    "hasUnresolvableGaps": false,
    "gaps": [
      { "id": "GAP-01", "dimension": "VALIDATION", "description": "Supplier ISO-9001 compliance check mandatory" }
    ]
  },
  "evaluatedCandidates": [],
  "technicalEvidenceSummary": {
    "programName": "SAPMM06E",
    "package": "ME",
    "tableCount": 14
  },
  "approvalProvenance": {
    "approver": "Lead Enterprise Architect",
    "approvedAt": "2026-11-10T14:30:00Z"
  },
  "isEligibleForBuild": true
}
```

If `recommendation !== 'BUILD'`, the response returns:
```json
{
  "assessmentId": "ASM-STD-001",
  "tcode": "VA01",
  "recommendation": "STANDARD_FIORI",
  "isEligibleForBuild": false,
  "ineligibilityReason": "Assessment recommendation is STANDARD_FIORI. Generation Studio is exclusively reserved for BUILD recommendations."
}
```

---

## 3. Project Creation & Provenance Snapshotting

### 3.1 Project Contract
When a project is created via `POST /api/v1/generation/projects`:
- An immutable `assessmentProvenance` block is embedded in the project JSON:
```json
{
  "projectId": "GEN-PRJ-20261111-ABC1",
  "projectName": "Purchase Order Processing Modernization",
  "description": "Clean Core RAP modernization for ME21N custom purchase flows",
  "sourceAssessmentId": "ASM-BUILD-PO",
  "sourceTCode": "ME21N",
  "targetPackage": "Z_PURCHASE_ORDER_RAP",
  "cleanCoreTier": "TIER_1",
  "lifecycleStatus": "DRAFT",
  "createdAt": "2026-11-11T13:40:00Z",
  "assessmentProvenance": {
    "assessmentId": "ASM-BUILD-PO",
    "tcode": "ME21N",
    "recommendation": "BUILD",
    "confidenceScore": 88,
    "snapshottedAt": "2026-11-11T13:40:00Z",
    "gapSnapshot": [
      { "gapId": "GAP-01", "dimension": "VALIDATION", "description": "Supplier ISO-9001 compliance check mandatory" }
    ]
  }
}
```

### 3.2 Storage Architecture
- Root directory: `backend/data/generation-projects/`
- Index file: `backend/data/generation-projects/projects-index.json`
- Project file: `backend/data/generation-projects/{projectId}.json`
- Atomicity: File writes utilize atomic temporary write and rename patterns to prevent corruption during concurrent operations or power failures.

---

## 4. Lifecycle Gating & Stage Progress

Generation Studio displays an 8-phase workflow in the UI shell:
1. **Foundation & Context** (`DRAFT`)
2. **Requirements Designer** (`REQUIREMENTS_IN_PROGRESS` / `REQUIREMENTS_CONFIRMED`)
3. **Data Model Designer** (`DATA_MODEL_IN_PROGRESS` / `DATA_MODEL_VALIDATED`)
4. **Behavior & Logic Designer** (`READY_FOR_ARCHITECTURE` - Locked in GEN-02-04)
5. **Service Definition** (Locked)
6. **Code Generation** (Locked)
7. **Verification & Testing** (Locked)
8. **Deployment & Transport** (Locked)

Stage progress calculation:
$$\text{Progress} = \frac{\text{Completed Stages}}{\text{Total Stages}} \times 100\%$$
- `DRAFT`: 12.5% (Stage 1 Complete)
- `REQUIREMENTS_IN_PROGRESS`: 18.75%
- `REQUIREMENTS_CONFIRMED`: 25.0% (Stage 2 Complete)
- `DATA_MODEL_IN_PROGRESS`: 31.25%
- `DATA_MODEL_VALIDATED`: 37.5% (Stage 3 Complete)
- `READY_FOR_ARCHITECTURE`: 50.0% (Ready for Milestone GEN-05)
