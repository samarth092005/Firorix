-- SAP HANA Cloud Rollback: 002_security_audit.down.sql

DROP TABLE refresh_tokens;
DROP TABLE token_revocations;
DROP TABLE security_audit_events;
