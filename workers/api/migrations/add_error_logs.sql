-- Error logs (captured from frontend for admin review)
CREATE TABLE IF NOT EXISTS error_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT,
  user_name TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_context TEXT,
  stack_trace TEXT,
  resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
