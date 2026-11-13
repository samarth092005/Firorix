# Fiorify GENERATION STUDIO — DATA CONTRACTS & VERSIONED SCHEMAS
**Document ID:** CONTRACT-GEN-DATA-2026-01  
**Project:** Fiorify — SAP Modernization Platform  
**Target Release:** Fiorify v2.0.0  
**Status:** COMPLETE NORMATIVE SPECIFICATION  
**Author:** Principal Data Architect & Security Lead  

---

## 1. Overview & Versioning Strategy

This document defines the normative, versioned data contracts for all core entities managed by the Generation Studio. 

All schemas adhere to semantic versioning (`v1.0.0`). Every persistent record includes:
- `schemaVersion`: String identifying schema release.
- `createdAt` & `updatedAt`: ISO 8601 UTC timestamps.
- `version`: Monotonically increasing revision integer.

---

## 2. Core Entity Schemas (JSON Schema & TypeScript)

### 2.1 GenerationProject Schema
The root document representing a complete generation lifecycle instance.

```typescript
export interface GenerationProject {
  schemaVersion: '1.0.0';
  projectId: string; // e.g. "GEN-2026-ME21N-001"
  sourceHandoffId?: string; // Optional reference to approved Assessment Handoff
  sourceAssessmentId?: string;
  sourceTCode: string; // e.g. "ME21N"
  projectTitle: string;
  description: string;
  targetRelease: string; // e.g. "SAP S/4HANA 2023 On-Premise"
  targetSystemId: string; // e.g. "S21"
  targetClient: string; // e.g. "200"
  targetPackage: string; // e.g. "ZFiorify_CORE"
  softwareComponent: string; // e.g. "HOME" or "ZLOCAL"
  lifecycleStage: ProjectLifecycleStage;
  requirementsSpec: RequirementSpecification;
  dataModelSpec: DataModelSpecification;
  architectureSpec: ArchitectureSpecification;
  mockServiceDef: MockServiceDefinition;
  artifactRegistry: Record<string, ArtifactRecord>;
  validationReport?: ValidationReport;
  reviewRecord?: ReviewRecord;
  activityHistory: ProjectActivity[];
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ProjectLifecycleStage =
  | 'DRAFT'
  | 'DESIGNED'
  | 'ARCHITECTED'
  | 'GENERATED'
  | 'VALIDATED'
  | 'IN_REVIEW'
  | 'EXPORT_READY'
  | 'ARCHIVED';
```

---

### 2.2 RequirementSpecification Schema
Captures functional capabilities, business rules, and UI expectations.

```typescript
export interface RequirementSpecification {
  specVersion: number;
  lastUpdated: string;
  items: RequirementItem[];
}

export interface RequirementItem {
  id: string; // e.g. "REQ-001"
  category: 'CRUD' | 'CALCULATION' | 'VALIDATION' | 'DETERMINATION' | 'ACTION' | 'UI_FACET';
  priority: 'MUST_HAVE' | 'SHOULD_HAVE' | 'COULD_HAVE';
  title: string;
  description: string;
  targetEntityId: string; // e.g. "Header" or "Item"
  cleanCoreImpact: 'STANDARD_C1' | 'CUSTOM_LOGIC' | 'DEPRECATED_API';
  status: 'DRAFT' | 'CONFIRMED' | 'REJECTED';
  sourceGapReference?: string;
}
```

---

### 2.3 DataModelSpecification Schema
Defines the business object hierarchy, entity fields, ABAP types, and CDS associations.

