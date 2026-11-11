# FioriX Open Questions & Technical Uncertainty Register
**Project:** FioriX — SAP S/4HANA On-Premise Fiori App Discovery, Assessment and Generation Platform  
**Document Version:** 1.0.0  
**Phase:** Pre-Development / R&D Governance Phase  

---

## 1. Overview & Governance

This register tracks all unresolved technical, functional, architectural, and operational questions identified during the repository audit. Each question is documented with its architectural context, default baseline assumption, severity, blocking status, and assigned owner.

---

## 2. Master Open Questions Register

### 2.1 SAP S/4HANA Landscape & ABAP Integration

#### Q-SAP-01: What exact S/4HANA release, FPS, and ABAP platform version will serve as the pilot target?
- **Domain:** SAP S/4HANA Landscape
- **Context & Impact:** ABAP RESTful Application Programming Model (RAP) capabilities, CDS View Entity syntax (`DEFINE VIEW ENTITY` vs obsolete `DEFINE VIEW`), and OData V4 support vary significantly between S/4HANA 1909, 2020, 2021, 2022, and 2023. Generating code against an unconfirmed release risks producing syntactically incompatible ABAP drafts.
- **Current Baseline Assumption:** S/4HANA 2022 FPS02 is assumed as the modern baseline.
- **Risk Level:** **CRITICAL**
- **Blocking Status:** **BLOCKS SPRINT 3 (Generation Feasibility)**
- **Assigned Owner:** SAP Basis Lead / SAP Technical Architect
- **Resolution Action:** Execute transaction `SPAM` or query system status in the target sandbox to record: SAP_BASIS version, S4CORE release, and feature pack level.

#### Q-SAP-02: Is direct HTTP access to ADT endpoints (`/sap/bc/adt/*`) permitted over SAP Cloud Connector?
- **Domain:** SAP Integration & Connectivity
- **Context & Impact:** ABAP Development Tools in Eclipse communicate via proprietary REST/XML interfaces. In some corporate environments, Cloud Connector administrators strictly whitelist standard business OData paths (`/sap/opu/odata/*`) and reject developer tools (`/sap/bc/adt/*`) due to security policies.
- **Current Baseline Assumption:** ADT endpoints can be whitelisted in Cloud Connector with read-only scopes.
- **Risk Level:** **CRITICAL**
- **Blocking Status:** **BLOCKS SPRINT 1 EXIT**
- **Assigned Owner:** Cloud Connector Administrator / SAP Security Lead
- **Resolution Action:** In Cloud Connector admin console, configure resource mapping for `/sap/bc/adt` with "Path and all sub-paths", and execute test connection from BTP Destination Service.

#### Q-SAP-03: What specific authorization objects will be granted to the BTP technical communication user?
- **Domain:** SAP Security & Governance
- **Context & Impact:** Metadata discovery requires inspecting transaction tables (`TSTC`, `TADIR`, `DD02L`), programs (`S_DEVELOP` ACTVT 03), and SU24 authorization data (`USOBX_C`). Over-permissioning violates enterprise security; under-permissioning causes discovery jobs to fail with HTTP 403 / RFC authorization failures.
- **Current Baseline Assumption:** A custom read-only role `Z_FIORIX_DISCOVERY_RO` will be created with display authorizations only.
- **Risk Level:** **HIGH**
- **Blocking Status:** **BLOCKS SPRINT 1 EXIT**
- **Assigned Owner:** SAP Security Architect
- **Resolution Action:** Deliver formal role specification detailing exact authorization objects (`S_DEVELOP`, `S_TABU_DIS`, `S_ADT_RES`) and test user role assignment in DEV system.

#### Q-SAP-04: How will the system discover table structures if direct dictionary table access (`DD02L`/`DD03L`) is restricted?
- **Domain:** ABAP Data Dictionary
- **Context & Impact:** In highly locked-down SAP landscapes, reading DDIC tables directly via table display authorization is blocked.
- **Current Baseline Assumption:** ADT data dictionary resources (`/sap/bc/adt/ddic/structures`, `/sap/bc/adt/ddic/tables`) provide sufficient metadata without raw table reads.
- **Risk Level:** **MEDIUM**
- **Blocking Status:** **BLOCKS SPRINT 7 (Transaction Discovery)**
- **Assigned Owner:** ABAP Technical Lead
- **Resolution Action:** Validate ADT DDIC endpoint output on pilot table (e.g., `VBAK` or `EKKO`) using BTP Destination spike.

---

### 2.2 SAP Fiori Catalog & Licensing

