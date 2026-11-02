# Validation and Testing
Statuses: PASS, FAIL, WARNING, NOT_EXECUTED, REQUIRES_HUMAN_REVIEW.

Test layers:
1. Unit: CAP logic, fit-gap, decision rules, schemas.
2. Contract: ADT adapter, destination, OData metadata, API schemas.
3. Integration: CAP/HANA, workers, SAP connectivity, storage.
4. UI: navigation, forms, tables, side panels and role visibility.
5. Security: access control, IDOR, injection, uploads, secrets and tokens.
6. Resilience: SAP unavailable, timeout, retry, duplicate job, worker restart, storage failure.
7. Acceptance: functional consultant, ABAP developer and architect review.

SAP-side checks: object existence, CDS syntax/activation in DEV, service binding and OData metadata, ATC/ABAP Unit where configured, generated UI against real service.

A ZIP build or frontend compilation is not proof of deployable SAP app. SAP-side activation and service testing are required.
