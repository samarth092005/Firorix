# FioriX — Official Fiori Catalogue Management Specification (Workstream D1)

## 1. Release Specificity for SAP S/4HANA 2023 On-Premise
The canonical catalogue is strictly aligned with the target landscape: **SAP S/4HANA 2023 On-Premise (FPS02)**. Applications are classified into distinct product suites:

- `SAP_S4HANA_ON_PREMISE` (Primary Target)
- `SAP_S4HANA_CLOUD_PRIVATE`
- `SAP_S4HANA_CLOUD_PUBLIC`
- `SAP_BUSINESS_SUITE`
- `SAP_BTP`

## 2. Ingestion Engine (`backend/src/tools/ingestFAL.js`)
The ingestion pipeline supports multi-format ingestion of official SAP Fiori Apps Reference Library exports:
- **XLSX format**: Parses binary buffer or file using streaming sheet evaluation (`node_modules/xlsx`).
- **CSV format**: Parses RFC 4180 compliant CSV exports with header normalization.
- **JSON format**: Standard array or object collection ingestion.

### Key Capabilities:
1. **Schema Validation**: Mandatory fields validated (`appId`, `appName`, `appType`, `uiTechnology`, `productVersion`).
2. **Duplicate Detection & Non-Destructive Merging**: Deduplicates on canonical `appId`. Existing records updated with incoming attributes while preserving previously discovered OData bindings and local metadata.
3. **Atomic Backup & Rollback**: Creates timestamped `.bak` snapshots before any write. The `rollback()` method restores the previous state atomically via `POST /api/v1/fiori-catalogue/rollback`.
4. **Honest Status Reporting**: Global hardcoded counts (`17049`) removed. Reports genuine indexed records (`272`), target release (`SAP S/4HANA 2023 On-Premise`), and honest `liveSourceStatus` (`OFFICIAL_EXPORT_IMPORTED` / `CACHED_OFFICIAL`).

## 3. Search and Pagination (`OfficialFioriCatalogueAdapter`)
The adapter provides multi-criteria filtering and server-side pagination:
- `productSuite` filtering (e.g. `SAP_S4HANA_ON_PREMISE`)
- `uiTechnology` filtering (e.g. `SAP Fiori elements`, `SAP GUI for HTML`)
- `odataService` filtering (e.g. `MM_PUR_PO_MAINT_V2_SRV`)
- Pagination parameters: `page`, `pageSize`, `limit`, `offset` returning `totalPages`, `totalCount`, and `returnedCount`.