#### Q-CAT-01: How will SAP Fiori Apps Reference Library data be acquired without violating terms of use?
- **Domain:** Fiori Catalog Ingestion
- **Context & Impact:** `fal.cloud.sap` has no public REST API. Automated headless browser scraping is prohibited by SAP terms of service, technically unstable, and vulnerable to DOM changes.
- **Current Baseline Assumption:** An official curated export (Excel/JSON) will be extracted manually and seeded into HANA Cloud.
- **Risk Level:** **CRITICAL**
- **Blocking Status:** **BLOCKS SPRINT 2 (Catalog R&D)**
- **Assigned Owner:** Principal Software Architect
- **Resolution Action:** Confirm and document the manual export and database seed pipeline for the pilot domain (e.g. Sales / Procurement) as the officially sanctioned approach.

#### Q-CAT-02: How will customer-specific custom Fiori apps (`Z*` apps) be discovered and separated from standard SAP apps?
- **Domain:** Custom App Catalog
- **Context & Impact:** Enterprise customers often already possess custom Fiori apps deployed on on-premise front-end servers or BTP. Comparing requirements only against standard SAP apps risks recommending a "BUILD" when an internal custom app already exists.
- **Current Baseline Assumption:** Standard SAP catalog and customer-specific catalogs are stored in distinct database partitions (`IS_CUSTOM` flag).
- **Risk Level:** **MEDIUM**
- **Blocking Status:** **NON-BLOCKING FOR PILOT (Deferred to later release)**
- **Assigned Owner:** SAP Functional Lead
- **Resolution Action:** Formalize in Sprint 2 that the pilot evaluates standard SAP Fiori apps only; internal custom app catalog ingestion is deferred.

---

### 2.3 SAP BTP Platform, Entitlements & Storage Services

#### Q-BTP-01: Does the BTP subaccount have active entitlements for SAP Document Management Service (DMS)?
- **Domain:** BTP Cloud Storage
- **Context & Impact:** Generated application artifacts (ABAP CDS views, RAP artifacts, Fiori elements projects) must be stored durably. Cloud Foundry container filesystems are ephemeral. If DMS is not entitled, a fallback durable storage mechanism must be provisioned.
- **Current Baseline Assumption:** DMS is preferred; HANA Cloud LOB storage is the zero-cost fallback.
- **Risk Level:** **HIGH**
- **Blocking Status:** **BLOCKS SPRINT 5 (BTP Foundation)**
- **Assigned Owner:** BTP Global Account Administrator
- **Resolution Action:** Run `cf marketplace` or check BTP Subaccount Entitlements cockpit for `sdm` (Document Management Service) or `objectstore`.

#### Q-BTP-02: What is the allocated memory quota for the Cloud Foundry space?
- **Domain:** BTP Operations
- **Context & Impact:** FioriX proposes hosting the App Router, CAP backend, and background workers in Cloud Foundry. If the space quota is constrained (e.g., 1 GB or 2 GB total), multiple application instances cannot run concurrently.
- **Current Baseline Assumption:** At least 4 GB of CF runtime memory is available.
- **Risk Level:** **MEDIUM**
- **Blocking Status:** **BLOCKS SPRINT 5 (BTP Foundation)**
- **Assigned Owner:** BTP Platform Administrator
- **Resolution Action:** Execute `cf space-quotas` or `cf quota` in the target space to record memory and instance limits.

#### Q-BTP-03: What HANA Cloud instance plan and sizing are provisioned?
- **Domain:** Database Infrastructure
- **Context & Impact:** FioriX stores deep repository snapshots, JSON payloads, and audit trails. HANA Cloud instances are priced per Capacity Unit (CU). Under-sizing risks OOM errors; over-sizing incurs high costs.
- **Current Baseline Assumption:** Standard minimal HANA Cloud instance (1 compute unit, 30 GB RAM).
- **Risk Level:** **MEDIUM**
- **Blocking Status:** **NON-BLOCKING FOR SPRINT 1 (Verified during Sprint 4/5)**
- **Assigned Owner:** SAP Database Administrator
- **Resolution Action:** Inspect HANA Cloud instance metrics in BTP Cockpit and configure 90-day retention purge policies for historical scan snapshots.

---

### 2.4 Architecture, Job Execution & API Protocol

#### Q-ARC-01: How will long-running asynchronous jobs be orchestrated in Cloud Foundry without Event Mesh?
- **Domain:** Cloud Foundry Architecture
- **Context & Impact:** Deep transaction scans and repository where-used traversal may exceed Cloud Foundry's 120-second HTTP request timeout. Neither BTP Job Scheduling nor SAP Event Mesh is mandated for initial demo.
- **Current Baseline Assumption:** Asynchronous job dispatching will use HANA Cloud database-backed task queues (`SCAN_JOB` table with status polling and optimistic locking) handled by dedicated worker processes.
- **Risk Level:** **HIGH**
- **Blocking Status:** **BLOCKS SPRINT 4 (Architecture Sign-Off)**
- **Assigned Owner:** Principal Software Architect
- **Resolution Action:** Formalize the DB-backed queue and polling architecture in ADR-0001 and deliver sequence diagrams in Sprint 4.

