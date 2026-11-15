# SAP Connectivity & Integration Architecture Audit

**Document Reference**: `docs/audit/SAP_CONNECTIVITY_ARCHITECTURE.md`  
**Audit Baseline**: Commit `4c7f9a3` (Branch `test-01`)  
**Target Landscape**: SAP S/4HANA 2023 On-Premise / Private Cloud, System `S21`, Client `200`  
**SAP Administrative Account**: `int_samarth` (Authorized with `SAP_ALL`)

---

## 1. End-to-End Connectivity Architecture

```mermaid
flowchart LR
    subgraph Fiorify_BTP_CF ["Fiorify Platform on SAP BTP Cloud Foundry"]
        FE["Fiorify React Frontend\n(Browser / TLS 1.3)"]
        BE["Fiorify Node.js Backend\n(server.js / Native HTTP)"]
        SEC_CLIENT["SapHttpClient.js\n(assertReadOnly + Host/Path Guards)"]
        ADAPT["BtpDestinationAdapter.js\n(Token Cache + Proxy Config)"]
    end

    subgraph BTP_Platform_Services ["SAP BTP Platform Services"]
        DEST_SRV["SAP Destination Service\n(Destination: 'S21')"]
        CONN_SRV["SAP Connectivity Service\n(Proxy: onpremise_proxy:20003)"]
    end

    subgraph Customer_DMZ ["Customer Network DMZ"]
        SCC["SAP Cloud Connector (SCC)\n(Encrypted Reverse Proxy Tunnel)"]
    end

    subgraph Corporate_Network ["On-Premise SAP Landscape"]
        GW["SAP Gateway / ICF Node\n(Port 44300 / 8000)"]
        ADT["ABAP Development Tools (ADT)\n(/sap/bc/adt)"]
        S21["SAP S/4HANA System S21\n(Client 200 - User: int_samarth)"]
    end

    FE -->|HTTPS REST + Bearer| BE
    BE --> SEC_CLIENT
    SEC_CLIENT --> ADAPT
    ADAPT -->|Service Key Credentials| DEST_SRV
    ADAPT -->|Forwarding Proxy Request| CONN_SRV
    CONN_SRV <-->|Mutually Authenticated TLS Tunnel| SCC
    SCC <-->|Internal Routing| GW
    SCC <-->|Internal Routing| ADT
    GW --> S21
    ADT --> S21
```

---

## 2. Integration Components & Configuration

### 2.1 BTP Destination Configuration (`S21`)
- **Destination Name**: `S21` (configured in `manifest.yml` as `SAP_DESTINATION_NAME: S21`).
- **Target Client**: `200` (`SAP_CLIENT: "200"`).
- **Proxy Type**: `OnPremise`.
- **Authentication**: `BasicAuthentication` in destination configuration; credentials managed securely by SAP BTP Destination Service.
- **Request Timeout**: Configured to `15,000 ms` (`15 s`) to prevent Cloud Foundry request thread starvation.

### 2.2 SAP Cloud Connector (SCC) Configuration
- **Function**: Establishes secure reverse WebSocket/TLS tunnel from on-premise network to BTP Connectivity Service without opening inbound firewall ports.
- **Virtual Host**: Configured in SCC mapping to route to physical application server host `sap-s21.internal:44300`.
- **Accessible Resources (ICF Allowlist in Cloud Connector)**:
  1. `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/` (Path and all sub-paths)
  2. `/sap/opu/odata4/` (Path and all sub-paths)
  3. `/sap/bc/adt/repository/informationsystem/search` (Exact path for T-Code quick search)
  4. `/sap/bc/adt/discovery` (Exact path for ADT capability discovery)
  5. `/sap/bc/echo` (Ping probe)
  6. `/sap/public/bc/` (Public health checks)

---

## 3. SAP Read-Only Safeguard Implementation & Verification

### 3.1 Strict HTTP Method Blocking (`assertReadOnly`)
In `backend/src/infrastructure/connectivity/sapHttpClient.js:75-86`:

```javascript
assertReadOnly(method) {
  const m = String(method || 'GET').toUpperCase();
  if (m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS') {
    const err = new Error(
      `SAP WRITE OPERATION BLOCKED: Method "${m}" violates Fiorify Read-Only SAP Access Boundary. ` +
      'Fiorify never executes writes, transports, or object mutations in SAP S/4HANA.'
    );
    err.code = 'WRITE_OPERATION_BLOCKED';
    err.statusCode = 'AUTHORIZATION_BLOCKED';
    throw err;
  }
}
```

- **Verification Status**: **VERIFIED HARDENED**.
- **Evidence**: Unit tested in `backend/test/s13SecurityHardening.test.js:426-435`. Test confirms that `assertReadOnly` permits `GET`, `HEAD`, `OPTIONS`, and strictly throws `WRITE_OPERATION_BLOCKED` on `POST`, `PUT`, `DELETE`, and `PATCH`.

---

### 3.2 URL Canonicalization & Path Traversal Defense
In `backend/src/infrastructure/connectivity/sapHttpClient.js:101-200`:

1. **Null-Byte Injection Defense**: Rejects `\0` and `%00`.
2. **Backslash Separator Defense**: Rejects `\` and `%5c` to prevent Windows/UNC host confusion.
3. **Ambiguous Separator Defense**: Rejects encoded slashes (`%2f`, `%2F`) which web proxies normalize inconsistently.
4. **Protocol-Relative URL Defense**: Rejects paths starting with `//` to prevent protocol-relative SSRF redirect attacks.
5. **Path Traversal Defense**: Traversal sequences (`..` and `%2e%2e`) are decoded recursively and rejected before URL resolution.
6. **Host Allowlist Enforcement**: Strict regex matching against approved corporate internal domains and hosts (`localhost`, `127.0.0.1`, `*.corp.internal`, `*.ondemand.com`, `s21`, `sap-s21.internal`).

- **Verification Status**: **VERIFIED HARDENED**.
- **Evidence**: Unit tested in `backend/test/s13SecurityHardening.test.js:335-424`.

---

### 3.3 Credential Redaction & Log Hygiene
In `backend/src/adapters/btpDestinationAdapter.js:105-135`:
- **Header Redaction**: `sanitizeHeaders()` strips `Authorization`, `Proxy-Authorization`, `X-CSRF-Token`, and `Cookie` from all diagnostic logs.
- **Error Redaction**: `sanitizeErrorMessage()` scrubs URLs containing embedded credentials (`http://user:pass@host`), database connection strings, and SAP system password parameters before returning error messages to the client or logging to disk.
- **Verification Status**: **VERIFIED COMPLETE**.
- **Evidence**: Unit tested in `backend/test/s2SecurityFoundation.test.js:Subtest 13`.

---

## 4. Known Residual Risk Analysis: `int_samarth` with `SAP_ALL`

### 4.1 Risk Statement
> [!CAUTION]
> **CRITICAL RESIDUAL RISK: Administrative Authorization (`SAP_ALL`) on SAP System `S21`**
>
> The service user account **`int_samarth`** holds unrestricted administrative authorization (`SAP_ALL`) on SAP S/4HANA System `S21` (Client `200` and all clients). Because multiple enterprise projects share this landscape, modifying or revoking `SAP_ALL` on the SAP system is strictly prohibited.
>
> An unrestricted technical account means that any mutating API request dispatched by a compromised backend service would execute with full database and ABAP repository modification authority.

---

### 4.2 Compensating Application-Side Controls

| Threat / Attack Vector | Native SAP Control (If Least Privilege were Configured) | Fiorify Application-Side Compensating Control | Effectiveness & Limitations |
|---|---|---|---|
| **Malicious or Accidental Write Request (POST/PUT/DELETE)** | PFCG authorization check fails in SAP (e.g. `S_DEVELOP` or `ACTVT 01/02` absent). | `SapHttpClient.assertReadOnly()` throws `WRITE_OPERATION_BLOCKED` before network dispatch. | **Effective** against application code paths; does NOT protect if an attacker bypasses the Node.js application process. |
| **SSRF to Administrative SAP Endpoints (`/sap/bc/gui/*`, `/sap/bc/bsp/*`)** | Authorization check fails for transaction/service. | `SapHttpClient.assertAllowedEndpoint()` strictly limits paths to `ALLOWED_SAP_ENDPOINT_PREFIXES` (`/sap/opu/odata/`, `/sap/bc/adt/`, etc.). | **Effective** against endpoint scanning and URL manipulation. |
| **Direct Object Creation via ADT** | `S_ADT_RES` restricted to `DISPLAY` mode. | Fiorify contains zero ADT locking, creation, or transport generation routines; only `quickSearch` is implemented. | **Effective** by absence of code; no mutating ADT client exists in the repository. |
| **CTS Transport Request Creation** | `S_TRANSPRT` object absent. | No CTS or TMS APIs exist in Fiorify backend. Deployment orchestrator halts at write boundary. | **Effective**; deployment plans generate offline files only. |

---

### 4.3 Declaration on Application-Side Safeguards vs SAP Least Privilege

> [!IMPORTANT]
> **FORMAL ARCHITECTURAL DECLARATION: Application-Side Controls are NOT Equivalent to SAP-Side Least Privilege**
>
> In accordance with enterprise information security standards (ISO 27001, OWASP Top 10, CERT-In Guidelines), **application-side controls must NEVER be represented as equivalent to native SAP-side role restrictions**.
>
> If an attacker achieves Remote Code Execution (RCE) on the Cloud Foundry container, or extracts the destination service credentials, they could establish direct connections to the SAP Cloud Connector and execute administrative commands with `SAP_ALL` privileges, bypassing all Node.js `assertReadOnly` checks.
>
> **Recommended Defense-in-Depth Roadmap**:
> 1. **Phase 1 (Immediate)**: Restrict the ICF URL paths in the SAP Cloud Connector resource mapping to `READ-ONLY` mode (accessible resources configured with `Path and all sub-paths` set to `Access Policy: Read Only` in Cloud Connector administration).
> 2. **Phase 2 (Target Architecture)**: Provision a dedicated Fiorify technical service user (`FIORIFY_SVC`) assigned to a custom role (`Z_FIORIFY_READONLY`) containing strictly display authorizations (`S_TCODE` display, `S_TABU_DIS` display, `S_ADT_RES` display), decoupling Fiorify from `int_samarth`.
