# System Architecture Map: Fiorify Platform

**Document Reference**: `docs/audit/SYSTEM_ARCHITECTURE_MAP.md`  
**Audit Baseline**: Commit `4c7f9a3` (Branch `test-01`)  
**Architecture Classification**: Enterprise Hybrid SaaS / SAP BTP Side-by-Side Modernization Platform

---

## 1. End-to-End System Architecture Diagram

```mermaid
flowchart TB
    subgraph Client_Tier ["Frontend Presentation Layer (React 18 / Vite / TypeScript)"]
        UI_SHELL["App Shell & Navigation\n(TopBar, Sidebar, Breadcrumbs)"]
        UI_DISC["Transaction Discovery & Checker\n(/transaction-discovery)"]
        UI_RES["Assessment Results & Workspace\n(/assessment-results/:id)"]
        UI_HIST["Assessment History & Governance\n(/assessment-history)"]
        UI_GEN["Generation Studio (10 Phases)\n(/generation-studio)"]
        UI_SYS["System Landscape & MCP Admin\n(/system-configuration)"]
        UI_API["Central API Client\n(apiClient.ts, Bearer Tokens)"]
    end

    subgraph Security_Boundary ["Security & Governance Perimeter"]
        SEC_AUTH["JWT Authentication & RBAC\n(authService.js / USER_ROLES)"]
        SEC_AUDIT["Cryptographic Audit Logger\n(securityAuditLogger.js / SHA-256 Chain)"]
        SEC_SIG["Cryptographic Signature Service\n(cryptographicSignatureService.js / HMAC-SHA256)"]
        SEC_HTTP["SAP Read-Only Boundary Client\n(sapHttpClient.js / Host & Path Defense)"]
    end

    subgraph Backend_Gateway ["Backend Application Server (Node.js Native HTTP / ESM)"]
        SRV_MAIN["Core HTTP Server\n(server.js - Port 4004 / 4050)"]
        RT_SYS["System Routes\n(/api/v1/systems)"]
        RT_CAT["Catalogue Routes\n(/api/v1/fiori-catalogue)"]
        RT_DISC["Discovery Routes\n(/api/v1/discovery)"]
        RT_FITGAP["Fit-Gap Routes\n(/api/v1/fit-gap)"]
        RT_ASSESS["Assessment Routes\n(/api/v1/assessments)"]
        RT_GEN["Generation Routes\n(/api/v1/generation)"]
        RT_MCP["MCP Routes\n(/api/v1/mcp)"]
    end

    subgraph Core_Engines ["Business Intelligence & Modernization Engines"]
        ENG_DISC["Transaction Discovery Engine\n(transactionDiscoveryEngine.js)"]
        ENG_EVID["Technical Evidence Engine\n(technicalEvidenceEngine.js)"]
        ENG_MATCH["Fiori Matching Engine\n(fioriMatchingEngine.js)"]
        ENG_FITGAP["Fit-Gap Assessment Engine\n(fitGapAssessmentEngine.js - 5/10 Dim)"]
        ENG_REC["Governed Recommendation Engine\n(recommendationEngine.js - 2 Outcomes)"]
    end

    subgraph Generation_Subsystem ["Generation Studio Engine (Clean Core RAP)"]
        GEN_ARCH["Architecture Decision Engine\n(architectureDecisionEngine.js)"]
        GEN_DM["Data Model & Archetype Engine\n(semanticArchetypeEngine.js)"]
        GEN_ABAP["ABAP RAP Generator Engine\n(CDS, BDEF, Classes, DCL, SRVD, SRVB)"]
        GEN_UI["Fiori Elements UI Generator\n(Manifest, Annotations, UI5 Scaffolds)"]
        GEN_PREV["Local Preview & Mock OData V4\n(previewManager.js / mockODataServer.js)"]
        GEN_DEPLOY["Deployment Orchestrator\n(deploymentOrchestrationService.js)"]
    end

    subgraph Persistence_Tier ["Persistence Foundation (PostgreSQL 15+ / Dual Store)"]
        DB_POOL["Connection Pool Manager\n(pool.js / pg.Pool)"]
        DB_MIG["Schema Migrator\n(migrator.js - Migrations 001-007)"]
        DB_REPOS["Domain Repositories\n(Assessment, Catalogue, Project, Deployment)"]
        FS_BACKUP["Local File Store Fallback\n(JSON Stores for Offline Dev)"]
    end

    subgraph External_Integration ["SAP S/4HANA Enterprise Landscape"]
        BTP_DEST["BTP Destination Service\n(Destination: S21 / Client 200)"]
        BTP_CONN["BTP Connectivity Service\n(TLS Reverse Tunnel)"]
        SCC["SAP Cloud Connector\n(Location ID / Virtual Host)"]
        SAP_GW["SAP Gateway / ICF Services\n(/sap/opu/odata/IWFND/CATALOGSERVICE)"]
        SAP_ADT["SAP ADT QuickSearch\n(/sap/bc/adt/repository/informationsystem)"]
        SAP_CORE["SAP S/4HANA 2023 System S21\n(Client 200 - User: int_samarth)"]
    end

    %% Client to Backend
    UI_SHELL --> UI_API
    UI_DISC --> UI_API
    UI_RES --> UI_API
    UI_HIST --> UI_API
    UI_GEN --> UI_API
    UI_SYS --> UI_API
    UI_API -->|HTTP REST + Bearer Token| SRV_MAIN

    %% Server to Middleware & Routes
    SRV_MAIN --> SEC_AUTH
    SRV_MAIN --> SEC_AUDIT
    SRV_MAIN --> RT_SYS & RT_CAT & RT_DISC & RT_FITGAP & RT_ASSESS & RT_GEN & RT_MCP

    %% Routes to Engines
    RT_DISC --> ENG_DISC
    ENG_DISC --> ENG_EVID
    RT_CAT --> ENG_MATCH
    RT_FITGAP --> ENG_FITGAP
    ENG_MATCH --> ENG_FITGAP
    ENG_FITGAP --> ENG_REC
    RT_GEN --> GEN_ARCH --> GEN_DM --> GEN_ABAP & GEN_UI --> GEN_PREV
    RT_GEN --> GEN_DEPLOY --> SEC_SIG

    %% Engines to Adapters & SAP Security Boundary
    ENG_DISC --> SEC_HTTP
    ENG_MATCH --> SEC_HTTP
    SEC_HTTP --> BTP_DEST --> BTP_CONN --> SCC --> SAP_GW & SAP_ADT --> SAP_CORE

    %% Persistence
    ENG_REC --> DB_REPOS
    GEN_DEPLOY --> DB_REPOS
    DB_REPOS --> DB_POOL --> DB_MIG
    DB_REPOS -.->|Fallback when DB unset| FS_BACKUP
```

