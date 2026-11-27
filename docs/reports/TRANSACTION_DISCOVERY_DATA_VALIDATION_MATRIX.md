# FIORIFY — TRANSACTION DISCOVERY ENGINE
## C. Data Validation Matrix

**Audit Date:** 2026-11-26  
**Execution Mode:** Local Offline Engine Execution (`useLiveSap: false`, `S21-200-DEMO`) + `fiori_app_catalog_cache.json` Inspection.  
*(Live `S21` SAP network probes were NOT executed due to read-only confirmation rules and missing local BTP Destination binding.)*

---

## 1. Primary Investigation Case: `MD07`

* **Expected SAP Reference (User-Provided):** T-Code `MD07`, Description `Current Material Overview`, Functional Area `Material Requirements Planning`, SAP Module `PP`.
* **Observed Engine Output:**
  * `inMasterIndex`: `false`
  * `discSuccess`: `true`, `statusCode`: `'SUCCESS'`, `verificationStatus`: `'NOT_FOUND'`
  * `description`: `'Production Planning & Orders (MD07)'` *(synthesized prefix guess, NOT `TSTCT`)*
  * `classification`: `'CUSTOM'` *(incorrect — `MD07` is standard SAP PP)*
  * `program`: `null` *(Frontend UI displays `'Pending DDIC Read'`)*
  * `package`: `null` *(Frontend UI displays `'Pending DDIC Read'`)*
  * `screenNumber`: Frontend UI defaults to `'0100'`
  * `softwareComponent`: Frontend UI defaults to `'S4CORE 108'`
  * `catCount`: `0`, `matchClassification`: `'NO_MATCH_CONFIRMED'`, `readiness`: `'NO_SUITABLE_STANDARD_CANDIDATE'`
* **Inspection of Related Fiori Applications in `fiori_app_catalog_cache.json`:**
  * `F2101A` — *Monitor Material Coverage - Net and Individual Segments (Version 2)*: **Present in cache**, `uiTechnology: 'SAP Fiori elements'`, **`leadingTransactionCodes: []`**, `applicationComponent: undefined`. *(Functional alternative / successor in MRP Material Coverage family; cannot be distinguished as exact vs alternative without `LeadingTransactionCodes` metadata.)*
  * `F0247A` — *Monitor Material Coverage (Version 2)*: **Present in cache**, `uiTechnology: 'SAP Fiori elements'`, **`leadingTransactionCodes: []`**, `applicationComponent: undefined`.
  * `F0251A` — *Manage Material Coverage (Version 2)*: **Present in cache**, `uiTechnology: 'SAP Fiori elements'`, **`leadingTransactionCodes: []`**, `applicationComponent: undefined`.

---

## 2. Representative 14-Transaction Validation Matrix

| T-Code | Module | In Master Index? | Observed Description (Actual Source) | Observed Program (`PGMNA`) | Observed Package (`DEVCLASS`) | Observed Software Comp | Observed Fiori Match & Classification | Accuracy Verdict |
|---|---|---|---|---|---|---|---|---|
| **MD01** | PP | No | `Production Planning & Orders (MD01)` *(Synthesized)* | `null` *(UI: Pending DDIC Read)* | `null` *(UI: Pending DDIC Read)* | `null` *(UI: S4CORE 108)* | `0` apps (`NO_MATCH_CONFIRMED`) | **BROKEN** (Misclassified `CUSTOM`, fake desc) |
| **MD04** | PP | Yes | `Display Stock/Requirements List` *(Snapshot)* | `SAPMM61R` | `MD` | `S4CORE 108` | `F0247` (`VERIFIED_SUCCESSOR`) | **WORKING** (via snapshot) |
| **MD07** | PP | No | `Production Planning & Orders (MD07)` *(Synthesized)* | `null` *(UI: Pending DDIC Read)* | `null` *(UI: Pending DDIC Read)* | `null` *(UI: S4CORE 108)* | `0` apps (`NO_MATCH_CONFIRMED`) | **BROKEN** (Misclassified `CUSTOM`, misses `F2101A`/`F0247A`/`F0251A`) |
| **CO01** | PP | Yes | `Create Production Order` *(Snapshot)* | `SAPLCOKO` | `CO` | `S4CORE 108` | `F3956` (`VERIFIED_SUCCESSOR`) | **WORKING** (via snapshot) |
| **MM01** | MM | Yes | `Create Material Master Data` *(Snapshot)* | `SAPLMGMM` | `MG` | `S4CORE 108` | `F1602` (`VERIFIED_SUCCESSOR`) | **WORKING** (via snapshot) |
| **MM03** | MM | Yes | `Display Material Master Data` *(Snapshot)* | `SAPLMGMM` | `MG` | `S4CORE 108` | `F1602` (`VERIFIED_SUCCESSOR`) | **WORKING** (via snapshot) |
| **ME21N** | MM | Yes | `Create Purchase Order` *(Snapshot)* | `SAPLMEGUI_DEMO` *(Mock override)* | `DEMO_MM_CORE` *(Mock override)* | `S4CORE 108` | `F0842A` (`VERIFIED_SUCCESSOR`) | **PARTIAL** (Mock overrides real `SAPLMEGUI`/`ME`) |
| **VA01** | SD | Yes | `Create Sales Order` *(Snapshot)* | `SAPMV45A_DEMO` *(Mock override)* | `DEMO_SD_CORE` *(Mock override)* | `S4CORE 108` | `F1873` (`VERIFIED_SUCCESSOR`) | **PARTIAL** (Mock overrides real `SAPMV45A`/`VA`) |
| **VA03** | SD | Yes | `Display Sales Order` *(Snapshot)* | `SAPMV45A` | `VA` | `S4CORE 108` | `F1873` (`VERIFIED_SUCCESSOR`) | **WORKING** (via snapshot) |
| **VL01N** | SD | Yes | `Create Outbound Delivery with Order Reference` *(Snapshot)* | `SAPMV50A` | `VL` | `S4CORE 108` | `F2228` (`VERIFIED_SUCCESSOR`) | **WORKING** (via snapshot) |
| **FB03** | FI | Yes | `Display Document` *(Snapshot)* | `SAPMF05L` | `FIDC` | `S4CORE 108` | `FB03` (`POTENTIAL_ALTERNATIVE`) | **WORKING** (via snapshot) |
| **FBL1N** | FI | Yes | `Vendor Line Items` *(Snapshot)* | `RFITEMAP` | `null` *(Missing in snapshot)* | `S4CORE 108` | `F0712` (`VERIFIED_SUCCESSOR`) | **PARTIAL** (Package missing) |
| **KO01** | CO | Yes | `Create Internal Order` *(Snapshot)* | `SAPMKAUF` | `KAUF` | `S4CORE 108` | `F1444 — Manage Profit Centers` (`VERIFIED_SUCCESSOR`) | **BROKEN** (Wrong Fiori app hardcoded in catalog) |
| **KSB1** | CO | No | `Controlling & Cost Accounting (KSB1)` *(Synthesized)* | `null` *(UI: Pending DDIC Read)* | `null` *(UI: Pending DDIC Read)* | `null` *(UI: S4CORE 108)* | `0` apps (`NO_MATCH_CONFIRMED`) | **BROKEN** (Misclassified `CUSTOM`, fake desc) |
