# Security, Authorization & Governance Architecture
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. Enterprise Security Baseline

1. **BTP Identity & RBAC Scopes:** Authentication terminates at the SAP BTP Managed Application Router integrated with SAP Cloud Identity Services / XSUAA (`xs-security.json`). Role collections map enterprise personas:
   - `Fiorify_Viewer`: Read-only access to completed assessments.
   - `Fiorify_Consultant`: Discovery execution, requirement definition, and requirement confirmation.
   - `Fiorify_Developer`: Blueprint inspection, draft code generation, and ZIP export.
   - `Fiorify_Architect`: Full administrative and architectural sign-off authority.
   - `Fiorify_Admin`: System registration and BTP destination configuration.
2. **On-Premise Least-Privilege Technical User (`Z_Fiorify_DISCOVERY_RO`):**
   - Strictly read-only display permissions.
   - `S_DEVELOP`: Activity 03 (Display) restricted to metadata packages.
   - `S_TABU_DIS` / `S_TABU_NAM`: Display access restricted to `TSTC`, `TSTCT`, `TADIR`, `DD02L`, `DD03L`, `USOBX_C`, `USOBT_C`.
   - `S_ADT_RES`: Resource access to `/sap/bc/adt/discovery` and `/sap/bc/adt/repository/*`.
   - Explicit exclusion of RFC gateway execution and transport administration (`S_TRANSPRT`).
3. **Cloud Connector Network Containment:**
   - Whitelist restricted exclusively to `/sap/bc/adt` and `/sap/opu/odata`.
   - Explicitly deny `/sap/bc/rfc`, `/sap/bc/gui`, and `/sap/bc/webdynpro`.
4. **Append-Only Tamper-Evident Audit Ledger:**
   - Every sensitive mutation (system registration, requirement confirmation, recommendation recording, draft generation, and stakeholder approval) creates an immutable `AUDIT_EVENT` record containing `timestamp`, `userId`, `userRole`, `actionVerb`, `entityType`, `entityId`, `outcome`, and a unique `correlationId`.
