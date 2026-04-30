-- Migration: Learning Hub (Video Training Library)
-- Replaces the retired Polls tab. Run AFTER `archive_and_remove_polls.sql`.
--
-- Usage:
--   wrangler d1 execute seportal-db --file=workers/api/migrations/add_learning_hub.sql --remote
--
-- After this migration, create the dedicated Vectorize index for transcript chunks:
--   wrangler vectorize create seportal-videos --dimensions=768 --metric=cosine
--
-- Set the Stream API token (scope: Stream > Edit):
--   wrangler secret put STREAM_API_TOKEN --config workers/api/wrangler.toml
--
-- Set your Cloudflare account ID in workers/api/wrangler.toml under [vars].

-- Video metadata. Videos are hosted on Cloudflare Stream (stream_uid).
-- Transcripts are populated by Stream's auto-caption generation (Whisper).
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT,                  -- JSON array of tags
  stream_uid TEXT UNIQUE,     -- Cloudflare Stream video UID
  thumbnail_url TEXT,
  playback_url TEXT,          -- Stream HLS manifest
  dash_url TEXT,              -- Stream DASH manifest
  duration_seconds REAL DEFAULT 0,
  uploader_email TEXT NOT NULL,
  uploader_name TEXT,
  transcript TEXT,
  transcript_lang TEXT DEFAULT 'en',
  transcription_status TEXT NOT NULL DEFAULT 'pending',  -- pending | uploading | processing | completed | failed
  transcription_error TEXT,
  view_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(transcription_status);
CREATE INDEX IF NOT EXISTS idx_videos_created ON videos(created_at);

-- Tracking table for transcript-chunk vectors stored in the seportal-videos Vectorize index.
-- Lets us look up which vectors belong to which video so we can delete them.
CREATE TABLE IF NOT EXISTS video_vectors (
  vector_id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  start_seconds REAL,
  end_seconds REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_vectors_video ON video_vectors(video_id);

-- Per-user view tracking for analytics.
CREATE TABLE IF NOT EXISTS video_views (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  watched_seconds REAL DEFAULT 0,
  viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_video_views_video ON video_views(video_id);
CREATE INDEX IF NOT EXISTS idx_video_views_user ON video_views(user_email);
