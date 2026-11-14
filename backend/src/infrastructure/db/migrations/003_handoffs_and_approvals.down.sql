-- Migration Down: 003_handoffs_and_approvals.down.sql
-- Description: Drop Generation Handoffs and Architect Build Approvals Schema

DROP TABLE IF EXISTS build_architect_approvals CASCADE;
DROP TABLE IF EXISTS generation_handoffs CASCADE;
