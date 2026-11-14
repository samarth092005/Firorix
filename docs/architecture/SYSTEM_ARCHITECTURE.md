# Fiorify — System Architecture Specification

## 1. Executive Summary

Fiorify is a Clean Core SAP modernization platform designed to transition enterprises from legacy SAP GUI transactions to modern SAP Fiori applications and ABAP RESTful Application Programming Model (RAP) services.

The platform provides end-to-end governance across five core stages:
1. **Discovery & Kernel Inspection**: Grounded in live SAP kernel tables (`TSTC`, `TADIR`, dynpro definitions) and the SAP Fiori Reference Library.
2. **Fit-Gap Assessment**: Multi-dimensional scoring evaluating functional parity, UI requirements, business logic, and extensibility.
3. **Governance & Decision**: Two-outcome governance model strictly enforcing `ADD_AND_CONFIGURE` or `BUILD` with separation of duties.
4. **RAP & Fiori Code Generation**: Deterministic synthesis of modern Clean Core CDS View Entities, Behavior Definitions, Behavior Classes with defensive EML, domain-realistic DCLs, and Fiori Elements V4 applications.
5. **Validation, Preview & Safe Handover**: Local mock preview on loopback and deployment orchestration with an enforced SAP Write Boundary.

---

## 2. High-Level Component Architecture

```mermaid
flowchart TD
    subgraph Client_Layer ["Client Presentation Tier (Browser / Desktop)"]
        UI_SPA["React 18 + TypeScript SPA\n(Vite Bundler, SAP Horizon Design)"]
        ADT_CLI["Developer Tools\n(Eclipse ADT / SAP BAS / VS Code)"]
    end

    subgraph Fiorify_Platform ["Fiorify Core Application Tier (Node.js 20 LTS)"]
        HTTP_GW["Native HTTP Server / API Gateway\n(Routes, Authentication, RBAC, Tenant Scoping)"]
        
        subgraph Core_Engines ["Domain & Lifecycle Engines"]
            DISC_SRV["Transaction Discovery Engine\n(Live Gateway & Cached Catalog)"]
            FITGAP_SRV["Fit-Gap Evaluation Engine\n(5-Dimension Matrix & Recommendation)"]
            GOV_SRV["Governance & Handoff Store\n(Two-Outcome Sign-Off & Audit Log)"]
            SPEC_SRV["Specification Lifecycle Service\n(Versioning & Diff Engine)"]
            GEN_ENG["RAP & Fiori Generator Suite\n(Deterministic DDL/CDS/BDEF/DCL/UI5)"]
            DEP_ORCH["Deployment Orchestrator\n(Topological DAG & Write Boundary Guard)"]
        end

        subgraph Security_Infrastructure ["Enterprise Security & Persistence"]
            CRYPTO["Cryptographic Signature Service\n(Keyed HMAC-SHA256, Rotation, KMS Abstraction)"]
            AUDIT["Security Audit Logger\n(Append-Only Tamper-Evident Ledger)"]
            MOCK_ODATA["Ephemeral Mock OData V4 Engine\n(Loopback 127.0.0.1:4050, In-Memory DB)"]
            SAP_CLIENT["Hardened SAP HTTP Client\n(Canonicalization, Traversal Guard, Read-Only Boundary)"]
        end
    end

    subgraph Data_Tier ["Authoritative Persistence Tier"]
        PG_DB[("PostgreSQL 15+\n(Migrations 001–007, Multi-Tenant Tables)")]
    end

    subgraph SAP_Landscape ["Target SAP Landscape (S21 / Client 200)"]
        SAP_GW["SAP Gateway / ICF\n(/sap/opu/odata, /sap/bc/adt)"]
        SAP_CORE["SAP S/4HANA 2023 Kernel\n(TSTC, TADIR, CDS Runtime)"]
    end

    UI_SPA <-->|REST API + Bearer JWT| HTTP_GW
    HTTP_GW --> Core_Engines
    Core_Engines --> Security_Infrastructure
    Core_Engines <-->|Connection Pool max:20| PG_DB
    SAP_CLIENT -->|HTTP GET/HEAD Only| SAP_GW
    SAP_GW --> SAP_CORE
    DEP_ORCH -.->|Halts at Write Boundary| SAP_GW
    ADT_CLI <-->|Import Handover PKZIP| Fiorify_Platform
```

