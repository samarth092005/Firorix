-- ============================================================================
-- Fiorify — SAP HANA Cloud Migration 008: Tenant Isolation Context & Views
-- Mirrors PostgreSQL 008_postgresql_rls_policies.sql using HANA SESSION_CONTEXT
-- ============================================================================

-- Tenant-scoped views enforcing SESSION_CONTEXT('TENANT_ID') isolation
-- Application sets SET 'TENANT_ID' = '<tenantId>' per unit of work via HanaAdapter.withTenantClient()

CREATE VIEW V_TENANT_ASSESSMENTS AS
SELECT * FROM assessments
WHERE tenant_id = SESSION_CONTEXT('TENANT_ID');

CREATE VIEW V_TENANT_GENERATION_PROJECTS AS
SELECT * FROM generation_projects
WHERE tenant_id = SESSION_CONTEXT('TENANT_ID');

CREATE VIEW V_TENANT_DEPLOYMENT_PLANS AS
SELECT * FROM deployment_plans
WHERE tenant_id = SESSION_CONTEXT('TENANT_ID');

CREATE VIEW V_TENANT_SAP_SYSTEMS AS
SELECT * FROM sap_systems
WHERE tenant_id = SESSION_CONTEXT('TENANT_ID');