---

## 2. Component Topology & Tier Specifications

### 2.1 Tier 1: Client Presentation Tier (Frontend)
- **Framework**: React 18.3.1 with TypeScript 5.5.
- **Build Tool**: Vite 5.4.21 with `@vitejs/plugin-react`.
- **Styling**: Vanilla CSS with strict CSS custom properties following SAP Fiori design language (Horizon theme: `#0070F2`, `#1D2D3E`, `#F5F6F7`, SAP 72 typography).
- **Icons**: `lucide-react` (enterprise-clean stroke icons).
- **Routing**: `react-router-dom` 6.22 with route-level code splitting (`React.lazy` and `React.Suspense`).
- **State Management**: Local component state, custom hooks, and centralized service adapters. No heavy Redux or MobX dependencies.
- **Production Asset Size**: 2,067 modules transformed into ~480 kB gzipped JavaScript bundle.

### 2.2 Tier 2: Security & Governance Boundary
- **Authentication**: Stateless RFC 7519 JSON Web Tokens (HS256/RS256) via `JwtVerifier.js`, evaluated in `server.js` middleware.
- **Role-Based Access Control (RBAC)**: Central authorization matrix in `authService.js` enforcing 6 roles (`ADMIN`, `LEAD_ARCHITECT`, `SAP_CONSULTANT`, `REQUESTER`, `APPROVER`, `VIEWER`) and 17 granular permissions.
- **Cryptographic Signature Engine**: Keyed HMAC-SHA256 (`cryptographicSignatureService.js`) enforcing immutable signatures over deployment plans and architectural approvals. Supports key rotation via `sig:<version>:<digest>` prefixes.
- **SAP Read-Only Boundary**: `SapHttpClient.js` strictly asserts `assertReadOnly` (throwing 403/AUTHORIZATION_BLOCKED on `POST`, `PUT`, `PATCH`, `DELETE`) and enforces strict path canonicalization against SSRF and directory traversal.
- **Security Audit Trail**: Append-only tamper-evident audit logger (`securityAuditLogger.js`) calculating a cryptographic SHA-256 hash chain (`integrityHash = SHA256(prevHash + event)`).

