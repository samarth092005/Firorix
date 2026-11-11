# ADR-0008: SAP S/4HANA On-Premise Integration Approach & Boundaries
**Status:** APPROVED  
**Date:** November 2026  
**Deciders:** Senior SAP Solution Architect, SAP Technical Architect, BTP Security Lead  
**Technical Scope:** On-Premise S/4HANA Network Connectivity & Object Discovery  

---

## 1. Context and Problem Statement
FioriX must interrogate on-premise S/4HANA systems to extract transaction headers, programs, packages, CDS views, Gateway services, and SU24 authorization profiles. The integration path must operate across enterprise firewalls without introducing security vulnerabilities, exposing arbitrary RFCs, or modifying SAP repository objects.

## 2. Decision
1. **Sanctioned Connectivity Route:** All communication from BTP to S/4HANA must strictly follow:
   $$\text{CAP Backend} \longrightarrow \text{BTP Destination Service} \longrightarrow \text{BTP Connectivity Service} \longrightarrow \text{SAP Cloud Connector} \longrightarrow \text{S/4HANA DEV}$$
2. **Strict Read-Only Enforcement:** The communication user in S/4HANA is provisioned with a custom least-privilege role (`Z_FIORIX_DISCOVERY_RO`) containing display-only authorizations (`S_DEVELOP` ACTVT 03, `S_TABU_DIS` Display, `S_ADT_RES`).
3. **No Automated Transports or Writes:** Automated transport creation (`E070`), table modification, or automated activation of generated ABAP code on the SAP host is **strictly excluded**.
4. **Targeted URL Whitelisting:** Cloud Connector mapping must be restricted exclusively to `/sap/bc/adt/*` and `/sap/opu/odata/*`. Generic RFC gateway paths (`/sap/bc/rfc`) and Web Dynpro endpoints (`/sap/bc/webdynpro`) are disallowed.
5. **Static Discovery vs. Dynamic Reality:** FioriX will discover static structural pointers (programs, includes, tables). Any unresolvable dynamic calls (`CALL SCREEN`, `SUBMIT (var)`) must be classified as `UNKNOWN`, not inferred.

## 3. Consequences
- **Positive:** Total alignment with enterprise SAP cybersecurity policies; zero risk of production system disturbance or unauthorized data modification.
- **Trade-off:** Deep dynamic call graphs cannot be fully mapped automatically, necessitating functional consultant confirmation.
