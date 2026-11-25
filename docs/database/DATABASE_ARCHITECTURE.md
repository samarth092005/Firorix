# Fiorify Multi-Database Persistence Architecture (DB-002)
**Document Version:** 1.0.0  
**Supported Engines:** Local Development: PostgreSQL 15+ | Production Target: SAP HANA Cloud

---

## 1. Architectural Strategy & Abstraction

Fiorify adopts a vendor-neutral database abstraction layer (`DatabaseAdapter`) to bridge local development agility with enterprise SAP BTP compliance.

```
                      [ Fiorify Repositories & Stores ]
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │    DatabaseAdapterFactory   │
                      │  (Environment Resolution)   │
                      └──────────────┬──────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         │                                                       │
         ▼                                                       ▼
 ┌───────────────────────────────┐               ┌───────────────────────────────┐
 │        PostgresAdapter        │               │          HanaAdapter          │
 │                               │               │                               │
 │ • Local development / CI      │               │ • Production on SAP BTP       │
 │ • Driver: pg (Pool)           │               │ • Driver: @sap/hana-client    │
 │ • Dialect: postgres           │               │ • Dialect: hana               │
 │ • Placeholder: $1, $2, ...    │               │ • Parameter: ?, ?, ...        │
 │ • Session: set_config +       │               │ • Session: Schema / Context   │
 │   DISCARD ALL on release      │               │ • Encryption: TLS Enforced    │
 └───────────────────────────────┘               └───────────────────────────────┘
```

---

## 2. Fail-Closed Production Invariant

> [!CAUTION]
> In production environments (`NODE_ENV=production`), Fiorify strictly rejects PostgreSQL as the persistence engine.
> The platform MUST be bound to **SAP HANA Cloud** via Cloud Foundry `VCAP_SERVICES`.
> If no HANA service binding exists, the application server aborts startup immediately (`MISSING_PRODUCTION_HANA_BINDING`).

---

## 3. Strict Architectural Separation: Fiorify Database vs SAP S21 ERP Landscape

> [!IMPORTANT]
> The SAP ERP system **`S21`** (Client 200) contains productive and baseline SAP objects accessed by administrative user `int_samarth`.
> 
> **NON-NEGOTIABLE SAFETY DIRECTIVES:**
> - **S21 is an External SAP System, NOT Fiorify's Database:** S21 is integrated strictly via SAP BTP Destination and Connectivity services (HTTP GET / HEAD). It does NOT share a database tenant or HDI container with Fiorify.
> - **Dedicated Fiorify Persistence:** Fiorify's database connection to SAP HANA Cloud connects exclusively to a **dedicated application HDI container** (`fiorify-prod-hana-db`).
> - **Zero-Modification Policy:** **NEVER** create database tables, views, or DDIC objects in S21.
> - All Fiorify application tables (`assessments`, `generation_handoffs`, `generation_projects`, `security_audit_events`, `token_revocations`, `refresh_tokens`) are isolated to Fiorify's managed HDI container.

---

## 4. Connection Pooling & Resource Management

| Feature | PostgreSQL (`PostgresAdapter`) | SAP HANA Cloud (`HanaAdapter`) |
| :--- | :--- | :--- |
| **Connection Pool** | `pg.Pool` (Max 20 connections) | `@sap/hana-client` Connection Pooling |
| **Idle Timeout** | 30,000 ms | 60,000 ms |
| **Connection Timeout** | 5,000 ms | 10,000 ms |
| **Encryption** | TLS optional for local, required for remote | TLS strictly enforced (`encrypt: true`, `sslValidateCertificate: true`) |
| **Tenant Session Cleanup** | `DISCARD ALL;` executed in `finally` | Session variables unset on connection release |
| **Drainage on Shutdown** | Pool drained on `SIGTERM` / `SIGINT` | Client disconnected cleanly on process termination |