### 2.3 Tier 3: Core Business & Modernization Engines
- **Transaction Discovery Engine (`transactionDiscoveryEngine.js`)**: Evaluates SAP transaction syntax, orchestrates live ADT quick search and Gateway Catalog probes, and assigns multi-source evidence confidence.
- **Technical Evidence Engine (`technicalEvidenceEngine.js`)**: Normalizes evidence into 5 canonical categories:
  1. Transaction Identity (TSTC / TSTCT)
  2. Program & Dynpro Metadata (TADIR / TRDIR)
  3. Database Dictionary & CDS Views (DDIC / DD02L / CDS)
  4. Gateway & OData Services (IWFND / ServiceCollection)
  5. Security & Authorizations (USOBX / USOBT / PFCG)
- **Fiori Application Matching Engine (`fioriMatchingEngine.js`)**: Indexes official SAP Fiori Apps Reference Library records, evaluates candidates across 6 dimensions, and calculates deterministic rankings.
- **Fit-Gap Assessment Engine (`fitGapAssessmentEngine.js`)**: Evaluates business requirements against candidates using 5-dimension classic weights (35% functional, 25% technical, 15% process, 15% activation/roles, 10% compatibility) or 10-dimension granular weights. Enforces clean core guardrails (technical score cannot hide functional failure).
- **Governed Recommendation Engine (`recommendationEngine.js`)**: Enforces exactly two active business outcomes: `ADD_AND_CONFIGURE` and `BUILD`. Verifies the 9-point precondition checklist before permitting custom development.

### 2.4 Tier 4: Generation Studio Subsystem
- **Architecture Decision Engine (`architectureDecisionEngine.js`)**: Determines target RAP profile (`MANAGED_RAP_UUID`, `MANAGED_RAP_EXTERNAL_KEY`, `UNMANAGED_RAP`) and deployment pattern.
- **Data Model Designer (`dataModelService.js` / `semanticArchetypeEngine.js`)**: Designs entities, fields, keys, data types, compositions, associations, and semantic annotations.
- **ABAP RAP Generator (`abapGeneratorEngine.js`)**: Synthesizes CDS Interface View Entities (`ZI_*`), CDS Projection Views (`ZC_*`), Behavior Definitions (`BDEF`), Service Definitions (`SRVD`), Service Binding Proposals (`.srvb.json`), Behavior Class Scaffolds (`BP_I_*`), and DCL Access Controls (`Z_*_DCL`).
- **Fiori Elements Generator (`fioriGeneratorEngine.js`)**: Generates UI5 project manifests (`manifest.json`), UI annotations (`annotations.xml`), and local webapp test harnesses.
- **Mock OData V4 Engine (`previewManager.js` / `mockODataServer.js`)**: In-memory HTTP server providing `$metadata`, service documents, synthetic entity collections, filtering, paging, and navigation with mandatory preview watermarking.
- **Deployment Orchestrator (`deploymentOrchestrationService.js`)**: Computes directed acyclic graph (DAG) execution plans, calculates SHA-256 artifact manifest digests, verifies Chief Architect HMAC signatures, and halts execution at the SAP write boundary.

### 2.5 Tier 5: Persistence Foundation (PostgreSQL)
- **Database Engine**: PostgreSQL 15+ hosted on Hyperscaler or SAP HANA Cloud PostgreSQL.
- **Connection Pool**: `pg.Pool` with SSL/TLS configuration, parameterized queries, and graceful shutdown.
- **Migration Framework**: Native checksum-validated sequential migrator (`migrator.js`) supporting reversible schema evolution (Migrations 001 through 007).
- **Dual-Store Architecture**: Repositories operate seamlessly against PostgreSQL when `FIORIFY_PERSISTENCE=postgres` or fall back to local JSON file stores for offline development.

### 2.6 Tier 6: External SAP S/4HANA Integration
- **Connectivity Model**: SAP BTP Connectivity Service and Destination Service communicating via SAP Cloud Connector over TLS reverse tunnel.
- **Target Landscape**: SAP S/4HANA 2023 On-Premise / Private Edition, System `S21`, Client `200`.
- **Target User**: `int_samarth` (retaining administrative `SAP_ALL` as a known external constraint; protected exclusively by Fiorify application-side read-only boundaries).

