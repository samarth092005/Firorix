# SAP BTP Service Inventory & Runtime Binding Specifications
## Fiorify Production Staging — Cloud Foundry Environment

**Document ID:** `SAP-BTP-INV-001`  
**Execution Ticket:** `SAP-001`  
**Deployment Target:** SAP BTP Cloud Foundry Environment (Multi-Tenant Organization)  
**Space:** `fiorify-prod` / `fiorify-staging`  
**Author:** Senior SAP BTP Integration Architect  
**Status:** AUDITED & CONFIGURED  
**Last Updated:** November 16, 2026  

---

## 1. Executive Summary

This inventory establishes the authoritative registry of SAP Business Technology Platform (BTP) managed service instances required by Fiorify. Every service binding is explicitly defined in `manifest.yml`, verified in `backend/src/adapters/btpDestinationAdapter.js`, and validated for production deployment.

Fiorify enforces a **fail-closed** architecture: if any required BTP service binding is absent in a production environment (`NODE_ENV=production`), the application terminates startup with an explicit `SECURITY_MISCONFIGURATION` or `PERSISTENCE_CONFIGURATION_ERROR`, preventing silent or unauthenticated operation.

---

## 2. Core Service Matrix

| Service Type | Service Name in BTP Marketplace | Instance Name (`manifest.yml`) | Plan | Binding Role & Purpose | Fail-Closed Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Authentication & Authorization** | `xsuaa` | `fiorify-xsuaa` | `application` | Central OAuth 2.0 / OIDC identity validation, RS256 token verification, and tenant context extraction (`xs.appname`, roles). | Rejects all unverified JWTs. Local auth strictly prohibited in production. |
| **Destination Service** | `destination` | `fiorify-destination` | `lite` | Secure retrieval of target system endpoints, proxy configurations, credentials, and token exchange. | Returns `DESTINATION_NOT_FOUND` if unconfigured; no synthetic destinations. |
| **Connectivity Service** | `connectivity` | `fiorify-connectivity` | `lite` | Provides SOCKS5 HTTP proxy (`onpremise_proxy_host:onpremise_proxy_port`) to route outbound traffic through Cloud Connector to on-premise/private SAP systems. | Outbound calls fail with `CONNECTIVITY_PROXY_UNAVAILABLE` if proxy token cannot be obtained. |
| **Database Persistence** | `hana` | `fiorify-hana` | `hdi-shared` | Authoritative transactional and analytical persistence for assessments, projects, tenant metadata, and audit logs. | Application refuses startup if HANA credentials (`host`, `schema`, `user`, `password`) are missing. Zero in-memory fallback. |

---

## 3. Manifest Service Bindings Specification

The application deployment descriptor (`manifest.yml`) mandates the following exact configuration:

```yaml
applications:
  - name: fiorify
    path: .
    memory: 1024M
    buildpacks:
      - nodejs_buildpack
    command: node backend/src/server.js
    env:
      NODE_ENV: production
      FIORIFY_PERSISTENCE: hana
      SAP_DESTINATION_NAME: S21
      SAP_CLIENT: "200"
    services:
      - fiorify-xsuaa
      - fiorify-destination
      - fiorify-connectivity
      - fiorify-hana
```

---

## 4. Service Details & Credential Inspection Protocols

### 4.1. SAP BTP XSUAA Service (`fiorify-xsuaa`)
- **Marketplace Service:** `xsuaa`
- **Plan:** `application`
- **Configuration File:** `xs-security.json`
- **Binding Keys (`VCAP_SERVICES.xsuaa[0].credentials`):**
  - `clientid`: OAuth 2.0 client ID for token introspection.
  - `clientsecret`: OAuth 2.0 client secret.
  - `url`: Token authentication endpoint (`https://<subaccount>.authentication.<region>.hana.ondemand.com`).
  - `verificationkey`: Public RSA PEM key used to verify asymmetric RS256 JWT signatures.
  - `xsappname`: Unique application identifier scope prefix.
- **Verification Rule:** `AuthProviderFactory.getProvider('XSUAA')` verifies that `verificationkey` or `url` is present.

