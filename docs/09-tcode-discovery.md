# T-Code Discovery
1. Validate user/system access.
2. Validate T-Code and create assessment/job.
3. Retrieve transaction metadata.
4. Retrieve linked program/package where available.
5. Search repository dependencies using supported ADT resources.
6. Retrieve CDS/service metadata only where linked or discoverable.
7. Record authorization evidence where available.
8. Normalize object identities and relationships.
9. Persist immutable scan snapshot.
10. Present summary and technical drill-down.

Object categories: transaction, program, include, class, interface, function module, package, table, view, CDS entity, service definition, service binding, OData service, authorization object and enhancement object where discoverable.

Statuses: COMPLETE, PARTIAL, NOT_FOUND, NOT_AUTHORIZED, UNSUPPORTED, NOT_ATTEMPTED, FAILED.

Dynamic calls, enhancements and framework behaviour may remain unknown. Do not infer complete runtime graph from a main program link.
