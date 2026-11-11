# FioriX — Stage S2: Security Architecture

## 1. Overview & Security Baseline
FioriX is designed to interface with enterprise SAP S/4HANA on-premise systems (specifically SAP S/4HANA 2023 on System S21, Client 200) via SAP Business Technology Platform (SAP BTP). Stage S2 establishes production-grade authentication, authorization, multi-tenant isolation, cryptographic audit logging, and credential protection.

### Guiding Principles:
1. **Single Authenticated Administrator Model**: The initial release operates under a single authenticated FioriX Administrator role, strictly gating all administrative, configuration, and data-modifying operations.
2. **Read-Only SAP Access**: FioriX never issues mutating RFCs, writes, transports, or object activations to the backend SAP S/4HANA instance.
3. **Defense-in-Depth Authentication**: Decoupled authentication supporting enterprise SAP BTP XSUAA (OAuth 2.0 / JWT) with fallback refusal in production environments when unbound.
4. **Tenant Isolation**: Every assessment, project, artifact, and connected SAP system profile is strictly isolated to its owning tenant. Cross-tenant access is unconditionally blocked with HTTP 403 Forbidden.
5. **Tamper-Evident Security Auditing**: All security-relevant events, access violations, permission denials, and state transitions are cryptographically chained using SHA-256 integrity hashing back to the genesis record.

---

## 2. Authentication Architecture

```mermaid
flowchart TD
    Client["Client / Browser / CLI"] -->|HTTP Request with Bearer Token| Gateway["FioriX Native HTTP Runtime (server.js)"]
    Gateway --> AuthFilter["Authentication Filter (resolveUser)"]
    
    AuthFilter --> CheckType{"Token Type"}
    CheckType -->|XSUAA / BTP JWT| XSUAA["XsuaaAuthenticationProvider"]
    CheckType -->|RFC 7519 HMAC / RSA| NativeJWT["JwtVerifier (HS256 / RS256)"]
    CheckType -->|Admin Secret Header| AdminSecret["X-FioriX-Admin-Secret"]
    CheckType -->|Dev Token (Non-Prod Only)| DevAuth["Local Dev Bypass (Rejected in Prod)"]
    
    XSUAA --> VerifySignature{"Verify Signature, Expiry, Iss, Aud"}
    NativeJWT --> VerifySignature
    
    VerifySignature -->|Valid| AttachContext["Attach req.user (id, role, tenantId, scopes)"]
    VerifySignature -->|Invalid / Expired| Reject401["HTTP 401 Unauthorized + Log Security Audit"]
    
    AttachContext --> Authorize["Role & Permission Enforcement"]
    Authorize -->|Granted| Execution["Route Handler & Domain Services"]
    Authorize -->|Denied| Reject403["HTTP 403 Forbidden + Log Security Audit"]
```

---

## 3. SAP BTP XSUAA Integration Contract
In deployed SAP BTP Cloud Foundry environments, user identity is provisioned via the SAP BTP Authorization and Trust Management Service (XSUAA).

- **Binding Resolution**: The provider inspects the `VCAP_SERVICES` environment variable for service instances of type `xsuaa`.
- **Unbound State Handling**: If unbound (such as during local development without cloud proxying), the provider enters a deterministic `NOT_CONFIGURED` state. It never fabricates tokens or crashes.
- **Production Assertion**: When running with `NODE_ENV=production`, `XsuaaAuthenticationProvider.assertProductionReadiness()` refuses startup if no valid enterprise authentication binding is detected. Local developer bypasses are strictly rejected.

---

## 4. Multi-Tenant Isolation
Customer-owned data in FioriX is partitioned using a strict tenant code (`tenant_id`).

1. **Entity Ownership**:
   - `tenants`: Root organizational tenant entity.
   - `assessments`: Bound to `tenant_id`.
   - `generation_projects`: Bound to `tenant_id`.
   - `generation_artifacts`: Scoped to owning project and tenant.
   - `sap_system_profiles`: Tenant-specific system configurations.
   - `security_audit_events`: Tenant-specific cryptographic event trail.

2. **Cross-Tenant Rejection Policy**:
   If an authenticated user from `TENANT-A` attempts to read, mutate, or download an assessment, project, artifact, or system belonging to `TENANT-B`, the request is immediately aborted with HTTP 403 Forbidden (`TenantAccessDenied`), and a tamper-evident audit log event is recorded with action `TENANT_ACCESS_VIOLATION`.

3. **Connection Pool Isolation**:
   To prevent session state leaks between tenants in connection pools, `DatabasePool.withTenantClient(tenantId, fn)` wraps database interactions in an isolated transaction setting `SET LOCAL app.current_tenant = $1` and issues `DISCARD ALL` upon client release.

---

## 5. Tamper-Evident Security Audit Trail
Security audit events are written to the PostgreSQL table `security_audit_events`.
Each record includes:
- `event_id`: Unique cryptographically generated event identifier.
- `timestamp`: ISO-8601 UTC timestamp.
- `actor`: User ID or caller identifier.
- `tenant_id`: Tenant context.
- `action`: Specific security action enum.
- `resource`: Target URI or entity.
- `outcome`: `SUCCESS`, `DENIED`, or `FAILED`.
- `details`: JSON payload with all credentials, tokens, and secrets redacted.
- `previous_hash`: SHA-256 hash of the immediately preceding event for that tenant (or `GENESIS`).
- `integrity_hash`: SHA-256 hash computed over `previous_hash|timestamp|actor|tenant_id|action|resource|outcome|correlation_id`.

The chain is verified on-demand via `SecurityAuditLogger.verifyChain(tenantId)` to detect tampering, deletion, or record injection.