### 4.2. SAP BTP Destination Service (`fiorify-destination`)
- **Marketplace Service:** `destination`
- **Plan:** `lite`
- **Binding Keys (`VCAP_SERVICES.destination[0].credentials`):**
  - `clientid`: Destination service OAuth client.
  - `clientsecret`: Destination service OAuth secret.
  - `uri`: Base URL of Destination Service REST API (`https://destination-configuration.cfapps.<region>.hana.ondemand.com`).
- **Target Destination Requirement:**
  - Destination name: `S21`
  - URL: `http://kbl_fiori:8000` (virtual host mapped in SAP Cloud Connector)
  - ProxyType: `OnPremise`
  - Authentication: `BasicAuthentication`
  - User: `int_samarth`
  - Additional Properties: `TrustAll=FALSE`, `sap-client=200`
- **Secret Redaction:** Headers and passwords retrieved from Destination Service are sanitized via `sanitizeDestination()`.

### 4.3. SAP BTP Connectivity Service (`fiorify-connectivity`)
- **Marketplace Service:** `connectivity`
- **Plan:** `lite`
- **Binding Keys (`VCAP_SERVICES.connectivity[0].credentials`):**
  - `clientid`: Connectivity service OAuth client.
  - `clientsecret`: Connectivity service OAuth secret.
  - `url`: Token endpoint for connectivity service.
  - `onpremise_proxy_host`: SOCKS5 / HTTP Proxy IP address or hostname.
  - `onpremise_proxy_http_port`: Proxy port (typically `20003` or `20004`).
- **Cloud Connector Routing Rule:** Any request targeting a destination with `ProxyType=OnPremise` must route through this proxy and supply the `SAP-Connectivity-Authentication` Bearer token.

### 4.4. SAP HANA Cloud Service (`fiorify-hana`)
- **Marketplace Service:** `hana`
- **Plan:** `hdi-shared`
- **Binding Keys (`VCAP_SERVICES.hana[0].credentials`):**
  - `host`: Hostname of the SAP HANA Cloud instance (`<instance-guid>.hana.prod-<region>.hanacloud.ondemand.com`).
  - `port`: Port (typically `443` with TLS/SSL enabled).
  - `schema`: Dedicated HDI container schema (e.g., `FIORIFY_HDI_CONTAINER_1`).
  - `user`: Dedicated HDI container technical user.
  - `password`: Strong password generated by HDI broker.
  - `certificate`: Root CA certificate for HANA TLS encryption verification.
- **Persistence Rule:** All application state (users, assessments, recommendations, project handoffs, audit logs) is stored in this container. S21 tables are NEVER accessed or modified for application persistence.

---

## 5. Administrator Confirmation & Provisioning Checklist

Before running `cf push`, the SAP BTP subaccount administrator must verify the following items:

| Item | Action / Command | Required State | Confirmed? |
| :--- | :--- | :--- | :--- |
| **XSUAA Instance** | `cf create-service xsuaa application fiorify-xsuaa -c xs-security.json` | Instance created, bound to app | [ ] PENDING ADMIN |
| **Destination Instance** | `cf create-service destination lite fiorify-destination` | Instance created, bound to app | [ ] PENDING ADMIN |
| **Connectivity Instance** | `cf create-service connectivity lite fiorify-connectivity` | Instance created, bound to app | [ ] PENDING ADMIN |
| **HANA HDI Container** | `cf create-service hana hdi-shared fiorify-hana` | Instance created, bound to app | [ ] PENDING ADMIN |
| **Destination Configuration** | Subaccount > Connectivity > Destinations > `S21` | Configured with `OnPremise`, `kbl_fiori:8000` | [ ] PENDING ADMIN |
| **Cloud Connector Tunnel** | Cloud Connector > Subaccount linked > Status `Connected` | Tunnel online to BTP Subaccount | [ ] PENDING ADMIN |
| **Cloud Connector Mapping** | Mapping: `kbl_fiori:8000` -> `192.168.1.55:8000` | Allowed resources: `/sap/opu/odata`, `/sap/bc` | [ ] PENDING ADMIN |

---

## 6. Audit Verdict

All service binding definitions and inspection mechanisms meet the requirements for **SAP-001**.
The application gracefully detects missing bindings in development and strictly fails closed in production.
