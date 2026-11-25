# Fiorify SAP HANA Cloud Production Architecture & Setup (DB-004)
**Document Version:** 1.0.0  
**Target Environment:** SAP BTP Cloud Foundry Production Landscape  
**Database Engine:** SAP HANA Cloud (QRC 2026+)

---

## 1. Production Architecture Overview

In productive SAP BTP deployments, Fiorify uses **SAP HANA Cloud** as its exclusive, authoritative data store for application persistence.

```
                          ┌────────────────────────────────────────────────────────┐
                          │          SAP BTP Cloud Foundry Environment             │
                          │                                                        │
                          │        ┌──────────────────────────────────────┐        │
                          │        │       Fiorify Node.js Application    │        │
                          │        │             (App Execution)          │        │
                          │        └──────────┬───────────────────┬───────┘        │
                          └───────────────────┼───────────────────┼────────────────┘
                                              │                   │
                  1. Application Persistence  │                   │ 2. Read-Only SAP S21 Integration
                     VCAP_SERVICES (hana)     │                   │    BTP Destination & Connectivity
                     TLS Encrypted (Port 443) │                   │    Zero Mutating Requests (GET only)
                                              ▼                   ▼
                     ┌───────────────────────────────┐   ┌────────────────────────────────┐
                     │    SAP HANA Cloud Instance    │   │  SAP BTP Connectivity Services │
                     │   (fiorify-prod-hana-db)      │   │  • Destination Service         │
                     │                               │   │  • Connectivity Proxy          │
                     │ ┌───────────────────────────┐ │   │  • SAP Cloud Connector         │
                     │ │ Fiorify Dedicated HDI     │ │   └───────────────┬────────────────┘
                     │ │ Container Schema          │ │                   │
                     │ │ • assessments             │ │                   │ Encrypted RFC / HTTP
                     │ │ • generation_handoffs     │ │                   ▼
                     │ │ • generation_projects     │ │   ┌────────────────────────────────┐
                     │ │ • security_audit_events   │ │   │  External SAP S/4HANA System   │
                     │ │ • token_revocations       │ │   │  (System S21, Client 200)      │
                     │ │ • refresh_tokens          │ │   │  • Read-only Catalog & ADT     │
                     │ │ • schema_migrations       │ │   │  • S21 is NOT Fiorify DB       │
                     │ └───────────────────────────┘ │   │  • ZERO DDL / ZERO MUTATIONS   │
                     └───────────────────────────────┘   └────────────────────────────────┘
```

---

## 2. Strict Architectural Separation: Fiorify Persistence vs SAP S21

> [!IMPORTANT]
> **S21 IS NOT FIORIFY'S APPLICATION DATABASE.**
> - **Fiorify Application Persistence:** Fiorify Cloud Foundry application $\rightarrow$ SAP HANA Cloud $\rightarrow$ Fiorify Dedicated HDI Container (`fiorify-prod-hana-db`). This store manages Fiorify's own tables (`assessments`, `generation_handoffs`, `generation_projects`, `security_audit_events`).
> - **SAP S21 Integration:** Fiorify Cloud Foundry application $\rightarrow$ BTP Destination Service $\rightarrow$ Connectivity Service $\rightarrow$ Cloud Connector (if on-premise) $\rightarrow$ SAP S21 Gateway / OData / ADT HTTP endpoints.
> - **Read-Only Invariant:** Under no circumstances does Fiorify execute DDL, CREATE TABLE, or mutating DML on SAP ERP system S21. S21 data and SAP repository objects remain strictly read-only at all times.
> The SAP user `int_samarth` possesses administrative privileges on S21; all operations targeting S21 are strictly limited to HTTP GET read-only catalog inspections via the BTP Destination service.

---

## 3. Cloud Foundry Provisioning & Service Binding (`mta.yaml`)

```yaml
resources:
  # SAP HANA Cloud HDI Container / Database Instance
  - name: fiorify-hana-db
    type: com.sap.xs.hdi-container
    parameters:
      service: hana
      service-plan: hdi-shared
    properties:
      hdi-container-name: ${service-name}

  # XSUAA Security Service
  - name: fiorify-xsuaa-auth
    type: org.cloudfoundry.managed-service
    parameters:
      service: xsuaa
      service-plan: application
      path: ./xs-security.json
```

---

## 4. Production Connection Properties & Security

- **Encryption:** Mandatory (`encrypt: true`, `sslValidateCertificate: true`).
- **Cryptographic Provider:** OpenSSL (`sslCryptoProvider: 'openssl'`).
- **Connection Port:** Port 443 with TLS 1.3.
- **Fail-Closed Startup Guard:** If the application boots with `NODE_ENV=production` and does not detect the `hana` binding, it terminates with code 1 (`MISSING_PRODUCTION_HANA_BINDING`).
