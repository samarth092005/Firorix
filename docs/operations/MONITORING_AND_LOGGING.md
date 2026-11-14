# Fiorify — Monitoring, Telemetry & Logging Specification

## 1. Observability Architecture

Fiorify provides observability across four core domains:
1. **Application Health & Readiness**: `/api/v1/health` surfaces backend, database, and SAP connectivity status.
2. **Security Audit Ledger**: Immutable, structured event logging in `security_audit_events`.
3. **Structured Application Logs**: Formatted JSON logs emitted to stdout/stderr for log aggregators (Kibana, CloudWatch, Dynatrace).
4. **Outbound SAP Telemetry**: Diagnostic latency, response codes, and error taxonomies for S21.

---

## 2. Health Check Telemetry (`/api/v1/health`)

The health endpoint provides comprehensive readiness telemetry:

```json
{
  "status": "UP",
  "version": "1.0.0",
  "uptimeSeconds": 1420,
  "timestamp": "2026-11-14T15:10:00.000Z",
  "persistence": {
    "engine": "postgres",
    "status": "CONNECTED",
    "pool": {
      "total": 5,
      "idle": 4,
      "waiting": 0
    }
  },
  "sapLandscape": {
    "systemId": "S21",
    "client": "200",
    "status": "REACHABLE",
    "mode": "READ_ONLY",
    "gatewayPingMs": 42
  }
}
```

---

## 3. Security Audit Logging Format

All security-sensitive operations (governance approvals, administrative overrides, deployment execution requests) are captured by `securityAuditLogger.js` in `security_audit_events`:

| Field | Description | Example |
|---|---|---|
| `event_id` | Sequence identifier | `1042` |
| `tenant_id` | Tenant context | `DEFAULT-TENANT-S21` |
| `actor` | User ID or Service Principal | `samarth.lead@enterprise.com` |
| `action` | Action taxonomy | `ADMIN_OVERRIDE_APPROVED` |
| `resource` | Target object identifier | `ASSESS-VA01-20261114` |
| `outcome` | Execution result | `SUCCESS` |
| `details` | Structured JSON payload | `{"signatureHash":"sig:v1:...","expiresAt":"..."}` |
| `timestamp` | ISO 8601 UTC timestamp | `2026-11-14T15:10:00.000Z` |

---

## 4. Key Performance Indicators & Alert Thresholds

| Metric | Target | Warning Threshold | Critical Threshold |
|---|---|---|---|
| **API Response Time (P95)** | $< 150\text{ ms}$ | $> 500\text{ ms}$ | $> 1,500\text{ ms}$ |
| **SAP Gateway Ping Latency** | $< 100\text{ ms}$ | $> 300\text{ ms}$ | $> 1,000\text{ ms}$ |
| **Database Pool Utilization** | $< 50\%$ | $> 75\%$ | $> 90\%$ |
| **Failed Logins (per min)** | $0$ | $> 5$ | $> 20$ |
| **Write Boundary Violations** | $0$ | $\ge 1$ (Immediate Alert) | $\ge 1$ |