```typescript
export interface DataModelSpecification {
  specVersion: number;
  lastUpdated: string;
  rootEntity: DataModelEntity;
  childEntities: DataModelEntity[];
}

export interface DataModelEntity {
  entityId: string; // e.g. "PurchaseOrder"
  cdsViewName: string; // e.g. "ZR_PurchaseOrderTP"
  projectionViewName: string; // e.g. "ZC_PurchaseOrderTP"
  databaseTableName: string; // e.g. "ZPO_HEADER"
  draftTableName: string; // e.g. "ZPO_HEADER_D"
  description: string;
  isRoot: boolean;
  parentEntityId?: string;
  compositionType?: 'COMPOSITION_OF_MANY' | 'TO_ONE';
  fields: DataModelField[];
  associations: DataModelAssociation[];
}

export interface DataModelField {
  fieldName: string; // e.g. "PurchaseOrder"
  abapType: 'CHAR' | 'NUMC' | 'DEC' | 'DATS' | 'TIMS' | 'UUID' | 'RAW' | 'STRING';
  length: number;
  decimals?: number;
  isKey: boolean;
  isMandatory: boolean;
  isReadOnly: boolean;
  label: string;
  semanticAnnotation?: 'AMOUNT' | 'CURRENCY_CODE' | 'QUANTITY' | 'UNIT_OF_MEASURE' | 'CREATED_AT' | 'LAST_CHANGED_AT';
  referenceField?: string; // For currency/unit pairing
  valueHelpBinding?: string; // Association to value help CDS view
}

export interface DataModelAssociation {
  name: string; // e.g. "_Supplier"
  targetEntity: string; // e.g. "I_Supplier"
  cardinality: '1..1' | '[0..1]' | '[0..*]' | '[1..*]';
  joinConditions: Array<{ sourceField: string; targetField: string }>;
  isStandardReleasedC1: boolean;
}
```

---

### 2.4 ArchitectureSpecification Schema
Configures the RAP scenario, operations, behavior features, and protocol exposure.

```typescript
export interface ArchitectureSpecification {
  specVersion: number;
  lastUpdated: string;
  rapScenario: 'MANAGED_WITH_DRAFT' | 'UNMANAGED' | 'READ_ONLY_QUERY';
  strictLevel: 'STRICT_2' | 'STRICT_1' | 'STANDARD';
  draftHandling: {
    enabled: boolean;
    draftTablePrefix: string;
    totalETagField: string;
    invalidationHours: number;
  };
  supportedOperations: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  actions: Array<{
    name: string; // e.g. "approvePurchaseOrder"
    description: string;
    isInstanceAction: boolean;
    parameterEntity?: string;
    resultEntity?: string;
    cleanCoreCompliant: boolean;
  }>;
  validations: Array<{
    name: string; // e.g. "validateDeliveryDate"
    description: string;
    triggerOperations: Array<'CREATE' | 'UPDATE'>;
    triggerFields: string[];
  }>;
  determinations: Array<{
    name: string; // e.g. "calculateTotalAmount"
    triggerTime: 'ON_MODIFY' | 'ON_SAVE';
    triggerFields: string[];
  }>;
  serviceExposure: {
    serviceDefinitionName: string; // e.g. "ZUI_PURCHASEORDER_V4"
    serviceBindingName: string; // e.g. "ZUI_PURCHASEORDER_V4_O4"
    protocol: 'ODATA_V4' | 'ODATA_V2';
    bindingType: 'UI_ODATA_V4' | 'WEB_API_ODATA_V4';
  };
  cleanCoreTier: 'TIER_1_DEVELOPER' | 'TIER_2_CLOUD_READY';
}
```

---

### 2.5 ArtifactRecord Schema
Maintains fine-grained metadata, hashes, and edit flags for every generated source file.

