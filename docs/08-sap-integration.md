# SAP Integration
Target: S/4HANA On-Premise only.

Proposed route: CAP/worker → Destination Service → Connectivity Service → Cloud Connector → approved S/4HANA endpoint.

Candidate interfaces:
- ADT resources for repository search/inspection.
- Existing OData services where suitable.
- Narrow custom ABAP read-only metadata service only if standard interfaces do not expose needed data and SAP team approves.

Sprint 1 must verify S/4HANA and ABAP release, ADT resources, authentication, authorizations, allowed object types, Cloud Connector mapping, source-code permissions, rate/concurrency limits and operational impact.

Connector methods may include `testConnection`, `getSystemInfo`, `getTransactionMetadata`, `searchRepositoryObjects`, `getObjectDetails`, `getWhereUsed` (where supported), `getServiceMetadata`.

Each result includes system, object identity/type, source interface, timestamp, scan ID, evidence reference and status.

Initial connector is read-only. Do not expose arbitrary SQL, unrestricted RFC or generic code execution.
