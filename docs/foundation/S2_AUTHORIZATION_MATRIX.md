# Fiorify — Stage S2: Authorization Matrix & Permissions

## 1. Single Administrator Operating Model
The initial operating model for Fiorify is single authenticated administrator only. While legacy consulting and approver roles exist in the platform taxonomy, all privileged infrastructure, SAP system configuration, catalogue synchronizations, and generation workflows require administrator authorization.

---

## 2. Nine Foundation Enterprise Permissions
Stage S2 defines 9 non-negotiable enterprise permissions:

| Permission Code | Name | Description |
|---|---|---|
| `Fiorify.admin.access` | Global Administrator Access | Unrestricted administration, configuration, and security management. |
| `Fiorify.systems.read` | View SAP Landscapes | Read configured SAP system profiles, hostnames, clients, and endpoints. |
| `Fiorify.systems.manage` | Manage SAP Connections | Register, update, and run diagnostics against connected SAP systems. |
| `Fiorify.discovery.execute` | Execute SAP Discovery | Run T-Code discovery, Gateway catalog probing, and evidence collection. |
| `Fiorify.catalogue.manage` | Manage Fiori Catalogue | Import official FAL exports, synchronize catalog database, and rollback. |
| `Fiorify.assessments.manage` | Manage Assessments | Create, edit, submit, approve, reject, or archive modernization assessments. |
| `Fiorify.generation.manage` | Manage Generation Studio | Create generation projects, author specifications, and trigger builders. |
| `Fiorify.artifacts.export` | Export Artifacts | Download and export generated ABAP, UI5, and configuration bundles. |
| `Fiorify.audit.read` | View Security Audit Events | Query cryptographic security event trail and run chain verification. |

---

## 3. Role-Based Access Control (RBAC) Mapping

| Permission | ADMIN | SAP_CONSULTANT | APPROVER | REQUESTER | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| `Fiorify.admin.access` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `Fiorify.systems.read` | :white_check_mark: | :white_check_mark: | :x: | :x: | :x: |
| `Fiorify.systems.manage` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `Fiorify.discovery.execute` | :white_check_mark: | :white_check_mark: | :x: | :x: | :x: |
| `Fiorify.catalogue.manage` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `Fiorify.assessments.manage` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `Fiorify.generation.manage` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `Fiorify.artifacts.export` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `Fiorify.audit.read` | :white_check_mark: | :x: | :x: | :x: | :x: |

---

## 4. Separation of Duties Policy (GOV-01)
To prevent governance violations during architectural assessments:
1. **Self-Approval Prevention**: The user who created an assessment (`createdBy`) cannot approve their own assessment as an `APPROVER`.
2. **Administrative Override**: Only a user with role `ADMIN` and an explicit `{ isOverride: true }` parameter can approve an assessment they authored.
3. **Audit Logging**: Any approval override is recorded with an immutable audit event specifying the override rationale.
