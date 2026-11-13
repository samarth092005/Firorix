# UI/UX Architecture & Page Specifications
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. Enterprise UX Philosophy & Visual Identity

Fiorify is engineered as a calm, high-density, professional enterprise workbench. It follows the **SAP Fiori Horizon** enterprise design system:
- **No AI Hype Clichés:** No robot illustrations, no glowing borders, no pulsating gradients, and no conversational chatbot sidecars.
- **High Information Density with Visual Restraint:** Clean typography, compact data tables, clear visual hierarchy, and restrained padding.
- **Semantic Color Usage:** Color strictly indicates system health, lifecycle status, test results, and governance decisions.

---

## 2. Global Shell & Navigation Framework

```
+----------------------------------------------------------------------------------------------------+
| [=] Fiorify  [ LOCAL DEMO ]        (Global Search)              [🔔] [⚙️ Settings] [👤 Elena (Lead)]|
+------------------+---------------------------------------------------------------------------------+
| 1. Dashboard     | Breadcrumbs: Home > Assessments > ASMT-0001 (ME21N)                             |
| 2. SAP Landscape |---------------------------------------------------------------------------------|
| 3. Discovery     | ME21N: Create Purchase Order Modernization Assessment                           |
| 4. Assessments   | System: S4H_DEV_100  |  Status: IN_PROGRESS  |  Progress: 65%   [Generate Draft]   |
| 5. Fiori Catalog |=================================================================================|
| 6. Governance    | [1.Overview] [2.Tech] [3.Context & Reqs] [4.Discovery] [5.FitGap] [6.Rec] ...   |
|                  |---------------------------------------------------------------------------------|
|                  | (Tab Content Viewport: High-Density Enterprise Data Tables & Modals)            |
+------------------+---------------------------------------------------------------------------------+
```

### 2.1 The Six Primary Navigation Areas
1. **Dashboard (`/dashboard`):** 4 core metric tiles (Transactions Assessed, Fiori Apps Evaluated, Open Functional Gaps, Draft Applications), recent assessment table with progress bars, connected landscape health summary, and recent discovery activity feed.
2. **SAP Landscape (`/systems`):** Registered S/4HANA systems, destination references, environment tiers, and simulated connection test action with latency and capability tags. Detail view at `/systems/:id`.
3. **Discovery (`/explorer`, `/jobs`):**
   - *Transaction Explorer:* Searchable repository of SAP standard and custom transactions (`SD`, `MM`, `FI`, `CUSTOM`). Detail view at `/explorer/:tcode`.
   - *Discovery Jobs:* Asynchronous scan execution monitor with progress bars, stage details, and error telemetry.
4. **Assessments (`/assessments`, `/assessments/new`, `/assessments/:id`):**
   - *All Assessments:* Master register filterable by lifecycle status, outcome, and system.
   - *New Assessment:* Guided 5-step wizard (System $\rightarrow$ T-Code $\rightarrow$ Scope $\rightarrow$ Governance $\rightarrow$ Review & Submit).
   - *Assessment Workspace:* The unified 9-tab workbench.
5. **Fiori Catalogue (`/catalogue`):** Curated official SAP Fiori Apps Reference Library records (`fal.cloud.sap`), search by App ID (e.g. `F1814`) or role, and manifest detail view (`/catalogue/:id`).
6. **Governance (`/validation`, `/approvals`, `/audit`):**
   - *Validation Centre:* Clean Core Tier 1, security, and release compatibility check findings.
   - *Approvals:* Stakeholder architectural sign-off gate before draft export.
   - *Audit Logs:* Append-only immutable domain event trail with timestamps and correlation IDs.

*Settings is accessible via the application header.*

---

## 3. The Unified Assessment Workspace (`/assessments/:id`)

The Assessment Workspace consolidates all stages of a transaction evaluation into a single 9-tab container:

1. **Tab 1: Overview:** Executive summary, target system, business area, timestamps, assigned reviewer, and decision snapshot.
2. **Tab 2: Technical Analysis:** Interactive table of discovered ABAP programs, includes, DDIC tables, and SU24 authorization objects with raw ADT evidence modal.
3. **Tab 3: Business Context & Requirements:** Process documentation (Order-to-Cash, Procure-to-Pay), actors, activities, primary inputs/outputs, and confirmed business requirements table with Add/Edit dialogs.
4. **Tab 4: Fiori Discovery:** Candidate standard SAP Fiori apps cross-referenced from the curated catalog with relevance indicators.
5. **Tab 5: Fit-Gap Analysis:** Requirement-to-app comparison grid with coverage indicators (`SUPPORTED`, `PARTIAL`, `UNSUPPORTED`, `UNKNOWN`) and expandable gap explanations.
6. **Tab 6: Recommendation:** Adopt / Extend / Build / Review decision workspace with architectural rationale, unresolved questions, and citations.
7. **Tab 7: Generation Studio:** Structured application blueprint, RAP entity composition tree, and syntax-highlighted code viewers for CDS DDL, `SRVD`, and `manifest.json`. **Strictly locked unless recommendation is `BUILD` and status is `APPROVED`**.
8. **Tab 8: Validation:** Automated Clean Core Tier 1 compliance checks, security checks, and syntax findings for generated drafts.
9. **Tab 9: History & Audit:** Chronological, tamper-evident timeline of state transitions and reviewer comments.
