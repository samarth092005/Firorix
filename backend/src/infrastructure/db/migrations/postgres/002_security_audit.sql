-- Migration: 002_security_audit.sql
-- Description: Security and Administrative Audit Event Logging Schema

CREATE TABLE IF NOT EXISTS security_audit_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(128) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    correlation_id VARCHAR(64),
    outcome VARCHAR(32) NOT NULL DEFAULT 'SUCCESS',
    details JSONB DEFAULT '{}'::jsonb,
    previous_hash VARCHAR(128) NOT NULL,
    integrity_hash VARCHAR(128) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sec_audit_tenant ON security_audit_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sec_audit_time ON security_audit_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_sec_audit_actor ON security_audit_events(actor);
CREATE INDEX IF NOT EXISTS idx_sec_audit_action ON security_audit_events(action);
