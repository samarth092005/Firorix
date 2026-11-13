# ADR-0006: Hybrid API Protocol: OData V4 Core with Asynchronous REST Actions
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Senior SAP Solution Architect, Senior CAP Developer, Enterprise UX Architect  
**Technical Scope:** API Protocols & Service Exposition Contracts  

---

## 1. Context and Problem Statement
Earlier documentation exhibited a tension between standard CAP conventions (OData V4) and Express-style REST routes (`/api/v1/systems`, `/api/v1/transactions/analyze`). We need to formally decide the communication protocol between the React frontend and the CAP backend.

## 2. Decision
1. **OData V4 as Primary Protocol:** All domain entity querying, filtering (`$filter`), sorting (`$orderby`), pagination (`$top`, `$skip`), and standard CRUD operations must use **SAP CAP Native OData V4 services** (`/odata/v4/*`).
2. **CAP Actions for Imperative Workflows:** Complex workflows (such as requirement confirmation, running fit-gap, and triggering draft generation) shall be exposed as **OData V4 Actions / Functions** bound to domain entities or services.
3. **Asynchronous Job Pattern:** Long-running discovery and where-used scans that risk exceeding Cloud Foundry's 120-second timeout must return `202 Accepted` with a `JobReference` (`jobId`), with status polled via `GET /odata/v4/discovery/ScanJobs(ID)`.
4. **Consistent Error Payload:** Error payloads across all services must conform to standard SAP OData error specifications:
   ```json
   {
     "error": {
       "code": "Fiorify_AUTH_DENIED",
       "message": "Technical user lacks S_DEVELOP display authorization.",
       "target": "programs/SAPMV45A",
       "details": []
     }
   }
   ```

## 3. Consequences
- **Positive:** Natively leverages CAP's automated query optimization and metadata generation; provides standard error handling; enables future SAP Fiori Launchpad embedding without gateway translation.
- **Trade-off:** Frontend API client must handle OData V4 JSON response wrappers (`value` array).
