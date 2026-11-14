# Local SAP System Setup Guide — SAP S/4HANA S21 (Client 200)

**Project:** Fiorify  
**Target Landscape:** SAP S/4HANA 2023 On-Premise / Private Edition (S4CORE 108)  
**System ID:** `S21`  
**Client:** `200`  
**Security Profile:** Strict Read-Only (`isReadOnly: true`)

---

## 1. Executive Summary & Purpose

This guide provides instructions for configuring and verifying local developer connectivity to the target SAP S/4HANA system (`S21`, Client `200`).

Fiorify is designed to run in two primary modes:
1. **Direct HTTP (`DIRECT_HTTP`):** Direct local network connectivity to SAP ICM / Gateway for local development, diagnostic probing, and fast verification loops without requiring an SAP BTP Cloud Connector setup.
2. **BTP Destination Service (`BTP_DESTINATION`):** Enterprise hybrid connectivity routing through SAP BTP Connectivity Service and Cloud Connector tunnel.

> [!CAUTION]
> **Strict Read-Only Directives:**
> Fiorify enforces a zero-modification policy against SAP S21.
> - All HTTP requests are strictly validated at the native HTTP client layer (`SapHttpClient`).
> - Mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) are blocked locally before any network packet is dispatched.
> - No ABAP artifacts, DDIC tables, CDS views, or transport requests (`TRKORR`) are ever created, activated, or modified on the SAP system.

---

## 2. Prerequisites & Network Connectivity

### Network Architecture
- **Host / IP:** The SAP instance must be reachable on the local development network (e.g. `192.168.1.55:8000` or corporate VPN).
- **ICM Port:** Standard HTTP port `8000` or HTTPS port `44300`.
- **Target Client:** Client `200` (passed via query parameter `sap-client=200` and header `sap-client: 200`).

### Required SAP Basis Authorizations
To perform comprehensive discovery without authorization failure, the technical user configured for Fiorify requires the following authorization objects:

| Authorization Object | Field | Values | Purpose |
| :--- | :--- | :--- | :--- |
| `S_SERVICE` | `SRV_NAME` | `/IWFND/SG_MED_CATALOG`, `/SAP/OPU/ODATA/*` | Read access to Gateway OData Catalog |
| `S_SERVICE` | `SRV_TYPE` | `HT` | HTTP Service activation check |
| `S_RFC` | `RFC_NAME` | `/IWFND/*`, `RFCPING`, `SYSTEM_INFO` | RFC connectivity for Gateway runtime |
| `S_ADT_RES` | `URI` | `/sap/bc/adt/*` | ADT Repository discovery and search |
| `S_TABU_DIS` | `ACTVT`, `DICBERCLS` | `03` (Display) | Display access to standard DDIC tables |

---

## 3. Environment Configuration

Configuration is managed via `backend/.env`. Copy from `backend/.env.example` as a starting point.

```bash
# ==============================================================================
# SAP S/4HANA Direct Connectivity (Sprint S2 - S21 / Client 200)
# ==============================================================================
SAP_DESTINATION_NAME=S21
SAP_CLIENT=200
SAP_TIMEOUT_MS=15000

# Direct HTTP Gateway Endpoint (Local Dev / Diagnostics)
SAP_BASE_URL=http://192.168.1.55:8000
SAP_URL_OVERRIDE=http://192.168.1.55:8000

# SAP Technical User Credentials (Never commit real credentials to Git)
SAP_USER=int_samarth
SAP_PASSWORD=****************

# Security & TLS Configuration
SAP_STRICT_READ_ONLY=true
SAP_REJECT_UNAUTHORIZED_TLS=true
```

---

## 4. Verification & Diagnostics

### Step 1: Basic ICF Echo Check
Verify that the Internet Communication Manager (ICM) is active and reachable:
```bash
curl -I http://192.168.1.55:8000/sap/bc/echo
```
*Expected Result:* HTTP 200 OK or HTTP 401 Unauthorized (confirming ICM is listening).

### Step 2: Gateway Catalog Discovery
Verify that the OData Catalog Service is published and accessible:
```bash
curl -u int_samarth:password "http://192.168.1.55:8000/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection?\$top=1&sap-client=200"
```
*Expected Result:* HTTP 200 OK with XML or JSON catalog entry.

### Step 3: ADT Discovery Check
Verify that ABAP Development Tools discovery service is available:
```bash
curl -u int_samarth:password "http://192.168.1.55:8000/sap/bc/adt/discovery?sap-client=200"
```
*Expected Result:* HTTP 200 OK (with ADT feature list) or HTTP 403 Forbidden (if user lacks `S_ADT_RES`).

---

## 5. Diagnostic State Taxonomy

Fiorify assigns explicit, non-conflated status indicators to the SAP connection:

| Status | Meaning | Action Required |
| :--- | :--- | :--- |
| `CONNECTED` | Both Gateway Catalog and ADT Discovery passed verification. | Full modernization workflow ready. |
| `PARTIAL_CONNECTIVITY` | Gateway Catalog is reachable, but ADT endpoint is unauthorized (HTTP 403). | Assign `S_ADT_RES` authorization in SAP via PFCG. |
| `AUTHENTICATION_FAILED` | User credentials rejected by SAP ICM (HTTP 401). | Check `SAP_USER` and `SAP_PASSWORD` in `.env`. |
| `AUTHORIZATION_BLOCKED` | SAP returned HTTP 403 on critical Gateway endpoints. | Check role assignments in SAP Transaction SU01. |
| `NETWORK_UNREACHABLE` | TCP connection timed out or host unreachable. | Verify IP address, port, and network routes. |
| `NOT_CONFIGURED` | Required variables are missing from `.env`. | Populate environment configuration. |
