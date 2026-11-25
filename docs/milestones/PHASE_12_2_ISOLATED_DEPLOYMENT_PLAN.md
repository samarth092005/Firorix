# FIORIFY — PHASE 12.2 ISOLATED STAGING DEPLOYMENT PLAN

**Document Identifier:** `FIORIFY-PHASE-12-2-ISOLATED-DEPLOYMENT-PLAN`  
**Application:** Fiorify — SAP Fiori Modernization Platform  
**Target Landscape:** SAP BTP Cloud Foundry (`eu30`) | Space: `dev`  
**Target ERP:** SAP S/4HANA 2023 Private Edition — System `S21`, Client `200`  
**Branch:** `test-01` | **HEAD SHA:** `4bca79e839f31d423b21039ea79bec8098f4be12`  
**Execution Date:** November 17, 2026  
**Auditor:** Principal SAP BTP Architect & Release Engineering Lead  
**Classification:** Pre-Deployment Execution Plan & Safeguard Specification  

---

## 1. OBJECTIVE & EXECUTION BOUNDARIES

The purpose of Phase 12.2 is to prepare an **isolated, zero-impact staging deployment plan** for Fiorify in a shared SAP BTP Cloud Foundry space (`dev`), ensuring 100% independence from all existing applications, services, and databases.

> [!CAUTION]
> **PREPARATION-ONLY PHASE BOUNDARY:**
> This milestone performs preparation, inspection, manifest composition, and isolation design only.
> **STRICTLY PROHIBITED:**
> - Zero `cf push`, `cf create-service`, `cf bind-service`, `cf map-route`, `cf delete`, `cf restart`, `cf restage`.
> - Zero database migrations against live HANA Cloud.
> - Zero Git commits, pushes, merges, or rebases.
> - Zero modification of the existing baseline `manifest.yml`.

---

## 2. EXISTING LANDSCAPE INVENTORY (SPACE: `dev`)

A live inspection of SAP BTP Cloud Foundry space `dev` (Org: `[REDACTED_ORG]`, Region: `eu30`) established the following baselines:

### 2.1 Applications Inventory (19 Applications Found)
All 19 existing applications are owned by other projects and must remain untouched:
1. `aamya` (started, web: 1/1)
2. `BTPLense-approuter` (stopped, web: 0/1)
3. `BTPLense-srv` (started, web: 1/1)
4. `BTPMonitorTool-db-deployer` (stopped, web: 0/1)
5. `BTPMonitorTool-srv` (stopped, web: 0/1)
6. `datasphere-docs-scanner` (started, web: 1/1)
7. `hanamorph-srv` (started, web: 1/1)
8. `insight-flow` (started, web: 1/1)
9. `podzone` (started, web: 1/1)
10. `podzone-srv` (started, web: 1/1)
11. `s4-relay` (started, web: 1/1)
12. `SACC_Travel_Application-db-deployer` (stopped, web: 0/1)
13. `SACC_Travel_Application-srv` (stopped, web: 0/1)
14. `SACC_Travel_Settlement_Application-db-deployer` (stopped, web: 0/1)
15. `SACC_Travel_Settlement_Application-srv` (started, web: 1/1)
16. `sonalika-probe` (started, web: 1/1)
17. `uc14-gl-anomaly-agent` (started, web: 1/1)
18. `vendor-reconcile` (started, web: 1/1)
19. `wzsess-sink` (started, web: 2/2)

*Status Check*: Neither `Fiorify` nor `fiorify-staging` exists in the space.

### 2.2 Routes Inventory (18 Routes Found)
All registered routes under domain `cfapps.eu30.hana.ondemand.com` were mapped.
*Status Check*: Host `fiorify-staging` is completely unregistered and available.

### 2.3 Service Instances Inventory (28 Instances Found)
All 28 existing service instances are mapped to existing workloads:
- **Existing HDI Containers**: `BTPMonitorTool-db`, `SACC_Travel_Application_hdi`, `SACC_Travel_Settlement_hdi`.
- **Existing Destinations**: `BTPLense-destination-service`, `BTPMonitorTool-destination-service`, `jouledashboard-destination-service`, `s4-destination`, `SAACTravelSettlementAprovalApp-destination-service`, `SACC_Travel_Application-dest`, `SACC_Travel_Approval-destination-service`, `SACC_Travel_Settlement_Dest`, `wzsess-destination`.
- **Existing Connectivity**: `s4-connectivity`.
- **Existing XSUAA**: 9 application-specific instances.

