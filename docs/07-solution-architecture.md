# Solution Architecture
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. Architectural Style & Core Pattern

Fiorify is designed as a **Modular CAP Monolith** paired with an enterprise **React 18 / Fiori Horizon web workbench**. It deliberately avoids premature microservice fragmentation, hosting domain services within a single scalable CAP Node.js container on SAP BTP Cloud Foundry.

```mermaid
flowchart TB
    subgraph UserTier ["Enterprise Personas"]
        U1[SAP Functional Consultants]
        U2[Senior ABAP Developers]
        U3[Solution Architects & Approvers]
    end

    subgraph ClientTier ["Client Tier (Browser)"]
        UI[Fiorify Frontend: React 18 + TypeScript + Vite]
        Tokens[SAP Fiori Horizon Design System & Tokens]
        Router[React Router 6: 6 Primary Navigation Areas]
        UI --- Tokens
        UI --- Router
    end

    subgraph BTPTier ["SAP BTP Cloud Foundry Platform"]
        AR[SAP BTP Managed Application Router]
        XSUAA[SAP Cloud Identity Services / XSUAA (JWT RBAC)]
        
        subgraph CAPCore ["Modular CAP Node.js Application"]
            LS[LandscapeService]
            DS[DiscoveryService]
            AS[AssessmentService]
            CS[CatalogueService]
            FS[FitGapService]
            GS[GenerationService]
            GS_Gov[GovernanceService]
            JobQueue[Database-Backed Job Queue Engine]
        end
        
        DMS[SAP Document Management Service (DMS)]
        
        AR -->|Route & Proxy| CAPCore
        AR --- XSUAA
        CAPCore --> JobQueue
        CAPCore --> DMS
    end

    subgraph PersistenceTier ["Persistence Tier"]
        DB[(SAP HANA Cloud HDI / Local SQLite)]
        CAPCore -->|OData V4 / CQN| DB
        JobQueue -->|Row-Lock Polling| DB
    end

    subgraph ConnectivityTier ["BTP Secure Connectivity"]
        Dest[SAP BTP Destination Service]
        Conn[SAP BTP Connectivity Service]
        SCC[SAP Cloud Connector (On-Premise DMZ)]
        
        CAPCore --> Dest
        Dest --> Conn
        Conn --> SCC
    end

    subgraph SAPTier ["Target SAP Landscape (On-Premise)"]
        S4[SAP S/4HANA On-Premise DEV Sandbox]
        ADT[ADT REST Resources: /sap/bc/adt/*]
        Gateway[Gateway OData Catalogs: /sap/opu/odata/*]
        SU24[Authorization Tables: USOBX_C, USOBT_C]
        Tables[Metadata Tables: TSTC, TADIR, DD02L]
        
        SCC --> S4
        S4 --- ADT
        S4 --- Gateway
        S4 --- SU24
        S4 --- Tables
    end

    UserTier --> UI
    UI -->|OData V4 & Async Actions| AR
```

## 2. Tier Responsibilities

1. **Client Tier (React 18 + Vite):**
   - Renders the 6 primary navigation areas: Dashboard, SAP Landscape, Discovery, Assessments, Fiori Catalogue, and Governance.
   - Houses the unified 9-tab **Assessment Workspace** (`/assessments/:id`).
   - Binds directly to CAP OData V4 services via typed client abstractions.
   - Strictly enforces read-only display for unconfirmed objects and gates custom generation behind approved `BUILD` decisions.

2. **BTP Platform Tier (Managed App Router & XSUAA):**
   - Terminates user TLS connections, validates corporate identity tokens (IAS/XSUAA), and enforces role-based access control.
   - Serves static React assets from the HTML5 Application Repository.

3. **CAP Core Backend Tier (Node.js/TypeScript):**
   - Implements business logic, validation rules, state transitions, and audit logging.
   - Houses the persistent, database-backed asynchronous job engine for long-running discovery and where-used scans.
   - Communicates with S/4HANA exclusively through BTP Destination and Connectivity services.

4. **Persistence Tier (HANA Cloud / SQLite):**
   - Stores Fiorify metadata, snapshots, requirements, catalog data, fit-gap matrices, and audit logs across 28+ relational entities.
   - Never stores or replicates transactional SAP business documents.

5. **On-Premise SAP Tier (S/4HANA):**
   - Remains the authoritative source of truth for technical repository objects, package hierarchies, and SU24 authorization proposals.
   - Read-only access enforced by communication role `Z_Fiorify_DISCOVERY_RO`.

---

## 3. Actual Local Implementation Architecture (Sprint 5 — Sprint 7)

While Section 1 describes the target production CAP deployment architecture on SAP BTP Cloud Foundry, **Sprint 5 through 7 operationalized a strictly local, high-fidelity discovery runtime on Windows** to accelerate discovery and testing without deploying unvetted code to enterprise BTP spaces.

```mermaid
flowchart TD
    subgraph Client ["Developer Workstation (Windows)"]
        Browser["React 19 / Vite Frontend (localhost:5173)"]
        Backend["Native Node 20 LTS HTTP Backend (localhost:4004)"]
        Cache[("Local Disk Snapshot Cache (backend/data/)")]
        Browser -->|REST / JSON| Backend
        Backend --> Cache
    end

    subgraph SAP_Gateway ["SAP S/4HANA 2023 System S21 (Client 200)"]
        GW_Catalog["/sap/opu/odata/IWFND/CATALOGSERVICE;v=2 (1,318 Services)"]
        GW_Meta["/sap/opu/odata/sap/*/$metadata (EDMX Parser)"]
        ADT_Probe["/sap/bc/adt/discovery (Probing - HTTP 403 Audit)"]
    end

    subgraph SAP_Cloud ["SAP Official Cloud Assets"]
        FioriLib["Official SAP Fiori Apps Reference Library (SingleApp.xsodata)"]
    end

    Backend -->|Direct LAN HTTP (Read-Only)| GW_Catalog
    Backend -->|Direct LAN HTTP (Read-Only)| GW_Meta
    Backend -->|Direct LAN HTTP (Read-Only)| ADT_Probe
    Backend -->|Public HTTPS (Read-Only)| FioriLib
```

### Actual Implementation Highlights:
- **Runtime:** Native Node.js HTTP server (`backend/src/server.js`) avoiding heavy CAP framework overhead during rapid discovery.
- **Direct S21 Gateway Access:** Communicates via direct office LAN route (`192.168.1.55:8000`) configured via `.env` (`SAP_URL_OVERRIDE`), bypassing the virtual host `kbl_fiori` which is unreachable outside the Cloud Connector tunnel.
- **Official Fiori Catalogue:** Integrated with SAP's live OData v2 service (`SingleApp.xsodata/InputFilterParam(InpFilterValue='1NA')/Results`) with local disk snapshot caching for offline resilience.
- **Technical vs. Functional Distinction:** Candidate evaluation matches backend OData service dependencies (`ZFAP_PAYMENT_POST_SRV`), establishing technical candidate viability while explicitly flagging that functional equivalence assessment remains required.
