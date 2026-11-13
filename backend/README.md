# Fiorify Backend & SAP S/4HANA Discovery Service

**Project:** Fiorify — SAP S/4HANA Transaction-to-Fiori Discovery Tool  
**Target Landscape:** S21 (Client 200) — SAP S/4HANA 2023 Private Edition  
**Observed Components:** S4CORE 108, SAP_BASIS 758, SAP_UI 758, SAP_GWFND 758  
**Backend Runtime:** Node.js 20 LTS (Native HTTP & CAP CDS Models)  
**Status:** Implemented & Ready  

---

## 1. Architecture Overview

The Fiorify backend provides both a **lightweight, native Node 20 HTTP service** and **SAP Cloud Application Programming Model (CAP) CDS service definitions** for deployment on SAP BTP Cloud Foundry / Kyma.

```
                    ┌────────────────────────────┐
                    │   Fiorify React Frontend    │
                    └──────────────┬─────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
        (Local Mock)                              (Live S21)
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │    MockSapAdapter    │                  │    LiveSapAdapter    │
   │  - Synthetic DDIC    │                  │  - HTTP Gateway OData│
   │  - Curated Scenarios │                  │  - Non-Mock Fallback │
   └──────────┬───────────┘                  └──────────┬───────────┘
              │                                         │
              └────────────────────┬────────────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │   EvidenceClassifier (TADIR)  │
                   │  - Package (DEVCLASS)         │
                   │  - Original System (SRCSYSTEM)│
                   │  - Conflict Diagnostic Check  │
                   └───────────────┬───────────────┘
                                   ▼
                   ┌───────────────────────────────┐
                   │    Catalogue & Matching       │
                   │  - Official S/4HANA 2023 Cat. │
                   │  - 7 Relationship Classes     │
                   └───────────────────────────────┘
```

---

## 2. Running the Backend Service

The backend runs directly under Node.js 20 without external package dependencies:

```bash
cd backend
npm start
# Server listens on http://localhost:4004
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Service root and metadata |
| `GET` | `/api/v1/health` | Health check and S21 connection metadata |
| `GET` | `/api/v1/systems` | Landscape registry (S21-200 LIVE, S21-200-DEMO, S4H-DEV-200) |
| `POST` | `/api/v1/tcode-search` | Evidence-based T-Code search and Fiori matching |
| `GET` | `/api/v1/gateway-smoke-test` | Isolated SAP Gateway Catalog smoke test via BTP Destination S21 (Protected) |

### Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4004` | HTTP server port |
| `SAP_DESTINATION_NAME` | `S21` | Target BTP Destination name |
| `SAP_CLIENT` | `200` | Target SAP Client |
| `SAP_TIMEOUT_MS` | `10000` | Request timeout in milliseconds |
| `Fiorify_ADMIN_SECRET` | *(empty)* | Administrative secret required for `/api/v1/gateway-smoke-test` |
| `CORS_ALLOWED_ORIGINS` | *(safe local defaults)* | Comma-separated list of allowed origins or `*` |
| `VCAP_SERVICES` | *(auto BTP CF)* | Cloud Foundry service bindings for Destination & Connectivity |

### Sample `POST /api/v1/tcode-search` Payload
```json
{
  "systemId": "S21-200-DEMO",
  "tcode": "OB08",
  "language": "EN"
}
```

---

## 3. SAP CAP Model Definitions

For future deployment into an SAP BTP HANA Cloud / HDI container:
- **`backend/db/schema.cds`**: Defines `Fiorify.discovery.Systems`, `Transactions`, `FioriApps`, and `TCodeMappings`.
- **`backend/srv/discovery-service.cds`**: Exposes `/odata/v4/discovery` with projection entities and the `searchTransaction` action.

---

## 4. Live SAP S/4HANA (S21-200) Integration Specification

To enable full end-to-end live queries against SAP S/4HANA 2023 system `S21` client `200`:

### Required ABAP OData Service
- **Service Name:** `Z_Fiorify_DISCOVERY_SRV`
- **Gateway Activation:** Transaction `/IWFND/MAINT_SERVICE`
- **EntitySet:** `TransactionSet`
- **Key Field:** `Tcode` (CHAR 20)
- **Target Gateway Path:** `/sap/opu/odata/sap/Z_Fiorify_DISCOVERY_SRV/TransactionSet('{tcode}')`

### Expected Fields in OData Response
```json
{
  "d": {
    "Tcode": "FB03",
    "Text": "Display Document",
    "Program": "SAPMF05L",
    "Screen": "100",
    "Package": "FIDC",
    "Srcsystem": "SAP",
    "SoftwareComponent": "S4CORE 108",
    "Exists": true,
    "Classification": "STANDARD"
  }
}
```

### SAP Security & Authorizations
- **Authorization Object:** `S_SERVICE` with hash for `Z_Fiorify_DISCOVERY_SRV`.
- **Authorization Object:** `S_TCODE` for discovery scope.
- **Authorization Object:** `S_TABU_DIS` with table authorization group for DDIC tables (`TSTC`, `TSTCT`, `TADIR`).
- **Read-Only Invariant:** The discovery role MUST be strictly read-only. No write or transport authorizations are required.

---

## 5. Architectural Invariants Enforced

1. **Multi-Evidence Governance:** Classification as `STANDARD` or `CUSTOM` requires consensus between T-Code namespace, TADIR package (`DEVCLASS`), and original delivery system (`SRCSYSTEM`). Conflicting evidence automatically defaults to `UNKNOWN`.
2. **BR-03 "Unknown is Not Unsupported":** Incomplete evidence or pending TADIR verification (e.g. `FBL1N`) is strictly preserved as `CATALOGUE_PENDING_VERIFICATION`, never misdiagnosed as an absent application.
3. **Safe Live Fallback:** In `LIVE_SAP` mode (targeting `S21-200`), communication or authorization failures produce structured diagnostic advisories. Under no circumstances does the system silently fall back to mock data.
