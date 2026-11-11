# ADR-0002: Frontend Architecture, Technology Selection, and Mock Layer
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Principal Frontend Architect, Senior React Engineer, SAP Fiori UX Specialist  
**Technical Scope:** FioriX Web Client & Workbench Shell  

---

## 1. Context and Problem Statement

FioriX requires a high-performance, enterprise-grade web frontend to serve as the unified assessment and controlled generation platform for SAP S/4HANA On-Premise transactions. The frontend must present complex technical metadata, multi-stage business analysis, Fiori catalog comparisons, fit-gap matrices, and draft application blueprints.

The target CAP Node.js backend and SAP HANA Cloud database will be developed in subsequent sprints. The immediate objective is to implement a complete, robust, fully functional first frontend release operating locally with high-fidelity demonstration data.

---

## 2. Decision Drivers

1. **Enterprise Usability & Persona Alignment:** Must look and feel like an authentic SAP engineering tool for ABAP developers and functional consultants, strictly avoiding generic AI SaaS clichés.
2. **Deterministic Architecture:** Standard Fiori first; strict distinction between `UNKNOWN` and `UNSUPPORTED`.
3. **Local Independence:** Must run completely locally on developer workstations without live SAP connectivity or BTP cloud deployments.
4. **Clean Service Decoupling:** Must provide a typed service layer enabling seamless cutover from mock data to future CAP OData V4 and REST APIs without rewriting UI components.
5. **Type Safety & Build Reliability:** Strict TypeScript enforcement with zero console errors or unresolved dependencies.

---

## 3. Considered Options

- **Option A (SAPUI5 Freestyle / XML Views with UI5 Tooling):** Traditional SAPUI5 stack using XML views and manifest.json. High SAP fidelity, but slow developer feedback loops, complex local state management, and heavier build requirements.
- **Option B (React + TypeScript + Vite + Fiori Design Tokens):** Industry-standard React 18, Vite for ultra-fast HMR and optimized bundling, React Router for deep route navigation, and an authentic SAP Fiori Design System implementation.
- **Option C (Full-Stack Next.js with Server-Side Rendering):** Introduces unnecessary Node.js server dependencies for a client-side workbench that will ultimately be hosted via BTP HTML5 Application Repository and Managed App Router.

---

## 4. Decision Outcome

**Chosen Option:** **Option B (React + TypeScript + Vite + Fiori Design Tokens & Service Layer)**.

### Architectural Commitments:
1. **Frontend Core:** React 18.3+ with TypeScript 5.5+ and Vite 5.4+.
2. **Routing:** React Router DOM (v6.28+) with declarative route trees, nested routes, and deep-linkable URLs.
3. **Design System:** SAP Fiori Horizon enterprise palette (Navy `#142C40`, Teal `#28718A`, Neutral Surface `#FFFFFF`, Canvas `#F5F7F9`).
4. **Mock Service Layer:** Typed asynchronous services (`services/mock/*`) simulating real network latencies, returning synthetic yet technically accurate SAP data, and persisting mutations in browser `localStorage`.
5. **No AI Conversational Paraphernalia:** Strictly no chatbot sidecars, glowing gradients, or robot illustrations.

---

## 5. Consequences & Trade-Offs

### Positive Consequences
- **Rapid Local Development:** Sub-second Vite HMR allows instantaneous iteration on complex multi-tab workspaces.
- **Future-Proof CAP Readiness:** The `apiClient.ts` and service interface contracts mirror future CAP OData V4 entity structures, enabling rapid backend integration.
- **Zero Cloud Costs During Sprint 1:** Fully testable and demonstrable without incurring BTP Cloud Foundry or HANA Cloud capacity unit costs.

### Negative Consequences & Mitigations
- **Simulated Connectivity:** Connection test actions are simulated and cannot verify live Cloud Connector network packets.  
  *Mitigation:* All simulated actions carry a prominent, unambiguous visual indicator: `SIMULATED LOCAL DEMO`.
- **Client-Side Persistence Scope:** Demo mutations are local to the browser's `localStorage` and not shared across machines.  
  *Mitigation:* A "Reset Demo Data" action is provided in Settings to restore the pristine seed state at any time.

---

## 6. Approval & Sign-Off

| Role | Decision | Date |
|---|---|---|
| **Principal Frontend Architect** | **APPROVED** | 02 Nov 2026 |
| **Senior React Engineer** | **APPROVED** | 02 Nov 2026 |
| **SAP Fiori UX Specialist** | **APPROVED** | 02 Nov 2026 |
