# FioriX — Current Architecture Audit (Phase S0)

**Document Version:** 1.0  
**Phase:** S0 — Audit & Architecture Baseline  
**Scope:** Complete platform topology, runtime analysis, module boundaries, and dependency landscape.  
**Operating Baseline:** Windows / Node.js 20 / Native HTTP / React Vite  
**Date:** November 2026

---

## 1. Executive Summary

FioriX is an enterprise SAP Modernization Platform targeting SAP S/4HANA 2023 On-Premise (baseline system `S21`, client `200`). Its core mission is to analyze existing SAP transactions, discover suitable standard SAP Fiori applications, identify functional and technical gaps, and generate custom Fiori applications only when no suitable standard solution exists.

The platform is split into two major functional sections:
1. **Discovery & Assessment Platform (Phase 0):** Transaction Discovery, Technical Evidence Collection, Canonical Fiori Catalogue Matching, Fit-Gap Assessment, and Governance Recommendation Engine.
2. **Generation Studio (Phase 1):** Project Workspace, Requirements Designer, Data Model Designer, Architecture Designer, ABAP Core Generator, Fiori UI Generator, Preview/Validation, Review & Export, and Environment Toolchain.

This document establishes the architecture baseline as of Phase S0 before introducing durable PostgreSQL persistence (S1), server-side security (S2), and production-grade SAP connectivity (S3).

---

## 2. Runtime & Deployment Architecture

```
[ Browser / User Interface ]
       │
       │ HTTP / JSON (REST APIs)
       ▼
┌────────────────────────────────────────────────────────────────────────┐
│  FioriX Backend Runtime (Node.js 20 Native HTTP)                      │
│  - server.js (Single-process HTTP server, port 3001)                   │
│  - No Express, No CAP, Zero external framework overhead               │
├────────────────────────────────────────────────────────────────────────┤
│  Core Subsystems:                                                      │
│  1. Discovery & Matching Engine (fioriMatchingEngine.js, etc.)        │
│  2. Assessment & Evidence Engine (assessmentStore.js, etc.)           │
│  3. Model Context Protocol (MCP Subsystem: mcpRoutes.js, etc.)         │
│  4. Generation Studio Subsystem (generationProjectService.js, etc.)   │
│  5. SAP Connectivity Adapters (btpDestinationAdapter.js, etc.)       │
└────────┬─────────────────────────┬────────────────────────────┬────────┘
         │                         │                            │
         ▼                         ▼                            ▼
┌──────────────────┐      ┌─────────────────────┐     ┌──────────────────┐
│ Four JSON Stores │      │ MCP Gateway / Tools │     │ SAP S/4HANA 2023 │
│  - assessments   │      │  - sap-discovery-   │     │  - BTP Dest.     │
│  - fiori_cache   │      │    server           │     │  - Cloud Conn.   │
│  - tx_snapshot   │      │                     │     │  - Gateway OData │
│  - gen_projects  │      └─────────────────────┘     │  - ADT / RFC     │
└──────────────────┘                                  └──────────────────┘
```

### 2.1 Backend Runtime (`backend/src/server.js`)
- **Technology:** Native Node.js `node:http` (strictly zero Express / CAP dependencies).
- **Process Model:** Single-process event-driven architecture listening on `PORT` (default 3001 or dynamic assignment in tests).
- **Routing:** Centralized request router matching path prefixes:
  - `/api/v1/system/*` -> System Registry & Profiles.
  - `/api/v1/tcode-search` -> Transaction Master Index search.
  - `/api/v1/discovery/*` -> Discovery and unified matching pipelines.
  - `/api/v1/catalogue/*` -> Canonical SAP Fiori Apps Reference Library.
  - `/api/v1/assessments/*` -> Fit-Gap assessments, lifecycle, audit trails, and actions.
  - `/api/v1/recommendations/*` -> Governance recommendation engine.
  - `/api/v1/mcp/*` -> Model Context Protocol discovery orchestrator.
  - `/api/v1/generation/*` -> Generation Studio project management, handoffs, and specifications.
- **Middleware Equivalents:**
  - Standard CORS handler (`Access-Control-Allow-Origin: *`, `GET, POST, PUT, PATCH, DELETE, OPTIONS`).
  - Request body buffer aggregation (`_readJsonBody` up to 10MB limit).
  - Timing-safe admin secret validation (`_validateAdminSecret`).
  - Structured JSON response helper with HTTP error formatting.

