-- Migration: 008_postgresql_rls_policies.sql
-- Description: Enforce Row Level Security (RLS) on tenant-scoped tables using session setting app.current_tenant

-- 1. assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS assessments_tenant_isolation ON assessments;
CREATE POLICY assessments_tenant_isolation ON assessments
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  );

-- 2. security_audit_events
ALTER TABLE security_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS security_audit_tenant_isolation ON security_audit_events;
CREATE POLICY security_audit_tenant_isolation ON security_audit_events
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  );

-- 3. generation_handoffs
ALTER TABLE generation_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_handoffs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS generation_handoffs_tenant_isolation ON generation_handoffs;
CREATE POLICY generation_handoffs_tenant_isolation ON generation_handoffs
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  );

-- 4. generation_projects
ALTER TABLE generation_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_projects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS generation_projects_tenant_isolation ON generation_projects;
CREATE POLICY generation_projects_tenant_isolation ON generation_projects
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  );

-- 5. deployment_plans
ALTER TABLE deployment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_plans FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deployment_plans_tenant_isolation ON deployment_plans;
CREATE POLICY deployment_plans_tenant_isolation ON deployment_plans
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.current_tenant', true), '')
    OR current_setting('app.current_tenant', true) = 'BYPASS'
  );
