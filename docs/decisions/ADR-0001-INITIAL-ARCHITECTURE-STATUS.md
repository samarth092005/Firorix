# ADR-0001: Initial Architecture Baseline, Technical Feasibility Governance, and Pre-Development Gate
**Status:** APPROVED WITH CONDITIONS  
**Date:** November 2026  
**Deciders:** Principal Software Architect, SAP S/4HANA Technical Architect, BTP Platform Architect  
**Technical Scope:** Fiorify Discovery, Assessment, and Generation Platform  

---

## 1. Context and Problem Statement

Fiorify is designed to accelerate and govern the migration of SAP S/4HANA On-Premise transactions to modern SAP Fiori applications. The platform inspects classic transactions, extracts structural metadata, discovers relevant standard SAP Fiori apps, executes requirement-level fit-gap analysis, recommends **Adopt / Extend / Build / Review**, and assists with controlled generation of custom Fiori drafts where a custom build is fully justified.

Before initiating project scaffolding or implementation, an architectural review was performed across the pre-development specification pack (`docs/00` through `docs/23`). Several foundational architectural choices, integration boundaries, and technical risk mitigations require formal decision-making to prevent unverified assumptions from propagating into application code.

---

## 2. Decision Drivers

1. **Enterprise Governance & Safety:** Generated artifacts must remain reviewable drafts; Fiorify must never trigger unauthorized modifications or transports in S/4HANA.
2. **Standard Fiori First Principle:** Standard SAP Fiori applications must be systematically evaluated and prioritized prior to proposing custom app development.
3. **Enterprise Connectivity Boundaries:** Integration with on-premise S/4HANA must operate through sanctioned SAP BTP channels (Cloud Connector, Destination Service) under least-privilege read-only authorizations.
4. **Architectural Simplicity & Maintainability:** Avoid premature microservice proliferation; favor a modular SAP Cloud Application Programming Model (CAP) architecture.
5. **Resilience & BTP Quota Constraints:** Long-running discovery jobs must not violate Cloud Foundry routing timeouts (120s limit) or rely on unentitled premium services.
6. **Data Privacy & AI Containment:** Proprietary customer code and business processes must be protected from unvetted third-party AI exposure.

---

## 3. Considered Options

- **Option A (Fragmented Microservices & Live Web Scraping):** Multi-container microservices per domain (Discovery, Catalog, Gen, Validation), live web scraping of `fal.cloud.sap`, direct RFC/SQL integration with SAP.
- **Option B (Modular CAP Monolith with Standard BTP Services & Curated Catalog):** Unified CAP Node.js/TypeScript backend, SAPUI5 Freestyle frontend, HANA Cloud, Cloud Connector via Destination Service, curated offline catalog ingestion, and database-backed asynchronous worker queues.
- **Option C (Pure Frontend Tooling / Local CLI):** Pure local developer tool running on developer workstations without centralized governance, database, or BTP hosting.

---

## 4. Decision Outcome

**Chosen Option:** **Option B (Modular CAP Monolith with Standard BTP Services & Curated Catalog)**, subject to the eight binding architectural policies detailed below.

### Policy 1: Confirmation of Baseline Architecture Stack
The core technology stack is formally established as:
- **Hosting Environment:** SAP BTP Cloud Foundry Runtime (Node.js 20 LTS buildpack).
- **Core Backend Framework:** SAP Cloud Application Programming Model (CAP) Node.js with TypeScript (`@sap/cds`).
- **Database:** SAP HANA Cloud (managed via HDI container).
- **Fiorify Frontend:** SAPUI5 Freestyle enterprise workbench utilizing the SAP Fiori Horizon design system.
- **Ingress & Authentication:** SAP BTP Managed Application Router integrated with SAP BTP XSUAA and SAP Cloud Identity Services.

### Policy 2: Dual Protocol Architecture (OData V4 for Data, REST for Orchestration)
To resolve the contradiction between CAP standard conventions and the REST API specification:
- All domain entity access, search, and UI data bindings shall use **SAP CAP Native OData V4 services** (`/odata/v4/assessment/*`).
- Long-running asynchronous execution commands, job status polling, and external webhooks shall use **REST-style endpoints or CAP Actions** (`/api/v1/jobs/*`, `/api/v1/transactions/analyze`).

### Policy 3: Strict Read-Only S/4HANA Integration Boundary for Pilot
- The integration path from BTP to S/4HANA is strictly read-only:
  $$\text{CAP Backend} \longrightarrow \text{Destination Service} \longrightarrow \text{Connectivity Service} \longrightarrow \text{Cloud Connector} \longrightarrow \text{S/4HANA Endpoints}$$
- Under no circumstances shall Fiorify create transport requests (`E070`/`TRCORR`), modify standard SAP tables, or execute automated object activation in the S/4HANA system during Phase 1.
- All SAP-side activation checks must be executed manually by a developer in an isolated developer sandbox via exported draft files.

