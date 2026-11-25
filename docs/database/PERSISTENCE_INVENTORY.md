# Fiorify Persistence Inventory & Storage Audit (DB-001)
**Document Version:** 1.0.0  
**Audit Scope:** 14 State & Persistence Stores across Fiorify Backend

---

## 1. Master Persistence Inventory Matrix

| # | Store Name | Primary Entity | Storage Location / Table | Key Structure | Tenant Isolation | Lifecycle & Durability |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | `AssessmentStore` | Fit-Gap Assessments | `assessments` (table) / `data/assessments.json` | `id` (e.g. `ASM-VA01-001`) | Filter by `tenant_id` column; session context | Persistent; atomic temp file or DB row; SHA-256 audit chained |
| **2** | `GenerationHandoffStore` | Studio Handoffs | `generation_handoffs` (table) / `data/generationHandoffs.json` | `handoff_id` (UUID/slug) | Stored `tenantId`; filtered in `get`/`list` | Persistent; synchronized with Assessment approval state |
| **3** | `GenerationProjectStore` | Generation Projects | `generation_projects` (table) / `data/generation-projects/<id>/project.json` | `projectId` (e.g. `GEN-VA01-XXXX`) | Canonical folder per project; `tenantId` checked | Persistent; multi-file canonical project store with .bak recovery |
| **4** | `OfficialFioriCatalogueAdapter` | Standard Fiori Apps | `fiori_catalog_apps` (table) / memory catalog cache | `app_id` (e.g. `F0859`) | Shared system catalogue; cross-tenant read-only | Seeded from SAP Fiori Apps Reference Library (FAL) |
| **5** | `SapTransactionDiscoveryAdapter` | S21 T-Code Metadata | `transaction_profiles` (table) / cache | `(tcode, tenant_id, system_id)` | Tenant and SAP system scoped | Read-only SAP S21 metadata inspection; local cache |
| **6** | `SystemRegistry` | SAP Landscape Profiles | `sap_system_profiles` (table) / memory | `id` (e.g. `SYS-S21-200`) | Filtered by `tenant_id` | Persistent; BTP destination references; connection metadata |
| **7** | `SecurityAuditLogger` | Tamper-Evident Audit | `security_audit_events` (table) / memory fallback | `event_id` (e.g. `SEC-AUD-...`) | Stored `tenant_id`; filtered per tenant | Append-only; cryptographic SHA-256 hash chaining |
| **8** | `TokenRevocationStore` | Revoked JWT Hashes | `token_revocations` (table) / memory cache | `token_hash` (SHA-256 hex) | Indexed by hash; stores `tenantId` & `userId` | Expired records purged periodically; cluster-wide distributed |
| **9** | `RefreshTokenService` | Refresh Token Families | `refresh_tokens` (table) / memory cache | `token_hash` (SHA-256 hex) | Family scoped to `(userId, tenantId)` | One-time use rotation; replay detection revokes family |
| **10** | `SpecificationVersioningService` | Spec Snapshots | `generation_projects.project_data` / files | `version` (integer sequence) | Scoped to parent `projectId` | Versioned immutable snapshots with diff comparison |
| **11** | `DataModelService` | CDS Model Drafts | `generation_projects.project_data.dataModel` | `projectId` / `cdsEntity` | Scoped to parent `projectId` | Clean Core Tier-1/Tier-2 compliant CDS entity drafts |
| **12** | `RequirementsService` | Business Requirements | `generation_projects.project_data.requirements` | `projectId` | Scoped to parent `projectId` | User story and acceptance criteria structured models |
| **13** | `DeploymentRepository` | Cloud Foundry Logs | `deployment_records` (table) / files | `deployment_id` | Scoped to `tenantId` and `projectId` | Deployment manifest and execution telemetry tracking |
| **14** | `ArtifactStorage` | Generated Code Files | `project_artifacts` (table) / file system | `artifact_id` (SHA-256 checksum) | Scoped to `(projectId, tenantId)` | Content-addressed storage for ABAP CDS, UI5, manifests |

---

## 2. Store Migration & Storage Engine Summary

- **Local Development & CI Mode:** Stores operate with local PostgreSQL or embedded fallback (`embedded-postgres`), with atomic JSON file persistence available for offline developer sandboxes.
- **Production Mode (SAP BTP Cloud Foundry):** All stateful tables (`assessments`, `generation_handoffs`, `generation_projects`, `security_audit_events`, `token_revocations`, `refresh_tokens`, `project_artifacts`) MUST reside in **SAP HANA Cloud**.

> [!CAUTION]
> **Strict Production Durability Invariant:**
> In production (`NODE_ENV=production`), silent fallback to JSON files or volatile memory stores is **strictly prohibited**.
> If database connectivity or SAP HANA Cloud service bindings are missing or interrupted, the application server aborts startup or fails closed with `PRODUCTION_PERSISTENCE_REQUIRED` / `MISSING_PRODUCTION_HANA_BINDING`.
> Volatile in-memory and JSON file stores are developer-only conveniences and will never persist production business data.
