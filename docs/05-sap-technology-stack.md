# SAP Technology Stack
| SAP technology | Purpose | Decision / caveat |
|---|---|---|
| SAP BTP Cloud Foundry | Runtime | Selected |
| SAP CAP Node.js/TypeScript | Main backend | Selected |
| CAP CDS | FioriX domain model/services | Not the same as ABAP CDS |
| SAP HANA Cloud | FioriX database | Selected; plan/sizing to verify |
| SAPUI5 freestyle | FioriX frontend | Selected |
| SAP Fiori design principles | UX | Selected |
| Application Router | Entry/auth/routing | Managed router preferred if sufficient |
| HTML5 Application Repository | UI hosting | Recommended |
| XSUAA / Identity Services | Identity and authorization | Verify setup |
| Destination Service | SAP connection configuration | Recommended |
| Connectivity Service | Proxy to Cloud Connector | If on-prem route used |
| SAP Cloud Connector | Private SAP access | Requires approved mappings |
| ADT | ABAP repository search/inspection | Resources depend on release and permissions |
| ABAP CDS | S/4HANA data model | Different from CAP CDS |
| RAP | ABAP service/business object model | Only where target release supports it |
| Service Definition (SRVD) | Selects CDS entities for service | RAP artifact |
| Service Binding (SRVB) | Binds service to protocol | V2/V4 availability is release-specific |
| SAP Gateway / OData | Existing services | System/service-specific |
| SAP Fiori elements | Generated metadata-driven UI | Consumes OData and annotations |
| SAP Fiori Tools / BAS / VS Code | Project tooling | Verify versions and installed extensions |
| ATC / ABAP Unit | ABAP validation | Target configuration required |
| DMS | Durable document storage | Conditional on entitlement/repository option |
| Application Logging | Runtime logs | Recommended if entitled |
| Audit Log | Platform audit events | Supplement domain audit in FioriX |
| Job Scheduling | Scheduled refresh/housekeeping | Optional |
| Event Mesh | Event-driven integration | Not required initially |
| SAP AI Core / GenAI Hub | Governed AI | Optional, entitlement and data-policy dependent |
| CTS / transport | Approved ABAP lifecycle | FioriX does not replace SAP transport |

Important distinctions: CAP CDS ≠ ABAP CDS; SAPUI5 ≠ Fiori elements; ADT does not guarantee complete runtime call graph; Cloud Connector is connectivity, not discovery.
