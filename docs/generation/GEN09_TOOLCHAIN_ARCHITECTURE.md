# Fiorify — GEN-09: Developer Toolchain & Workstation Readiness Architecture

**Milestone:** GEN-09 Developer Toolchain  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (System S21, Client 200)  
**Target Release:** SAP_BASIS 7.58, SAP_UI 7.58  
**Operation Mode:** Read-Only Non-Invasive Inspection (Zero Host Mutation)  

---

## 1. Executive Summary

GEN-09 bridges the transition from Fiorify Generation Studio to the developer's local workstation. It provides:
1. **Workstation Environment Diagnostics:** Read-only inspection of installed developer runtimes, tools, and Eclipse ADT plugins.
2. **Authoritative Developer Handover Guides:** Detailed, step-by-step instructions for ABAP and Fiori developers to review, activate, and test generated artifacts in Eclipse ADT and SAP S21.

### Core Non-Negotiables
- **No Host Mutation:** The toolchain scanner executes safe read-only queries with short process timeouts (2500ms). It never installs packages, alters environment variables, or mutates configuration files.
- **Strict S21 Alignment:** All developer handover instructions are customized to System `S21`, Client `200`, and S/4HANA 2023 ABAP Cloud standards.
- **Zero Deployment Enforcement:** Confirms that no direct repository writes or CTS transports were triggered by Fiorify.

---

## 2. Toolchain Scanner Architecture

The `toolchainScanner.js` module inspects the following components:

| Tool | Detection Mechanism | Minimum Required Version | Purpose in Landscape |
| :--- | :--- | :--- | :--- |
| **Node.js** | `process.version` | `>= v20.x` | Runtime for Fiorify Backend and UI5 tooling |
| **npm** | `npm --version` | Standard | Dependency management for generated Fiori apps |
| **Java JDK** | `java -version` & `JAVA_HOME` | `>= Java 17` | Required runtime for Eclipse IDE and ADT |
| **Git** | `git --version` | Optional | Version control and abapGit repository syncing |
| **Eclipse IDE** | Windows paths (`Program Files`, `LOCALAPPDATA`, user home) | Eclipse 2023-09+ | Primary IDE for ABAP Cloud development |
| **ADT Plugin** | Scan `plugins/` and `dropins/` for `com.sap.adt.*` | ADT 3.38+ | Eclipse plugin for CDS, RAP, and ABAP editing |
| **SAP GUI** | Scan `Program Files (x86)\SAP\FrontEnd\SAPgui\saplogon.exe` | SAP GUI 8.00 | Optional tool for classic transactions and SAP Logon |
| **UI5 CLI** | `ui5 --version` | `@ui5/cli 3.x+` | Local UI5 development and build tooling |
| **TCP Ports** | Socket bind test on `127.0.0.1` | Ports 4004, 5173, 4050, 4051 | Verifies port availability for Fiorify & Preview servers |

### Readiness Determination Logic
- **`READY`:** Node.js v20+, Java runtime, and Eclipse ADT plugin detected.
- **`PARTIALLY_READY`:** Core web runtime present, but Eclipse ADT plugin not yet confirmed installed in Eclipse plugins directory.
- **`ACTION_REQUIRED`:** Node.js below v20 or Java runtime missing.

---

## 3. Developer Handover Guide Architecture

The `handoverGuideGenerator.js` generates tailored instructions in structured JSON and Markdown:

### ABAP Cloud Developer Handover (8 Sequential Steps)
1. **Eclipse ADT Connection:** Connect Eclipse to System `S21`, Client `200`.
2. **Package Assignment:** Choose customer package (`Z...`) or local `$TMP` sandbox.
3. **DDIC Tables Import:** Create active database tables (`.tabl.sql`) and draft tables. Activate (Ctrl+F3).
4. **CDS View Entities Import:** Create Interface Views (`ZI_*`) followed by Consumption Views (`ZC_*`). Activate.
5. **Metadata Extensions & Access Controls:** Import UI metadata extensions (`.ddlx`) and access rules (`.dcls`).
6. **RAP Behavior Definition:** Import behavior definition (`ZR_*`). Confirm managed/unmanaged and draft settings. Activate.
7. **Behavior Implementation Classes:** Import ABAP behavior pool classes (`ZBP_*`). Complete custom logic and saver hooks. Activate.
8. **Service Definition & Service Binding:** Import Service Definition (`ZUI_*`). Create and publish Service Binding (`ZUI_*_O4`) with binding type **OData V4 - UI**.

### Fiori Elements Developer Handover (4 Steps)
1. **Extraction:** Unpack `/fiori/` directory from export archive.
2. **Local Preview:** Execute `npm install` and `npm start` to test floorplan.
3. **Proxy Configuration:** Update `ui5.yaml` with live S21 endpoint URL once Service Binding is published.
4. **Deployment:** Deploy to S21 via Fiori Tools (`npm run deploy`) or transaction `/UI5/UI5_REPOSITORY_LOAD`.
