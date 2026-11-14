# Fiorify — Backend Architecture Specification

## 1. Overview & Architectural Philosophy

The Fiorify backend is implemented as a modular, high-performance Node.js service using pure native HTTP primitives without heavy opinionated frameworks. This architectural choice delivers:
- Minimal attack surface with zero third-party framework overhead.
- Direct control over HTTP request lifecycle, routing, and header processing.
- Strict multi-tenant isolation enforced at the connection and route layer.
- Clean separation between transport, domain business logic, and database persistence.

---

## 2. Layered Architecture

```mermaid
flowchart TD
    subgraph Transport_Layer ["1. Transport & Gateway Layer"]
        HTTP_SRV["Native Node.js HTTP Server (server.js)\nPort 4000"]
        AUTH_MW["Authentication & RBAC Middleware\n(Production Enforced, Dev Sandboxing)"]
        TENANT_MW["Tenant Context Resolver\n(Multi-Tenant Extraction)"]
        ROUTER["REST Route Dispatcher\n(Regex & Path Parsing)"]
    end

    subgraph Service_Layer ["2. Domain & Application Services"]
        DISC_SVC["Transaction Discovery Service"]
        FITGAP_SVC["Fit-Gap & Recommendation Service"]
        ASSESS_STORE["Assessment Store (SoD Enforced)"]
        SPEC_SVC["Specification Versioning Service"]
        GEN_ENGINE["ABAP & Fiori Generator Engines"]
        PREVIEW_SVC["Mock OData Preview Service"]
        DEP_SVC["Deployment Orchestration Service"]
    end

    subgraph Security_Layer ["3. Security & Infrastructure"]
        CRYPTO_SVC["Cryptographic Signature Service (sig:v1)"]
        AUDIT_LOGGER["Security Audit Logger (PostgreSQL)"]
        SAP_CLIENT["Hardened SAP HTTP Client\n(Canonicalizer, Traversal Defense)"]
    end

    subgraph Persistence_Layer ["4. Persistence & Repositories"]
        REPO_ASSESS["Assessment Repository"]
        REPO_CATALOG["Catalogue Repository"]
        REPO_HANDOFF["Generation Handoff Repository"]
        REPO_PROJECT["Generation Project Repository"]
        REPO_DEPLOY["Deployment Repository"]
        REPO_SYSTEM["SAP System Repository"]
        PG_POOL["PostgreSQL Connection Pool\n(max: 20, 30s idle, 5s timeout)"]
    end

    HTTP_SRV --> AUTH_MW --> TENANT_MW --> ROUTER
    ROUTER --> Service_Layer
    Service_Layer --> Security_Layer
    Service_Layer --> Persistence_Layer
    Persistence_Layer --> PG_POOL
```

---

## 3. Directory Layout & Module Structure

The backend source code is organized cleanly under `backend/src/`:

```
backend/src/
├── server.js                          # HTTP entry point, route dispatch, error handlers
├── adapters/                          # External system adapters (Fiori catalog, system registry)
├── contracts/                         # Canonical data contracts and schemas
├── generation/                        # Generation Studio engines
│   ├── abap/                          # RAP ABAP generators (Tables, CDS, BDEF, Classes, DCL)
│   ├── ui5/                           # Fiori Elements V4 generators (Manifest, Annotations)
│   ├── preview/                       # Ephemeral mock OData V4 server (Port 4050)
│   ├── validation/                    # Static Clean Core validation & compatibility
│   ├── deployment/                    # Deployment plan DAG, boundary & verification
│   └── projects/                      # Generation project store, readiness & versioning
├── infrastructure/
│   ├── connectivity/                  # SAP HTTP client, preflight, health service
│   ├── db/                            # PostgreSQL pool, migrations 001–007, repositories
│   └── security/                      # CryptographicSignatureService, audit logger, JWT
├── routes/                            # Route handlers (discovery, assessment, systems)
├── services/                          # Domain services (auth, discovery, fit-gap)
└── tools/                             # Ingestion scripts (Fiori Apps Library data)
```

---

## 4. Key Request Lifecycles

### 4.1 Authentication & Tenant Context Resolution
Every incoming HTTP request passes through `server.js`:
1. **Production Mode (`NODE_ENV=production`)**:
   - Authentication is strictly enforced.
   - Authorization headers (`Bearer <token>`) are verified via JWT / XSUAA providers.
   - Missing or invalid tokens immediately reject with HTTP 401.
   - Development impersonation headers (`x-fiorify-role`, `x-fiorify-user`) are rejected.
2. **Development / Test Mode**:
   - Unauthenticated requests default to minimum privilege: `role: VIEWER`, `tenantId: DEV-SANDBOX-TENANT`. Unauthenticated requests NEVER receive `ADMIN`.
   - Impersonation requires the explicit developer header `x-fiorify-admin-dev-secret`.

### 4.2 Error Handling & Security Redaction
- All errors are mapped into standardized JSON error objects: `{ statusCode, error, message, code }`.
- Stack traces and sensitive connection parameters (SAP passwords, Bearer tokens, internal IP subnets) are scrubbed before reaching the response payload.

### 4.3 Database Connection Management
- Database connections are leased from `DatabasePool` (`backend/src/infrastructure/db/pool.js`).
- Default configuration:
  - `max`: 20 connections.
  - `idleTimeoutMillis`: 30,000 ms.
  - `connectionTimeoutMillis`: 5,000 ms.
- Client connections are released back to the pool in `finally` blocks across all repository methods.
