# FioriX — Stage S2: Authentication Implementation

## 1. Authentication Layer Design
The FioriX authentication engine is implemented using native Node.js cryptographic primitives (`node:crypto`) without third-party dependencies, adhering strictly to RFC 7519 for JSON Web Tokens (JWT).

### Primary Components:
- [`backend/src/infrastructure/security/jwtVerifier.js`](file:///c:/Users/samarth/firorix/backend/src/infrastructure/security/jwtVerifier.js): Native HS256 & RS256 token signing and verification.
- [`backend/src/infrastructure/security/xsuaaProvider.js`](file:///c:/Users/samarth/firorix/backend/src/infrastructure/security/xsuaaProvider.js): SAP BTP XSUAA binding accessor and validator.
- [`backend/src/services/authService.js`](file:///c:/Users/samarth/firorix/backend/src/services/authService.js): User credential management, session handling, role-to-permission mapping, and token generation.

---

## 2. JWT Verification Rules & Invariants
Every incoming token must satisfy strict RFC 7519 checks:
1. **Structural Integrity**: Exactly three dot-separated Base64URL-encoded parts (`header.payload.signature`).
2. **Algorithm Allowlist**: Permitted algorithms are explicitly enforced (`HS256` or `RS256`). Algorithm switching attacks (e.g. `none` algorithm) are unconditionally rejected.
3. **Cryptographic Signature**: Signature must match HMAC-SHA256 (for symmetric shared keys) or RSA-SHA256 (for public keys/XSUAA JWKS).
4. **Expiration Enforcement (`exp`)**: Tokens with `exp <= currentTime` are rejected with HTTP 401.
5. **Not-Before (`nbf`)**: Tokens with `nbf > currentTime` are rejected.
6. **Audience Validation (`aud`)**: Audience must match the expected client ID / audience string (`fiorix-platform` or configured BTP application name).
7. **Issuer Validation (`iss`)**: Issuer must match the configured authority URL.

---

## 3. Operational Modes

### 3.1 Local Development Mode (`NODE_ENV=development`)
- Supports local development tokens: `Bearer fiorix_dev_token_admin`, `fiorix_dev_token_sap_consultant`, etc.
- In-memory mock authentication fallback for CLI workflows.
- Admin secret override via header `X-FioriX-Admin-Secret` or `Authorization: Bearer <FIORIX_ADMIN_SECRET>`.

### 3.2 Production Mode (`NODE_ENV=production`)
- Developer tokens (`fiorix_dev_token_*`) are strictly rejected.
- Any attempt to use development bypass in production generates an immediate security audit event (`AUTH_FAILURE`) and aborts startup if bindings are missing.
- XSUAA or corporate OIDC IdP token validation is mandatory.

---

## 4. Endpoints & API Contracts

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate with username/email and password | No |
| `POST` | `/api/v1/auth/logout` | Revoke active session token | No (Token passed in Header) |
| `GET` | `/api/v1/auth/me` | Resolve identity of current authenticated caller | Yes |
| `GET` | `/api/v1/security/audit` | Query tamper-evident administrative audit log | Yes (`fiorix.audit.read`) |

---

## 5. Token Revocation
Logged out tokens are added to a centralized in-memory revocation blocklist (`revokedTokens`). Token verification checks the revocation blocklist prior to signature and expiration parsing.
