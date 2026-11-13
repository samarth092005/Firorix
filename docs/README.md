# Fiorify Project Definition Pack
Version 1.0 | 2 November 2026 | Proposed baseline

Read in order: project charter, PRD, business requirements, functional requirements, non-functional requirements, SAP stack, engineering stack, architecture, SAP integration, T-Code discovery, business analysis, Fiori catalogue/fit-gap, generation, AI/ML, database, APIs, UI/UX, security, testing, R&D, sprints, deployment and risks.

## Agreed baseline
- Target: SAP S/4HANA On-Premise only; ECC excluded.
- Hosting: SAP BTP Cloud Foundry.
- Fiorify frontend: SAPUI5 freestyle, modern enterprise workbench with SAP Fiori design principles.
- Main backend: SAP CAP Node.js / TypeScript.
- Database: SAP HANA Cloud.
- SAP connectivity: Destination + Connectivity + Cloud Connector where required; ADT and approved SAP APIs.
- AI: optional provider adapter; no AI provider is assumed available.
- Storage: SAP Document Management Service if entitled; otherwise approved durable repository.
- First input: one T-Code; Excel and system-wide scans later.
- Standard Fiori discovery precedes custom generation.

## Critical caveats
CAP CDS and ABAP CDS are different. SAPUI5 and Fiori elements are related but distinct. A T-Code does not guarantee a direct CDS/OData mapping. ADT does not guarantee a complete runtime dependency graph. Business rules require functional confirmation. Catalogue acquisition method and BTP entitlements must be verified. Generated artifacts remain drafts until SAP-side validation and human approval.
