# General Engineering Stack
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

| Technology / Tool | Architectural Purpose | Decision Status & Justification |
|---|---|---|
| **TypeScript 5.5+** | End-to-end type safety | **CONFIRMED.** Used across frontend and CAP backend for strict domain modeling. |
| **Node.js 20 LTS** | Primary runtime environment | **CONFIRMED.** Supported by Cloud Foundry Node.js buildpack and CAP runtime. |
| **React 18.3+** | FioriX web client & workbench | **CONFIRMED FRONTEND.** High developer velocity, rapid HMR, and modular component architecture. |
| **Vite 5.4+** | Frontend build toolchain & dev server | **CONFIRMED BUNDLER.** Sub-second HMR, optimized ESM production bundling, instant startup. |
| **React Router 6.28+** | Client-side routing & navigation | **CONFIRMED ROUTING.** Declarative, nested routing supporting deep-linked workspaces. |
| **SAP Fiori Horizon Design Tokens**| Enterprise visual styling | **CONFIRMED STYLING.** Custom properties (`tokens.css`, `components.css`) matching SAP Horizon. |
| **UI5 Web Components for React** | Selective SAP-aligned controls | **CONFIRMED.** Adopted selectively where complex SAP interactions provide clear value. |
| **Lucide React** | Enterprise iconography | **CONFIRMED ICONS.** High-performance SVG icons matching enterprise visual semantics. |
| **SAP CAP (`@sap/cds`)** | Backend domain framework | **CONFIRMED BACKEND.** Modular monolithic CAP application exposing OData V4 services. |
| **SQLite (`@cap-js/sqlite`)** | Local development persistence | **CONFIRMED LOCAL DB.** Instantaneous in-memory/file-based database with zero cloud cost. |
| **SAP HANA Cloud (`@cap-js/hana`)**| Production persistence on BTP | **CONFIRMED PROD DB.** Managed HDI container persistence with full ACID compliance. |
| **OData V4 Core + REST Actions** | API protocol architecture | **CONFIRMED API.** OData V4 for all entity querying; custom actions for async job commands. |
| **OpenAPI / JSON Schema** | Specification contracts | **RECOMMENDED.** Used for generated blueprint validation and template schemas. |
| **Git** | Version control & peer review | **REQUIRED.** Standard branching, PR reviews, and immutable commit history. |
| **npm** | Package dependency management | **REQUIRED.** Standard Node.js package management with strict lockfiles. |
| **Cloud Foundry CLI (`cf`)** | BTP Cloud Foundry operations | **REQUIRED FOR BTP.** Space management, service binding, and deployment. |
| **Cloud MTA Build Tool (`mbt`)** | Multi-target application packaging | **REQUIRED FOR BTP.** Packages HTML5 repo, CAP backend, and bindings into MTAR archives. |
| **ESLint & TypeScript Checks** | Static code quality & linting | **REQUIRED.** Automated linting and zero-error TypeScript compilation (`tsc --noEmit`). |
| **Playwright / Vitest** | End-to-end & unit testing | **RECOMMENDED.** Vitest for fast service unit tests; Playwright for browser journey verification. |

### Technologies Explicitly Excluded
- **PostgreSQL / AWS RDS:** Excluded. SAP HANA Cloud is the standard BTP persistence layer; SQLite handles local development.
- **Python Workers / Microservices:** Excluded. Node.js/TypeScript CAP services handle all discovery, analysis, and generation tasks.
- **AI Chatbot Frameworks (LangChain, etc.):** Excluded. AI is strictly optional, advisory, and isolated behind an abstract interface.