---

## 3. Request Lifecycle Traces

### 3.1 Trace A: SAP Transaction Discovery (`POST /api/v1/discovery/transaction`)

```mermaid
sequenceDiagram
    autonumber
    actor User as SAP Consultant (Browser)
    participant UI as Frontend Discovery View
    participant API as Central API Client
    participant Srv as Server Router
    participant Auth as AuthService (JWT)
    participant Disc as TransactionDiscoveryEngine
    participant Client as SapHttpClient
    participant SCC as SAP Cloud Connector
    participant S21 as SAP S21 (Gateway/ADT)
    participant DB as Assessment/Master DB

    User->>UI: Enters T-Code (e.g. ME21N) & Target System (S21-200)
    UI->>API: apiClient.post('/api/v1/discovery/transaction', payload)
    API->>Srv: HTTP POST /api/v1/discovery/transaction (Bearer Token)
    Srv->>Auth: Validate JWT & Scopes (Fiorify.discovery.execute)
    Auth-->>Srv: Validated UserContext (Role: SAP_CONSULTANT)
    Srv->>Disc: discover({ tcode: 'ME21N', systemId: 'S21-200' })
    Disc->>Disc: normalizeInput('ME21N') -> Valid Syntax
    Disc->>Client: Query ADT QuickSearch & Gateway Catalog
    Client->>Client: assertReadOnly('GET') & assertAllowedEndpoint()
    Client->>SCC: HTTPS GET /sap/bc/adt/repository/informationsystem/search...
    SCC->>S21: Forward to S21 Client 200
    S21-->>SCC: Return XML ObjectReference (Package: ME, Type: TRAN/T)
    SCC-->>Client: HTTP 200 OK + XML
    Client-->>Disc: Discovered Metadata (Live SAP S21 Observation)
    Disc->>DB: Persist Snapshot & Record (transaction_master_records)
    Disc-->>Srv: Canonical Discovery Record + Provenance: LIVE_SAP
    Srv-->>API: HTTP 200 OK (JSON Response)
    API-->>UI: Render T-Code Metadata, DDIC Entities & Verification Badges
```

### 3.2 Trace B: Fit-Gap Assessment & Governed Recommendation (`POST /api/v1/fit-gap/assess`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Solution Architect
    participant UI as Assessment Workspace
    participant Srv as Server Router
    participant FitGap as FitGapAssessmentEngine
    participant Rec as RecommendationEngine
    participant DB as PostgreSQL AssessmentRepo
    participant Audit as SecurityAuditLogger

    User->>UI: Trigger Assessment for Requirement & F0842A Candidate
    UI->>Srv: POST /api/v1/fit-gap/assess
    Srv->>FitGap: evaluate({ requirement, candidate, context })
    FitGap->>FitGap: Score 5 Classic & 10 Granular Dimensions
    FitGap->>FitGap: Normalize Weights across Applicable Dimensions
    FitGap->>FitGap: Check Clean Core Guardrail (Functional Fit Check)
    FitGap-->>Srv: Assessment Results (Overall Status: VERIFIED_FIT, Score: 88.5)
    Srv->>Rec: generate({ assessment, requirement, candidate })
    Rec->>Rec: Evaluate Decision Logic (Standard App Exists?)
    Rec->>Rec: Standard Fiori App fulfills requirements -> ADD_AND_CONFIGURE
    Rec-->>Srv: Governed Recommendation (Outcome: ADD_AND_CONFIGURE)
    Srv->>DB: Save Assessment & Dimensions (assessments, fit_gap_dimensions)
    Srv->>Audit: Log Assessment Creation with Hash Chain
    Srv-->>UI: Return Scored Assessment, Gaps, and Modernization Plan
