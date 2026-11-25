# FIORIFY — PHASE 13: SAP BTP CLOUD FOUNDRY STAGING DEPLOYMENT RUNBOOK & RECORD

**Application:** Fiorify — SAP Fiori Modernization Platform  
**Target Landscape:** SAP BTP Cloud Foundry (`eu30` / `dev`)  
**Application Name:** `fiorify-staging`  
**Route:** [fiorify-staging.cfapps.eu30.hana.ondemand.com](https://fiorify-staging.cfapps.eu30.hana.ondemand.com)  
**Database:** Neon Serverless PostgreSQL (`silent-glade-07418707`, PostgreSQL 18.7, AWS Frankfurt `eu-central-1`)  
**Branch:** `test-01`  
**Execution Phase:** Phase 13 Staging Deployment  
**Auditor / Architect:** Principal SAP BTP Architect & DevSecOps Engineer  
**Status:** DEPLOYED & HEALTHY (`1/1 RUNNING`)  

---

## 1. Cloud Foundry Target Environment Context

- **API Endpoint:** `https://api.cf.eu30.hana.ondemand.com`
- **Organization:** `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8`
- **Space:** `dev`
- **Stack:** `cflinuxfs4` (Ubuntu 22.04 LTS)
- **Runtime Buildpack:** `nodejs_buildpack` v1.9.7 (Node.js 22.23.4 LTS)
- **Deployment Manifest:** `manifest.fiorify-staging.yml`
- **Container Instance:** 1/1 Running
- **Memory Consumption:** ~37.6 MB allocated of 1536 MB quota
- **Disk Consumption:** ~319.4 MB of 2048 MB quota

---

## 2. Resource Allocations & Isolation Boundary

To preserve zero impact on existing business applications (`BTPLense-*`, `BTPMonitorTool-*`, `SACC_Travel_*`, etc.):
- **Memory Allocation:** 1536 MB (within available space quota headroom)
- **Disk Quota:** 2048 MB
- **Route Isolation:** Dedicated route `fiorify-staging.cfapps.eu30.hana.ondemand.com` with zero collision on existing hosts.
- **Service Isolation:** 100% dedicated service bindings; zero shared state with adjacent applications.

### Bound Services

| Service Name | Service Type | Plan | Scope |
| :--- | :--- | :--- | :--- |
| `Fiorify-destination` | `destination` | `lite` | SAP BTP Destination Service (S21 lookup) |
| `Fiorify-connectivity` | `connectivity` | `lite` | SAP Cloud Connector tunnel connectivity |
| `Fiorify-xsuaa` | `xsuaa` | `application` | SAP BTP Identity & Access Management (JWT validation) |
| `Fiorify-postgres-ups` | `user-provided` | `custom` | Dedicated Neon PostgreSQL connection string (`fiorify_app` role) |

---

## 3. Staging Manifest Specification (`manifest.fiorify-staging.yml`)

```yaml
---
applications:
  - name: fiorify-staging
    routes:
      - route: fiorify-staging.cfapps.eu30.hana.ondemand.com
    memory: 1536M
    disk_quota: 2048M
    buildpacks:
      - nodejs_buildpack
    command: node backend/src/server.js
    health-check-type: http
    health-check-http-endpoint: /api/v1/health/liveness
    health-check-timeout: 60
    health-check-invocation-timeout: 10
    env:
      NODE_ENV: production
      FIORIFY_PERSISTENCE: postgres
      FIORIFY_ALLOW_POSTGRES_IN_PRODUCTION: "true"
      FIORIFY_ENFORCE_AUTH: "true"
      SAP_DESTINATION_NAME: S21
      SAP_CLIENT: "200"
      SAP_TIMEOUT_MS: "15000"
    services:
      - Fiorify-destination
      - Fiorify-connectivity
      - Fiorify-xsuaa
      - Fiorify-postgres-ups
```

---

## 4. Cloud Foundry Buildpack Optimization

1. **Node.js Engine Alignment:** Updated root `package.json` engines to `"node": "22.x"` matching SAP BTP `nodejs_buildpack` v1.9.7 runtime inventory (`22.23.4`).
2. **Flattened Dependency Graph:** Lifted production runtime dependencies (`@sap-cloud-sdk/*`, `@sap-ux/fiori-mcp-server`, `pg`, `xlsx`) into root `package.json` and removed nested `postinstall: npm --prefix backend install` subprocesses. This eliminated buildpack compile OOM (exit code 137).
3. **Automated VCAP_SERVICES Resolution:** Hardened `loadLocalEnv()` and `databaseAdapterFactory.js` to automatically extract `DATABASE_URL` from Cloud Foundry user-provided services (`Fiorify-postgres-ups`) without requiring hardcoded URLs.

---

## 5. Live Cloud Foundry Process Evidence

```
Showing health and status for app fiorify-staging in org Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8 / space dev as varad.k@abhiyantatech.com...

name:              fiorify-staging
requested state:   started
routes:            fiorify-staging.cfapps.eu30.hana.ondemand.com
last uploaded:     Tue 17 Nov 23:11:26 IST 2026
stack:             cflinuxfs4
buildpacks:        
	name               version   detect output   buildpack name
	nodejs_buildpack   1.9.7     nodejs          nodejs

type:           web
sidecars:       
instances:      1/1
memory usage:   1536M
     state     since                  cpu    memory          disk           logging        cpu entitlement   details
#0   running   2026-11-17T17:41:44Z   1.2%   37.6M of 1.5G   319.4M of 2G   0B/s of 0B/s   3.2%              
```
