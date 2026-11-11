# Risks & Open Decisions Register
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

Every major design decision and risk is formally classified into one of five categories:
`CONFIRMED`, `PROPOSED`, `REQUIRES R&D`, `BLOCKED BY ACCESS`, or `DEFERRED`.

---

## 1. Master Decisions & Risks Status

| Item / Decision | Status | Resolution / Action Required | Owner | Target Milestone |
|---|---|---|---|---|
| **Frontend Framework (React + TS + Vite)** | **CONFIRMED** | Preserved. React 18, Vite 5, React Router 6, Fiori Horizon design tokens (ADR-0002, ADR-0003). | Lead Frontend Architect | Complete (S5 Refactor) |
| **Six Primary Navigation Areas** | **CONFIRMED** | Restructure navigation to 6 areas; Settings in TopBar; consolidate Assessment Workspace (ADR-0010). | Enterprise UX Architect | Sprint 5 |
| **Backend Architecture (CAP Node.js)** | **CONFIRMED** | Single modular CAP Node.js monolith with 6 OData V4 services (ADR-0004). | Senior CAP Developer | Sprint 6 |
| **Database Strategy (SQLite / HANA Cloud)** | **CONFIRMED** | SQLite for local development; SAP HANA Cloud HDI for BTP production (ADR-0005). | Database Architect | Sprint 6 |
| **API Protocol (OData V4 Core + Actions)** | **CONFIRMED** | OData V4 for entities; CAP actions for async job commands and approvals (ADR-0006). | Senior Solution Architect| Sprint 7 |
| **Storage Strategy (DMS + HANA Fallback)**| **CONFIRMED** | Primary in SAP DMS; fallback to HANA LOB table with 10 MB per-project quota (ADR-0007). | Database Architect | Sprint 6 |
| **Controlled Generation Strategy** | **CONFIRMED** | Gated behind approved BUILD; Clean Core Tier 1 templates; draft reviewable export only (ADR-0009). | Product Architect | Sprint 13 |
| **FAL Catalog Ingestion Approach** | **CONFIRMED** | Curated offline official FAL export seeded into HANA. Automated web scraping rejected (CRIT-01). | Solution Architect | Sprint 2 |
| **Target S/4HANA Release Profile** | **REQUIRES R&D** | Query `SPAM` in DEV sandbox (Client 200) to pin exact S4CORE/BASIS release and RAP features. | SAP Basis / Tech Lead | Sprint 1 |
| **ADT Connectivity via Cloud Connector** | **BLOCKED BY ACCESS**| Test `/sap/bc/adt/discovery` over Cloud Connector tunnel using BTP Destination spike. | SCC Administrator | Sprint 1 |
| **Least-Privilege SAP Technical Role** | **BLOCKED BY ACCESS**| Provision custom role `Z_FIORIX_DISCOVERY_RO` strictly scoped to metadata tables. | SAP Security Architect | Sprint 1 |
| **ADT Where-Used Cross-Reference Overhead**| **REQUIRES R&D** | Measure response times and CPU impact of `/sap/bc/adt/repository/crossreferences` in DEV. | ABAP Technical Lead | Sprint 1 |
| **BTP Subaccount Entitlements Export** | **BLOCKED BY ACCESS**| Export BTP cockpit inventory confirming Cloud Foundry quota, HANA Cloud, and DMS. | BTP Global Admin | Sprint 4 |
| **Excel Bulk Upload & System Scans** | **DEFERRED** | Deferred to Sprint 14+. Sprint 1–13 focus exclusively on single pilot T-Code (e.g. ME21N). | Product Owner | Sprint 14 |
| **AI LLM Provider Selection** | **DEFERRED** | Keep AI behind an abstract provider adapter; evaluate SAP AI Core / GenAI Hub post-pilot. | Enterprise AI Lead | Sprint 15 |
