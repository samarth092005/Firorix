# Fiorify — SAP S/4HANA Fiori Modernization Workbench

**Target Platform:** SAP S/4HANA 2023 (`S4CORE 108`, `SAP_BASIS 758`, `SAP_UI 758`)  
**UI & Backend Standards:** SAP Fiori Elements (OData V4, SAPUI5 1.120) & ABAP Cloud / RAP (Clean Core Tier 1 & Tier 2)

---

## 1. What Fiorify Does

Fiorify helps SAP teams move from classic SAP GUI transactions (like `ME21N`, `VA01`, `F-53`, `ST22`, or custom `Z*` / `Y*` transactions) to modern **SAP Fiori** applications—quickly, safely, and without breaking SAP Clean Core rules.

Our guiding principle is simple:

> **Use standard SAP Fiori wherever it already exists. Build custom RAP applications only when there is a real functional gap.**

---

## 2. The Problem It Solves

During an S/4HANA transformation or Fiori rollout, teams typically run into three bottlenecks:

1. **Slow Manual Assessment:** Checking whether a classic transaction has a standard Fiori replacement requires inspecting SAP Data Dictionary (DDIC) tables, searching through 18,000+ apps in the SAP Fiori Apps Reference Library, and checking roles and OData services. Doing this manually takes hours or days per transaction.
2. **Long Custom Build Cycles:** When no standard Fiori app exists (common for custom `Z*` transactions), building a new ABAP RAP backend and Fiori Elements V4 frontend from scratch—database tables, draft tables, CDS views, behavior definitions, access controls, service definitions, and UI annotations—takes 2 to 4 weeks per app.
3. **Risk to Live SAP Systems:** Teams need a way to inspect transactions and prototype modern replacements without making accidental changes or transports in live SAP landscapes.

Fiorify brings discovery, fit-gap governance, rapid code generation, live UI preview, and developer handover into one guided workspace.

---

## 3. How Fiorify Works (End-to-End Flow)

### Step 1: Transaction Discovery
* Enter any SAP transaction code (standard or custom `Z*` / `Y*`) and select the target SAP landscape (for example, `S21` Client `200`).
* Fiorify runs a **strictly read-only** check against the SAP Data Dictionary (`TSTC`, `TSTCT`, `TADIR`, `TDEVC`, `CVERS`) to confirm:
  * Does the transaction exist in SAP?
  * Is it a standard SAP object or a custom `Z*` object?
  * What is its main ABAP program, screen number, package, and software component?
* In parallel, Fiorify searches the **18,000+ app SAP Fiori Apps Reference Library** (with optional SAP Fiori MCP assistance) and pops up an instant **Verification Summary** showing whether a standard Fiori app exists or if there is a functional gap.

### Step 2: Assessment & Modernization Decision
Every transaction moves through a clear 3-tab evaluation:
1. **Verdict & Recommendation:** Overall match status, transaction profile, and top Fiori candidates.
2. **Fit-Gap & Scope Matrix:** Requirement-by-requirement comparison against standard Fiori capabilities.
3. **Modernization Decision:** Enforces two clear outcomes:
   * **Adopt & Configure (`ADD_AND_CONFIGURE`):** When a standard Fiori app fits. Fiorify lists the exact Fiori App ID, PFCG Business Role, OData Service, SICF Path, and Business Catalog—plus a one-click **Basis Activation Runbook (`.md`)** for the Basis and Security teams.
   * **Custom Build (`BUILD`):** When no standard Fiori app exists or a genuine gap is proven. After **Lead Architect Sign-Off**, the transaction is handed over to Generation Studio.

### Step 3: Generation Studio (4-Stage Build Pipeline)
For approved `BUILD` projects, Generation Studio guides the team from specification to working preview:

1. **Scope & CDS Data Model:**
   * Imports business context from the assessment and classifies the transaction across 10 SAP domain archetypes (`MM`, `FI`, `SD`, `PP`, `PM`, `QM`, `WM`, `HCM`, `BASIS`, and `UNIVERSAL` for custom `Z*` apps).
   * Proposes confirmed requirements and a multi-entity CDS Data Model (Header + Child Item compositions, SAP DDIC data types, and `C1`-released value helps).
2. **Architecture & 13-Gate Governance:**
   * Recommends the right RAP profile (such as `Managed RAP with Draft`, Unmanaged, or Read-Only Query).
   * Runs a **13-Gate Readiness Check**, locks an immutable **Specification Snapshot**, and records **Architect Approval** before code generation begins.
3. **Code Generation & Live Fiori Sandbox:**
   * Generates ABAP Cloud artifacts: DDIC active & draft tables (`.tabl.sql`), Interface & Projection CDS views (`ZI_*`, `ZC_*`), Behavior Definitions (`.bdef.asbdef`), Behavior Implementation Classes (`BP_*`), DCL Access Controls (`.dcls.asdcls` with domain-specific PFCG objects like `V_VBAK_VKO`, `M_BEST_EKO`, `M_MATE_WRK`, `F_BKPF_BUK`), and Service Definitions (`.srvd.srvdsrv`).
   * Generates the SAP Fiori Elements V4 frontend (`manifest.json`, XML annotations, `ui5.yaml`).
   * Launches an **in-process Mock OData V4 Preview** with synthetic data so stakeholders can test the List Report, Object Page, and Draft behavior before importing anything into SAP.
4. **Review, Export & Staging Handover:**
   * Runs Clean Core static validation checks and previews the complete file tree.
   * Packages everything into **`Fiorify_Project_Export.zip`**, including `.abapgit.xml`, `TRACEABILITY.md`, `ARCHITECTURE.md`, `ECLIPSE_ADT_HANDOVER_SOP.md`, and SHA-256 checksums.
   * Generates a dependency-ordered **SAP Staging & Preflight Plan** signed with keyed `HMAC-SHA256` and stops cleanly at the **SAP Write Boundary**.

---

## 4. Built-In Safety & Governance

* **Zero SAP Writes:** Fiorify only issues read-only HTTP `GET` and `HEAD` requests to SAP. It never creates, edits, locks, activates, or transports objects in a live SAP system.
* **Separation of Duties:** Assessment creators cannot self-approve their own custom build handoffs without proper administrative/architect authorization.
* **Cryptographic Integrity:** Exported bundles include SHA-256 file digests, and deployment staging approvals are signed using keyed `HMAC-SHA256`.
* **Developer-First Handover:** Generated Behavior Pool classes (`BP_*`) include defensive EML boilerplate (`READ ENTITIES ... IN LOCAL MODE`) and clear handover notes so ABAP developers know exactly where to plug in custom business validations inside Eclipse ADT.

---

## 5. Final Deliverables for Customers

| Scenario | What the Team Receives |
|---|---|
| **Standard Fiori Match (`ADD_AND_CONFIGURE`)** | Verified Fiori App ID, PFCG Role, OData Service, SICF Path, Catalog ID, and a downloadable **Basis Activation Runbook (`.md`)**. |
| **Custom RAP Build (`BUILD`)** | A complete **`Fiorify_Project_Export.zip`** containing ABAP Cloud source files, Fiori Elements V4 `webapp`, `.abapgit.xml` for abapGit import, Eclipse ADT activation sequence SOP, and end-to-end traceability documentation. |
