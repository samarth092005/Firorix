# FIORIFY — TRANSACTION DISCOVERY ENGINE
## E. Executable Test & Validation Report

**Audit Date:** 2026-11-26  
**Environment:** Windows Local Node.js v20.18.0 (No live `S21` network writes or live `S21` BTP Destination probes executed).

---

## 1. Automated Backend Discovery Test Suites Executed

**Command:**
```bash
node --test backend/test/d2UniversalTransactionDiscovery.test.js backend/test/discoveryMasterSuite.test.js backend/test/s4TransactionDiscovery.test.js backend/test/transactionDiscoveryMatching.test.js
```

| Suite / File | Tests | Passed | Failed | Notes |
|---|---:|---:|---:|---|
| `d2UniversalTransactionDiscovery.test.js` | Included in run | All | 0 | Verified syntax validation, provider contracts, and mocked 403/502 handling. |
| `discoveryMasterSuite.test.js` | Included in run | All | 0 | Verified `DISC-01/02` and `MATCH-01/02` API contracts with local fixtures. |
| `s4TransactionDiscovery.test.js` | Included in run | All | 0 | Verified S4 discovery engine unit tests. |
| `transactionDiscoveryMatching.test.js` | Included in run | All | 0 | Verified matching engine scoring rules. |
| **Combined Total** | **84** | **84** | **0** | Note: Local env lacked BTP `destination` service binding (`Could not find service binding of type 'destination'`). |

---

## 2. Empirical Catalogue & 14-TCode Engine Execution

### 2.1 Catalogue Cache Inspection (`officialFioriCatalogueAdapter.searchApps`)
* `F2101A` (*Monitor Material Coverage - Net and Individual Segments (Version 2)*): **Found in cache**, `leadingTransactionCodes: []`, `applicationComponent: undefined`.
* `F0247A` (*Monitor Material Coverage (Version 2)*): **Found in cache**, `leadingTransactionCodes: []`, `applicationComponent: undefined`.
* `F0251A` (*Manage Material Coverage (Version 2)*): **Found in cache**, `leadingTransactionCodes: []`, `applicationComponent: undefined`.
* `MD07` (`tcode: 'MD07'`, `query: ''` and `query: 'Current Material Overview'`): **`0` candidates returned**.

### 2.2 Offline Engine Execution Results (`useLiveSap: false`, `systemId: 'S21-200-DEMO'`)

| T-Code | Expected Result | Actual Observed Result | Pass / Fail |
|---|---|---|---|
| `MD01` | Standard PP MRP run, real `TSTCT`/DDIC or `UNINDEXED` | `verificationStatus: 'NOT_FOUND'`, `classification: 'CUSTOM'`, `description: 'Production Planning & Orders (MD01)'`, `0` Fiori apps | **FAIL** |
| `MD04` | Stock/Requirements List (`SAPMM61R`, `MD`, `F0247`) | `SAPMM61R`, `MD`, `F0247` (`VERIFIED_SUCCESSOR`) | **PASS** (Snapshot) |
| `MD07` | Current Material Overview (`PP`), `F2101A`/`F0247A`/`F0251A` alternatives | `verificationStatus: 'NOT_FOUND'`, `classification: 'CUSTOM'`, `description: 'Production Planning & Orders (MD07)'`, `0` Fiori apps (`NO_MATCH_CONFIRMED`) | **FAIL** |
| `CO01` | Create Production Order (`SAPLCOKO`, `CO`, `F3956`) | `SAPLCOKO`, `CO`, `F3956` (`VERIFIED_SUCCESSOR`) | **PASS** (Snapshot) |
| `MM01` | Create Material (`SAPLMGMM`, `MG`, `F1602`) | `SAPLMGMM`, `MG`, `F1602` (`VERIFIED_SUCCESSOR`) | **PASS** (Snapshot) |
| `MM03` | Display Material (`SAPLMGMM`, `MG`, `F1602`) | `SAPLMGMM`, `MG`, `F1602` (`VERIFIED_SUCCESSOR`) | **PASS** (Snapshot) |
| `ME21N` | Create PO (`SAPLMEGUI`, `ME`, `F0842A`) | `SAPLMEGUI_DEMO`, `DEMO_MM_CORE`, `F0842A` (`VERIFIED_SUCCESSOR`) | **PARTIAL** (`_DEMO` override) |
| `VA01` | Create Sales Order (`SAPMV45A`, `VA`, `F1873`) | `SAPMV45A_DEMO`, `DEMO_SD_CORE`, `F1873` (`VERIFIED_SUCCESSOR`) | **PARTIAL** (`_DEMO` override) |
| `VA03` | Display Sales Order (`SAPMV45A`, `VA`, `F1873`) | `SAPMV45A`, `VA`, `F1873` (`VERIFIED_SUCCESSOR`) | **PASS** (Snapshot) |
| `VL01N` | Create Outbound Delivery (`SAPMV50A`, `VL`, `F2228`) | `SAPMV50A`, `VL`, `F2228` (`VERIFIED_SUCCESSOR`) | **PASS** (Snapshot) |
| `FB03` | Display Document (`SAPMF05L`, `FIDC`, `FB03`) | `SAPMF05L`, `FIDC`, `FB03` (`POTENTIAL_ALTERNATIVE`) | **PASS** (Snapshot) |
| `FBL1N` | Vendor Line Items (`RFITEMAP`, package, `F0712`) | `RFITEMAP`, `package: null`, `F0712` (`VERIFIED_SUCCESSOR`) | **PARTIAL** (Package missing) |
| `KO01` | Create Internal Order (`SAPMKAUF`, `KAUF`, Internal Order app or gap) | `SAPMKAUF`, `KAUF`, **`F1444 — Manage Profit Centers`** (`VERIFIED_SUCCESSOR`) | **FAIL** (False positive) |
| `KSB1` | Cost Centers: Actual Line Items (`CO`) | `verificationStatus: 'NOT_FOUND'`, `classification: 'CUSTOM'`, `description: 'Controlling & Cost Accounting (KSB1)'`, `0` Fiori apps | **FAIL** |

---

## 3. Blocked / Unverified Validations
* **Live SAP `S21` DDIC & ADT Inspection:** **BLOCKED / NOT EXECUTED** in this audit because local Node.js lacks BTP `Fiorify-destination` / `Fiorify-connectivity` bindings and live `S21` network calls require explicit read-only confirmation.
