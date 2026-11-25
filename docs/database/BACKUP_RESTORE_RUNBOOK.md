# Fiorify Database Backup, Restore & Disaster Recovery Runbook (DB-009)
**Document Version:** 1.0.0  
**Target Environments:** Local PostgreSQL & SAP HANA Cloud (BTP)  
**Recovery Objectives:** RPO < 15 Minutes | RTO < 1 Hour

---

## 1. Disaster Recovery Objectives (RPO / RTO)

- **Recovery Point Objective (RPO):** Maximum acceptable data loss window is **15 minutes**.
- **Recovery Time Objective (RTO):** Maximum acceptable duration to restore service availability is **60 minutes**.

---

## 2. SAP HANA Cloud Production Backup & Restore Procedures

> [!NOTE]
> **Operational Classification: Target Infrastructure Operating Procedure**
> The procedures below define the disaster recovery and PITR protocol implemented on SAP BTP Cloud Foundry for productive instances.
> Prior to claiming production verification, a staged recovery drill must be formally executed and signed off against the designated BTP HANA Cloud instance (`fiorify-prod-hana-db`).

### 2.1 Automated Cloud Backups
SAP HANA Cloud instances on SAP BTP execute:
- **Full Data Backup:** Daily automated snapshot retained for 14 days.
- **Log Backups:** Continuous log segment backup every 15 minutes to object storage (supporting RPO < 15m).

### 2.2 Point-in-Time Recovery (PITR) Execution
To restore an SAP HANA Cloud instance to a specific timestamp in SAP BTP Cockpit:
1. Navigate to **SAP BTP Cockpit** → **Subaccount** → **SAP HANA Cloud**.
2. Select the target instance `fiorify-hana-db`.
3. Choose **Actions** → **Restore**.
4. Select **Point-in-Time Recovery** and enter the target timestamp (UTC).
5. Confirm restore operation.
6. Verify service health via Fiorify `/api/v1/health/readiness`.
7. Execute post-restore audit chain verification: `GET /api/v1/assessments/:id/verify-audit`.

---

## 3. Local Development PostgreSQL Backup & Restore

### 3.1 Pre-Migration Backup Script
Fiorify provides an automated pre-migration backup utility:
```bash
node backend/src/infrastructure/db/scripts/createPreMigrationBackup.js
```

### 3.2 Manual Backup via `pg_dump`
```bash
# Create compressed logical backup
pg_dump -h 127.0.0.1 -p 5432 -U postgres -F c -b -v -f ./fiorify_backup_$(date +%Y%m%d_%H%M%S).dump fiorify
```

### 3.3 Restore via `pg_restore`
```bash
# Drop and recreate clean target database
dropdb -h 127.0.0.1 -p 5432 -U postgres fiorify
createdb -h 127.0.0.1 -p 5432 -U postgres fiorify

# Restore from dump
pg_restore -h 127.0.0.1 -p 5432 -U postgres -d fiorify -v ./fiorify_backup_<timestamp>.dump
```

---

## 4. Verification Checklists Post-Recovery

1. Run readiness probe: `curl -s http://localhost:4004/api/v1/health/readiness | jq .`
2. Verify migration consistency: `isFullyMigrated === true`
3. Audit trail verification: `GET /api/v1/assessments/:id/verify-audit` returns `valid: true`
