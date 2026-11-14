# Fiorify — Entity Relationship Specification

## 1. Relational Data Model

The Fiorify persistence layer links discovered SAP transactions, modernization assessments, generation projects, specification versions, and deployment approvals.

---

## 2. Entity-Relationship Diagram

```mermaid
erDiagram
    SAP_SYSTEM_REGISTRY ||--o{ DISCOVERED_TRANSACTIONS : "hosts"
    SAP_SYSTEM_REGISTRY ||--o{ SAP_DIAGNOSTIC_LOGS : "logs"
    
    DISCOVERED_TRANSACTIONS ||--o{ ASSESSMENTS : "evaluated_by"
    FIORI_APP_CATALOG ||--o{ CANDIDATE_SIMILARITY_CACHE : "matches"
    
    ASSESSMENTS ||--o| MODERNIZATION_HANDOFFS : "initiates"
    ASSESSMENTS ||--o{ MODERNIZATION_APPROVALS : "governed_by"
    ASSESSMENTS ||--o{ ASSESSMENT_HISTORY : "tracks"
    
    MODERNIZATION_HANDOFFS ||--o| GENERATION_PROJECTS : "spawns"
    
    GENERATION_PROJECTS ||--o{ PROJECT_SPECIFICATION_VERSIONS : "snapshots"
    GENERATION_PROJECTS ||--o{ PROJECT_SPECIFICATION_APPROVALS : "authorizes"
    GENERATION_PROJECTS ||--o{ DEPLOYMENT_PLANS : "packages"
    
    DEPLOYMENT_PLANS ||--o{ DEPLOYMENT_APPROVALS : "signed_by"
    DEPLOYMENT_PLANS ||--o{ DEPLOYMENT_EXECUTIONS : "executed_in"
    
    TENANT ||--o{ ASSESSMENTS : "scopes"
    TENANT ||--o{ GENERATION_PROJECTS : "scopes"
    TENANT ||--o{ SECURITY_AUDIT_EVENTS : "audits"

    ASSESSMENTS {
        string id PK
        string tenant_id FK
        string transaction_code
        string recommended_outcome
        string status
        jsonb scoring_breakdown
        timestamp created_at
    }

    MODERNIZATION_HANDOFFS {
        string id PK
        string assessment_id FK
        string project_id
        string target_package
        string handoff_status
        timestamp approved_at
    }

    GENERATION_PROJECTS {
        string project_id PK
        string tenant_id FK
        string base_transaction
        string target_package
        string lifecycle_status
        jsonb requirements_spec
        jsonb data_model_spec
        jsonb architecture_spec
        jsonb artifact_registry
    }

    DEPLOYMENT_PLANS {
        string id PK
        string project_id FK
        string tenant_id FK
        string target_system
        string status
        string plan_hash
        string artifact_manifest_hash
        jsonb plan_details
    }

    DEPLOYMENT_APPROVALS {
        bigint id PK
        string plan_id FK
        string decision
        string approver
        string approver_role
        string signature_hash
        timestamp approved_at
        timestamp expires_at
    }

    SECURITY_AUDIT_EVENTS {
        bigint event_id PK
        string tenant_id
        string actor
        string action
        string resource
        string outcome
        jsonb details
        timestamp timestamp
    }
```

---

## 3. Key Referential Integrity Rules

1. **Cascade Delete Protections**:
   - `deployment_approvals` and `deployment_executions` cascade on plan deletion.
   - Deleting an assessment is blocked if an active `modernization_handoff` or `generation_project` references it.
2. **Audit Permanence**:
   - `security_audit_events` has no foreign key cascade delete dependencies and cannot be truncated by tenant-level operations.
3. **Specification Immutability**:
   - `project_specification_versions` rows are immutable once committed (`status = 'APPROVED'`). Subsequent edits generate a new incremented version.
