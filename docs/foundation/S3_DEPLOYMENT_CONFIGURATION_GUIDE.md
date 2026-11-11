# FioriX — Stage S3: BTP Cloud Foundry Deployment Configuration Guide

## 1. Cloud Foundry Deployment Architecture
In production deployment on SAP BTP Cloud Foundry, FioriX runs as a native Node.js application bound to SAP BTP backing services.

### Bound Services:
1. **`xsuaa`**: Application security and token validation.
2. **`destination`**: Resolution of S/4HANA destinations.
3. **`connectivity`**: Secure mTLS proxy connection to on-premise Cloud Connector.
4. **`postgresql-db`**: Persistent database store.

---

## 2. Cloud Foundry Manifest (`manifest.yml`)

```yaml
---
applications:
  - name: fiorix-platform
    memory: 1024M
    disk_quota: 2048M
    buildpacks:
      - nodejs_buildpack
    command: node backend/src/server.js
    env:
      NODE_ENV: production
      FIORIX_PERSISTENCE: postgres
      FIORIX_ENFORCE_AUTH: true
      SAP_DESTINATION_NAME: S21
      SAP_CLIENT: "200"
      SAP_TIMEOUT_MS: "15000"
    services:
      - fiorix-xsuaa
      - fiorix-destination
      - fiorix-connectivity
      - fiorix-postgres
```

---

## 3. Service Creation Commands

```bash
# 1. Create XSUAA Service Instance
cf create-service xsuaa application fiorix-xsuaa -c xs-security.json

# 2. Create Destination Service Instance (Lite plan)
cf create-service destination lite fiorix-destination

# 3. Create Connectivity Service Instance (Lite plan)
cf create-service connectivity lite fiorix-connectivity

# 4. Create PostgreSQL Service Instance (Hyperscaler plan)
cf create-service postgresql-db standard fiorix-postgres
```

---

## 4. Verification Steps Post-Deployment
Once deployed via `cf push`:
1. **Health Check**:
   `curl https://<fiorix-route>/api/v1/health`
   Verify destination and connectivity service bindings report `present: true`.
2. **Diagnostic Probe**:
   `curl -H "Authorization: Bearer <ADMIN_JWT>" https://<fiorix-route>/api/v1/systems/S21-200/diagnostics`
   Confirm `destinationResolution: PASSED` and `networkReachability: PASSED`.