#### Q-ARC-02: Should FioriX adopt native CAP OData V4 or custom REST endpoints for UI5 consumption?
- **Domain:** Backend API Architecture
- **Context & Impact:** `docs/15-api-contracts.md` specifies `/api/v1/systems` (REST), whereas SAPUI5 and CAP natively operate on OData V4 (`/odata/v4/assessment/Systems`). Forcing custom Express REST routes loses CAP's automated CQN queries, paging, sorting, and UI5 Smart Control integration.
- **Current Baseline Assumption:** Hybrid model: CAP OData V4 for all entities; custom actions/REST solely for long-running job commands.
- **Risk Level:** **HIGH**
- **Blocking Status:** **BLOCKS SPRINT 4 (Architecture Sign-Off)**
- **Assigned Owner:** Principal Software Architect / Lead CAP Developer
- **Resolution Action:** Approve ADR-0001 adopting OData V4 as the primary data protocol and REST actions for job orchestration.

---

### 2.5 Business Analysis, Functional Governance & AI

#### Q-GOV-01: Who will serve as the dedicated SAP Functional Reviewer to confirm requirements?
- **Domain:** Functional Governance
- **Context & Impact:** BR-04 and core governance mandate that technical metadata does not prove business usage, and AI suggestions cannot confirm business rules. A qualified SAP functional consultant must review and confirm requirements.
- **Current Baseline Assumption:** An authorized SAP Functional Consultant will be assigned to the pilot project.
- **Risk Level:** **HIGH**
- **Blocking Status:** **BLOCKS SPRINT 8 (Business Requirements)**
- **Assigned Owner:** Product Owner / Project Sponsor
- **Resolution Action:** Nominate and onboard specific functional lead for the pilot transaction domain.

#### Q-GOV-02: What AI provider and data privacy controls will be implemented?
- **Domain:** AI / Security Governance
- **Context & Impact:** Sending SAP ABAP code, custom table schemas, or process notes to external cloud LLMs (OpenAI, Anthropic) without data protection agreements violates enterprise compliance.
- **Current Baseline Assumption:** AI is strictly optional and advisory; an abstract provider adapter will be built, defaulting to a mock/heuristic engine until an enterprise SAP AI Core / Generative AI Hub instance is approved.
- **Risk Level:** **HIGH**
- **Blocking Status:** **NON-BLOCKING FOR PILOT CORE (AI is optional)**
- **Assigned Owner:** Enterprise Security Officer & AI Lead
- **Resolution Action:** Implement provider adapter with deterministic rule engine as default, enabling LLM calls only when an approved API key and enterprise data processing agreement exist.

---

### 2.6 Pilot Scope Selection & Boundary Definition

#### Q-SCP-01: Which specific transaction code will be designated as the pilot transaction?
- **Domain:** Project Scope
- **Context & Impact:** Selecting an overly complex transaction (e.g. `VA01` with thousands of includes, user exits, and dynamic screen sequences) will overwhelm the pilot discovery phase. Selecting a trivial transaction (e.g. single-table parameter transaction) will not adequately prove the fit-gap and generation engine.
- **Current Baseline Assumption:** A well-bounded standard display/manage transaction (e.g., `ME23N` Display Purchase Order or a clean custom transaction `Z*`) will be selected.
- **Risk Level:** **CRITICAL**
- **Blocking Status:** **BLOCKS SPRINT 1 EXIT**
- **Assigned Owner:** Product Owner & SAP Technical Architect
- **Resolution Action:** Jointly review candidate transactions with the functional team and formally approve Pilot Transaction Selection in Sprint 1.

---

## 3. Summary of Blocking Items for Sprint 1 Exit

| Question ID | Title | Blocking Impact | Action Item |
|---|---|---|---|
| **Q-SAP-01** | Target S/4HANA & ABAP Release | Blocks Generation Templates | Record exact SPAM status from DEV sandbox |
| **Q-SAP-02** | ADT Access over Cloud Connector | Blocks Technical Discovery | Whitelist `/sap/bc/adt` and ping from BTP |
| **Q-SAP-03** | Least-Privilege Technical Role | Blocks SAP Connection | Finalize `Z_FIORIX_DISCOVERY_RO` role |
| **Q-SCP-01** | Pilot Transaction Selection | Blocks Discovery Target | Formal sign-off on pilot T-Code |

All other questions are prioritized for resolution during Sprints 2–5 according to the approved Sprint Plan.