*Status Check*: Zero dedicated `Fiorify-*` service instances exist in the space.

---

## 3. PROPOSED FIORIFY STAGING APPLICATION & ROUTE

| Parameter | Proposed Value | Validation Status |
| :--- | :--- | :--- |
| **Application Name** | `fiorify-staging` | **AVAILABLE** (Zero name collision in space) |
| **Domain** | `cfapps.eu30.hana.ondemand.com` | Standard shared default domain |
| **Hostname** | `fiorify-staging` | **AVAILABLE** (Zero route collision in space) |
| **Full URL** | `https://fiorify-staging.cfapps.eu30.hana.ondemand.com` | Verified unique |
| **Memory Limit** | `1024M` | Sized for Node 20 LTS single-origin runtime |
| **Disk Quota** | `2048M` | Accommodates built static frontend and server assets |
| **Buildpack** | `nodejs_buildpack` | Standard Cloud Foundry Node.js buildpack |

---

## 4. PROPOSED DEDICATED SERVICES ARCHITECTURE

Fiorify will bind exclusively to 4 dedicated service instances created specifically for its staging container:

| Service Instance Name | Offering Name | Plan Name | Configuration Source | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`Fiorify-xsuaa`** | `xsuaa` | `application` | `xs-security.json` | JWT auth, role templates, and tenant-attribute enforcement |
| **`Fiorify-destination`** | `destination` | `lite` | Standard default | Resolving SAP S21 destination credentials |
| **`Fiorify-connectivity`** | `connectivity` | `lite` | Standard default | Cloud Connector reverse proxy token resolution |
| **`Fiorify-hana`** | `hana` | `hdi-shared` | Dedicated container | Isolated persistence for Fiorify schema & tables |

All 4 offerings and plans were confirmed available via live `cf marketplace` inspection.

---

## 5. DATABASE ISOLATION ARCHITECTURE

```
========================================================================================================
ISOLATED DATABASE SCHEMAS IN SAP HANA CLOUD (SPACE: dev)
========================================================================================================
[ SAP HANA Cloud Database Instance ]
      ├── [ Container Schema: BTPMonitorTool-db ]              <--- UNTOUCHED (BTPMonitorTool)
      ├── [ Container Schema: SACC_Travel_Application_hdi ]     <--- UNTOUCHED (SACC Travel)
      ├── [ Container Schema: SACC_Travel_Settlement_hdi ]      <--- UNTOUCHED (SACC Settlement)
      │
      └── [ Dedicated Container Schema: Fiorify-hana ]          <--- EXCLUSIVE TO FIORIFY STAGING
            ├── schema_migrations
            ├── tenants, sap_system_profiles, fiori_catalog_*
            ├── transaction_profiles, assessments, assessment_audit_events
            ├── security_audit_events, token_revocations, refresh_tokens
            ├── generation_handoffs, generation_projects, project_artifacts
            ├── transaction_discovery_executions, transaction_technical_objects
            ├── project_specification_versions, project_specification_approvals
            └── deployment_plans, deployment_approvals, deployment_executions
```

### Strict Isolation Rules
1. `fiorify-staging` is bound strictly to `Fiorify-hana`.
2. Database adapter fails closed if `VCAP_SERVICES['hana']` does not resolve to `Fiorify-hana`.
3. Migrations are executed solely via one-off CF tasks targeting `Fiorify-hana` schema.

---

## 6. DEDICATED MANIFEST CONFIGURATION PROPOSAL

The dedicated staging manifest is created as `manifest.fiorify-staging.yml` without modifying the root `manifest.yml`.

