-- Products table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- URL Assets table
CREATE TABLE IF NOT EXISTS url_assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  date_added TEXT NOT NULL,
  icon TEXT,
  image_url TEXT,
  tags TEXT,
  product_id TEXT, -- Links to products table
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- File Assets table
CREATE TABLE IF NOT EXISTS file_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT,
  category TEXT NOT NULL,
  size TEXT,
  downloads INTEGER DEFAULT 0,
  date TEXT,
  icon TEXT,
  description TEXT,
  file_key TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Scripts table
CREATE TABLE IF NOT EXISTS scripts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  author TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  uses INTEGER DEFAULT 0,
  date TEXT,
  icon TEXT,
  code TEXT,
  product_id TEXT, -- Links to products table
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT,
  attendees INTEGER DEFAULT 0,
  description TEXT,
  icon TEXT,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shoutouts table
CREATE TABLE IF NOT EXISTS shoutouts (
  id TEXT PRIMARY KEY,
  from_user TEXT NOT NULL,
  to_user TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  date TEXT NOT NULL,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  members TEXT NOT NULL, -- JSON array of member emails
  admins TEXT, -- JSON array of admin emails
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  options TEXT NOT NULL, -- JSON array of options with votes
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  total_votes INTEGER DEFAULT 0,
  target_groups TEXT, -- JSON array of target group IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal', -- urgent, high, normal, low
  author TEXT NOT NULL,
  date TEXT NOT NULL,
  target_groups TEXT, -- JSON array of target group IDs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Poll Votes table (tracks which users voted on which polls)
CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Competitions table
CREATE TABLE IF NOT EXISTS competitions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- sales, technical, customer-success, team-building, etc.
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  prize TEXT, -- Prize description (e.g., "$500 bonus", "Team dinner", "3 days PTO")
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, cancelled
  participants INTEGER DEFAULT 0,
  winner TEXT, -- Winner email/name
  rules TEXT, -- Competition rules/requirements
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employees table for org chart
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  department TEXT,
  manager_id TEXT, -- References another employee's id
  photo_url TEXT,
  bio TEXT,
  location TEXT,
  region TEXT, -- Regional team assignment (e.g., AMER, EMEA, APAC)
  start_date TEXT,
  workday_id TEXT,
  employee_status TEXT DEFAULT 'active',
  cost_center TEXT,
  business_unit TEXT,
  job_family TEXT,
  job_level TEXT,
  workday_last_synced TEXT,
  synced_from TEXT DEFAULT 'manual',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Likes tracking tables
CREATE TABLE IF NOT EXISTS url_asset_likes (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(asset_id, user_email)
);

CREATE TABLE IF NOT EXISTS script_likes (
  id TEXT PRIMARY KEY,
  script_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(script_id, user_email)
);

CREATE TABLE IF NOT EXISTS shoutout_likes (
  id TEXT PRIMARY KEY,
  shoutout_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shoutout_id, user_email)
);

-- Feature Requests table
CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  feature TEXT NOT NULL,
  opportunity_value REAL NOT NULL, -- Opportunity value in dollars
  submitter_email TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Feature Request Upvotes table (tracks which users upvoted which feature requests)
CREATE TABLE IF NOT EXISTS feature_request_upvotes (
  id TEXT PRIMARY KEY,
  feature_request_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(feature_request_id, user_email)
);

-- Doc Vectors table (tracks vectorized documentation chunks)
CREATE TABLE IF NOT EXISTS doc_vectors (
  id TEXT PRIMARY KEY,
  product_name TEXT,
  category TEXT,
  url TEXT,
  chunk_index INTEGER
);

-- RFP Uploads table (tracks uploaded RFP training data)
CREATE TABLE IF NOT EXISTS rfp_uploads (
  vectorId TEXT PRIMARY KEY,
  fileName TEXT NOT NULL,
  uploadedAt TEXT NOT NULL,
  question TEXT,
  answer TEXT
);

-- Feature Request Opportunities table (tracks multiple opportunities per feature request)
-- NOTE: No UNIQUE constraint - SEs can add multiple opportunities per feature
CREATE TABLE IF NOT EXISTS feature_request_opportunities (
  id TEXT PRIMARY KEY,
  feature_request_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  opportunity_value REAL NOT NULL,
  customer_name TEXT,
  sfdc_link TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skills Matrix: Skill categories that admins define
CREATE TABLE IF NOT EXISTS skill_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skills Matrix: Individual skills within a category
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Skills Matrix: SE self-assessment responses
-- level: 1=No Exposure, 2=Awareness, 3=Working Knowledge, 4=Deep Expertise, 5=Subject Matter Expert
CREATE TABLE IF NOT EXISTS skill_assessments (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email, skill_id)
);

-- Skills Matrix: University courses that map to skills/levels
CREATE TABLE IF NOT EXISTS university_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  provider TEXT,
  duration TEXT,
  difficulty TEXT NOT NULL DEFAULT 'beginner', -- beginner, intermediate, advanced, expert
  skill_id TEXT NOT NULL,
  min_level INTEGER NOT NULL DEFAULT 1, -- minimum skill level this course targets
  max_level INTEGER NOT NULL DEFAULT 2, -- maximum skill level this course targets
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Track course progress per user (not_started / in_progress / completed)
CREATE TABLE IF NOT EXISTS course_completions (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  course_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email, course_id)
);

-- Personal courses added by individual SEs (not from the admin library)
CREATE TABLE IF NOT EXISTS personal_courses (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  provider TEXT,
  skill_id TEXT, -- optional link to a skill
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Integration config table (Workday, etc.)
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

-- Course assignments (admin/manager assigns courses to users)
CREATE TABLE IF NOT EXISTS course_assignments (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  course_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL,
  assigned_by_name TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  due_date TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'assigned',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email, course_id)
);
