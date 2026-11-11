# Phase 1 Test Plan — Mock Only

All tests use deterministic synthetic fixtures. No SAP system is contacted.

| ID | Input | Expected transaction | Classification | Expected match/status |
|---|---|---|---|---|
| T01 | ME21N | Exists | STANDARD | DIRECT_MATCH |
| T02 | VA01 | Exists | STANDARD | DIRECT_MATCH |
| T03 | ZPURCHASE | Exists | CUSTOM | RELATED_MATCH |
| T04 | ZREPORT01 | Exists | CUSTOM | NO_VERIFIED_MATCH |
| T05 | ZNOMATCH | Exists | STANDARD | NO_VERIFIED_MATCH |
| T06 | ZINCOMPLETE | Exists | CUSTOM | METADATA_INCOMPLETE warning |
| T07 | ZINVALID | Not found | N/A | NOT_FOUND |
| T08 | ZCONNERR | Not checked | N/A | CONNECTION_ERROR |
| T09 | ZDENIED | Not checked | N/A | ACCESS_DENIED |
| T10 | blank | Not checked | N/A | INVALID_INPUT |
| T11 | `  me21n  ` | Exists | STANDARD | Normalised + DIRECT_MATCH |
| T12 | unknown system | Not checked | N/A | SYSTEM_NOT_CONFIGURED |

## Manual demo sequence
1. Open http://localhost:5173.
2. Confirm only Transaction Checker is visible.
3. Confirm persistent “DEMO DATA — NOT CONNECTED TO SAP” banner.
4. Search ME21N; inspect direct candidate and evidence.
5. Search ZPURCHASE; confirm related candidate is not labelled equivalent.
6. Search ZREPORT01; confirm no verified app match.
7. Search ZINCOMPLETE; confirm transaction still exists with metadata warning.
8. Search ZINVALID; confirm NOT_FOUND.
9. Search ZCONNERR; confirm CONNECTION_ERROR, not NOT_FOUND.
10. Search ZDENIED; confirm ACCESS_DENIED.
11. Test blank input and Enter key.
12. Expand technical details.
13. Refresh and verify app still loads.

## Acceptance
- No live SAP calls.
- Mock records clearly labelled.
- Errors are distinct.
- No keyword-only matching.
- Candidate source and rationale displayed.
- Existing project modules are hidden, not deleted.
- Port 5173 is used.
