-- ──────────────────────────────────────────────────────────────────────────────
-- Migration: server-side admin list
--
-- Until now seportal stored its admin allowlist in localStorage on each
-- user's machine — meaning admin status was per-browser, not per-user.
-- Adding alice@cf.com as admin on Bob's laptop didn't make her admin on
-- her own machine. This moves admin state into D1 so it's a real,
-- centrally-managed allowlist.
--
-- The seed values come from the previous client-side default in
-- AdminContext.tsx so existing admin sessions keep working.
--
-- Run: wrangler d1 execute seportal-db --remote --file=workers/api/migrations/add_admins_table.sql
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admins (
  email TEXT PRIMARY KEY,                      -- normalized to lowercase
  name TEXT,                                   -- snapshot at grant time
  granted_by TEXT,                             -- email of the admin who granted this
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admins_granted_at ON admins(granted_at DESC);

-- Seed bootstrap admins (matches the default list that was hardcoded in
-- AdminContext.tsx). INSERT OR IGNORE so re-running the migration is safe.
INSERT OR IGNORE INTO admins (email, name, granted_by, granted_at) VALUES
  ('admin@cloudflare.com', 'Admin', 'system', CURRENT_TIMESTAMP),
  ('apotta@cloudflare.com', 'Arun Potta', 'system', CURRENT_TIMESTAMP);
