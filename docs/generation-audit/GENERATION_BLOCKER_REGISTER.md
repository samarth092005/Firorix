# Generation Studio: Blocker & Defect Register
**Document ID:** `GEN-AUDIT-DEFECTS-01`  
**Audit Context:** `GEN-COMPLETE-AUDIT-01`  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (S21, Client 200)  
**Classification:** Quality Assurance & Remediation Register

---

## 1. Executive Defect Overview

During the end-to-end audit `GEN-COMPLETE-AUDIT-01`, a total of **8 defects and architectural gaps** were identified across toolchain diagnostics, local preview runtime, artifact naming, and test isolation.

| Severity | Count | Primary Impact |
| :--- | :--- | :--- |
| **CRITICAL** | 0 | No data loss, security bypass, or fatal pipeline blockers. |
| **HIGH** | 2 | Toolchain scanner false negatives; Preview port collision `EADDRINUSE`. |
| **MEDIUM** | 3 | ADT file extensions; Fiori preview CDN dependency; Dual-mode persistence. |
| **LOW** | 3 | Heuristic static parser; Frontend test isolation; Requirement deletion cascade. |

---

## 2. Complete Defect Register

### `DEF-GEN-01`: Toolchain Scanner Fails to Detect Installed Eclipse & ADT
- **Severity:** HIGH
- **Component:** `backend/src/generation/toolchain/toolchainScanner.js` (lines 142–190)
- **Root Cause:**
  1. `_scanEclipseAndAdt()` searches directory trees only 1 level deep inside `userHome/eclipse/` or `Program Files`. On Windows, standard Eclipse installers place the binary 2 levels deep (e.g. `C:\Users\samarth\eclipse\java-2026-09\eclipse\eclipse.exe`).
  2. The scanner inspects only `eclipseDir/plugins/` or `dropins/` for ADT jars. Modern Eclipse Oomph installations store plugin bundles in a shared P2 bundle pool at `C:\Users\samarth\.p2\pool\plugins\`.
- **Impact:** System reports Eclipse and ADT as "NOT INSTALLED" on workstations where Eclipse 2026-09 and ADT 3.62.0 are actively installed.
- **Remediation:** Update directory traversal to search 3 levels deep in Eclipse folders and add `path.join(userHome, '.p2/pool/plugins')` to the ADT bundle scan paths.

---

### `DEF-GEN-02`: Ephemeral Preview Mock Server Port Collision (`EADDRINUSE`)
- **Severity:** HIGH
- **Component:** `backend/src/generation/preview/previewSessionStore.js` (lines 22–33)
- **Root Cause:** `allocatePort()` uses an in-memory `Set` (`this.allocatedPorts`) to assign ports in the range 4050–4099. It does not probe whether the host OS has an existing or orphaned process listening on that port.
- **Impact:** When port 4050 is held by an orphaned Node process (`PID 21744`), `server.listen()` throws unhandled `EADDRINUSE`, causing local preview startup to crash.
- **Remediation:** Replace in-memory check with an asynchronous TCP socket availability probe using `net.createServer().listen(p, '127.0.0.1')` before allocating the port.

---

### `DEF-GEN-03`: SAP ADT File Extension Inconsistencies
- **Severity:** MEDIUM
- **Component:**
  - `backend/src/generation/abap/cdsViewEntityGenerator.js` (line 285)
  - `backend/src/generation/abap/rapBehaviorGenerator.js` (lines 176, 232)
  - `backend/src/generation/abap/serviceDefinitionGenerator.js` (line 35)
- **Root Cause:**
  1. MDE files generated as `src/mde/${projName}.bdef.asddlxs` (erroneous `.bdef.` infix).
  2. BDEF files generated as `src/bdef/${name}.bdef.asbds` (uses `.asbds` instead of SAP ADT standard `.asbdef`).
  3. SRVD files generated as `src/srvd/${serviceName}.srvd.asrvds` (uses `.asrvds` instead of standard `.srvdsrv`).
- **Impact:** Eclipse ADT does not automatically associate these files with the corresponding ABAP editors upon manual file import.
- **Remediation:** Normalize all file path templates to standard SAP ADT project file extensions (`.asddlxs`, `.asbdef`, `.srvdsrv`).

---

### `DEF-GEN-04`: Fiori Preview CDN Dependency Fails in Offline/Air-Gapped Environments
- **Severity:** MEDIUM
- **Component:** `backend/src/generation/fiori/fioriProjectStructureGenerator.js` (line 50)
- **Root Cause:** `webapp/index.html` hardcodes `https://ui5.sap.com/1.120.0/resources/sap-ui-core.js` as the bootstrap script.
- **Impact:** In air-gapped corporate developer environments or offline planes/trains, local preview renders a blank white screen because the CDN is unreachable.
- **Remediation:** Support configurable UI5 bootstrap URL (relative `resources/sap-ui-core.js` for local UI5 CLI server, or corporate internal CDN proxy).

---

### `DEF-GEN-05`: Persistence Dual-Mode Split (JSON Filesystem vs PostgreSQL)
- **Severity:** MEDIUM
- **Component:** `backend/src/generation/projects/generationProjectStore.js`
- **Root Cause:** Generation Studio persists project models to local filesystem JSON (`backend/data/generation-projects/`), whereas S1 Foundation expects PostgreSQL persistence (`generationProjectRepository.js`).
- **Impact:** Works seamlessly for single-instance local developer execution, but in a multi-instance BTP Cloud Foundry deployment, project data will not survive container restarts without a shared volume or PostgreSQL sync.
- **Remediation:** Implement a dual-write or pluggable repository adapter that writes to PostgreSQL when `DATABASE_URL` is configured, falling back to JSON for local development.

---

### `DEF-GEN-06`: Static Validation Uses Heuristic Regex Instead of ABAP AST Compiler
- **Severity:** LOW
- **Component:** `backend/src/generation/validation/staticValidationEngine.js`
- **Root Cause:** Validation uses JavaScript string pattern matching rather than a full ABAP language parser.
- **Impact:** Cannot detect subtle syntax errors (e.g. missing periods `.` inside method bodies or invalid ABAP expressions).
- **Remediation:** Document this boundary clearly in user guides: Fiorify performs pre-flight structural validation; full syntax compilation occurs inside Eclipse ADT.

---

### `DEF-GEN-07`: Frontend Test Suite Timeouts on Unmocked HTTP Requests
- **Severity:** LOW
- **Component:** `frontend/src/__tests__/overviewMetrics.test.ts`, `discoveryWorkflow.test.ts`, `apiIntegration.test.ts`
- **Root Cause:** Legacy test suites perform unmocked `fetch()` calls to `http://localhost:4004`, failing with 5,000ms timeouts when backend is offline.
- **Impact:** Full `npm --prefix frontend test` reports 11 failures despite 100% pass rate in Generation Studio tests (37/37).
- **Remediation:** Mock HTTP responses with Vitest `vi.spyOn(global, 'fetch')` across the 3 legacy test files.

---

### `DEF-GEN-08`: Requirement Deletion Does Not Clean Up Field References
- **Severity:** LOW
- **Component:** `backend/src/generation/requirements/requirementsService.js` (line 235)
- **Root Cause:** Deleting a requirement does not cascade-prune requirement ID references in `dataModelSpec.entities[].fields[].requirementIds`.
- **Impact:** Causes harmless validation warnings (`RULE_CROSS_REQUIREMENT_UNTRACED`).
- **Remediation:** Add cascade prune hook on requirement deletion.
