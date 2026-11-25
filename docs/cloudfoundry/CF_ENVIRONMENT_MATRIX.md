# Cloud Foundry Environment Configuration Matrix

**Application:** Fiorify — SAP Fiori Modernization Tool  
**Platform:** SAP BTP Cloud Foundry  

---

## 1. Environment Variables Specification

| Variable | Required in Prod | Default (Local) | Production Value | Description |
| :--- | :---: | :---: | :---: | :--- |
| `NODE_ENV` | **YES** | `development` | `production` | Enables production security guardrails, disables mocks, enforces durable DB persistence. |
| `PORT` | Auto (BTP) | `4004` | Dynamically assigned by CF | HTTP listening port for native server. |
| `FIORIFY_PERSISTENCE` | **YES** | `postgres` | `hana` | Authoritative database persistence dialect (`hana` or `postgres`). |
| `FIORIFY_ENFORCE_AUTH` | **YES** | `false` | `true` | Enforces mandatory XSUAA / Bearer JWT validation on all non-public routes. |
| `SAP_DESTINATION_NAME` | **YES** | `S21` | `S21` | Name of the BTP Destination pointing to S/4HANA 2023. |
| `SAP_CLIENT` | **YES** | `200` | `200` | Target SAP Client identifier. |
| `SAP_TIMEOUT_MS` | NO | `15000` | `15000` | HTTP client request timeout in milliseconds for SAP S21 queries. |
| `CORS_ALLOWED_ORIGINS` | NO | `http://localhost:5173,...` | Comma-separated domains | Whitelist of allowed CORS origins for browser fetch calls. |
| `FIORIFY_TENANT_ID` | NO | `DEFAULT-TENANT-S21` | Tenant-specific ID | Default tenant fallback identifier if not present in JWT. |
| `VCAP_SERVICES` | Auto (BTP) | Injected via `.env` | Automatically bound | JSON string containing credentials for bound BTP service instances. |

---

## 2. Resource Quotas & Scaling Limits

| Resource | Manifest Allocation | Recommended Production | Rationale |
| :--- | :---: | :---: | :--- |
| **Memory** | `1024M` (1 GB) | `2048M` (2 GB for high load) | Accommodates Node 20 runtime, V8 heap, in-memory caches, and static file streaming. |
| **Disk Quota** | `2048M` (2 GB) | `4096M` (4 GB) | Supports node_modules, frontend build assets, temporary export ZIP generation. |
| **Instances** | `1` | `2` (HA Active-Active) | Multi-instance deployment with durable persistence in SAP HANA Cloud. |

---

## 3. Backing BTP Services & Plans

| Service | Instance Name | Service Plan | Purpose |
| :--- | :--- | :--- | :--- |
| **XSUAA** | `Fiorify-xsuaa` | `application` | OAuth2 / JWT authentication, user role collection mappings, and tenant context. |
| **Destination** | `Fiorify-destination` | `lite` | Secure credential lookup and URL resolution for upstream SAP systems. |
| **Connectivity** | `Fiorify-connectivity` | `lite` | SOCKS5 on-premise proxy routing via SAP Cloud Connector to S21. |
| **HANA Cloud** | `Fiorify-hana` | `hdi-shared` | Enterprise relational persistence with ACID transactions and multi-tenant isolation. |
