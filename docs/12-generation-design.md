# Custom Fiori Application Generation Design
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. Governance Gate & Entry Conditions

Custom Fiori generation is **not an arbitrary code generator**. It is locked behind a strict governance gate:
1. Linked assessment recommendation must be formally recorded as **`BUILD`**.
2. All critical business requirements must be **`CONFIRMED`** by a certified functional consultant.
3. An authorized Solution Architect must have recorded an **`APPROVED`** sign-off.
4. Target S/4HANA release profile (e.g. `S/4HANA 2022 FPS02`) must be verified.
5. Generation is restricted to **release-compatible, verified application patterns** (e.g. List Report and Object Page).

---

## 2. Generated Artifact Hierarchy (Clean Core Tier 1)

All generated artifacts adhere strictly to **SAP Clean Core Tier 1** developer extensibility:

```
generated-draft-project/
├── abap/
│   ├── cds/
│   │   ├── Z_I_CustomEntityRoot.cds      # Root View Entity (define root view entity ...)
│   │   ├── Z_I_CustomEntityItem.cds      # Composition Item View Entity
│   │   └── Z_C_CustomEntityManage.cds    # Consumption Projection View Entity
│   ├── dcl/
│   │   └── Z_I_CustomEntityRoot.dcl      # Access Control definition (@AccessControl.authorizationCheck)
│   ├── srvd/
│   │   └── ZSD_CUSTOM_ENTITY.srvd        # RAP Service Definition exposing projection views
│   └── srvb/
│       └── ZSB_CUSTOM_ENTITY_V4.srvb     # Service Binding metadata (OData V4 - UI)
└── ui5/
    └── webapp/
        ├── manifest.json                 # SAP Fiori Elements OData V4 descriptor
        ├── Component.js                  # Standard Fiori Elements Component extension
        └── i18n/
            └── i18n.properties           # Translatable UI labels and facet headers
```

---

## 3. Template Versioning & Draft Storage

- **Semantic Template Versioning:** Generator templates are tagged with semantic versioning (e.g. `TEMPLATE-LROP-V4-2022.1.0`) linked directly to target S/4HANA release profiles.
- **Draft-Only Status:** All generated outputs are exported as reviewable draft files (ZIP archive). **Under no circumstances does Fiorify execute automated CTS transport creation or activation on the S/4HANA host.**
- **Developer Review Workflow:** Developers import the generated draft files into their isolated S/4HANA DEV sandbox using Eclipse ADT or abapGit, running local syntax checks and ATC variants before any transport request is assigned.