---

## 3. Core Architectural Principles

### 3.1 Clean Core & Extensibility Model
Fiorify strictly adheres to the SAP Clean Core methodology:
- **Zero Modifications to Core SAP Objects**: Standard SAP code is never modified.
- **ABAP Cloud Language Version**: Generated CDS view entities use `define view entity` (Release State 2) and Behavior Definitions enforce `strict ( 2 );`.
- **Public SAP APIs Only**: Where standard APIs exist, they are leveraged. Standard Fiori apps take precedence over custom development.

### 3.2 Two-Outcome Governance Model
Every transaction evaluation must resolve into one of exactly two approved outcomes:
1. **`ADD_AND_CONFIGURE`**: Standard Fiori replacement app exists. The action plan prescribes activation via `/IWFND/MAINT_SERVICE` and Launchpad configuration.
2. **`BUILD`**: Genuine functional gaps exist. Custom development is authorized, triggering Generation Studio handoff.
*Note: The legacy outcome `EXTEND` is deprecated and eliminated from active workflows.*

### 3.3 Separation of Duties & Cryptographic Integrity
- **Role Separation**: Assessment creators cannot self-approve their own assessments.
- **Administrative Override**: Only authenticated `ADMIN` or `LEAD_ARCHITECT` identities may override governance recommendations.
- **Keyed Signatures**: Approvals use HMAC-SHA256 (`sig:v1:<digest>`), binding plan hashes, manifests, approvers, and timestamps to eliminate replay and forgery risks.

### 3.4 Zero-Mutation SAP Safety Boundary
Fiorify interacts with SAP system `S21` strictly as a read-only client:
- Mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) are trapped and rejected at the client layer.
- Deployment planning generates ordered installation instructions but terminates before issuing SAP repository modifications.

---

## 4. Subsystem Interactions

```mermaid
sequenceDiagram
    autonumber
    actor User as Enterprise Consultant
    participant Frontend as React UI SPA
    participant Backend as Node.js Platform
    participant DB as PostgreSQL
    participant SAP as SAP S21 Gateway

    User->>Frontend: Inspect T-Code (e.g. VA01 / ME21N)
    Frontend->>Backend: GET /api/v1/discovery/:tcode
    Backend->>SAP: GET /sap/opu/odata/IWFND/CATALOGSERVICE (Read-Only)
    SAP-->>Backend: Service Catalog & Annotations
    Backend->>DB: Record Discovery Snapshot
    Backend-->>Frontend: Discovered Capabilities & Successors

    User->>Frontend: Execute Fit-Gap Scoring
    Frontend->>Backend: POST /api/v1/fit-gap/assess
    Backend->>DB: Persist Assessment (Migrations 001/005)
    Backend-->>Frontend: Fit-Gap Breakdown & Recommended Outcome

    alt Outcome is BUILD
        User->>Frontend: Request Enterprise Architect Approval
        Frontend->>Backend: POST /api/v1/assessments/:id/approve
        Backend->>Backend: Enforce SoD & Sign with HMAC-SHA256 (sig:v1)
        Backend->>DB: Record Approval & Modernization Handoff
        Backend-->>Frontend: Approval Confirmation
    end
```

---

## 5. Technology Stack Summary

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | 18.3.1 | Single-Page Application |
| **Language** | TypeScript | 5.3.3 | Type safety and developer contracts |
| **Build Tooling** | Vite | 5.4.21 | Hot module replacement & production bundling |
| **Design Language** | SAP Horizon Theme | Custom CSS | Clean, modern enterprise styling |
| **Backend Runtime** | Node.js LTS | 20.x | High-throughput, non-blocking I/O |
| **Database** | PostgreSQL | 15+ | Relational persistence with JSONB and multi-tenancy |
| **Connection Pool** | pg (node-postgres) | 8.11.3 | Max 20 connections, idle & timeout guards |
| **Crypto** | Node.js `crypto` | Built-in | HMAC-SHA256, timingSafeEqual, PKZIP streaming |
| **SAP Target** | SAP S/4HANA | 2023 On-Premise | S21 Clean Core target landscape |
