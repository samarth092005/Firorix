# Fiorify — System Environment Configuration Specification (Workstream D2 & D4)

## 1. Target Landscape Architecture
- **Primary Landscape**: SAP S/4HANA 2023 On-Premise / Private Edition
- **System ID**: `S21`
- **Default Client**: `200`
- **Target Release Baseline**: `SAP S/4HANA 2023 On-Premise (FPS02)`
- **SAP Gateway Catalog Endpoint**: `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2`
- **SAP ADT Discovery Endpoint**: `/sap/bc/adt/discovery`

## 2. SAP Authorization Requirements
When connecting to SAP S21, low-level table inspection (`TSTC`, `TSTCT`, `TADIR`, `TRDIR`) requires designated Basis authorizations:
- `S_ADT_RES`: Activity 03 (Display) for ADT resources.
- `S_DEVELOP`: Activity 03 (Display) for object types `PROG`, `TRAN`, `DEVC`.
- `S_TABU_DIS`: Activity 03 (Display) for table authorization group `&NC&` / `TSTC`.

When authorizations are missing (ADT returns HTTP 403), Fiorify:
1. Honestly flags metadata as `PARTIAL_METADATA` / `PENDING_VERIFICATION`.
2. Emits an actionable Basis remediation banner in the UI detailing the required PFCG objects.
3. Continues standard Fiori matching using Gateway catalog correlations and authoritative DDIC snapshots.
4. **Never** declares the transaction non-existent.

## 3. SAP Fiori MCP Server Integration
- **Server Package**: `@sap-ux/fiori-mcp-server` (pinned v1.15.24).
- **Transport**: STDIO.
- **Execution Policy**: Conservative Allowlist (5 read-only tools allowed: `search_docs`, `list_fiori_apps`, `list_sap_systems`, `download_odata_service_metadata`, `generate_fiori_app_odata`; write/generation tools strictly blocked in Discovery phase).
- **Enrichment Mode**: MCP is an optional enrichment source, never the authoritative source of truth.
