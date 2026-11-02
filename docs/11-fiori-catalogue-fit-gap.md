# Fiori Catalogue and Fit-Gap
Primary source: SAP Fiori Apps Reference Library (https://fal.cloud.sap). Verify permitted data acquisition and update method; do not assume unrestricted scraping or public API.

Catalogue fields: app ID, name, source URL, type, business role/process, product version, software components, OData services/protocol, prerequisites, configuration, extensibility, capabilities, verification date.

Keep standard SAP apps separate from customer-specific apps.

Match statuses: SUPPORTED, PARTIAL, UNSUPPORTED, UNKNOWN. UNKNOWN is not UNSUPPORTED.

Decision:
- ADOPT: critical confirmed requirements supported.
- EXTEND: standard app is suitable and supported extension mechanism can address gap.
- BUILD: material requirements remain unmet and custom app is justified.
- REVIEW: evidence, requirements or compatibility incomplete.

Any score is advisory. Evidence and critical requirements govern.
