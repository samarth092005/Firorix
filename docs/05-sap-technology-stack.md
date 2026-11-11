# SAP Technology Stack
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

| SAP / Platform Technology | Purpose in FioriX | Architectural Decision / Governance Caveat |
|---|---|---|
| **SAP S/4HANA On-Premise** | Target system for discovery & generation | **CONFIRMED BASELINE.** Target sandbox (e.g. Client 200). ECC is strictly out of scope. |
| **SAP BTP Cloud Foundry** | Eventual cloud runtime environment | **CONFIRMED RUNTIME.** Multi-tenant CF environment hosting App Router and CAP backend. |
| **SAP CAP (Node.js/TypeScript)** | Main backend domain framework | **CONFIRMED BACKEND.** Modular monolithic CAP application exposing OData V4 services. |
| **CAP CDS (`@sap/cds`)** | FioriX domain persistence & service modeling | **CONFIRMED.** Distinct from ABAP CDS; compiles to SQLite locally and HANA Cloud DDL. |
| **SAP HANA Cloud** | Enterprise persistence on BTP | **CONFIRMED FOR PRODUCTION.** Managed via HDI Container. SQLite used for local development. |
| **React 18 + TypeScript + Vite** | FioriX web client & workbench | **CONFIRMED FRONTEND.** Implemented with SAP Fiori Horizon design system and tokens. |
| **UI5 Web Components for React** | Selective SAP-aligned UI controls | **CONFIRMED COMPONENT STRATEGY.** Adopted where complex SAP behaviors are required. |
| **BTP Managed Application Router**| Ingress, routing & authentication | **CONFIRMED INGRESS.** Handles session authentication and routes traffic to CAP backend. |
| **HTML5 Application Repository** | Static UI asset hosting | **CONFIRMED FOR DEPLOYMENT.** Serves bundled React frontend assets in Cloud Foundry. |
| **SAP Cloud Identity / XSUAA** | Authentication and RBAC scopes | **CONFIRMED SECURITY.** JWT validation enforcing roles (`FioriX_Consultant`, `FioriX_Architect`, etc.). |
| **SAP BTP Destination Service** | Credential and endpoint proxy | **CONFIRMED CONNECTIVITY.** Resolves S/4HANA on-premise connection parameters securely. |
| **SAP BTP Connectivity Service** | Cloud Connector tunnel proxy | **CONFIRMED CONNECTIVITY.** Bridges CF container to the on-premise Cloud Connector instance. |
| **SAP Cloud Connector (SCC)** | Private network reverse tunnel | **CONFIRMED TUNNEL.** On-premise agent mapping virtual hosts to S/4HANA DEV sandbox. |
| **ADT REST Resources (`/sap/bc/adt/*`)**| ABAP repository discovery | **CONFIRMED INTERFACE.** Read-only inspection of programs, packages, CDS, and where-used. |
| **ABAP CDS View Entities** | S/4HANA target data model | **CONFIRMED TARGET.** Generated custom app drafts use `DEFINE ROOT VIEW ENTITY`. |
| **RAP (RESTful Application Model)**| ABAP business object & service model | **CONFIRMED TARGET.** Service Definitions (`SRVD`) and Bindings (`SRVB`) for OData V4. |
| **SAP Gateway / OData Catalogs** | Existing service discovery | **CONFIRMED INTERFACE.** Querying published services (`/iwbep/catalog`, `/IWFND/CATALOGSERVICE`). |
| **SAP Fiori Elements Floorplans** | Generated target UI pattern | **CONFIRMED DRAFT TARGET.** Generates List Report and Object Page (`sap.fe.templates`). |
| **SAP Document Management (DMS)**| Durable artifact storage | **CONDITIONAL.** Preferred durable repository. HANA Cloud LOB table used as zero-cost fallback. |
| **SAP Application Logging Service**| Runtime observability | **CONDITIONAL.** Platform logging on BTP CF. Standard structured console logs fallback. |
| **SAP Audit Log Service** | Security compliance audit | **CONDITIONAL.** Supplements append-only domain `AUDIT_EVENT` table in HANA Cloud. |
| **SAP AI Core / GenAI Hub** | Optional advisory analysis | **CONDITIONAL.** Isolated behind an abstract provider interface; disabled by default. |
| **CTS / Transport System** | SAP lifecycle & transport management | **EXCLUDED FROM SCOPE.** FioriX never creates transports or executes automated writes. |

### Critical Architectural Distinctions
- **CAP CDS vs. ABAP CDS:** CAP CDS (`@sap/cds`) models the FioriX cloud database; ABAP CDS (`DEFINE VIEW ENTITY`) is the generated target on S/4HANA.
- **FioriX Workbench vs. Generated Apps:** FioriX is built in React 18 with Fiori Horizon tokens; generated custom drafts are SAP Fiori Elements consuming S/4HANA RAP services.
- **Connectivity vs. Authorization:** Cloud Connector provides network reachability; SAP user roles (`S_DEVELOP`, `S_TABU_DIS`, `S_ADT_RES`) govern object access.
- **Static Discovery vs. Dynamic Call Graph:** ADT provides static structural dependencies; dynamic calls (`SUBMIT (var)`) remain classified as `UNKNOWN`.
