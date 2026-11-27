# S21 Basis & Cloud Connector Diagnostic Actions

**Purpose:** Read-only diagnostic checklist for SAP Basis and Cloud Connector administrators to pinpoint the exact source of HTTP `403` on `S21_FIORI` (`http://s21fiori:8000`, Client `200`, User `int_samarth`) **before** making configuration or role changes.

---

## 1. SAP Cloud Connector Checks (Virtual Host `s21fiori:8000`)

1. Open **SAP Cloud Connector Administration** -> Subaccount (`eu30` / AIS) -> **Cloud To On-Premise** -> **Access Control**.
2. Locate the mapping for Virtual Host **`s21fiori:8000`**:
   - Verify the **Internal Host & Port** point to `S21` ICM HTTP/HTTPS port.
   - Check the **Resources** table for `s21fiori:8000`:
     - Is `/sap/bc/adt/` (Access Policy: *Path and all sub-paths*) present and **Enabled**?
     - Is `/sap/opu/odata/` (or `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/`) present and **Enabled**?
   - **Why this matters:** If `Resources` does not include `/sap/bc/adt` and `/sap/opu/odata`, Cloud Connector itself rejects requests with **HTTP 403** before they ever reach `S21` or evaluate `INT_SAMARTH`'s `SAP_ALL` profile.
3. Check Cloud Connector **Audit / Traffic Logs** (`scc_core.trc` / `ljs_trace.log`) for `403` entries targeting `/sap/bc/adt/discovery` and `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/ServiceCollection`.

---

## 2. SAP `S21` ICM / UCON / Web Dispatcher Checks

1. Check **SMICM** (ICM Monitor) / Web Dispatcher logs on `S21` at the timestamp of the test (`15:17`–`15:32 IST` / `10:02 UTC` on 2026-11-26) to confirm whether the HTTP requests from Cloud Connector actually reached `S21` ICM.
2. Check transaction **`UCONCOCKPIT`** (Unified Connectivity) on `S21` Client `200` (and Client `000`):
   - Verify whether HTTP Allowlist / Communication Assembly restricts `/sap/bc/adt/*` or `/sap/opu/odata/IWFND/CATALOGSERVICE;v=2/*`.

---

## 3. SAP `S21` ICF & Gateway Service Checks (Client `200`)

1. **Transaction `SICF` (Client `200`):**
   - Check whether `/default_host/sap/bc/adt` and `/default_host/sap/bc/adt/discovery` are **active** and check their **Logon Data / Handler List** (ensure no restrictive anonymous/client restriction overrides Basic Auth).
   - Check whether `/default_host/sap/opu/odata/iwfnd/catalogservice` is **active**.
2. **Transaction `/IWFND/MAINT_SERVICE` (Client `200`):**
   - Verify whether `CATALOGSERVICE` (v2, namespace `/IWFND/`) is registered and active, and check `/IWFND/ERROR_LOG` for any logged errors under user `INT_SAMARTH`.

---

## 4. SAP `S21` User & Security Audit (`INT_SAMARTH`)

1. **Transaction `SM20` / `RSAU_READ_LOG` (Security Audit Log):**
   - Filter by User `INT_SAMARTH` and Client `200` to verify whether HTTP Basic Auth logon events actually arrived on `S21` from Cloud Connector.
   - If **no** logon events appear for `INT_SAMARTH` during the BTP test window, the HTTP `403` is occurring **upstream of ABAP** (Cloud Connector Access Control or ICM/Web Dispatcher).
2. **Transaction `SU53` / `STAUTHTRACE`:**
   - Only if `SM20` confirms `INT_SAMARTH` reached ABAP, trace `INT_SAMARTH` during `/sap/bc/adt/discovery` and `/IWFND/CATALOGSERVICE;v=2/` to see if any system-level exit or switch blocked the call despite `SAP_ALL`.
