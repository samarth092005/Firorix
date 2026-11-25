-- Fiorify — Migration 006: Generation Specification Engine & Project Lifecycle (S7)
-- Up Migration: Adds tables for structured requirements, RAP specifications, OData contracts,
-- Fiori UI specifications, specification versions, and approvals.

CREATE TABLE IF NOT EXISTS project_specification_versions (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES generation_projects(project_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    version_tag VARCHAR(64) NOT NULL DEFAULT 'DRAFT',
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    changelog TEXT,
    created_by VARCHAR(128) NOT NULL DEFAULT 'Lead SAP Architect',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_spec_version UNIQUE (project_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_spec_versions_project ON project_specification_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_spec_versions_status ON project_specification_versions(status);

CREATE TABLE IF NOT EXISTS project_specification_approvals (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES generation_projects(project_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    decision VARCHAR(32) NOT NULL, -- APPROVED, REJECTED, CHANGES_REQUESTED
    comments TEXT,
    approver VARCHAR(128) NOT NULL,
    approver_role VARCHAR(64) NOT NULL DEFAULT 'CHIEF_ARCHITECT',
    approved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    signature_hash VARCHAR(128) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spec_approvals_project ON project_specification_approvals(project_id);

-- Enforce new columns on generation_projects if not existing
ALTER TABLE generation_projects
ADD COLUMN IF NOT EXISTS modernization_outcome VARCHAR(32) DEFAULT 'BUILD',
ADD COLUMN IF NOT EXISTS readiness_status VARCHAR(32) DEFAULT 'NOT_READY',
ADD COLUMN IF NOT EXISTS readiness_percentage NUMERIC(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS readiness_details JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(128),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
