# SAP BTP Cloud Foundry Emergency Rollback Runbook

**Application:** Fiorify — SAP Fiori Modernization & Generation Platform  
**Target Landscape:** SAP BTP Cloud Foundry  
**Severity:** P1 / Critical Release Issue  

---

## 1. Rollback Trigger Criteria

Initiate immediate rollback if any of the following conditions occur post-deployment:
1. `/api/v1/health/liveness` or `/api/v1/health/readiness` fails (HTTP 503 or timeout > 15s).
2. XSUAA authentication fails closed across all users (HTTP 401/403 due to audience mismatch).
3. SAP HANA Cloud connection fails or schema migration errors prevent database writes.
4. Mutation of upstream SAP S21 is detected (violation of read-only guardrail).

---

## 2. Fast Droplet Rollback (Zero-Downtime)

Cloud Foundry preserves previous successful droplet releases.

### 2.1 Revert to Previous Droplet

```bash
# 1. Inspect recent deployment history and revisions
cf app Fiorify-platform --revisions

# 2. Roll back to the preceding known-stable revision
cf rollback Fiorify-platform --version <PREVIOUS_VERSION>

# 3. Verify health status
cf app Fiorify-platform
curl -X GET "https://<app-domain>/api/v1/health/readiness"
```

### 2.2 Blue-Green Re-Route (Manual Strategy)

If blue-green routing was deployed manually with temporary routes:

```bash
# Map route back to stable blue instance
cf map-route Fiorify-platform-blue <domain> --hostname fiorify

# Unmap route from failing green candidate
cf unmap-route Fiorify-platform-green <domain> --hostname fiorify

# Stop failed green instance
cf stop Fiorify-platform-green
```

---

## 3. Database Persistence Rollback (SAP HANA Cloud)

Fiorify uses deterministic, versioned migration scripts located in `backend/src/infrastructure/db/migrations/hana/`.

### 3.1 Migration Status Inspection

```bash
cf ssh Fiorify-platform -c "node -e 'const { DialectMigrationRunner } = require(\"./backend/src/infrastructure/db/migrator/dialectMigrationRunner.js\"); (async () => { const r = new DialectMigrationRunner(); console.log(await r.getStatus()); })()'"
```

### 3.2 Rollback Procedure

1. Database migrations in Fiorify are non-destructive (additive columns, additive tables, preserved constraints).
2. If an incompatible schema migration occurred, execute the corresponding `_rollback.sql` script via SAP HANA Database Explorer in SAP BTP Cockpit.
3. Restart application instances:
```bash
cf restart Fiorify-platform
```

---

## 4. BTP Connectivity & Cloud Connector Diagnostics

If S21 upstream queries fail:

1. **Verify Cloud Connector Tunnel:**
   Check Subaccount -> Cloud Connectors -> S21 system mapping is `Reachable`.
2. **Verify BTP Destination Configuration:**
   Ensure Destination `S21` contains:
   - `URL = http://kbl_fiori:8000`
   - `ProxyType = OnPremise`
   - `Authentication = BasicAuthentication`
   - `User = int_samarth`
3. **Verify Read-Only Enforcement:**
   Ensure no mutating calls (`POST`, `PUT`, `DELETE`) are attempted.
