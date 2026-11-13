# ADR-0009: Controlled Custom Fiori Generation Strategy & Clean-Core Compliance
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Senior SAP Solution Architect, Lead ABAP Developer, Product Architect  
**Technical Scope:** Custom Fiori Blueprinting, Code Generation & Governance Gates  

---

## 1. Context and Problem Statement
When standard SAP Fiori applications are proven insufficient via fit-gap analysis, Fiorify can assist developers by generating custom Fiori draft artifacts. Uncontrolled code generation risks creating non-compliant, non-clean-core ABAP artifacts, violating SAP release compatibility rules, and producing unmaintainable code.

## 2. Decision
1. **Mandatory Gating:** Custom app generation is locked behind a strict governance gate:
   - Fit-gap run must be complete.
   - Formal recommendation must be **`BUILD`**.
   - An authorized Solution Architect must have recorded an **`APPROVED`** sign-off.
2. **Template-Driven Clean Core Generation:** Generated artifacts must strictly adhere to **SAP Clean Core Tier 1** developer extensibility guidelines:
   - Root CDS View Entities (`DEFINE ROOT VIEW ENTITY`) utilizing released C1 CDS views (e.g. `I_SalesOrder`, `I_Customer`).
   - Strict avoidance of deprecated DDIC-based `DEFINE VIEW`.
   - Modern RAP Service Definitions (`SRVD`) and OData V4 Service Bindings (`SRVB`).
   - SAP Fiori Elements List Report and Object Page floorplans (`sap.fe.templates`).
3. **Draft-Only Status:** All generated outputs are exported as reviewable draft files (ZIP bundle containing CDS, SRVD, and `manifest.json`). No automated transport creation or activation in S/4HANA is permitted.

## 3. Consequences
- **Positive:** Guaranteed compliance with SAP Clean Core; accelerates custom app delivery from weeks to hours while preserving human oversight and architectural standards.
- **Trade-off:** Developers must manually import generated files into their S/4HANA sandbox via ADT or abapGit.
