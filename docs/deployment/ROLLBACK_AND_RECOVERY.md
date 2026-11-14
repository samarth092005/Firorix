# Fiorify — Rollback & Disaster Recovery Specification

## 1. Scope & Objective

This procedure establishes the operational steps for rolling back application binaries, reverting database migrations, restoring state, and recovering from catastrophic failures in Cloud Foundry and PostgreSQL environments.

---

## 2. Application Rollback (Cloud Foundry)

Cloud Foundry supports zero-downtime rolling updates. If a deployment defect or operational regression occurs:

```bash
# 1. Inspect recent deployment history
cf app Fiorify-platform

# 2. Revert to previous application droplet
cf rollback Fiorify-platform

# 3. Alternatively, re-push previous known good commit tag
git checkout v1.0.0-rc1
cf push Fiorify-platform --strategy rolling
```

---

## 3. Database Migration Rollback Procedures

Every schema migration in `backend/src/infrastructure/db/migrations/` has a verified, idempotent `.down.sql` companion:

```mermaid
flowchart LR
    M007["007: Deployment Orchestration"] -->|007_down| M006["006: Specification Lifecycle"]
    M006 -->|006_down| M005["005: Modernization Intelligence"]
    M005 -->|005_down| M004["004: SAP System Registry"]
    M004 -->|004_down| M003["003: Handoffs & Approvals"]
    M003 -->|003_down| M002["002: Security Audit"]
    M002 -->|002_down| M001["001: Initial Schema"]
```

### Rollback Commands
To revert migrations selectively:

```bash
# Revert Migration 007 (Deployment Orchestration)
psql -d fiorify -f backend/src/infrastructure/db/migrations/007_deployment_orchestration.down.sql

# Revert Migration 006 (Specification Lifecycle)
psql -d fiorify -f backend/src/infrastructure/db/migrations/006_specification_lifecycle.down.sql

# Revert Migration 005 (Modernization Intelligence)
psql -d fiorify -f backend/src/infrastructure/db/migrations/005_modernization_intelligence.down.sql
```

---

## 4. Key Compromise & Rotation Emergency Protocol

If `FIORIFY_SIGNING_SECRET` is suspected of compromise:

1. **Provision New Secret (`v2`)**:
   Generate a new 64-character hex secret: `NEW_SECRET=$(openssl rand -hex 32)`.
2. **Configure Multi-Key Ring**:
   Set `FIORIFY_SIGNING_KEYS_JSON={"v1":"<old_secret>","v2":"<new_secret>"}`.
3. **Switch Active Signing Key**:
   Set `FIORIFY_SIGNING_KEY_VERSION=v2`.
4. **Deploy Environment Update**:
   Restart the platform. All new approvals will use `sig:v2:<digest>`.
5. **Historical Verification**:
   Historical records signed with `v1` will continue to verify as valid.
6. **Deprecate Old Key**:
   After all in-flight deployments are completed, remove `v1` from the key ring to invalidate compromised credentials permanently.

---

## 5. Recovery Time Objective (RTO) & Recovery Point Objective (RPO)

- **RTO (Application Service)**: $< 10$ minutes via Cloud Foundry rolling deployment.
- **RTO (Database Restoration)**: $< 30$ minutes via BTP managed PostgreSQL point-in-time recovery (PITR).
- **RPO (Data Loss Target)**: $< 5$ minutes based on continuous WAL archiving in production.
