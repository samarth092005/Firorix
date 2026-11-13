# Fiorify — Stage S3: Security & Failure Handling Report

## 1. Safety Invariants & Guardrails
The Stage S3 SAP Connectivity Foundation implements strict safeguards to protect enterprise systems, credentials, and data integrity:

### Invariant 1: Zero Write Exposure
Under no circumstance will Fiorify execute a mutating write (`POST`, `PUT`, `DELETE`, `PATCH`) against an on-premise SAP S/4HANA instance.
- **Enforcement**: `SapHttpClient.assertReadOnly(method)` throws `WRITE_OPERATION_BLOCKED` before network dispatch.
- **Test Evidence**: Verified by unit test in `backend/test/s3SapConnectivity.test.js`.

### Invariant 2: Complete Credential Masking
- Outgoing basic authentication headers, bearer tokens, and cookies are automatically scrubbed from logs and client responses.
- `AuthService.redactSecrets()` and `btpDestinationAdapter.sanitizeHeaders()` ensure no credential leakage in audit trails or HTTP response bodies.

### Invariant 3: Failure Disambiguation
- An infrastructure or connectivity error is never treated as a business or discovery finding.
- If an SAP system fails to respond, returns HTTP 504, or blocks with HTTP 403, Fiorify records the specific failure category (`NETWORK_UNAVAILABLE`, `AUTHORIZATION_BLOCKED`, `CLOUD_CONNECTOR_UNAVAILABLE`) and refuses to recommend `BUILD`.

---

## 2. Failure Handling Taxonomy

| Failure Mode | HTTP Status Code | Fiorify Internal Status | Downstream Impact | Recommended Basis Action |
|---|:---:|---|---|---|
| Cloud Connector Disconnected | 502 / 503 | `CLOUD_CONNECTOR_UNAVAILABLE` | Discovery halted with diagnostic warning; transaction not marked missing. | Check Cloud Connector process and subaccount tunnel status. |
| Target Host Timeout | 504 | `TIMEOUT` | Request retried twice with backoff; then returns diagnostic error. | Check SAP ICM availability and network route to host. |
| Invalid Credentials | 401 | `AUTHENTICATION_FAILED` | Security audit event logged; operation blocked. | Verify technical user password in BTP Destination. |
| Inadequate Authorizations | 403 | `AUTHORIZATION_BLOCKED` | Discovery halted with list of missing SAP authorization objects. | Grant display authorizations (`S_ADT_RES`, `S_DEVELOP`, `S_SERVICE`). |
| Inactive Gateway Service | 404 | `SERVICE_UNAVAILABLE` | Catalog discovery falls back to cached master snapshot if verified. | Activate `/IWFND/CATALOGSERVICE;v=2` in `SICF` / `/IWFND/MAINT_SERVICE`. |
