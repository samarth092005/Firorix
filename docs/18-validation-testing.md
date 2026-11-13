# Validation & Testing Architecture
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. Multi-Layer Testing Architecture

```
Layer 7: Stakeholder Acceptance (Functional Consultant & Architect Sign-off)
   ▲
Layer 6: SAP Sandbox Activation (Manual developer import via ADT / abapGit)
   ▲
Layer 5: Clean Core Tier 1 Validation (AST linting, C1 released CDS checks, auth checks)
   ▲
Layer 4: End-to-End Browser Journey (Playwright / wdi5 across 6 primary navigation areas)
   ▲
Layer 3: Integration Tests (CAP OData V4 services + SQLite / HANA container + Destination mock)
   ▲
Layer 2: Contract & Schema Tests (OpenAPI, JSON Schema, and CDS AST validation)
   ▲
Layer 1: Unit Tests (Vitest: fit-gap scoring rules, state machine transitions, parser logic)
```

---

## 2. Validation Centre Compliance Categories

The Validation Centre evaluates generated draft artifacts against four mandatory categories:

1. **`CLEAN_CORE` (Tier 1 Extensibility):**
   - Verifies that all entity associations target C1-released SAP Core Data Services views (e.g. `I_SalesOrder`, `I_Customer`).
   - Verifies zero direct modification or select from unreleased standard SAP tables.
2. **`ARCHITECTURE`:**
   - Verifies OData V4 protocol usage for SAP Fiori Elements floorplans (`sap.fe.templates`).
   - Verifies naming conventions (`Z_I_*` for basic views, `Z_C_*` for consumption views, `ZSD_*` for service definitions).
3. **`SECURITY`:**
   - Verifies that root CDS view entities declare `@AccessControl.authorizationCheck: #CHECK`.
   - Verifies that corresponding Access Control (`.dcl`) files are generated.
4. **`RELEASE_COMPATIBILITY`:**
   - Verifies that modern CDS syntax (`DEFINE ROOT VIEW ENTITY`) is used for S/4HANA 2020+ target systems, rejecting deprecated DDIC-based `DEFINE VIEW`.

---

## 3. Client-Side vs. SAP-Side Verification Boundary

- **Client-Side Verification (Sprints 1–13):** Executed by Fiorify offline using AST parsers, schema validators, and linter engines. Returns `PASS`, `WARNING`, `FAIL`, or `NOT_RUN`.
- **SAP-Side Verification (Post-Export / Manual Dev Sandbox):** Executed manually by ABAP developers in an isolated S/4HANA DEV sandbox via ADT or abapGit. Fiorify does not perform automated activation or CTS transport creation.
