# SAP BTP Cloud Foundry Production Deployment Guide

**Application:** Fiorify — SAP Fiori Modernization & Generation Platform  
**Target Landscape:** SAP BTP Cloud Foundry Environment  
**Database:** SAP HANA Cloud (HDI-Shared Container)  
**Upstream System:** SAP S/4HANA 2023 Private Edition (S21, Client 200 via Cloud Connector)  
**Descriptor:** [`manifest.yml`](file:///c:/Users/samarth/firorix/manifest.yml)  
**Security Descriptor:** [`xs-security.json`](file:///c:/Users/samarth/firorix/xs-security.json)  

---

## 1. Architecture Overview & Topology

Fiorify deploys as a consolidated enterprise web application on SAP BTP Cloud Foundry:
- **Runtime:** Node.js 20 LTS (`nodejs_buildpack`)
- **Backend:** Native Node.js HTTP REST engine with CAP-ready modular routes
- **Frontend:** React 18, Vite, TypeScript, SAP Fiori design system (delivered via single-origin static file serving from `frontend/dist/`)
- **Persistence:** SAP HANA Cloud in production (PostgreSQL in local development)
- **Security:** SAP BTP XSUAA with JWT verification, tenant isolation, and RBAC
- **Connectivity:** SAP BTP Destination Service + Connectivity Service via Cloud Connector

---

## 2. Prerequisites & BTP Service Provisioning

Before executing `cf push`, ensure all required BTP backing service instances are provisioned within the target Cloud Foundry space.

### 2.1 Service Provisioning Commands

```bash
# 1. Dedicated XSUAA Service Instance (using canonical xs-security.json)
cf create-service xsuaa application Fiorify-xsuaa -c xs-security.json

# 2. SAP BTP Destination Service Instance (lite plan)
cf create-service destination lite Fiorify-destination

# 3. SAP BTP Connectivity Service Instance (lite plan, Cloud Connector proxy)
cf create-service connectivity lite Fiorify-connectivity

# 4. SAP HANA Cloud HDI-Shared Container (production persistence)
cf create-service hana hdi-shared Fiorify-hana
```

### 2.2 Verifying Service States

```bash
cf services
```
Ensure all four services report status `create succeeded`:
- `Fiorify-xsuaa`
- `Fiorify-destination`
- `Fiorify-connectivity`
- `Fiorify-hana`

---

## 3. Deterministic Pre-Deployment Build Sequence

Fiorify enforces strict pre-deployment verification. The build pipeline compiles TypeScript, transforms UI assets, and validates backend syntax before staging.

```bash
# 1. Clean install dependencies
npm run postinstall

# 2. Validate backend syntax (must report 219/219 files valid)
npm run check:backend

# 3. Compile frontend production bundle
npm run build:frontend

# 4. Execute unit test suites
npm run test:backend
npm run test:frontend
```

---

## 4. Cloud Foundry Manifest Configuration

The canonical descriptor is [`manifest.yml`](file:///c:/Users/samarth/firorix/manifest.yml):

```yaml
---
applications:
  - name: Fiorify-platform
    memory: 1024M
    disk_quota: 2048M
    buildpacks:
      - nodejs_buildpack
    command: node backend/src/server.js
    env:
      NODE_ENV: production
      FIORIFY_PERSISTENCE: hana
      FIORIFY_ENFORCE_AUTH: "true"
      SAP_DESTINATION_NAME: S21
      SAP_CLIENT: "200"
      SAP_TIMEOUT_MS: "15000"
    services:
      - Fiorify-destination
      - Fiorify-connectivity
      - Fiorify-xsuaa
      - Fiorify-hana
```

---

## 5. Deployment Execution (Blue-Green Recommended)

To ensure zero downtime during production updates, use Cloud Foundry Blue-Green deployment:

```bash
# 1. Deploy candidate droplet with zero-downtime routing
cf push Fiorify-platform -f manifest.yml --strategy rolling

# 2. Monitor deployment progress
cf logs Fiorify-platform --recent
```

---

## 6. Post-Deployment Verification & Smoke Tests

Once staged and running, execute the following smoke tests against the public route:

### 6.1 Liveness Probe
```bash
curl -I -X GET "https://<app-domain>/api/v1/health/liveness"
# Expected: HTTP/1.1 200 OK {"status":"UP"}
```

### 6.2 Readiness Probe
```bash
curl -X GET "https://<app-domain>/api/v1/health/readiness"
# Expected: HTTP/1.1 200 OK with database=UP, migrations=UP_TO_DATE, btpConnectivity=CONFIGURED
```

### 6.3 Landscape Health & Metadata
```bash
curl -X GET "https://<app-domain>/api/v1/health"
# Expected: HTTP/1.1 200 OK with S21 destination metadata and service inventory
```

### 6.4 Static SPA Delivery & Security Headers
```bash
curl -I -X GET "https://<app-domain>/"
# Expected: HTTP/1.1 200 OK, Content-Type: text/html
# Security Headers: X-Content-Type-Options: nosniff, X-Frame-Options: DENY
```
