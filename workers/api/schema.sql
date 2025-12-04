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
  UNIQUE(poll_id, user_email)
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