### 2.2 Frontend Runtime (`frontend/src/`)
- **Technology:** React 18 with TypeScript, Vite 5, Tailwind CSS, Lucide icons.
- **State Management:** Local React state, custom React hooks, and API service classes.
- **Routing:** Browser navigation via view state switching in `App.tsx` and URL query parameter reflection (`?tab=...&projectId=...&view=...`).
- **Main Shell Views:**
  1. `Overview`: Portfolio metrics, status distribution, and quick start.
  2. `TransactionDiscovery`: S/4HANA transaction analysis, screen complexity, and evidence gathering.
  3. `FioriCatalogue`: Search and filter 12,000+ standard SAP Fiori applications.
  4. `AssessmentResults`: 8-dimension Fit-Gap assessment, candidate ranking, modernization action records.
  5. `GenerationStudio`: 9-view workspace for custom application generation from approved BUILD assessments or standalone specifications.

---

## 3. Subsystem Breakdown

### 3.1 Discovery & Matching Engine
- **Files:** `backend/src/engine/transactionDiscoveryEngine.js`, `technicalEvidenceEngine.js`, `fioriMatchingEngine.js`, `fitGapAssessmentEngine.js`, `recommendationEngine.js`.
- **Purpose:** Analyzes Dynpro screens, tables, user exits, and BAdIs. Calculates technical similarity against canonical SAP Fiori applications from the SAP Fiori Apps Reference Library (FAL).
- **Rule Enforcement:** Functional mismatch overrides technical scores; prevents hallucinating non-existent Fiori App IDs.

### 3.2 Assessment Lifecycle Subsystem
- **Files:** `backend/src/services/assessmentStore.js`, `backend/src/services/enterpriseService.js`.
- **Purpose:** Maintains the 8-dimension Fit-Gap assessment lifecycle: `DRAFT` -> `IN_REVIEW` -> `PENDING_REVIEW` -> `APPROVED` (or `REJECTED`, `ARCHIVED`).
- **Governance:** Enforces cryptographic integrity hashing across audit trail entries (`SHA-256` hash chaining).
- **Handoff:** Only assessments with `recommendation.action === 'BUILD'` and lifecycle status `APPROVED` are eligible for Generation Studio intake.

### 3.3 Model Context Protocol (MCP) Subsystem
- **Files:** `backend/src/mcp/index.js`, `mcpRoutes.js`, `services/mcpToolRegistry.js`, `discovery/mcpDiscoveryOrchestrator.js`.
- **Purpose:** Connects to external MCP servers (e.g., `sap-discovery-server`) via stdio or SSE transports to gather deep live SAP metadata, table definitions, and user exit inventory.
- **Security:** Strict argument sanitization (`mcpArgumentValidator.js`) and tool execution policy (`mcpToolPolicy.js`).

### 3.4 Generation Studio Subsystem
- **Files:** `backend/src/generation/contracts/generationProjectContract.js`, `projects/generationProjectStore.js`, `projects/generationProjectService.js`, `projects/generationProjectLifecycle.js`, `projects/generationProjectValidator.js`.
- **Purpose:** Provides project management, specification versioning, and phase progression for custom Fiori apps.
- **Storage Model:** Isolated directory per project (`backend/data/generation-projects/<projectId>/project.json`) with atomic file writes and project mutex locks.

---

## 4. Current Architecture Limitations & S1–S3 Drivers

| Architectural Area | Current State (Phase S0) | Target State (Phases S1–S3) |
|---|---|---|
| **Persistence** | 4 JSON files on local disk with `.tmp` and `.bak` rename patterns | ACID relational PostgreSQL with transactional consistency and migration tooling |
| **Concurrency** | In-memory single-process mutex lock per file/project | Row-level locking and database transactions spanning multiple entities |
| **Multi-Tenancy** | Single shared data namespace; no tenant separation | Strict tenant ID scoping across all tables, APIs, and file artifacts |
| **Authentication** | Shared static admin token via `X-FioriX-Admin-Secret` | Server-side session/token authentication with RBAC and secure credential store |
| **SAP Connectivity** | Local mock adapter with BTP Destination stub; manual credential flags | Production BTP Destination + Connectivity Service + Cloud Connector pipeline |
| **Audit Trails** | In-memory/JSON hash-chained array inside assessment records | Dedicated, immutable audit log table with indexed timestamps, actors, and events |

---

## 5. Architectural Boundary Constraints

1. The Node.js native HTTP server (`server.js`) must NOT be replaced with Express or CAP. All endpoints must remain standard HTTP request listener functions.
2. The existing Discovery, Assessment Results, and Catalogue business logic must remain completely functional and untouched.
3. The four JSON data stores must remain intact during Phase S0, and must be preserved with dual-read/dual-write verification during Phase S1.
