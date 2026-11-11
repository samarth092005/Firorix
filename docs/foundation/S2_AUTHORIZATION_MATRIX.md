# FioriX — Stage S2: Authorization Matrix & Permissions

## 1. Single Administrator Operating Model
The initial operating model for FioriX is single authenticated administrator only. While legacy consulting and approver roles exist in the platform taxonomy, all privileged infrastructure, SAP system configuration, catalogue synchronizations, and generation workflows require administrator authorization.

---

## 2. Nine Foundation Enterprise Permissions
Stage S2 defines 9 non-negotiable enterprise permissions:

| Permission Code | Name | Description |
|---|---|---|
| `fiorix.admin.access` | Global Administrator Access | Unrestricted administration, configuration, and security management. |
| `fiorix.systems.read` | View SAP Landscapes | Read configured SAP system profiles, hostnames, clients, and endpoints. |
| `fiorix.systems.manage` | Manage SAP Connections | Register, update, and run diagnostics against connected SAP systems. |
| `fiorix.discovery.execute` | Execute SAP Discovery | Run T-Code discovery, Gateway catalog probing, and evidence collection. |
| `fiorix.catalogue.manage` | Manage Fiori Catalogue | Import official FAL exports, synchronize catalog database, and rollback. |
| `fiorix.assessments.manage` | Manage Assessments | Create, edit, submit, approve, reject, or archive modernization assessments. |
| `fiorix.generation.manage` | Manage Generation Studio | Create generation projects, author specifications, and trigger builders. |
| `fiorix.artifacts.export` | Export Artifacts | Download and export generated ABAP, UI5, and configuration bundles. |
| `fiorix.audit.read` | View Security Audit Events | Query cryptographic security event trail and run chain verification. |

---

## 3. Role-Based Access Control (RBAC) Mapping

| Permission | ADMIN | SAP_CONSULTANT | APPROVER | REQUESTER | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|
| `fiorix.admin.access` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `fiorix.systems.read` | :white_check_mark: | :white_check_mark: | :x: | :x: | :x: |
| `fiorix.systems.manage` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `fiorix.discovery.execute` | :white_check_mark: | :white_check_mark: | :x: | :x: | :x: |
| `fiorix.catalogue.manage` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `fiorix.assessments.manage` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `fiorix.generation.manage` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `fiorix.artifacts.export` | :white_check_mark: | :x: | :x: | :x: | :x: |
| `fiorix.audit.read` | :white_check_mark: | :x: | :x: | :x: | :x: |

---

## 4. Separation of Duties Policy (GOV-01)
To prevent governance violations during architectural assessments:
1. **Self-Approval Prevention**: The user who created an assessment (`createdBy`) cannot approve their own assessment as an `APPROVER`.
2. **Administrative Override**: Only a user with role `ADMIN` and an explicit `{ isOverride: true }` parameter can approve an assessment they authored.
3. **Audit Logging**: Any approval override is recorded with an immutable audit event specifying the override rationale.
