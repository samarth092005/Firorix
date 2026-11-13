# Fiorify — Security & Governance Specification

## 1. Zero Hardcoded Secrets Remediation
- **Frontend Code**: Any default or embedded administrative secrets (e.g. `DEFAULT_DEV_ADMIN_SECRET = '884b9471...'`) have been completely removed from client bundles.
- **Session Isolation**: Admin authentication tokens are maintained exclusively in ephemeral `sessionStorage` and transmitted via HTTP header `X-Fiorify-Admin-Secret`.

## 2. Cryptographic Audit Trail Ledger
Every state transition and assessment update is sealed in an append-only cryptographic event chain (`backend/data/assessments.json`):
- **Hash Algorithm**: SHA-256 (`computeEventHash`).
- **Chain Verification**: Validated on server boot and audit requests via `verifyAuditChain`.
- **Tamper Evidence**: Any out-of-band edit or modified parent event invalidates the hash chain and prevents further lifecycle progression.

## 3. Role-Based Access Control (RBAC)
- **Consultant / Developer**: Read-only discovery, candidate matching, Fit-Gap evaluation, assessment creation.
- **Lead Architect / Administrator**: Lifecycle approval, catalogue rollback, FAL ingestion imports, MCP server lifecycle management.
