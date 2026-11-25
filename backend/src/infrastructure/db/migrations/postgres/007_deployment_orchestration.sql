-- Fiorify — Migration 007: SAP Deployment Orchestration & Execution Boundary (Sprint 11)
-- Up Migration: Creates deployment plans, cryptographic approvals, execution tracking, and audit logs.

CREATE TABLE IF NOT EXISTS deployment_plans (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES generation_projects(project_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'DEFAULT-TENANT-S21',
    target_system VARCHAR(32) NOT NULL DEFAULT 'S21',
    target_client VARCHAR(8) NOT NULL DEFAULT '200',
    target_package VARCHAR(64) NOT NULL DEFAULT '$TMP',
    target_namespace VARCHAR(16) NOT NULL DEFAULT 'Z',
    transport_request VARCHAR(32),
    specification_version INTEGER NOT NULL DEFAULT 1,
    generation_version INTEGER NOT NULL DEFAULT 1,
    plan_hash VARCHAR(128) NOT NULL,
    artifact_manifest_hash VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNED', -- DRAFT, PLANNED, APPROVED, SUPERSEDED, CANCELLED
    plan_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by VARCHAR(128) NOT NULL DEFAULT 'Lead SAP Architect',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_deployment_plans_project ON deployment_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_plans_tenant ON deployment_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deployment_plans_status ON deployment_plans(status);

CREATE TABLE IF NOT EXISTS deployment_approvals (
    id SERIAL PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES deployment_plans(id) ON DELETE CASCADE,
    project_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'DEFAULT-TENANT-S21',
    decision VARCHAR(32) NOT NULL, -- APPROVED, REJECTED, REVOKED
    approver VARCHAR(128) NOT NULL,
    approver_role VARCHAR(64) NOT NULL DEFAULT 'CHIEF_ARCHITECT',
    plan_hash VARCHAR(128) NOT NULL,
    artifact_manifest_hash VARCHAR(128) NOT NULL,
    signature_hash VARCHAR(128) NOT NULL,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    comments TEXT
);

CREATE INDEX IF NOT EXISTS idx_deployment_approvals_plan ON deployment_approvals(plan_id);
CREATE INDEX IF NOT EXISTS idx_deployment_approvals_project ON deployment_approvals(project_id);

CREATE TABLE IF NOT EXISTS deployment_executions (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL REFERENCES deployment_plans(id) ON DELETE CASCADE,
    project_id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL DEFAULT 'DEFAULT-TENANT-S21',
    idempotency_key VARCHAR(128) UNIQUE,
    lifecycle_status VARCHAR(32) NOT NULL DEFAULT 'STOPPED_AT_WRITE_BOUNDARY',
    execution_boundary_status VARCHAR(32) NOT NULL DEFAULT 'STOPPED_AT_WRITE_BOUNDARY',
    operations JSONB NOT NULL DEFAULT '[]'::jsonb,
    logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    verification_results JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_deployment_executions_plan ON deployment_executions(plan_id);
CREATE INDEX IF NOT EXISTS idx_deployment_executions_project ON deployment_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_deployment_executions_idempotency ON deployment_executions(idempotency_key);
