# FioriX Navigation Map & Route Hierarchy
**Project:** FioriX — SAP S/4HANA On-Premise Fiori App Discovery, Assessment and Controlled Generation Platform  
**Document Version:** 1.0.0  
**Phase:** Sprint 1 Frontend Implementation  

---

## 1. Master Route Hierarchy

```
/ (Root)
│
├── /dashboard                            [Overview: Executive Metrics, Recent Assessments, Activity]
│
├── /systems                              [Landscape: Registered SAP Systems & Environments]
│   └── /systems/:id                      [Landscape: Deep System Capability & Connection Inspection]
│
├── /explorer                             [Discovery: Transaction Code Repository Explorer]
│   └── /explorer/:tcode                  [Discovery: Deep Technical Object & Dependency Detail]
│
├── /jobs                                 [Discovery: Asynchronous Scan & Discovery Job Monitor]
│   └── /jobs/:id                         [Discovery: Execution Log, Stage Output & Evidence]
│
├── /assessments                          [Assessments: Master Assessment Registry]
│   ├── /assessments/new                  [Assessments: Multi-step Assessment Wizard]
│   └── /assessments/:id                  [Assessments: Full 9-Tab Assessment Workspace]
│
├── /catalogue                            [Fiori Applications: Official & Curated Standard Apps]
│   └── /catalogue/:id                    [Fiori Applications: App Manifest, Prerequisites & Services]
│
├── /requirements                         [Analysis: Business Requirements & Process Matrix]
│
├── /fit-gap                              [Analysis: Requirement-to-App Fit-Gap Matrix]
│
├── /recommendations                      [Analysis: Adopt / Extend / Build / Review Workspace]
│
├── /generation                           [Development: Custom Fiori Generation Studio]
│   └── /generation/artifacts             [Development: Generated Draft Artifact & Code Preview]
│
├── /validation                           [Governance: Quality, Security & Clean-Core Gate]
│
├── /approvals                            [Governance: Stakeholder Sign-Off & Audit Gateway]
│
├── /audit                                [Governance: Immutable Domain & Security Event Log]
│
├── /settings                             [Administration: User Profile, Preferences & Demo Reset]
│
└── *                                     [Fallback: Enterprise 404 Route]
```

---

## 2. Navigation Group Specifications

| Group | Route | Label | Icon Type | Target Persona | Key Actions |
|---|---|---|---|---|---|
| **OVERVIEW** | `/dashboard` | Dashboard | LayoutDashboard | All Personas | Metric overview, quick assessment launch, catalog browse |
| **LANDSCAPE** | `/systems` | SAP Systems | Server | SAP Basis / Architect | Register system, test connection (simulated), view capabilities |
| | `/systems/:id` | System Detail | Server | SAP Basis / Architect | View Cloud Connector, ADT endpoints, client details |
| **DISCOVERY** | `/explorer` | Transaction Explorer | SearchCode | ABAP Dev / Consultant | Search T-Codes, filter by module, inspect programs/tables |
| | `/explorer/:tcode`| T-Code Detail | FileCode | ABAP Dev / Architect | Deep dive into CDS, includes, SU24 authorizations |
| | `/jobs` | Discovery Jobs | Clock | Developer / Ops | Monitor background scans, retry failed discovery |
| **ASSESSMENTS** | `/assessments` | All Assessments | ClipboardList | Consultant / Architect | List, filter, and track lifecycle of assessments |
| | `/assessments/new`| New Assessment | PlusCircle | Consultant / Architect | 5-step wizard to initiate transaction assessment |
| | `/assessments/:id`| Assessment Workspace| Layers | All Personas | Complete 9-stage workbench for discovery through build |
| **FIORI APPS** | `/catalogue` | Fiori Catalogue | Library | Consultant / Architect | Search 2,500+ curated SAP apps, inspect OData services |
| **ANALYSIS** | `/requirements` | Business Requirements| CheckSquare | Functional Consultant | Define, edit, and confirm process rules & validations |
| | `/fit-gap` | Fit-Gap Analysis | GitCompare | Solution Architect | Multi-status matrix (Supported, Partial, Unsupported, Unknown) |
| | `/recommendations`| Recommendations | Compass | Executive / Architect | Review Adopt/Extend/Build recommendations with rationale |
| **DEVELOPMENT** | `/generation` | Generation Studio | Cpu | ABAP / UI5 Developer | Structured blueprint, data model, CDS & RAP proposals |
| | `/generation/artifacts`| Generated Artifacts| FolderGit2 | ABAP / UI5 Developer | Review generated draft files, manifest, UI annotations |
| **GOVERNANCE** | `/validation` | Validation Centre | ShieldCheck | Lead Architect / QA | Clean-core, security, authorization, and syntax findings |
| | `/approvals` | Approvals | UserCheck | Approver / Owner | Formal sign-off gate before draft export |
| | `/audit` | Audit Logs | History | Security / Auditor | Immutable event log with correlation IDs and timestamps |
| **ADMINISTRATION**| `/settings` | Settings | Settings | Administrator | Preferences, theme, demo data reset, version info |

---

## 3. Responsive Navigation Behavior

- **Desktop (>= 1280px):** Permanent 260px expanded sidebar with clear section headers, text labels, and badges. TopBar displays full global search bar and user identity pill.
- **Laptop / Tablet (768px - 1279px):** Collapsible sidebar toggleable via hamburger icon. When collapsed, icons remain accessible with tooltips.
- **Mobile (< 768px):** Off-canvas slide-over drawer with overlay backdrop. Breadcrumbs condense to active parent. Tables support horizontal scrolling with sticky primary columns.
