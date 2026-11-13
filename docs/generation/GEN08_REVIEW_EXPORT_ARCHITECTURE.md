# Fiorify — GEN-08: Review, Governance, Packaging & Export Architecture

**Milestone:** GEN-08 Review & Export  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (System S21, Client 200)  
**Deployment Policy:** STRICTLY OFFLINE — Zero Remote Repository Writes, Zero CTS Transports  
**Runtime:** Pure Node.js 20 Built-ins (`node:zlib`, `node:crypto`, `node:buffer`, `node:fs`, `node:path`)  

---

## 1. Executive Summary

GEN-08 provides the governance review gates, requirement-to-code traceability engine, and archive packaging subsystem for Fiorify projects. Before any code package can be downloaded for developer review in Eclipse ADT, it must satisfy strict static validation rules, verify complete traceability coverage, and be cryptographically fingerprinted with SHA-256 digests.

### Governance Guardrails
1. **Admin-Only Authority:** Export packaging and readiness gates are strictly limited to authenticated Fiorify Administrators.
2. **Blocking vs Warning Gates:**
   - **Errors:** Hard block (HTTP 400). Cannot be bypassed.
   - **Warnings:** Require explicit acknowledgment (`acknowledgedWarnings: true`).
3. **Zero External Dependencies:** ZIP archive generation and extraction utilize pure Node.js binary buffer packing (`node:zlib` raw deflate/inflate) without any external OS binaries (such as `zip` or `7z`) or third-party npm packages.
4. **Confidentiality Guarantee:** Every exported package contains an explicit assertion and verified exclusion of all credentials, private keys, and SAP connection tokens.

---

## 2. Traceability Matrix Architecture

The `traceabilityEngine.js` builds an unbroken audit chain connecting business requirements to final UI elements:

```
[Confirmed Requirement]
         │
         ▼
[Data Model Entity & Key Fields]
         │
         ├──────────────────────────┐
         ▼                          ▼
[CDS Interface View (ZI_*)]  [Database Table (DDIC)]
         │                          │
         ▼                          ▼
[CDS Consumption View (ZC_*)] [RAP Behavior Definition (ZR_*)]
         │                          │
         ▼                          ▼
[UI Metadata Extension (DDLX)] [Behavior Pool Class (ZBP_*)]
         │                          │
         └─────────────┬────────────┘
                       ▼
         [RAP Service Definition (SRVD)]
                       │
                       ▼
         [Fiori Elements Manifest & Annotations]
```

### Mathematical Metrics
- **Requirement Coverage %:** Percentage of confirmed requirements mapped to at least one entity, CDS view, behavior rule, or annotation.
- **Entity Coverage %:** Percentage of data model entities materialized with tables, interface views, and consumption views.
- **UI Coverage %:** Percentage of view entities possessing `@UI` metadata extensions.
- **Composite Traceability Index:** Weighted score: `(ReqCoverage * 0.4) + (EntityCoverage * 0.35) + (UiCoverage * 0.25)`.

---

## 3. Zero-Dependency PKZIP Architecture

The `zipArchiver.js` implements a compliant PKZIP 2.0 archive builder and extractor:

1. **Local File Headers (`0x04034b50`):** 30 bytes plus filename length, specifying Deflate compression (`method 8`) or uncompressed store (`method 0`).
2. **File Payloads:** Compressed using `zlib.deflateRawSync()` with compression level 9.
3. **Central Directory File Headers (`0x02014b50`):** 46 bytes plus filename length, with Unix file attributes (`0o100644`).
4. **End of Central Directory Record (EOCD, `0x06054b50`):** 22 bytes containing total record counts, directory size, and central directory offset.
5. **Path Traversal Security:** The `sanitizeZipEntryPath` function rejects null bytes, Windows drive specifications (`C:`), and directory traversal sequences (`..`).

---

## 4. Package Structure

Exported ZIP archives (`Fiorify_<projectId>_<timestamp>.zip`) adhere to the following directory layout:

```
Fiorify_Project_Archive/
├── abap/
│   ├── tables/              # Active and Draft database tables (.tabl.sql)
│   ├── cds/                 # Interface & Consumption CDS View Entities (.ddls.asddls)
│   ├── behavior/            # RAP Behavior Definitions (.bdef.asbdef)
│   ├── behavior_classes/    # ABAP Behavior Implementation classes (.clas.abap)
│   ├── services/            # Service Definitions (.srvd.srvdsrv)
│   ├── annotations/         # Metadata Extensions (.ddlx.asddlxs)
│   └── security/            # Access Control CDS DCLs (.dcls.asdcls)
├── fiori/                   # SAP Fiori Elements UI5 Application
│   ├── webapp/
│   │   ├── manifest.json    # Application descriptor (OData V4)
│   │   ├── Component.js     # UI5 Component
│   │   ├── index.html       # Entrypoint with local mock preview
│   │   └── annotations/     # Local XML annotations
│   ├── package.json         # Development dependencies
│   └── ui5.yaml             # UI5 tooling configuration
├── docs/
│   ├── README.md            # Project and package overview
│   ├── ARCHITECTURE.md      # Target landscape & RAP profile specifications
│   ├── TRACEABILITY.md      # Traceability Matrix markdown report
│   └── DEVELOPER_HANDOVER.md # Step-by-step ADT activation guide
└── Fiorify-export-manifest.json # Complete SHA-256 cryptographic manifest
```
