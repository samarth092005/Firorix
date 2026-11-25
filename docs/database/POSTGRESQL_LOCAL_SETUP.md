# Fiorify PostgreSQL Local Setup & Development Strategy (DB-003)
**Document Version:** 1.0.0  
**Target Environment:** Local Workstations, Developer Sandboxes & CI Workflows

---

## 1. Overview

For rapid local development, unit testing, and continuous integration pipelines where an active SAP BTP account is unavailable, Fiorify provides first-class support for **PostgreSQL 15+**.

---

## 2. Configuration Options

### Option A: Local Docker Container (Recommended)
```bash
# Start local PostgreSQL container with persistent volume
docker run --name fiorify-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=fiorify \
  -p 5432:5432 \
  -d postgres:15-alpine
```

### Option B: Native Host Installation
Install PostgreSQL 15 or 16 on your local machine and create the application databases:
```sql
CREATE DATABASE fiorify;
CREATE DATABASE fiorify_test;
```

### Option C: Embedded-Postgres Fallback (Automated)
If no local PostgreSQL instance is running on port 5432, Fiorify's `DatabasePool` automatically initialises a localized embedded PostgreSQL instance on port `54334` stored under `backend/data/db/` when `FIORIFY_ALLOW_EMBEDDED_PG=true` or in test mode.

---

## 3. Environment Variables Configuration (`backend/.env`)

```ini
# Persistence engine mode
FIORIFY_PERSISTENCE=postgres

# PostgreSQL Connection String (takes precedence if defined)
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/fiorify

# Discrete parameters (fallback if DATABASE_URL is not set)
PGHOST=127.0.0.1
PGPORT=5432
PGUSER=postgres
PGPASSWORD=password
PGDATABASE=fiorify

# Embedded fallback toggle
FIORIFY_ALLOW_EMBEDDED_PG=true
```

---

## 4. Running Migrations & Verification

```bash
# 1. Check syntax
node backend/scripts/check-syntax.js

# 2. Run schema migrations
node -e "import('./src/infrastructure/db/migrator/dialectMigrationRunner.js').then(m => new m.DialectMigrationRunner({ dialect: 'postgres' }).migrateUp()).then(console.log)"

# 3. Verify health & readiness probe
curl http://localhost:4004/api/v1/health/readiness
```
