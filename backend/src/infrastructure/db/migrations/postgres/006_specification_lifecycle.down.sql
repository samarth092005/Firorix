-- Fiorify — Migration 006: Generation Specification Engine & Project Lifecycle (S7)
-- Down Migration

DROP TABLE IF EXISTS project_specification_approvals CASCADE;
DROP TABLE IF EXISTS project_specification_versions CASCADE;

ALTER TABLE generation_projects
DROP COLUMN IF EXISTS modernization_outcome,
DROP COLUMN IF EXISTS readiness_status,
DROP COLUMN IF EXISTS readiness_percentage,
DROP COLUMN IF EXISTS readiness_details,
DROP COLUMN IF EXISTS approved_by,
DROP COLUMN IF EXISTS approved_at;
