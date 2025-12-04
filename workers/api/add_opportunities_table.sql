-- Feature Request Opportunities table (tracks multiple opportunities per feature request)
CREATE TABLE IF NOT EXISTS feature_request_opportunities (
  id TEXT PRIMARY KEY,
  feature_request_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  opportunity_value REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feature_request_id, user_email)
);
