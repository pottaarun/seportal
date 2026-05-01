-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: Content changelog + per-user "seen" tracking
--
-- Powers the in-app "What's New" experience:
--   • Top-nav bell with unseen count
--   • Dashboard "What's New This Week" card
--   • "Updated" pill on individual items (assets, scripts, ai_solutions)
--
-- Hooked into the worker's existing CRUD endpoints — every successful
-- create/update/delete on an asset, script, or ai_solution writes one row.
-- "Updated" rows are surfaced to all users EXCEPT the editor (self-edits
-- are filtered out at query time).
--
-- Run: wrangler d1 execute seportal-db --remote --file=workers/api/migrations/add_content_changelog.sql
-- ──────────────────────────────────────────────────────────────────────────────

-- One row per change. Single table for all content types so the bell can
-- merge them in time order without union queries.
CREATE TABLE IF NOT EXISTS content_changelog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content_type TEXT NOT NULL,        -- 'asset' | 'script' | 'ai_solution'
  content_id TEXT NOT NULL,
  content_title TEXT,                -- snapshot of title at change-time
  content_subtype TEXT,              -- e.g. 'tool' | 'gem' | 'prompt' for ai_solutions
  content_path TEXT,                 -- /assets, /scripts, /ai-hub (where to navigate)
  change_type TEXT NOT NULL,         -- 'created' | 'updated' | 'deleted'
  changed_by_email TEXT,
  changed_by_name TEXT,
  summary TEXT,                      -- optional short note
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_content_changelog_changed_at
  ON content_changelog(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_changelog_content
  ON content_changelog(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_content_changelog_changed_by
  ON content_changelog(changed_by_email);

-- One row per (user, content). last_seen_at is the latest changed_at the
-- user has acknowledged for that content. The unread test is:
--   COALESCE(last_seen_at, '1970-01-01') < latest_changed_at
CREATE TABLE IF NOT EXISTS content_seen (
  user_email TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_email, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_content_seen_user
  ON content_seen(user_email);