```typescript
export interface ArtifactRecord {
  artifactId: string; // UUID or deterministic hash
  relativePath: string; // e.g. "abap/cds/ZR_PurchaseOrderTP.bdef"
  artifactType:
    | 'CDS_VIEW_ENTITY'
    | 'CDS_PROJECTION_VIEW'
    | 'BEHAVIOR_DEFINITION'
    | 'BEHAVIOR_IMPLEMENTATION'
    | 'SERVICE_DEFINITION'
    | 'SERVICE_BINDING'
    | 'METADATA_EXTENSION'
    | 'UI5_MANIFEST'
    | 'UI5_CONFIG'
    | 'UI5_ANNOTATIONS'
    | 'MOCK_DATA'
    | 'MOCK_METADATA';
  content: string;
  sizeBytes: number;
  contentHash: string; // SHA-256 of current content
  baseGenerationHash: string; // SHA-256 at time of template generation
  isManuallyEdited: boolean; // Flagged true if user edited code in studio
  generatorVersion: string; // e.g. "Fiorify-abap-gen-1.0.0"
  inputSpecVersion: number;
  dependentArtifactIds: string[];
  generatedTimestamp: string;
  lastEditedTimestamp?: string;
  validationStatus: 'VALID' | 'WARNING' | 'ERROR' | 'UNVALIDATED';
  reviewStatus: 'UNREVIEWED' | 'APPROVED' | 'REJECTED';
}
```

---

### 2.6 MockServiceDefinition Schema
Defines mock OData entities and local preview configuration.

```typescript
export interface MockServiceDefinition {
  serviceId: string;
  serviceName: string;
  odataVersion: 'V4';
  metadataXmlPath: string;
  entities: Array<{
    entitySetName: string;
    entityTypeName: string;
    keyFields: string[];
    mockDataJsonPath: string;
    recordCount: number;
  }>;
}
```

---

### 2.7 ValidationReport Schema
Output of the multi-category static validation engine.

```typescript
export interface ValidationReport {
  reportId: string;
  projectId: string;
  executedAt: string;
  overallScore: number; // 0 to 100
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  summaryCounts: {
    critical: number;
    warning: number;
    info: number;
    passed: number;
  };
  findings: ValidationFindingItem[];
}

export interface ValidationFindingItem {
  id: string;
  category: 'SYNTAX' | 'RAP_STRUCTURE' | 'CLEAN_CORE' | 'UI_METADATA' | 'SECURITY';
  ruleId: string; // e.g. "CC-CDS-001"
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  targetArtifactId?: string;
  targetLineNumber?: number;
  evidence: string;
  suggestedRemediation: string;
  sapStandardReference: string;
}
```

---

### 2.8 ReviewRecord & ProjectActivity Schemas
Records human governance and complete audit trail.

```typescript
export interface ReviewRecord {
  reviewId: string;
  reviewedBy: string;
  reviewerRole: 'LEAD_ARCHITECT' | 'DEVELOPER' | 'ADMIN';
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  comments: string;
  reviewedAt: string;
  reviewedHash: string; // Package hash at time of review
}

export interface ProjectActivity {
  activityId: string;
  timestamp: string;
  actor: string;
  actionType:
    | 'PROJECT_CREATED'
    | 'REQUIREMENT_UPDATED'
    | 'DATA_MODEL_MODIFIED'
    | 'ARCHITECTURE_CHANGED'
    | 'ARTIFACTS_GENERATED'
    | 'ARTIFACT_MANUALLY_EDITED'
    | 'VALIDATION_EXECUTED'
    | 'REVIEW_SUBMITTED'
    | 'PACKAGE_EXPORTED';
  details: Record<string, any>;
}
```

---

### 2.9 ExportManifest Schema
Included in root of generated ZIP bundle for verification and tooling import.

```typescript
export interface ExportManifest {
  manifestVersion: '1.0.0';
  generator: 'Fiorify Generation Studio';
  exportTimestamp: string;
  projectMetadata: {
    projectId: string;
    sourceTCode: string;
    targetRelease: string;
    targetSystem: string;
    client: string;
    package: string;
  };
  packageIntegrity: {
    masterSha256: string;
    totalFiles: number;
    totalSizeBytes: number;
  };
  artifacts: Array<{
    path: string;
    type: string;
    sha256: string;
    sizeBytes: number;
    manuallyEdited: boolean;
  }>;
}
```
