# Fiori Catalogue & Fit-Gap Methodology
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. Catalog Sourcing & Acquisition Policy

The **SAP Fiori Apps Reference Library** (`fal.cloud.sap`) serves as the authoritative standard for SAP Fiori catalog intelligence.

### Gating Invariant: Rejection of Live Scraping
- `fal.cloud.sap` has **no public REST API** for automated harvesting. Automated headless web scraping is prohibited by SAP terms of service, unstable, and prone to DOM redesign breakages.
- **Sanctioned Method:** FioriX ingests an **officially exported, curated offline catalog dataset** (Excel/JSON export) seeded into the `FIORI_APP` and `APP_RELEASE` database tables.
- Standard SAP applications are maintained in distinct partitions from customer-specific custom applications (`isCustom = true`).

---

## 2. Capability Matching Taxonomy & Fit-Gap Statuses

Every confirmed business requirement (`REQUIREMENT`) is evaluated against candidate Fiori application capabilities (`APP_CAPABILITY`).

| Status | Definition & Technical Threshold | Evidence Required | Permitted Decision Outcome |
|---|---|---|---|
| **`SUPPORTED`** | Standard Fiori app natively satisfies the requirement out-of-the-box. | Verified feature in official FAL documentation or SAP standard app help. | **ADOPT** (if all critical requirements met) |
| **`PARTIAL`** | Standard Fiori app covers the core flow; gap can be bridged via standard extensibility. | Documented extension point: Key-User Custom Fields, or developer BAdI. | **EXTEND** |
| **`UNSUPPORTED`** | Standard Fiori app fundamentally lacks capability; material functional gap. | Negative evidence confirmed by functional consultant; no standard BAdI exists. | **BUILD** (if justified) |
| **`UNKNOWN`** | Insufficient documentation or unverified custom logic. | Missing documentation; requires sandbox functional testing. | **REVIEW** (Never BUILD) |

### The Golden Invariant
> **`UNKNOWN` MUST NEVER BE TREATED AS `UNSUPPORTED`.**  
> Missing evidence mandates functional investigation (`REVIEW`). It must never automatically justify custom code generation.

---

## 3. Governed Recommendation Policy

1. **`ADOPT`**: Recommended when standard SAP Fiori application meets 100% of critical confirmed business requirements (`priority = 'MUST'`).
2. **`EXTEND`**: Recommended when standard app satisfies the core business flow, and all remaining gaps are covered by supported in-app custom fields or released developer BAdIs.
3. **`BUILD`**: Recommended only when material functional gaps exist that cannot be addressed by standard apps or extension points, AND a business justification charter is verified.
4. **`REVIEW`**: Recommended whenever critical requirements are unconfirmed, catalog documentation is incomplete, or release compatibility is unverified.
