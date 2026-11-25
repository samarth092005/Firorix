# Fiorify Cloud Foundry Database Service Binding Configuration (DB-005)
**Document Version:** 1.0.0  
**Target Environment:** SAP BTP Cloud Foundry Runtime

---

## 1. Cloud Foundry VCAP_SERVICES Binding Resolution

In SAP BTP Cloud Foundry, service credentials are injected by the runtime via the `VCAP_SERVICES` environment variable.

Fiorify's `HanaAdapter` and `DatabaseAdapterFactory` parse `VCAP_SERVICES` automatically:

```json
{
  "hana": [
    {
      "label": "hana",
      "name": "fiorify-hana-db",
      "plan": "hdi-shared",
      "credentials": {
        "host": "c33b285f-hana.prod.eu10.hanacloud.ondemand.com",
        "port": "443",
        "user": "FIORIFY_HDI_OWNER",
        "password": "****************",
        "schema": "FIORIFY_PROD_SCHEMA",
        "url": "jdbc:sap://c33b285f-hana.prod.eu10.hanacloud.ondemand.com:443?encrypt=true&validateCertificate=true",
        "certificate": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
      }
    }
  ]
}
```

---

## 2. Binding Extraction Priority Hierarchy

1. **Explicit Options Object:** Configured directly in application code or integration test fixture (`options.connectionParams`).
2. **Cloud Foundry VCAP_SERVICES:** First binding matching label `'hana'` or `'hanatrial'`.
3. **Discrete Environment Variables:**
   - `HANA_HOST`
   - `HANA_PORT` (Default: 443)
   - `HANA_USER`
   - `HANA_PASSWORD`
   - `HANA_SCHEMA`
   - `HANA_ENCRYPT` (Default: true)
   - `HANA_SSL_VALIDATE` (Default: true)

---

## 3. Validation Errors & Diagnostics

| Error Condition | Error Code | Action / Remediation |
| :--- | :--- | :--- |
| `NODE_ENV=production` with `dialect=postgres` | `FATAL_PRODUCTION_DATABASE_MISMATCH` | Change configuration to SAP HANA Cloud; PostgreSQL is strictly prohibited in production. |
| `NODE_ENV=production` with missing `VCAP_SERVICES` | `MISSING_PRODUCTION_HANA_BINDING` | Bind the `fiorify-hana-db` service instance to the application in BTP cockpit or `mta.yaml`. |
| Connection timeout or network partition | `DATABASE_CONNECTION_TIMEOUT` | Verify BTP egress network security groups and Cloud Connector availability. |