### Policy 4: Curated Offline Fiori App Catalog Ingestion
- **Automated live web scraping of `fal.cloud.sap` is explicitly rejected** due to lack of a public API and violation of SAP terms of use.
- Catalog data for the pilot domain shall be ingested via an **official, curated export (Excel/JSON)** obtained from the SAP Fiori Apps Reference Library and seeded directly into HANA Cloud (`FIORI_APP`, `APP_RELEASE`).
- Automated catalog synchronization is deferred to future releases pending official SAP API availability.

### Policy 5: Database-Backed Asynchronous Job Orchestration
- To operate within Cloud Foundry's 120-second HTTP request timeout without requiring unentitled message brokers (Event Mesh / RabbitMQ):
- Discovery, Fit-Gap, and Generation tasks shall be executed asynchronously using a **HANA Cloud DB-backed queue** (`SCAN_JOB` entity with optimistic row-level locking and state tracking: `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`).
- Background worker processes shall poll and execute jobs with bounded concurrency and exponential backoff retry mechanisms.

### Policy 6: Durable Artifact Storage Strategy & Fallback Hierarchy
- Generated draft artifacts (ZIP archives, specification JSONs) must never rely on ephemeral Cloud Foundry container filesystems.
- The storage hierarchy is defined as:
  1. **Primary:** SAP Document Management Service (DMS, Integration Option) if entitled in the subaccount.
  2. **Fallback:** Dedicated HANA Cloud Large Object (LOB) table (`GENERATED_ARTIFACT_CONTENT`) within the HDI container, with a strict 10 MB per-project size constraint.

### Policy 7: Standard Fiori First Enforcement Gate
- Fiorify must enforce an automated governance check: A custom application specification (`GENERATION_PROJECT`) cannot be initiated unless:
  1. A formal Fit-Gap run has executed against the Fiori catalog.
  2. A recommendation of `BUILD` has been recorded.
  3. A human Functional Consultant or Architect has explicitly confirmed that no standard Fiori app satisfies the critical business requirements.

### Policy 8: AI Pluggability & Zero Data Leakage Isolation
- AI capabilities are strictly advisory and non-authoritative.
- An abstract AI provider interface (`IAIProvider`) shall be implemented.
- The default provider shall be a local, deterministic rule-based heuristic engine.
- Connection to SAP AI Core / Generative AI Hub or external LLMs shall remain disabled by default, requiring explicit administrator activation and automated payload redaction (scrubbing table data, business comments, and proprietary logic).

---

## 5. Consequences & Trade-Offs

### Positive Consequences
- **Security & Compliance:** Complete alignment with SAP enterprise security policies; zero risk of unauthorized production transports or data leakage.
- **Operational Reliability:** Resilient against Cloud Foundry restarts and network timeouts through durable database-backed job state tracking.
- **Zero Scraping Fragility:** Relying on curated official catalog exports guarantees deterministic, reproducible fit-gap comparisons without scraping breakage.
- **Standard SAP UI Experience:** Leveraging OData V4 and SAPUI5 Freestyle ensures seamless integration with BTP Launchpad and SAP Fiori launchpad environments.

### Negative Consequences & Mitigations
- **Catalog Refresh Overhead:** Curated catalog exports require manual administrative updates when new S/4HANA feature packs or Fiori versions are published.
  *Mitigation:* Provide an administrative catalog upload tool in Sprint 9.
- **Manual Dev Sandbox Import:** Developers must manually import generated draft ZIP files into S/4HANA using ADT or abapGit rather than one-click activation.
  *Mitigation:* This trade-off is an intentional governance feature, ensuring human architectural oversight of all generated code.
- **HANA LOB Sizing:** Utilizing HANA Cloud LOB tables as a storage fallback consumes database RAM if not purged.
  *Mitigation:* Implement automated 90-day retention policies and maximum file size limits (10 MB).

---

## 6. Pre-Development Exit Criteria (Phase Gate 1)

Before code implementation commences in Sprint 5, the following conditions must be satisfied and signed off:

1. Target S/4HANA On-Premise release, patch level, and ABAP platform version verified in DEV sandbox.
2. SAP Cloud Connector tunnel established and verified against `/sap/bc/adt/discovery`.
3. Least-privilege communication role (`Z_Fiorify_DISCOVERY_RO`) provisioned in S/4HANA.
4. BTP Subaccount entitlements verified (HANA Cloud HDI, Cloud Foundry quota, and DMS/Storage).
5. Pilot transaction code formally selected and signed off by Functional and Technical leads.
6. Curated pilot catalog dataset (50–100 Fiori apps) prepared and validated.

---

## 7. Approval & Sign-Off

| Role | Name / Title | Decision | Date |
|---|---|---|---|
| **Principal Software Architect** | Fiorify Platform Architecture | **APPROVED WITH CONDITIONS** | 02 Nov 2026 |
| **SAP S/4HANA Technical Architect**| SAP Platform Integration | **APPROVED WITH CONDITIONS** | 02 Nov 2026 |
| **BTP Platform Architect** | BTP Cloud Governance | **APPROVED WITH CONDITIONS** | 02 Nov 2026 |
