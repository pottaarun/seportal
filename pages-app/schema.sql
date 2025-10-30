-- SE Portal Database Schema

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'trial')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Events table for analytics
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  metadata TEXT, -- JSON string
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);

-- Webhook logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  payload TEXT, -- JSON string
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_source ON webhook_logs(source);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON webhook_logs(received_at);

-- Temporary data (cleaned up by cron)
CREATE TABLE IF NOT EXISTS temporary_data (
  id TEXT PRIMARY KEY,
  data TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_temp_created ON temporary_data(created_at);

-- Logs table (archived by cron after 30 days)
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT CHECK(level IN ('info', 'warn', 'error')),
  message TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at);

-- Insert some sample data
INSERT OR IGNORE INTO customers (id, name, email, company, status) VALUES
  ('1', 'John Doe', 'john@acme.com', 'Acme Corp', 'active'),
  ('2', 'Jane Smith', 'jane@techstart.com', 'TechStart Inc', 'trial'),
  ('3', 'Bob Johnson', 'bob@enterprise.com', 'Enterprise Co', 'active');

INSERT OR IGNORE INTO events (id, event_type, user_id, metadata) VALUES
  ('evt_1', 'page_view', '1', '{"page": "/dashboard"}'),
  ('evt_2', 'button_click', '1', '{"button": "export"}'),
  ('evt_3', 'page_view', '2', '{"page": "/customers"}');
