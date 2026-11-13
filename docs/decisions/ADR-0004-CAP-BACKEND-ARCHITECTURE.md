# ADR-0004: Modular SAP CAP Node.js Backend Architecture
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Senior SAP Solution Architect, Senior CAP Developer, BTP Platform Architect  
**Technical Scope:** Fiorify Backend Runtime & Service Boundaries  

---

## 1. Context and Problem Statement
Fiorify requires a robust backend on SAP BTP Cloud Foundry to orchestrate S/4HANA metadata discovery, business requirement governance, catalog search, fit-gap calculation, and draft code generation. We must decide between a microservices-per-feature architecture vs. a modular monolithic CAP application.

## 2. Decision
1. **Modular CAP Monolith:** Implement the backend as a **single modular SAP Cloud Application Programming Model (CAP) Node.js application** in TypeScript.
2. **Distinct Service Modules:** Decompose functionality into 6 distinct CAP service definitions:
   - `LandscapeService` (`/odata/v4/landscape`)
   - `DiscoveryService` (`/odata/v4/discovery`)
   - `AssessmentService` (`/odata/v4/assessment`)
   - `CatalogueService` (`/odata/v4/catalogue`)
   - `FitGapService` (`/odata/v4/fitgap`)
   - `GenerationService` (`/odata/v4/generation`)
   - `GovernanceService` (`/odata/v4/governance`)
3. **No Premature Microservices:** All services run within the same CAP runtime container, sharing the same HANA HDI persistence container, eliminating inter-service network latency and distributed transaction complexity.

## 3. Consequences
- **Positive:** Greatly simplified deployment (`mta.yaml`), shared domain entities, transactional integrity, rapid local testing with SQLite.
- **Trade-off:** Services scale together within the CF container, requiring memory quota monitoring.