```

### 3.3 Trace C: Generation Studio & Scaffolding Execution (`POST /api/v1/generation/projects/:id/artifacts`)

```mermaid
sequenceDiagram
    autonumber
    actor Arch as Lead Enterprise Architect
    participant UI as Generation Studio UI
    participant Srv as Generation Router
    participant Spec as SpecificationService
    participant ArchEng as ArchitectureDecisionEngine
    participant AbapGen as AbapGeneratorEngine
    participant Prev as PreviewManager
    participant FS as Local Artifact Store

    Arch->>UI: Confirm Data Model & Click "Generate All Clean Core Artifacts"
    UI->>Srv: POST /api/v1/generation/projects/:id/artifacts
    Srv->>Spec: Load Confirmed Project Specifications (Requirements + Data Model)
    Srv->>ArchEng: evaluate(project) -> MANAGED_RAP_UUID
    Srv->>AbapGen: generateAllArtifacts(project, architecture)
    AbapGen->>AbapGen: Generate ZI_* CDS Interface View Entities
    AbapGen->>AbapGen: Generate ZC_* CDS Projection Views & MDE
    AbapGen->>AbapGen: Generate BDEF Behavior Definitions
    AbapGen->>AbapGen: Generate BP_I_* Behavior Class Scaffolds (TODOs Flagged)
    AbapGen->>AbapGen: Generate Z_*_DCL Access Control (PFCG Mapped)
    AbapGen->>AbapGen: Generate .srvb.json Service Binding Proposal (Blueprint)
    AbapGen->>FS: Write Artifact Files with SHA-256 Checksums
    Srv->>Prev: Pre-load Synthetic Data Store for Preview
    Srv-->>UI: Return 14 Generated Artifacts & Handover Readiness Guide
    UI-->>Arch: Display Artifact Tree, Diff Viewer & Readiness Score (100%)
```

---

## 4. Implementation vs Configured vs Planned Status

| Subsystem / Component | Implementation Status | Evidence / Repository Location | Operational State |
|---|---|---|---|
| **Vite / React Frontend** | **IMPLEMENTED** | `frontend/src/` (2,067 modules, 204 tests) | Fully functional in browser; connects to backend APIs. |
| **Node.js HTTP Server & Router** | **IMPLEMENTED** | `backend/src/server.js`, `backend/src/routes/` | Fully functional; native ESM HTTP routing. |
| **SAP Read-Only Boundary** | **IMPLEMENTED** | `backend/src/infrastructure/connectivity/sapHttpClient.js` | Fully enforced; blocks mutating HTTP methods. |
| **BTP Destination Resolution** | **IMPLEMENTED** | `backend/src/adapters/btpDestinationAdapter.js` | Implements VCAP_SERVICES & local fallback lookup. |
| **Fiori Catalogue Ingestion & Cache** | **IMPLEMENTED** | `backend/src/adapters/officialFioriCatalogueAdapter.js` | Ingests CSV/JSON; caches 15,000+ Fiori apps. |
| **Fit-Gap Scoring (5 & 10 Dim)** | **IMPLEMENTED** | `backend/src/engine/fitGapAssessmentEngine.js` | Fully tested; normalized weights & score coverage. |
| **Governed Recommendation Engine** | **IMPLEMENTED** | `backend/src/engine/recommendationEngine.js` | Enforces `ADD_AND_CONFIGURE` and `BUILD`; 9 preconditions. |
| **RAP CDS & BDEF Generator** | **IMPLEMENTED** | `backend/src/generation/abap/` | Generates Clean Core CDS, BDEF, SRVD, SRVB proposals. |
| **Local OData V4 Preview Engine** | **IMPLEMENTED** | `backend/src/generation/preview/` | Serves mock OData V4 with permanent watermarking. |
| **PostgreSQL Schema (001-007)** | **IMPLEMENTED** | `backend/src/infrastructure/db/migrations/` | 28 tables, fully reversible, connection pooled. |
| **HMAC-SHA256 Signatures** | **IMPLEMENTED** | `backend/src/infrastructure/security/cryptographicSignatureService.js` | Keyed HMAC with key versioning; timing-safe checks. |
| **Cloud Foundry Manifest** | **CONFIGURED** | `manifest.yml` | Configured with service bindings and quotas. |
| **XSUAA Security Descriptor** | **CONFIGURED** | `xs-security.json` | 3 scopes, 3 role templates, 3 role collections. |
| **Root Monorepo Buildpack Script** | **NOT IMPLEMENTED** | Root workspace | Missing root `package.json` for CF buildpack staging. |
| **Native SAP ADT Transport Writer** | **BLOCKED BY DESIGN**| Repository-wide constraint | Intentionally forbidden; Fiorify operates read-only. |
| **SAP Gateway Service Activator** | **BLOCKED BY DESIGN**| Repository-wide constraint | Intentionally forbidden; requires manual Basis activation. |
| **Enterprise KMS Cloud Key Ring** | **PLANNED** | `cryptographicSignatureService.js:24` | Abstract provider defined; AWS/GCP KMS planned. |
