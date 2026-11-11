-- Optional SQLite schema. Use only if the existing project has a backend/CAP service.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sap_systems (
  system_id TEXT PRIMARY KEY, system_name TEXT NOT NULL, client TEXT NOT NULL,
  release_label TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'MOCK',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS tcode_fixtures (
  system_id TEXT NOT NULL, tcode TEXT NOT NULL,
  exists_flag INTEGER NOT NULL CHECK(exists_flag IN (0,1)),
  classification TEXT NOT NULL CHECK(classification IN ('STANDARD','CUSTOM','PARTNER','UNKNOWN')),
  description TEXT, program TEXT, screen_number TEXT, package_name TEXT,
  metadata_status TEXT NOT NULL, lookup_behavior TEXT NOT NULL DEFAULT 'SUCCESS',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  PRIMARY KEY(system_id,tcode),
  FOREIGN KEY(system_id) REFERENCES sap_systems(system_id)
);
CREATE TABLE IF NOT EXISTS fiori_catalogue (
  app_id TEXT PRIMARY KEY, app_name TEXT NOT NULL, app_type TEXT NOT NULL,
  product_version TEXT NOT NULL, source_label TEXT NOT NULL, source_status TEXT NOT NULL,
  descriptor_status TEXT NOT NULL DEFAULT 'NOT_CHECKED',
  access_status TEXT NOT NULL DEFAULT 'NOT_CHECKED'
);
CREATE TABLE IF NOT EXISTS tcode_app_mappings (
  mapping_id TEXT PRIMARY KEY, system_id TEXT NOT NULL, tcode TEXT NOT NULL,
  app_id TEXT NOT NULL, match_type TEXT NOT NULL
    CHECK(match_type IN ('DIRECT_MATCH','RELATED_MATCH','POSSIBLE_MATCH')),
  rationale TEXT NOT NULL, review_status TEXT NOT NULL,
  release_compatibility TEXT NOT NULL,
  FOREIGN KEY(system_id,tcode) REFERENCES tcode_fixtures(system_id,tcode),
  FOREIGN KEY(app_id) REFERENCES fiori_catalogue(app_id)
);
CREATE TABLE IF NOT EXISTS tcode_check_history (
  check_id TEXT PRIMARY KEY, system_id TEXT NOT NULL,
  tcode_input TEXT NOT NULL, tcode_normalized TEXT,
  result_status TEXT NOT NULL, classification TEXT,
  candidate_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
  FOREIGN KEY(system_id) REFERENCES sap_systems(system_id)
);
CREATE INDEX IF NOT EXISTS idx_tcode_history_created ON tcode_check_history(created_at);
