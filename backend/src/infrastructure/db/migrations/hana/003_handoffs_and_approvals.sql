-- SAP HANA Cloud Migration: 003_handoffs_and_approvals.sql
-- Description: Generation Studio handoff persistence, projects and artifacts on SAP HANA Cloud

CREATE TABLE generation_handoffs (
    handoff_id NVARCHAR(64) PRIMARY KEY,
    source_assessment_id NVARCHAR(64) NOT NULL,
    tenant_id NVARCHAR(64) NOT NULL,
    tcode NVARCHAR(64) NOT NULL,
    transaction_description NVARCHAR(255) NOT NULL,
    target_release NVARCHAR(64) DEFAULT 'SAP S/4HANA 2023 Private Edition' NOT NULL,
    system_id NVARCHAR(16) NOT NULL,
    client NVARCHAR(8) NOT NULL,
    current_stage NVARCHAR(32) DEFAULT 'DRAFT' NOT NULL,
    proposed_app_type NVARCHAR(64) DEFAULT 'RAP_MANAGED' NOT NULL,
    approval_status NVARCHAR(32) DEFAULT 'PENDING_APPROVAL' NOT NULL,
    lead_architect_approval NCLOB,
    architecture_baseline NCLOB NOT NULL,
    verified_metadata NCLOB NOT NULL,
    business_requirements NCLOB,
    identified_gaps NCLOB,
    created_by NVARCHAR(64) NOT NULL,
    creator_name NVARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (source_assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE TABLE generation_projects (
    project_id NVARCHAR(128) PRIMARY KEY,
    project_name NVARCHAR(255) NOT NULL,
    tenant_id NVARCHAR(64) NOT NULL,
    source_transaction_code NVARCHAR(64),
    source_assessment_id NVARCHAR(64),
    source_handoff_id NVARCHAR(64),
    lifecycle_status NVARCHAR(32) DEFAULT 'DRAFT' NOT NULL,
    current_phase NVARCHAR(32) DEFAULT 'SPECIFICATION' NOT NULL,
    system_id NVARCHAR(16) DEFAULT 'S21' NOT NULL,
    client NVARCHAR(8) DEFAULT '200' NOT NULL,
    clean_core_tier NVARCHAR(32) DEFAULT 'TIER_2_CLOUD_DEVELOPER' NOT NULL,
    schema_version NVARCHAR(16) DEFAULT '1.0.0' NOT NULL,
    project_data NCLOB NOT NULL,
    created_by NVARCHAR(64) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);

CREATE TABLE project_artifacts (
    artifact_id NVARCHAR(128) PRIMARY KEY,
    project_id NVARCHAR(128) NOT NULL,
    tenant_id NVARCHAR(64) NOT NULL,
    layer NVARCHAR(64) NOT NULL,
    artifact_name NVARCHAR(255) NOT NULL,
    file_path NVARCHAR(512) NOT NULL,
    checksum NVARCHAR(128) NOT NULL,
    content_text NCLOB,
    metadata NCLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (project_id) REFERENCES generation_projects(project_id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id) ON DELETE CASCADE
);
