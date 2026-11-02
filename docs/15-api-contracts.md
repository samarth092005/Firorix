# API and Routing
API prefix `/api/v1`.

| Group | Example route | Purpose |
|---|---|---|
| Systems | `GET/POST /systems` | List/register systems |
| Connections | `POST /systems/{id}/connection-tests` | Test connection |
| Transactions | `POST /transactions/analyze` | Create assessment |
| Scans | `POST /scans` | Start scoped scan |
| Jobs | `GET /jobs/{id}` | Job status |
| Assessments | `GET /assessments/{id}` | Assessment overview |
| Technical | `GET /assessments/{id}/technical-objects` | Evidence |
| Requirements | `POST /assessments/{id}/requirements` | Add requirement |
| Catalogue | `GET /fiori-apps` | Search apps |
| Fit-gap | `POST /assessments/{id}/fit-gap-runs` | Compare requirements |
| Decisions | `POST /assessments/{id}/decisions` | Save recommendation |
| Generation | `POST /assessments/{id}/generation-projects` | Create draft |
| Artifacts | `GET /generation-projects/{id}/artifacts` | List/download |
| Validation | `POST /generation-projects/{id}/validation-runs` | Run checks |
| Approval | `POST /generation-projects/{id}/approvals` | Review/approve |
| Audit | `GET /audit-events` | Audit search |

Long operations are asynchronous and return assessment/job IDs. API standards: consistent errors, pagination, filters, correlation IDs, authorization per system/resource, idempotency for job creation, rate and payload limits. Exact CAP exposure convention is finalized in Sprint 4.
