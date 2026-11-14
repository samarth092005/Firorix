-- Fiorify — Migration 007 Down: Drop deployment orchestration tables

DROP TABLE IF EXISTS deployment_executions CASCADE;
DROP TABLE IF EXISTS deployment_approvals CASCADE;
DROP TABLE IF EXISTS deployment_plans CASCADE;
