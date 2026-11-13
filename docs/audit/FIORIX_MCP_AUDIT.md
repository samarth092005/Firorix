# Fiorify — MODEL CONTEXT PROTOCOL (MCP) ARCHITECTURE AUDIT
**Document ID:** AUDIT-MCP-2026-001  
**Status:** COMPLETE  
**Date:** 2026-11-08  
**Scope:** `@sap-ux/fiori-mcp-server` Integration, stdio Transport, Tool Policy, Allowlist, Orchestration  

---

## 1. Executive Summary

This audit assesses the Model Context Protocol (MCP) subsystem integrated into the Fiorify backend:
- Client architecture: `@modelcontextprotocol/sdk` version `1.32.2`.
- Server implementation: `@sap-ux/fiori-mcp-server` version `1.15.24`.
- Transport: Standard Input/Output (`stdio`) child process management.
- Security Policy: Strict read-only tool allowlist with blocked modification and generation tools.
- Orchestration: Discovery enhancement via `McpDiscoveryOrchestrator` without compromising official catalogue authority.

---

## 2. Server Executable & Runtime Verification

### 2.1 Binary Existence
The audit verified the presence of the pinned server binary at:
`backend/node_modules/@sap-ux/fiori-mcp-server/dist/index.js` (Exists: `True`).

### 2.2 Environment Variables
- `MCP_ENABLED`: `false` by default; toggled via environment or request option.
- `MCP_AUTO_CONNECT`: `false` by default.
- `MCP_TRANSPORT`: `stdio` (enforced).
- `MCP_STARTUP_TIMEOUT_MS`: `30000` ms default.
- `MCP_TOOL_TIMEOUT_MS`: `60000` ms default.
- `MCP_RECONNECT_MAX_ATTEMPTS`: `3` attempts max.

---

## 3. Tool Policy & Allowlist Audit

The Fiorify tool execution policy (`backend/src/mcp/security/mcpToolPolicy.js`) enforces strict boundaries:

| Tool Name | Category | Status | Operational Impact | Reason |
|:---|:---|:---:|:---|:---|
| `search_docs` | `DOCUMENTATION_SEARCH` | **ALLOWED** | Read-only | Searches SAP Fiori guidelines and official technical documentation. |
| `list_sap_systems` | `SAP_SYSTEM_DISCOVERY` | **ALLOWED** | Read-only | Reads system definitions from local environment store. |
| `list_fiori_apps` | `FIORI_APPLICATION_DISCOVERY` | **ALLOWED** | Read-only | Scans specified local filesystem folder for workspace apps. *(Not part of standard FAL matching).* |
| `list_functionality` | `APPLICATION_MODIFICATION_INSPECTION` | **ALLOWED** | Read-only | Inspects supported modification extensions of existing apps. |
| `get_functionality_details` | `APPLICATION_MODIFICATION_INSPECTION` | **ALLOWED** | Read-only | Retrieves modification parameter schemas. |
| `download_odata_service_metadata` | `ODATA_METADATA_RETRIEVAL` | **BLOCKED** | File-write operation | Downloads and writes `metadata.xml` to disk; blocked pending governance review. |
| `generate_fiori_app_odata` | `APPLICATION_GENERATION` | **BLOCKED** | Write / Code Generation | Generation engine is strictly deferred to the Generation Studio milestone. |
| `modify_fiori_app` | `APPLICATION_MODIFICATION` | **BLOCKED** | Write / Filesystem Mutation | File modification blocked in read-only Discovery platform. |

---

## 4. MCP Architectural Invariants & Corrections

1. **MCP Connection != SAP Connectivity:**
   Connecting to the local MCP child process confirms ONLY that `@sap-ux/fiori-mcp-server` is running over stdio. It provides ZERO proof of live SAP S21 system connectivity. The UI and health diagnostics must clearly separate:
   - Backend API Health (`/api/v1/health`)
   - MCP Client / Subprocess Health (`/api/v1/mcp/health`)
   - SAP Gateway & Destination Connectivity (`/api/v1/systems/:id/diagnostics`)

2. **Official Catalogue Remains Authoritative:**
   MCP documentation queries (`search_docs`) can supplement understanding and enrich context, but NEVER supersede the canonical SAP Fiori Apps Reference Library snapshot.

3. **Role of `list_fiori_apps` Clarified:**
   The tool `list_fiori_apps` from `@sap-ux/fiori-mcp-server` scans local directory workspaces. It is NOT a search engine for the global SAP Fiori catalogue. Therefore, it is intentionally excluded from the default transaction discovery execution plan.

4. **No MCP Assistance Claimed Without Tool Invocation:**
   If `mcpOptions.enabled=true` is requested but the MCP server is disconnected or no tools were executed, the response telemetry must report `mcpAssisted: false` and `reason: MCP_SERVER_DISCONNECTED` without fabricated assistance.

5. **Security Isolation:**
   All execution endpoints (`POST /api/v1/mcp/connect`, `POST /api/v1/mcp/tools/:name/execute`) require administrative authorization (`X-Fiorify-Admin-Secret` or `ADMIN` Bearer role).
