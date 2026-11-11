# FioriX — Security Gap & Vulnerability Assessment Report (Phase S0)

**Document Version:** 1.0  
**Phase:** S0 — Audit & Architecture Baseline  
**Scope:** Security posture, authentication, authorization, multi-tenancy, secrets management, logging, and data protection across backend and frontend codebases.  
**Date:** November 2026

---

## 1. Executive Summary

FioriX currently operates as a local-first engineering platform with developer-oriented authentication controls. As the platform transitions to multi-system enterprise deployment on SAP S/4HANA 2023 (Phase S1–S3), critical security controls must be upgraded to enterprise standards.

This report documents the precise security gaps identified in the Phase S0 baseline and defines the remediation strategy for Phase S2.

---

## 2. Identified Security Gaps

### GAP-01: Static Shared Admin Secret Authentication
- **Current State:**
  - `server.js` verifies admin requests using the `X-FioriX-Admin-Secret` header via `crypto.timingSafeEqual()`.
  - The secret is loaded from `process.env.FIORIX_ADMIN_SECRET` with a default development fallback (`dev-admin-secret-change-in-production`).
  - Read endpoints (`GET`) do not enforce authentication.
- **Risk:**
  - Static shared secret is vulnerable to credential sharing, cannot be revoked per user, and lacks individual user accountability.
- **Remediation in Phase S2:**
  - Implement server-side session/token-based authentication.
  - Integrate with corporate Identity Providers (IdP) via SAP BTP XSUAA (OAuth 2.0 / SAML 2.0 / OIDC) for production.
  - Maintain a distinct, explicit local development authentication provider that does not rely on production secrets.

### GAP-02: Absence of Multi-Tenant Isolation
- **Current State:**
  - Data stores (`assessments.json`, `generation-projects/`) store all records in a single flat namespace.
  - Neither APIs nor storage queries inspect or filter by `tenant_id`.
- **Risk:**
  - Multi-tenant data leakage or cross-tenant modification if multiple customers, business units, or testing environments share a backend instance.
- **Remediation in Phase S2:**
  - Introduce mandatory `tenant_id` column across all database tables in PostgreSQL (Phase S1 schema).
  - Enforce tenant boundary validation on every API request.
  - Isolate artifact directories by tenant: `<storageRoot>/<tenantId>/generation-projects/<projectId>/`.

### GAP-03: Hardcoded Development Defaults in Frontend
- **Current State:**
  - `frontend/src/services/api/apiClient.ts` reads `import.meta.env.VITE_FIORIX_ADMIN_SECRET || 'dev-admin-secret-change-in-production'`.
  - While suitable for local test runners, compiling admin secrets into production client-side bundles represents a critical security risk.
- **Risk:**
  - Any user inspecting browser network traffic or decompiling JavaScript bundles can extract the administrative secret.
- **Remediation in Phase S2:**
  - Completely eliminate admin secrets from frontend code.
  - Frontend must authenticate via HttpOnly session cookies or ephemeral bearer tokens issued by the backend authentication service.

### GAP-04: Sensitive Data in Application Logs
- **Current State:**
  - MCP logging (`mcpLogger.js`) and server request logging print full request headers and payloads during debug operations.
  - Potential exposure of authorization tokens, passwords, or SAP session cookies in stdout logs.
- **Risk:**
  - Exposure of credentials in log collection systems (ELK, CloudWatch, SAP BTP Application Logging).
- **Remediation in Phase S2:**
  - Implement automated log redaction for sensitive fields (`password`, `secret`, `authorization`, `cookie`, `token`, `privateKey`).
  - Enforce strict log levels (`INFO` by default in production).

### GAP-05: Unrestricted File Export and Download
- **Current State:**
  - Generation Studio export endpoints and assessment JSON exports do not sign or time-limit download URLs.
- **Risk:**
  - Unauthorized parties could download sensitive enterprise SAP architecture specifications or code artifacts if an endpoint URL is leaked.
- **Remediation in Phase S2:**
  - Secure all artifact downloads behind authenticated session verification and role-based permissions (`ADMIN`, `ARCHITECT`, `AUDITOR`).
  - Provide short-lived signed URLs for large artifact downloads.

---

## 3. Remediation Roadmap Matrix

| Gap ID | Description | Severity | Target Phase | Remediation Milestone |
|---|---|---|---|---|
| **GAP-01** | Static Admin Secret -> Session/Token Auth | **HIGH** | Phase S2 | Multi-tenant auth middleware with XSUAA / local dev toggle |
| **GAP-02** | Missing Tenant Isolation | **CRITICAL** | Phase S1 & S2 | Relational schema with `tenant_id`, query row-level security |
| **GAP-03** | Frontend Secret Exposure | **HIGH** | Phase S2 | Remove secret from Vite bundle; use HttpOnly session cookies |
| **GAP-04** | Log Data Sanitization | **MEDIUM** | Phase S2 | Log redaction filter for credentials and SAP headers |
| **GAP-05** | Unprotected Export Endpoints | **MEDIUM** | Phase S2 | Role-based artifact download verification |