```yaml
---
applications:
  - name: fiorify-staging
    routes:
      - route: fiorify-staging.cfapps.eu30.hana.ondemand.com
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

## 7. DEPLOYMENT COMMAND EXECUTION PLAYBOOK (FOR FUTURE APPROVAL)

When authorized, the deployment must be executed using the dedicated staging manifest:

```bash
# ==============================================================================
# PHASE 1: PRE-PROVISION DEDICATED SERVICES (DO NOT RUN WITHOUT APPROVAL)
# ==============================================================================
cf create-service xsuaa application Fiorify-xsuaa -c xs-security.json
cf create-service destination lite Fiorify-destination
cf create-service connectivity lite Fiorify-connectivity
cf create-service hana hdi-shared Fiorify-hana

# Wait for all services to show 'create succeeded'
cf service Fiorify-hana

# ==============================================================================
# PHASE 2: DEPLOY STAGING APPLICATION (STOPPED STATE)
# ==============================================================================
cf push -f manifest.fiorify-staging.yml --no-start

# ==============================================================================
# PHASE 3: RUN HANA SCHEMA MIGRATIONS IN ISOLATED CONTAINER TASK
# ==============================================================================
cf run-task fiorify-staging --command "node backend/src/infrastructure/db/migrator.js up" --name fiorify-migrate

# Inspect migration task output
cf logs fiorify-staging --recent

# ==============================================================================
# PHASE 4: START APPLICATION & VERIFY HEALTH
# ==============================================================================
cf start fiorify-staging

# Liveness probe
curl -I https://fiorify-staging.cfapps.eu30.hana.ondemand.com/api/v1/health/liveness

# Readiness probe (verifies database connection & applied migrations)
curl -s https://fiorify-staging.cfapps.eu30.hana.ondemand.com/api/v1/health/readiness
```

---

## 8. FIORIFY-ONLY ROLLBACK & TEARDOWN STRATEGY

If staging needs to be stopped, rolled back, or decommissioned, the following commands affect **Fiorify resources exclusively** and have **zero impact** on other applications:

```bash
# 1. Stop staging application
cf stop fiorify-staging

# 2. Delete staging application and its bound route (keeps other apps intact)
cf delete fiorify-staging -r -f

# 3. Teardown dedicated Fiorify services (if full cleanup requested)
cf delete-service Fiorify-hana -f
cf delete-service Fiorify-xsuaa -f
cf delete-service Fiorify-destination -f
cf delete-service Fiorify-connectivity -f
```

---

## 9. PRE-DEPLOYMENT VALIDATION RESULTS

| Validation Check | Target Specification | Audit Outcome |
| :--- | :--- | :--- |
| **Manifest Syntax** | `manifest.fiorify-staging.yml` | **VALID** (Conforms to CF v3 application schema) |
| **Application Name** | `fiorify-staging` | **VERIFIED UNIQUE** (No matching app in space) |
| **Route Uniqueness** | `fiorify-staging.cfapps.eu30...` | **VERIFIED UNIQUE** (No matching route in space) |
| **Service Names** | Dedicated `Fiorify-*` namespace | **VERIFIED UNIQUE** (No collision with existing services) |
| **Runtime Version** | Node.js >= 20.0.0 LTS | **VERIFIED** (`package.json` engines specify `>=20.0.0`) |
| **Build Sequence** | Root `postinstall` compiles `frontend/dist` | **VERIFIED** (Single-origin build pipeline verified) |
| **Startup Command** | `node backend/src/server.js` | **VERIFIED** (Serves API, static dist, and SPA fallback) |
| **Health Probes** | `/health/liveness`, `/health/readiness` | **VERIFIED** (Implemented in `systemRoutes.js`) |
| **Database Isolation**| Exclusive HDI container `Fiorify-hana` | **VERIFIED** (Zero connection to existing databases) |
| **XSUAA Config** | Dedicated `xs-security.json` | **VERIFIED** (Dedicated scopes: Admin, Architect, Viewer) |

---

## 10. REMAINING BLOCKERS BEFORE PROVISIONING

| Blocker ID | Description | Resolution Path |
| :--- | :--- | :--- |
| **BLK-12-01** | User approval to initiate BTP service instance provisioning | Await explicit user authorization. |
| **BLK-12-02** | Destination `S21` in BTP Subaccount Destination Service | Requires BTP Admin to declare on-premise destination pointing to `S21:8000`. |
| **BLK-12-03** | Cloud Connector mapping for S21 | Requires Basis Admin to map `192.168.x.x:8000` to Virtual `S21:8000` with resource allowlists. |
