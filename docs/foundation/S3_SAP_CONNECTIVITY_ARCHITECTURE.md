# Fiorify — Stage S3: SAP S/4HANA Connectivity Architecture

## 1. Architectural Overview
Fiorify connects modern cloud application runtimes to backend on-premise SAP S/4HANA systems (specifically target system **S21**, Client **200**, running **SAP S/4HANA 2023 On-Premise**) without opening inbound firewall ports or deploying proprietary agents inside the customer SAP kernel.

```mermaid
flowchart LR
    subgraph Fiorify_Runtime ["Fiorify Runtime (Cloud Foundry / Local)"]
        HTTPRouter["Node.js 20 HTTP Router (server.js)"]
        HealthSvc["SapConnectionHealthService"]
        ConnProvider["SapConnectivityProvider"]
        ResilientClient["SapHttpClient (Read-Only Guard)"]
        DestProvider["BtpDestinationProvider"]
    end

    subgraph BTP ["SAP Business Technology Platform (BTP)"]
        XSUAA["XSUAA Auth Service"]
        DestSvc["BTP Destination Service (S21)"]
        ConnSvc["BTP Connectivity Service"]
    end

    subgraph OnPremise ["Customer Enterprise Network"]
        SCC["SAP Cloud Connector (SCC)"]
        ICM["SAP Internet Communication Manager (ICM)"]
        Gateway["SAP Gateway Foundation (/IWFND)"]
        ADT["ABAP Development Tools (/sap/bc/adt)"]
        S4CORE["S4CORE 108 / S/4HANA 2023 Kernel"]
    end

    HTTPRouter --> ConnProvider
    HealthSvc --> ConnProvider
    ConnProvider --> DestProvider
    DestProvider -->|OAuth2 client_credentials| DestSvc
    ConnProvider --> ResilientClient
    ResilientClient -->|mTLS Tunnel Proxy| ConnSvc
    ConnSvc -->|Reverse Invert Tunnel| SCC
    SCC -->|HTTP / RFC (Port 8000)| ICM
    ICM --> Gateway
    ICM --> ADT
    Gateway --> S4CORE
    ADT --> S4CORE
```

---

## 2. Core Architectural Components

### 2.1 BtpDestinationProvider
- Interfaces with the SAP BTP Destination Service via official `@sap-cloud-sdk/connectivity` or direct REST API (`/destination-configuration/v1/subaccountDestinations`).
- Securely retrieves target host, virtual URL, authentication type, and client headers.
- Enforces credential hygiene: passwords and auth tokens are scrubbed from return payloads before exposure to logging or telemetry.

### 2.2 SapHttpClient (Read-Only Guardrail)
- Enforces strict read-only boundary: attempts to issue `POST`, `PUT`, `DELETE`, or `PATCH` to SAP endpoints are intercepted and aborted before leaving the process with `WRITE_OPERATION_BLOCKED`.
- Implements exponential backoff retry for transient network anomalies (HTTP 502/503/504).
- Enforces timeouts (default 15,000ms) with native `AbortController` cancellation.

### 2.3 SapConnectionHealthService
- Executes a 10-point capability probe covering destination resolution, Cloud Connector tunnel reachability, technical user authentication, Gateway OData catalog, ADT repository services, system echo, release verification, transaction discovery, and security boundaries.
- Compiles an empirical coverage score and honest status code.

### 2.4 SapErrorTaxonomy
- Decouples infrastructure errors from application logic.
- An unreachable host, authorization block, or expired token is classified as an infrastructure failure, preventing downstream engines from falsely concluding that a transaction or standard Fiori app is missing.
