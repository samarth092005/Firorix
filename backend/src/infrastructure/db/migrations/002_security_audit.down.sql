-- Migration: 002_security_audit.down.sql
-- Description: Rollback Security Audit Table

DROP TABLE IF EXISTS security_audit_events CASCADE;
