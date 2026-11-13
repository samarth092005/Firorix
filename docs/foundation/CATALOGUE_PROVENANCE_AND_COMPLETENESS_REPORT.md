# Fiorify — Catalogue Provenance and Completeness Report (Phase S0/S1 Corrected Baseline)

**Document Version:** 2.0 (Corrected from Actual Repository Files)  
**Phase:** S1 — Persistence Foundation Baseline  
**Scope:** Investigation of the SAP Fiori Apps Reference Library (FAL) data pipeline, ingestion tooling, cache completeness, OData service mappings, and offline reliability.  
**Audited Cache File:** `backend/data/fiori_app_catalog_cache.json`  
**Audited Status File:** `backend/data/fiori_app_catalog_status.json`  
**Date:** November 2026

---

## 1. Actual Ingestion Provenance & Verification

Contrary to high-level theoretical assumptions of 12,000+ records, inspection of the actual repository files reveals a curated, verified baseline of canonical applications ingested for S/4HANA:

### 1.1 Cache File Verification (`backend/data/fiori_app_catalog_cache.json`)
- **File Size:** 562,207 bytes
- **Content SHA-256 Digest:** `3bd814f52869ad74606a8e4f1b5603ccae25c33476d05d636a6c5cdf798b0897`
- **Total Ingested Records in Cache:** 267 application records
- **Unique Fiori Application IDs (`appId`):** 267 (100% unique)
- **Duplicate Records Count:** 0
- **Primary Identifier Key:** `appId` (e.g. `F1612`, `F1345`, `F0718`, `F0842A`)

### 1.2 Status Tracking Metadata (`backend/data/fiori_app_catalog_status.json`)
- **Total Tracked Records:** 272
- **Source Breakdown:**
  - `OFFICIAL_CATALOGUE_LIVE`: 247 records (harvested from SAP FAL OData API: `SingleApp.xsodata/FioriAppsLibrary`)
  - `OFFICIAL_FAL_EXPORT`: 25 records (imported from curated S/4HANA 2023 FPS02 export CSV)
- **Records by Product Suite:**
  - SAP S/4HANA Cloud Private Edition: 224
  - SAP S/4HANA On-Premise: 35
  - SAP S/4HANA Cloud Public Edition: 10
  - SAP Business Suite: 3
- **Records by UI Technology:**
  - SAP GUI for HTML: 202
  - SAP Fiori elements: 38
  - SAP Fiori (SAPUI5): 22
  - Web Dynpro: 7
  - Generic Job Scheduling / Design Studio: 2
- **Records by Application Type:**
  - SAP GUI: 202
  - Transactional: 56
  - Web Dynpro: 7
  - Fact sheet: 4
  - Analytical: 2
  - SAP Fiori - Remote: 1
- **Last Successful Import Timestamp:** `2026-11-10T12:42:00.898Z`
- **Source Version String:** `S4HANA_2023_FPS02_OFFICIAL`
- **Target Release Baseline:** `SAP S/4HANA 2023 On-Premise`

---

## 2. Calculated Attribute Completeness

The attribute completeness calculated directly from all 267 records in `fiori_app_catalog_cache.json` is:

| Attribute Name | Present Records | Percentage | Purpose & Notes |
|---|---|---|---|
| `appId` | 267 / 267 | **100.0%** | Primary unique key (e.g. `F1612`, `F0842A`) |
| `appName` | 267 / 267 | **100.0%** | Official SAP application title |
| `description` | 267 / 267 | **100.0%** | Functional overview and business user role description |
| `appType` | 267 / 267 | **100.0%** | Application type (`Transactional`, `SAP GUI`, etc.) |
| `uiTechnology` | 267 / 267 | **100.0%** | Underlying UI tech (`SAP Fiori elements`, `SAPUI5`, etc.) |
| `productVersion` | 267 / 267 | **100.0%** | S/4HANA release/edition provenance |
| `softwareComponent` | 267 / 267 | **100.0%** | Target ABAP software component (e.g. `S4CORE 109`) |
| `businessRole` | 267 / 267 | **100.0%** | Standard business catalog authorization role |
| `businessCatalog` | 267 / 267 | **100.0%** | SAP Fiori launchpad business catalog |
| `technicalCatalog` | 267 / 267 | **100.0%** | SAP technical catalog reference |
| `documentationUrl` | 267 / 267 | **100.0%** | Deep-link to official SAP FAL entry |
| `provenance` | 267 / 267 | **100.0%** | Audit tag (`OFFICIAL_CATALOGUE_LIVE` or `OFFICIAL_FAL_EXPORT`) |
| `retrievalTimestamp` | 267 / 267 | **100.0%** | ISO timestamp of data capture |
| `lineOfBusiness` | 58 / 267 | **21.7%** | Business domain categorization |
| `odataServices` | 51 / 267 | **19.1%** | Gateway OData services array (for Fiori elements/UI5 apps) |
| `sapui5Component` | 44 / 267 | **16.5%** | Client-side component name (e.g. `fin.ap.payment.post`) |
| `bspApplicationUrl` | 44 / 267 | **16.5%** | ICF BSP service path |
| `leadingTCode` | 0 / 267 | **0.0%** in cache* | *Directly mapped via `fiori_catalog_tcode_mappings` or FAL CSV export |

---

## 3. Ingestion Pipeline & Reconciliation Rules for S1

1. **Global Catalogue Ownership:**  
   The SAP Fiori Application Catalogue is globally reusable across all tenants. It does not belong to any single customer tenant.
2. **Import Provenance Tracking:**  
   Every batch import creates a row in `fiori_catalog_sources` recording:
   - `source_name`, `source_type`, `release`, `edition`, `record_count`, `content_hash`, and execution log.
3. **Relational Normalization:**  
   - `fiori_catalog_apps`: Primary application records.
   - `fiori_catalog_services`: Extracted 1-to-many relationship from `odataServices` array.
   - `fiori_catalog_tcode_mappings`: T-Code to Fiori App associations populated from FAL export mappings and matching engine indexes.
