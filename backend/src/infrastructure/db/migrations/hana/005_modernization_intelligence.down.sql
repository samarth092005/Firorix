-- Migration: 005_modernization_intelligence.down.sql (SAP HANA Cloud Dialect)

DROP TABLE transaction_technical_objects;
DROP TABLE transaction_discovery_executions;

ALTER TABLE assessments DROP (
    readiness_state,
    scoring_breakdown
);

ALTER TABLE fiori_catalog_apps DROP (
    semantic_object,
    semantic_action,
    compatibility_matrix,
    supported_capabilities,
    deployment_type
);
