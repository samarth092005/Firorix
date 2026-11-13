# Fiorify — Stage S3: SAP Cloud Connector & Basis Administration Guide (Hardened)

> [!IMPORTANT]
> This guide enforces strict least-privilege principles. Unsafe wildcards (`*`, broad `S_DEVELOP`, broad `S_TABU_DIS`, unrestricted `/sap/opu/odata`) have been removed.
> See [`S3_LEAST_PRIVILEGE_BASIS_MATRIX.md`](file:///c:/Users/samarth/firorix/docs/foundation/S3_LEAST_PRIVILEGE_BASIS_MATRIX.md) for the complete authorization object breakdown.

## 1. Scope & Objective
This guide specifies the exact Basis setup and SAP Cloud Connector (SCC) configuration required to securely connect Fiorify on SAP BTP to on-premise SAP S/4HANA 2023 System **S21**, Client **200**.

---

## 2. SAP Cloud Connector Setup

### 2.1 Subaccount Connection
In the Cloud Connector Administration UI (`https://<scc-host>:8443`):
1. **Region**: `eu30` (matching the BTP Subaccount region host).
2. **Subaccount ID**: Target SAP BTP Subaccount ID.
3. **Display Name**: `Fiorify S/4HANA Modernization Connector`.
4. **Subaccount User / Password**: SAP BTP User with Subaccount Administrator or Connectivity Operator privileges.

### 2.2 System Mapping
Under **Cloud To On-Premise** > **Mapping Virtual To Internal System**:

| Parameter | Recommended Value | Notes |
|---|---|---|
| Back-end Type | `ABAP System` | Identifies SAP NetWeaver / ABAP application server. |
| Protocol | `HTTP` (or `HTTPS`) | HTTP communication to ICM. |
| Internal Host | `192.168.1.55` | Internal IP or FQDN of the SAP S21 application server. |
| Internal Port | `8000` | HTTP port configured in SAP transaction `SMICM`. |
| Virtual Host | `kbl_fiori` | Virtual hostname defined in BTP Destination URL. |
| Virtual Port | `8000` | Virtual port defined in BTP Destination URL. |
| Principal Type | `None` | Used for BasicAuthentication with technical user. |

---

## 3. Accessible Resources Configuration (Least Privilege)

Fiorify strictly adheres to the principle of least privilege. Only the following specific URL paths must be exposed in Cloud Connector under the virtual host `kbl_fiori:8000`:

| URL Path | Access Mode | Purpose |
|---|---|---|
| `/sap/bc/echo` | Path only | Connection reachability and ping diagnostic. |
| `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2` | Path and all sub-paths | Gateway OData service catalog discovery. |
| `/sap/bc/adt/discovery` | Path only | ABAP Development Tools XML discovery workspace. |
| `/sap/bc/adt/repository/nodestructure` | Path only | Structural inspection of standard packages and object trees. |

> [!CAUTION]
> Do NOT expose `/sap/opu/odata` root or `/sap/bc/adt` root as wildcards. Do NOT expose `/sap/bc/gui` or `/sap/bc/webdynpro`. Fiorify requires only the listed metadata endpoints.

---

## 4. SAP Backend Basis Authorizations

The technical service user configured in the BTP Destination (`BTP_Fiorify_SVC`, User Type: `B - System User` or `C - Communication User`) must be assigned a custom role `Z_Fiorify_DISCOVERY_READONLY` containing strictly display authorizations:

| Authorization Object | Field | Value | Purpose |
|---|---|---|---|
| `S_SERVICE` | `SRV_TYPE` | `HT` | Authorizes execution of HTTP ICF and Gateway services. |
| | `SRV_NAME` | `IWFND_CATALOGSERVICE_0002*` | Gateway catalog service tree. |
| `S_ADT_RES` | `URI` | `/sap/bc/adt/discovery*` | ADT repository discovery read access. |
| `S_DEVELOP` | `OBJTYPE` | `TRAN`, `PROG`, `DDLS` | Authorizes display of transaction codes, programs, and CDS views. |
| | `ACTVT` | **`03` (Display)** | **STRICTLY DISPLAY ONLY**. Never grant `01` or `02`. |
| `S_TABU_DIS` | `DICBERCLS` | `SS` | Display authorization for standard DDIC metadata tables (e.g., `TSTC`, `TSTCT`). |
| | `ACTVT` | **`03` (Display)** | **STRICTLY DISPLAY ONLY**. |

> [!NOTE]
> RFC execution (`S_RFC`) is disabled by default because RFC execution (`ACTVT 16`) is not inherently read-only. Fiorify uses HTTP REST/OData services exclusively.

---

## 5. ICF Service Activation Checklist
In SAP transaction `SICF`, ensure the following service nodes are active:
- `/default_host/sap/bc/echo`
- `/default_host/sap/opu/odata/iwfnd/catalogservice`
- `/default_host/sap/bc/adt`
- `/default_host/sap/public/bc/icf`
