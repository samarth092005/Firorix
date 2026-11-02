# Custom Fiori Generation
Entry conditions: approved BUILD decision, confirmed requirements, target release, supported generation profile, reviewed data source and authorization model.

Structured app specification:
```json
{
  "projectId": "GEN-0001",
  "assessmentId": "ASM-0001",
  "targetReleaseProfile": "S4_PROFILE",
  "applicationPattern": "LIST_REPORT_OBJECT_PAGE",
  "dataModel": {"entities": [], "associations": []},
  "serviceModel": {"protocol": "RELEASE_COMPATIBLE", "exposedEntities": []},
  "ui": {"fields": [], "sections": [], "actions": [], "navigation": []},
  "businessRules": [],
  "authorizations": [],
  "validations": []
}
```

Potential artifacts: ABAP CDS view entities/projections, metadata extensions/UI annotations, RAP behavior definitions/implementations where supported, service definitions/bindings, SAPUI5/Fiori elements project, manifest, routing and i18n.

Use release-specific templates. Do not generate arbitrary apps from a T-Code alone. Record template version and artifact checksum. No automatic activation or production transport in initial demo. SAP-side activation/service testing is required before claiming deployability.
