# Local Preview & Mock OData V4 Runtime Audit
**Document ID:** `GEN-AUDIT-PREVIEW-01`  
**Audit Context:** `GEN-COMPLETE-AUDIT-01`  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (S21, Client 200)  
**Classification:** Deep Technical & Security Audit

---

## 1. Executive Preview & Mock Server Architecture

GEN-07 delivers an ephemeral, in-process mock server runtime (`backend/src/generation/preview/`) that enables instantaneous local testing of generated Fiori Elements applications without any connection to SAP S21.

### Key Architectural Characteristics
1. **Loopback-Only Binding:**
   - Every mock server instance strictly binds to `127.0.0.1` (`HOST = '127.0.0.1'`).
   - Remote network interfaces (`0.0.0.0`) are forbidden, preventing unauthorized local area network exposure.
2. **Ephemeral In-Memory Lifecycle:**
   - Managed by `PreviewManager` with an automatic 30-minute inactivity reaper (`SESSION_TIMEOUT_MS = 1800000`).
   - Mock servers can be started (`POST /preview/start`), stopped (`POST /preview/stop`), and restarted (`POST /preview/restart`).
3. **Visual Watermark Injection:**
   - `previewSecurity.js` intercepts HTML responses and injects an unclosable, prominent visual banner:
     > **`"MOCK / DRAFT PREVIEW ONLY - NOT CONNECTED TO SAP"`**
   - Injects a discrete top ribbon and warning dialog preventing any confusion with production SAP systems.

---

## 2. OData V4 Protocol Fidelity

| Feature / Capability | Component | Implementation Status & Verification |
| :--- | :--- | :--- |
| **$metadata (CSDL XML)** | `mockODataMetadata.js` | **FULL.** Dynamically converts project `dataModelSpec` into standard CSDL 4.0 XML with EntityTypes, EntitySets, NavigationProperties, and Keys. |
| **Query Evaluation** | `mockODataQuery.js` | **SUBSTANTIAL.** Evaluates `$top`, `$skip`, `$orderby` (asc/desc), `$select` (field filtering), and `$filter` (eq, ne, gt, lt, ge, le, contains, startswith). |
| **Deep Expand** | `mockODataQuery.js` | **SUPPORTED.** Resolves `$expand` for 1:1 and 1:N associations defined in the CDS data model. |
| **CRUD Operations** | `mockODataMutation.js` | **FULL.** Handles `POST` (Create), `PATCH/PUT` (Update), `DELETE` (Delete) mutating an in-memory synthetic data store. |
| **Draft Actions** | `mockODataMutation.js` | **SUPPORTED.** Simulates RAP draft lifecycle: `draftActivate`, `draftDiscard`, and `draftEdit`. |
| **Synthetic Data Reset**| `mockODataServer.js` | **FULL.** `POST /preview/synthetic-data/reset` regenerates clean deterministic mock datasets based on field data types and semantic roles. |

---

## 3. Discovered Blocker: Port Allocation Collision (`EADDRINUSE`)

### 3.1 Empirical Evidence & Root Cause Analysis
During full backend regression testing (`npm --prefix backend test`), the test suite `GEN-07: Local Preview & Mock OData V4 Runtime` failed with:
```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:4050
    at Server.setupListenHandle [as _listen2] (node:net:1904:16)
    at listenInCluster (node:net:1961:12)
    at doListen (node:net:2135:7)
    at Server.listen (node:net:2062:5)
```
Upon investigation using Windows PowerShell (`Get-NetTCPConnection -LocalPort 4050`), port 4050 was found to be occupied by an orphaned Node process (`PID 21744`).

In `previewSessionStore.js`, the port allocator is implemented as:
```javascript
allocatePort() {
  for (let p = SAFE_PORT_MIN; p <= SAFE_PORT_MAX; p++) {
    if (!this.allocatedPorts.has(p)) {
      this.allocatedPorts.add(p);
      return p;
    }
  }
  throw new Error(`All preview ports in range ${SAFE_PORT_MIN}-${SAFE_PORT_MAX} are currently in use.`);
}
```

### 3.2 Architectural Flaw
`PreviewSessionStore` maintains an in-memory JavaScript `Set` (`this.allocatedPorts`). It assumes that any port not in its internal `Set` is free on the host operating system.
If an external process, a previous test runner crash, or an unclosed preview session is occupying port 4050:
1. `allocatePort()` naively returns 4050 because `allocatedPorts.has(4050)` is false in the newly booted process.
2. `server.listen(4050, '127.0.0.1')` immediately throws an unhandled `EADDRINUSE` exception, crashing the preview startup.

### 3.3 Remediation Recommendation (Fix Pattern)
Modify `allocatePort()` to perform an asynchronous TCP socket availability probe using `net.createServer()` before allocating the port:
```javascript
async allocateAvailablePort() {
  for (let p = SAFE_PORT_MIN; p <= SAFE_PORT_MAX; p++) {
    if (this.allocatedPorts.has(p)) continue;
    const isFree = await new Promise((resolve) => {
      const tester = net.createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          tester.close(() => resolve(true));
        })
        .listen(p, '127.0.0.1');
    });
    if (isFree) {
      this.allocatedPorts.add(p);
      return p;
    }
  }
  throw new Error('No available preview ports.');
}
```
This guarantees zero port collisions regardless of orphaned host processes.
