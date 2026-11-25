# Fiorify — Discovery Evidence and Provenance Architecture
**Document Version:** 1.0.0  
**Scope:** Technical Evidence Gathering, ABAP Dictionary Mapping, Secret Scrubbing, and Tenant Isolation (DISC-005)

---

## 1. Architectural Philosophy

Fiorify replaces subjective modernisation assumptions with hard technical evidence gathered from the SAP landscape. Every modernisation recommendation must link directly to verifiable technical artifacts in the upstream SAP system.

Evidence is partitioned across three core dimensions:
1. **Repository & Dictionary Evidence:** What program, screens, and database tables back the transaction?
2. **Authorization & Security Evidence:** What authorization objects (SU24 / USOBX_C) gate execution?
3. **Gateway & OData Service Evidence:** Are there registered OData services or CDS views already serving this domain?

---

## 2. Technical Evidence Data Schema

Every technical evidence item conforms to the strict immutable contract defined in `backend/src/engine/technicalEvidenceEngine.js`:

```typescript
interface TechnicalEvidenceItem {
  id: string;                       // e.g. "EVI-TSTC-VA01-382910"
  evidenceType: EvidenceType;       // TSTC, TADIR, TFDIR, SCREEN, TABLE, SU24, GATEWAY_ODATA
  sourceName: string;               // e.g. "SAP S21 DDIC Repository"
  sourceRecordId: string;           // e.g. "TSTC.VA01", "USOBX_C.V_VBAK_AAT"
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  timestamp: string;               // ISO 8601 UTC
  tenantId: string;                // Strict tenant boundary
  systemId: string;                // e.g. "S21-200"
  client: string;                  // e.g. "200"
  metadata: Record<string, any>;   // Scrubbed technical details
}
```

---

## 3. ABAP Repository & SU24 Evidence Mapping

| Evidence Type | SAP Source Table / API | Purpose | Modernization Impact |
| :--- | :--- | :--- | :--- |
| **TSTC** | Transaction Code Table (`TSTC`) | Determines transaction existence, calling program (`PGMNA`), and Dynpro screen (`DYPNO`). | Confirms transaction validity; distinguishes standard from custom Z/Y transactions. |
| **TADIR** | Directory of Repository Objects (`TADIR`) | Resolves the development package (`DEVCLASS`) and software component (`DLVUNIT`). | Identifies modularity and clean core compliance (e.g. `SAP_APPL` vs customer package). |
| **TFDIR** | Function Module Table (`TFDIR`) | Detects RFC-enabled function modules called by the transaction. | Guides RAP service definition and RFC wrapper needs. |
| **SU24 / USOBX_C** | Authorization Check Table | Gathers required authorization objects and fields (e.g. `V_VBAK_AAT` for Sales Documents). | Maps to IAM Business Catalogs and PFCG roles in SAP BTP / Fiori Launchpad. |
| **DDIC Tables** | Table Definition (`DD02L`, `DD03L`) | Identifies primary database tables read or modified. | Maps persistence to CDS View Entities or Custom Business Objects. |
| **OData / Gateway** | `/IWFND/I_MED_SRV` | Detects existing V2 or V4 OData services. | Directly unlocks `ADD_AND_CONFIGURE` using existing published APIs. |

---

## 4. Automated Secret Scrubbing Protocol

SAP diagnostics and technical evidence logs must never expose operational secrets. Before any evidence payload is persisted or returned through the API, it passes through `sanitizeEvidencePayload()` in `technicalEvidenceEngine.js`:

1. **Header Scrubbing:** Strips `authorization`, `proxy-authorization`, `x-csrf-token`, and `cookie` headers.
2. **Credential Redaction:** Inspects keys matching `/password|secret|bearer|token|credential|jwt|auth/i` and masks values with `"[REDACTED_SECRET]"`.
3. **Payload Sanitization:** Deep-traverses nested metadata arrays and objects to eliminate query strings containing tokens or session IDs.

---

## 5. Multi-Tenant Scoping

Technical evidence is strictly scoped by `tenantId`. A query for transaction evidence from Tenant A never accesses or leaks cached evidence gathered by Tenant B. Tenant scoping is enforced:
1. In repository storage queries (`WHERE tenant_id = $1`).
2. At the route boundary via verified JWT/userContext tokens.
3. In cross-tenant automated regression tests (`Scenario 16: Cross-tenant isolation in technical evidence`).
