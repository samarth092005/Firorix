# FIORIX — DISCOVERY HANDOFF & ARTIFACT REGISTRY CONTRACT

**Document ID:** CONTRACT-GEN-2026-01  
**Project:** FioriX — SAP Modernization Platform  
**Target Release:** FioriX v2.0.0  
**Status:** SPECIFICATION COMPLETE — NORMATIVE CONTRACT  
**Author:** Platform Security Architect & API Governance Board  

---

## 1. Overview & Purpose

This specification establishes the **normative contract** governing the transition from the Discovery & Assessment phase to the Generation Studio phase.

To eliminate fabricated defaults (`ZCUSTOM_APP`, fallback systems, fake DDIC records) and ensure that no custom application is blueprinted without architectural sign-off, the generation engine exposes a strictly typed, server-verified input contract.

The generation engine rejects any request where:
- The assessment recommendation outcome is not **`BUILD`**.
- The lifecycle status is not **`APPROVED`**.
- Architectural approval is missing, forged, or violates separation of duties.
- Critical business requirements have not been confirmed by a functional lead.
- Target SAP release compatibility is unverified.
- Transaction metadata is marked incomplete or speculative.

---

## 2. Canonical Generation Input Contract

### 2.1 JSON Schema Specification (`generation-handoff-contract.schema.json`)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://fiorix.enterprise.sap/schemas/generation-handoff-v1.json",
  "title": "FioriX Generation Handoff Contract",
  "type": "object",
  "required": [
    "assessmentId",
    "recommendation",
    "governanceSignOff",
    "transactionContext",
    "businessRequirements",
    "landscapeContext",
    "fitGapEvidence",
    "cleanCoreConstraints"
  ],
  "properties": {
    "assessmentId": {
      "type": "string",
      "pattern": "^ASM-[0-9]{4}-[A-Z0-9_-]+$",
      "description": "Unique identifier of the approved assessment record."
    },
    "recommendation": {
      "type": "object",
      "required": ["outcome", "rationale", "outstandingGaps"],
      "properties": {
        "outcome": {
          "type": "string",
          "enum": ["BUILD"],
          "description": "Only assessments with outcome BUILD are permitted entry into Generation Studio."
        },
        "rationale": { "type": "string", "minLength": 20 },
        "outstandingGaps": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1,
          "description": "Specific functional gaps that justify a custom clean-core build."
        }
      }
    },
    "governanceSignOff": {
      "type": "object",
      "required": ["approvalReference", "approverId", "approverName", "approverRole", "approvedAt", "signatureHash"],
      "properties": {
        "approvalReference": { "type": "string" },
        "approverId": { "type": "string" },
        "approverName": { "type": "string" },
        "approverRole": { "type": "string", "enum": ["APPROVER", "ADMIN"] },
        "approvedAt": { "type": "string", "format": "date-time" },
        "signatureHash": { "type": "string", "pattern": "^[a-f0-9]{64}$" },
        "isOverride": { "type": "boolean" }
      }
    },
    "transactionContext": {
      "type": "object",
      "required": ["tcode", "classification", "description", "ddicMetadata", "provenance"],
      "properties": {
        "tcode": { "type": "string", "pattern": "^[A-Z0-9_]{1,20}$" },
        "classification": { "type": "string", "enum": ["CUSTOM", "STANDARD", "PARTNER"] },
        "description": { "type": "string" },
        "ddicMetadata": {
          "type": "object",
          "required": ["programName", "packageName", "softwareComponent", "originalSystem"],
          "properties": {
            "programName": { "type": "string", "minLength": 1 },
            "screenNumber": { "type": "string" },
            "packageName": { "type": "string", "minLength": 1 },
            "softwareComponent": { "type": "string", "minLength": 1 },
            "originalSystem": { "type": "string", "minLength": 1 },
            "metadataStatus": { "type": "string", "enum": ["COMPLETE", "INCOMPLETE"] }
          }
        },
        "provenance": {
          "type": "object",
          "required": ["source", "extractionTimestamp"],
          "properties": {
            "source": { "type": "string", "enum": ["LIVE_SAP_RFC", "MASTER_INDEX_SNAPSHOT", "MCP_DISCOVERY"] },
            "extractionTimestamp": { "type": "string", "format": "date-time" },
            "traceId": { "type": "string" }
          }
        }
      }
    },
    "businessRequirements": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["requirementId", "title", "priority", "status", "acceptanceCriteria"],
        "properties": {
          "requirementId": { "type": "string" },
          "title": { "type": "string" },
          "description": { "type": "string" },
          "priority": { "type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          "status": { "type": "string", "enum": ["CONFIRMED", "UNDER_REVIEW", "REJECTED"] },
          "acceptanceCriteria": {
            "type": "array",
            "items": { "type": "string" },
            "minItems": 1
          },
          "requiredCapabilities": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "landscapeContext": {
      "type": "object",
      "required": ["systemId", "client", "targetReleaseProfile", "deploymentEdition"],
      "properties": {
        "systemId": { "type": "string" },
        "client": { "type": "string", "pattern": "^[0-9]{3}$" },
        "targetReleaseProfile": {
          "type": "string",
          "enum": [
            "ABAP_CLOUD_BTP",
            "S4HANA_2023_FPS01",
            "S4HANA_2023_FPS00",
            "S4HANA_2022_FPS02",
            "S4HANA_2022_FPS00",
            "S4HANA_2021_FPS02"
          ]
        },
        "deploymentEdition": {
          "type": "string",
          "enum": [
            "SAP_BTP_ABAP_ENVIRONMENT",
            "SAP_S4HANA_CLOUD_PRIVATE_EDITION",
            "SAP_S4HANA_ON_PREMISE",
            "SAP_S4HANA_CLOUD_PUBLIC_EDITION"
          ]
        },
        "componentVersions": {
          "type": "object",
          "properties": {
            "SAP_BASIS": { "type": "string" },
            "SAP_ABA": { "type": "string" },
            "SAP_UI": { "type": "string" }
          }
        }
      }
    },
    "fitGapEvidence": {
      "type": "object",
      "required": ["evaluatedCandidatesCount", "selectedCandidateAppId", "candidateComparisonSummary", "fitGapScore"],
      "properties": {
        "evaluatedCandidatesCount": { "type": "integer", "minimum": 0 },
        "selectedCandidateAppId": { "type": ["string", "null"] },
        "candidateComparisonSummary": { "type": "string" },
        "fitGapScore": { "type": "number", "minimum": 0, "maximum": 100 },
        "identifiedGaps": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["gapId", "dimension", "description", "severity"],
            "properties": {
              "gapId": { "type": "string" },
              "dimension": { "type": "string" },
              "description": { "type": "string" },
              "severity": { "type": "string", "enum": ["BLOCKING", "MAJOR", "MINOR"] }
            }
          }
        }
      }
    },
    "cleanCoreConstraints": {
      "type": "object",
      "required": ["extensibilityTier", "abapLanguageVersion", "disallowedPatterns", "targetPackage"],
      "properties": {
        "extensibilityTier": {
          "type": "string",
          "enum": ["TIER_1_DEVELOPER_EXTENSIBILITY", "TIER_2_CLOUD_API_WRAPPER"]
        },
        "abapLanguageVersion": {
          "type": "string",
          "enum": ["ABAP_FOR_CLOUD_DEVELOPMENT_V5", "STANDARD_ABAP_V4"]
        },
        "targetPackage": { "type": "string", "pattern": "^Z[A-Z0-9_]{1,29}$" },
        "disallowedPatterns": {
          "type": "array",
          "items": { "type": "string" },
          "default": [
            "DIRECT_SAP_TABLE_SELECT",
            "CLASSIC_DYNPRO",
            "DEPRECATED_CDS_DEFINE_VIEW",
            "CALL_TRANSACTION_WITHOUT_WRAPPER",
            "UNCHECKED_AUTHORIZATION"
          ]
        }
      }
    },
    "technicalDependencies": {
      "type": "object",
      "properties": {
        "referencedDatabaseTables": { "type": "array", "items": { "type": "string" } },
        "referencedFunctionModules": { "type": "array", "items": { "type": "string" } },
        "referencedBadis": { "type": "array", "items": { "type": "string" } },
        "unresolvedTechnicalQuestions": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

---

## 3. TypeScript Interface Definition (`GenerationHandoffContract.ts`)

```typescript
export interface GovernanceSignOff {
  approvalReference: string;
  approverId: string;
  approverName: string;
  approverRole: 'APPROVER' | 'ADMIN';
  approvedAt: string;
  signatureHash: string;
  isOverride?: boolean;
}

export interface DdicMetadata {
  programName: string;
  screenNumber?: string;
  packageName: string;
  softwareComponent: string;
  originalSystem: string;
  metadataStatus: 'COMPLETE' | 'INCOMPLETE';
}

export interface ProvenanceRecord {
  source: 'LIVE_SAP_RFC' | 'MASTER_INDEX_SNAPSHOT' | 'MCP_DISCOVERY';
  extractionTimestamp: string;
  traceId?: string;
}

export interface BusinessRequirementHandoff {
  requirementId: string;
  title: string;
  description?: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'CONFIRMED' | 'UNDER_REVIEW' | 'REJECTED';
  acceptanceCriteria: string[];
  requiredCapabilities?: string[];
}

export interface IdentifiedGap {
  gapId: string;
  dimension: string;
  description: string;
  severity: 'BLOCKING' | 'MAJOR' | 'MINOR';
}

export interface CleanCoreConstraints {
  extensibilityTier: 'TIER_1_DEVELOPER_EXTENSIBILITY' | 'TIER_2_CLOUD_API_WRAPPER';
  abapLanguageVersion: 'ABAP_FOR_CLOUD_DEVELOPMENT_V5' | 'STANDARD_ABAP_V4';
  targetPackage: string;
  disallowedPatterns: string[];
}

export interface GenerationHandoffContract {
  assessmentId: string;
  recommendation: {
    outcome: 'BUILD';
    rationale: string;
    outstandingGaps: string[];
  };
  governanceSignOff: GovernanceSignOff;
  transactionContext: {
    tcode: string;
    classification: 'CUSTOM' | 'STANDARD' | 'PARTNER';
    description: string;
    ddicMetadata: DdicMetadata;
    provenance: ProvenanceRecord;
  };
  businessRequirements: BusinessRequirementHandoff[];
  landscapeContext: {
    systemId: string;
    client: string;
    targetReleaseProfile:
      | 'ABAP_CLOUD_BTP'
      | 'S4HANA_2023_FPS01'
      | 'S4HANA_2023_FPS00'
      | 'S4HANA_2022_FPS02'
      | 'S4HANA_2022_FPS00'
      | 'S4HANA_2021_FPS02';
    deploymentEdition:
      | 'SAP_BTP_ABAP_ENVIRONMENT'
      | 'SAP_S4HANA_CLOUD_PRIVATE_EDITION'
      | 'SAP_S4HANA_ON_PREMISE'
      | 'SAP_S4HANA_CLOUD_PUBLIC_EDITION';
    componentVersions?: Record<string, string>;
  };
  fitGapEvidence: {
    evaluatedCandidatesCount: number;
    selectedCandidateAppId: string | null;
    candidateComparisonSummary: string;
    fitGapScore: number;
    identifiedGaps: IdentifiedGap[];
  };
  cleanCoreConstraints: CleanCoreConstraints;
  technicalDependencies?: {
    referencedDatabaseTables?: string[];
    referencedFunctionModules?: string[];
    referencedBadis?: string[];
    unresolvedTechnicalQuestions?: string[];
  };
}
```

---

## 4. Rejection Policy & Precondition Gates

When a generation request arrives at the backend (`POST /api/v1/generation/compile`), the **Assessment Context Resolver** validates the payload against the rules below. If any check fails, compilation is refused with an explicit error envelope:

| Error Code | HTTP Status | Trigger Condition | Mandatory Remediation |
| :--- | :--- | :--- | :--- |
| `ERR_GOV_OUTCOME_NOT_BUILD` | 412 Precondition Failed | Assessment outcome is `ADOPT_STANDARD`, `EXTEND_BADI`, or `MAINTAIN_SAP_GUI`. | Return to Assessment Workspace. Generation is exclusively for `BUILD`. |
| `ERR_GOV_LIFECYCLE_NOT_APPROVED` | 403 Forbidden | Assessment status is `DRAFT`, `FITGAP_COMPLETED`, or `PENDING_REVIEW`. | Route assessment through Governance Approvals for architectural sign-off. |
| `ERR_GOV_SEPARATION_OF_DUTIES` | 403 Forbidden | The approver ID matches the assessment creator ID without admin override. | Sign-off must be performed by an independent Solution Architect. |
| `ERR_REQ_CRITICAL_UNCONFIRMED` | 422 Unprocessable Entity | One or more business requirements with priority `CRITICAL` or `HIGH` have `status !== 'CONFIRMED'`. | Functional consultant must confirm all critical requirements before code generation. |
| `ERR_DDIC_METADATA_SPECULATIVE` | 422 Unprocessable Entity | `ddicMetadata.metadataStatus === 'INCOMPLETE'` or `packageName` is empty/inferred. | Perform target system RFC extraction or update DDIC metadata via Discovery. |
| `ERR_RELEASE_INCOMPATIBLE` | 422 Unprocessable Entity | Target system release does not support RAP or OData V4 (e.g. ECC 6.0 or NetWeaver 7.40). | Select compatible S/4HANA release or configure Cloud BTP target. |

---

## 5. Generation Output Artifact Registry Contract

Every compilation produces an authoritative, immutable project registry record saved in `backend/data/projects/{projectId}/generation-manifest.json`:

```json
{
  "$schema": "https://fiorix.enterprise.sap/schemas/generation-manifest-v1.json",
  "projectId": "GEN-ASM-2026-003",
  "assessmentId": "ASM-2026-003",
  "tcode": "ZPLANT_DISPUTE",
  "generatedAt": "2026-11-08T18:30:00.000Z",
  "generatedBy": "USR-ARCH-042",
  "targetReleaseProfile": "S4HANA_2022_FPS02",
  "applicationPattern": "LIST_REPORT_OBJECT_PAGE_V4",
  "cleanCoreTier": "TIER_1_DEVELOPER_EXTENSIBILITY",
  "validationStatus": "PASS",
  "validationSummary": {
    "criticalErrors": 0,
    "warnings": 1,
    "info": 4
  },
  "manifestIntegrityHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "artifacts": [
    {
      "artifactId": "ART-CDS-ROOT",
      "fileName": "Z_I_PlantDisputeRoot.cds",
      "relativePath": "abap/cds/Z_I_PlantDisputeRoot.cds",
      "artifactType": "ABAP_CDS_VIEW_ENTITY",
      "sizeBytes": 2145,
      "checksum": "sha256:d8a9e10283bc8d1a1b2c3d4e5f6a7b8c9d0e1f23456789abcdef0123456789ab",
      "abapLanguageVersion": "ABAP_FOR_CLOUD_DEVELOPMENT_V5",
      "annotations": ["@AccessControl.authorizationCheck: #CHECK", "@EndUserText.label"]
    },
    {
      "artifactId": "ART-CDS-ITEM",
      "fileName": "Z_I_PlantDisputeItem.cds",
      "relativePath": "abap/cds/Z_I_PlantDisputeItem.cds",
      "artifactType": "ABAP_CDS_VIEW_ENTITY",
      "sizeBytes": 1420,
      "checksum": "sha256:3a1f8b2c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a",
      "abapLanguageVersion": "ABAP_FOR_CLOUD_DEVELOPMENT_V5"
    },
    {
      "artifactId": "ART-CDS-PROJECTION",
      "fileName": "Z_C_PlantDisputeManage.cds",
      "relativePath": "abap/cds/Z_C_PlantDisputeManage.cds",
      "artifactType": "ABAP_CDS_PROJECTION_VIEW",
      "sizeBytes": 2890,
      "checksum": "sha256:7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d",
      "providerContract": "transactional_query"
    },
    {
      "artifactId": "ART-RAP-BDEF",
      "fileName": "Z_I_PlantDisputeRoot.bdef",
      "relativePath": "abap/behavior/Z_I_PlantDisputeRoot.bdef",
      "artifactType": "RAP_BEHAVIOR_DEFINITION",
      "sizeBytes": 1680,
      "checksum": "sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
      "implementationScenario": "MANAGED_WITH_DRAFT"
    },
    {
      "artifactId": "ART-DCL-ROOT",
      "fileName": "Z_I_PlantDisputeRoot.dcl",
      "relativePath": "abap/dcl/Z_I_PlantDisputeRoot.dcl",
      "artifactType": "ABAP_ACCESS_CONTROL",
      "sizeBytes": 620,
      "checksum": "sha256:4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e"
    },
    {
      "artifactId": "ART-SRVD",
      "fileName": "ZSD_PLANT_DISPUTE.srvd",
      "relativePath": "abap/srvd/ZSD_PLANT_DISPUTE.srvd",
      "artifactType": "RAP_SERVICE_DEFINITION",
      "sizeBytes": 510,
      "checksum": "sha256:9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d"
    },
    {
      "artifactId": "ART-SRVB",
      "fileName": "ZSB_PLANT_DISPUTE_V4.srvb.json",
      "relativePath": "abap/srvb/ZSB_PLANT_DISPUTE_V4.srvb.json",
      "artifactType": "SERVICE_BINDING_PROPOSAL",
      "sizeBytes": 780,
      "checksum": "sha256:2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a"
    },
    {
      "artifactId": "ART-UI5-MANIFEST",
      "fileName": "manifest.json",
      "relativePath": "ui5/webapp/manifest.json",
      "artifactType": "UI5_MANIFEST_DESCRIPTOR",
      "sizeBytes": 3410,
      "checksum": "sha256:6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e"
    },
    {
      "artifactId": "ART-UI5-COMPONENT",
      "fileName": "Component.js",
      "relativePath": "ui5/webapp/Component.js",
      "artifactType": "UI5_COMPONENT_EXTENSION",
      "sizeBytes": 420,
      "checksum": "sha256:8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a"
    },
    {
      "artifactId": "ART-UI5-I18N",
      "fileName": "i18n.properties",
      "relativePath": "ui5/webapp/i18n/i18n.properties",
      "artifactType": "UI5_I18N_PROPERTIES",
      "sizeBytes": 850,
      "checksum": "sha256:0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c"
    }
  ]
}
```
