-- URL Assets table
CREATE TABLE IF NOT EXISTS url_assets (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  date_added TEXT NOT NULL,
  icon TEXT,
  image_url TEXT,
  tags TEXT,
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
