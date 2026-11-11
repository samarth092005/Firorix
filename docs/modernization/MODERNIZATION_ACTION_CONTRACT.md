# FioriX Modernization Action Contract (MW-02)

## 1. Scope & Protocol

This contract governs the REST API endpoints and data payloads for recording, verifying, and persisting modernization decision actions within the FioriX backend.

All modernization actions:
- Are submitted to authoritative backend persistence endpoints.
- Are strictly validated server-side.
- Enforce Clean Core standard-first guardrails.
- Support request idempotency via `idempotencyKey`.
- Append immutable audit trail events chained via SHA-256 cryptographic hashes.

---

## 2. API Endpoints

### 2.1 Record Modernization Action
- **Method**: `POST`
- **Route**: `/api/v1/assessments/:id/modernization-action`
- **Content-Type**: `application/json`

#### Request Payload Specification
```typescript
export type ModernizationActionType =
  | 'ADD_FOUND'
  | 'CONFIGURE_ADOPT_READINESS'
  | 'EXTEND_PLAN'
  | 'BUILD_PROJECT';

export interface ModernizationActionRequest {
  actionType: ModernizationActionType;
  idempotencyKey?: string;
  author?: string;
  actorId?: string;
  actorRole?: string;
  comment?: string;
  details: Record<string, any>;
}
```

#### Action-Specific Details Schemas

##### 1. `ADD_FOUND`
```json
{
  "actionType": "ADD_FOUND",
  "idempotencyKey": "IDEMP-CAND-F0773",
  "author": "SAP Functional Lead",
  "comment": "Associated standard Fiori app F0773 with assessment.",
  "details": {
    "appId": "F0773",
    "appName": "Post Outgoing Payments",
    "appType": "SAP Fiori elements",
    "uiTechnology": "SAP Fiori elements",
    "supportedRelease": "SAP S/4HANA 2023",
    "releaseCompatibility": "COMPATIBLE",
    "sourceLabel": "Official SAP Fiori Apps Reference Library",
    "businessRoles": ["SAP_BR_AP_ACCOUNTANT"],
    "odataServices": ["FAR_OUTGOING_PAYMENT_SRV"]
  }
}
```

##### 2. `CONFIGURE_ADOPT_READINESS`
```json
{
  "actionType": "CONFIGURE_ADOPT_READINESS",
  "author": "SAP Basis & Security Lead",
  "comment": "Recorded deployment readiness checklist.",
  "details": {
    "checklist": {
      "productReleaseCompatibility": "VERIFIED",
      "odataServices": "VERIFIED",
      "serviceRegistration": "PENDING",
      "icfUi5Services": "PENDING",
      "systemAlias": "VERIFIED",
      "businessCatalogue": "PENDING",
      "pfcgBusinessRoles": "PENDING",
      "launchpadAvailability": "NOT_VERIFIED",
      "userAuthorization": "NOT_VERIFIED"
    },
    "tcode": "F-53",
    "systemId": "S21",
    "client": "200"
  }
}
```

##### 3. `EXTEND_PLAN`
```json
{
  "actionType": "EXTEND_PLAN",
  "author": "Clean Core Technical Lead",
  "comment": "Documented Tier 2 developer extension.",
  "details": {
    "targetApp": "F0773",
    "tier": "TIER_2_CLOUD_DEVELOPER",
    "cleanCoreTier": "TIER_2_CLOUD_DEVELOPER",
    "notes": "Developer BAdI implementation in ADT for customer clearing rules.",
    "missingCapabilities": ["Proprietary Payment Clearing Rules"]
  }
}
```

##### 4. `BUILD_PROJECT`
```json
{
  "actionType": "BUILD_PROJECT",
  "author": "Lead Enterprise Architect",
  "comment": "Custom RAP List Report approved under Clean Core Tier 2.",
  "details": {
    "leadArchitectApproval": true,
    "architectApproved": true,
    "architectName": "Lead SAP Enterprise Architect",
    "justification": "Proprietary transaction with zero standard successor match.",
    "proposedAppType": "RAP_MANAGED",
    "cleanCoreTier": "TIER_2_CLOUD_DEVELOPER"
  }
}
```

#### Response Payload (HTTP 200)
```json
{
  "success": true,
  "isIdempotent": false,
  "action": {
    "actionId": "ACT-1794318000-A1B2C3",
    "actionType": "CONFIGURE_ADOPT_READINESS",
    "timestamp": "2026-11-10T20:25:00.000Z",
    "author": "SAP Basis & Security Lead",
    "details": { ... },
    "comment": "Recorded deployment readiness checklist.",
    "idempotencyKey": "IDEMP-001"
  },
  "assessment": { ... }
}
```

---

### 2.2 Retrieve Modernization Decisions History
- **Method**: `GET`
- **Route**: `/api/v1/assessments/:id/modernization-decisions`
- **Response**:
```json
{
  "success": true,
  "assessmentId": "ASM-S4-F53-001",
  "count": 2,
  "decisions": [
    {
      "actionId": "ACT-1794317000-01",
      "actionType": "ADD_FOUND",
      "timestamp": "2026-11-10T20:20:00.000Z",
      "author": "SAP Functional Lead",
      "comment": "Associated standard candidate F0773."
    },
    {
      "actionId": "ACT-1794318000-02",
      "actionType": "CONFIGURE_ADOPT_READINESS",
      "timestamp": "2026-11-10T20:25:00.000Z",
      "author": "SAP Basis & Security Lead",
      "comment": "Recorded readiness checklist."
    }
  ]
}
```

---

## 3. Server-Side Error Codes

| HTTP Status | Error Code | Reason |
|:---|:---|:---|
| `400` | `VALIDATION_ERROR` | Missing required fields (e.g. `appId` for `ADD_FOUND`, invalid checklist status, missing justification). |
| `400` | `CATALOGUE_SEARCH_INCOMPLETE` | Attempting custom `BUILD` before catalogue verification completes. |
| `403` | `UNAUTHORIZED_BUILD` | Standard Fiori app exists, but custom `BUILD` was attempted without Lead Architect approval sign-off. |
| `404` | `NOT_FOUND` | Assessment record does not exist. |
| `500` | `INTERNAL_ERROR` | Unexpected backend persistence exception. |
