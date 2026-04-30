-- Migration: Archive and remove polls (replaced by Learning Hub)
--
-- STEP 1 (BEFORE running this migration):
--   Call GET https://seportal-api.arunpotta1024.workers.dev/api/admin/archive-polls
--   This exports every poll + vote as JSON and uploads it to R2 at
--   archives/polls-<timestamp>.json for safe keeping.
--
-- STEP 2: Run this migration to drop the tables:
--   wrangler d1 execute seportal-db --file=workers/api/migrations/archive_and_remove_polls.sql --remote
--
-- After this migration, the polls tab, API endpoints, and data are fully removed.
-- The new Learning Hub (video/training library) takes its place.

DROP TABLE IF EXISTS poll_votes;
DROP TABLE IF EXISTS polls;
