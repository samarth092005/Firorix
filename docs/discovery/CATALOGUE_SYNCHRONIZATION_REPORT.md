# Fiorify — SAP Fiori Catalogue Synchronization & Freshness Report
**Document Version:** 1.0.0  
**Scope:** Catalogue Completeness Metadata, Offline Resilience, Deduplication, and Freshness Tracking (DISC-002, DISC-007)

---

## 1. Context & Motivation

A critical flaw in legacy migration tools is assuming that if a search returns zero results, no standard SAP Fiori application exists. In reality, zero results often mean:
- The local catalog cache is incomplete or synchronized only for a subset of modules.
- The external SAP Fiori Apps Reference Library sync timed out or partially failed.
- The system was configured in an offline demo mode with only 20 seed transactions.

Asserting "No Fiori successor exists, custom build required" under an incomplete catalogue leads to unnecessary, costly custom software development ("Clean Core violation").

---

## 2. Canonical Catalogue Completeness Taxonomy

`OfficialFioriCatalogueAdapter` introduces an authoritative completeness taxonomy exported as `CATALOGUE_COMPLETENESS`:

| Status Code | Definition | Matching Engine Policy |
| :--- | :--- | :--- |
| `COMPLETE` | Entire official Fiori catalog (~18,000+ apps) is indexed and verified fresh. | Zero candidates yields `NO_MATCH_CONFIRMED`. |
| `INCOMPLETE` | Only a subset of applications or specific line-of-business modules are indexed. | Zero candidates yields `NO_MATCH_PENDING` (never confirmed no-match). |
| `STALE` | Catalogue cache has exceeded freshness threshold (default 7 days). | Returns warning and schedules background refresh; allows search with `STALE` indicator. |
| `FAILED_SYNC` | Upstream synchronization failed due to network or gateway error. | Fails closed or falls back to last verified snapshot with `FAILED_SYNC` warning. |
| `UNKNOWN` | Catalogue state has not been verified. | Conservative fallback to `INCOMPLETE`. |

---

## 3. Deduplication & Ingestion Pipeline

When synchronizing applications from the SAP Fiori Apps Reference Library OData feeds or batch files:
1. **Canonical Identifier:** Uses SAP App ID (`appId`, e.g. `F0842A`, `F1643`) as the authoritative primary key.
2. **Deduplication:** When multiple catalog entries reference the same `appId` across different SAP S/4HANA releases or line-of-business views, the ingestion pipeline merges release compatibility arrays, maintaining a single deduplicated entry.
3. **Freshness Timestamp:** Stamped on every sync run (`lastSynchronizedAt: ISO 8601 UTC`).

---

## 4. End-to-End Catalogue Contract

Every catalogue query response (`searchApps`, `getAllApps`) includes structured completeness metadata:

```json
{
  "apps": [ ... ],
  "candidates": [ ... ],
  "total": 1,
  "catalogueCompleteness": {
    "status": "INCOMPLETE",
    "totalCatalogueItems": 18500,
    "importedAppsCount": 420,
    "lastSynchronizedAt": "2026-11-16T15:32:00.000Z",
    "isAuthoritative": false
  }
}
```

This guarantees that downstream engines (`fioriMatchingEngine`, `recommendationEngine`) make governed, evidence-backed decisions.
