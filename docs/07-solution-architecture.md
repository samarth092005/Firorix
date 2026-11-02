# Solution Architecture
## Architecture style
Modular CAP application plus a small number of isolated background workers. Do not start with a microservice per feature.

```mermaid
flowchart TB
 U[Consultants / Developers / Architects] --> UI[SAPUI5 FioriX]
 UI --> AR[Application Router]
 AR --> CAP[CAP Node.js]
 CAP --> ID[XSUAA / IAS]
 CAP --> DB[(HANA Cloud)]
 CAP --> JOB[Job Orchestrator]
 CAP --> DEST[Destination Service]
 DEST --> CONN[Connectivity Service]
 CONN --> SCC[Cloud Connector]
 SCC --> S4[S/4HANA On-Premise]
 JOB --> DISC[Discovery Worker]
 JOB --> CAT[Catalogue and Fit-Gap Worker]
 JOB --> GEN[Generation Worker]
 JOB --> VAL[Validation Worker]
 GEN --> DOC[Durable Document Repository]
```

CAP owns domain APIs, persistence, authorization and workflow. Workers handle long-running discovery, catalogue processing, generation and validation. HANA stores FioriX metadata; SAP remains source of truth for SAP repository facts. Initial integration is read-only.
