# Detailed 16-Sprint Plan (32-Week Baseline)
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

The 16-sprint (32-week) plan establishes the execution sequence from local discovery to production readiness.

| Sprint | Focus Domain | Objectives & Key Tasks | Prerequisites & Gating | Deliverables & Exit Criteria |
|---|---|---|---|---|
| **S1** | SAP Landscape & ADT Feasibility | Test Cloud Connector tunnel; probe `/sap/bc/adt/discovery` via Destination; verify DEV sandbox release (S4CORE / BASIS). | S/4HANA DEV Sandbox & Cloud Connector Admin access | ADT Connectivity Proof Report; Verified SPAM Release Matrix. |
| **S2** | Functional Analysis & Catalog R&D | Assemble curated offline FAL export dataset (Sales/Purchasing); define requirement-to-app capability taxonomy. | Official FAL export file | Verified 100-app Catalog Dataset in JSON/HANA format; Taxonomy Guide. |
| **S3** | Generation Feasibility | Prove syntax for ABAP CDS View Entities (`DEFINE ROOT VIEW ENTITY`) and RAP Service Definitions (`SRVD`) for target release. | Confirmed S/4HANA Release Profile from S1 | Validated Reference DDL Templates; Syntax Compatibility Report. |
| **S4** | Architecture Sign-off | Finalize CAP CDS models, OData V4 contracts, DB-backed job queue architecture, and ADR approvals. | S1, S2, S3 results | Approved PRD, Final ERD, Signed ADRs (ADR-0001 to ADR-0010). |
| **S5** | Frontend Restructuring | Implement 6-area navigation; consolidate Assessment Workspace tabs; integrate Settings into header. | Approved UX Architecture | Restructured React frontend running cleanly with 6 primary areas. |
| **S6** | CAP Backend & CDS Data Model | Scaffold `@sap/cds` project in `backend/`; implement 28+ relational entities; test local SQLite compilation. | Node 20 LTS, `@sap/cds-dk` | Functional CAP backend with SQLite persistence and schema tests. |
| **S7** | CRUD & Workflow APIs | Implement CAP OData V4 services (`AssessmentService`, `LandscapeService`); test via CDS REPL. | S6 Data Model | Automated unit/contract tests for all entity mutations. |
| **S8** | SAP Connectivity Proof | Connect local CAP to S/4HANA sandbox via BTP Destination / Cloud Connector; execute read-only ping. | S1 ADT Proof, BTP Subaccount | Live S/4HANA handshake from CAP service with HTTP 200. |
| **S9** | T-Code Discovery Engine | Implement `DiscoveryService`; query `TSTC`, `TADIR`, and `USOBX_C` for pilot T-Code (`ME21N`); persist snapshots. | S8 Connectivity | Live metadata extraction with evidence provenance tracking. |
| **S10**| Business Requirements Management| Wire frontend Assessment Workspace Tab 3 to CAP `RequirementService`; implement confirmation workflow. | S7 APIs, S9 Discovery | Full lifecycle requirement capture, edit, and confirmation gate. |
| **S11**| Fiori Catalogue Integration | Seed curated FAL dataset into HANA Cloud; implement search, filtering, and OData service queries. | S2 Catalog Dataset | Functional Fiori Catalogue search with sub-second response times. |
| **S12**| Fit-Gap & Recommendation Engine | Implement deterministic policy engine; score requirements (SUPPORTED, PARTIAL, UNSUPPORTED, UNKNOWN); compute recommendations. | S10 Requirements, S11 Catalog | Automated fit-gap matrix and advisory recommendation generator. |
| **S13**| Generation Studio Implementation | Wire Generation Studio tab; generate reviewable CDS, SRVD, and Fiori Elements manifest for approved BUILDs. | S3 Templates, S12 Decision | Reviewable draft project generation with SHA-256 checksums and ZIP export. |
| **S14**| Validation & Governance Gate | Implement Clean-Core AST checks, security authorization checks, and stakeholder sign-off workflow. | S13 Draft Generator | Validation finding report and formal approval gate. |
| **S15**| Security & Hardening | Configure XSUAA role collections, Cloud Connector IP whitelisting, input sanitization, and audit logging. | BTP XSUAA Instance | Security audit sign-off; zero High/Critical vulnerabilities. |
| **S16**| End-to-End Pilot Demo | Execute complete pilot journey (ME21N $\rightarrow$ Discovery $\rightarrow$ Fit-Gap $\rightarrow$ Build $\rightarrow$ Draft Export); production gate review. | All previous sprints | End-to-end verified demo, operator runbook, and production release gate. |

### Environment Dependency Classification
- **Local-Only Tasks (S4, S5, S6, S7):** Can proceed entirely on local developer workstations with Node.js, SQLite, and React.
- **S/4HANA Sandbox Tasks (S1, S3, S8, S9):** Require Cloud Connector pairing to DEV sandbox and technical role `Z_FIORIX_DISCOVERY_RO`.
- **BTP Tenant Tasks (S15, S16):** Require BTP Subaccount entitlements for Cloud Foundry, HANA Cloud HDI, and XSUAA.
