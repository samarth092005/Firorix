# Fiorify — Environment Configuration Inventory

## 1. Overview

This document catalogs every environment variable consumed by the Fiorify platform across development, test, staging, and production environments.

---

## 2. Environment Variable Inventory

| Variable Name | Required in Prod? | Default (Dev) | Type | Description |
|---|---|---|---|---|
| `PORT` | Optional | `4000` | Integer | HTTP port for backend API server |
| `NODE_ENV` | **YES** | `development` | String | `development`, `test`, or `production` |
| `FIORIFY_PERSISTENCE` | **YES** | `postgres` | String | Persistence engine (`postgres` or `memory`) |
| `DATABASE_URL` | Conditional | *Derived* | String | PostgreSQL URI (`postgres://user:pass@host:5432/db`) |
| `PGHOST` | Conditional | `127.0.0.1` | String | PostgreSQL host if `DATABASE_URL` is omitted |
| `PGPORT` | Conditional | `5432` / `54334` | Integer | PostgreSQL port (54334 for embedded PG) |
| `PGUSER` | Conditional | `postgres` | String | PostgreSQL username |
| `PGPASSWORD` | Conditional | `password` | String | PostgreSQL password |
| `PGDATABASE` | Conditional | `fiorify` | String | PostgreSQL database name |
| `FIORIFY_ALLOW_EMBEDDED_PG` | **FORBIDDEN IN PROD** | `true` | Boolean | Permits auto-starting embedded PG in dev/tests |
| `FIORIFY_SIGNING_SECRET` | **YES (CRITICAL)** | *Dev fallback* | String | Primary HMAC-SHA256 signing secret (min 32 chars) |
| `FIORIFY_APPROVAL_SECRET` | Optional | *None* | String | Alternate alias for signing secret |
| `FIORIFY_SIGNING_KEY_VERSION` | Optional | `v1` | String | Active key version tag (e.g. `v1`, `v2`) |
| `FIORIFY_SIGNING_KEYS_JSON` | Optional | *None* | JSON String | Rotated historical key map: `{"v1":"...","v2":"..."}` |
| `FIORIFY_ENFORCE_AUTH` | **YES** | `false` | Boolean | Enforces JWT token verification unconditionally |
| `SAP_DESTINATION_NAME` | Conditional | `S21` | String | BTP destination name for SAP S/4HANA connectivity |
| `SAP_CLIENT` | Optional | `200` | String | Target SAP client number |
| `SAP_TIMEOUT_MS` | Optional | `15000` | Integer | Outbound SAP HTTP request timeout in milliseconds |
| `ALLOWED_SAP_HOSTS` | Optional | *S21 hosts* | Comma String | Allowlist regex patterns for outbound SAP HTTP requests |
| `FIORIFY_ADMIN_DEV_SECRET` | **FORBIDDEN IN PROD** | `fiorify-dev-secret-local-admin` | String | Secret required for development user impersonation |

---

## 3. Production Hardening Rules

1. **`FIORIFY_ALLOW_EMBEDDED_PG`**:
   Must NEVER be enabled in production. Production must connect to an enterprise-grade managed PostgreSQL instance.
2. **`FIORIFY_SIGNING_SECRET`**:
   Must be at least 32 cryptographically random characters (e.g. `openssl rand -hex 32`). The application will throw `MISSING_SIGNING_SECRET` and exit if missing in `production`.
3. **`FIORIFY_ADMIN_DEV_SECRET`**:
   Ignored and disallowed when `NODE_ENV=production`.
