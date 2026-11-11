# ADR-0010: Six Primary Navigation Areas and Assessment Workspace Consolidation
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Senior Enterprise UX Architect, Product Architect, Lead Frontend Engineer  
**Technical Scope:** Frontend Navigation Restructuring & Workspace Encapsulation  

---

## 1. Context and Problem Statement
The initial frontend release expanded into 9 top-level sidebar groups and detached child workflows (Requirements, Fit-Gap, Recommendations, Generation Studio) into standalone pages. This created UI clutter and severed the architectural connection between an Assessment and its constituent stages.

## 2. Decision
1. **Six Primary Navigation Areas:** The primary navigation sidebar is formally restricted to exactly six areas:
   1. **Dashboard** (`/dashboard`)
   2. **SAP Landscape** (`/systems`)
   3. **Discovery** (`/explorer`, `/jobs`)
   4. **Assessments** (`/assessments`, `/assessments/new`, `/assessments/:id`)
   5. **Fiori Catalogue** (`/catalogue`)
   6. **Governance** (`/validation`, `/approvals`, `/audit`)
2. **Settings Access via Header:** Settings is removed from the sidebar and integrated directly into the TopBar user profile menu.
3. **Assessment Workspace Encapsulation:** The Assessment Workspace (`/assessments/:id`) is established as the single, authoritative home for the assessment lifecycle, consolidating the following 9 sections:
   - 1. Overview
   - 2. Technical Analysis
   - 3. Business Context & Requirements (Combined into a unified functional section)
   - 4. Fiori Discovery
   - 5. Fit-Gap Analysis
   - 6. Recommendation
   - 7. Generation Studio (Gated behind approved BUILD)
   - 8. Validation
   - 9. History & Audit
4. **Deprecation of Detached Sidebar Routes:** Top-level standalone routes for `/requirements`, `/fit-gap`, `/recommendations`, and `/generation` are removed from the sidebar. Navigating to them redirects users to the appropriate Assessment Workspace.

## 3. Consequences
- **Positive:** Intuitive, streamlined enterprise UX; eliminates navigation fatigue; enforces proper domain entity ownership and lifecycle progression.
- **Trade-off:** Existing users of detached standalone routes must be redirected to the assessment workspace.
