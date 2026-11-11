# FioriX — SAP S/4HANA Connectivity Audit (Phase S0)

**Document Version:** 1.0  
**Phase:** S0 — Audit & Architecture Baseline  
**Target Environment:** SAP S/4HANA 2023 On-Premise (System `S21`, Client `200` initially)  
**Deployment Model:** SAP BTP Cloud Foundry + SAP Cloud Connector  
**Date:** November 2026

---

## 1. Objective & Non-Negotiable Rules

The objective of FioriX connectivity is to inspect, discover, and extract technical metadata from customer SAP S/4HANA systems in a **strictly read-only, non-invasive** manner.

### Non-Negotiable Protection Rules
1. **Zero SAP Writes:** No creation of transport requests, no ABAP program compilation/activation, no table modifications, and no business data posting.
2. **No Mock Fallbacks in Production Connectivity:** If an on-premise SAP system is unreachable, the system must return an explicit `SAP_CONNECTION_FAILED` or `SAP_AUTHORIZATION_BLOCKED` status. It must **never** fabricate metadata or convert an HTTP 403 / 503 error into a "missing transaction".
3. **No Hardcoded Credentials:** SAP usernames, passwords, and client secrets must never be committed to source code or configuration files.

---

## 2. Current Implementation Assessment

### 2.1 BTP Destination Adapter (`backend/src/adapters/btpDestinationAdapter.js`)
- **Technology:** Implemented using SAP Cloud SDK packages:
  - `@sap-cloud-sdk/connectivity`
  - `@sap-cloud-sdk/http-client`
- **Destination Resolution:**
  - Invokes `getDestination({ destinationName })` to fetch configuration from SAP BTP Destination Service.
  - Resolves proxy type: `OnPremise` (routing through SAP Cloud Connector) or `Internet`.
  - Authenticates via `BasicAuthentication`, `PrincipalPropagation`, or `OAuth2SAMLBearerAssertion`.
- **Target Gateway Endpoint:**
  - Standard Gateway Service Collection: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection`.
  - Metadata requests: `$metadata` queries over published OData services.

### 2.2 System Registry (`backend/src/adapters/systemRegistry.js`)
- Pre-configured profiles:
  - `S21-200`: Primary development client (S/4HANA 2023, SID `S21`, Client `200`).
  - `S21-100`: Customizing/testing client.
  - `PRD-100`: Production reference profile (read-only discovery).
- Active profile tracking: In-memory pointer switchable via `POST /api/v1/system/profiles/active`.

### 2.3 Live vs. Mock Switching (`backend/src/adapters/liveSapAdapter.js` vs `mockSapAdapter.js`)
- Current switching mechanism:
  - Controlled by environment flag: `FIORIX_USE_MOCK_SAP=true|false`.
  - In unit and integration test environments, `mockSapAdapter` provides static fixtures for `ME21N`, `VA01`, `FB60`, etc.
  - In live mode, requests execute through `liveSapAdapter.js` -> `btpDestinationAdapter.js`.

---

## 3. End-to-End BTP Cloud Foundry Architecture (Phase S3 Target)

```
┌────────────────────────────────────────────────────────┐
│  FioriX Backend (Cloud Foundry Node.js 20 App)        │
└───────────┬────────────────────────────────────────────┘
            │
            │ VCAP_SERVICES Binding
            ▼
┌────────────────────────────────────────────────────────┐
│  SAP BTP Services                                      │
│  - Destination Service (stores target destination S21) │
│  - Connectivity Service (provides SOCKS5 / HTTP proxy) │
│  - XSUAA Service (Identity & Tenant token exchange)    │
└───────────┬────────────────────────────────────────────┘
            │
            │ Encrypted Reverse Tunnel (TLS)
            ▼
┌────────────────────────────────────────────────────────┐
│  Customer On-Premise DMZ                               │
│  - SAP Cloud Connector (SCC)                           │
│    - Virtual Host / Port: s21-internal.corp:44300      │
│    - Accessible Resources:                             │
│        /sap/opu/odata/IWFND/CATALOGSERVICE;v=2 (Read)  │
│        /sap/bc/adt/ (Read-only discovery)              │
│        /sap/opu/odata/sap/ (Service metadata)          │
└───────────┬────────────────────────────────────────────┘
            │
            │ Internal Network / LAN (HTTPS)
            ▼
┌────────────────────────────────────────────────────────┐
│  Customer SAP S/4HANA 2023 On-Premise (S21 Client 200) │
│  - ABAP Gateway (ICF nodes)                            │
│  - Transaction Dictionary (TSTC, SE93, TADIR)          │
│  - Business Application Studio / ADT Service Endpoints │
└────────────────────────────────────────────────────────┘
```

---

## 4. Connectivity Requirements & Gap Analysis

| Capability | Current State (S0) | Phase S3 Requirement | Readiness / Gap |
|---|---|---|---|
| **Destination Lookup** | Reads local environment variables or mock config | BTP Destination Service API resolution via service binding | Ready for BTP CF binding; needs credential caching and fallback |
| **Cloud Connector Routing** | Proxy environment variable (`HTTP_PROXY`) stubbed | Automatic SOCKS5 proxy injection via `@sap-cloud-sdk/connectivity` | Requires validation in live BTP subaccount |
| **System & Client Verification** | Hardcoded check against profile | Dynamic handshake: queries `/sap/public/bc/icf/info` or Gateway `$metadata` to verify system SID, installation number, and client | To be implemented in Phase S3 |
| **ADT Metadata Access** | Local Eclipse installed, but no automated ADT HTTP adapter in backend | ADT REST endpoints (`/sap/bc/adt/repository/nodestructure`) via Cloud Connector for CDS views and classes | Must NOT assume local Eclipse implies remote ADT accessibility |
| **Error Categorization** | Generic network catch block | Typed errors: `SAP_DNS_FAILURE`, `SAP_PROXY_TIMEOUT`, `SAP_AUTH_401`, `SAP_AUTH_403`, `SAP_ICF_INACTIVE` | Required for reliable discovery diagnostics |

---

## 5. Security Guardrails for Phase S3

1. **Strictly Read-Only HTTP Verbs:** The BTP adapter and HTTP client must only issue `GET` and `HEAD` requests to SAP endpoints. Any `POST`, `PUT`, `DELETE`, or `PATCH` request targeting on-premise SAP endpoints must be blocked at the adapter layer.
2. **Access Control in Cloud Connector:** Cloud Connector must be configured to expose only path prefixes with "Path and all sub-paths" set to read-only, explicitly rejecting write calls.
3. **Audit Logging of SAP Queries:** Every query executed against SAP systems must generate an immutable audit log entry in FioriX including timestamp, user, target system, endpoint, and response code.
