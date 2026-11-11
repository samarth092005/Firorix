# Deployment, Operations & Storage Architecture
**Document Version:** 2.0.0  
**Status:** ARCHITECTURALLY CONFIRMED  

## 1. SAP BTP Cloud Foundry Deployment Topology

```mermaid
flowchart TD
    User[Enterprise User] --> Router[SAP BTP Managed Application Router]
    Router -->|Static UI Bundle| HTML5[HTML5 Application Repository (React 18 Bundle)]
    Router -->|OData V4 & Actions| CAP[CAP Node.js Application (BTP CF Container)]
    
    CAP --- XSUAA[SAP Cloud Identity Services / XSUAA]
    CAP --> HANA[(SAP HANA Cloud HDI Container)]
    CAP --> DMS[SAP Document Management Service (DMS)]
    
    CAP --> Dest[BTP Destination Service]
    Dest --> Conn[BTP Connectivity Service]
    Conn --> SCC[SAP Cloud Connector]
    SCC --> S4[S/4HANA On-Premise DEV Sandbox]
```

---

## 2. Storage Strategy & Fallback Architecture

### Ephemeral Storage Invariant
> **Cloud Foundry application containers possess ephemeral filesystems.**  
> Any container crash, scale-out, or redeployment wipes local storage. Under no circumstances may generated ZIP archives or specification documents be stored on container local disk.

### Tiered Storage Strategy
1. **Tier 1 (Preferred Enterprise):** **SAP Document Management Service (DMS)**, Integration Option, CMIS-compliant repository on SAP BTP.
2. **Tier 2 (Fallback - Self-Contained):** Dedicated **HANA Cloud Large Object (LOB) table** (`GENERATED_ARTIFACT_CONTENT`) within the HDI container for text drafts under a strict 10 MB per-project size ceiling.

---

## 3. Operational Runbooks & Telemetry

1. **Correlation ID Tracking:** Every client request receives a unique `x-correlation-id` header generated at the App Router or frontend, propagated through CAP handlers, background workers, and Cloud Connector logs.
2. **Health Checks:**
   - CAP endpoint: `GET /health` returns DB connectivity status and job engine heartbeat.
   - SAP Connectivity probe: Triggered via `testConnection` action to report latency and endpoint availability without blocking request threads.
3. **Automated Data Purge:** Historical scan snapshots and unapproved draft artifacts older than 90 days are purged via automated CAP scheduled jobs to prevent HANA Cloud memory bloat.
