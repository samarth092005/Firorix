-- Migration: 006_specification_lifecycle.down.sql (SAP HANA Cloud Dialect)

DROP TABLE project_specification_approvals;
DROP TABLE project_specification_versions;

ALTER TABLE generation_projects DROP (
    modernization_outcome,
    readiness_status,
    readiness_percentage,
    readiness_details,
    approved_by,
    approved_at
);
