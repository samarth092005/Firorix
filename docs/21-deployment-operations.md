# Deployment and Operations
Environments: DEV, QA, PROD. Keep configuration, destinations, identity and data isolated.

Use SAP BTP Cloud Foundry. Pin supported runtime/tool versions. Use MTA if multi-module deployment requires it. Keep service bindings and destination configuration environment-specific. Use CI/CD with tests and approval gates.

Do not store durable generated files on ephemeral app-instance filesystem. Preferred storage: SAP Document Management Service if entitled and suitable repository option is available. Otherwise use an organisation-approved durable repository. Store file reference, checksum, size, MIME type, version and ACL metadata in HANA.

Operations: structured logs, health checks, correlation IDs, job metrics, destination diagnostics and audit. Confirm HANA and document repository backup/restore policies and test recovery. Define RPO/RTO with business/platform owners.

Production gate: security review, load tests, restore tests, monitoring, runbooks, SAP DEV/QAS validation, UAT and support ownership.
