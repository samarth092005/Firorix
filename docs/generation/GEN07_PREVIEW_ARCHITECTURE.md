# FioriX — GEN-07: Local Preview & Mock OData V4 Runtime Architecture

**Milestone:** GEN-07 Local Preview  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (System S21, Client 200)  
**Security Boundary:** 100% In-Process, Loopback-Only (`127.0.0.1`), Zero SAP S21 Network Access  
**Runtime:** Native Node.js 20 HTTP Server (No Express, No CAP, No External CLI)  

---

## 1. Executive Summary & Core Principles

GEN-07 establishes an isolated, in-process local runtime that serves generated SAP Fiori Elements applications and handles mock OData V4 requests directly inside the Node.js native runtime. It enables developers and architects to review and test List Report and Object Page floorplans without deploying to or connecting with SAP S21.

### Non-Negotiable Tenets
1. **Zero Remote Connection:** All reads and mutations execute strictly in-memory against a transient synthetic entity store.
2. **Loopback Isolation:** The preview server binds exclusively to `127.0.0.1`. Requests originating from any remote IP are immediately rejected with HTTP 403 Forbidden.
3. **Dynamic Port Range:** Ports are allocated exclusively from the dedicated range `4050–4099`, scanning sequentially and releasing on termination.
4. **Mandatory Permanent Watermark:** A permanent, high-contrast red warning banner is injected at runtime into all served HTML entrypoints:
   `LOCAL MOCK PREVIEW — SYNTHETIC DATA ONLY — NOT CONNECTED TO SAP S21`
5. **Architectural Profile Honesty:** If the project uses the `READ_ONLY_QUERY` profile, OData mutation requests (POST, PATCH, DELETE) are rejected with `405 Method Not Allowed`.

---

## 2. Component Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │       FioriX Generation Studio Frontend      │
                    └───────────────────────┬──────────────────────┘
                                            │ Preview IFrame / Controls
                                            ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│              In-Process Mock Server (127.0.0.1:4050-4099)                        │
│                                                                                  │
│  ┌────────────────────────┐      ┌─────────────────────────┐                     │
│  │  Static Asset Router   │      │   Mock OData V4 Engine  │                     │
│  │  - webapp/index.html   │      │   - Service Document    │                     │
│  │    (Watermark Injection│      │   - $metadata (EDMX)    │                     │
│  │  - manifest.json       │      │   - Entity Collections  │                     │
│  │  - Component.js        │      │   - CUD Mutations       │                     │
│  │  - ui5.yaml            │      │   - Profile Enforcement │                     │
│  └───────────┬────────────┘      └────────────┬────────────┘                     │
│              │                                │                                  │
│              ▼                                ▼                                  │
│  ┌────────────────────────┐      ┌─────────────────────────┐                     │
│  │ ArtifactRegistry State │      │ Synthetic In-Memory     │                     │
│  │ (Project Artifacts)    │      │ Entity Store            │                     │
│  └────────────────────────┘      └─────────────────────────┘                     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Module Breakdown
- `previewSecurity.js`: Enforces admin authorization, sanitizes project identifiers, restricts port allocations to `4050–4099`, and validates webapp asset relative paths against directory traversal (`..`, `\0`, Windows drive letters).
- `previewSessionStore.js`: Thread-safe session registry that assigns ports, tracks session lifecycles, enforces 30-minute idle timeouts, and logs request telemetry.
- `mockODataMetadata.js`: Generates dynamic OData V4 EDMX XML and Service Document JSON matching project entity definitions, keys, and association navigation properties.
- `mockODataQuery.js`: Implements safe, AST-free OData V4 query parameter handling:
  - `$select`: Project specific property sets.
  - `$filter`: String and numeric equality (`Field eq 'Value'`).
  - `$orderby`: Multi-field sorting with `asc` and `desc`.
  - `$top` and `$skip`: Pagination slices.
  - `$count`: Collection record counting.
- `mockODataMutation.js`: Handles POST (Create with synthetic `MOCK-<random>` key assignment), PATCH (Update), and DELETE. Rejects mutations with HTTP 405 on `READ_ONLY_QUERY` architectures.
- `mockODataServer.js`: Native `http.createServer` instance binding strictly to `127.0.0.1`. Injects watermark HTML into `index.html` at runtime.
- `previewManager.js`: High-level lifecycle coordinator exposing `startPreview`, `stopPreview`, `restartPreview`, `getPreviewStatus`, `getPreviewRequests`, and `resetSyntheticData`.

---

## 3. Watermark Specification

The watermark banner is injected into the `<head>` or before `</body>` of `webapp/index.html`:
```html
<div id="fiorix-preview-banner" style="position:fixed;top:0;left:0;right:0;height:28px;background:#c0392b;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.8px;display:flex;align-items:center;justify-content:center;z-index:2147483647;box-shadow:0 2px 6px rgba(0,0,0,0.3);text-transform:uppercase;user-select:none;pointer-events:none;">
  &#9888; LOCAL MOCK PREVIEW — SYNTHETIC DATA ONLY — NOT CONNECTED TO SAP S21
</div>
<style>body { padding-top: 28px !important; }</style>
```

---

## 4. Lifecycle & Safety Guardrails

- **Auto-Termination:** If no requests are logged for 30 consecutive minutes, the server instance is automatically shut down and its port returned to the pool.
- **Port Conflict Resolution:** In the event of a port bind error (`EADDRINUSE`), the manager increments the port and attempts the next available port in the 4050–4099 range.
- **Payload Limits:** Maximum request body size is capped at 1 MB to prevent memory exhaustion attacks.
