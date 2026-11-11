# FIORIX — S1 RUNTIME PERSISTENCE INTEGRATION
**End-to-End Application API Routing, Repository Delegation & Fail-Fast Safeguards**

**Date:** 2026-11-11  
**Target:** Production Authoritative PostgreSQL Runtime  
**Status:** IMPLEMENTED & LIVE-TESTED  

---

## 1. Executive Summary

To satisfy directive clause S1.3 ("Find all remaining JSON-backed runtime access; do not claim PostgreSQL is authoritative while an active business API still uses an old JSON store") and Non-Negotiable Rule 6 ("Do not use silent JSON fallback when PostgreSQL is unavailable"), the service layer was updated to delegate authoritative operations to PostgreSQL repositories when running in database mode.

---

## 2. API to Persistence Implementation Traceability

| API Endpoint | HTTP Method | Service / Store Class | Authority Mechanism | Database Table(s) |
|---|:---:|---|---|---|
| `/api/v1/assessments` | `POST` | `AssessmentStore` | `AssessmentRepository.create()` | `assessments`, `fit_gap_dimensions`, `assessment_audit_events` |
| `/api/v1/assessments/:id` | `GET` | `AssessmentStore` | `AssessmentRepository.getById()` | `assessments`, `fit_gap_dimensions`, `assessment_audit_events` |
| `/api/v1/assessments` | `GET` | `AssessmentStore` | `AssessmentRepository.list()` | `assessments` |
| `/api/v1/assessments/:id` | `PATCH` | `AssessmentStore` | `AssessmentRepository.update()` | `assessments`, `assessment_audit_events` |
| `/api/v1/assessments/:id/submit-review` | `POST` | `AssessmentStore` | `AssessmentRepository.update()` | `assessments`, `assessment_audit_events` |
| `/api/v1/assessments/:id/approve` | `POST` | `AssessmentStore` | `AssessmentRepository.update()` | `assessments`, `assessment_audit_events` |
| `/api/v1/assessments/:id/reject` | `POST` | `AssessmentStore` | `AssessmentRepository.update()` | `assessments`, `assessment_audit_events` |
| `/api/v1/assessments/:id/audit` | `GET` | `AssessmentStore` | `AssessmentRepository.getAuditTrail()` | `assessment_audit_events` |
| `/api/v1/assessments/:id/verify-audit` | `GET` | `AssessmentStore` | `AssessmentRepository.getAuditTrail()` | Recomputes SHA-256 chain from DB rows |
| `/api/v1/generation/projects` | `POST` | `GenerationProjectService` | `GenerationProjectRepository.createProject()` | `generation_projects`, `generation_activity_events` |
| `/api/v1/generation/projects/:id` | `GET` | `GenerationProjectStore` | `GenerationProjectRepository.getProjectById()` | `generation_projects`, `generation_specifications` |
| `/api/v1/generation/projects` | `GET` | `GenerationProjectStore` | `GenerationProjectRepository.listProjects()` | `generation_projects` |
| `/api/v1/generation/projects/:id` | `PATCH` | `GenerationProjectStore` | `GenerationProjectRepository.updateProject()` | `generation_projects`, `generation_activity_events` |
| `/api/v1/generation/projects/:id/archive` | `POST` | `GenerationProjectStore` | `GenerationProjectRepository.archiveProject()` | `generation_projects`, `generation_activity_events` |
| `/api/v1/generation/projects/:id/restore` | `POST` | `GenerationProjectStore` | `GenerationProjectRepository.restoreProject()` | `generation_projects`, `generation_activity_events` |
| `/api/v1/generation/projects/:id/duplicate` | `POST` | `GenerationProjectStore` | `GenerationProjectRepository.duplicateProject()` | `generation_projects`, `generation_activity_events` |
| `/api/v1/generation/projects/:id` | `DELETE` | `GenerationProjectStore` | `GenerationProjectRepository.deleteProject()` | `generation_projects` (CASCADE) |

---

## 3. Strict Fail-Fast Policy (No Silent Fallback)

In accordance with Non-Negotiable Rule 6:
- When running in database mode (`useDatabase: true` or `FIORIX_PERSISTENCE === 'postgres'`), `AssessmentStore` and `GenerationProjectStore` execute directly against `AssessmentRepository` and `GenerationProjectRepository`.
- If PostgreSQL is disconnected, terminated, or encounters an operational error, the call does **NOT** swallow the error or fall back to reading from local JSON files.
- An explicit error is thrown, propagating HTTP 500 / 503 to callers with correlation tracking, ensuring stale file data cannot mask database outages.

---

## 4. Live Verification Results (`s1LivePersistenceIntegration.test.js`)

The 10 live persistence steps mandated by S1.4 were verified against the running HTTP server:
1. `POST /api/v1/assessments` creates record `ASM-LIVE-S1-...` in PostgreSQL.
2. `GET /api/v1/assessments/:id` retrieves it with 100% attribute parity.
3. `POST /api/v1/assessments/:id/submit-review` and `.../approve` update lifecycle state to `APPROVED`.
4. `GET /api/v1/assessments/:id/audit` returns chained audit events with valid cryptographic hashes.
5. Backend server instance stopped (`srv.close()`).
6. New backend server instance started; `GET /api/v1/assessments/:id` retrieves persisted assessment.
7. `POST /api/v1/generation/projects` creates Generation project linked to `ASM-LIVE-S1-...`.
8. Backend server instance stopped and restarted again.
9. `GET /api/v1/generation/projects/:id` retrieves project and versioned specifications from PostgreSQL.
10. Artifact metadata verified in PostgreSQL `generation_artifacts` table with exact SHA-256 hash.

**Test Result:** All 8 subtest suites (covering the 10 steps) passed with exit code 0.
