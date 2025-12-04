-- Drop the old table with UNIQUE constraint
DROP TABLE IF EXISTS feature_request_opportunities_old;

-- Rename existing table to backup
ALTER TABLE feature_request_opportunities RENAME TO feature_request_opportunities_old;

-- Create new table without UNIQUE constraint (allows multiple opportunities per SE per feature)
CREATE TABLE feature_request_opportunities (
  id TEXT PRIMARY KEY,
  feature_request_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  opportunity_value REAL NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy existing data
INSERT INTO feature_request_opportunities (id, feature_request_id, user_email, user_name, opportunity_value, created_at)
SELECT id, feature_request_id, user_email, user_name, opportunity_value, created_at
FROM feature_request_opportunities_old;

-- Drop old table
DROP TABLE feature_request_opportunities_old;
