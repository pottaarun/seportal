-- Migration: Add transcript_vtt column for timestamped, click-to-seek UX.
-- Run: wrangler d1 execute seportal-db --file=workers/api/migrations/add_vtt_to_videos.sql --remote

ALTER TABLE videos ADD COLUMN transcript_vtt TEXT;
