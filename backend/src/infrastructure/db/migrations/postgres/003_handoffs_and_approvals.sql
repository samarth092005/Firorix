-- Migration: 003_handoffs_and_approvals.sql
-- Description: Generation Handoffs and Architect Build Approvals Schema

CREATE TABLE IF NOT EXISTS generation_handoffs (
    handoff_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    source_assessment_id VARCHAR(64) REFERENCES assessments(id) ON DELETE SET NULL,
    tcode VARCHAR(32) NOT NULL,
    transaction_description TEXT,
    target_release VARCHAR(64) NOT NULL DEFAULT 'SAP S/4HANA 2023 On-Premise',
    system_id VARCHAR(16) NOT NULL DEFAULT 'S21',
    client VARCHAR(8) NOT NULL DEFAULT '200',
    program_name VARCHAR(128),
    package_name VARCHAR(64),
    classification VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
    current_stage VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    proposed_app_type VARCHAR(64) NOT NULL DEFAULT 'RAP_MANAGED',
    approval_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_APPROVAL',
    clean_core_justification TEXT,
    fit_gap_summary JSONB DEFAULT '{}'::jsonb,
    business_requirements JSONB DEFAULT '{}'::jsonb,
    target_architecture JSONB DEFAULT '{}'::jsonb,
    lead_architect_approval JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by VARCHAR(128) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gen_handoffs_tenant ON generation_handoffs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gen_handoffs_assessment ON generation_handoffs(source_assessment_id);
CREATE INDEX IF NOT EXISTS idx_gen_handoffs_tcode ON generation_handoffs(tcode);
CREATE INDEX IF NOT EXISTS idx_gen_handoffs_status ON generation_handoffs(approval_status);

CREATE TABLE IF NOT EXISTS build_architect_approvals (
    id SERIAL PRIMARY KEY,
    approval_id VARCHAR(64) UNIQUE NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    assessment_id VARCHAR(64) NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    assessment_version INTEGER NOT NULL DEFAULT 1,
    handoff_id VARCHAR(64) REFERENCES generation_handoffs(handoff_id) ON DELETE SET NULL,
    approver_id VARCHAR(64) NOT NULL,
    approver_name VARCHAR(128) NOT NULL,
    approver_role VARCHAR(64) NOT NULL DEFAULT 'LEAD_ARCHITECT',
    scope VARCHAR(32) NOT NULL DEFAULT 'BUILD',
    status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
    justification TEXT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_assessment_version_approval UNIQUE (assessment_id, assessment_version, scope)
);

CREATE INDEX IF NOT EXISTS idx_build_approvals_tenant ON build_architect_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_build_approvals_assessment ON build_architect_approvals(assessment_id);
CREATE INDEX IF NOT EXISTS idx_build_approvals_handoff ON build_architect_approvals(handoff_id);
