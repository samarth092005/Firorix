# Fiorify Page Specifications & Screen Contracts
**Project:** Fiorify — SAP S/4HANA On-Premise Fiori App Discovery, Assessment and Controlled Generation Platform  
**Document Version:** 1.0.0  
**Phase:** Sprint 1 Frontend Implementation  

---

## 1. Page Specifications Index

The frontend release implements 13 comprehensive primary pages and workspaces:

1. **Dashboard (`/dashboard`)**
2. **SAP Systems (`/systems`)**
3. **SAP System Details (`/systems/:id`)**
4. **Transaction Explorer (`/explorer`)**
5. **Transaction Details (`/explorer/:tcode`)**
6. **New Assessment Wizard (`/assessments/new`)**
7. **Assessment Workspace (`/assessments/:id`)**
8. **Fiori Catalogue (`/catalogue`)**
9. **Business Requirements (`/requirements`)**
10. **Fit-Gap Matrix (`/fit-gap`)**
11. **Recommendation Workspace (`/recommendations`)**
12. **Generation Studio (`/generation`)**
13. **Validation Centre (`/validation`)**
14. **Approvals & Governance (`/approvals`)**
15. **Discovery Jobs & Audit Logs (`/jobs`, `/audit`)**
16. **Settings & Demo Configuration (`/settings`)**

---

## 2. Detailed Screen Specifications

### Page 1: Dashboard (`/dashboard`)
- **Header:** Title "Executive Discovery & Assessment Dashboard", Subtitle "Overview of transaction assessments, Fiori coverage, and custom generation candidates".
- **KPI Summary Grid (4 Metrics):**
  1. *Transactions Assessed:* Total count with breakdown of standard vs. custom.
  2. *Standard Fiori Apps Evaluated:* Count of candidate apps explored.
  3. *Open Functional Gaps:* Gaps marked `UNSUPPORTED` or `UNKNOWN`.
  4. *Draft Applications:* Total custom generation blueprints in draft state.
- **Main Section Split:**
  - *Left (65%):* **Recent Assessments Table** with columns: Assessment ID, Target T-Code, SAP System, Recommendation Status (`ADOPT`, `EXTEND`, `BUILD`, `REVIEW`), Progress Bar, and Action ("Open Workspace").
  - *Right (35%):* **Connected Landscape Summary Card** showing live Cloud Connector status, and **Recent Audit Activity Feed** showing timestamps and user actions.
- **Primary Actions:** "Start New Assessment" (navigates to `/assessments/new`) and "Browse Fiori Catalogue" (navigates to `/catalogue`).

### Page 2: SAP Systems (`/systems` & `/systems/:id`)
- **Table Columns:** System Alias, Environment (`DEV`, `QAS`, `PRD`), Destination Name, Host/URL, Target Release (`S/4HANA 2022 FPS02`), Connection Status (`CONNECTED_SIMULATED`, `OFFLINE`), Last Verified Date, Actions (`Inspect`, `Test`, `Edit`).
- **Toolbar:** Filter by Environment, Search by Alias, "Add SAP System" button (opens Modal).
- **Test Connection Feedback:** Triggers simulated network handshake with BTP Destination Service, displaying a prominent badge: `SIMULATED LOCAL TEST — NO REAL CONNECTION`.
- **System Detail View (`/systems/:id`):** Displays Cloud Connector Subaccount mapping, ADT endpoint URL (`/sap/bc/adt`), active Gateway OData services catalog, and assigned technical communication user (`Fiorify_COMM_USR`).

### Page 3: Transaction Explorer (`/explorer` & `/explorer/:tcode`)
- **Filter Bar:** Multi-combobox for SAP Module (`SD`, `MM`, `FI`, `PP`), Type filter (`Standard`, `Custom Z/Y`), Text search input.
- **Data Table:** T-Code, Transaction Text, Program Name, Package, Module, Linked Tables, Assessment Status, Actions ("Assess Now", "Inspect Objects").
- **T-Code Detail Object Page (`/explorer/:tcode`):**
  - *Header Block:* T-Code badge, Program name, Development class, Author, Provenance tag (`VERIFIED ADT METADATA`).
  - *Tabs:*
    - *Overview:* Primary screen, transaction type, GUI parameters.
    - *Programs & Subroutines:* Associated includes, functional groups, and class methods.
    - *Database Tables:* Primary header tables, item tables, views with key column details.
    - *SU24 Authorizations:* Required authorization objects (`S_DEVELOP`, `V_VBAK_VKO`), fields, and activities.
    - *Discovery Evidence:* Timestamp of discovery, response payload size, interface provenance (`ADT REST Resource`).

