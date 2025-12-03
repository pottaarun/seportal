-- Feature Requests table
CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  feature TEXT NOT NULL,
  opportunity_value REAL NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature Request Upvotes table
CREATE TABLE IF NOT EXISTS feature_request_upvotes (
  id TEXT PRIMARY KEY,
  feature_request_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feature_request_id, user_email)
);
