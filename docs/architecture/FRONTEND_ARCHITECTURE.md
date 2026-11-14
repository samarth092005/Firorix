# Fiorify — Frontend Architecture Specification

## 1. Executive Summary

The Fiorify frontend is a modern single-page application (SPA) built with React 18, TypeScript, and Vite. It implements the SAP Horizon visual design system, combining enterprise density with consumer-grade ergonomics.

---

## 2. Component Hierarchy & Navigation Map

```mermaid
flowchart TD
    subgraph Shell ["Shell & Global Layout"]
        APP["App Root (App.tsx)"]
        AUTH_GUARD["Authentication & Tenant Guard"]
        TOPBAR["Global TopBar (System Profile, Role Badge, Health Indicator)"]
    end

    subgraph Views ["Core Application Workspaces"]
        LANDING["Landing Page (Product Value & KPIs)"]
        OVERVIEW["Landscape Overview & Readiness (S21 Status)"]
        DISCOVERY["Transaction Discovery Workspace (Inspection & Successors)"]
        ASSESSMENTS["Modernization & Fit-Gap Assessments"]
        GEN_STUDIO["Generation Studio (GEN-02..09)"]
        AUDIT_VIEW["Workflow Audit & Compliance Ledger"]
        SYS_SETTINGS["System Configuration & Connectivity"]
    end

    subgraph Studio_SubViews ["Generation Studio Step Navigation"]
        STUDIO_REQ["1. Requirements Designer"]
        STUDIO_DM["2. Data Model & CDS Designer"]
        STUDIO_ARCH["3. Architecture Profile Evaluator"]
        STUDIO_ABAP["4. ABAP Generator (Tables, BDEF, Classes, DCL)"]
        STUDIO_UI5["5. Fiori Elements Generator (LROP, Manifest)"]
        STUDIO_PREV["6. Local Preview & Mock OData V4 (Port 4050)"]
        STUDIO_REV["7. Review, Export & PKZIP Handover"]
        STUDIO_DEP["8. Deployment Workspace & DAG Execution"]
    end

    APP --> AUTH_GUARD --> TOPBAR
    TOPBAR --> Views
    GEN_STUDIO --> Studio_SubViews
```

---

## 3. State Management & API Integration

### 3.1 Modular Domain Services
Frontend state is organized into domain services under `frontend/src/services/` and feature-specific services under `frontend/src/features/*/services/`:
- **`apiClient.ts`**: Centralized HTTP client providing automatic Bearer token injection, tenant header propagation, and standardized error normalization.
- **`assessmentService.ts`**: Coordinates assessment creation, fit-gap recalculation, and Lead Architect approvals.
- **`generationProjectService.ts`**: Manages generation project state, specification updates, artifact commit logs, and mock preview lifecycle.
- **`systemHealthService.ts`**: Monitors target SAP connectivity (S21 Gateway, ADT, Echo) and surfaces live diagnostic telemetry.

### 3.2 Mock Preview Isolation
The only mock component permitted in the user experience is the **Local Ephemeral Mock OData V4 Preview** within Generation Studio (`PreviewValidationView.tsx`):
- Clearly designated with the high-visibility banner:
  `LOCAL MOCK PREVIEW — SYNTHETIC DATA ONLY — NOT CONNECTED TO SAP S21`
- Runs in-process on `http://127.0.0.1:4050` and is completely decoupled from live SAP core writes.
- Action toolbar provides: Restart, Reset Data, Open Tab, Stop Preview, and Next: Review & Export navigation with strict `white-space: nowrap` layout protection.

---

## 4. Quality & Build Performance

- **Unit & Integration Testing**: 204 unit and integration tests executing under Vitest (`npm --prefix frontend test -- --run`).
- **Production Asset Bundling**: Clean production compilation via Vite (`npm --prefix frontend run build`):
  - 2,067 modules transformed in ~10.5 seconds.
  - Chunk splitting: Vendor React (`207 kB`), Vendor PDF (`391 kB`), Vendor Icons (`36 kB`), and feature routes lazy-loaded.
