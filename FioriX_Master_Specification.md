# FioriX Master Specification & System Index

**Version:** 2.0.0  
**Phase:** Architecture Finalisation & Implementation Roadmap  
**Date:** November 2026  

This is the master index for the FioriX platform definition and architecture pack. Detailed specifications reside in the `docs/` directory.

---

## 1. Confirmed Architectural Baseline

- **Target System:** SAP S/4HANA On-Premise only; ECC is excluded.
- **Target Deployment Platform:** SAP BTP Cloud Foundry.
- **Frontend Stack:** React 18 + TypeScript + Vite with SAP Fiori Horizon design standards and selective UI5 Web Components for React.
- **Backend Stack:** Modular SAP Cloud Application Programming Model (CAP) Node.js with TypeScript (`@sap/cds`) exposing OData V4 services.
- **Persistence:** Local SQLite for developer velocity; SAP HANA Cloud HDI container for production BTP deployment.
- **SAP Connectivity:** BTP Destination Service + Connectivity Service + SAP Cloud Connector to private S/4HANA on-premise endpoints.
- **Discovery Interfaces:** Approved ADT REST resources (`/sap/bc/adt/*`), Gateway OData catalogs, and SU24 authorization tables (`USOBX_C`).
- **Standard Fiori First:** Curated standard catalog exploration strictly precedes custom code generation.
- **Controlled Generation:** Custom generation is unlocked exclusively upon an approved **BUILD** decision; generated artifacts remain reviewable drafts.
- **AI Policy:** Optional and advisory. AI never confirms requirements, approves decisions, or executes SAP changes.

---

## 2. Six Primary Navigation Areas

1. **Dashboard** (`/dashboard`): Operational metrics, recent assessments, landscape connectivity, and discovery job activity.
2. **SAP Landscape** (`/systems`): S/4HANA system registry, destination mappings, release profiles, and connection test history.
3. **Discovery** (`/explorer`, `/jobs`): Transaction Explorer, deep object inspection, and asynchronous background scan queue.
4. **Assessments** (`/assessments`, `/assessments/new`, `/assessments/:id`): Master assessment register, guided wizard, and the unified 9-tab **Assessment Workspace**.
5. **Fiori Catalogue** (`/catalogue`, `/catalogue/:id`): Curated standard SAP Fiori catalog search, manifest inspection, and extensibility analysis.
6. **Governance** (`/validation`, `/approvals`, `/audit`): Validation Centre (Clean Core Tier 1), Architectural Sign-Offs, and Append-Only Audit Trail.

*Settings and User Profile are accessible via the application header.*

---

## 3. Master Specification Directory

| Document | Title | Purpose |
|---|---|---|
| [docs/architecture/MASTER_ARCHITECTURE_AND_FRONTEND_RESTRUCTURING_PLAN.md](docs/architecture/MASTER_ARCHITECTURE_AND_FRONTEND_RESTRUCTURING_PLAN.md) | **Master Plan** | Comprehensive 18-deliverable architecture, ERD, CRUD, and restructuring plan |
| [docs/00-project-charter.md](docs/00-project-charter.md) | Project Charter | Vision, scope, stakeholders, and governance principles |
| [docs/01-prd.md](docs/01-prd.md) | Product Requirements | Problem statement, user journeys, and core metrics |
| [docs/02-business-requirements.md](docs/02-business-requirements.md) | Business Requirements | BR-01 to BR-08 and decision policies |
| [docs/03-functional-requirements.md](docs/03-functional-requirements.md) | Functional Requirements | Detailed functional specifications per domain |
| [docs/04-non-functional-requirements.md](docs/04-non-functional-requirements.md) | Non-Functional Requirements | Security, reliability, performance, and auditability |
| [docs/05-sap-technology-stack.md](docs/05-sap-technology-stack.md) | SAP Technology Stack | S/4HANA, BTP CF, ADT, RAP, and CDS specifications |
| [docs/06-engineering-stack.md](docs/06-engineering-stack.md) | General Engineering Stack | React 18, Vite, TypeScript, CAP, SQLite, and HANA Cloud |
| [docs/07-solution-architecture.md](docs/07-solution-architecture.md) | Solution Architecture | Multi-tier architecture, component boundaries, and workers |
| [docs/08-sap-integration.md](docs/08-sap-integration.md) | SAP Integration | Cloud Connector, Destination, ADT, and security boundaries |
| [docs/09-tcode-discovery.md](docs/09-tcode-discovery.md) | T-Code Discovery | Structural extraction, static vs dynamic, and evidence levels |
| [docs/10-business-analysis.md](docs/10-business-analysis.md) | Business Analysis | Process context, actors, rules, and requirement lifecycle |
| [docs/11-fiori-catalogue-fit-gap.md](docs/11-fiori-catalogue-fit-gap.md) | Fiori Catalogue & Fit-Gap | Curated FAL ingestion, match taxonomy, and decision policy |
| [docs/12-generation-design.md](docs/12-generation-design.md) | Custom Fiori Generation | Gated blueprinting, RAP CDS DDL, SRVD, and manifest drafting |
| [docs/13-ai-ml-design.md](docs/13-ai-ml-design.md) | AI/ML Design & Policy | Advisory boundary, provider-independence, and data protection |
| [docs/14-database-data-model.md](docs/14-database-data-model.md) | Database & Data Model | Relational CAP CDS model covering 28+ normalized entities |
| [docs/15-api-contracts.md](docs/15-api-contracts.md) | API & Service Contracts | CAP OData V4 services, actions, and async job protocols |
| [docs/16-ui-ux-specification.md](docs/16-ui-ux-specification.md) | UI/UX Specification | 6-area layout, 9-tab Assessment Workspace, and design tokens |
| [docs/17-security-governance.md](docs/17-security-governance.md) | Security & Governance | Least-privilege role `Z_FIORIX_DISCOVERY_RO`, XSUAA, and audit |
| [docs/18-validation-testing.md](docs/18-validation-testing.md) | Validation & Testing | Multi-layer test strategy and Clean Core Tier 1 checks |
| [docs/19-rnd-plan.md](docs/19-rnd-plan.md) | R&D Plan | Feasibility spikes for ADT, FAL catalog, and generation |
| [docs/20-sprint-plan.md](docs/20-sprint-plan.md) | Detailed Sprint Plan | 16-sprint / 32-week execution schedule with dependencies |
| [docs/21-deployment-operations.md](docs/21-deployment-operations.md) | Deployment & Operations | BTP CF MTA topology, storage tiers, and operational runbooks |
| [docs/22-risks-open-decisions.md](docs/22-risks-open-decisions.md) | Risks & Open Decisions | Risk register, mitigations, and gating conditions |
| [docs/23-sap-references.md](docs/23-sap-references.md) | Official SAP References | Traceable official SAP Help, RAP, and BTP documentation links |
