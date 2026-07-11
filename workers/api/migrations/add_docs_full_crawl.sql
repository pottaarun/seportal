-- Migration: full-site Cloudflare docs crawl (RFx deep documentation index)
-- Run against the existing D1 database:
--   wrangler d1 execute seportal-db --remote --file=./migrations/add_docs_full_crawl.sql
--
-- Adds run tracking to doc_vectors and a run-state table for async queue ingestion.
-- NOTE: SQLite ALTER TABLE ADD COLUMN has no "IF NOT EXISTS"; if you re-run this and
-- the columns already exist, those two ALTER lines will error harmlessly — ignore them.

ALTER TABLE doc_vectors ADD COLUMN run_id TEXT;
ALTER TABLE doc_vectors ADD COLUMN title TEXT;

CREATE INDEX IF NOT EXISTS idx_doc_vectors_run ON doc_vectors(run_id);
CREATE INDEX IF NOT EXISTS idx_doc_vectors_url ON doc_vectors(url);

CREATE TABLE IF NOT EXISTS doc_ingest_state (
  run_id TEXT PRIMARY KEY,
  total_pages INTEGER DEFAULT 0,
  processed_pages INTEGER DEFAULT 0,
  vectors_upserted INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME
);