### Page 4: New Assessment Wizard (`/assessments/new`)
- **Step 1: System Selection:** Dropdown selecting from registered active SAP systems.
- **Step 2: Transaction Selection:** Type-ahead search or direct entry of T-Code. Displays instantaneous verification against local metadata index.
- **Step 3: Discovery Scope:** Checkbox options for *Inspect Program Structure*, *Extract SU24 Authorizations*, *Deep Where-Used Scan (Simulated)*, and *Map Standard Fiori Apps*.
- **Step 4: Evidence & Governance Confirmation:** Checkboxes acknowledging:
  - Technical metadata does not constitute business approval.
  - Read-only discovery mode.
  - Standard Fiori applications will be evaluated before any custom build.
- **Step 5: Review & Submit:** Summary card displaying selected options and estimated scan duration. Submitting creates a new record and dispatches an asynchronous background discovery job.

### Page 5: Assessment Workspace (`/assessments/:id`)
- **Global Header:** Assessment title (e.g. `ASM-2026-001: VA01 Order Creation Migration`), Target System pill, Status pill (`IN_PROGRESS`, `REVIEW_READY`, `APPROVED`), Completion bar (75%), and Assigned Consultant.
- **9 Core Tabs:**
  1. *Overview:* Executive KPI tiles, system attributes, discovery timeline.
  2. *Technical Analysis:* Discovered ABAP components, includes, tables, CDS views.
  3. *Business Context:* Business process description, inputs, outputs, user roles.
  4. *Requirements:* Table of functional requirements with confirmation status.
  5. *Fiori Discovery:* Matching standard SAP Fiori apps with relevance scores.
  6. *Fit-Gap:* Requirement-to-app comparison grid with coverage indicators.
  7. *Recommendation:* Formally recorded decision (`ADOPT`, `EXTEND`, `BUILD`, `REVIEW`) with architectural rationale.
  8. *Generation Blueprint:* Active only if `BUILD` is chosen; displays the draft data model and Fiori Elements floorplan layout.
  9. *Audit History:* Detailed timeline of all state transitions and reviewer comments.

### Page 6: Fiori Catalogue (`/catalogue`)
- **Table Columns:** App ID (e.g. `F1814`), App Name, App Type (`Fiori Elements`, `Freestyle`, `Transactional`), Line of Business, Roles (`Sales Representative`), S/4HANA Releases (`2020, 2021, 2022`), Required OData Service, Extensibility Status.
- **Interactive Detail Drawer:** Clicking an app opens a slide-over panel displaying:
  - Form Factor support (Desktop, Tablet, Phone)
  - Required Software Components (`S4CORE 107`)
  - Target Business Catalogs & Roles
  - Published Extensibility Points (Custom Fields and Logic BAdIs)
  - Direct reference link to official SAP Fiori Apps Reference Library.

### Page 7: Fit-Gap Analysis (`/fit-gap`)
- **Matrix View:** Displays requirement cards on the left mapped against Candidate Fiori Application capabilities on the right.
- **Status Pills:**
  - `SUPPORTED` (Green): Standard app covers the business requirement out-of-the-box.
  - `PARTIAL` (Amber): Minor gap addressable via standard in-app extensibility or developer extension.
  - `UNSUPPORTED` (Red): Core functionality missing from standard app.
  - `UNKNOWN` (Grey): Insufficient documentation; requires functional verification.
- **Expandable Detail:** Each row expands to reveal functional notes, reviewer remarks, and evidence citations.

### Page 8: Generation Studio (`/generation`)
- **Structured Blueprint Sections:**
  - *Header:* Blueprint ID, Target S/4HANA Profile (`S/4HANA 2022 FPS02`), Application Pattern (`List Report & Object Page`).
  - *Entity Model:* Root entity (`Z_I_SalesOrder`), Composition tree, Associations.
  - *CDS View Proposal:* Syntax-highlighted code block with generated DDL.
  - *Service Definition:* Generated `SRVD` code block.
  - *Fiori Elements Manifest:* Generated `manifest.json` and UI annotations.
- **Actions:** "Generate Draft Files" (triggers confirmation dialog), "Export Draft ZIP", and "Run Validation".
- **Governance Banner:** "All generated artifacts are reviewable drafts. Automated activation or transport into SAP systems is strictly disabled."

### Page 9: Validation Centre (`/validation`)
- **Category Filter Tabs:** *All*, *Architecture*, *Clean-Core*, *Security*, *Release Compatibility*.
- **Findings Table:** Rule ID, Finding Summary, Category, Severity (`CRITICAL`, `WARNING`, `INFO`), Status (`PASS`, `FAIL`), Remediation Guidance.
- **Rule Inspector Modal:** Clicking a rule reveals the exact AST or annotation line flagged and references the official SAP Clean Core developer guide.

### Page 10: Settings (`/settings`)
- **Sections:**
  - *User Persona Switcher:* Toggle active role (`SAP Functional Consultant`, `ABAP Developer`, `Solution Architect`, `Administrator`) to simulate role-based navigation.
  - *Demo Mode Controls:* "Reset Local Demo Data" button with confirmation.
  - *Environment Telemetry:* BTP Subaccount details, Node.js runtime version, UI5 Web Components version, Fiorify platform build hash.
