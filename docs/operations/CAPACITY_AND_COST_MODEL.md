# Fiorify — Capacity Planning & Cloud Cost Model

## 1. Executive Summary

This document establishes the sizing guidelines, resource requirements, database storage projections, and SAP BTP operational cost models for hosting Fiorify.

---

## 2. Workload & Compute Sizing

### 2.1 Concurrency & Throughput Profiles

| Tier | Active Users | Daily Assessments | Generation Projects/Day | Recommended CF Compute | Database Spec |
|---|---|---|---|---|---|
| **Small / Pilot** | 1–10 | Up to 50 | 5–10 | 1 Instance (1 GB RAM) | 2 vCPU, 4 GB RAM |
| **Standard Enterprise** | 10–50 | Up to 250 | 25–50 | 2 Instances (1 GB RAM) | 4 vCPU, 8 GB RAM |
| **High-Throughput Global** | 50–200+ | Up to 1,000 | 100+ | 4 Instances (2 GB RAM) | 8 vCPU, 16 GB RAM |

### 2.2 Memory & CPU Footprint
- **Node.js Process**: Base footprint is ~85 MB. Under peak generation and streaming PKZIP compression, memory tops out at ~240 MB per worker instance. A 1,024 MB container quota provides $\sim 4\times$ safety margin.
- **Vite Production Frontend Bundle**: Total transfer size is $\sim 480\text{ kB}$ gzipped, resulting in sub-second initial page load times over enterprise WAN.

---

## 3. Database Storage Projections

| Table Group | Estimated Row Size | Projected Rows (1 Year) | Projected Storage |
|---|---|---|---|
| `assessments` & `history` | 4 kB | 50,000 | ~200 MB |
| `generation_projects` & `specs` | 64 kB | 5,000 | ~320 MB |
| `project_specification_versions` | 40 kB | 20,000 | ~800 MB |
| `security_audit_events` | 1 kB | 250,000 | ~250 MB |
| `deployment_plans` & `executions` | 16 kB | 10,000 | ~160 MB |
| **Total Database Working Set** | — | — | **$\approx 1.73\text{ GB / Year}$** |

A standard 10 GB to 32 GB PostgreSQL storage volume comfortably accommodates 5+ years of active enterprise modernization history.

---

## 4. SAP BTP Cost Modeling

Estimated monthly BTP Cloud Foundry consumption:

| Service | Plan / Sizing | Quantity | Estimated Cost / Month |
|---|---|---|---|
| **Cloud Foundry Runtime** | Standard Memory Units | 2 GB (2 x 1 GB) | ~$50 – $70 |
| **Hyperscaler PostgreSQL** | Standard (2 vCPU, 4 GB) | 1 Instance | ~$120 – $150 |
| **SAP Authorization (XSUAA)** | Application Plan | 1 Instance | Included in Core |
| **SAP Destination Service** | Lite / Standard | 1 Instance | Included in Core |
| **SAP Connectivity Service** | Standard | 1 Instance | Included in Core |
| **SAP Cloud Connector** | On-Premise Software | 1 Gateway | No License Cost |
| **Total Estimated Cloud Spend** | — | — | **$\approx \$170 – \$220\text{ / Month}$** |
