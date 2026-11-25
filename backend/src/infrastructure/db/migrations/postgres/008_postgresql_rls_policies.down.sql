-- Migration: 008_postgresql_rls_policies.down.sql
-- Description: Drop Row Level Security (RLS) policies on tenant-scoped tables

DROP POLICY IF EXISTS assessments_tenant_isolation ON assessments;
ALTER TABLE assessments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE assessments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS security_audit_tenant_isolation ON security_audit_events;
ALTER TABLE security_audit_events NO FORCE ROW LEVEL SECURITY;
ALTER TABLE security_audit_events DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS generation_handoffs_tenant_isolation ON generation_handoffs;
ALTER TABLE generation_handoffs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE generation_handoffs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS generation_projects_tenant_isolation ON generation_projects;
ALTER TABLE generation_projects NO FORCE ROW LEVEL SECURITY;
ALTER TABLE generation_projects DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deployment_plans_tenant_isolation ON deployment_plans;
ALTER TABLE deployment_plans NO FORCE ROW LEVEL SECURITY;
ALTER TABLE deployment_plans DISABLE ROW LEVEL SECURITY;
