-- Rollback Migration: 005_modernization_intelligence.down.sql

DROP TABLE IF EXISTS transaction_technical_objects CASCADE;
DROP TABLE IF EXISTS transaction_discovery_executions CASCADE;

ALTER TABLE assessments
    DROP COLUMN IF EXISTS readiness_state,
    DROP COLUMN IF EXISTS scoring_breakdown;

DROP INDEX IF EXISTS idx_fiori_cat_sem_obj;
DROP INDEX IF EXISTS idx_fiori_cat_sem_act;
DROP INDEX IF EXISTS idx_fiori_cat_bus_proc;
DROP INDEX IF EXISTS idx_fiori_cat_lob;

ALTER TABLE fiori_catalog_apps
    DROP COLUMN IF EXISTS semantic_object,
    DROP COLUMN IF EXISTS semantic_action,
    DROP COLUMN IF EXISTS compatibility_matrix,
    DROP COLUMN IF EXISTS supported_capabilities,
    DROP COLUMN IF EXISTS deployment_type;
