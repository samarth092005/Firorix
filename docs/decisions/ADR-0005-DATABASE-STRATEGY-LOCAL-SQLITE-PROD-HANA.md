# ADR-0005: Database Persistence Strategy: Local SQLite and Production HANA Cloud
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Database Architect, Senior CAP Developer, BTP Platform Architect  
**Technical Scope:** Persistence Strategy across Development and Production  

---

## 1. Context and Problem Statement
FioriX requires a relational database to store landscape metadata, discovery snapshots, requirements, catalog data, fit-gap matrices, and audit logs. Developing locally against a cloud-hosted SAP HANA Cloud instance introduces network latency, credential sharing risks, and unnecessary capacity unit consumption during early sprints.

## 2. Decision
1. **Local Development:** Utilize **SQLite in-memory or file-based persistence** (`@cap-js/sqlite`) for local CAP development, automated unit tests, and CI/CD pipelines.
2. **Production / BTP Deployment:** Target **SAP HANA Cloud via HDI Containers** (`@cap-js/hana`) for deployment on SAP BTP Cloud Foundry.
3. **Strict CAP CDS Abstraction:** All entities must be defined strictly in Core Data Services (`db/schema.cds`) using database-agnostic types (`UUID`, `String`, `Integer`, `Timestamp`, `LargeString`). No HANA-specific SQL syntax or native stored procedures shall be used in application logic.
4. **No JSON Relational Substitutes:** All core entities and relationships must be fully normalized relational tables. JSON columns are permitted only for raw discovery payload caching in `DISCOVERY_EVIDENCE`.

## 3. Consequences
- **Positive:** Zero-cost, instantaneous local development without cloud dependencies; seamless zero-code cutover to SAP HANA Cloud in production via standard CAP bindings.
- **Trade-off:** Advanced HANA Vector Engine features must be encapsulated behind an abstraction interface to avoid breaking local SQLite runs.
