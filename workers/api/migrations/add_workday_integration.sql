-- Workday Integration: Add new fields to employees table
ALTER TABLE employees ADD COLUMN workday_id TEXT;
ALTER TABLE employees ADD COLUMN employee_status TEXT DEFAULT 'active';
ALTER TABLE employees ADD COLUMN cost_center TEXT;
ALTER TABLE employees ADD COLUMN business_unit TEXT;
ALTER TABLE employees ADD COLUMN job_family TEXT;
ALTER TABLE employees ADD COLUMN job_level TEXT;
ALTER TABLE employees ADD COLUMN workday_last_synced TEXT;
ALTER TABLE employees ADD COLUMN synced_from TEXT DEFAULT 'manual';

-- Integration config table
CREATE TABLE IF NOT EXISTS integration_config (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  tenant_url TEXT,
  client_id TEXT,
  client_secret_kv_key TEXT,
  refresh_token_kv_key TEXT,
  last_sync_at TEXT,
  last_sync_status TEXT,
  last_sync_details TEXT,
  sync_enabled INTEGER DEFAULT 0,
  sync_interval_hours INTEGER DEFAULT 24,
  field_mapping TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sync audit log table
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  sync_type TEXT,
  status TEXT,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_deactivated INTEGER DEFAULT 0,
  errors TEXT,
  started_at TEXT,
  completed_at TEXT
);
