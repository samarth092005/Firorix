# Fiorify — Stage S2: Secrets & Configuration Management Guide

## 1. Principles of Secret Handling
Under the Non-Negotiable Protection Rules:
1. **Never Hardcode Secrets**: No SAP passwords, admin secrets, client secrets, or private keys in source code.
2. **Environment & Service Bindings Only**: Credentials must be supplied via environment variables or SAP BTP `VCAP_SERVICES`.
3. **Automatic Redaction in Logs**: Every log entry and HTTP error response passes through `AuthService.redactSecrets()`.
4. **Git Isolation**: Environment files (`.env`, `backend/.env`) are strictly ignored in `.gitignore`.

---

## 2. Configuration Variables Reference

| Variable | Scope | Purpose | Example / Notes |
|---|---|---|---|
| `NODE_ENV` | Global | Runtime environment mode | `development`, `test`, `production` |
| `PORT` | Backend | HTTP listener port | Default `4004` |
| `Fiorify_ADMIN_SECRET` | Backend Auth | Shared administrator secret for initial CLI access | Cryptographic random hex string |
| `Fiorify_JWT_SECRET` | Backend Auth | Symmetric HMAC signing key for native tokens | Minimum 256 bits |
| `Fiorify_ENFORCE_AUTH` | Security | Force strict authentication on all non-public endpoints | `true` in production |
| `DATABASE_URL` | Persistence | PostgreSQL connection string | `postgres://user:pass@host:5432/Fiorify` |
| `Fiorify_PERSISTENCE` | Persistence | Persistence engine selector | `postgres` |
| `SAP_DESTINATION_NAME` | Connectivity | BTP Destination identifier for SAP backend | `S21` |
| `SAP_CLIENT` | Connectivity | Target SAP client | `200` |
| `SAP_TIMEOUT_MS` | Connectivity | HTTP request timeout | `15000` |

---

## 3. Secret Redaction Policy
The redaction filter scans all JSON bodies, query logs, and exception messages for sensitive keys:
- `password`, `secret`, `authorization`, `x-Fiorify-admin-secret`
- `clientsecret`, `token`, `btp_password`, `sap_password`

Any matching key is automatically converted to `[REDACTED]`. Nested objects and arrays are traversed recursively.
