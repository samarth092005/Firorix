# Fiorify — Stage S3: BTP Destination Configuration Guide (Hardened)

## 1. Destination Overview
The primary target system for Fiorify is SAP S/4HANA 2023 on-premise, identified in the landscape as System **S21**, Client **200**.

Connectivity is established through an SAP BTP Destination configured at the Subaccount level.

---

## 2. Hardened Destination Definition Specification

```ini
# SAP BTP Destination Definition: S21
Name=S21
Type=HTTP
URL=http://kbl_fiori:8000
ProxyType=OnPremise
Authentication=BasicAuthentication
User=BTP_Fiorify_SVC
Password=********
Description=SAP S/4HANA 2023 Private Edition - Target System S21 (Client 200)

# Canonical Required Runtime Properties
sap-client=200
```

> [!IMPORTANT]
> **Hardening & Clean-up Actions Applied**:
> 1. **`User=BTP_Fiorify_SVC`**: Replaced personal user account with dedicated technical communication user.
> 2. **Removed `TrustAll=true`**: Insecure TLS bypass removed. All connections through Cloud Connector must validate certificates if HTTPS is used.
> 3. **Removed Legacy WebIDE / HTML5 Properties**:
>    - `WebIDEEnabled=true` (REMOVED: Only used by deprecated WebIDE UI template generator)
>    - `WebIDESystem=S21` (REMOVED)
>    - `WebIDEUsage=odata_abap,bsp_execute,dev_abap` (REMOVED: Node.js programmatic backend connects via `@sap-cloud-sdk/connectivity`)
>    - `HTML5.DynamicDestination=true` (REMOVED)

---

## 3. Canonical Property Specifications

| Property | Value | Purpose |
|---|---|---|
| `Name` | `S21` | Canonical destination name referenced across Fiorify discovery and adapters. |
| `Type` | `HTTP` | Uses HTTP/HTTPS protocol through Cloud Connector. |
| `URL` | `http://kbl_fiori:8000` | Virtual host and port mapped in SAP Cloud Connector. Must NOT match internal IP directly. |
| `ProxyType` | `OnPremise` | Directs requests through SAP Cloud Connector tunnel via BTP `connectivity` service. |
| `Authentication` | `BasicAuthentication` | Technical service user authentication. |
| `User` | `BTP_Fiorify_SVC` | Dedicated technical communication user with `Z_Fiorify_DISCOVERY_READONLY` role. |
| `sap-client` | `200` | Target SAP S/4HANA client identifier. |

---

## 4. Credential Boundary & Security Invariant

- Credentials (`User`, `Password`) are stored **exclusively** in the SAP BTP Destination Service encrypted store.
- Application code accesses S21 via `@sap-cloud-sdk/connectivity` or token-authorized proxy requests.
- Fiorify APIs, logs, traces, and error payloads **strictly redact** all credentials, authorization headers, and cookies (`[REDACTED]`).
