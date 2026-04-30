-- Migration: Add granular transcription progress tracking.
-- Lets the UI display a progress bar + stage label (e.g. "Embedding 42 of 68 chunks")
-- instead of just a "Transcribing..." spinner.
--
-- Run: wrangler d1 execute seportal-db --file=workers/api/migrations/add_transcription_progress.sql --remote

ALTER TABLE videos ADD COLUMN transcription_progress INTEGER DEFAULT 0;
ALTER TABLE videos ADD COLUMN transcription_stage TEXT;
